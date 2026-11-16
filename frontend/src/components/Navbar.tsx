import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../context/LanguageContext';
import { 
  Building2, 
  User as UserIcon, 
  LogOut, 
  Activity, 
  Tv, 
  ShieldCheck, 
  Stethoscope, 
  HeartPulse,
  Globe,
  ChevronDown
} from 'lucide-react';

interface NavbarProps {
  currentView: string;
  onNavigate: (view: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentView, onNavigate }) => {
  const { user, role, logout } = useAuth();
  const { language, setLanguage, languages, currentLanguageOption, t } = useTranslation();
  const [langMenuOpen, setLangMenuOpen] = useState(false);

  const getRoleBadge = () => {
    if (role === 'admin') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-700 border border-purple-200">
          <ShieldCheck className="w-3.5 h-3.5" /> {t('nav.adminPortal', 'Administrator')}
        </span>
      );
    }
    if (role === 'doctor') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-teal-100 text-teal-800 border border-teal-200">
          <Stethoscope className="w-3.5 h-3.5" /> {t('nav.doctorPortal', 'Doctor Portal')}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-hospital-100 text-hospital-800 border border-hospital-200">
        <HeartPulse className="w-3.5 h-3.5" /> {t('nav.patientPortal', 'Patient Portal')}
      </span>
    );
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo & Brand */}
          <div 
            onClick={() => onNavigate(role === 'admin' ? 'admin' : role === 'doctor' ? 'doctor' : 'patient')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-hospital-700 via-hospital-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-hospital-500/20 group-hover:scale-105 transition-transform">
              <Activity className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-slate-900 tracking-tight">
                  {t('brand.name', 'CarePulse Hospital')}
                </span>
                <span className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] uppercase font-bold tracking-wider bg-slate-100 text-slate-600 rounded">
                  {t('common.online', 'Smart Queue')}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium hidden sm:block">
                {t('brand.tagline', 'Smart Queue & Clinical Management System')}
              </p>
            </div>
          </div>

          {/* Right Navigation, Language & Profile */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Multi-Language Selector Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setLangMenuOpen(!langMenuOpen)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 transition-colors shadow-sm"
                title={t('common.language', 'Select Language')}
              >
                <Globe className="w-3.5 h-3.5 text-hospital-600" />
                <span className="mr-0.5">{currentLanguageOption.flag}</span>
                <span className="hidden md:inline">{currentLanguageOption.nativeName}</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {langMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setLangMenuOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-3 py-1.5 border-b border-slate-100 text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                      {t('common.language', 'Select Language')}
                    </div>
                    {languages.map((l) => (
                      <button
                        key={l.code}
                        onClick={() => {
                          setLanguage(l.code);
                          setLangMenuOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left transition-colors ${
                          language === l.code
                            ? 'bg-hospital-50 text-hospital-700 font-bold'
                            : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span className="text-base">{l.flag}</span>
                          <span>{l.nativeName}</span>
                        </span>
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                          {l.code}
                        </span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Live Queue Display Toggle */}
            <button
              onClick={() => onNavigate(currentView === 'board' ? (role || 'login') : 'board')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border ${
                currentView === 'board'
                  ? 'bg-hospital-600 text-white border-hospital-600 shadow-sm'
                  : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200'
              }`}
            >
              <Tv className="w-3.5 h-3.5 text-teal-600" />
              <span className="hidden sm:inline">{t('nav.liveQueueBoard', 'Live Queue Board')}</span>
            </button>

            {user ? (
              <div className="flex items-center gap-2.5 pl-2 border-l border-slate-200">
                <div className="hidden md:flex flex-col text-right">
                  <span className="text-xs font-bold text-slate-900">{user.full_name}</span>
                  <div className="mt-0.5">{getRoleBadge()}</div>
                </div>

                <button
                  onClick={logout}
                  title="Sign out"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{t('common.logout', 'Sign Out')}</span>
                </button>
              </div>
            ) : (
              <button
                onClick={() => onNavigate('login')}
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-hospital-600 hover:bg-hospital-700 text-white transition-colors shadow-sm"
              >
                <UserIcon className="w-3.5 h-3.5" />
                {t('common.login', 'Sign In')}
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
