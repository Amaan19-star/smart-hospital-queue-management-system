import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../context/LanguageContext';
import { QueueToken, Doctor, CaseHistory } from '../types';
import { queueApi, doctorsApi, casesApi } from '../services/api';
import { 
  Stethoscope, 
  Users, 
  Play, 
  CheckCircle2, 
  SkipForward, 
  Clock, 
  RefreshCw, 
  AlertCircle, 
  FileText, 
  Phone, 
  MapPin, 
  Activity, 
  Radio,
  Pill,
  Save,
  Calendar,
  History,
  Heart,
  ChevronRight,
  Eye,
  X,
  Printer,
  Menu,
  Tv,
  Globe,
  LogOut,
  Sparkles,
  UserCheck
} from 'lucide-react';

interface DoctorDashboardProps {
  onNavigate?: (view: any) => void;
}

export const DoctorDashboard: React.FC<DoctorDashboardProps> = ({ onNavigate }) => {
  const { user, logout } = useAuth();
  const { t, language, setLanguage, languages } = useTranslation();
  const [doctorProfile, setDoctorProfile] = useState<Doctor | null>(null);
  const [activeToken, setActiveToken] = useState<QueueToken | null>(null);
  const [waitingTokens, setWaitingTokens] = useState<QueueToken[]>([]);
  const [completedTokens, setCompletedTokens] = useState<QueueToken[]>([]);
  
  // Case History Form State for current patient
  const [symptoms, setSymptoms] = useState<string>('');
  const [diagnosis, setDiagnosis] = useState<string>('');
  const [prescription, setPrescription] = useState<string>('');
  const [vitals, setVitals] = useState<string>('');
  const [clinicalNotes, setClinicalNotes] = useState<string>('');
  const [followUpDate, setFollowUpDate] = useState<string>('');

  // Active Patient's Past Case History
  const [patientPastCases, setPatientPastCases] = useState<CaseHistory[]>([]);
  const [showPastCases, setShowPastCases] = useState<boolean>(false);

  // Doctor's Left Side Panel Active View State
  const [activeSidebarTab, setActiveSidebarTab] = useState<'consultation' | 'waiting' | 'cases'>('consultation');
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);

  // All Cases list
  const [doctorCases, setDoctorCases] = useState<CaseHistory[]>([]);
  const [caseFilter, setCaseFilter] = useState<string>('ALL');
  const [selectedCaseModal, setSelectedCaseModal] = useState<CaseHistory | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Timer for active consultation
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  const fetchDoctorData = async () => {
    try {
      const [doc, queueData, docCases] = await Promise.all([
        doctorsApi.getMyProfile(),
        queueApi.getDoctorQueue(),
        casesApi.getMyDoctorCases(caseFilter)
      ]);
      setDoctorProfile(doc);
      setActiveToken(queueData.active_token);
      setWaitingTokens(queueData.waiting);
      setCompletedTokens(queueData.completed);
      setDoctorCases(docCases);
    } catch (err) {
      console.error('Failed to load doctor queue', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctorData();
    const interval = setInterval(fetchDoctorData, 4000);
    return () => clearInterval(interval);
  }, [caseFilter]);

  // When activeToken changes, load existing case history for this patient
  useEffect(() => {
    if (activeToken) {
      casesApi.getPatientCases(activeToken.patient_id).then((cases) => {
        setPatientPastCases(cases.filter(c => c.token_id !== activeToken.id));
        const currentCase = cases.find(c => c.token_id === activeToken.id);
        if (currentCase) {
          setSymptoms(currentCase.symptoms || '');
          setDiagnosis(currentCase.diagnosis || '');
          setPrescription(currentCase.prescription || '');
          setVitals(currentCase.vitals || '');
          setClinicalNotes(currentCase.clinical_notes || '');
          setFollowUpDate(currentCase.follow_up_date || '');
        }
      }).catch(console.error);
    } else {
      setSymptoms('');
      setDiagnosis('');
      setPrescription('');
      setVitals('');
      setClinicalNotes('');
      setFollowUpDate('');
      setPatientPastCases([]);
    }
  }, [activeToken?.id]);

  // Timer effect
  useEffect(() => {
    let timer: any = null;
    if (activeToken && activeToken.status === 'IN_CONSULTATION') {
      timer = setInterval(() => {
        setElapsedSeconds(prev => prev + 1);
      }, 1000);
    } else {
      setElapsedSeconds(0);
    }
    return () => clearInterval(timer);
  }, [activeToken?.status]);

  const handleCallNext = async () => {
    setActionLoading(true);
    setMessage(null);
    try {
      const token = await queueApi.callNext();
      if (!token) {
        setMessage({ type: 'error', text: t('doctor.noWaiting', 'No patients currently in the waiting queue.') });
      } else {
        setMessage({ type: 'success', text: `Called token ${token.token_number} - ${token.patient_name}` });
        setActiveSidebarTab('consultation');
        fetchDoctorData();
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.detail || 'Failed to call next patient.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveDraftCase = async () => {
    if (!activeToken) return;
    setActionLoading(true);
    setMessage(null);
    try {
      await queueApi.action(activeToken.id, 'START', clinicalNotes, {
        symptoms,
        diagnosis,
        prescription,
        vitals,
        follow_up_date: followUpDate
      });
      setMessage({ type: 'success', text: 'Case history draft saved successfully (In-Progress)!' });
      fetchDoctorData();
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.detail || 'Failed to save case history.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCompleteConsultation = async () => {
    if (!activeToken) return;
    setActionLoading(true);
    setMessage(null);
    try {
      await queueApi.action(activeToken.id, 'COMPLETE', clinicalNotes, {
        symptoms,
        diagnosis,
        prescription,
        vitals,
        follow_up_date: followUpDate
      });
      setMessage({ type: 'success', text: `Consultation completed and Case History saved for ${activeToken.patient_name}!` });
      fetchDoctorData();
      setTimeout(() => setMessage(null), 4000);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.detail || 'Failed to complete consultation.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSkipToken = async () => {
    if (!activeToken) return;
    if (!window.confirm('Are you sure you want to skip this patient token?')) return;
    setActionLoading(true);
    try {
      await queueApi.action(activeToken.id, 'SKIP', 'Patient skipped/absent when called');
      setMessage({ type: 'success', text: `Token ${activeToken.token_number} skipped.` });
      fetchDoctorData();
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      setMessage({ type: 'error', text: 'Failed to skip token.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!doctorProfile) return;
    try {
      const updated = await doctorsApi.updateStatus(doctorProfile.id, { current_status: newStatus });
      setDoctorProfile(updated);
      setMessage({ type: 'success', text: `Doctor status updated to ${newStatus}` });
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to update status.' });
    }
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">{t('status.completed', 'Completed')}</span>;
      case 'IN_PROGRESS':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200 animate-pulse">{t('status.in_progress', 'In Progress')}</span>;
      case 'PENDING':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200">{t('status.pending', 'Pending')}</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">{status}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row">
      {/* MOBILE HEADER TOGGLE */}
      <div className="lg:hidden bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-16 z-30 shadow-xs">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100"
        >
          <Menu className="w-4 h-4 text-teal-600" />
          <span>Doctor Menu</span>
        </button>
        <span className="text-xs font-bold text-slate-800">
          {activeSidebarTab === 'consultation' ? t('doctor.title', 'Consultation Desk') :
           activeSidebarTab === 'waiting' ? t('doctor.waitingQueue', 'Waiting Queue') : t('doctor.myConsultedCases', 'Case History')}
        </span>
      </div>

      {/* LEFT SIDE PANEL (DESIGNED SIDEBAR) */}
      <aside className={`
        fixed lg:sticky top-16 lg:top-0 h-[calc(100vh-4rem)] z-40 w-72 bg-white border-r border-slate-200/80 shadow-lg lg:shadow-none flex flex-col justify-between transition-transform duration-300
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Top Profile & Header inside Sidebar */}
        <div className="p-5 space-y-5 overflow-y-auto">
          {/* Doctor Profile Card */}
          <div className="bg-gradient-to-br from-teal-50 via-hospital-50/30 to-white rounded-2xl p-4 border border-teal-100 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-teal-600 to-emerald-500 text-white font-black text-base flex items-center justify-center shadow-md shadow-teal-500/20">
                <Stethoscope className="w-6 h-6" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-teal-800 block">
                  {doctorProfile?.department_name || 'Medical Specialist'}
                </span>
                <h4 className="text-sm font-bold text-slate-900 truncate">
                  {user?.full_name}
                </h4>
                <span className="text-[10px] text-teal-700 font-semibold block">
                  {doctorProfile?.room_number || 'Room 101'}
                </span>
              </div>
            </div>

            {/* Doctor Status Selector */}
            <div className="mt-3 pt-3 border-t border-teal-100 flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase text-slate-400">Status:</span>
              <select
                value={doctorProfile?.current_status || 'Available'}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="text-[11px] font-bold rounded-lg px-2 py-0.5 border border-slate-200 bg-white text-slate-800 focus:outline-none"
              >
                <option value="Available">🟢 Available</option>
                <option value="In Consultation">🟡 In Consultation</option>
                <option value="Break">☕ On Break</option>
                <option value="Offline">⚪ Offline</option>
              </select>
            </div>
          </div>

          {/* Primary Quick CTA: Call Next Patient */}
          <button
            onClick={() => {
              handleCallNext();
              setSidebarOpen(false);
            }}
            disabled={actionLoading || waitingTokens.length === 0}
            className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-xs shadow-md transition-all ${
              waitingTokens.length > 0
                ? 'bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white shadow-teal-500/20 hover:scale-[1.02]'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
            }`}
          >
            <Play className="w-4 h-4 fill-current" />
            <span>{t('doctor.callNextBtn', 'Call Next Patient')}</span>
            <span className="bg-white/20 text-white px-2 py-0.5 rounded-full text-[10px] font-mono font-bold">
              {waitingTokens.length}
            </span>
          </button>

          {/* Navigation Items (Left Side Panel) */}
          <div className="space-y-1 pt-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 block mb-2">
              Chamber Features
            </span>

            {/* 1. Consultation Desk */}
            <button
              onClick={() => { setActiveSidebarTab('consultation'); setSidebarOpen(false); }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeSidebarTab === 'consultation'
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Stethoscope className="w-4 h-4" />
                <span>{t('doctor.title', 'Consultation Desk')}</span>
              </div>
              {activeToken && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                  activeSidebarTab === 'consultation' ? 'bg-white text-teal-800' : 'bg-emerald-100 text-emerald-800 animate-pulse'
                }`}>
                  {activeToken.token_number}
                </span>
              )}
            </button>

            {/* 2. Waiting Patients Queue */}
            <button
              onClick={() => { setActiveSidebarTab('waiting'); setSidebarOpen(false); }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeSidebarTab === 'waiting'
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Users className="w-4 h-4" />
                <span>{t('doctor.waitingQueue', 'Waiting Queue')}</span>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                activeSidebarTab === 'waiting' ? 'bg-white text-teal-800' : 'bg-amber-100 text-amber-800'
              }`}>
                {waitingTokens.length}
              </span>
            </button>

            {/* 3. All Consulted Cases (FEATURE 2) */}
            <button
              onClick={() => { setActiveSidebarTab('cases'); setSidebarOpen(false); }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeSidebarTab === 'cases'
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <FileText className="w-4 h-4" />
                <span>{t('doctor.myConsultedCases', 'All Consulted Cases')}</span>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                activeSidebarTab === 'cases' ? 'bg-white text-teal-800' : 'bg-teal-100 text-teal-800'
              }`}>
                {doctorCases.length}
              </span>
            </button>
          </div>

          {/* Live Queue Display Shortcut */}
          <div className="pt-2 border-t border-slate-100">
            <button
              onClick={() => (onNavigate ? onNavigate('board') : (window.location.hash = '#board'))}
              className="w-full flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold text-hospital-700 bg-hospital-50/70 hover:bg-hospital-100 transition-colors border border-hospital-100"
            >
              <Tv className="w-4 h-4 text-hospital-600" />
              <span>{t('nav.liveQueueBoard', 'Live Queue Display')}</span>
            </button>
          </div>
        </div>

        {/* Bottom Sidebar Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50/60 space-y-3">
          {/* Quick Language Pill inside Sidebar */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1">
              <Globe className="w-3.5 h-3.5 text-teal-600" />
              {t('common.language', 'Language')}:
            </span>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as any)}
              className="px-2 py-1 text-xs font-bold rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-teal-500"
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
        {/* Doctor Header Banner with Realistic Clinic Photography */}
        <div 
          className="relative rounded-3xl p-6 sm:p-8 shadow-md border border-slate-200/60 overflow-hidden flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-white bg-cover bg-center"
          style={{
            backgroundImage: `url('/images/hospital-doctor-office.jpg')`,
            backgroundColor: '#042f2e'
          }}
        >
          {/* Deep Teal & Slate Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-teal-950/92 via-slate-900/85 to-hospital-950/80 backdrop-blur-[1px]" />

          <div className="relative z-10 max-w-xl">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-teal-400/20 text-teal-200 border border-teal-300/30">
                {t('nav.doctorPortal', 'Doctor Consultation Desk')}
              </span>
              <span className="text-xs text-teal-100/70 font-semibold">
                {doctorProfile?.department_name} • {doctorProfile?.room_number}
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse ml-1" />
              <span className="text-[11px] text-emerald-300 font-semibold">OPD Chamber Ready</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight drop-shadow-sm">
              {user?.full_name}
            </h1>
            <p className="text-xs sm:text-sm text-teal-100/90 mt-1 drop-shadow">
              {doctorProfile?.specialization} • Fee: ${doctorProfile?.consultation_fee} • Avg Consultation: ~{doctorProfile?.avg_consultation_time} mins
            </p>
          </div>

          <div className="relative z-10 flex items-center gap-2.5">
            <button
              onClick={handleCallNext}
              disabled={actionLoading || waitingTokens.length === 0}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs shadow-md transition-all ${
                waitingTokens.length > 0
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-emerald-500/20 hover:scale-105'
                  : 'bg-white/20 text-slate-300 cursor-not-allowed shadow-none'
              }`}
            >
              <Play className="w-3.5 h-3.5 inline mr-1.5 fill-current" />
              <span>Call Next ({waitingTokens.length})</span>
            </button>
            <button
              onClick={fetchDoctorData}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/30 text-white transition-colors"
              title={t('common.refresh', 'Refresh')}
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Action Notification */}
        {message && (
          <div className={`p-4 rounded-2xl flex items-center gap-3 text-xs font-semibold border ${
            message.type === 'success' 
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}>
            {message.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <AlertCircle className="w-5 h-5 text-rose-600" />}
            <span>{message.text}</span>
          </div>
        )}

        {/* VIEW 1: ACTIVE CONSULTATION ROOM */}
        {activeSidebarTab === 'consultation' && (
          <div className="space-y-6">
            {activeToken ? (
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
                {/* Active Patient Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 border-b border-slate-100 gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-hospital-600 to-teal-500 text-white font-mono font-black text-xl flex items-center justify-center shadow-lg shadow-hospital-500/20">
                      {activeToken.token_number}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          activeToken.status === 'IN_CONSULTATION'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200 animate-pulse'
                            : 'bg-amber-100 text-amber-800 border border-amber-200'
                        }`}>
                          {activeToken.status === 'IN_CONSULTATION' ? t('doctor.inConsultation', 'Active Consultation') : t('status.called', 'Called - Waiting Entry')}
                        </span>
                        {activeToken.priority === 1 && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-100 text-rose-700">
                            Emergency
                          </span>
                        )}
                      </div>
                      <h2 className="text-xl font-bold text-slate-900 mt-1">
                        {activeToken.patient_name}
                      </h2>
                      <p className="text-xs text-slate-400">
                        Token ID: #{activeToken.id} • Sequence #{activeToken.raw_sequence}
                      </p>
                    </div>
                  </div>

                  {/* Consultation Timer */}
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {t('doctor.consultationTimer', 'Consultation Time')}
                    </span>
                    <span className="font-mono text-2xl font-black text-teal-700 flex items-center gap-1.5">
                      <Clock className="w-5 h-5 text-teal-600 stroke-[2.5]" />
                      {formatTimer(elapsedSeconds)}
                    </span>
                  </div>
                </div>

                {/* Patient Past Medical History Drawer / Accordion */}
                {patientPastCases.length > 0 && (
                  <div className="bg-hospital-50/50 rounded-2xl border border-hospital-200/80 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-bold text-hospital-900">
                        <History className="w-4 h-4 text-hospital-600" />
                        <span>{t('doctor.patientPastHistory', 'Patient Medical History')} ({patientPastCases.length} past records)</span>
                      </div>
                      <button
                        onClick={() => setShowPastCases(!showPastCases)}
                        className="text-xs font-bold text-hospital-600 hover:text-hospital-800 hover:underline"
                      >
                        {showPastCases ? 'Hide History' : 'Show History'}
                      </button>
                    </div>

                    {showPastCases && (
                      <div className="space-y-2 pt-2 border-t border-hospital-100 max-h-48 overflow-y-auto">
                        {patientPastCases.map((pc) => (
                          <div key={pc.id} className="bg-white p-3 rounded-xl border border-hospital-100 text-xs flex items-center justify-between">
                            <div>
                              <span className="font-mono font-bold text-slate-700">{pc.case_number}</span>
                              <span className="text-slate-400 mx-2">•</span>
                              <span className="text-slate-600 font-medium">{pc.department_name} ({new Date(pc.created_at).toLocaleDateString()})</span>
                              {pc.diagnosis && (
                                <p className="text-[11px] text-teal-700 font-semibold mt-0.5">Dx: {pc.diagnosis}</p>
                              )}
                            </div>
                            <button
                              onClick={() => setSelectedCaseModal(pc)}
                              className="text-hospital-600 hover:text-hospital-800 font-bold"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* CLINICAL CASE HISTORY ENTRY FORM */}
                <div className="space-y-4 pt-2">
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-100 pb-2">
                    <FileText className="w-4 h-4 text-teal-600" />
                    Clinical Case History & Prescription (Saved to Patient Record)
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Symptoms / Chief Complaints */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                        {t('doctor.chiefComplaints', 'Chief Complaints / Symptoms')}
                      </label>
                      <input
                        type="text"
                        value={symptoms}
                        onChange={(e) => setSymptoms(e.target.value)}
                        placeholder="e.g., Severe chest pain, shortness of breath, dizziness"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-hospital-500 bg-slate-50/50"
                      />
                    </div>

                    {/* Vitals */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                        {t('doctor.vitals', 'Patient Vitals')}
                      </label>
                      <input
                        type="text"
                        value={vitals}
                        onChange={(e) => setVitals(e.target.value)}
                        placeholder="e.g., BP: 120/80 mmHg, Pulse: 76 bpm, SpO2: 98%"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-hospital-500 bg-slate-50/50"
                      />
                    </div>

                    {/* Clinical Diagnosis */}
                    <div className="sm:col-span-2 space-y-1">
                      <label className="text-[11px] font-bold text-teal-800 uppercase tracking-wider block">
                        {t('doctor.clinicalDiagnosis', 'Clinical Diagnosis')} *
                      </label>
                      <input
                        type="text"
                        value={diagnosis}
                        onChange={(e) => setDiagnosis(e.target.value)}
                        placeholder="e.g., Acute Bronchitis / Stage 1 Essential Hypertension"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-teal-200 text-xs text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500 bg-teal-50/20"
                      />
                    </div>

                    {/* Prescription & Dosage */}
                    <div className="sm:col-span-2 space-y-1">
                      <label className="text-[11px] font-bold text-hospital-800 uppercase tracking-wider flex items-center gap-1.5">
                        <Pill className="w-3.5 h-3.5" />
                        {t('doctor.rxPrescription', 'Prescription & Medication Plan')}
                      </label>
                      <textarea
                        rows={3}
                        value={prescription}
                        onChange={(e) => setPrescription(e.target.value)}
                        placeholder={"1. Tab Amoxicillin 500mg (1 TID x 5 days)\n2. Tab Paracetamol 650mg SOS\n3. Saline nasal spray"}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-hospital-500 bg-slate-50/50"
                      />
                    </div>

                    {/* Doctor Clinical Notes */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                        {t('doctor.clinicalNotes', 'Doctor Clinical Notes / Investigations')}
                      </label>
                      <textarea
                        rows={2}
                        value={clinicalNotes}
                        onChange={(e) => setClinicalNotes(e.target.value)}
                        placeholder="Internal observations, advised lab tests, ECG normal..."
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-hospital-500 bg-slate-50/50"
                      />
                    </div>

                    {/* Follow-up Date */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                        {t('doctor.followUpDate', 'Follow-Up Date')}
                      </label>
                      <input
                        type="date"
                        value={followUpDate}
                        onChange={(e) => setFollowUpDate(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-hospital-500 bg-slate-50/50"
                      />
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                    <button
                      onClick={handleSkipToken}
                      disabled={actionLoading}
                      className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold flex items-center gap-1.5 transition-colors"
                    >
                      <SkipForward className="w-4 h-4" />
                      {t('doctor.skipPatient', 'Skip Token')}
                    </button>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={handleSaveDraftCase}
                        disabled={actionLoading}
                        className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
                      >
                        <Save className="w-4 h-4 text-hospital-600" />
                        {t('doctor.saveDraftCase', 'Save Case (In-Progress)')}
                      </button>

                      <button
                        onClick={handleCompleteConsultation}
                        disabled={actionLoading}
                        className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-emerald-500/20 transition-all hover:scale-[1.02]"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        {t('doctor.completeConsultation', 'Complete Consultation & Save Record')}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center space-y-4 shadow-xs">
                <div className="w-16 h-16 rounded-3xl bg-teal-50 border border-teal-100 flex items-center justify-center mx-auto text-teal-600">
                  <Stethoscope className="w-8 h-8 stroke-[1.5]" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    {t('doctor.noActivePatient', 'No active patient in consultation.')}
                  </h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                    {waitingTokens.length > 0
                      ? t('doctor.clickCallNext', 'Click "Call Next Patient" from the waiting queue to begin.')
                      : t('doctor.noWaiting', 'No patients currently waiting in queue.')}
                  </p>
                </div>

                {waitingTokens.length > 0 && (
                  <button
                    onClick={handleCallNext}
                    disabled={actionLoading}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 text-white text-xs font-bold shadow-md hover:scale-105 transition-all"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    {t('doctor.callNextBtn', 'Call Next Patient')} ({waitingTokens[0].token_number})
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* VIEW 2: WAITING PATIENTS QUEUE */}
        {activeSidebarTab === 'waiting' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-hospital-600" />
                {t('doctor.waitingQueue', 'Waiting Patients Queue')} ({waitingTokens.length})
              </h2>
            </div>

            {waitingTokens.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 text-slate-400 text-xs">
                {t('doctor.noWaiting', 'No patients waiting in queue.')}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {waitingTokens.map((tok, idx) => (
                  <div
                    key={tok.id}
                    className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between hover:border-teal-300 transition-colors"
                  >
                    <div className="flex items-center gap-3.5">
                      <span className="w-8 h-8 rounded-xl bg-slate-100 text-slate-800 text-xs font-bold flex items-center justify-center font-mono">
                        #{idx + 1}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-hospital-700 text-sm">
                            {tok.token_number}
                          </span>
                          {tok.priority === 1 && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-100 text-rose-700">
                              Emergency
                            </span>
                          )}
                        </div>
                        <h4 className="font-bold text-slate-900 text-sm mt-0.5">
                          {tok.patient_name}
                        </h4>
                        <span className="text-[11px] text-slate-400">
                          Wait Time: ~{tok.estimated_wait_minutes} mins
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={handleCallNext}
                      className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" /> Call
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* VIEW 3: ALL CONSULTED CASES */}
        {activeSidebarTab === 'cases' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center gap-1.5 text-xs">
                <span className="font-bold text-slate-500 uppercase text-[11px] mr-2">{t('common.filter', 'Filter')}:</span>
                {['ALL', 'COMPLETED', 'IN_PROGRESS', 'PENDING'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setCaseFilter(st)}
                    className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all ${
                      caseFilter === st
                        ? 'bg-teal-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {st === 'ALL' ? t('common.all', 'All') : t(`status.${st.toLowerCase()}`, st)}
                  </button>
                ))}
              </div>

              <span className="text-xs text-slate-400 font-medium">
                {doctorCases.length} {t('nav.caseHistory', 'Case Records')}
              </span>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
              {doctorCases.length === 0 ? (
                <div className="p-12 text-center text-slate-400 text-xs">
                  No case history records found under this filter.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                      <tr>
                        <th className="py-3 px-4">Case #</th>
                        <th className="py-3 px-4">Patient</th>
                        <th className="py-3 px-4">Token #</th>
                        <th className="py-3 px-4">Diagnosis</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {doctorCases.map((c) => (
                        <tr key={c.id} className="hover:bg-slate-50/60">
                          <td className="py-3 px-4 font-mono font-bold text-hospital-700">{c.case_number}</td>
                          <td className="py-3 px-4 font-medium text-slate-900">{c.patient_name}</td>
                          <td className="py-3 px-4 font-mono text-slate-600">{c.token_number || 'Walk-in'}</td>
                          <td className="py-3 px-4 text-slate-700 font-medium">{c.diagnosis || 'Under Evaluation'}</td>
                          <td className="py-3 px-4">{getStatusBadge(c.status)}</td>
                          <td className="py-3 px-4 text-slate-500">{new Date(c.created_at).toLocaleDateString()}</td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => setSelectedCaseModal(c)}
                              className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-teal-50 text-teal-700 font-bold hover:bg-teal-100 transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5" /> View
                            </button>
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
      </main>

      {/* Case Details Modal */}
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
              </div>
              <div>
                <span className="text-slate-400 font-bold uppercase text-[10px] block">{t('common.status', 'Status')}</span>
                <div className="mt-0.5">{getStatusBadge(selectedCaseModal.status)}</div>
              </div>
              <div>
                <span className="text-slate-400 font-bold uppercase text-[10px] block">{t('case.consultDate', 'Date')}</span>
                <span className="font-semibold text-slate-800">{new Date(selectedCaseModal.created_at).toLocaleDateString()}</span>
              </div>
              {selectedCaseModal.vitals && (
                <div className="col-span-2 sm:col-span-3 pt-2 border-t border-slate-200">
                  <span className="text-slate-400 font-bold uppercase text-[10px] block mb-0.5">{t('case.vitalsHeading', 'Recorded Vitals')}</span>
                  <span className="font-medium text-slate-800">{selectedCaseModal.vitals}</span>
                </div>
              )}
            </div>

            {selectedCaseModal.symptoms && (
              <div className="space-y-1 text-xs">
                <span className="text-slate-500 font-bold uppercase text-[10px] tracking-wider block">{t('case.symptomsHeading', 'Symptoms')}</span>
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
                  <Pill className="w-3.5 h-3.5" /> {t('case.rxHeading', 'Prescription')}
                </span>
                <div className="bg-white border border-slate-200 p-3.5 rounded-2xl text-slate-800 whitespace-pre-line font-mono text-[11px] shadow-inner">
                  {selectedCaseModal.prescription}
                </div>
              </div>
            )}

            {selectedCaseModal.clinical_notes && (
              <div className="space-y-1 text-xs">
                <span className="text-slate-500 font-bold uppercase text-[10px] tracking-wider block">{t('case.adviceHeading', 'Clinical Advice')}</span>
                <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl text-slate-700 whitespace-pre-line">{selectedCaseModal.clinical_notes}</div>
              </div>
            )}

            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <Printer className="w-4 h-4" /> {t('case.printSummary', 'Print')}
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
