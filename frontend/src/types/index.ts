export type Role = 'patient' | 'doctor' | 'admin';

export interface PatientProfile {
  dob?: string;
  gender?: string;
  address?: string;
  emergency_contact?: string;
  blood_group?: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  full_name: string;
  phone?: string;
  role: Role;
  is_active: boolean;
  patient_profile?: PatientProfile;
}

export interface Department {
  id: number;
  name: string;
  code: string;
  description?: string;
  icon?: string;
  is_active: boolean;
}

export interface Doctor {
  id: number;
  user_id: number;
  full_name: string;
  username: string;
  email: string;
  phone?: string;
  department_id: number;
  department_name: string;
  department_code: string;
  specialization: string;
  room_number: string;
  consultation_fee: number;
  avg_consultation_time: number;
  is_available: boolean;
  current_status: string;
}

export interface Appointment {
  id: number;
  appointment_number: string;
  patient_id: number;
  patient_name: string;
  patient_phone?: string;
  doctor_id: number;
  doctor_name: string;
  doctor_room?: string;
  department_id: number;
  department_name: string;
  appointment_date: string;
  appointment_time: string;
  reason?: string;
  status: 'CONFIRMED' | 'WAITING' | 'IN_CONSULTATION' | 'COMPLETED' | 'CANCELLED';
  token_number?: string;
  created_at: string;
}

export interface QueueToken {
  id: number;
  token_number: string;
  raw_sequence: number;
  appointment_id?: number;
  patient_id: number;
  patient_name: string;
  doctor_id: number;
  doctor_name: string;
  doctor_room: string;
  department_id: number;
  department_name: string;
  status: 'WAITING' | 'CALLED' | 'IN_CONSULTATION' | 'COMPLETED' | 'SKIPPED' | 'CANCELLED';
  priority: number;
  issue_time: string;
  called_time?: string;
  completed_time?: string;
  notes?: string;
  position: number;
  patients_ahead: number;
  estimated_wait_minutes: number;
  current_serving_token?: string;
}

export interface LiveQueueDoctorSummary {
  doctor_id: number;
  doctor_name: string;
  department_name: string;
  room_number: string;
  current_status: string;
  current_token?: string;
  waiting_count: number;
  next_tokens: string[];
}

export interface HospitalStats {
  total_patients: number;
  total_doctors: number;
  appointments_today: number;
  tokens_waiting: number;
  tokens_completed: number;
  tokens_in_consultation: number;
  average_wait_minutes: number;
  doctor_summaries: LiveQueueDoctorSummary[];
}

export type CaseStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'SKIPPED';

export interface CaseHistory {
  id: number;
  case_number: string;
  patient_id: number;
  patient_name: string;
  patient_email?: string;
  patient_phone?: string;
  doctor_id: number;
  doctor_name: string;
  doctor_room?: string;
  department_id: number;
  department_name: string;
  appointment_id?: number;
  token_id?: number;
  token_number?: string;
  status: CaseStatus;
  symptoms?: string;
  diagnosis?: string;
  prescription?: string;
  clinical_notes?: string;
  vitals?: string;
  follow_up_date?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

