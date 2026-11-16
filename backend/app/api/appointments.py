import random
from typing import List, Optional
from datetime import datetime, date
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.models.hospital_models import User, DoctorProfile, Department, Appointment, QueueToken, CaseHistory
from backend.app.schemas.hospital_schemas import AppointmentCreate, AppointmentOut
from backend.app.api.deps import get_current_user, require_doctor, require_admin
from backend.app.services.queue_service import QueueService

router = APIRouter(prefix="/appointments", tags=["Appointments"])

ALL_SLOTS = [
    "09:00 AM", "09:30 AM", "10:00 AM", "10:30 AM", 
    "11:00 AM", "11:30 AM", "12:00 PM", "12:30 PM",
    "02:00 PM", "02:30 PM", "03:00 PM", "03:30 PM", 
    "04:00 PM", "04:30 PM", "05:00 PM"
]

def format_appointment_out(apt: Appointment) -> dict:
    return {
        "id": apt.id,
        "appointment_number": apt.appointment_number,
        "patient_id": apt.patient_id,
        "patient_name": apt.patient.full_name if apt.patient else "Patient",
        "patient_phone": apt.patient.phone if apt.patient else "",
        "doctor_id": apt.doctor_id,
        "doctor_name": apt.doctor.full_name if apt.doctor else "Doctor",
        "doctor_room": apt.doctor.doctor_profile.room_number if apt.doctor and apt.doctor.doctor_profile else "Room 101",
        "department_id": apt.department_id,
        "department_name": apt.department.name if apt.department else "General",
        "appointment_date": apt.appointment_date,
        "appointment_time": apt.appointment_time,
        "reason": apt.reason,
        "status": apt.status,
        "token_number": apt.token.token_number if apt.token else None,
        "created_at": apt.created_at
    }

@router.get("/slots")
def get_available_slots(doctor_id: int, date_str: str, db: Session = Depends(get_db)):
    # Find booked appointments for doctor on that date
    booked_appointments = db.query(Appointment.appointment_time).filter(
        Appointment.doctor_id == doctor_id,
        Appointment.appointment_date == date_str,
        Appointment.status != "CANCELLED"
    ).all()
    
    booked_slots = set(slot[0] for slot in booked_appointments)
    
    slots_info = []
    for slot in ALL_SLOTS:
        slots_info.append({
            "time": slot,
            "is_available": slot not in booked_slots
        })
    
    return {
        "doctor_id": doctor_id,
        "date": date_str,
        "slots": slots_info
    }

@router.post("", response_model=AppointmentOut, status_code=status.HTTP_201_CREATED)
def create_appointment(
    payload: AppointmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Validate appointment date is not in the past
    try:
        apt_date = date.fromisoformat(payload.appointment_date)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid date format. Use YYYY-MM-DD.")
    if apt_date < date.today():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Appointment date cannot be in the past. Please select today or a future date.")

    # Verify doctor exists
    doctor = db.query(User).filter(User.id == payload.doctor_id, User.role == "doctor").first()
    if not doctor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Doctor not found")

    # Verify department exists
    department = db.query(Department).filter(Department.id == payload.department_id).first()
    if not department:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Department not found")

    # Prevent duplicate bookings: same doctor, same date, same time slot
    conflict = db.query(Appointment).filter(
        Appointment.doctor_id == payload.doctor_id,
        Appointment.appointment_date == payload.appointment_date,
        Appointment.appointment_time == payload.appointment_time,
        Appointment.status != "CANCELLED"
    ).first()
    if conflict:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This time slot is already booked for the selected doctor. Please choose another time."
        )

    # Check if patient already booked with this doctor on the same day
    existing_patient_apt = db.query(Appointment).filter(
        Appointment.patient_id == current_user.id,
        Appointment.doctor_id == payload.doctor_id,
        Appointment.appointment_date == payload.appointment_date,
        Appointment.status != "CANCELLED"
    ).first()
    if existing_patient_apt:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You already have an appointment with this doctor on this date."
        )

    # Generate appointment number: APT-YYYYMMDD-XXXX
    date_compact = payload.appointment_date.replace("-", "")
    random_suffix = random.randint(1000, 9999)
    appointment_number = f"APT-{date_compact}-{random_suffix}"

    appointment = Appointment(
        appointment_number=appointment_number,
        patient_id=current_user.id,
        doctor_id=payload.doctor_id,
        department_id=payload.department_id,
        appointment_date=payload.appointment_date,
        appointment_time=payload.appointment_time,
        reason=payload.reason,
        status="CONFIRMED",
        created_at=datetime.utcnow()
    )
    db.add(appointment)
    db.flush()

    # Automatically generate Digital Queue Token for the appointment (Step 5)
    tok = QueueService.generate_token(
        db=db,
        patient_id=current_user.id,
        doctor_id=payload.doctor_id,
        department_id=payload.department_id,
        appointment_id=appointment.id,
        priority=0
    )

    # Attach reason to synchronized CaseHistory
    if payload.reason:
        case = db.query(CaseHistory).filter(CaseHistory.appointment_id == appointment.id).first()
        if case:
            case.symptoms = payload.reason

    db.commit()
    db.refresh(appointment)
    return format_appointment_out(appointment)

@router.get("/my", response_model=List[AppointmentOut])
def get_my_appointments(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    appointments = db.query(Appointment).filter(
        Appointment.patient_id == current_user.id
    ).order_by(Appointment.appointment_date.desc(), Appointment.id.desc()).all()
    return [format_appointment_out(a) for a in appointments]

@router.get("/doctor", response_model=List[AppointmentOut])
def get_doctor_appointments(
    current_user: User = Depends(require_doctor),
    db: Session = Depends(get_db)
):
    appointments = db.query(Appointment).filter(
        Appointment.doctor_id == current_user.id
    ).order_by(Appointment.appointment_date.desc(), Appointment.id.desc()).all()
    return [format_appointment_out(a) for a in appointments]

@router.get("/all", response_model=List[AppointmentOut])
def get_all_appointments(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    appointments = db.query(Appointment).order_by(
        Appointment.appointment_date.desc(), Appointment.id.desc()
    ).all()
    return [format_appointment_out(a) for a in appointments]

@router.put("/{appointment_id}/cancel")
def cancel_appointment(
    appointment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    apt = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not apt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found")

    # Authorization check: only patient who booked it, the doctor, or an admin
    if current_user.role != "admin" and current_user.id not in [apt.patient_id, apt.doctor_id]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to cancel this appointment")

    apt.status = "CANCELLED"
    if apt.token:
        apt.token.status = "CANCELLED"

    db.commit()
    return {"message": "Appointment cancelled successfully"}
