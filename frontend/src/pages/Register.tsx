import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../context/LanguageContext';
import { Department } from '../types';
import { departmentsApi } from '../services/api';
import {
  Activity,
  User,
  Mail,
  Phone,
  Calendar,
  MapPin,
  Lock,
  Eye,
  EyeOff,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  ShieldAlert,
  HeartPulse,
  Stethoscope,
  ShieldCheck,
  Building2,
  KeyRound,
  DollarSign,
  Clock,
  Globe
} from 'lucide-react';

interface RegisterProps {
  onNavigate: (view: string) => void;
  initialRole?: 'patient' | 'doctor' | 'admin';
}

export const Register: React.FC<RegisterProps> = ({ onNavigate, initialRole = 'patient' }) => {
  const { register, registerStaff } = useAuth();
  const { t, language, setLanguage, languages } = useTranslation();
  const [selectedRole, setSelectedRole] = useState<'patient' | 'doctor' | 'admin'>(initialRole);
  const [departments, setDepartments] = useState<Department[]>([]);

  // Form State
  const [formData, setFormData] = useState({
    full_name: '',
    username: '',
    email: '',
    phone: '',
    dob: '',
    gender: 'Male',
    address: '',
    password: '',
    confirm_password: '',
    // Doctor fields
    department_id: '',
    specialization: '',
    room_number: 'Room 101',
    consultation_fee: 50.0,
    avg_consultation_time: 15,
    // Admin field
    security_code: 'HOSPITAL2026'
  });

  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<boolean>(false);

  useEffect(() => {
    departmentsApi.list()
      .then(depts => {
        setDepartments(depts);
        if (depts.length > 0 && !formData.department_id) {
          setFormData(prev => ({ ...prev, department_id: String(depts[0].id) }));
        }
      })
      .catch(err => console.error('Failed to load departments', err));
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Common validations
    if (formData.password !== formData.confirm_password) {
      setError('Passwords do not match.');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setIsLoading(true);

    try {
      if (selectedRole === 'patient') {
        if (!formData.dob) {
          setError('Please provide date of birth.');
          setIsLoading(false);
          return;
        }
        await register({
          full_name: formData.full_name.trim(),
          username: formData.username.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim(),
          dob: formData.dob,
          gender: formData.gender,
          address: formData.address.trim(),
          password: formData.password,
          confirm_password: formData.confirm_password
        });
      } else {
        // Doctor or Admin
        await registerStaff({
          full_name: formData.full_name.trim(),
          username: formData.username.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim(),
          role: selectedRole,
          password: formData.password,
          confirm_password: formData.confirm_password,
          department_id: selectedRole === 'doctor' ? Number(formData.department_id) : undefined,
          specialization: selectedRole === 'doctor' ? formData.specialization.trim() : undefined,
          room_number: selectedRole === 'doctor' ? formData.room_number.trim() : undefined,
          consultation_fee: selectedRole === 'doctor' ? Number(formData.consultation_fee) : undefined,
          avg_consultation_time: selectedRole === 'doctor' ? Number(formData.avg_consultation_time) : undefined,
          security_code: selectedRole === 'admin' ? formData.security_code.trim() : undefined
        });
      }

      // Save registered user details to sessionStorage so Login.tsx can pre-fill it!
      sessionStorage.setItem('last_registered_username', formData.username.trim());
      sessionStorage.setItem('last_registered_role', selectedRole);
      sessionStorage.setItem('last_registered_name', formData.full_name.trim());

      setSuccess(true);
      setTimeout(() => {
        onNavigate('login');
      }, 1500);
    } catch (err: any) {
      console.error(err);
      const detail = err.response?.data?.detail || 'Registration failed. Please check your information.';
      setError(detail);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen relative flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8 bg-cover bg-center bg-no-repeat selection:bg-hospital-500 selection:text-white"
      style={{
        backgroundImage: `url('/images/hospital-registration.jpg')`,
        backgroundColor: '#0f172a'
      }}
    >
      {/* Dark Healthcare Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950/85 via-hospital-950/75 to-teal-950/80 backdrop-blur-[2px]" />

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

      <div className="relative z-10 sm:mx-auto sm:w-full sm:max-w-2xl text-center">
        {/* Hospital Branding */}
        <div className="inline-flex w-14 h-14 rounded-3xl bg-gradient-to-tr from-hospital-600 via-teal-500 to-emerald-400 items-center justify-center text-white shadow-2xl shadow-teal-500/30 mb-3 border-2 border-white/30">
          <Activity className="w-8 h-8 stroke-[2.5]" />
        </div>
        <h1 className="text-3xl font-black text-white tracking-tight drop-shadow-md">
          Create Hospital Account
        </h1>
        <p className="mt-1 text-xs sm:text-sm font-medium text-teal-100/90 drop-shadow">
          Smart Hospital registration portal for Patients, Doctors, and Administrators
        </p>
      </div>

      <div className="relative z-10 mt-6 sm:mx-auto sm:w-full sm:max-w-2xl">
        <div className="bg-white/95 backdrop-blur-md py-8 px-6 sm:px-10 shadow-2xl shadow-slate-950/50 rounded-3xl border border-white/60">
          {/* Role Selection Tabs (PATIENT / DOCTOR / ADMIN) */}
          <div className="grid grid-cols-3 p-1.5 bg-slate-100 rounded-2xl mb-6 border border-slate-200/70 text-xs font-bold">
            <button
              type="button"
              onClick={() => { setSelectedRole('patient'); setError(''); }}
              className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl transition-all ${selectedRole === 'patient'
                ? 'bg-white text-hospital-700 shadow-sm border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              <HeartPulse className="w-4 h-4 text-hospital-600" />
              <span>Patient</span>
            </button>
            <button
              type="button"
              onClick={() => { setSelectedRole('doctor'); setError(''); }}
              className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl transition-all ${selectedRole === 'doctor'
                ? 'bg-white text-teal-700 shadow-sm border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              <Stethoscope className="w-4 h-4 text-teal-600" />
              <span>Doctor</span>
            </button>
            <button
              type="button"
              onClick={() => { setSelectedRole('admin'); setError(''); }}
              className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl transition-all ${selectedRole === 'admin'
                ? 'bg-white text-purple-700 shadow-sm border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              <ShieldCheck className="w-4 h-4 text-purple-600" />
              <span>Admin</span>
            </button>
          </div>

          {/* Info Banner based on Role */}
          <div className={`mb-6 p-3.5 rounded-2xl text-xs flex items-start gap-3 border ${selectedRole === 'patient'
            ? 'bg-hospital-50/70 border-hospital-200 text-hospital-900' :
            selectedRole === 'doctor'
              ? 'bg-teal-50/70 border-teal-200 text-teal-900' :
              'bg-purple-50/70 border-purple-200 text-purple-900'
            }`}>
            {selectedRole === 'patient' && <HeartPulse className="w-4 h-4 text-hospital-600 shrink-0 mt-0.5" />}
            {selectedRole === 'doctor' && <Stethoscope className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />}
            {selectedRole === 'admin' && <ShieldCheck className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />}
            <div>
              <span className="font-bold">
                {selectedRole === 'patient' ? 'Patient Portal Registration: ' :
                  selectedRole === 'doctor' ? 'Doctor Specialist Registration: ' :
                    'Hospital Administrator Registration: '}
              </span>
              {selectedRole === 'patient' && 'Register your patient record to book OPD consultations, receive real-time digital queue tokens, and track waiting times.'}
              {selectedRole === 'doctor' && 'Register as a clinical specialist to access your consultation room, call waiting patients, and manage your daily OPD roster.'}
              {selectedRole === 'admin' && 'Register with the hospital staff authorization passcode (default: HOSPITAL2026) to access hospital operations and analytics.'}
            </div>
          </div>

          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-rose-800 text-xs animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-5 p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-3 text-emerald-800 text-xs font-semibold animate-in fade-in">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>
                {selectedRole === 'doctor' ? 'Doctor specialist account created!' :
                  selectedRole === 'admin' ? 'Administrator account created!' :
                    'Patient account created!'} Redirecting to login...
              </span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Full Name *
                </label>
                <div className="relative rounded-xl">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleChange}
                    placeholder={selectedRole === 'doctor' ? "e.g. Dr. Robert House" : "e.g. Johnathan Doe"}
                    className="block w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-sm placeholder:text-slate-400 text-slate-900 focus:ring-2 focus:ring-hospital-500 focus:border-hospital-500"
                  />
                </div>
              </div>

              {/* Username */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Username *
                </label>
                <div className="relative rounded-xl">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    placeholder={selectedRole === 'doctor' ? "e.g. dr.house" : "e.g. john_doe"}
                    className="block w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-sm placeholder:text-slate-400 text-slate-900 focus:ring-2 focus:ring-hospital-500 focus:border-hospital-500"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Email Address *
                </label>
                <div className="relative rounded-xl">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="e.g. staff@hospital.com"
                    className="block w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-sm placeholder:text-slate-400 text-slate-900 focus:ring-2 focus:ring-hospital-500 focus:border-hospital-500"
                  />
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Phone Number *
                </label>
                <div className="relative rounded-xl">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Phone className="w-4 h-4" />
                  </div>
                  <input
                    type="tel"
                    required
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="e.g. +1 555-019-2834"
                    className="block w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-sm placeholder:text-slate-400 text-slate-900 focus:ring-2 focus:ring-hospital-500 focus:border-hospital-500"
                  />
                </div>
              </div>
            </div>

            {/* PATIENT ONLY FIELDS */}
            {selectedRole === 'patient' && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Date of Birth */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Date of Birth *
                    </label>
                    <div className="relative rounded-xl">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <input
                        type="date"
                        required
                        name="dob"
                        max={new Date().toISOString().split('T')[0]}
                        value={formData.dob}
                        onChange={handleChange}
                        className="block w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-sm text-slate-900 focus:ring-2 focus:ring-hospital-500 focus:border-hospital-500"
                      />
                    </div>
                  </div>

                  {/* Gender */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Gender *
                    </label>
                    <select
                      name="gender"
                      value={formData.gender}
                      onChange={handleChange}
                      className="block w-full px-3 py-2 rounded-xl border border-slate-300 text-sm text-slate-900 focus:ring-2 focus:ring-hospital-500 focus:border-hospital-500 bg-white"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                {/* Address */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Residential Address *
                  </label>
                  <div className="relative rounded-xl">
                    <div className="absolute top-2.5 left-3 flex items-start pointer-events-none text-slate-400">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <textarea
                      required
                      rows={2}
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                      placeholder="Street address, city, state, postal code"
                      className="block w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-sm text-slate-900 focus:ring-2 focus:ring-hospital-500"
                    />
                  </div>
                </div>
              </>
            )}

            {/* DOCTOR ONLY FIELDS */}
            {selectedRole === 'doctor' && (
              <div className="p-4 bg-teal-50/50 rounded-2xl border border-teal-200/80 space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-teal-800 block">
                  Medical Specialist Details
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Hospital Department *</label>
                    <select
                      name="department_id"
                      value={formData.department_id}
                      onChange={handleChange}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white focus:ring-2 focus:ring-teal-500"
                    >
                      {departments.map(d => (
                        <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Assigned Room Number *</label>
                    <input
                      type="text"
                      required
                      name="room_number"
                      value={formData.room_number}
                      onChange={handleChange}
                      placeholder="e.g. Room 204"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Medical Specialization *</label>
                  <input
                    type="text"
                    required
                    name="specialization"
                    value={formData.specialization}
                    onChange={handleChange}
                    placeholder="e.g. Senior Pediatric Cardiologist"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Consultation Fee ($)</label>
                    <input
                      type="number"
                      name="consultation_fee"
                      value={formData.consultation_fee}
                      onChange={handleChange}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Avg Time (Mins)</label>
                    <input
                      type="number"
                      name="avg_consultation_time"
                      value={formData.avg_consultation_time}
                      onChange={handleChange}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ADMIN ONLY FIELD */}
            {selectedRole === 'admin' && (
              <div className="p-4 bg-purple-50/60 rounded-2xl border border-purple-200 space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-purple-900 flex items-center gap-1.5">
                  <KeyRound className="w-4 h-4 text-purple-700" />
                  Administrator Verification Passcode *
                </label>
                <input
                  type="text"
                  required
                  name="security_code"
                  value={formData.security_code}
                  onChange={handleChange}
                  placeholder="Enter hospital admin code (default: HOSPITAL2026)"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-purple-300 text-sm font-mono focus:ring-2 focus:ring-purple-500"
                />
                <p className="text-[11px] text-purple-700">
                  Pre-filled with hospital default authorization key: <b>HOSPITAL2026</b>.
                </p>
              </div>
            )}

            {/* Passwords */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Password (Min 6 chars) *
                </label>
                <div className="relative rounded-xl">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Create secure password"
                    className="block w-full pl-9 pr-9 py-2 rounded-xl border border-slate-300 text-sm text-slate-900 focus:ring-2 focus:ring-hospital-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Confirm Password *
                </label>
                <div className="relative rounded-xl">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    name="confirm_password"
                    value={formData.confirm_password}
                    onChange={handleChange}
                    placeholder="Confirm secure password"
                    className="block w-full pl-9 pr-9 py-2 rounded-xl border border-slate-300 text-sm text-slate-900 focus:ring-2 focus:ring-hospital-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Submit */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading || success}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-hospital-600 to-teal-600 hover:from-hospital-700 hover:to-teal-700 shadow-md shadow-hospital-500/20 disabled:opacity-50 transition-all"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Activity className="w-4 h-4" />
                    <span>
                      {selectedRole === 'doctor' ? 'Register Doctor Account' :
                        selectedRole === 'admin' ? 'Register Administrator Account' :
                          'Complete Patient Registration'}
                    </span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Back to Login link */}
          <div className="mt-6 pt-4 border-t border-slate-200 text-center">
            <button
              onClick={() => onNavigate('login')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-hospital-600 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Already have an account? Back to Login</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
