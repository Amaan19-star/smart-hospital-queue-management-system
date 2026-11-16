import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider, useTranslation } from './context/LanguageContext';
import { Navbar } from './components/Navbar';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { PatientDashboard } from './pages/PatientDashboard';
import { DoctorDashboard } from './pages/DoctorDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { LiveQueueBoard } from './components/LiveQueueBoard';
import { Activity, ShieldCheck, HeartPulse, Stethoscope, Tv } from 'lucide-react';

const AppContent: React.FC = () => {
  const { user, role, isLoading } = useAuth();
  const [view, setView] = useState<string>('default');

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-hospital-600 flex items-center justify-center text-white animate-bounce shadow-lg shadow-hospital-500/20">
            <Activity className="w-6 h-6 stroke-[2.5]" />
          </div>
          <span className="text-sm font-bold text-slate-700">Loading Smart Hospital System...</span>
        </div>
      </div>
    );
  }

  // Determine current active page with strict role-based access control
  let currentActive = view;
  if (!user) {
    if (view === 'register') {
      currentActive = 'register';
    } else if (view === 'board') {
      currentActive = 'board';
    } else {
      currentActive = 'login';
    }
  } else {
    if (view === 'board') {
      currentActive = 'board';
    } else {
      // Authenticated users are strictly routed to their verified database role dashboard
      currentActive = role || 'patient';
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between selection:bg-hospital-100 selection:text-hospital-800">
      <Navbar currentView={currentActive} onNavigate={(v) => setView(v)} />

      <main className="flex-1">
        {currentActive === 'board' ? (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <LiveQueueBoard />
          </div>
        ) : !user ? (
          currentActive === 'register' ? (
            <Register onNavigate={(v) => setView(v)} />
          ) : (
            <Login onNavigate={(v) => setView(v)} />
          )
        ) : (
          <>
            {role === 'admin' && <AdminDashboard onNavigate={(v) => setView(v)} />}
            {role === 'doctor' && <DoctorDashboard onNavigate={(v) => setView(v)} />}
            {role === 'patient' && <PatientDashboard onNavigate={(v) => setView(v)} />}
          </>
        )}
      </main>

      {/* Hospital Footer */}
      <footer className="bg-white border-t border-slate-200 mt-12 py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-hospital-600" />
            <span className="font-bold text-slate-700">Smart Hospital Queue Management System</span>
            <span>• Full-Stack FastAPI + React + TypeScript</span>
          </div>

          <div className="flex items-center gap-4 text-[11px] font-medium">
            <button
              onClick={() => setView('board')}
              className="text-hospital-600 hover:text-hospital-800 hover:underline flex items-center gap-1"
            >
              <Tv className="w-3.5 h-3.5" /> Public Queue Display
            </button>
            <span>•</span>
            <span className="text-emerald-600 font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> System Operational
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </LanguageProvider>
  );
}
