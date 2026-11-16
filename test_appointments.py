"""
Comprehensive Appointment Booking Test Suite
Tests every step of the appointment booking workflow
"""
import urllib.request, urllib.error, json, time, sys
from datetime import date, timedelta

BASE = 'http://127.0.0.1:8000'
TOMORROW = (date.today() + timedelta(days=1)).strftime('%Y-%m-%d')
TODAY = date.today().strftime('%Y-%m-%d')

passes, fails = 0, 0
errors = []

def api(method, path, data=None, token=None, params=None):
    url = BASE + path
    if params:
        qs = '&'.join(f'{k}={v}' for k, v in params.items())
        url += '?' + qs
    headers = {'Content-Type': 'application/json'}
    if token:
        headers['Authorization'] = 'Bearer ' + token
    body = json.dumps(data).encode() if data else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            raw = r.read()
            return r.status, json.loads(raw) if raw else {}
    except urllib.error.HTTPError as e:
        body = e.read()
        try:
            return e.code, json.loads(body)
        except:
            return e.code, {'raw': body.decode('utf-8', errors='replace')}
    except Exception as e:
        return 0, {'error': str(e)}

def chk(cond, label, detail=''):
    global passes, fails
    if cond:
        print(f'  [PASS] {label}')
        passes += 1
    else:
        msg = f'  [FAIL] {label}' + (f' | {detail}' if detail else '')
        print(msg)
        errors.append(msg)
        fails += 1

# ===========================================================
print('=' * 60)
print('SECTION 1: AUTHENTICATION')
print('=' * 60)

s, r = api('POST', '/api/auth/login', {'username': 'admin', 'password': 'admin123', 'portal_type': 'admin'})
admin_token = r.get('access_token', '')
chk(s == 200 and bool(admin_token), 'Admin login', str(r.get('detail', '')))

s, r = api('POST', '/api/auth/login', {'username': 'dr.jenkins', 'password': 'doctor123', 'portal_type': 'doctor'})
doc_token = r.get('access_token', '')
doc_user = r.get('user', {})
chk(s == 200 and bool(doc_token), 'Doctor (dr.jenkins) login', str(r.get('detail', '')))

s, r = api('POST', '/api/auth/login', {'username': 'john_doe', 'password': 'patient123', 'portal_type': 'patient'})
pat_token = r.get('access_token', '')
pat_user = r.get('user', {})
chk(s == 200 and bool(pat_token), 'Patient (john_doe) login', str(r.get('detail', '')))

# Wrong password
s, r = api('POST', '/api/auth/login', {'username': 'admin', 'password': 'wrong', 'portal_type': 'admin'})
chk(s == 401, 'Wrong password → 401', str(s))

# ===========================================================
print()
print('=' * 60)
print('SECTION 2: DEPARTMENTS AND DOCTORS')
print('=' * 60)

s, r = api('GET', '/api/departments')
departments = r if isinstance(r, list) else []
chk(s == 200 and len(departments) > 0, f'List departments ({len(departments)} found)', str(r)[:100])

dept_id = departments[0]['id'] if departments else None
dept_name = departments[0]['name'] if departments else 'N/A'
print(f'  Using department: [{dept_id}] {dept_name}')

s, r = api('GET', '/api/doctors', params={'department_id': dept_id} if dept_id else {})
doctors = r if isinstance(r, list) else []
chk(s == 200, f'List doctors for dept {dept_id} ({len(doctors)} found)', str(r)[:100])

if not doctors:
    # Try without filter
    s, r = api('GET', '/api/doctors')
    doctors = r if isinstance(r, list) else []
    print(f'  (Fallback: all doctors = {len(doctors)})')

doctor_user_id = doctors[0]['user_id'] if doctors else None
doctor_name = doctors[0]['full_name'] if doctors else 'N/A'
doctor_dept_id = doctors[0]['department_id'] if doctors else dept_id
print(f'  Using doctor: [{doctor_user_id}] {doctor_name} in dept [{doctor_dept_id}]')

# ===========================================================
print()
print('=' * 60)
print('SECTION 3: APPOINTMENT SLOT AVAILABILITY')
print('=' * 60)

if doctor_user_id:
    s, r = api('GET', '/api/appointments/slots', params={'doctor_id': doctor_user_id, 'date_str': TOMORROW})
    chk(s == 200, f'Get slots for doctor {doctor_user_id} on {TOMORROW}', str(r)[:100])
    if s == 200:
        slots = r.get('slots', [])
        available = [sl['time'] for sl in slots if sl.get('is_available')]
        chk(len(slots) == 15, f'Exactly 15 time slots returned (got {len(slots)})')
        chk(len(available) > 0, f'{len(available)} slots available tomorrow')
        first_slot = available[0] if available else None
        print(f'  First available slot: {first_slot}')
    else:
        slots = []
        available = []
        first_slot = None
        print(f'  ERROR getting slots: {r}')
else:
    first_slot = '10:00 AM'
    doctor_dept_id = dept_id

