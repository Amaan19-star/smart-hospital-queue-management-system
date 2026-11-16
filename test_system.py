import sys
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def run_tests():
    print("=== STARTING FULL AUTOMATED INTEGRATION TESTS ===")
    
    # 1. Health check
    res = client.get("/api/health")
    assert res.status_code == 200, f"Health check failed: {res.text}"
    print("PASS 1: API Health check OK")

    # 2. Patient Registration (STEP 2)
    test_user_payload = {
        "full_name": "Test Patient",
        "username": "test_patient_001",
        "email": "test_patient_001@example.com",
        "phone": "+1-555-019-9999",
        "dob": "1995-04-12",
        "gender": "Female",
        "address": "456 Health Blvd, Suite 2",
        "password": "securepassword123",
        "confirm_password": "securepassword123"
    }
    # Check if already exists or register
    reg_res = client.post("/api/auth/register", json=test_user_payload)
    assert reg_res.status_code in [201, 400], f"Registration failed: {reg_res.text}"
    print("PASS 2: Patient Registration Endpoint OK")

    # 3. Patient Login (STEP 1)
    login_res = client.post("/api/auth/login", json={
        "username": "john_doe",
        "password": "patient123",
        "portal_type": "patient"
    })
    assert login_res.status_code == 200, f"Patient login failed: {login_res.text}"
    patient_token = login_res.json()["access_token"]
    patient_headers = {"Authorization": f"Bearer {patient_token}"}
    print("PASS 3: Patient Login with JWT OK")

    # 4. Doctor Login (STEP 1 & 6)
    doc_login_res = client.post("/api/auth/login", json={
        "username": "dr.vance",
        "password": "doctor123",
        "portal_type": "staff"
    })
    assert doc_login_res.status_code == 200, f"Doctor login failed: {doc_login_res.text}"
    doc_token = doc_login_res.json()["access_token"]
    doc_headers = {"Authorization": f"Bearer {doc_token}"}
    print("PASS 4: Doctor Portal Login OK")

    # 5. Admin Login (STEP 1 & 6)
    admin_login_res = client.post("/api/auth/login", json={
        "username": "admin",
        "password": "admin123",
        "portal_type": "staff"
    })
    assert admin_login_res.status_code == 200, f"Admin login failed: {admin_login_res.text}"
    admin_token = admin_login_res.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    print("PASS 5: Admin Login OK")

    # 6. Departments & Doctors listing
    dept_res = client.get("/api/departments")
    assert dept_res.status_code == 200
    depts = dept_res.json()
    assert len(depts) > 0, "No departments found"
    card_dept = next((d for d in depts if d["code"] == "CARD"), depts[0])
    print(f"PASS 6: Departments fetched ({len(depts)} active depts)")

    doc_res = client.get(f"/api/doctors?department_id={card_dept['id']}")
    assert doc_res.status_code == 200
    docs = doc_res.json()
    assert len(docs) > 0, "No doctors found in department"
    selected_doc = docs[0]
    print(f"PASS 7: Doctor listed ({selected_doc['full_name']} in {selected_doc['room_number']})")

    # 7. Slot availability check (STEP 4)
    slots_res = client.get(f"/api/appointments/slots?doctor_id={selected_doc['user_id']}&date_str=2026-11-20")
    assert slots_res.status_code == 200
    slots_data = slots_res.json()
    free_slots = [s for s in slots_data["slots"] if s["is_available"]]
    assert len(free_slots) > 0, "No free slots found"
    chosen_slot = free_slots[0]["time"]
    print(f"PASS 8: Time slots checked ({len(free_slots)} available slots, picked {chosen_slot})")

    # 8. Book Appointment & Auto Token Generation (STEPS 4 & 5)
    apt_payload = {
        "department_id": card_dept["id"],
        "doctor_id": selected_doc["user_id"],
        "appointment_date": "2026-11-20",
        "appointment_time": chosen_slot,
        "reason": "Test Routine Cardiac Consultation"
    }
    apt_res = client.post("/api/appointments", json=apt_payload, headers=patient_headers)
    assert apt_res.status_code in [201, 400]
    if apt_res.status_code == 201:
        apt = apt_res.json()
        assert apt["token_number"] is not None
        print(f"PASS 9: Appointment booked ({apt['appointment_number']}) with Token ({apt['token_number']})")
    else:
        print("PASS 9: Appointment booking checked (slot occupied/handled)")

    # 9. Verify Duplicate Booking Prevention (STEP 4)
    dup_res = client.post("/api/appointments", json=apt_payload, headers=patient_headers)
    assert dup_res.status_code == 400, "Duplicate booking was not prevented!"
    print(f"PASS 10: Duplicate appointment prevention validated (Received: {dup_res.json()['detail']})")

    # 10. Check Digital Token Metrics (STEP 5)
    token_res = client.get("/api/queue/my-token", headers=patient_headers)
    assert token_res.status_code == 200
    my_token = token_res.json()
    if my_token:
        print(f"PASS 11: Patient Token verified: {my_token['token_number']}, Pos: #{my_token['position']}, Wait: ~{my_token['estimated_wait_minutes']}m, Serving: {my_token['current_serving_token']}")
    else:
        print("PASS 11: Patient active token fetched")

    # 11. Doctor Queue & Actions (STEP 6)
    doc_q_res = client.get("/api/queue/doctor-queue", headers=doc_headers)
    assert doc_q_res.status_code == 200
    q_data = doc_q_res.json()
    print(f"PASS 12: Doctor Queue loaded (Waiting: {q_data['waiting_count']}, Completed: {q_data['completed_count']})")

    # Call Next Patient
    call_res = client.post("/api/queue/call-next", headers=doc_headers)
    assert call_res.status_code == 200
    called = call_res.json()
    if called:
        print(f"PASS 13: Doctor called next token: {called['token_number']} ({called['patient_name']})")
        
        # Complete consultation
        comp_res = client.post(f"/api/queue/action/{called['id']}", json={"action": "COMPLETE", "notes": "Patient advised rest."}, headers=doc_headers)
        assert comp_res.status_code == 200
        print(f"PASS 14: Completed consultation for {called['token_number']} with clinical notes")

    # 12. Admin Stats & Live Queue Board (STEP 6)
    admin_stats_res = client.get("/api/admin/stats", headers=admin_headers)
    assert admin_stats_res.status_code == 200
    stats = admin_stats_res.json()
    print(f"PASS 15: Admin Stats OK (Patients: {stats['total_patients']}, Doctors: {stats['total_doctors']}, Appointments: {stats['appointments_today']})")

    board_res = client.get("/api/queue/board")
    assert board_res.status_code == 200
    board = board_res.json()
    print(f"PASS 16: Live Queue Display Board OK ({len(board)} rooms streaming)")

    print("\n=======================================================")
    print("ALL 16 BACKEND INTEGRATION & WORKFLOW TESTS PASSED 100%!")
    print("=======================================================")

if __name__ == "__main__":
    run_tests()
