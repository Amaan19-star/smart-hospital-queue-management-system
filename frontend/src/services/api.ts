import axios from 'axios';
import {
  User,
  Department,
  Doctor,
  Appointment,
  QueueToken,
  LiveQueueDoctorSummary,
  HospitalStats,
  CaseHistory
} from '../types';

const API_BASE = 'http://127.0.0.1:8000/api';

export const apiClient = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor to attach Bearer token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('hospital_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth API
export const authApi = {
  login: async (credentials: { username: string; password: string; portal_type?: string; remember_me?: boolean }) => {
    const res = await apiClient.post<{ access_token: string; token_type: string; user: User }>('/auth/login', credentials);
    return res.data;
  },
  register: async (userData: any) => {
    const res = await apiClient.post<User>('/auth/register', userData);
    return res.data;
  },
  registerStaff: async (staffData: any) => {
    const res = await apiClient.post<User>('/auth/register-staff', staffData);
    return res.data;
  },
  getMe: async () => {
    const res = await apiClient.get<User>('/auth/me');
    return res.data;
  },
  forgotPassword: async (data: { identifier: string; new_password?: string }) => {
    const res = await apiClient.post<{ message: string }>('/auth/forgot-password', data);
    return res.data;
  }
};

// Departments API
export const departmentsApi = {
  list: async () => {
    const res = await apiClient.get<Department[]>('/departments');
    return res.data;
  },
  create: async (data: { name: string; code: string; description?: string; icon?: string }) => {
    const res = await apiClient.post<Department>('/departments', data);
    return res.data;
  },
  update: async (id: number, data: any) => {
    const res = await apiClient.put<Department>(`/departments/${id}`, data);
    return res.data;
  }
};

// Doctors API
export const doctorsApi = {
  list: async (departmentId?: number) => {
    const params = departmentId ? { department_id: departmentId } : {};
    const res = await apiClient.get<Doctor[]>('/doctors', { params });
    return res.data;
  },
  getMyProfile: async () => {
    const res = await apiClient.get<Doctor>('/doctors/me');
    return res.data;
  },
  getById: async (id: number) => {
    const res = await apiClient.get<Doctor>(`/doctors/${id}`);
    return res.data;
  },
  create: async (doctorData: any) => {
    const res = await apiClient.post<Doctor>('/doctors', doctorData);
    return res.data;
  },
  updateStatus: async (doctorId: number, statusData: { current_status: string; is_available?: boolean }) => {
    const res = await apiClient.put<Doctor>(`/doctors/${doctorId}/status`, statusData);
    return res.data;
  }
};

// Appointments API
export const appointmentsApi = {
  getSlots: async (doctorId: number, dateStr: string) => {
    const res = await apiClient.get<{ doctor_id: number; date: string; slots: { time: string; is_available: boolean }[] }>('/appointments/slots', {
      params: { doctor_id: doctorId, date_str: dateStr }
    });
    return res.data;
  },
  create: async (data: { department_id: number; doctor_id: number; appointment_date: string; appointment_time: string; reason?: string }) => {
    const res = await apiClient.post<Appointment>('/appointments', data);
    return res.data;
  },
  getMy: async () => {
    const res = await apiClient.get<Appointment[]>('/appointments/my');
    return res.data;
  },
  getDoctorAppointments: async () => {
    const res = await apiClient.get<Appointment[]>('/appointments/doctor');
    return res.data;
  },
  getAll: async () => {
    const res = await apiClient.get<Appointment[]>('/appointments/all');
    return res.data;
  },
  cancel: async (appointmentId: number) => {
    const res = await apiClient.put<{ message: string }>(`/appointments/${appointmentId}/cancel`);
    return res.data;
  }
};

// Queue API
export const queueApi = {
  getMyToken: async () => {
    const res = await apiClient.get<QueueToken | null>('/queue/my-token');
    return res.data;
  },
  getDoctorQueue: async () => {
    const res = await apiClient.get<{
      active_token: QueueToken | null;
      waiting: QueueToken[];
      completed: QueueToken[];
      waiting_count: number;
      completed_count: number;
    }>('/queue/doctor-queue');
    return res.data;
  },
  callNext: async () => {
    const res = await apiClient.post<QueueToken | null>('/queue/call-next');
    return res.data;
  },
  action: async (
    tokenId: number, 
    action: string, 
    notes?: string, 
    clinicalData?: {
      symptoms?: string;
      diagnosis?: string;
      prescription?: string;
      vitals?: string;
      follow_up_date?: string;
    }
  ) => {
    const payload = { action, notes, ...clinicalData };
    const res = await apiClient.post<QueueToken>(`/queue/action/${tokenId}`, payload);
    return res.data;
  },
  generate: async (data: { department_id: number; doctor_id: number; appointment_id?: number; priority?: number }) => {
    const res = await apiClient.post<QueueToken>('/queue/generate', data);
    return res.data;
  },
  getBoard: async () => {
    const res = await apiClient.get<LiveQueueDoctorSummary[]>('/queue/board');
    return res.data;
  }
};

// Admin API
export const adminApi = {
  getStats: async () => {
    const res = await apiClient.get<HospitalStats>('/admin/stats');
    return res.data;
  },
  getPatients: async () => {
    const res = await apiClient.get<User[]>('/admin/patients');
    return res.data;
  },
  togglePatientStatus: async (userId: number) => {
    const res = await apiClient.put<{ message: string }>(`/admin/patients/${userId}/toggle-status`);
    return res.data;
  },
  getAllTokens: async () => {
    const res = await apiClient.get<QueueToken[]>('/admin/queue/all');
    return res.data;
  },
  setPriority: async (tokenId: number, priority: number) => {
    const res = await apiClient.put<{ message: string }>(`/admin/queue/${tokenId}/priority?priority=${priority}`);
    return res.data;
  }
};

// Case History API
export const casesApi = {
  create: async (data: Partial<CaseHistory>) => {
    const res = await apiClient.post<CaseHistory>('/cases', data);
    return res.data;
  },
  getMyPatientCases: async (status?: string) => {
    const params = status && status !== 'ALL' ? { status } : {};
    const res = await apiClient.get<CaseHistory[]>('/cases/patient/my', { params });
    return res.data;
  },
  getPatientCases: async (patientId: number, status?: string) => {
    const params = status && status !== 'ALL' ? { status } : {};
    const res = await apiClient.get<CaseHistory[]>(`/cases/patient/${patientId}`, { params });
    return res.data;
  },
  getMyDoctorCases: async (status?: string) => {
    const params = status && status !== 'ALL' ? { status } : {};
    const res = await apiClient.get<CaseHistory[]>('/cases/doctor/my', { params });
    return res.data;
  },
  getAllCases: async (params?: { status?: string; department_id?: number; doctor_id?: number; search?: string }) => {
    const res = await apiClient.get<CaseHistory[]>('/cases/all', { params });
    return res.data;
  },
  getCaseDetail: async (caseId: number) => {
    const res = await apiClient.get<CaseHistory>(`/cases/${caseId}`);
    return res.data;
  },
  updateCase: async (caseId: number, data: Partial<CaseHistory>) => {
    const res = await apiClient.put<CaseHistory>(`/cases/${caseId}`, data);
    return res.data;
  }
};

// Java Microservice API (Port 8085)
export const javaApi = {
  getHealth: async () => {
    const res = await axios.get('http://127.0.0.1:8085/api/java/health');
    return res.data;
  },
  runSimulation: async (patients = 50, doctors = 5) => {
    const res = await axios.get(`http://127.0.0.1:8085/api/java/simulation?patients=${patients}&doctors=${doctors}`);
    return res.data;
  },
  dispatchTriage: async (data: { patient_name: string; esi_level: number; department: string }) => {
    const res = await axios.post('http://127.0.0.1:8085/api/java/triage-dispatch', data);
    return res.data;
  }
};
