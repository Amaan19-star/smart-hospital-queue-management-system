from typing import List
from datetime import datetime, date
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.app.core.database import get_db
from backend.app.models.hospital_models import User, PatientProfile, DoctorProfile, Department, Appointment, QueueToken
from backend.app.schemas.hospital_schemas import HospitalActivityStats, UserOut, AppointmentOut, TokenOut
from backend.app.api.deps import require_admin
from backend.app.api.doctors import format_doctor_out
from backend.app.api.appointments import format_appointment_out
from backend.app.api.queue import format_token_out, get_live_queue_board

router = APIRouter(prefix="/admin", tags=["Admin Portal"])

@router.get("/stats", response_model=HospitalActivityStats)
def get_hospital_stats(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    today_start = datetime.combine(date.today(), datetime.min.time())

    total_patients = db.query(func.count(User.id)).filter(User.role == "patient").scalar() or 0
    total_doctors = db.query(func.count(User.id)).filter(User.role == "doctor").scalar() or 0
    
    appointments_today = db.query(func.count(Appointment.id)).filter(
        Appointment.appointment_date == str(date.today()),
        Appointment.status != "CANCELLED"
    ).scalar() or 0

    tokens_waiting = db.query(func.count(QueueToken.id)).filter(
        QueueToken.status == "WAITING",
        QueueToken.issue_time >= today_start
    ).scalar() or 0

    tokens_in_consultation = db.query(func.count(QueueToken.id)).filter(
        QueueToken.status.in_(["CALLED", "IN_CONSULTATION"]),
        QueueToken.issue_time >= today_start
    ).scalar() or 0

    tokens_completed = db.query(func.count(QueueToken.id)).filter(
        QueueToken.status == "COMPLETED",
        QueueToken.issue_time >= today_start
    ).scalar() or 0

    # Calculate average wait time (in minutes) from doctor avg consultation times or default 15m
    doctor_summaries = get_live_queue_board(db)
    avg_wait = 15 if tokens_waiting > 0 else 0

    return {
        "total_patients": total_patients,
        "total_doctors": total_doctors,
        "appointments_today": appointments_today,
        "tokens_waiting": tokens_waiting,
        "tokens_completed": tokens_completed,
        "tokens_in_consultation": tokens_in_consultation,
        "average_wait_minutes": avg_wait,
        "doctor_summaries": doctor_summaries
    }

@router.get("/patients", response_model=List[UserOut])
def get_all_patients(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    return db.query(User).filter(User.role == "patient").order_by(User.created_at.desc()).all()

@router.put("/patients/{user_id}/toggle-status")
def toggle_patient_status(
    user_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    user = db.query(User).filter(User.id == user_id, User.role == "patient").first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")
    
    user.is_active = not user.is_active
    db.commit()
    return {"message": f"Patient status updated to {'Active' if user.is_active else 'Inactive'}"}

@router.get("/queue/all", response_model=List[TokenOut])
def get_all_today_tokens(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    today_start = datetime.combine(date.today(), datetime.min.time())
    tokens = db.query(QueueToken).filter(QueueToken.issue_time >= today_start).order_by(QueueToken.id.desc()).all()
    return [format_token_out(db, t) for t in tokens]

@router.put("/queue/{token_id}/priority")
def set_token_priority(
    token_id: int,
    priority: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    token = db.query(QueueToken).filter(QueueToken.id == token_id).first()
    if not token:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Token not found")
    
    token.priority = priority
    db.commit()
    return {"message": f"Token {token.token_number} priority set to {priority}"}
