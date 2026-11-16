# 🏥 Smart Hospital Queue Management System

A complete, modern, full-stack hospital queue management and outpatient department (OPD) flow application designed for hospitals, clinics, and health systems.

Built with **React + TypeScript + Tailwind CSS** on the frontend and **Python FastAPI + SQLAlchemy + Pydantic** on the backend, supporting **PostgreSQL** and **SQLite**.

---

## 🌟 Key Features

### 1. 🔐 Multi-Role Authentication & Login Portal (Step 1)
- **Hospital Branding**: ApexCare Hospital logo, name, and tagline.
- **Dual Login Portals**:
  - 🩺 **Patient Portal**: Dedicated login for registered patients.
  - 👨‍⚕️ **Admin / Doctor Portal**: Secure access for healthcare providers and staff.
- **Security & Convenience**:
  - Show/hide password visibility toggle.
  - "Remember me" extended session tokens.
  - Working **Forgot Password** self-service reset modal.
  - Quick-fill test credential buttons for immediate testing.

### 2. 📝 Patient Registration (Step 2)
- Form fields: Full Name, Username, Email, Phone Number, Date of Birth, Gender, Residential Address, Password, Confirm Password.
- Automatic password hashing with **bcrypt**.
- Validates unique usernames and emails, prevents duplicate records.
- Role-separation policy: Doctor and Admin accounts are provisioned solely by hospital administrators.

### 3. 📊 Patient Dashboard (Step 3)
- Personalized greeting and patient ID badge (`PAT-100X`).
- Quick actions: *Book Appointment*, *Refresh Queue*, *Public Live Queue Board*.
- Real-time **Digital Token Card** with live status indicator.
- **My Appointments**: Active bookings with status badges (`CONFIRMED`, `WAITING`, `IN_CONSULTATION`, `COMPLETED`, `CANCELLED`).
- **Appointment History**: Past completed visits.
- **Patient Profile**: View DOB, gender, blood group, emergency contact, and address.

### 4. 📅 Functional Appointment Booking System (Step 4)
- Select hospital department (Cardiology, General Medicine, Orthopedics, Pediatrics, Neurology, Dermatology).
- Select specialist doctor (displays doctor room, consultation fee, avg time, specialization).
- Interactive calendar date picker.
- Dynamic **Time Slot Grid** showing available vs. occupied OPD slots.
- Chief complaint / reason for visit input.
- **Anti-Conflict & Duplicate Prevention**: Automatically rejects double-bookings for the same doctor or same slot.

### 5. 🎟️ Automated Digital Token Generation (Step 5)
- Automatically issues a unique digital queue token (e.g., `CARD-101`, `GEN-102`) upon booking.
- Shows:
  - Token number
  - Consulting doctor and department
  - Room number
  - Live queue position (`#1 in Queue`)
  - Number of patients waiting ahead
  - Estimated waiting time calculation (`~15 mins`)
  - Doctor's current serving token (`Now Serving: GEN-100`)
- Auto-synchronizes every 5 seconds.

### 6. 🩺 Doctor Consultation Portal (Step 6)
- Doctor header with room number, specialization, and availability status switcher:
  - `Available` | `In Consultation` | `On Break` | `Offline`
- **One-Click "Call Next Patient"**:
  - Fetches the next priority-ordered patient in queue.
  - Updates status to `CALLED`, triggers live alerts.
- **Active Consultation Console**:
  - Live consultation elapsed timer.
  - Patient details and chief complaint.
  - Clinical notes and prescription textarea.
  - Action buttons: *Start Consultation*, *Complete Consultation*, *Skip Token (No-Show)*.
- **Waiting Queue Table**: Real-time list of waiting patients for the doctor.
- **Today's Completed List**: Records of completed visits.

### 7. 🛡️ Central Administrator Dashboard (Step 6)
- **Hospital KPI Cards**: Total Patients, Active Doctors, Today's Appointments, Tokens Waiting, Consultations In Progress, Average Wait Time.
- **Patient Management**: Search, view profiles, and toggle active/deactivated status.
- **Doctor Management**: Create and onboard new doctors with department, room, and credentials.
- **Department Management**: Add and manage hospital specialties.
- **Appointment Schedule Oversight**: Monitor and cancel hospital appointments.
- **Live Queue Stream & Emergency Triage**: View all tokens issued today and elevate tokens to **URGENT / EMERGENCY** priority.

### 8. 📺 Public OPD Live Queue Board (Step 8)
- Department-by-department monitor designed for hospital waiting lobby displays.
- Shows doctor name, room location, active token being served, waiting count, and upcoming tokens in line.
- Real-time auto-polling every 5 seconds.

---

## 🔑 Default Test Credentials

