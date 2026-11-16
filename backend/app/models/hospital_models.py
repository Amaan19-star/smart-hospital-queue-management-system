from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Float
from sqlalchemy.orm import relationship
from backend.app.core.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    full_name = Column(String(100), nullable=False)
    phone = Column(String(20), nullable=True)
    role = Column(String(20), default="patient")  # "patient", "doctor", "admin"
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    patient_profile = relationship("PatientProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    doctor_profile = relationship("DoctorProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    patient_appointments = relationship("Appointment", foreign_keys="Appointment.patient_id", back_populates="patient")
    doctor_appointments = relationship("Appointment", foreign_keys="Appointment.doctor_id", back_populates="doctor")
    patient_tokens = relationship("QueueToken", foreign_keys="QueueToken.patient_id", back_populates="patient")
    doctor_tokens = relationship("QueueToken", foreign_keys="QueueToken.doctor_id", back_populates="doctor")


class PatientProfile(Base):
    __tablename__ = "patient_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    dob = Column(String(20), nullable=True)  # YYYY-MM-DD
    gender = Column(String(20), nullable=True)  # Male, Female, Other
    address = Column(Text, nullable=True)
    emergency_contact = Column(String(50), nullable=True)
    blood_group = Column(String(10), nullable=True)

    user = relationship("User", back_populates="patient_profile")


class Department(Base):
    __tablename__ = "departments"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    code = Column(String(10), unique=True, nullable=False)  # e.g., CARD, GEN, PED
    description = Column(Text, nullable=True)
    icon = Column(String(50), default="Activity")
    is_active = Column(Boolean, default=True)

    doctors = relationship("DoctorProfile", back_populates="department")
    appointments = relationship("Appointment", back_populates="department")
    tokens = relationship("QueueToken", back_populates="department")


class DoctorProfile(Base):
    __tablename__ = "doctor_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=False)
    specialization = Column(String(100), nullable=False)
    room_number = Column(String(50), nullable=False, default="Room 101")
    consultation_fee = Column(Float, default=50.0)
    avg_consultation_time = Column(Integer, default=15)  # in minutes
    is_available = Column(Boolean, default=True)
    current_status = Column(String(30), default="Available")  # "Available", "In Consultation", "Break", "Offline"

    user = relationship("User", back_populates="doctor_profile")
    department = relationship("Department", back_populates="doctors")


class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(Integer, primary_key=True, index=True)
    appointment_number = Column(String(50), unique=True, index=True, nullable=False)
    patient_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    doctor_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=False)
    appointment_date = Column(String(20), nullable=False)  # YYYY-MM-DD
    appointment_time = Column(String(20), nullable=False)  # e.g. "09:30 AM"
    reason = Column(Text, nullable=True)
    status = Column(String(30), default="CONFIRMED")  # CONFIRMED, WAITING, IN_CONSULTATION, COMPLETED, CANCELLED
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    patient = relationship("User", foreign_keys=[patient_id], back_populates="patient_appointments")
    doctor = relationship("User", foreign_keys=[doctor_id], back_populates="doctor_appointments")
    department = relationship("Department", back_populates="appointments")
    token = relationship("QueueToken", back_populates="appointment", uselist=False)


class QueueToken(Base):
    __tablename__ = "queue_tokens"

    id = Column(Integer, primary_key=True, index=True)
    token_number = Column(String(30), unique=True, index=True, nullable=False)  # e.g., "CARD-101"
    raw_sequence = Column(Integer, nullable=False)  # sequential number for the day
    appointment_id = Column(Integer, ForeignKey("appointments.id"), nullable=True)
    patient_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    doctor_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=False)
    status = Column(String(30), default="WAITING")  # WAITING, CALLED, IN_CONSULTATION, COMPLETED, SKIPPED, CANCELLED
    priority = Column(Integer, default=0)  # 0: Standard, 1: Priority/Emergency
    issue_time = Column(DateTime, default=datetime.utcnow)
    called_time = Column(DateTime, nullable=True)
    completed_time = Column(DateTime, nullable=True)
    notes = Column(Text, nullable=True)

    patient = relationship("User", foreign_keys=[patient_id], back_populates="patient_tokens")
    doctor = relationship("User", foreign_keys=[doctor_id], back_populates="doctor_tokens")
    department = relationship("Department", back_populates="tokens")
    appointment = relationship("Appointment", back_populates="token")


class CaseHistory(Base):
    __tablename__ = "case_histories"

    id = Column(Integer, primary_key=True, index=True)
    case_number = Column(String(50), unique=True, index=True, nullable=False)  # e.g., "CASE-2026-101"
    patient_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    doctor_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=False)
    appointment_id = Column(Integer, ForeignKey("appointments.id"), nullable=True)
    token_id = Column(Integer, ForeignKey("queue_tokens.id"), nullable=True)

    status = Column(String(30), default="PENDING")  # PENDING, IN_PROGRESS, COMPLETED, CANCELLED, SKIPPED
    symptoms = Column(Text, nullable=True)          # Chief complaints
    diagnosis = Column(Text, nullable=True)         # Clinical diagnosis
    prescription = Column(Text, nullable=True)      # Medicines & dosage
    clinical_notes = Column(Text, nullable=True)    # Lab / consultation notes
    vitals = Column(String(200), nullable=True)     # BP, Pulse, SpO2, Temperature
    follow_up_date = Column(String(50), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    patient = relationship("User", foreign_keys=[patient_id])
    doctor = relationship("User", foreign_keys=[doctor_id])
    department = relationship("Department")
    appointment = relationship("Appointment")
    token = relationship("QueueToken")