# ===========================================================
print()
print('=' * 60)
print('SECTION 4: APPOINTMENT BOOKING (MAIN TEST)')
print('=' * 60)

booking_data = {
    'department_id': int(doctor_dept_id or dept_id),
    'doctor_id': int(doctor_user_id),
    'appointment_date': TOMORROW,
    'appointment_time': first_slot or '10:00 AM',
    'reason': 'Automated test booking - general consultation'
}
print(f'  Booking payload: {json.dumps(booking_data)}')

s, r = api('POST', '/api/appointments', data=booking_data, token=pat_token)
chk(s == 201, f'Create appointment → 201 Created', f'Got {s}: {str(r)[:200]}')

appointment_id = None
appointment_number = None
token_number = None

if s == 201:
    appointment_id = r.get('id')
    appointment_number = r.get('appointment_number', '')
    token_number = r.get('token_number', '')
    chk(bool(appointment_id), f'Appointment has ID: {appointment_id}')
    chk(bool(appointment_number), f'Appointment number generated: {appointment_number}')
    chk(r.get('patient_id') == pat_user.get('id'), f'Patient ID matches: {r.get("patient_id")} == {pat_user.get("id")}')
    chk(r.get('doctor_id') == doctor_user_id, f'Doctor ID matches: {r.get("doctor_id")} == {doctor_user_id}')
    chk(r.get('status') == 'CONFIRMED', f'Status is CONFIRMED: {r.get("status")}')
    chk(r.get('appointment_date') == TOMORROW, f'Date correct: {r.get("appointment_date")}')
    chk(r.get('appointment_time') == (first_slot or '10:00 AM'), f'Time correct: {r.get("appointment_time")}')
    chk(bool(token_number), f'Digital token auto-generated: {token_number}')
    print(f'  Appointment: {appointment_number}, Token: {token_number}')
else:
    print(f'  BOOKING FAILED: {r}')

# ===========================================================
print()
print('=' * 60)
print('SECTION 5: APPOINTMENT PERSISTENCE')
print('=' * 60)

s, r = api('GET', '/api/appointments/my', token=pat_token)
chk(s == 200, 'Patient can retrieve own appointments', str(r)[:100])
if s == 200 and isinstance(r, list):
    chk(len(r) > 0, f'Appointments list not empty ({len(r)} found)')
    if appointment_id:
        found = any(a.get('id') == appointment_id for a in r)
        chk(found, f'New appointment {appointment_id} appears in patient appointments list')
        if found:
            matched = next(a for a in r if a.get('id') == appointment_id)
            chk(matched.get('token_number') == token_number, f'Token number persisted: {matched.get("token_number")}')

# ===========================================================
print()
print('=' * 60)
print('SECTION 6: DUPLICATE BOOKING PREVENTION')
print('=' * 60)

s, r = api('POST', '/api/appointments', data=booking_data, token=pat_token)
chk(s == 400, f'Duplicate booking rejected with 400 (got {s})', str(r.get('detail', ''))[:100])

# Different patient, same slot → also should be rejected
ts = str(int(time.time()))
uname = 'testpat_' + ts
s_reg, r_reg = api('POST', '/api/auth/register', {
    'username': uname, 'email': uname + '@test.com',
    'password': 'Test@1234', 'full_name': 'Dupe Test Patient',
    'phone': '9000000001', 'dob': '1990-01-01',
    'gender': 'Female', 'address': 'Test Address',
    'role': 'patient', 'confirm_password': 'Test@1234'
})
if s_reg in [200, 201]:
    s_login, r_login = api('POST', '/api/auth/login', {'username': uname, 'password': 'Test@1234', 'portal_type': 'patient'})
    pat2_token = r_login.get('access_token', '') if s_login == 200 else ''
    if pat2_token:
        s_dupe, r_dupe = api('POST', '/api/appointments', data=booking_data, token=pat2_token)
        chk(s_dupe == 400, f'Same slot, different patient also rejected (slot conflict): got {s_dupe}', str(r_dupe.get('detail',''))[:80])

# ===========================================================
print()
print('=' * 60)
print('SECTION 7: DOCTOR CAN VIEW APPOINTMENTS')
print('=' * 60)

s, r = api('GET', '/api/appointments/doctor', token=doc_token)
chk(s == 200, 'Doctor can list their appointments', str(r)[:100])
if s == 200 and isinstance(r, list) and appointment_id:
    # Note: dr.jenkins may not be the same doctor we booked with
    print(f'  Doctor has {len(r)} appointments')

# ===========================================================
print()
print('=' * 60)
print('SECTION 8: ADMIN CAN VIEW ALL APPOINTMENTS')
print('=' * 60)

s, r = api('GET', '/api/appointments/all', token=admin_token)
chk(s == 200, 'Admin can list all appointments', str(r)[:100])
if s == 200 and isinstance(r, list):
    chk(len(r) > 0, f'At least 1 appointment in system ({len(r)} total)')
    if appointment_id:
        found = any(a.get('id') == appointment_id for a in r)
        chk(found, f'New appointment {appointment_id} visible to admin')

