from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import timedelta

from backend.app.core.database import get_db
from backend.app.core.security import verify_password, hash_password, create_access_token
from backend.app.core.config import settings
from backend.app.models.hospital_models import User, PatientProfile, DoctorProfile, Department
from backend.app.schemas.hospital_schemas import (
    LoginRequest,
    RegisterPatientRequest,
    RegisterStaffRequest,
    ForgotPasswordRequest,
    TokenResponse,
    UserOut,
    PatientProfileOut
)
from backend.app.api.deps import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register_patient(payload: RegisterPatientRequest, db: Session = Depends(get_db)):
    # Validate passwords match
    if payload.password != payload.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Passwords do not match"
        )
    
    # Check if username exists (case-insensitive)
    clean_username = payload.username.strip().lower()
    clean_email = payload.email.strip().lower()

    existing_username = db.query(User).filter(func.lower(User.username) == clean_username).first()
    if existing_username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered. Please choose another username or log in."
        )

    # Check if email exists (case-insensitive)
    existing_email = db.query(User).filter(func.lower(User.email) == clean_email).first()
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email address already registered. Please log in or use a different email."
        )

    # Create new patient user
    new_user = User(
        username=payload.username.strip().lower(),
        email=payload.email.strip().lower(),
        full_name=payload.full_name.strip(),
        phone=payload.phone.strip(),
        role="patient",
        hashed_password=hash_password(payload.password),
        is_active=True
    )
    db.add(new_user)
    db.flush()

    # Create associated PatientProfile
    patient_profile = PatientProfile(
        user_id=new_user.id,
        dob=payload.dob,
        gender=payload.gender,
        address=payload.address
    )
    db.add(patient_profile)
    db.commit()
    db.refresh(new_user)

    return new_user

@router.post("/register-staff", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register_staff(payload: RegisterStaffRequest, db: Session = Depends(get_db)):
    if payload.password != payload.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Passwords do not match"
        )

    clean_role = payload.role.strip().lower()
    if clean_role not in ["doctor", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid staff role. Must be 'doctor' or 'admin'"
        )

    # If admin registration, check security code
    if clean_role == "admin":
        valid_codes = ["HOSPITAL2026", "ADMIN123", "APEX-STAFF", "ADMIN"]
        code = (payload.security_code or "").strip().upper()
        if code not in valid_codes:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Invalid Administrator Security Passcode. Please enter 'HOSPITAL2026' or contact hospital management."
            )

    # Check if username exists (case-insensitive)
    clean_username = payload.username.strip().lower()
    clean_email = payload.email.strip().lower()

    existing_username = db.query(User).filter(func.lower(User.username) == clean_username).first()
    if existing_username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered. Please choose another username or log in."
        )

    # Check if email exists (case-insensitive)
    existing_email = db.query(User).filter(func.lower(User.email) == clean_email).first()
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email address already registered. Please log in or use a different email."
        )

    # Doctor specific verification
    if clean_role == "doctor":
        if not payload.department_id:
            # Default to first department if not specified
            dept = db.query(Department).first()
            if not dept:
                raise HTTPException(status_code=400, detail="No hospital departments available.")
            dept_id = dept.id
        else:
            dept = db.query(Department).filter(Department.id == payload.department_id).first()
            if not dept:
                raise HTTPException(status_code=404, detail="Selected department not found.")
            dept_id = payload.department_id

    # Create new staff user
    new_staff = User(
        username=payload.username.strip().lower(),
        email=payload.email.strip().lower(),
        full_name=payload.full_name.strip(),
        phone=payload.phone.strip(),
        role=clean_role,
        hashed_password=hash_password(payload.password),
        is_active=True
    )
    db.add(new_staff)
    db.flush()

    if clean_role == "doctor":
        doc_profile = DoctorProfile(
            user_id=new_staff.id,
            department_id=dept_id,
            specialization=payload.specialization.strip() if payload.specialization else "Consultant Physician",
            room_number=payload.room_number.strip() if payload.room_number else "Room 101",
            consultation_fee=payload.consultation_fee or 50.0,
            avg_consultation_time=payload.avg_consultation_time or 15,
            is_available=True,
            current_status="Available"
        )
        db.add(doc_profile)

    db.commit()
    db.refresh(new_staff)
    return new_staff

@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    clean_identifier = payload.username.strip()
    
    # Allow login by username OR email (case-insensitive)
    user = db.query(User).filter(
        (func.lower(User.username) == clean_identifier.lower()) | 
        (func.lower(User.email) == clean_identifier.lower())
    ).first()

    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password. Please verify your credentials."
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated. Please contact hospital administration."
        )

    # Calculate token expiry (extended if remember_me is True)
    expires = timedelta(days=7) if payload.remember_me else timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    token = create_access_token(subject=user.id, role=user.role, expires_delta=expires)

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user
    }

@router.get("/me", response_model=UserOut)
def get_profile(current_user: User = Depends(get_current_user)):
    return current_user

@router.post("/forgot-password")
def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
    identifier = payload.identifier.strip().lower()
    user = db.query(User).filter(
        (func.lower(User.username) == identifier) | (func.lower(User.email) == identifier)
    ).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No account found with this username or email"
        )

    if payload.new_password:
        if len(payload.new_password) < 6:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password must be at least 6 characters"
            )
        user.hashed_password = hash_password(payload.new_password)
        db.commit()
        return {"message": "Password updated successfully! You can now log in with your new password."}

    return {"message": f"Account verified for {user.full_name}. Please set your new password."}
