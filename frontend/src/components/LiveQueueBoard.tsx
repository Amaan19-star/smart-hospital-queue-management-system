import React, { useEffect, useState } from 'react';
import { queueApi } from '../services/api';
import { LiveQueueDoctorSummary } from '../types';
import { useTranslation } from '../context/LanguageContext';
import { 
  Tv, 
  RefreshCw, 
  Stethoscope, 
  MapPin, 
  Users, 
  Radio, 
  Activity, 
  Clock, 
  ArrowRight 
} from 'lucide-react';

export const LiveQueueBoard: React.FC = () => {
  const { t } = useTranslation();
  const [board, setBoard] = useState<LiveQueueDoctorSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  const fetchBoard = async () => {
    try {
      const data = await queueApi.getBoard();
      setBoard(data);
      setLastUpdated(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch (err) {
      console.error('Failed to load queue board', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBoard();
    // Auto refresh every 5 seconds for live queue tracking
    const interval = setInterval(fetchBoard, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      {/* Header bar with realistic waiting lounge photography */}
      <div 
        className="relative rounded-3xl p-6 sm:p-8 shadow-md border border-slate-200/60 overflow-hidden flex flex-wrap items-center justify-between gap-4 text-white bg-cover bg-center"
        style={{
          backgroundImage: `url('/images/hospital-waiting-lounge.jpg')`,
          backgroundColor: '#0f172a'
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/92 via-hospital-950/85 to-teal-950/80 backdrop-blur-[1px]" />

        <div className="relative z-10 flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-hospital-600 to-teal-500 flex items-center justify-center text-white shadow-xl shadow-teal-500/20 border border-white/20">
            <Tv className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight drop-shadow-sm">
                Hospital OPD Live Queue Display
              </h2>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 backdrop-blur-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" /> LIVE SYNC
              </span>
            </div>
            <p className="text-xs sm:text-sm text-teal-100/90 mt-0.5 drop-shadow">
              Real-time consultation status across all hospital departments & consultation rooms
            </p>
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <span className="text-[11px] text-teal-200/80 block font-medium">Auto-refresh every 5s</span>
            <span className="text-xs font-bold text-white font-mono">{lastUpdated || 'Connecting...'}</span>
          </div>
          <button
            onClick={fetchBoard}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-white/20 hover:bg-white/30 border border-white/30 backdrop-blur-sm transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-teal-300' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      {/* Grid of Doctor Consultation Rooms */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {board.map((item) => (
          <div
            key={item.doctor_id}
            className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between hover:border-hospital-300 transition-all"
          >
            {/* Top Department & Room Banner */}
            <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-hospital-50/40">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-hospital-700 bg-hospital-100/70 px-2.5 py-0.5 rounded-full">
                  {item.department_name}
                </span>
                <span className="flex items-center gap-1 text-xs font-bold text-slate-600 bg-white px-2.5 py-1 rounded-md border border-slate-200 shadow-2xs">
                  <MapPin className="w-3.5 h-3.5 text-teal-600" />
                  {item.room_number}
                </span>
              </div>

              <div className="mt-3">
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <Stethoscope className="w-4 h-4 text-hospital-600" />
                  {item.doctor_name}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`w-2 h-2 rounded-full ${
                    item.current_status === 'In Consultation' ? 'bg-amber-500' :
                    item.current_status === 'Available' ? 'bg-emerald-500' : 'bg-slate-400'
                  }`} />
                  <span className="text-xs text-slate-500 font-medium">{item.current_status}</span>
                </div>
              </div>
            </div>

            {/* Serving Token Banner */}
            <div className="p-5 text-center bg-white">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                {t('board.nowServing', 'NOW SERVING')}
              </span>
              <div className="inline-block px-6 py-2 rounded-xl bg-hospital-600 text-white font-mono font-black text-3xl sm:text-4xl shadow-md shadow-hospital-500/20">
                {item.current_token || 'None'}
              </div>
            </div>

            {/* Waiting Queue List */}
            <div className="p-4 bg-slate-50 border-t border-slate-100">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                <span className="font-semibold flex items-center gap-1 text-slate-700">
                  <Users className="w-3.5 h-3.5 text-teal-600" /> {t('board.waiting', 'Waiting')}: {item.waiting_count}
                </span>
                <span className="text-[11px] text-slate-400">{t('board.nextInQueue', 'Next In Line')}</span>
              </div>

              {item.next_tokens && item.next_tokens.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {item.next_tokens.map((tok, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-md bg-white border border-slate-200 text-xs font-mono font-bold text-slate-700 shadow-2xs"
                    >
                      {tok}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">No patients currently in waiting queue</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
