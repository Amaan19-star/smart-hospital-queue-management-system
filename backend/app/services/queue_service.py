from datetime import datetime, date, timedelta
from typing import Optional, Tuple, List, Dict
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_, text

from backend.app.models.hospital_models import (
    User,
    Department,
    DoctorProfile,
    Appointment,
    QueueToken,
    CaseHistory
)

class QueueService:
    @staticmethod
    def _today_utc_range():
        """
        Return (start_utc, end_utc) covering the entire local calendar day,
        expressed as UTC datetime objects — safe regardless of server timezone.
        We use a 48-hour window (yesterday UTC midnight → tomorrow UTC midnight)
        to avoid missing tokens when local time and UTC differ by up to ±14 hours.
        Today in UTC terms = last 48 hours covers all reasonable timezone offsets.
        More precisely: use date.today() in UTC (UTC 00:00 to UTC+1 day).
        """
        today_utc = datetime.utcnow().date()
        start = datetime.combine(today_utc, datetime.min.time())
        end = start + timedelta(days=1)
        return start, end

    @staticmethod
    def generate_token(
        db: Session,
        patient_id: int,
        doctor_id: int,
        department_id: int,
        appointment_id: Optional[int] = None,
        priority: int = 0
    ) -> QueueToken:
        dept = db.query(Department).filter(Department.id == department_id).first()
        dept_code = dept.code if dept else "GEN"

        # Use UTC-based today window to match stored issue_time (which is UTC)
        today_start, today_end = QueueService._today_utc_range()

        # Check if an active token already exists for this patient+doctor today
        existing = db.query(QueueToken).filter(
            QueueToken.patient_id == patient_id,
            QueueToken.doctor_id == doctor_id,
            QueueToken.status.in_(["WAITING", "CALLED", "IN_CONSULTATION"]),
            QueueToken.issue_time >= today_start,
            QueueToken.issue_time < today_end
        ).first()

        if existing:
            return existing

        # If linked appointment exists, update appointment status to WAITING
        if appointment_id:
            apt = db.query(Appointment).filter(Appointment.id == appointment_id).first()
            if apt:
                apt.status = "WAITING"

        # Use MAX-based sequence across ALL token statuses (including cancelled/completed)
        # so we never reuse a token_number that was already committed today.
        # Retry up to 5 times in case of concurrent inserts.
        import random as _random
        import time as _time

        token = None
        for _attempt in range(5):
            max_seq = db.query(func.max(QueueToken.raw_sequence)).filter(
                QueueToken.department_id == department_id,
                QueueToken.issue_time >= today_start,
                QueueToken.issue_time < today_end
            ).scalar() or 0

            raw_sequence = max_seq + 1
            token_number = f"{dept_code}-{100 + raw_sequence}"

            # Double-check: ensure this token_number doesn't already exist (ever)
            collision = db.query(QueueToken).filter(
                QueueToken.token_number == token_number
            ).first()
            if collision:
                # Token number already used globally — bump sequence further
                raw_sequence = max_seq + 1 + _attempt + _random.randint(1, 10)
                token_number = f"{dept_code}-{100 + raw_sequence}"

            try:
                token = QueueToken(
                    token_number=token_number,
                    raw_sequence=raw_sequence,
                    appointment_id=appointment_id,
                    patient_id=patient_id,
                    doctor_id=doctor_id,
                    department_id=department_id,
                    status="WAITING",
                    priority=priority,
                    issue_time=datetime.utcnow()
                )
                db.add(token)
                db.commit()
                db.refresh(token)
                break
            except Exception as _e:
                db.rollback()
                if _attempt == 4:
                    raise
                _time.sleep(_random.uniform(0.05, 0.3))

        # Create synchronized CaseHistory record with PENDING status
        try:
            today_str = datetime.utcnow().strftime("%Y%m%d")
            case_num = f"CASE-{today_str}-{token.id:04d}"
            existing_case = db.query(CaseHistory).filter(
                or_(
                    CaseHistory.token_id == token.id,
                    and_(CaseHistory.appointment_id == appointment_id, appointment_id != None)
                )
            ).first()
            if not existing_case:
                new_case = CaseHistory(
                    case_number=case_num,
                    patient_id=patient_id,
                    doctor_id=doctor_id,
                    department_id=department_id,
                    appointment_id=appointment_id,
                    token_id=token.id,
                    status="PENDING",
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow()
                )
                db.add(new_case)
                db.commit()
        except Exception as e:
            print(f"Error syncing CaseHistory: {e}")

        return token

    @staticmethod
    def get_token_metrics(db: Session, token: QueueToken) -> Dict:
        today_start, today_end = QueueService._today_utc_range()
        
        # Doctor profile for average consultation time
        doc_profile = db.query(DoctorProfile).filter(DoctorProfile.user_id == token.doctor_id).first()
        avg_time = doc_profile.avg_consultation_time if doc_profile else 15
        room = doc_profile.room_number if doc_profile else "Room 101"

        # Current serving token for this doctor
        current_serving = db.query(QueueToken).filter(
            QueueToken.doctor_id == token.doctor_id,
            QueueToken.status.in_(["CALLED", "IN_CONSULTATION"]),
            QueueToken.issue_time >= today_start,
            QueueToken.issue_time < today_end
        ).order_by(QueueToken.called_time.desc()).first()

        current_serving_number = current_serving.token_number if current_serving else "None"

        if token.status in ["CALLED", "IN_CONSULTATION"]:
            return {
                "position": 0,
                "patients_ahead": 0,
                "estimated_wait_minutes": 0,
                "current_serving_token": token.token_number,
                "doctor_room": room
            }
        elif token.status in ["COMPLETED", "SKIPPED", "CANCELLED"]:
            return {
                "position": 0,
                "patients_ahead": 0,
                "estimated_wait_minutes": 0,
                "current_serving_token": current_serving_number,
                "doctor_room": room
            }

        # For WAITING tokens, count ahead
        # Higher priority ahead, or same priority with earlier raw_sequence
        ahead_count = db.query(func.count(QueueToken.id)).filter(
            QueueToken.doctor_id == token.doctor_id,
            QueueToken.status == "WAITING",
            QueueToken.issue_time >= today_start,
            QueueToken.issue_time < today_end,
            or_(
                QueueToken.priority > token.priority,
                and_(QueueToken.priority == token.priority, QueueToken.raw_sequence < token.raw_sequence)
            )
        ).scalar() or 0

        # If a patient is currently in consultation, add 1 active patient in front
        is_doctor_busy = 1 if current_serving else 0
        total_waiting_ahead = ahead_count + is_doctor_busy
        estimated_wait = total_waiting_ahead * avg_time

        return {
            "position": ahead_count + 1,
            "patients_ahead": ahead_count,
            "estimated_wait_minutes": estimated_wait,
            "current_serving_token": current_serving_number,
            "doctor_room": room
        }

    @staticmethod
    def call_next_patient(db: Session, doctor_id: int) -> Optional[QueueToken]:
        today_start, today_end = QueueService._today_utc_range()

        # Fetch next waiting token: priority DESC, raw_sequence ASC
        next_token = db.query(QueueToken).filter(
            QueueToken.doctor_id == doctor_id,
            QueueToken.status == "WAITING",
            QueueToken.issue_time >= today_start,
            QueueToken.issue_time < today_end
        ).order_by(QueueToken.priority.desc(), QueueToken.raw_sequence.asc()).first()

        if not next_token:
            return None

        next_token.status = "CALLED"
        next_token.called_time = datetime.utcnow()

        if next_token.appointment:
            next_token.appointment.status = "IN_CONSULTATION"

        # Update doctor status
        doc_profile = db.query(DoctorProfile).filter(DoctorProfile.user_id == doctor_id).first()
        if doc_profile:
            doc_profile.current_status = "In Consultation"

        db.commit()
        db.refresh(next_token)
        return next_token

    @staticmethod
    def update_token_status(
        db: Session, 
        token_id: int, 
        action: str, 
        notes: Optional[str] = None,
        symptoms: Optional[str] = None,
        diagnosis: Optional[str] = None,
        prescription: Optional[str] = None,
        vitals: Optional[str] = None,
        follow_up_date: Optional[str] = None
    ) -> QueueToken:
        token = db.query(QueueToken).filter(QueueToken.id == token_id).first()
        if not token:
            raise ValueError("Token not found")

        doc_profile = db.query(DoctorProfile).filter(DoctorProfile.user_id == token.doctor_id).first()

        action = action.upper()
        if action == "CALL":
            token.status = "CALLED"
            token.called_time = datetime.utcnow()
            if doc_profile:
                doc_profile.current_status = "In Consultation"
            if token.appointment:
                token.appointment.status = "IN_CONSULTATION"

        elif action == "START":
            token.status = "IN_CONSULTATION"
            if doc_profile:
                doc_profile.current_status = "In Consultation"
            if token.appointment:
                token.appointment.status = "IN_CONSULTATION"

        elif action == "COMPLETE":
            token.status = "COMPLETED"
            token.completed_time = datetime.utcnow()
            if token.appointment:
                token.appointment.status = "COMPLETED"

            # Check if doctor has other waiting patients
            today_start, today_end = QueueService._today_utc_range()
            remaining = db.query(QueueToken).filter(
                QueueToken.doctor_id == token.doctor_id,
                QueueToken.status.in_(["WAITING", "CALLED", "IN_CONSULTATION"]),
                QueueToken.id != token.id,
                QueueToken.issue_time >= today_start,
                QueueToken.issue_time < today_end
            ).count()

            if doc_profile and remaining == 0:
                doc_profile.current_status = "Available"

        elif action == "SKIP":
            token.status = "SKIPPED"
            if token.appointment:
                token.appointment.status = "CONFIRMED"

        elif action == "CANCEL":
            token.status = "CANCELLED"
            if token.appointment:
                token.appointment.status = "CANCELLED"

        if notes:
            token.notes = notes

        # Synchronize linked CaseHistory status and clinical notes
        try:
            case = db.query(CaseHistory).filter(
                or_(
                    CaseHistory.token_id == token.id,
                    and_(CaseHistory.appointment_id == token.appointment_id, token.appointment_id != None)
                )
            ).first()
            if case:
                if action in ["CALL", "START"]:
                    case.status = "IN_PROGRESS"
                elif action == "COMPLETE":
                    case.status = "COMPLETED"
                    case.completed_at = datetime.utcnow()
                    if notes:
                        case.clinical_notes = notes
                elif action == "SKIP":
                    case.status = "SKIPPED"
                elif action == "CANCEL":
                    case.status = "CANCELLED"

                if symptoms:
                    case.symptoms = symptoms
                if diagnosis:
                    case.diagnosis = diagnosis
                if prescription:
                    case.prescription = prescription
                if vitals:
                    case.vitals = vitals
                if follow_up_date:
                    case.follow_up_date = follow_up_date

                case.updated_at = datetime.utcnow()
        except Exception as e:
            print(f"Error syncing case history on token action: {e}")

        db.commit()
        db.refresh(token)
        return token