# ===========================================================
print()
print('=' * 60)
print('SECTION 9: DIGITAL TOKEN TRACKING')
print('=' * 60)

s, r = api('GET', '/api/queue/my-token', token=pat_token)
chk(s == 200, 'Patient can retrieve active queue token', str(r)[:100])
if s == 200 and r:
    chk(r.get('token_number') == token_number, f'Token number matches: {r.get("token_number")} == {token_number}')
    chk(r.get('status') in ['WAITING', 'CALLED', 'IN_CONSULTATION'], f'Token status is active: {r.get("status")}')
    chk('position' in r, f'Queue position included: {r.get("position")}')
    chk('estimated_wait_minutes' in r, f'Wait time included: {r.get("estimated_wait_minutes")} min')

# ===========================================================
print()
print('=' * 60)
print('SECTION 10: APPOINTMENT CANCELLATION')
print('=' * 60)

if appointment_id:
    s, r = api('PUT', f'/api/appointments/{appointment_id}/cancel', token=pat_token)
    chk(s == 200, f'Patient can cancel appointment {appointment_id}', str(r)[:100])
    if s == 200:
        # Verify status changed
        s2, r2 = api('GET', '/api/appointments/my', token=pat_token)
        if s2 == 200:
            matched = next((a for a in r2 if a.get('id') == appointment_id), None)
            if matched:
                chk(matched.get('status') == 'CANCELLED', f'Appointment status is CANCELLED: {matched.get("status")}')

# ===========================================================
print()
print('=' * 60)
print('SECTION 11: PAST DATE BOOKING PREVENTION')
print('=' * 60)

past_date = (date.today() - timedelta(days=1)).strftime('%Y-%m-%d')
bad_booking = {
    'department_id': int(doctor_dept_id or dept_id or 1),
    'doctor_id': int(doctor_user_id or 1),
    'appointment_date': past_date,
    'appointment_time': '09:00 AM',
    'reason': 'Should be rejected'
}
s, r = api('POST', '/api/appointments', data=bad_booking, token=pat_token)
# Backend may or may not enforce past-date check — log the actual result
print(f'  Past date booking result: {s} | detail: {str(r.get("detail",""))[:100]}')
if s in [400, 422]:
    chk(True, f'Past date correctly rejected with {s}')
else:
    chk(False, f'Past date NOT rejected (got {s}) — backend should validate this')

# ===========================================================
print()
print('=' * 60)
print('SECTION 12: UNAUTHENTICATED BOOKING REJECTION')
print('=' * 60)

s, r = api('POST', '/api/appointments', data=booking_data, token=None)
chk(s == 401, f'Unauthenticated booking rejected with 401 (got {s})')

# ===========================================================
print()
print('=' * 60)
print('SECTION 13: NEW PATIENT FULL FLOW')
print('=' * 60)

ts2 = str(int(time.time()) + 1)
new_uname = 'newpat_' + ts2
s, r = api('POST', '/api/auth/register', {
    'username': new_uname, 'email': new_uname + '@hospital.com',
    'password': 'NewPass@456', 'full_name': 'New Patient Full',
    'phone': '8888888888', 'dob': '2000-05-10',
    'gender': 'Male', 'address': '789 New Street, City',
    'role': 'patient', 'confirm_password': 'NewPass@456'
})
chk(s in [200, 201], f'New patient registration (got {s})', str(r.get('detail',''))[:100])
new_pat_id = r.get('id') if s in [200, 201] else None

if new_pat_id:
    s2, r2 = api('POST', '/api/auth/login', {'username': new_uname, 'password': 'NewPass@456', 'portal_type': 'patient'})
    new_pat_token = r2.get('access_token', '')
    chk(s2 == 200, f'New patient login (got {s2})')

    if new_pat_token and doctor_user_id and doctor_dept_id:
        # Book on a different day for new patient
        day_after = (date.today() + timedelta(days=2)).strftime('%Y-%m-%d')
        new_booking = {
            'department_id': int(doctor_dept_id),
            'doctor_id': int(doctor_user_id),
            'appointment_date': day_after,
            'appointment_time': '11:00 AM',
            'reason': 'New patient first visit'
        }
        s3, r3 = api('POST', '/api/appointments', data=new_booking, token=new_pat_token)
        chk(s3 == 201, f'New patient books appointment (got {s3})', str(r3.get('detail',''))[:100])
        if s3 == 201:
            chk(r3.get('patient_name') == 'New Patient Full', f'Patient name correct: {r3.get("patient_name")}')
            chk(bool(r3.get('token_number')), f'Token generated: {r3.get("token_number")}')

# ===========================================================
print()
print('=' * 60)
print('FINAL SUMMARY')
print('=' * 60)
total = passes + fails
print(f'Total Tests : {total}')
print(f'Passed      : {passes}')
print(f'Failed      : {fails}')
print()
if fails == 0:
    print('✅ ALL TESTS PASSED - Appointment booking is fully functional!')
else:
    print('❌ SOME TESTS FAILED:')
    for e in errors:
        print(e)
