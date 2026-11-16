from typing import Optional, List, Any
from pydantic import BaseModel, EmailStr, Field
from datetime import datetime

# --- Auth Schemas ---
class LoginRequest(BaseModel):
    username: str
    password: str
    portal_type: Optional[str] = "patient"  # "patient" or "staff" (admin/doctor)
    remember_me: Optional[bool] = False

class RegisterPatientRequest(BaseModel):
    full_name: str = Field(..., min_length=2)
    username: str = Field(..., min_length=3)
    email: EmailStr
    phone: str = Field(..., min_length=7)
    dob: str
    gender: str
    address: str
    password: str = Field(..., min_length=6)
    confirm_password: str

class RegisterStaffRequest(BaseModel):
    full_name: str = Field(..., min_length=2)
    username: str = Field(..., min_length=3)
    email: EmailStr
    phone: str = Field(..., min_length=7)
    role: str = Field(..., description="'doctor' or 'admin'")
    password: str = Field(..., min_length=6)
    confirm_password: str
    
    # Doctor specific fields
    department_id: Optional[int] = None
    specialization: Optional[str] = None
    room_number: Optional[str] = "Room 101"
    consultation_fee: Optional[float] = 50.0
    avg_consultation_time: Optional[int] = 15

    # Security verification code (optional/hospital invite code)
    security_code: Optional[str] = None

class ForgotPasswordRequest(BaseModel):
    identifier: str  # email or username
    new_password: Optional[str] = None

class PatientProfileOut(BaseModel):
    dob: Optional[str] = None
    gender: Optional[str] = None
    address: Optional[str] = None
    emergency_contact: Optional[str] = None
    blood_group: Optional[str] = None

    class Config:
        from_attributes = True

class UserOut(BaseModel):
    id: int
    username: str
    email: str
    full_name: str
    phone: Optional[str] = None
    role: str
    is_active: bool
    patient_profile: Optional[PatientProfileOut] = None

    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut

# --- Department Schemas ---
class DepartmentCreate(BaseModel):
    name: str
    code: str
    description: Optional[str] = None
    icon: Optional[str] = "Activity"
    is_active: Optional[bool] = True

class DepartmentOut(BaseModel):
    id: int
    name: str
    code: str
    description: Optional[str] = None
    icon: Optional[str] = "Activity"
    is_active: bool

    class Config:
        from_attributes = True

# --- Doctor Schemas ---
class DoctorCreate(BaseModel):
    full_name: str
    username: str
    email: EmailStr
    phone: str
    password: str
    department_id: int
    specialization: str
    room_number: str
    consultation_fee: Optional[float] = 50.0
    avg_consultation_time: Optional[int] = 15

class DoctorOut(BaseModel):
    id: int
    user_id: int
    full_name: str
    username: str
    email: str
    phone: Optional[str] = None
    department_id: int
    department_name: str
    department_code: str
    specialization: str
    room_number: str
    consultation_fee: float
    avg_consultation_time: int
    is_available: bool
    current_status: str

    class Config:
        from_attributes = True

class DoctorStatusUpdate(BaseModel):
    current_status: str  # "Available", "In Consultation", "Break", "Offline"
    is_available: Optional[bool] = None

# --- Appointment Schemas ---
class AppointmentCreate(BaseModel):
    department_id: int
    doctor_id: int
    appointment_date: str  # YYYY-MM-DD
    appointment_time: str  # e.g., "10:00 AM"
    reason: Optional[str] = None

class AppointmentOut(BaseModel):
    id: int
    appointment_number: str
    patient_id: int
    patient_name: str
    patient_phone: Optional[str] = None
    doctor_id: int
    doctor_name: str
    doctor_room: Optional[str] = None
    department_id: int
    department_name: str
    appointment_date: str
    appointment_time: str
    reason: Optional[str] = None
    status: str
    token_number: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

# --- Queue Token Schemas ---
class TokenGenerateRequest(BaseModel):
    appointment_id: Optional[int] = None
    department_id: int
    doctor_id: int
    priority: Optional[int] = 0

class TokenOut(BaseModel):
    id: int
    token_number: str
    raw_sequence: int
    appointment_id: Optional[int] = None
    patient_id: int
    patient_name: str
    doctor_id: int
    doctor_name: str
    doctor_room: str
    department_id: int
    department_name: str
    status: str
    priority: int
    issue_time: datetime
    called_time: Optional[datetime] = None
    completed_time: Optional[datetime] = None
    notes: Optional[str] = None
    position: int = 0
    patients_ahead: int = 0
    estimated_wait_minutes: int = 0
    current_serving_token: Optional[str] = None

    class Config:
        from_attributes = True

class TokenActionRequest(BaseModel):
    action: str  # "CALL", "START", "COMPLETE", "SKIP", "CANCEL"
    notes: Optional[str] = None
    symptoms: Optional[str] = None
    diagnosis: Optional[str] = None
    prescription: Optional[str] = None
    vitals: Optional[str] = None
    follow_up_date: Optional[str] = None

# --- Live Queue Board Schemas ---
class LiveQueueDoctorSummary(BaseModel):
    doctor_id: int
    doctor_name: str
    department_name: str
    room_number: str
    current_status: str
    current_token: Optional[str] = None
    waiting_count: int
    next_tokens: List[str]

class HospitalActivityStats(BaseModel):
    total_patients: int
    total_doctors: int
    appointments_today: int
    tokens_waiting: int
    tokens_completed: int
    tokens_in_consultation: int
    average_wait_minutes: int
    doctor_summaries: List[LiveQueueDoctorSummary]


# --- Case History Schemas ---
class CaseHistoryBase(BaseModel):
    symptoms: Optional[str] = None
    diagnosis: Optional[str] = None
    prescription: Optional[str] = None
    clinical_notes: Optional[str] = None
    vitals: Optional[str] = None
    follow_up_date: Optional[str] = None
    status: Optional[str] = "PENDING"  # PENDING, IN_PROGRESS, COMPLETED, CANCELLED, SKIPPED

class CaseHistoryCreate(CaseHistoryBase):
    patient_id: int
    doctor_id: int
    department_id: int
    appointment_id: Optional[int] = None
    token_id: Optional[int] = None

class CaseHistoryUpdate(CaseHistoryBase):
    pass

class CaseHistoryOut(BaseModel):
    id: int
    case_number: str
    patient_id: int
    patient_name: str
    patient_email: Optional[str] = None
    patient_phone: Optional[str] = None
    doctor_id: int
    doctor_name: str
    doctor_room: Optional[str] = None
    department_id: int
    department_name: str
    appointment_id: Optional[int] = None
    token_id: Optional[int] = None
    token_number: Optional[str] = None
    status: str
    symptoms: Optional[str] = None
    diagnosis: Optional[str] = None
    prescription: Optional[str] = None
    clinical_notes: Optional[str] = None
    vitals: Optional[str] = None
    follow_up_date: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True

