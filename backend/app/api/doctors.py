from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, date

from backend.app.core.database import get_db
from backend.app.core.security import hash_password
from backend.app.models.hospital_models import User, DoctorProfile, Department, Appointment, QueueToken
from backend.app.schemas.hospital_schemas import (
    DoctorCreate,
    DoctorOut,
    DoctorStatusUpdate,
    AppointmentOut,
    TokenOut
)
from backend.app.api.deps import require_admin, require_doctor, get_current_user
from backend.app.services.queue_service import QueueService

router = APIRouter(prefix="/doctors", tags=["Doctors"])

def format_doctor_out(doc_profile: DoctorProfile) -> dict:
    return {
        "id": doc_profile.id,
        "user_id": doc_profile.user_id,
        "full_name": doc_profile.user.full_name,
        "username": doc_profile.user.username,
        "email": doc_profile.user.email,
        "phone": doc_profile.user.phone,
        "department_id": doc_profile.department_id,
        "department_name": doc_profile.department.name if doc_profile.department else "General",
        "department_code": doc_profile.department.code if doc_profile.department else "GEN",
        "specialization": doc_profile.specialization,
        "room_number": doc_profile.room_number,
        "consultation_fee": doc_profile.consultation_fee,
        "avg_consultation_time": doc_profile.avg_consultation_time,
        "is_available": doc_profile.is_available,
        "current_status": doc_profile.current_status
    }

@router.get("", response_model=List[DoctorOut])
def list_doctors(
    department_id: Optional[int] = None,
    available_only: Optional[bool] = False,
    db: Session = Depends(get_db)
):
    query = db.query(DoctorProfile).join(User).filter(User.is_active == True)
    if department_id:
        query = query.filter(DoctorProfile.department_id == department_id)
    if available_only:
        query = query.filter(DoctorProfile.is_available == True)
    
    profiles = query.all()
    return [format_doctor_out(p) for p in profiles]

@router.get("/me", response_model=DoctorOut)
def get_current_doctor_profile(
    current_user: User = Depends(require_doctor),
    db: Session = Depends(get_db)
):
    profile = db.query(DoctorProfile).filter(DoctorProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Doctor profile not found")
    return format_doctor_out(profile)

@router.get("/{doctor_id}", response_model=DoctorOut)
def get_doctor(doctor_id: int, db: Session = Depends(get_db)):
    # Can query by DoctorProfile.id OR User.id
    profile = db.query(DoctorProfile).filter(
        (DoctorProfile.id == doctor_id) | (DoctorProfile.user_id == doctor_id)
    ).first()
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Doctor not found")
    return format_doctor_out(profile)

@router.post("", response_model=DoctorOut, status_code=status.HTTP_201_CREATED)
def create_doctor(
    payload: DoctorCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    # Verify username or email not taken
    existing = db.query(User).filter(
        (User.username == payload.username.strip().lower()) | (User.email == payload.email.strip().lower())
    ).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username or email already in use")

    dept = db.query(Department).filter(Department.id == payload.department_id).first()
    if not dept:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Department does not exist")

    user = User(
        username=payload.username.strip().lower(),
        email=payload.email.strip().lower(),
        full_name=payload.full_name.strip(),
        phone=payload.phone.strip(),
        role="doctor",
        hashed_password=hash_password(payload.password),
        is_active=True
    )
    db.add(user)
    db.flush()

    doctor_profile = DoctorProfile(
        user_id=user.id,
        department_id=payload.department_id,
        specialization=payload.specialization,
        room_number=payload.room_number,
        consultation_fee=payload.consultation_fee or 50.0,
        avg_consultation_time=payload.avg_consultation_time or 15,
        is_available=True,
        current_status="Available"
    )
    db.add(doctor_profile)
    db.commit()
    db.refresh(doctor_profile)

    return format_doctor_out(doctor_profile)

@router.put("/{doctor_id}/status", response_model=DoctorOut)
def update_doctor_status(
    doctor_id: int,
    payload: DoctorStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    profile = db.query(DoctorProfile).filter(
        (DoctorProfile.id == doctor_id) | (DoctorProfile.user_id == doctor_id)
    ).first()
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Doctor profile not found")

    # Only the doctor themselves or an admin can update status
    if current_user.role != "admin" and current_user.id != profile.user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to update this status")

    profile.current_status = payload.current_status
    if payload.is_available is not None:
        profile.is_available = payload.is_available

    db.commit()
    db.refresh(profile)
    return format_doctor_out(profile)
