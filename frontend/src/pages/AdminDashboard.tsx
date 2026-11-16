import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../context/LanguageContext';
import { HospitalStats, User, Doctor, Department, Appointment, QueueToken, CaseHistory } from '../types';
import { adminApi, departmentsApi, doctorsApi, appointmentsApi, javaApi, casesApi } from '../services/api';
import {
  Building2,
  Users,
  Stethoscope,
  Calendar,
  Ticket,
  Activity,
  PlusCircle,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldCheck,
  UserPlus,
  Power,
  Flame,
  X,
  Cpu,
  Coffee,
  Play,
  FileText,
  Pill,
  Eye,
  Printer,
  Menu,
  Globe,
  Tv,
  LogOut,
  ChevronRight
} from 'lucide-react';

interface AdminDashboardProps {
  onNavigate?: (view: any) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigate }) => {
  const { user, logout } = useAuth();
  const { t, language, setLanguage, languages } = useTranslation();
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [stats, setStats] = useState<HospitalStats | null>(null);
  const [patients, setPatients] = useState<User[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [todayTokens, setTodayTokens] = useState<QueueToken[]>([]);
  const [allCases, setAllCases] = useState<CaseHistory[]>([]);
  const [caseFilter, setCaseFilter] = useState<string>('ALL');
  const [selectedCaseModal, setSelectedCaseModal] = useState<CaseHistory | null>(null);

  const [activeTab, setActiveTab] = useState<'overview' | 'patients' | 'doctors' | 'departments' | 'appointments' | 'queues' | 'cases' | 'java'>('overview');
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Java Engine State
  const [javaHealth, setJavaHealth] = useState<any>(null);
  const [javaSimResult, setJavaSimResult] = useState<any>(null);
  const [simPatients, setSimPatients] = useState<number>(50);
  const [simDoctors, setSimDoctors] = useState<number>(5);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [triageName, setTriageName] = useState<string>('');
  const [triageEsi, setTriageEsi] = useState<number>(2);
  const [triageDept, setTriageDept] = useState<string>('Emergency Care');
  const [dispatchedToken, setDispatchedToken] = useState<any>(null);

  // Doctor creation modal state
  const [showAddDoctorModal, setShowAddDoctorModal] = useState<boolean>(false);
  const [newDoctor, setNewDoctor] = useState({
    full_name: '',
    username: '',
    email: '',
    phone: '',
    password: 'doctor123',
    department_id: '',
    specialization: '',
    room_number: 'Room 101',
    consultation_fee: 50.0,
    avg_consultation_time: 15
  });

  // Department creation modal state
  const [showAddDeptModal, setShowAddDeptModal] = useState<boolean>(false);
  const [newDept, setNewDept] = useState({
    name: '',
    code: '',
    description: '',
    icon: 'Activity'
  });

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [statsData, patientsData, docsData, deptsData, aptsData, tokensData, casesData] = await Promise.all([
        adminApi.getStats(),
        adminApi.getPatients(),
        doctorsApi.list(),
        departmentsApi.list(),
        appointmentsApi.getAll(),
        adminApi.getAllTokens(),
        casesApi.getAllCases()
      ]);
      setStats(statsData);
      setPatients(patientsData);
      setDoctors(docsData);
      setDepartments(deptsData);
      setAppointments(aptsData);
      setTodayTokens(tokensData);
      setAllCases(casesData);
      if (deptsData.length > 0 && !newDoctor.department_id) {
        setNewDoctor(prev => ({ ...prev, department_id: String(deptsData[0].id) }));
      }
      // Check Java service health
      javaApi.getHealth()
        .then(res => setJavaHealth(res))
        .catch(() => setJavaHealth(null));
    } catch (err) {
      console.error('Failed to load admin data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRunJavaSim = async () => {
    setIsSimulating(true);
    try {
      const res = await javaApi.runSimulation(simPatients, simDoctors);
      setJavaSimResult(res);
      setNotification({ type: 'success', text: `Java Simulation complete: processed ${simPatients} virtual patients across ${simDoctors} doctors.` });
      setTimeout(() => setNotification(null), 3000);
    } catch (err) {
      setNotification({ type: 'error', text: 'Failed to run Java simulation. Ensure Java service is running on port 8085.' });
    } finally {
      setIsSimulating(false);
    }
  };

  const handleDispatchJavaTriage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!triageName.trim()) return;
    try {
      const res = await javaApi.dispatchTriage({
        patient_name: triageName.trim(),
        esi_level: Number(triageEsi),
        department: triageDept
      });
      setDispatchedToken(res);
      setNotification({ type: 'success', text: `Priority token ${res.token_number} generated by Java PriorityBlockingQueue!` });
      setTriageName('');
      setTimeout(() => setNotification(null), 4000);
    } catch (err) {
      setNotification({ type: 'error', text: 'Failed to dispatch Java emergency triage token.' });
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const handleTogglePatient = async (patientId: number) => {
    try {
      const res = await adminApi.togglePatientStatus(patientId);
      setNotification({ type: 'success', text: res.message });
      fetchAllData();
      setTimeout(() => setNotification(null), 3000);
    } catch (err: any) {
      setNotification({ type: 'error', text: err.response?.data?.detail || 'Failed to update patient' });
    }
  };

  const handleSetPriority = async (tokenId: number, currentPriority: number) => {
    const nextPriority = currentPriority === 0 ? 1 : 0;
    try {
      await adminApi.setPriority(tokenId, nextPriority);
      setNotification({ type: 'success', text: `Token priority toggled to ${nextPriority === 1 ? 'Emergency/Priority' : 'Normal'}` });
      fetchAllData();
      setTimeout(() => setNotification(null), 3000);
    } catch (err: any) {
      setNotification({ type: 'error', text: 'Failed to update token priority' });
    }
  };

  const handleCreateDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await doctorsApi.create({
        ...newDoctor,
        department_id: Number(newDoctor.department_id)
      });
      setNotification({ type: 'success', text: `Doctor ${newDoctor.full_name} created successfully!` });
      setShowAddDoctorModal(false);
      fetchAllData();
      setTimeout(() => setNotification(null), 3000);
    } catch (err: any) {
      setNotification({ type: 'error', text: err.response?.data?.detail || 'Failed to create doctor' });
    }
  };

  const handleCreateDept = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await departmentsApi.create(newDept);
      setNotification({ type: 'success', text: `Department ${newDept.name} created!` });
      setShowAddDeptModal(false);
      fetchAllData();
      setTimeout(() => setNotification(null), 3000);
    } catch (err: any) {
      setNotification({ type: 'error', text: err.response?.data?.detail || 'Failed to create department' });
    }
  };

  const filteredPatients = patients.filter(p =>
    p.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row">
      {/* MOBILE HEADER TOGGLE */}
      <div className="lg:hidden bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-16 z-30 shadow-xs">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100"
        >
          <Menu className="w-4 h-4 text-purple-600" />
          <span>Admin Menu</span>
        </button>
        <span className="text-xs font-bold text-slate-800">
          {activeTab === 'overview' ? 'Hospital Overview' :
           activeTab === 'cases' ? t('admin.tabCaseHistory', 'Case History') :
           activeTab === 'patients' ? t('admin.tabPatients', 'Patients') :
           activeTab === 'doctors' ? t('admin.tabDoctors', 'Doctors') :
           activeTab === 'departments' ? t('admin.tabDepartments', 'Departments') :
           activeTab === 'appointments' ? t('nav.appointments', 'Appointments') :
           activeTab === 'queues' ? t('admin.tabQueue', 'Live Tokens') : 'Java Concurrency Engine'}
        </span>
      </div>

      {/* LEFT SIDE PANEL (DESIGNED SIDEBAR) */}
      <aside className={`
        fixed lg:sticky top-16 lg:top-0 h-[calc(100vh-4rem)] z-40 w-72 bg-white border-r border-slate-200/80 shadow-lg lg:shadow-none flex flex-col justify-between transition-transform duration-300
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Top Profile & Header inside Sidebar */}
        <div className="p-5 space-y-5 overflow-y-auto">
          {/* Admin Profile Card */}
          <div className="bg-gradient-to-br from-purple-50 via-hospital-50/30 to-white rounded-2xl p-4 border border-purple-100 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white font-black text-base flex items-center justify-center shadow-md shadow-purple-500/20">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-800 block">
                  {t('nav.adminPortal', 'Admin Portal')}
                </span>
                <h4 className="text-sm font-bold text-slate-900 truncate">
                  {user?.full_name || 'Hospital Admin'}
                </h4>
                <span className="text-[10px] text-slate-400 font-mono block">
                  @{user?.username} • Central Ops
                </span>
              </div>
            </div>
          </div>

          {/* Primary Quick Actions */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => { setShowAddDoctorModal(true); setSidebarOpen(false); }}
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-hospital-600 hover:bg-hospital-700 text-white text-[11px] font-bold shadow-xs transition-colors"
            >
              <UserPlus className="w-3.5 h-3.5" /> Doctor
            </button>
            <button
              onClick={() => { setShowAddDeptModal(true); setSidebarOpen(false); }}
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-[11px] font-bold shadow-xs transition-colors"
            >
              <PlusCircle className="w-3.5 h-3.5" /> Dept
            </button>
          </div>

          {/* Navigation Items (Left Side Panel) */}
          <div className="space-y-1 pt-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 block mb-2">
              Hospital Management
            </span>

            {/* 1. Overview */}
            <button
              onClick={() => { setActiveTab('overview'); setSidebarOpen(false); }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'overview'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Activity className="w-4 h-4" />
                <span>{t('admin.tabOverview', 'Overview & KPIs')}</span>
              </div>
            </button>

            {/* 2. Case History Records (FEATURE 2) */}
            <button
              onClick={() => { setActiveTab('cases'); setSidebarOpen(false); }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'cases'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <FileText className="w-4 h-4" />
                <span>{t('admin.tabCaseHistory', 'Case History')}</span>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                activeTab === 'cases' ? 'bg-white text-purple-900' : 'bg-purple-100 text-purple-800'
              }`}>
                {allCases.length}
              </span>
            </button>

            {/* 3. Patients Directory */}
            <button
              onClick={() => { setActiveTab('patients'); setSidebarOpen(false); }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'patients'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Users className="w-4 h-4" />
                <span>{t('admin.tabPatients', 'Patients')}</span>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                activeTab === 'patients' ? 'bg-white text-purple-900' : 'bg-slate-100 text-slate-600'
              }`}>
                {patients.length}
              </span>
            </button>

            {/* 4. Doctors Directory */}
            <button
              onClick={() => { setActiveTab('doctors'); setSidebarOpen(false); }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'doctors'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Stethoscope className="w-4 h-4" />
                <span>{t('admin.tabDoctors', 'Doctors')}</span>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                activeTab === 'doctors' ? 'bg-white text-purple-900' : 'bg-slate-100 text-slate-600'
              }`}>
                {doctors.length}
              </span>
            </button>

            {/* 5. Departments */}
            <button
              onClick={() => { setActiveTab('departments'); setSidebarOpen(false); }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'departments'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Building2 className="w-4 h-4" />
                <span>{t('admin.tabDepartments', 'Departments')}</span>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                activeTab === 'departments' ? 'bg-white text-purple-900' : 'bg-slate-100 text-slate-600'
              }`}>
                {departments.length}
              </span>
            </button>

            {/* 6. Appointments */}
            <button
              onClick={() => { setActiveTab('appointments'); setSidebarOpen(false); }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'appointments'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Calendar className="w-4 h-4" />
                <span>{t('nav.appointments', 'Appointments')}</span>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                activeTab === 'appointments' ? 'bg-white text-purple-900' : 'bg-slate-100 text-slate-600'
              }`}>
                {appointments.length}
              </span>
            </button>

            {/* 7. Live Queue Tokens */}
            <button
              onClick={() => { setActiveTab('queues'); setSidebarOpen(false); }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'queues'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Ticket className="w-4 h-4" />
                <span>{t('admin.tabQueue', 'Live Tokens')}</span>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                activeTab === 'queues' ? 'bg-white text-purple-900' : 'bg-slate-100 text-slate-600'
              }`}>
                {todayTokens.length}
              </span>
            </button>

            {/* 8. Java Concurrency Engine & Simulation */}
            <button
              onClick={() => { setActiveTab('java'); setSidebarOpen(false); }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'java'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-amber-800 bg-amber-50/60 hover:bg-amber-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Coffee className="w-4 h-4 text-amber-600" />
                <span>{t('admin.tabJavaEngine', 'Java Engine')}</span>
              </div>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-amber-200/80 text-amber-900">
                8085
              </span>
            </button>
          </div>

          {/* Public Live Queue Board Shortcut */}
          {onNavigate && (
            <div className="pt-2 border-t border-slate-100">
              <button
                onClick={() => onNavigate('board')}
                className="w-full flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold text-teal-700 bg-teal-50/70 hover:bg-teal-100 transition-colors border border-teal-100"
              >
                <Tv className="w-4 h-4 text-teal-600" />
                <span>{t('nav.liveQueueBoard', 'Live Queue Display Board')}</span>
              </button>
            </div>
          )}
        </div>

        {/* Bottom Sidebar Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50/60 space-y-3">
          {/* Quick Language Pill inside Sidebar */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1">
              <Globe className="w-3.5 h-3.5 text-purple-600" />
              {t('common.language', 'Language')}:
            </span>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as any)}
              className="px-2 py-1 text-xs font-bold rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-purple-500"
            >
              {languages.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.flag} {l.nativeName}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-slate-200 bg-white hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 text-slate-600 text-xs font-bold transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>{t('common.logout', 'Sign Out')}</span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Header Banner with Realistic Operations Photography Background */}
        <div 
          className="relative rounded-3xl p-6 sm:p-8 shadow-md border border-slate-200/60 overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6 text-white bg-cover bg-center"
          style={{
            backgroundImage: `url('/images/hospital-admin-operations.jpg')`,
            backgroundColor: '#0f172a'
          }}
        >
          {/* Deep Purple & Navy Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/92 via-purple-950/85 to-hospital-950/85 backdrop-blur-[1px]" />

          <div className="relative z-10 max-w-xl">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-400/20 text-purple-200 border border-purple-300/30">
                Hospital Central Administration
              </span>
              <span className="text-xs text-purple-100/70 font-mono">Logged in: {user?.username}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse ml-1" />
              <span className="text-[11px] text-emerald-300 font-semibold">Live Operations Synced</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight drop-shadow-sm">
              Hospital Administration & Queue Control
            </h1>
            <p className="text-xs sm:text-sm text-purple-100/90 mt-1 drop-shadow">
              Manage hospital departments, doctor rosters, patient records, appointments, and live OPD queue streams.
            </p>
          </div>

          <div className="relative z-10 flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setShowAddDoctorModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-hospital-600 hover:bg-hospital-700 text-white text-xs font-bold shadow-md shadow-hospital-500/20 transition-all hover:scale-105"
            >
              <UserPlus className="w-4 h-4" /> Add Doctor
            </button>
            <button
              onClick={() => setShowAddDeptModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-md shadow-teal-500/20 transition-all hover:scale-105"
            >
              <PlusCircle className="w-4 h-4" /> Add Department
            </button>
            <button
              onClick={fetchAllData}
              title="Refresh All Data"
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/30 text-white transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-purple-300' : ''}`} />
            </button>
          </div>
        </div>

        {notification && (
          <div className={`p-4 rounded-2xl flex items-center gap-3 text-xs font-semibold ${notification.type === 'success'
            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
            : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}>
            {notification.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span>{notification.text}</span>
          </div>
        )}

        {/* KPI Stats Cards (STEP 6) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Patients</span>
            <span className="text-2xl font-black text-slate-900 mt-1 block">{stats?.total_patients || 0}</span>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Active Doctors</span>
            <span className="text-2xl font-black text-teal-700 mt-1 block">{stats?.total_doctors || 0}</span>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Appointments Today</span>
            <span className="text-2xl font-black text-hospital-700 mt-1 block">{stats?.appointments_today || 0}</span>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Tokens Waiting</span>
            <span className="text-2xl font-black text-amber-600 mt-1 block">{stats?.tokens_waiting || 0}</span>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">In Consultation</span>
            <span className="text-2xl font-black text-emerald-600 mt-1 block">{stats?.tokens_in_consultation || 0}</span>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Avg Wait Time</span>
            <span className="text-2xl font-black text-slate-700 mt-1 block">~{stats?.average_wait_minutes || 0}m</span>
          </div>
        </div>

        {/* Selected Tab View */}
        <div className="space-y-4">

        {/* TAB 1: Overview */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {stats?.doctor_summaries.map((doc) => (
              <div key={doc.doctor_id} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-hospital-700 uppercase">{doc.department_name}</span>
                  <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">{doc.room_number}</span>
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">{doc.doctor_name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`w-2 h-2 rounded-full ${doc.current_status === 'In Consultation' ? 'bg-amber-500' :
                      doc.current_status === 'Available' ? 'bg-emerald-500' : 'bg-slate-400'
                      }`} />
                    <span className="text-xs text-slate-500">{doc.current_status}</span>
                  </div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Current Token</span>
                    <span className="text-lg font-mono font-black text-hospital-700">{doc.current_token || 'None'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Waiting</span>
                    <span className="text-lg font-bold text-slate-800">{doc.waiting_count}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB 2: Patients Management */}
        {activeTab === 'patients' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="relative w-full max-w-xs">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search patients..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-hospital-500"
                />
              </div>
              <span className="text-xs text-slate-500">Showing {filteredPatients.length} patients</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Patient Name</th>
                    <th className="py-2.5 px-3">Username</th>
                    <th className="py-2.5 px-3">Email & Phone</th>
                    <th className="py-2.5 px-3">Gender & DOB</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPatients.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-semibold text-slate-900">{p.full_name}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-600">{p.username}</td>
                      <td className="py-2.5 px-3 text-slate-600">{p.email}<br /><span className="text-[11px] text-slate-400">{p.phone}</span></td>
                      <td className="py-2.5 px-3 text-slate-600">{p.patient_profile?.gender || 'N/A'} • {p.patient_profile?.dob || 'N/A'}</td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${p.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                          {p.is_active ? 'Active' : 'Deactivated'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => handleTogglePatient(p.id)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors ${p.is_active
                            ? 'bg-rose-50 text-rose-600 hover:bg-rose-100'
                            : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            }`}
                        >
                          {p.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: Doctors Management */}
        {activeTab === 'doctors' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-slate-900 text-sm">Registered Doctors ({doctors.length})</h3>
              <button
                onClick={() => setShowAddDoctorModal(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-hospital-600 hover:bg-hospital-700 text-white text-xs font-bold shadow-sm"
              >
                <UserPlus className="w-3.5 h-3.5" /> Add Doctor
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {doctors.map((d) => (
                <div key={d.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2 text-xs">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-sm text-slate-900">{d.full_name}</h4>
                      <p className="text-hospital-700 font-semibold">{d.department_name}</p>
                    </div>
                    <span className="bg-teal-100 text-teal-800 font-bold px-2 py-0.5 rounded text-[11px]">
                      {d.room_number}
                    </span>
                  </div>
                  <p className="text-slate-500">{d.specialization}</p>
                  <div className="pt-2 border-t border-slate-200/80 flex justify-between items-center text-slate-600">
                    <span>Fee: <b>${d.consultation_fee}</b></span>
                    <span>Status: <b className="text-slate-900">{d.current_status}</b></span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: Departments */}
        {activeTab === 'departments' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-slate-900 text-sm">Hospital Departments ({departments.length})</h3>
              <button
                onClick={() => setShowAddDeptModal(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-sm"
              >
                <PlusCircle className="w-3.5 h-3.5" /> Add Department
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {departments.map((dept) => {
                const deptImages: Record<string, string> = {
                  CARD: '/images/dept-cardiology.jpg',
                  GEN: '/images/dept-general.jpg',
                  ORTH: '/images/dept-orthopedics.jpg',
                  PED: '/images/dept-pediatrics.jpg',
                  NEUR: '/images/dept-neurology.jpg',
                  DERM: '/images/dept-dermatology.jpg'
                };
                const img = deptImages[dept.code] || '/images/dept-general.jpg';
                const docCount = doctors.filter(d => d.department_id === dept.id).length;
                return (
                  <div key={dept.id} className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs hover:shadow-md transition-all group">
                    <div 
                      className="h-32 bg-cover bg-center relative"
                      style={{ backgroundImage: `url('${img}')` }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-900/35 to-transparent group-hover:from-slate-950/90 transition-colors" />
                      <div className="absolute bottom-3 left-3.5 right-3.5 flex items-center justify-between text-white">
                        <span className="font-black text-base tracking-tight drop-shadow">{dept.name}</span>
                        <span className="font-mono text-[10px] font-bold bg-white/20 backdrop-blur-sm border border-white/30 px-2 py-0.5 rounded shadow-sm">
                          {dept.code}
                        </span>
                      </div>
                    </div>
                    <div className="p-4 space-y-2.5 text-xs">
                      <p className="text-slate-500 leading-relaxed">{dept.description}</p>
                      <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                        <span>Active Doctors: <b className="text-slate-800">{docCount}</b></span>
                        <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          OPD Active
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 5: Appointments */}
        {activeTab === 'appointments' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-4">
            <h3 className="font-bold text-slate-900 text-sm">All Hospital Appointments</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Apt #</th>
                    <th className="py-2.5 px-3">Patient</th>
                    <th className="py-2.5 px-3">Doctor</th>
                    <th className="py-2.5 px-3">Department</th>
                    <th className="py-2.5 px-3">Date & Time</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Token</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {appointments.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-mono font-semibold text-slate-700">{a.appointment_number}</td>
                      <td className="py-2.5 px-3 font-medium text-slate-900">{a.patient_name}</td>
                      <td className="py-2.5 px-3 text-slate-700">{a.doctor_name}</td>
                      <td className="py-2.5 px-3 text-slate-600">{a.department_name}</td>
                      <td className="py-2.5 px-3 text-slate-600">{a.appointment_date} {a.appointment_time}</td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${a.status === 'CONFIRMED' ? 'bg-hospital-100 text-hospital-800' :
                          a.status === 'WAITING' ? 'bg-amber-100 text-amber-800' :
                            a.status === 'IN_CONSULTATION' ? 'bg-emerald-100 text-emerald-800 animate-pulse' :
                              a.status === 'COMPLETED' ? 'bg-slate-100 text-slate-700' :
                                'bg-rose-100 text-rose-800'
                          }`}>
                          {a.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-hospital-700">{a.token_number || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 7: Java Queue Engine & Simulation */}
        {activeTab === 'java' && (
          <div className="space-y-6">
            {/* Java Microservice Health & Diagnostic Card */}
            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-amber-950 rounded-3xl p-6 sm:p-8 text-white border border-amber-900/40 shadow-xl">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400">
                    <Coffee className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-black tracking-tight text-white">
                        Java 26 Virtual Thread Queueing Engine
                      </h3>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${javaHealth ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        }`}>
                        {javaHealth ? '● Java Engine Active (Port 8085)' : '○ Standby / Offline'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300">
                      High-throughput Monte Carlo OPD simulation, M/M/c queue modeling, and PriorityBlockingQueue triage dispatcher
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    javaApi.getHealth().then(setJavaHealth).catch(() => setJavaHealth(null));
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold transition-colors flex items-center gap-1.5 border border-white/10"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Check JVM Status
                </button>
              </div>

              {/* JVM Diagnostics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Java Runtime</span>
                  <span className="text-xl font-black text-amber-300 mt-1 block font-mono">
                    {javaHealth?.java_version || 'Java 26.0.1'}
                  </span>
                </div>
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">CPU Cores</span>
                  <span className="text-xl font-black text-white mt-1 block">
                    {javaHealth?.available_cores || 4} Virtual Cores
                  </span>
                </div>
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">JVM Heap Memory</span>
                  <span className="text-xl font-black text-teal-300 mt-1 block">
                    {javaHealth?.memory_used_mb || 3} MB / {javaHealth?.memory_total_mb || 10} MB
                  </span>
                </div>
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Active Triage Queue</span>
                  <span className="text-xl font-black text-emerald-300 mt-1 block font-mono">
                    {javaHealth?.emergency_queue_size || 0} Priority Tokens
                  </span>
                </div>
              </div>
            </div>

            {/* Split Grid: Monte Carlo Simulator + Emergency Triage Dispatcher */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Feature 1: Monte Carlo Simulation Engine */}
              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                    <Activity className="w-5 h-5 text-hospital-600" />
                    <span>Java Monte Carlo OPD Load Simulator</span>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-400">Poisson Arrival Process</span>
                </div>

                <p className="text-xs text-slate-500">
                  Execute a multithreaded simulation of outpatient rush-hour congestion to test doctor capacity, predict bottleneck departments, and calculate wait times.
                </p>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Simulated Patients</label>
                    <select
                      value={simPatients}
                      onChange={(e) => setSimPatients(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                    >
                      <option value={25}>25 Patients (Light Load)</option>
                      <option value={50}>50 Patients (Moderate Rush)</option>
                      <option value={100}>100 Patients (Peak Rush Hour)</option>
                      <option value={200}>200 Patients (High Congestion)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Active Doctor Staff</label>
                    <select
                      value={simDoctors}
                      onChange={(e) => setSimDoctors(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                    >
                      <option value={3}>3 Doctors on Duty</option>
                      <option value={5}>5 Doctors on Duty</option>
                      <option value={8}>8 Doctors on Duty</option>
                      <option value={12}>12 Doctors (Full Capacity)</option>
                    </select>
                  </div>
                </div>

                <button
                  onClick={handleRunJavaSim}
                  disabled={isSimulating}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-hospital-600 to-amber-600 hover:from-hospital-700 hover:to-amber-700 text-white text-xs font-bold shadow-md shadow-hospital-500/20 disabled:opacity-50 transition-all"
                >
                  <Play className="w-4 h-4 fill-current" />
                  {isSimulating ? 'Running Java Concurrency Simulation...' : 'Run Java Queue Simulation'}
                </button>

                {/* Simulation Output Display */}
                {javaSimResult && (
                  <div className="mt-4 p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 animate-in fade-in">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-slate-800">Simulation Output</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] ${javaSimResult.queue_stability === 'OPTIMAL_FLOW'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                        }`}>
                        {javaSimResult.queue_stability}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                        <span className="text-[10px] text-slate-400 block font-semibold">Average Wait</span>
                        <span className="text-lg font-black text-slate-800">{javaSimResult.avg_wait_minutes}m</span>
                      </div>
                      <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                        <span className="text-[10px] text-slate-400 block font-semibold">95th %ile Wait</span>
                        <span className="text-lg font-black text-amber-600">{javaSimResult.p95_wait_minutes}m</span>
                      </div>
                      <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                        <span className="text-[10px] text-slate-400 block font-semibold">Utilization</span>
                        <span className="text-lg font-black text-teal-600">{javaSimResult.doctor_utilization_pct}%</span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-xs text-slate-600 pt-1 border-t border-slate-200/80">
                      <span>Throughput: <b>{javaSimResult.throughput_per_hour} patients/hr</b></span>
                      <span>Bottleneck Dept: <b className="text-hospital-700">{javaSimResult.bottleneck_department}</b></span>
                    </div>
                  </div>
                )}
              </div>

              {/* Feature 2: Emergency Triage Priority Dispenser */}
              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                    <Flame className="w-5 h-5 text-rose-600" />
                    <span>Java PriorityBlockingQueue Emergency Triage</span>
                  </div>
                  <span className="text-[11px] font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded">ESI 1-5 Triage</span>
                </div>

                <p className="text-xs text-slate-500">
                  Instant prioritized emergency intake handled directly by the Java PriorityBlockingQueue. Emergency patients supersede regular walk-in sequences.
                </p>

                <form onSubmit={handleDispatchJavaTriage} className="space-y-3 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Patient Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Samuel Davis (Trauma Case)"
                      value={triageName}
                      onChange={(e) => setTriageName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">ESI Triage Severity</label>
                      <select
                        value={triageEsi}
                        onChange={(e) => setTriageEsi(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
                      >
                        <option value={1}>Level 1: Resuscitation (Immediate)</option>
                        <option value={2}>Level 2: Emergent (High Risk)</option>
                        <option value={3}>Level 3: Urgent (Moderate)</option>
                        <option value={4}>Level 4: Less Urgent</option>
                        <option value={5}>Level 5: Non-Urgent</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Target Department</label>
                      <select
                        value={triageDept}
                        onChange={(e) => setTriageDept(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
                      >
                        <option value="Emergency Care">Emergency Care</option>
                        <option value="Trauma Unit">Trauma Unit</option>
                        <option value="Cardiac Emergency">Cardiac Emergency</option>
                        <option value="Pediatric Urgent">Pediatric Urgent</option>
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-700 hover:to-amber-700 text-white font-bold shadow-sm transition-all"
                  >
                    Dispatch Emergency Priority Token
                  </button>
                </form>

                {/* Dispatched Token Box */}
                {dispatchedToken && (
                  <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 space-y-1.5 animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-black text-xl text-rose-700">{dispatchedToken.token_number}</span>
                      <span className="text-[10px] font-bold bg-rose-200 text-rose-900 px-2 py-0.5 rounded">
                        {dispatchedToken.triage_category}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-slate-900">{dispatchedToken.patient_name} • {dispatchedToken.department}</p>
                    <p className="text-[11px] text-slate-500 italic">
                      Position in Emergency Queue: <b>#{dispatchedToken.emergency_queue_position}</b> • Est. Duration: ~{dispatchedToken.estimated_duration_minutes}m
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB: Case History Records (FEATURE 2) */}
        {activeTab === 'cases' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-1.5 text-xs flex-wrap">
                <span className="font-bold text-slate-500 uppercase text-[11px] mr-2">{t('common.filter', 'Filter')}:</span>
                {['ALL', 'COMPLETED', 'IN_PROGRESS', 'PENDING', 'CANCELLED'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setCaseFilter(st)}
                    className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all ${caseFilter === st
                      ? 'bg-hospital-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                  >
                    {st === 'ALL' ? t('common.all', 'All') : t(`status.${st.toLowerCase()}`, st)}
                  </button>
                ))}
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder={t('admin.searchCases', 'Search cases, patients, doctors...')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-hospital-500 bg-slate-50"
                />
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-3 px-4">Case #</th>
                      <th className="py-3 px-4">Patient</th>
                      <th className="py-3 px-4">Doctor</th>
                      <th className="py-3 px-4">Department</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Diagnosis</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {allCases
                      .filter(c => caseFilter === 'ALL' || c.status === caseFilter)
                      .filter(c => !searchTerm ||
                        c.case_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        c.patient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        c.doctor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (c.diagnosis && c.diagnosis.toLowerCase().includes(searchTerm.toLowerCase()))
                      )
                      .map((c) => (
                        <tr key={c.id} className="hover:bg-slate-50/60">
                          <td className="py-3 px-4 font-mono font-bold text-hospital-700">{c.case_number}</td>
                          <td className="py-3 px-4 font-medium text-slate-900">{c.patient_name}</td>
                          <td className="py-3 px-4 text-slate-700">{c.doctor_name}</td>
                          <td className="py-3 px-4 text-slate-600">{c.department_name}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${c.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' :
                              c.status === 'IN_PROGRESS' ? 'bg-amber-100 text-amber-800 animate-pulse' :
                                c.status === 'PENDING' ? 'bg-blue-100 text-blue-800' :
                                  'bg-slate-100 text-slate-700'
                              }`}>
                              {t(`status.${c.status.toLowerCase()}`, c.status)}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-700 font-medium max-w-xs truncate">{c.diagnosis || 'Pending Consultation'}</td>
                          <td className="py-3 px-4 text-slate-500">{new Date(c.created_at).toLocaleDateString()}</td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => setSelectedCaseModal(c)}
                              className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-hospital-50 text-hospital-700 font-bold hover:bg-hospital-100 transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5" /> View
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
        </div>
      </main>

      {/* Modal: Add Doctor (STEP 6) */}
      {showAddDoctorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-hospital-600" /> Add Doctor Specialist
              </h3>
              <button onClick={() => setShowAddDoctorModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateDoctor} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Arthur Conan"
                  value={newDoctor.full_name}
                  onChange={(e) => setNewDoctor({ ...newDoctor, full_name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Username *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. dr.conan"
                    value={newDoctor.username}
                    onChange={(e) => setNewDoctor({ ...newDoctor, username: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Password *</label>
                  <input
                    type="password"
                    required
                    value={newDoctor.password}
                    onChange={(e) => setNewDoctor({ ...newDoctor, password: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    placeholder="doctor@hospital.com"
                    value={newDoctor.email}
                    onChange={(e) => setNewDoctor({ ...newDoctor, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Phone</label>
                  <input
                    type="tel"
                    placeholder="+1 555-010-0099"
                    value={newDoctor.phone}
                    onChange={(e) => setNewDoctor({ ...newDoctor, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Department *</label>
                  <select
                    value={newDoctor.department_id}
                    onChange={(e) => setNewDoctor({ ...newDoctor, department_id: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Room Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Room 205"
                    value={newDoctor.room_number}
                    onChange={(e) => setNewDoctor({ ...newDoctor, room_number: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Specialization *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Consultant Cardiologist"
                  value={newDoctor.specialization}
                  onChange={(e) => setNewDoctor({ ...newDoctor, specialization: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddDoctorModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 font-bold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-hospital-600 hover:bg-hospital-700 text-white font-bold shadow-sm"
                >
                  Create Doctor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Department */}
      {showAddDeptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Building2 className="w-5 h-5 text-teal-600" /> Add Hospital Department
              </h3>
              <button onClick={() => setShowAddDeptModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateDept} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Department Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ophthalmology"
                  value={newDept.name}
                  onChange={(e) => setNewDept({ ...newDept, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Department Code (3-5 letters) *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. OPHT"
                  value={newDept.code}
                  onChange={(e) => setNewDept({ ...newDept, code: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono uppercase"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Eye & Vision Care Specialists"
                  value={newDept.description}
                  onChange={(e) => setNewDept({ ...newDept, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddDeptModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 font-bold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold shadow-sm"
                >
                  Save Department
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Case Details Modal for Admin Audit */}
      {selectedCaseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-hospital-100 text-hospital-800 border border-hospital-200">
                  {t('case.modalTitle', 'Hospital Case Summary & Medical Record')}
                </span>
                <h3 className="text-xl font-black text-slate-900 mt-1">
                  {selectedCaseModal.case_number}
                </h3>
              </div>
              <button
                onClick={() => setSelectedCaseModal(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200/80 text-xs">
              <div>
                <span className="text-slate-400 font-bold uppercase text-[10px] block">{t('common.patient', 'Patient')}</span>
                <span className="font-bold text-slate-900 text-sm">{selectedCaseModal.patient_name}</span>
                <span className="text-[11px] text-slate-500 block">{selectedCaseModal.patient_email || ''}</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold uppercase text-[10px] block">{t('common.doctor', 'Doctor')}</span>
                <span className="font-bold text-slate-900 text-sm">{selectedCaseModal.doctor_name}</span>
                <span className="text-[11px] text-slate-500 block">{selectedCaseModal.department_name}</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold uppercase text-[10px] block">{t('common.status', 'Status')}</span>
                <span className={`px-2 py-0.5 rounded text-[11px] font-bold inline-block mt-1 ${selectedCaseModal.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' :
                  selectedCaseModal.status === 'IN_PROGRESS' ? 'bg-amber-100 text-amber-800 animate-pulse' :
                    selectedCaseModal.status === 'PENDING' ? 'bg-blue-100 text-blue-800' :
                      'bg-slate-100 text-slate-700'
                  }`}>
                  {t(`status.${selectedCaseModal.status.toLowerCase()}`, selectedCaseModal.status)}
                </span>
              </div>
              <div>
                <span className="text-slate-400 font-bold uppercase text-[10px] block">{t('case.consultDate', 'Date')}</span>
                <span className="font-semibold text-slate-800">{new Date(selectedCaseModal.created_at).toLocaleDateString()}</span>
              </div>
              {selectedCaseModal.token_number && (
                <div>
                  <span className="text-slate-400 font-bold uppercase text-[10px] block">{t('common.token', 'Token')}</span>
                  <span className="font-mono font-bold text-hospital-700">{selectedCaseModal.token_number}</span>
                </div>
              )}
              {selectedCaseModal.doctor_room && (
                <div>
                  <span className="text-slate-400 font-bold uppercase text-[10px] block">{t('common.room', 'Room')}</span>
                  <span className="font-semibold text-slate-800">{selectedCaseModal.doctor_room}</span>
                </div>
              )}
              {selectedCaseModal.vitals && (
                <div className="col-span-2 sm:col-span-3 pt-2 border-t border-slate-200">
                  <span className="text-slate-400 font-bold uppercase text-[10px] block mb-0.5">{t('case.vitalsHeading', 'Recorded Vitals')}</span>
                  <span className="font-medium text-slate-800">{selectedCaseModal.vitals}</span>
                </div>
              )}
            </div>

            {selectedCaseModal.symptoms && (
              <div className="space-y-1 text-xs">
                <span className="text-slate-500 font-bold uppercase text-[10px] tracking-wider block">{t('case.symptomsHeading', 'Symptoms / Complaints')}</span>
                <div className="bg-amber-50/50 border border-amber-200 p-3.5 rounded-2xl text-slate-800">{selectedCaseModal.symptoms}</div>
              </div>
            )}

            {selectedCaseModal.diagnosis && (
              <div className="space-y-1 text-xs">
                <span className="text-teal-700 font-bold uppercase text-[10px] tracking-wider block">{t('case.diagnosisHeading', 'Doctor Diagnosis')}</span>
                <div className="bg-teal-50 border border-teal-200 p-3.5 rounded-2xl text-teal-950 font-semibold">{selectedCaseModal.diagnosis}</div>
              </div>
            )}

            {selectedCaseModal.prescription && (
              <div className="space-y-1 text-xs">
                <span className="text-hospital-700 font-bold uppercase text-[10px] tracking-wider flex items-center gap-1.5">
                  <Pill className="w-3.5 h-3.5" /> {t('case.rxHeading', 'Prescription & Medication Plan')}
                </span>
                <div className="bg-white border border-slate-200 p-3.5 rounded-2xl text-slate-800 whitespace-pre-line font-mono text-[11px] shadow-inner">
                  {selectedCaseModal.prescription}
                </div>
              </div>
            )}

            {selectedCaseModal.clinical_notes && (
              <div className="space-y-1 text-xs">
                <span className="text-slate-500 font-bold uppercase text-[10px] tracking-wider block">{t('case.adviceHeading', 'Clinical Advice & Notes')}</span>
                <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl text-slate-700 whitespace-pre-line">{selectedCaseModal.clinical_notes}</div>
              </div>
            )}

            {selectedCaseModal.follow_up_date && (
              <div className="text-xs bg-hospital-50 p-3 rounded-2xl border border-hospital-200 flex items-center justify-between">
                <span className="font-bold text-hospital-800">{t('case.followUpHeading', 'Follow-up Recommendation')}:</span>
                <span className="font-bold text-hospital-900 bg-white px-2.5 py-1 rounded-lg border border-hospital-200">{selectedCaseModal.follow_up_date}</span>
              </div>
            )}

            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <Printer className="w-4 h-4" /> {t('case.printSummary', 'Print Record')}
              </button>
              <button
                onClick={() => setSelectedCaseModal(null)}
                className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors"
              >
                {t('common.close', 'Close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
