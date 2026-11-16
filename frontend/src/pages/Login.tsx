import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../context/LanguageContext';
import { authApi } from '../services/api';
import {
  Activity,
  User,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  Stethoscope,
  HeartPulse,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  KeyRound,
  X,
  Globe,
  ChevronDown,
  Building2,
  Clock,
  Sparkles
} from 'lucide-react';

interface LoginProps {
  onNavigate: (view: string) => void;
}

export const Login: React.FC<LoginProps> = ({ onNavigate }) => {
  const { login } = useAuth();
  const { t, language, setLanguage, languages } = useTranslation();

  // Portal Tab: 'patient' or 'staff' (Admin/Doctor)
  const [portalType, setPortalType] = useState<'patient' | 'staff'>(() => {
    const lastRole = sessionStorage.getItem('last_registered_role');
    if (lastRole === 'doctor' || lastRole === 'admin') return 'staff';
    return 'patient';
  });

  // State defaults: empty by default; prefilled only if a user just registered in this session
  const [username, setUsername] = useState<string>(() => {
    return sessionStorage.getItem('last_registered_username') || '';
  });
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(true);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [registeredNotice, setRegisteredNotice] = useState<string | null>(null);
  const [showDemoAccordion, setShowDemoAccordion] = useState<boolean>(false);

  // Forgot password modal
  const [showForgotModal, setShowForgotModal] = useState<boolean>(false);
  const [forgotIdentifier, setForgotIdentifier] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [forgotMsg, setForgotMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [forgotLoading, setForgotLoading] = useState<boolean>(false);

  useEffect(() => {
    const regName = sessionStorage.getItem('last_registered_name');
    const regUser = sessionStorage.getItem('last_registered_username');
    if (regUser) {
      setRegisteredNotice(`Welcome ${regName || regUser}! Your account is registered. Please enter your password to sign in.`);
      // Clear after read so it doesn't show repeatedly
      sessionStorage.removeItem('last_registered_name');
    }
  }, []);

  const handlePortalSwitch = (type: 'patient' | 'staff') => {
    setPortalType(type);
    setError('');
    // Notice: Do NOT wipe out what the user typed! Preserve their input.
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Please provide both username (or registered email) and password.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const loggedUser = await login({
        username: username.trim(),
        password: password.trim(),
        portal_type: portalType,
        remember_me: rememberMe
      });

      // Clear any temporary registration storage
      sessionStorage.removeItem('last_registered_username');
      sessionStorage.removeItem('last_registered_role');

      // Redirect strictly based on the authenticated user's database role
      if (loggedUser.role === 'admin') {
        onNavigate('admin');
      } else if (loggedUser.role === 'doctor') {
        onNavigate('doctor');
      } else {
        onNavigate('patient');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      const detail = err.response?.data?.detail || 'Invalid username or password. Please verify your credentials.';
      setError(detail);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotIdentifier.trim() || !newPassword.trim()) {
      setForgotMsg({ type: 'error', text: 'Please fill in all fields.' });
      return;
    }
    setForgotLoading(true);
    setForgotMsg(null);
    try {
      const res = await authApi.forgotPassword({
        identifier: forgotIdentifier.trim(),
        new_password: newPassword.trim()
      });
      setForgotMsg({ type: 'success', text: res.message });
      setTimeout(() => {
        setShowForgotModal(false);
        setForgotMsg(null);
        setPassword(newPassword);
        setUsername(forgotIdentifier.trim());
      }, 2000);
    } catch (err: any) {
      const detail = err.response?.data?.detail || 'Account lookup failed.';
      setForgotMsg({ type: 'error', text: detail });
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen relative flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 bg-cover bg-center bg-no-repeat selection:bg-hospital-500 selection:text-white"
      style={{
        backgroundImage: `url('/images/hospital-reception.jpg')`,
        backgroundColor: '#0f172a'
      }}
    >
      {/* Dark Healthcare Gradient Overlay for Maximum Readability */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950/85 via-slate-900/75 to-hospital-950/85 backdrop-blur-[2px]" />

      {/* Top Floating Language Bar */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white text-xs font-semibold shadow-lg">
          <Globe className="w-3.5 h-3.5 text-teal-300" />
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as any)}
            className="bg-transparent text-white font-medium text-xs focus:outline-none cursor-pointer"
          >
            {languages.map((l) => (
              <option key={l.code} value={l.code} className="bg-slate-800 text-white">
                {l.flag} {l.nativeName}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="relative z-10 sm:mx-auto sm:w-full sm:max-w-md text-center">
        {/* Hospital Logo & Brand */}
        <div className="inline-flex w-16 h-16 rounded-3xl bg-gradient-to-tr from-hospital-600 via-teal-500 to-emerald-400 items-center justify-center text-white shadow-2xl shadow-teal-500/30 mb-3 border-2 border-white/30 transform hover:scale-105 transition-all">
          <Activity className="w-9 h-9 stroke-[2.5]" />
        </div>
        <h1 className="text-3xl font-black text-white tracking-tight drop-shadow-md">
          {t('brand.name', 'CarePulse Hospital')}
        </h1>
        <p className="mt-1 text-xs sm:text-sm font-medium text-teal-100/90 drop-shadow">
          {t('brand.tagline', 'Smart Hospital Queue & Clinical Management System')}
        </p>
      </div>

      <div className="relative z-10 mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white/95 backdrop-blur-md py-8 px-6 sm:px-10 shadow-2xl shadow-slate-950/50 rounded-3xl border border-white/60">
          
          {/* Two Login Options Toggle */}
          <div className="grid grid-cols-2 p-1.5 bg-slate-100/90 rounded-2xl mb-5 border border-slate-200/80">
            <button
              type="button"
              onClick={() => handlePortalSwitch('patient')}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
                portalType === 'patient'
                  ? 'bg-white text-hospital-700 shadow-md border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <HeartPulse className="w-4 h-4 text-hospital-600" />
              <span>{t('login.patientTab', 'Patient Portal')}</span>
            </button>
            <button
              type="button"
              onClick={() => handlePortalSwitch('staff')}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
                portalType === 'staff'
                  ? 'bg-white text-teal-700 shadow-md border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-teal-600" />
              <span>{t('login.staffTab', 'Admin / Doctor')}</span>
            </button>
          </div>

          {/* Newly Registered Patient Notification */}
          {registeredNotice && (
            <div className="mb-4 p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2.5 animate-in fade-in">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span className="font-semibold">{registeredNotice}</span>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div className="mb-4 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-rose-800 text-xs animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span className="font-semibold">{error}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            {/* Username or Email */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                {t('login.username', 'Username or Email')}
              </label>
              <div className="relative rounded-xl shadow-2xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4 text-hospital-600" />
                </div>
                <input
                  type="text"
                  required
                  autoFocus
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={
                    portalType === 'patient' 
                      ? "Enter your registered username or email" 
                      : "Enter doctor or admin username/email"
                  }
                  className="block w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-sm placeholder:text-slate-400 text-slate-900 focus:outline-none focus:ring-2 focus:ring-hospital-500 focus:border-hospital-500 bg-white transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                {t('login.password', 'Password')}
              </label>
              <div className="relative rounded-xl shadow-2xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4 text-hospital-600" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your secret password"
                  className="block w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-300 text-sm placeholder:text-slate-400 text-slate-900 focus:outline-none focus:ring-2 focus:ring-hospital-500 focus:border-hospital-500 bg-white transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded text-hospital-600 focus:ring-hospital-500 border-slate-300 cursor-pointer"
                />
                <span className="text-xs font-medium text-slate-600">{t('login.rememberMe', 'Remember me')}</span>
              </label>

              <button
                type="button"
                onClick={() => {
                  setForgotIdentifier(username);
                  setShowForgotModal(true);
                }}
                className="text-xs font-semibold text-hospital-600 hover:text-hospital-700 hover:underline transition-colors"
              >
                {t('login.forgotPassword', 'Forgot password?')}
              </button>
            </div>

            {/* Submit Sign In Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-hospital-600 via-hospital-700 to-teal-600 hover:from-hospital-700 hover:to-teal-700 shadow-lg shadow-hospital-600/25 focus:outline-none focus:ring-2 focus:ring-hospital-500 focus:ring-offset-2 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>{t('login.signInBtn', 'Sign In to Portal')}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Registration Redirect Option */}
          <div className="mt-5 pt-5 border-t border-slate-200 text-center">
            {portalType === 'patient' ? (
              <p className="text-xs text-slate-600">
                {t('login.noAccount', 'New patient?')}{' '}
                <button
                  type="button"
                  onClick={() => onNavigate('register')}
                  className="font-bold text-hospital-600 hover:text-hospital-700 hover:underline transition-colors"
                >
                  {t('login.registerPatient', 'Register / Create Patient Account')}
                </button>
              </p>
            ) : (
              <p className="text-xs text-slate-600">
                {t('login.noAccount', 'New medical specialist or administrator?')}{' '}
                <button
                  type="button"
                  onClick={() => onNavigate('register')}
                  className="font-bold text-teal-700 hover:text-teal-800 hover:underline transition-colors"
                >
                  {t('login.staffRegister', 'Register Doctor or Admin Account')}
                </button>
              </p>
            )}
          </div>

          {/* Optional Demo Credentials Helper (Accordion - Does NOT force fill unless clicked) */}
          <div className="mt-4 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowDemoAccordion(!showDemoAccordion)}
              className="w-full flex items-center justify-between text-[11px] font-semibold text-slate-500 hover:text-slate-800 transition-colors py-1"
            >
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-teal-600" />
                <span>Sample Testing Credentials (Optional)</span>
              </span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showDemoAccordion ? 'rotate-180' : ''}`} />
            </button>

            {showDemoAccordion && (
              <div className="mt-2 p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] space-y-2 animate-in fade-in">
                <p className="text-[10px] text-slate-400">
                  Click any sample card below to auto-fill test credentials:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setPortalType('patient');
                      setUsername('john_doe');
                      setPassword('patient123');
                    }}
                    className="p-1.5 rounded-lg bg-white hover:bg-hospital-50 border border-slate-200 text-left transition-colors"
                  >
                    <span className="block font-bold text-hospital-700 text-[10px]">Patient</span>
                    <span className="block text-slate-600 font-mono text-[9px]">john_doe</span>
                    <span className="block text-slate-400 font-mono text-[9px]">patient123</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPortalType('staff');
                      setUsername('dr.jenkins');
                      setPassword('doctor123');
                    }}
                    className="p-1.5 rounded-lg bg-white hover:bg-teal-50 border border-slate-200 text-left transition-colors"
                  >
                    <span className="block font-bold text-teal-700 text-[10px]">Doctor</span>
                    <span className="block text-slate-600 font-mono text-[9px]">dr.jenkins</span>
                    <span className="block text-slate-400 font-mono text-[9px]">doctor123</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPortalType('staff');
                      setUsername('admin');
                      setPassword('admin123');
                    }}
                    className="p-1.5 rounded-lg bg-white hover:bg-purple-50 border border-slate-200 text-left transition-colors"
                  >
                    <span className="block font-bold text-purple-700 text-[10px]">Admin</span>
                    <span className="block text-slate-600 font-mono text-[9px]">admin</span>
                    <span className="block text-slate-400 font-mono text-[9px]">admin123</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-hospital-700 font-bold text-base">
                <KeyRound className="w-5 h-5 text-hospital-600" />
                <span>Reset Account Password</span>
              </div>
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 mb-4">
              Enter your registered username or email along with your desired new password.
            </p>

            {forgotMsg && (
              <div className={`p-3 rounded-xl mb-4 text-xs flex items-center gap-2 ${
                forgotMsg.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}>
                {forgotMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
                <span>{forgotMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleForgotPassword} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Username or Registered Email</label>
                <input
                  type="text"
                  required
                  value={forgotIdentifier}
                  onChange={(e) => setForgotIdentifier(e.target.value)}
                  placeholder="e.g. john_doe or user@hospital.com"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-hospital-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">New Password (Min 6 chars)</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new secure password"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-hospital-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="px-5 py-2 rounded-xl bg-hospital-600 hover:bg-hospital-700 text-white text-xs font-bold shadow-md shadow-hospital-500/20"
                >
                  {forgotLoading ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
