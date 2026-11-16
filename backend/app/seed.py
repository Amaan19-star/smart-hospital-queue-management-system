from datetime import datetime, date
from sqlalchemy.orm import Session

from backend.app.core.database import SessionLocal, Base, engine
from backend.app.core.security import hash_password
from backend.app.models.hospital_models import (
    User,
    PatientProfile,
    Department,
    DoctorProfile,
    Appointment,
    QueueToken,
    CaseHistory
)

def seed_database():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        # Check if admin already exists
        admin = db.query(User).filter(User.username == "admin").first()
        if admin:
            print("Database already seeded.")
            return

        print("Seeding initial database data...")

        # 1. Admin User
        admin_user = User(
            username="admin",
            email="admin@hospital.com",
            full_name="Hospital Administrator",
            phone="+1-800-555-0100",
            role="admin",
            hashed_password=hash_password("admin123"),
            is_active=True
        )
        db.add(admin_user)
        db.flush()

        # 2. Departments
        departments_data = [
            {"name": "Cardiology", "code": "CARD", "icon": "HeartPulse", "description": "Heart & Cardiovascular Care"},
            {"name": "General Medicine", "code": "GEN", "icon": "Activity", "description": "Comprehensive Primary Care & Diagnostics"},
            {"name": "Orthopedics", "code": "ORTH", "icon": "Bone", "description": "Bones, Joints & Musculoskeletal Care"},
            {"name": "Pediatrics", "code": "PED", "icon": "Baby", "description": "Infant, Child & Adolescent Healthcare"},
            {"name": "Neurology", "code": "NEUR", "icon": "Brain", "description": "Nervous System, Brain & Spine Specialists"},
            {"name": "Dermatology", "code": "DERM", "icon": "Sparkles", "description": "Clinical & Cosmetic Dermatology"}
        ]

        dept_map = {}
        for d in departments_data:
            dept = Department(
                name=d["name"],
                code=d["code"],
                icon=d["icon"],
                description=d["description"],
                is_active=True
            )
            db.add(dept)
            db.flush()
            dept_map[d["code"]] = dept

        # 3. Doctors
        doctors_data = [
            {
                "username": "dr.jenkins",
                "email": "dr.jenkins@hospital.com",
                "full_name": "Dr. Sarah Jenkins",
                "phone": "+1-555-201-0001",
                "dept_code": "CARD",
                "specialization": "Interventional Cardiologist",
                "room": "Room 201",
                "fee": 75.0,
                "avg_time": 15
            },
            {
                "username": "dr.vance",
                "email": "dr.vance@hospital.com",
                "full_name": "Dr. Marcus Vance",
                "phone": "+1-555-104-0002",
                "dept_code": "GEN",
                "specialization": "Senior Physician & Internist",
                "room": "Room 104",
                "fee": 45.0,
                "avg_time": 12
            },
            {
                "username": "dr.rostova",
                "email": "dr.rostova@hospital.com",
                "full_name": "Dr. Elena Rostova",
                "phone": "+1-555-302-0003",
                "dept_code": "ORTH",
                "specialization": "Orthopedic Surgeon & Joint Care",
                "room": "Room 302",
                "fee": 80.0,
                "avg_time": 20
            },
            {
                "username": "dr.patel",
                "email": "dr.patel@hospital.com",
                "full_name": "Dr. Priya Patel",
                "phone": "+1-555-108-0004",
                "dept_code": "PED",
                "specialization": "Consultant Pediatrician",
                "room": "Room 108",
                "fee": 50.0,
                "avg_time": 15
            },
            {
                "username": "dr.chen",
                "email": "dr.chen@hospital.com",
                "full_name": "Dr. David Chen",
                "phone": "+1-555-405-0005",
                "dept_code": "NEUR",
                "specialization": "Neurologist & Neurophysiologist",
                "room": "Room 405",
                "fee": 90.0,
                "avg_time": 25
            }
        ]

        doc_user_map = {}
        for doc in doctors_data:
            user = User(
                username=doc["username"],
                email=doc["email"],
                full_name=doc["full_name"],
                phone=doc["phone"],
                role="doctor",
                hashed_password=hash_password("doctor123"),
                is_active=True
            )
            db.add(user)
            db.flush()

            profile = DoctorProfile(
                user_id=user.id,
                department_id=dept_map[doc["dept_code"]].id,
                specialization=doc["specialization"],
                room_number=doc["room"],
                consultation_fee=doc["fee"],
                avg_consultation_time=doc["avg_time"],
                is_available=True,
                current_status="Available"
            )
            db.add(profile)
            doc_user_map[doc["username"]] = user

        # 4. Test Patient: John Doe
        patient_user = User(
            username="john_doe",
            email="john.doe@email.com",
            full_name="Johnathan Doe",
            phone="+1-555-321-4567",
            role="patient",
            hashed_password=hash_password("patient123"),
            is_active=True
        )
        db.add(patient_user)
        db.flush()

        patient_profile = PatientProfile(
            user_id=patient_user.id,
            dob="1988-06-15",
            gender="Male",
            address="742 Evergreen Terrace, Springfield",
            emergency_contact="+1-555-987-6543 (Wife)",
            blood_group="O+"
        )
        db.add(patient_profile)

        # 5. Additional Patients for realistic Queue Demo
        demo_patients = [
            {"username": "alice_smith", "email": "alice@test.com", "name": "Alice Smith", "gender": "Female", "dob": "1992-03-22"},
            {"username": "robert_brown", "email": "robert@test.com", "name": "Robert Brown", "gender": "Male", "dob": "1975-11-09"},
            {"username": "clara_white", "email": "clara@test.com", "name": "Clara White", "gender": "Female", "dob": "2000-08-14"}
        ]

        patient_objects = [patient_user]
        for p in demo_patients:
            u = User(
                username=p["username"],
                email=p["email"],
                full_name=p["name"],
                phone="+1-555-888-9999",
                role="patient",
                hashed_password=hash_password("patient123"),
                is_active=True
            )
            db.add(u)
            db.flush()
            prof = PatientProfile(
                user_id=u.id,
                dob=p["dob"],
                gender=p["gender"],
                address="123 Hospital Way, City"
            )
            db.add(prof)
            patient_objects.append(u)

        # 6. Sample Appointments & Tokens for Today
        today_str = str(date.today())
        dr_vance = doc_user_map["dr.vance"]
        gen_dept = dept_map["GEN"]

        # Apt 1: Alice Smith with Dr. Vance (IN_CONSULTATION)
        apt1 = Appointment(
            appointment_number="APT-20261115-1001",
            patient_id=patient_objects[1].id,
            doctor_id=dr_vance.id,
            department_id=gen_dept.id,
            appointment_date=today_str,
            appointment_time="09:30 AM",
            reason="Seasonal allergies and fever",
            status="IN_CONSULTATION"
        )
        db.add(apt1)
        db.flush()

        tok1 = QueueToken(
            token_number="GEN-101",
            raw_sequence=1,
            appointment_id=apt1.id,
            patient_id=patient_objects[1].id,
            doctor_id=dr_vance.id,
            department_id=gen_dept.id,
            status="IN_CONSULTATION",
            issue_time=datetime.utcnow(),
            called_time=datetime.utcnow()
        )
        db.add(tok1)

        # Apt 2: Robert Brown with Dr. Vance (WAITING)
        apt2 = Appointment(
            appointment_number="APT-20261115-1002",
            patient_id=patient_objects[2].id,
            doctor_id=dr_vance.id,
            department_id=gen_dept.id,
            appointment_date=today_str,
            appointment_time="10:00 AM",
            reason="Routine health checkup",
            status="WAITING"
        )
        db.add(apt2)
        db.flush()

        tok2 = QueueToken(
            token_number="GEN-102",
            raw_sequence=2,
            appointment_id=apt2.id,
            patient_id=patient_objects[2].id,
            doctor_id=dr_vance.id,
            department_id=gen_dept.id,
            status="WAITING",
            issue_time=datetime.utcnow()
        )
        db.add(tok2)

        # Apt 3: John Doe with Dr. Vance (WAITING)
        apt3 = Appointment(
            appointment_number="APT-20261115-1003",
            patient_id=patient_user.id,
            doctor_id=dr_vance.id,
            department_id=gen_dept.id,
            appointment_date=today_str,
            appointment_time="10:30 AM",
            reason="Persistent headache and fatigue",
            status="WAITING"
        )
        db.add(apt3)
        db.flush()

        tok3 = QueueToken(
            token_number="GEN-103",
            raw_sequence=3,
            appointment_id=apt3.id,
            patient_id=patient_user.id,
            doctor_id=dr_vance.id,
            department_id=gen_dept.id,
            status="WAITING",
            issue_time=datetime.utcnow()
        )
        db.add(tok3)

        # Update Dr. Vance status to In Consultation
        dr_vance_prof = db.query(DoctorProfile).filter(DoctorProfile.user_id == dr_vance.id).first()
        if dr_vance_prof:
            dr_vance_prof.current_status = "In Consultation"

        # Seed initial Case Histories (Completed, In Progress, Pending)
        if db.query(CaseHistory).count() == 0:
            c1 = CaseHistory(
                case_number="CASE-20261115-0001",
                patient_id=patient_user.id,
                doctor_id=dr_sharma.id,
                department_id=cardio_dept.id,
                status="COMPLETED",
                symptoms="Occasional chest tightness, palpitations during mild exertion",
                diagnosis="Stage 1 Essential Hypertension with mild sinus tachycardia",
                prescription="1. Tab Telmisartan 40mg (OD, morning)\n2. Tab Metoprolol 25mg (OD, morning)\n3. Lifestyle: Low sodium diet (<2g/day), 30 mins brisk walking",
                clinical_notes="ECG normal sinus rhythm. Advised 2D Echocardiogram in 3 weeks.",
                vitals="BP: 138/88 mmHg, Pulse: 84 bpm, SpO2: 98%, Temp: 98.4 F",
                follow_up_date="2026-12-15",
                created_at=datetime.utcnow(),
                completed_at=datetime.utcnow()
            )
            c2 = CaseHistory(
                case_number="CASE-20261115-0002",
                patient_id=patient_objects[1].id, # Alice Johnson
                doctor_id=dr_vance.id,
                department_id=gen_dept.id,
                token_id=tok1.id,
                status="IN_PROGRESS",
                symptoms="Fever for 2 days, body ache, sore throat and dry cough",
                diagnosis="Acute Upper Respiratory Tract Infection (Under Evaluation)",
                prescription="1. Tab Paracetamol 650mg SOS\n2. Azithromycin 500mg OD x 3 days\n3. Warm saline gargles thrice daily",
                clinical_notes="Throat mildly congested, chest clear bilaterally.",
                vitals="BP: 118/76 mmHg, Pulse: 88 bpm, SpO2: 99%, Temp: 101.2 F",
                follow_up_date="2026-11-20",
                created_at=datetime.utcnow()
            )
            c3 = CaseHistory(
                case_number="CASE-20261115-0003",
                patient_id=patient_user.id,
                doctor_id=dr_vance.id,
                department_id=gen_dept.id,
                appointment_id=apt3.id,
                token_id=tok3.id,
                status="PENDING",
                symptoms="Persistent headache and fatigue, difficulty sleeping for past 4 days",
                diagnosis="Pending Consultation",
                prescription="Awaiting doctor evaluation",
                clinical_notes="Patient is in queue waiting to be called.",
                vitals="BP: 122/80 mmHg, Pulse: 74 bpm",
                follow_up_date=None,
                created_at=datetime.utcnow()
            )
            c4 = CaseHistory(
                case_number="CASE-20261115-0004",
                patient_id=patient_objects[2].id, # Bob Miller
                doctor_id=dr_vance.id,
                department_id=gen_dept.id,
                appointment_id=apt2.id,
                token_id=tok2.id,
                status="PENDING",
                symptoms="Annual routine general wellness health checkup",
                diagnosis="Scheduled for routine assessment",
                vitals="BP: 120/80 mmHg",
                created_at=datetime.utcnow()
            )
            db.add_all([c1, c2, c3, c4])

        db.commit()
        print("Database successfully seeded with Admin, Doctors, Departments, Patients, Appointments, and Queue Tokens!")

    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
