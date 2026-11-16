import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../context/LanguageContext';
import { QueueToken, Appointment, CaseHistory } from '../types';
import { queueApi, appointmentsApi, casesApi } from '../services/api';
import { DigitalTokenCard } from '../components/DigitalTokenCard';
import { BookAppointmentModal } from './BookAppointmentModal';
import {
  Calendar,
  Clock,
  PlusCircle,
  RefreshCw,
  User,
  MapPin,
  Phone,
  AlertCircle,
  CheckCircle2,
  Ticket,
  History,
  Stethoscope,
  ShieldAlert,
  Trash2,
  FileText,
  Pill,
  Activity,
  Heart,
  ChevronRight,
  Printer,
  X,
  Menu,
  Tv,
  Globe,
  LogOut,
  Sparkles,
  Info
} from 'lucide-react';

interface PatientDashboardProps {
  onNavigate: (view: string) => void;
}

export const PatientDashboard: React.FC<PatientDashboardProps> = ({ onNavigate }) => {
  const { user, logout } = useAuth();
  const { t, language, setLanguage, languages, currentLanguageOption } = useTranslation();
  const [activeToken, setActiveToken] = useState<QueueToken | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [cases, setCases] = useState<CaseHistory[]>([]);
  const [caseFilter, setCaseFilter] = useState<string>('ALL');
  const [selectedCase, setSelectedCase] = useState<CaseHistory | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isBookModalOpen, setIsBookModalOpen] = useState<boolean>(false);

  // Sidebar navigation state
  const [activeSidebarTab, setActiveSidebarTab] = useState<'token' | 'appointments' | 'cases' | 'history' | 'profile'>('token');
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);

  const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchDashboardData = async () => {
    setIsRefreshing(true);
    try {
      const [tokenData, aptsData, casesData] = await Promise.all([
        queueApi.getMyToken(),
        appointmentsApi.getMy(),
        casesApi.getMyPatientCases(caseFilter)
      ]);
      setActiveToken(tokenData);
      setAppointments(aptsData);
      setCases(casesData);
    } catch (err) {
      console.error('Error fetching patient dashboard data', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 5000);
    return () => clearInterval(interval);
  }, [caseFilter]);

  const handleCancelAppointment = async (aptId: number) => {
    if (!window.confirm('Are you sure you want to cancel this appointment?')) return;
    try {
      await appointmentsApi.cancel(aptId);
      setActionMsg({ type: 'success', text: 'Appointment cancelled successfully.' });
      fetchDashboardData();
      setTimeout(() => setActionMsg(null), 3000);
    } catch (err: any) {
      setActionMsg({ type: 'error', text: err.response?.data?.detail || 'Failed to cancel appointment.' });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">{t('status.completed', 'Completed')}</span>;
      case 'IN_PROGRESS':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200 animate-pulse">{t('status.in_progress', 'In Progress')}</span>;
      case 'WAITING':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-100 text-sky-800 border border-sky-200">{t('status.waiting', 'Waiting')}</span>;
      case 'PENDING':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">{t('status.pending', 'Pending')}</span>;
      case 'SKIPPED':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">{t('status.skipped', 'Skipped')}</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700">{status}</span>;
    }
  };

  const upcomingAppointments = appointments.filter(a => a.status !== 'COMPLETED' && a.status !== 'CANCELLED');
  const historyAppointments = appointments.filter(a => a.status === 'COMPLETED' || a.status === 'CANCELLED');

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row">
      {/* MOBILE HEADER TOGGLE */}
      <div className="lg:hidden bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-16 z-30 shadow-xs">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100"
        >
          <Menu className="w-4 h-4 text-hospital-600" />
          <span>Patient Menu</span>
        </button>
        <span className="text-xs font-bold text-slate-800 capitalize">
          {activeSidebarTab === 'token' ? t('nav.digitalToken', 'Digital Token') :
            activeSidebarTab === 'appointments' ? t('patient.myAppointmentsTitle', 'Appointments') :
              activeSidebarTab === 'cases' ? t('patient.caseHistoryTitle', 'Case History') :
                activeSidebarTab === 'history' ? t('nav.appointments', 'Past Visits') : t('nav.patients', 'Profile')}
        </span>
      </div>

      {/* LEFT SIDE PANEL (DESIGNED SIDEBAR) */}
      <aside className={`
        fixed lg:sticky top-16 lg:top-0 h-[calc(100vh-4rem)] z-40 w-72 bg-white border-r border-slate-200/80 shadow-lg lg:shadow-none flex flex-col justify-between transition-transform duration-300
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Top Profile & Header inside Sidebar */}
        <div className="p-5 space-y-5 overflow-y-auto">
          {/* User Profile Card */}
          <div className="bg-gradient-to-br from-hospital-50 via-teal-50/40 to-white rounded-2xl p-4 border border-hospital-100 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-hospital-600 to-teal-500 text-white font-black text-base flex items-center justify-center shadow-md shadow-hospital-500/20">
                {user?.full_name?.charAt(0) || 'P'}
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-hospital-700 block">
                  {t('nav.patientPortal', 'Patient Portal')}
                </span>
                <h4 className="text-sm font-bold text-slate-900 truncate">
                  {user?.full_name}
                </h4>
                <span className="text-[10px] text-slate-400 font-mono block">
                  ID: PAT-100{user?.id}
                </span>
              </div>
            </div>
          </div>

          {/* Primary Quick CTA: Book Appointment */}
          <button
            onClick={() => {
              setIsBookModalOpen(true);
              setSidebarOpen(false);
            }}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-hospital-600 to-teal-600 hover:from-hospital-700 hover:to-teal-700 text-white font-bold text-xs shadow-md shadow-hospital-500/20 transition-all hover:scale-[1.02]"
          >
            <PlusCircle className="w-4 h-4" />
            {t('patient.bookAppointmentBtn', 'Book Appointment')}
          </button>

          {/* Navigation Items (Left Side Panel) */}
          <div className="space-y-1 pt-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 block mb-2">
              Features & Services
            </span>

            {/* 1. Live Digital Token */}
            <button
              onClick={() => { setActiveSidebarTab('token'); setSidebarOpen(false); }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${activeSidebarTab === 'token'
                  ? 'bg-hospital-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
            >
              <div className="flex items-center gap-2.5">
                <Ticket className="w-4 h-4" />
                <span>{t('patient.activeTokenTitle', 'Live Digital Token')}</span>
              </div>
              {activeToken && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${activeSidebarTab === 'token' ? 'bg-white text-hospital-800' : 'bg-emerald-100 text-emerald-800 animate-pulse'
                  }`}>
                  {activeToken.token_number}
                </span>
              )}
            </button>

            {/* 2. My Appointments */}
            <button
              onClick={() => { setActiveSidebarTab('appointments'); setSidebarOpen(false); }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${activeSidebarTab === 'appointments'
                  ? 'bg-hospital-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
            >
              <div className="flex items-center gap-2.5">
                <Calendar className="w-4 h-4" />
                <span>{t('patient.myAppointmentsTitle', 'My Appointments')}</span>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${activeSidebarTab === 'appointments' ? 'bg-white text-hospital-800' : 'bg-slate-100 text-slate-600'
                }`}>
                {upcomingAppointments.length}
              </span>
            </button>

            {/* 3. Medical & Case History (FEATURE 2) */}
            <button
              onClick={() => { setActiveSidebarTab('cases'); setSidebarOpen(false); }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${activeSidebarTab === 'cases'
                  ? 'bg-hospital-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
            >
              <div className="flex items-center gap-2.5">
                <FileText className="w-4 h-4" />
                <span>{t('patient.caseHistoryTitle', 'Medical & Case History')}</span>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${activeSidebarTab === 'cases' ? 'bg-white text-hospital-800' : 'bg-hospital-100 text-hospital-800'
                }`}>
                {cases.length}
              </span>
            </button>

            {/* 4. Past Visits History */}
            <button
              onClick={() => { setActiveSidebarTab('history'); setSidebarOpen(false); }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${activeSidebarTab === 'history'
                  ? 'bg-hospital-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
            >
              <div className="flex items-center gap-2.5">
                <History className="w-4 h-4" />
                <span>{t('nav.appointments', 'Past Visits')}</span>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${activeSidebarTab === 'history' ? 'bg-white text-hospital-800' : 'bg-slate-100 text-slate-600'
                }`}>
                {historyAppointments.length}
              </span>
            </button>

            {/* 5. Patient Profile */}
            <button
              onClick={() => { setActiveSidebarTab('profile'); setSidebarOpen(false); }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${activeSidebarTab === 'profile'
                  ? 'bg-hospital-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
            >
              <div className="flex items-center gap-2.5">
                <User className="w-4 h-4" />
                <span>{t('nav.patients', 'Patient Profile')}</span>
              </div>
            </button>
          </div>

          {/* Public Live Queue Board Shortcut */}
          <div className="pt-2 border-t border-slate-100">
            <button
              onClick={() => onNavigate('board')}
              className="w-full flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold text-teal-700 bg-teal-50/70 hover:bg-teal-100 transition-colors border border-teal-100"
            >
              <Tv className="w-4 h-4 text-teal-600" />
              <span>{t('nav.liveQueueBoard', 'Live Queue Display Board')}</span>
            </button>
          </div>
        </div>

        {/* Bottom Sidebar Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50/60 space-y-3">
          {/* Quick Language Pill inside Sidebar */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1">
              <Globe className="w-3.5 h-3.5 text-hospital-600" />
              {t('common.language', 'Language')}:
            </span>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as any)}
              className="px-2 py-1 text-xs font-bold rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-hospital-500"
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
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>{t('common.logout', 'Sign Out')}</span>
          </button>
        </div>
      </aside>

      {/* OVERLAY FOR MOBILE SIDEBAR */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-slate-900/50 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* RIGHT MAIN CONTENT AREA */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-6xl">
        {/* Welcome Banner with Realistic Hospital Photography Background */}
        <div 
          className="relative rounded-3xl p-6 sm:p-8 shadow-md border border-slate-200/60 overflow-hidden flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-white bg-cover bg-center"
          style={{
            backgroundImage: `url('/images/hospital-patient-banner.jpg')`,
            backgroundColor: '#0f172a'
          }}
        >
          {/* Deep Medical Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-hospital-950/92 via-hospital-900/85 to-teal-950/75 backdrop-blur-[1px]" />
          
          <div className="relative z-10 max-w-xl">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-teal-400/20 text-teal-200 border border-teal-300/30">
                {t('nav.patientPortal', 'Patient Portal')}
              </span>
              <span className="text-xs text-teal-100/70 font-mono">
                ID: PAT-100{user?.id}
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse ml-1" />
              <span className="text-[11px] text-emerald-300 font-semibold">Live Queue Synced</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight drop-shadow-sm">
              {t('patient.welcome', 'Welcome,')} {user?.full_name}! 👋
            </h1>
            <p className="text-xs sm:text-sm text-teal-100/90 mt-1 drop-shadow">
              {t('patient.quickOverview', 'Your current digital token, upcoming visits, and medical records')}
            </p>
          </div>

          <div className="relative z-10 flex items-center gap-2.5 self-end sm:self-center">
            <button
              onClick={() => setIsBookModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold border border-white/30 shadow-sm backdrop-blur-sm transition-all hover:scale-105"
            >
              + {t('nav.bookAppointment', 'Book Appointment')}
            </button>
            <button
              onClick={fetchDashboardData}
              disabled={isRefreshing}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/30 text-white transition-colors"
              title={t('common.refresh', 'Refresh Data')}
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-teal-300' : ''}`} />
            </button>
          </div>
        </div>

        {/* Action Notification Alert */}
        {actionMsg && (
          <div className={`p-4 rounded-2xl flex items-center gap-3 text-xs font-semibold border ${actionMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}>
            {actionMsg.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <AlertCircle className="w-5 h-5 text-rose-600" />}
            <span>{actionMsg.text}</span>
          </div>
        )}

        {/* VIEW 1: DIGITAL TOKEN */}
        {activeSidebarTab === 'token' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Ticket className="w-5 h-5 text-hospital-600" />
                {t('patient.activeTokenTitle', 'Live Digital Token')}
              </h2>
              <span className="text-xs text-slate-400 flex items-center gap-1.5 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                {t('common.online', 'Live Queue Synchronized')}
              </span>
            </div>

            {activeToken ? (
              <DigitalTokenCard token={activeToken} onRefresh={fetchDashboardData} />
            ) : (
              <div className="bg-gradient-to-br from-slate-50 to-hospital-50/40 rounded-3xl p-8 border border-dashed border-slate-300 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-white shadow-sm border border-slate-200 flex items-center justify-center mx-auto text-slate-400">
                  <Ticket className="w-6 h-6 stroke-[1.5]" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">
                    {t('patient.noActiveToken', 'No active queue token for today')}
                  </h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                    {t('patient.noActiveTokenDesc', 'Book an appointment or take a walk-in token to join the live queue.')}
                  </p>
                </div>
                <button
                  onClick={() => setIsBookModalOpen(true)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-hospital-600 hover:bg-hospital-700 text-white text-xs font-bold shadow-md shadow-hospital-500/20 transition-all hover:scale-105"
                >
                  <PlusCircle className="w-4 h-4" />
                  {t('patient.bookAppointmentBtn', 'Book Appointment Now')}
                </button>
              </div>
            )}
          </div>
        )}

        {/* VIEW 2: MY APPOINTMENTS */}
        {activeSidebarTab === 'appointments' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-hospital-600" />
                {t('patient.myAppointmentsTitle', 'My Appointments')} ({upcomingAppointments.length})
              </h2>
              <button
                onClick={() => setIsBookModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-hospital-600 text-white text-xs font-bold shadow-xs hover:bg-hospital-700 transition-colors"
              >
                <PlusCircle className="w-4 h-4" /> {t('nav.bookAppointment', 'Book New')}
              </button>
            </div>

            {upcomingAppointments.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 text-slate-400 text-xs">
                {t('patient.noAppointments', 'No active or upcoming appointments found.')}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {upcomingAppointments.map((apt) => (
                  <div
                    key={apt.id}
                    className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between hover:border-hospital-300 transition-all"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                          {apt.appointment_number}
                        </span>
                        {getStatusBadge(apt.status)}
                      </div>

                      <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                        <Stethoscope className="w-4 h-4 text-hospital-600" />
                        {apt.doctor_name}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {apt.department_name} • {apt.doctor_room || 'Room 101'}
                      </p>

                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-teal-600" />
                          <span>{apt.appointment_date}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-teal-600" />
                          <span>{apt.appointment_time}</span>
                        </div>
                      </div>

                      {apt.reason && (
                        <p className="mt-2 text-xs text-slate-500 italic">
                          "{apt.reason}"
                        </p>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                      {apt.token_number && (
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-hospital-700 bg-hospital-50 px-2.5 py-1 rounded-lg border border-hospital-200">
                          <Ticket className="w-3.5 h-3.5" /> {t('common.token', 'Token')}: <b className="font-mono">{apt.token_number}</b>
                        </div>
                      )}
                      <button
                        onClick={() => handleCancelAppointment(apt.id)}
                        className="text-xs font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1 hover:underline ml-auto"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> {t('common.cancel', 'Cancel')}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* VIEW 3: MEDICAL & CASE HISTORY */}
        {activeSidebarTab === 'cases' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-hospital-600" />
                {t('patient.caseHistoryTitle', 'Medical & Case History')}
              </h2>
            </div>

            {/* Filter pills: ALL, COMPLETED, IN_PROGRESS, PENDING */}
            <div className="flex items-center justify-between flex-wrap gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center gap-1.5 text-xs">
                <span className="font-bold text-slate-500 uppercase text-[11px] mr-2">{t('common.filter', 'Filter')}:</span>
                {['ALL', 'COMPLETED', 'IN_PROGRESS', 'PENDING'].map((st) => (
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

              <span className="text-xs text-slate-400 font-medium">
                {cases.length} {t('nav.caseHistory', 'Case Records')}
              </span>
            </div>

            {cases.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 text-slate-400 text-xs space-y-2">
                <FileText className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="font-semibold text-slate-600">{t('patient.noCasesFound', 'No case records found in this category.')}</p>
                <p className="text-[11px] text-slate-400">All your active and completed consultation records will appear here.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {cases.map((c) => (
                  <div
                    key={c.id}
                    className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:border-hospital-300 transition-all flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-hospital-700 bg-hospital-50 px-2.5 py-1 rounded-lg border border-hospital-200">
                          {c.case_number}
                        </span>
                        {getStatusBadge(c.status)}
                      </div>

                      <div>
                        <h4 className="font-bold text-slate-900 text-base flex items-center gap-2">
                          <Stethoscope className="w-4 h-4 text-hospital-600" />
                          {c.doctor_name}
                        </h4>
                        <p className="text-xs text-slate-500">{c.department_name} • {c.doctor_room || 'Room 101'}</p>
                      </div>

                      {c.symptoms && (
                        <div className="text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                          <span className="font-bold text-slate-500 uppercase text-[10px] block mb-0.5">{t('doctor.chiefComplaints', 'Symptoms')}:</span>
                          <p className="text-slate-700 line-clamp-2">{c.symptoms}</p>
                        </div>
                      )}

                      {c.diagnosis && (
                        <div className="text-xs bg-teal-50/60 p-2.5 rounded-xl border border-teal-100">
                          <span className="font-bold text-teal-800 uppercase text-[10px] block mb-0.5">{t('doctor.clinicalDiagnosis', 'Diagnosis')}:</span>
                          <p className="text-teal-900 font-semibold">{c.diagnosis}</p>
                        </div>
                      )}

                      {c.vitals && (
                        <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                          <Activity className="w-3.5 h-3.5 text-rose-500" />
                          <span>{c.vitals}</span>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[11px] text-slate-400">
                        {new Date(c.created_at).toLocaleDateString()}
                      </span>
                      <button
                        onClick={() => setSelectedCase(c)}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-hospital-600 hover:text-hospital-800 hover:underline"
                      >
                        {t('patient.viewFullRecord', 'View Full Case Record')}
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* VIEW 4: PAST VISITS */}
        {activeSidebarTab === 'history' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <History className="w-5 h-5 text-hospital-600" />
              {t('nav.appointments', 'Past Visits')}
            </h2>

            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
              {historyAppointments.length === 0 ? (
                <div className="p-12 text-center text-slate-400 text-xs">
                  No past appointment records found.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                      <tr>
                        <th className="py-3 px-4">Appointment #</th>
                        <th className="py-3 px-4">Doctor</th>
                        <th className="py-3 px-4">Department</th>
                        <th className="py-3 px-4">Date & Time</th>
                        <th className="py-3 px-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {historyAppointments.map((apt) => (
                        <tr key={apt.id} className="hover:bg-slate-50/60">
                          <td className="py-3 px-4 font-mono font-semibold text-slate-700">{apt.appointment_number}</td>
                          <td className="py-3 px-4 font-medium text-slate-900">{apt.doctor_name}</td>
                          <td className="py-3 px-4 text-slate-600">{apt.department_name}</td>
                          <td className="py-3 px-4 text-slate-600">{apt.appointment_date} at {apt.appointment_time}</td>
                          <td className="py-3 px-4">
                            {getStatusBadge(apt.status)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* VIEW 5: PATIENT PROFILE */}
        {activeSidebarTab === 'profile' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <User className="w-5 h-5 text-hospital-600" />
              {t('nav.patients', 'Patient Profile')}
            </h2>

            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs max-w-3xl space-y-6">
              <div className="flex items-center gap-4 pb-6 border-b border-slate-100">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-hospital-600 to-teal-500 text-white font-black text-2xl flex items-center justify-center shadow-lg shadow-hospital-500/20">
                  {user?.full_name?.charAt(0) || 'P'}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">{user?.full_name}</h3>
                  <p className="text-xs text-slate-500 font-mono">Username: @{user?.username} • ID: PAT-100{user?.id}</p>
                  <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    Active Patient Account
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs">
                <div>
                  <span className="text-slate-400 block uppercase font-bold text-[10px]">Full Legal Name</span>
                  <span className="text-slate-900 font-semibold text-sm">{user?.full_name}</span>
                </div>
                <div>
                  <span className="text-slate-400 block uppercase font-bold text-[10px]">Email Address</span>
                  <span className="text-slate-900 font-semibold text-sm">{user?.email}</span>
                </div>
                <div>
                  <span className="text-slate-400 block uppercase font-bold text-[10px]">Phone Number</span>
                  <span className="text-slate-900 font-semibold text-sm">{user?.phone || 'Not provided'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block uppercase font-bold text-[10px]">Date of Birth</span>
                  <span className="text-slate-900 font-semibold text-sm">{user?.patient_profile?.dob || 'Not provided'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block uppercase font-bold text-[10px]">Gender</span>
                  <span className="text-slate-900 font-semibold text-sm">{user?.patient_profile?.gender || 'Not specified'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block uppercase font-bold text-[10px]">Blood Group</span>
                  <span className="text-slate-900 font-semibold text-sm text-hospital-700 font-mono">
                    {user?.patient_profile?.blood_group || 'O+'}
                  </span>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-slate-400 block uppercase font-bold text-[10px]">Residential Address</span>
                  <span className="text-slate-900 font-semibold text-sm">{user?.patient_profile?.address || 'Not provided'}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Appointment Booking Modal */}
      <BookAppointmentModal
        isOpen={isBookModalOpen}
        onClose={() => setIsBookModalOpen(false)}
        onSuccess={(apt) => {
          fetchDashboardData();
          setActionMsg({ type: 'success', text: `Appointment ${apt.appointment_number} confirmed! Token ${apt.token_number || ''} issued.` });
          setTimeout(() => setActionMsg(null), 4000);
        }}
      />

      {/* Detailed Case History Modal (FEATURE 2) */}
      {selectedCase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-hospital-100 text-hospital-800 border border-hospital-200">
                  {t('case.modalTitle', 'Hospital Case Summary & Medical Record')}
                </span>
                <h3 className="text-xl font-black text-slate-900 mt-1">
                  {selectedCase.case_number}
                </h3>
              </div>
              <button
                onClick={() => setSelectedCase(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Case Overview Meta */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200/80 text-xs">
              <div>
                <span className="text-slate-400 font-bold uppercase text-[10px] block">{t('common.doctor', 'Doctor')}</span>
                <span className="font-bold text-slate-900 text-sm">{selectedCase.doctor_name}</span>
                <span className="text-[11px] text-slate-500 block">{selectedCase.department_name}</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold uppercase text-[10px] block">{t('common.status', 'Status')}</span>
                <div className="mt-0.5">{getStatusBadge(selectedCase.status)}</div>
              </div>
              <div>
                <span className="text-slate-400 font-bold uppercase text-[10px] block">{t('case.consultDate', 'Date')}</span>
                <span className="font-semibold text-slate-800">
                  {new Date(selectedCase.created_at).toLocaleDateString()}
                </span>
              </div>
              {selectedCase.token_number && (
                <div>
                  <span className="text-slate-400 font-bold uppercase text-[10px] block">{t('common.token', 'Token')}</span>
                  <span className="font-mono font-bold text-hospital-700">{selectedCase.token_number}</span>
                </div>
              )}
              {selectedCase.doctor_room && (
                <div>
                  <span className="text-slate-400 font-bold uppercase text-[10px] block">{t('common.room', 'Room')}</span>
                  <span className="font-semibold text-slate-800">{selectedCase.doctor_room}</span>
                </div>
              )}
              {selectedCase.vitals && (
                <div className="col-span-2 sm:col-span-3 pt-2 border-t border-slate-200">
                  <span className="text-slate-400 font-bold uppercase text-[10px] block mb-0.5">{t('case.vitalsHeading', 'Recorded Vitals')}</span>
                  <span className="font-medium text-slate-800">{selectedCase.vitals}</span>
                </div>
              )}
            </div>

            {/* Symptoms */}
            {selectedCase.symptoms && (
              <div className="space-y-1 text-xs">
                <span className="text-slate-500 font-bold uppercase text-[10px] tracking-wider block">
                  {t('case.symptomsHeading', 'Symptoms / Chief Complaints')}
                </span>
                <div className="bg-amber-50/50 border border-amber-200 p-3.5 rounded-2xl text-slate-800">
                  {selectedCase.symptoms}
                </div>
              </div>
            )}

            {/* Diagnosis */}
            {selectedCase.diagnosis && (
              <div className="space-y-1 text-xs">
                <span className="text-teal-700 font-bold uppercase text-[10px] tracking-wider block">
                  {t('case.diagnosisHeading', 'Doctor Diagnosis')}
                </span>
                <div className="bg-teal-50 border border-teal-200 p-3.5 rounded-2xl text-teal-950 font-semibold">
                  {selectedCase.diagnosis}
                </div>
              </div>
            )}

            {/* Prescription */}
            {selectedCase.prescription && (
              <div className="space-y-1 text-xs">
                <span className="text-hospital-700 font-bold uppercase text-[10px] tracking-wider flex items-center gap-1.5">
                  <Pill className="w-3.5 h-3.5" />
                  {t('case.rxHeading', 'Prescription & Medication Plan')}
                </span>
                <div className="bg-white border border-slate-200 p-3.5 rounded-2xl text-slate-800 whitespace-pre-line font-mono text-[11px] shadow-inner">
                  {selectedCase.prescription}
                </div>
              </div>
            )}

            {/* Clinical Notes / Advice */}
            {selectedCase.clinical_notes && (
              <div className="space-y-1 text-xs">
                <span className="text-slate-500 font-bold uppercase text-[10px] tracking-wider block">
                  {t('case.adviceHeading', 'Clinical Advice & Notes')}
                </span>
                <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl text-slate-700 whitespace-pre-line">
                  {selectedCase.clinical_notes}
                </div>
              </div>
            )}

            {/* Follow-up Date */}
            {selectedCase.follow_up_date && (
              <div className="text-xs bg-hospital-50 p-3 rounded-2xl border border-hospital-200 flex items-center justify-between">
                <span className="font-bold text-hospital-800">{t('case.followUpHeading', 'Follow-up Recommendation')}:</span>
                <span className="font-bold text-hospital-900 bg-white px-2.5 py-1 rounded-lg border border-hospital-200">
                  {selectedCase.follow_up_date}
                </span>
              </div>
            )}

            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <Printer className="w-4 h-4" />
                {t('case.printSummary', 'Print Record')}
              </button>
              <button
                onClick={() => setSelectedCase(null)}
                className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors shadow-sm"
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