For quick evaluation, pre-seeded accounts are immediately available:

| Role | Username | Password | Notes |
|---|---|---|---|
| **Patient** | `john_doe` | `patient123` | Patient Portal login |
| **Doctor** | `dr.vance` | `doctor123` | Senior Physician, Room 104 |
| **Doctor** | `dr.jenkins` | `doctor123` | Interventional Cardiologist, Room 201 |
| **Admin** | `admin` | `admin123` | Full Hospital Administrator |

---

## 🛠️ Technology Stack (Step 7)

- **Frontend**:
  - React 18
  - TypeScript
  - Tailwind CSS (Medical blue, teal, slate theme)
  - Lucide Icons
  - Axios HTTP Client
  - Vite
- **Backend**:
  - Python 3.14 / 3.11+
  - FastAPI
  - SQLAlchemy 2.0 ORM
  - Pydantic V2
  - bcrypt (secure salted password hashing)
  - python-jose (JWT tokens)
  - PostgreSQL / SQLite database engine
  - Uvicorn ASGI Server

---

## 🚀 Installation & Running Instructions

### 1. Backend Setup

```powershell
# Navigate to the project root
cd hospital-queue-management

# Install Python requirements
python -m pip install -r backend/requirements.txt

# Run database seed (Admin, Doctors, Departments, Patients, Tokens)
python -m backend.app.seed

# Start the FastAPI server
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```

The backend API will be available at:
- **API Root**: [http://127.0.0.1:8000/](http://127.0.0.1:8000/)
- **Swagger Interactive API Docs**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **ReDoc API Documentation**: [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)

### 2. Frontend Setup

```powershell
# In another terminal window:
cd hospital-queue-management/frontend

# Install dependencies
npm.cmd install

# Start Vite Development Server
npm.cmd run dev
```

The frontend application will be live at:
- **Web App**: [http://localhost:5173/](http://localhost:5173/)

---

## 🗄️ Database Configuration (PostgreSQL / SQLite)

By default, the backend runs seamlessly on SQLite (`sqlite:///./hospital.db`) with zero external service requirements.

To connect to a **PostgreSQL** database:
1. Update `backend/.env`:
```env
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/hospital_queue
```
2. Re-run `python -m backend.app.seed` to initialize all PostgreSQL tables and seed data automatically.

---

## 🧪 Automated Testing

Execute the automated end-to-end integration test suite:

```powershell
python test_system.py
```

Tests all 16 core workflows:
1. API Health Check
2. Patient Registration
3. Patient Login & JWT Issuance
4. Doctor Login
5. Admin Login
6. Department Querying
7. Specialist Doctor Directory
8. Real-time Slot Availability Calculation
9. Appointment Booking with Auto-Token Generation
10. Conflict & Duplicate Booking Prevention
11. Digital Token Metrics & Live Wait Time Calculation
12. Doctor Queue Retrieval
13. Calling Next Patient in Queue
14. Completing Consultation with Clinical Notes
15. Admin Hospital Analytics
16. OPD Live Queue Board Stream

---

## 📂 Project Directory Structure

```text
hospital-queue-management/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── admin.py
│   │   │   ├── appointments.py
│   │   │   ├── auth.py
│   │   │   ├── departments.py
│   │   │   ├── deps.py
│   │   │   ├── doctors.py
│   │   │   └── queue.py
│   │   ├── core/
│   │   │   ├── config.py
│   │   │   ├── database.py
│   │   │   └── security.py
│   │   ├── models/
│   │   │   └── hospital_models.py
│   │   ├── schemas/
│   │   │   └── hospital_schemas.py
│   │   ├── services/
│   │   │   └── queue_service.py
│   │   ├── main.py
│   │   └── seed.py
│   ├── .env
│   ├── .env.example
│   └── requirements.txt
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── DigitalTokenCard.tsx
│   │   │   ├── LiveQueueBoard.tsx
│   │   │   └── Navbar.tsx
│   │   ├── context/
│   │   │   └── AuthContext.tsx
│   │   ├── pages/
│   │   │   ├── AdminDashboard.tsx
│   │   │   ├── BookAppointmentModal.tsx
│   │   │   ├── DoctorDashboard.tsx
│   │   │   ├── Login.tsx
│   │   │   ├── PatientDashboard.tsx
│   │   │   └── Register.tsx
│   │   ├── services/
│   │   │   └── api.ts
│   │   ├── types/
│   │   │   └── index.ts
│   │   ├── App.tsx
│   │   ├── index.css
│   │   └── main.tsx
│   ├── index.html
│   ├── package.json
│   ├── postcss.config.js
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   └── vite.config.ts
├── test_system.py
└── README.md
```
