import random
from typing import List, Optional
from datetime import datetime, date
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.models.hospital_models import User, DoctorProfile, Department, Appointment, QueueToken, CaseHistory
from backend.app.schemas.hospital_schemas import CaseHistoryCreate, CaseHistoryUpdate, CaseHistoryOut
from backend.app.api.deps import get_current_user, require_doctor, require_admin

router = APIRouter(prefix="/cases", tags=["Case History"])


def format_case_out(case: CaseHistory) -> dict:
    patient = case.patient
    doctor = case.doctor
    department = case.department
    doctor_room = (doctor.doctor_profile.room_number if doctor and doctor.doctor_profile else "Room 101") if doctor else "Room 101"
    token_number = case.token.token_number if case.token else None

    return {
        "id": case.id,
        "case_number": case.case_number,
        "patient_id": case.patient_id,
        "patient_name": patient.full_name if patient else "Patient",
        "patient_email": patient.email if patient else None,
        "patient_phone": patient.phone if patient else None,
        "doctor_id": case.doctor_id,
        "doctor_name": doctor.full_name if doctor else "Doctor",
        "doctor_room": doctor_room,
        "department_id": case.department_id,
        "department_name": department.name if department else "General",
        "appointment_id": case.appointment_id,
        "token_id": case.token_id,
        "token_number": token_number,
        "status": case.status,
        "symptoms": case.symptoms,
        "diagnosis": case.diagnosis,
        "prescription": case.prescription,
        "clinical_notes": case.clinical_notes,
        "vitals": case.vitals,
        "follow_up_date": case.follow_up_date,
        "created_at": case.created_at,
        "updated_at": case.updated_at,
        "completed_at": case.completed_at
    }


def generate_case_number(db: Session) -> str:
    today_str = datetime.utcnow().strftime("%Y%m%d")
    count = db.query(CaseHistory).count() + 1
    return f"CASE-{today_str}-{count:04d}"


@router.post("", response_model=CaseHistoryOut, status_code=status.HTTP_201_CREATED)
def create_case(
    payload: CaseHistoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    case_num = generate_case_number(db)
    new_case = CaseHistory(
        case_number=case_num,
        patient_id=payload.patient_id,
        doctor_id=payload.doctor_id,
        department_id=payload.department_id,
        appointment_id=payload.appointment_id,
        token_id=payload.token_id,
        status=payload.status or "PENDING",
        symptoms=payload.symptoms,
        diagnosis=payload.diagnosis,
        prescription=payload.prescription,
        clinical_notes=payload.clinical_notes,
        vitals=payload.vitals,
        follow_up_date=payload.follow_up_date,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    if payload.status == "COMPLETED":
        new_case.completed_at = datetime.utcnow()

    db.add(new_case)
    db.commit()
    db.refresh(new_case)
    return format_case_out(new_case)


@router.get("/patient/my", response_model=List[CaseHistoryOut])
def get_my_patient_cases(
    status_filter: Optional[str] = Query(None, alias="status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(CaseHistory).filter(CaseHistory.patient_id == current_user.id)
    if status_filter and status_filter.upper() != "ALL":
        query = query.filter(CaseHistory.status == status_filter.upper())
    cases = query.order_by(CaseHistory.created_at.desc()).all()
    return [format_case_out(c) for c in cases]


@router.get("/patient/{patient_id}", response_model=List[CaseHistoryOut])
def get_cases_for_patient(
    patient_id: int,
    status_filter: Optional[str] = Query(None, alias="status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Patient can only view their own; doctor or admin can view any
    if current_user.role == "patient" and current_user.id != patient_id:
        raise HTTPException(status_code=403, detail="Not authorized to view other patient cases")

    query = db.query(CaseHistory).filter(CaseHistory.patient_id == patient_id)
    if status_filter and status_filter.upper() != "ALL":
        query = query.filter(CaseHistory.status == status_filter.upper())
    cases = query.order_by(CaseHistory.created_at.desc()).all()
    return [format_case_out(c) for c in cases]


@router.get("/doctor/my", response_model=List[CaseHistoryOut])
def get_my_doctor_cases(
    status_filter: Optional[str] = Query(None, alias="status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_doctor)
):
    query = db.query(CaseHistory).filter(CaseHistory.doctor_id == current_user.id)
    if status_filter and status_filter.upper() != "ALL":
        query = query.filter(CaseHistory.status == status_filter.upper())
    cases = query.order_by(CaseHistory.created_at.desc()).all()
    return [format_case_out(c) for c in cases]


@router.get("/all", response_model=List[CaseHistoryOut])
def get_all_cases(
    status_filter: Optional[str] = Query(None, alias="status"),
    department_id: Optional[int] = None,
    doctor_id: Optional[int] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    query = db.query(CaseHistory)
    if status_filter and status_filter.upper() != "ALL":
        query = query.filter(CaseHistory.status == status_filter.upper())
    if department_id:
        query = query.filter(CaseHistory.department_id == department_id)
    if doctor_id:
        query = query.filter(CaseHistory.doctor_id == doctor_id)
    
    cases = query.order_by(CaseHistory.created_at.desc()).all()
    
    if search:
        s = search.lower()
        cases = [
            c for c in cases
            if (c.case_number and s in c.case_number.lower())
            or (c.patient and s in c.patient.full_name.lower())
            or (c.doctor and s in c.doctor.full_name.lower())
            or (c.diagnosis and s in c.diagnosis.lower())
        ]

    return [format_case_out(c) for c in cases]


@router.get("/{case_id}", response_model=CaseHistoryOut)
def get_case_detail(
    case_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    case = db.query(CaseHistory).filter(CaseHistory.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case history record not found")
    
    # Check permissions
    if current_user.role == "patient" and case.patient_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to access this case history")

    return format_case_out(case)


@router.put("/{case_id}", response_model=CaseHistoryOut)
def update_case(
    case_id: int,
    payload: CaseHistoryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    case = db.query(CaseHistory).filter(CaseHistory.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case history not found")

    if current_user.role not in ["doctor", "admin"]:
        raise HTTPException(status_code=403, detail="Only doctors and admins can update case history")

    if payload.symptoms is not None:
        case.symptoms = payload.symptoms
    if payload.diagnosis is not None:
        case.diagnosis = payload.diagnosis
    if payload.prescription is not None:
        case.prescription = payload.prescription
    if payload.clinical_notes is not None:
        case.clinical_notes = payload.clinical_notes
    if payload.vitals is not None:
        case.vitals = payload.vitals
    if payload.follow_up_date is not None:
        case.follow_up_date = payload.follow_up_date
    if payload.status is not None:
        case.status = payload.status.upper()
        if case.status == "COMPLETED" and not case.completed_at:
            case.completed_at = datetime.utcnow()

    case.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(case)
    return format_case_out(case)
