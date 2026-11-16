from typing import List, Optional
from datetime import datetime, date, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.app.core.database import get_db
from backend.app.models.hospital_models import User, DoctorProfile, Department, Appointment, QueueToken
from backend.app.schemas.hospital_schemas import (
    TokenGenerateRequest,
    TokenOut,
    TokenActionRequest,
    LiveQueueDoctorSummary
)
from backend.app.api.deps import get_current_user, require_doctor
from backend.app.services.queue_service import QueueService

router = APIRouter(prefix="/queue", tags=["Queue Management"])

def _today_utc_range():
    """Return (start, end) covering today in UTC (matches stored issue_time)."""
    today_utc = datetime.utcnow().date()
    start = datetime.combine(today_utc, datetime.min.time())
    end = start + timedelta(days=1)
    return start, end

def format_token_out(db: Session, token: QueueToken) -> dict:
    metrics = QueueService.get_token_metrics(db, token)
    return {
        "id": token.id,
        "token_number": token.token_number,
        "raw_sequence": token.raw_sequence,
        "appointment_id": token.appointment_id,
        "patient_id": token.patient_id,
        "patient_name": token.patient.full_name if token.patient else "Patient",
        "doctor_id": token.doctor_id,
        "doctor_name": token.doctor.full_name if token.doctor else "Doctor",
        "doctor_room": metrics.get("doctor_room", "Room 101"),
        "department_id": token.department_id,
        "department_name": token.department.name if token.department else "General",
        "status": token.status,
        "priority": token.priority,
        "issue_time": token.issue_time,
        "called_time": token.called_time,
        "completed_time": token.completed_time,
        "notes": token.notes,
        "position": metrics.get("position", 0),
        "patients_ahead": metrics.get("patients_ahead", 0),
        "estimated_wait_minutes": metrics.get("estimated_wait_minutes", 0),
        "current_serving_token": metrics.get("current_serving_token")
    }

@router.post("/generate", response_model=TokenOut)
def generate_token(
    payload: TokenGenerateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    token = QueueService.generate_token(
        db=db,
        patient_id=current_user.id,
        doctor_id=payload.doctor_id,
        department_id=payload.department_id,
        appointment_id=payload.appointment_id,
        priority=payload.priority or 0
    )
    return format_token_out(db, token)

@router.get("/my-token", response_model=Optional[TokenOut])
def get_my_active_token(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    today_start, today_end = _today_utc_range()
    
    # Priority 1: Check active waiting / called / in-consultation token
    token = db.query(QueueToken).filter(
        QueueToken.patient_id == current_user.id,
        QueueToken.status.in_(["WAITING", "CALLED", "IN_CONSULTATION"]),
        QueueToken.issue_time >= today_start,
        QueueToken.issue_time < today_end
    ).order_by(QueueToken.id.desc()).first()

    # Priority 2: If none active, return the most recent today's token (any status)
    if not token:
        token = db.query(QueueToken).filter(
            QueueToken.patient_id == current_user.id,
            QueueToken.issue_time >= today_start,
            QueueToken.issue_time < today_end
        ).order_by(QueueToken.id.desc()).first()

    if not token:
        return None

    return format_token_out(db, token)

@router.get("/doctor-queue")
def get_doctor_queue(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_doctor)
):
    today_start, today_end = _today_utc_range()

    # Waiting tokens
    waiting_tokens = db.query(QueueToken).filter(
        QueueToken.doctor_id == current_user.id,
        QueueToken.status == "WAITING",
        QueueToken.issue_time >= today_start,
        QueueToken.issue_time < today_end
    ).order_by(QueueToken.priority.desc(), QueueToken.raw_sequence.asc()).all()

    # Currently called or in-consultation token
    active_token = db.query(QueueToken).filter(
        QueueToken.doctor_id == current_user.id,
        QueueToken.status.in_(["CALLED", "IN_CONSULTATION"]),
        QueueToken.issue_time >= today_start,
        QueueToken.issue_time < today_end
    ).order_by(QueueToken.called_time.desc()).first()

    # Completed tokens today
    completed_tokens = db.query(QueueToken).filter(
        QueueToken.doctor_id == current_user.id,
        QueueToken.status.in_(["COMPLETED", "SKIPPED"]),
        QueueToken.issue_time >= today_start,
        QueueToken.issue_time < today_end
    ).order_by(QueueToken.completed_time.desc()).limit(10).all()

    return {
        "active_token": format_token_out(db, active_token) if active_token else None,
        "waiting": [format_token_out(db, t) for t in waiting_tokens],
        "completed": [format_token_out(db, t) for t in completed_tokens],
        "waiting_count": len(waiting_tokens),
        "completed_count": len(completed_tokens)
    }

@router.post("/call-next", response_model=Optional[TokenOut])
def call_next_token(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_doctor)
):
    next_token = QueueService.call_next_patient(db, current_user.id)
    if not next_token:
        return None
    return format_token_out(db, next_token)

@router.post("/action/{token_id}", response_model=TokenOut)
def action_token(
    token_id: int,
    payload: TokenActionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_doctor)
):
    updated = QueueService.update_token_status(
        db=db,
        token_id=token_id,
        action=payload.action,
        notes=payload.notes,
        symptoms=payload.symptoms,
        diagnosis=payload.diagnosis,
        prescription=payload.prescription,
        vitals=payload.vitals,
        follow_up_date=payload.follow_up_date
    )
    return format_token_out(db, updated)

@router.get("/board", response_model=List[LiveQueueDoctorSummary])
def get_live_queue_board(db: Session = Depends(get_db)):
    today_start, today_end = _today_utc_range()
    doctors = db.query(DoctorProfile).all()

    summaries = []
    for doc in doctors:
        # Active token
        active = db.query(QueueToken).filter(
            QueueToken.doctor_id == doc.user_id,
            QueueToken.status.in_(["CALLED", "IN_CONSULTATION"]),
            QueueToken.issue_time >= today_start,
            QueueToken.issue_time < today_end
        ).order_by(QueueToken.called_time.desc()).first()

        # Waiting tokens
        waiting = db.query(QueueToken).filter(
            QueueToken.doctor_id == doc.user_id,
            QueueToken.status == "WAITING",
            QueueToken.issue_time >= today_start,
            QueueToken.issue_time < today_end
        ).order_by(QueueToken.priority.desc(), QueueToken.raw_sequence.asc()).all()

        summaries.append({
            "doctor_id": doc.user_id,
            "doctor_name": doc.user.full_name,
            "department_name": doc.department.name if doc.department else "General",
            "room_number": doc.room_number,
            "current_status": doc.current_status,
            "current_token": active.token_number if active else "None",
            "waiting_count": len(waiting),
            "next_tokens": [t.token_number for t in waiting[:4]]
        })

    return summaries
