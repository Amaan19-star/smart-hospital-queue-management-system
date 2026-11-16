import React from 'react';
import { QueueToken } from '../types';
import { useTranslation } from '../context/LanguageContext';
import {
  Ticket,
  Clock,
  Users,
  MapPin,
  Stethoscope,
  Building2,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Radio
} from 'lucide-react';

interface DigitalTokenCardProps {
  token: QueueToken;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export const DigitalTokenCard: React.FC<DigitalTokenCardProps> = ({
  token,
  onRefresh,
  isRefreshing = false
}) => {
  const { t } = useTranslation();
  const getStatusBadge = () => {
    switch (token.status) {
      case 'IN_CONSULTATION':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
            <Radio className="w-3.5 h-3.5 text-amber-600" /> In Consultation Now
          </span>
        );
      case 'CALLED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 animate-bounce">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> You Are Called! Proceed to Room
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-slate-500" /> Consultation Completed
          </span>
        );
      case 'SKIPPED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
            <AlertCircle className="w-3.5 h-3.5 text-rose-600" /> Token Missed / Skipped
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-hospital-100 text-hospital-800 border border-hospital-300">
            <Clock className="w-3.5 h-3.5 text-hospital-600" /> In Queue (Waiting)
          </span>
        );
    }
  };

  const steps = [
    { label: 'Token Issued', done: true },
    { label: 'In Waiting Queue', done: token.status !== 'CANCELLED' },
    { label: 'Called', done: ['CALLED', 'IN_CONSULTATION', 'COMPLETED'].includes(token.status) },
    { label: 'Consultation', done: ['IN_CONSULTATION', 'COMPLETED'].includes(token.status) },
    { label: 'Completed', done: token.status === 'COMPLETED' },
  ];

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-hospital-900 via-hospital-800 to-teal-900 text-white shadow-xl border border-hospital-700 p-6 sm:p-8">
      {/* Background graphic elements */}
      <div className="absolute -right-12 -top-12 w-48 h-48 rounded-full bg-white/5 blur-2xl pointer-events-none" />
      <div className="absolute right-8 bottom-4 opacity-10 pointer-events-none">
        <Ticket className="w-48 h-48" />
      </div>

      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
            <Ticket className="w-5 h-5 text-teal-300" />
          </div>
          <div>
            <h3 className="text-sm font-semibold tracking-wide uppercase text-teal-300">
              Live Digital Token
            </h3>
            <p className="text-xs text-hospital-200">
              Assigned to: {token.patient_name}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {getStatusBadge()}
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              title="Refresh Queue Status"
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors border border-white/10 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {/* Main Token Display Area */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-6 items-center">
        {/* Token Number Card */}
        <div className="md:col-span-1 bg-white/10 backdrop-blur-md rounded-xl p-5 border border-white/15 text-center shadow-inner">
          <span className="text-xs font-bold uppercase tracking-wider text-teal-200">
            Your Token Number
          </span>
          <div className="text-4xl sm:text-5xl font-black tracking-tight text-white my-2 font-mono drop-shadow-md">
            {token.token_number}
          </div>
          <div className="text-xs font-medium text-hospital-200 flex items-center justify-center gap-1">
            <Clock className="w-3.5 h-3.5" /> Issued: {new Date(token.issue_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>

        {/* Doctor & Dept Info */}
        <div className="md:col-span-2 space-y-3">
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2 bg-white/5 px-3 py-2 rounded-lg border border-white/10">
              <Stethoscope className="w-4 h-4 text-teal-300" />
              <div>
                <span className="text-[10px] uppercase text-hospital-300 block">Consulting Doctor</span>
                <span className="font-bold text-white">{token.doctor_name}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-white/5 px-3 py-2 rounded-lg border border-white/10">
              <Building2 className="w-4 h-4 text-teal-300" />
              <div>
                <span className="text-[10px] uppercase text-hospital-300 block">Department</span>
                <span className="font-semibold text-white">{token.department_name}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-teal-500/20 px-3 py-2 rounded-lg border border-teal-400/30">
              <MapPin className="w-4 h-4 text-teal-300" />
              <div>
                <span className="text-[10px] uppercase text-teal-200 block">Room Location</span>
                <span className="font-bold text-teal-100">{token.doctor_room}</span>
              </div>
            </div>
          </div>

          {/* Real-Time Queue Metrics */}
          <div className="grid grid-cols-3 gap-3 pt-2">
            <div className="bg-white/10 rounded-xl p-3 border border-white/10 text-center">
              <span className="text-[11px] text-hospital-200 block">{t('patient.queuePosition', 'Queue Position')}</span>
              <span className="text-xl sm:text-2xl font-black text-amber-300">
                {token.status === 'CALLED' || token.status === 'IN_CONSULTATION' ? 'Now' : `#${token.position}`}
              </span>
            </div>

            <div className="bg-white/10 rounded-xl p-3 border border-white/10 text-center">
              <span className="text-[11px] text-hospital-200 block">{t('patient.patientsAhead', 'Patients Ahead')}</span>
              <span className="text-xl sm:text-2xl font-black text-white">
                {token.patients_ahead}
              </span>
            </div>

            <div className="bg-white/10 rounded-xl p-3 border border-white/10 text-center">
              <span className="text-[11px] text-hospital-200 block">{t('patient.estimatedWait', 'Est. Waiting Time')}</span>
              <span className="text-xl sm:text-2xl font-black text-teal-300">
                {token.status === 'CALLED' ? '0 min' : `~${token.estimated_wait_minutes} min`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Serving Now Footer & Progress */}
      <div className="border-t border-white/10 pt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 bg-white/10 px-3.5 py-1.5 rounded-full border border-white/15">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
          <span className="text-xs text-hospital-100 font-medium">
            Doctor Serving Now:
          </span>
          <span className="text-xs font-black tracking-wider text-emerald-300 font-mono">
            {token.current_serving_token || 'None'}
          </span>
        </div>

        {/* Status progress bar */}
        <div className="flex items-center gap-1 sm:gap-2 text-[11px]">
          {steps.map((s, idx) => (
            <React.Fragment key={idx}>
              <div className="flex items-center gap-1">
                <span className={`w-2 h-2 rounded-full ${s.done ? 'bg-teal-400' : 'bg-white/30'}`} />
                <span className={s.done ? 'text-teal-200 font-semibold' : 'text-hospital-300'}>
                  {s.label}
                </span>
              </div>
              {idx < steps.length - 1 && <span className="text-white/20">→</span>}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
};
