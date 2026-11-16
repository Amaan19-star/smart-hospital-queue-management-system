import React, { useState, useEffect } from 'react';
import { Department, Doctor } from '../types';
import { departmentsApi, doctorsApi, appointmentsApi } from '../services/api';
import { 
  X, 
  Calendar, 
  Clock, 
  User, 
  Building2, 
  FileText, 
  AlertCircle, 
  CheckCircle2, 
  Ticket, 
  CreditCard 
} from 'lucide-react';

interface BookAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (appointment: any) => void;
}

export const BookAppointmentModal: React.FC<BookAppointmentModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDeptId, setSelectedDeptId] = useState<number | ''>('');
  const [selectedDoctorId, setSelectedDoctorId] = useState<number | ''>('');
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [availableSlots, setAvailableSlots] = useState<{ time: string; is_available: boolean }[]>([]);
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  
  const [loadingDepts, setLoadingDepts] = useState<boolean>(false);
  const [loadingDoctors, setLoadingDoctors] = useState<boolean>(false);
  const [loadingSlots, setLoadingSlots] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  // Fetch departments on open
  useEffect(() => {
    if (isOpen) {
      setLoadingDepts(true);
      setError('');
      departmentsApi.list()
        .then(data => {
          setDepartments(data);
          if (data.length > 0) {
            setSelectedDeptId(data[0].id);
          }
        })
        .catch(err => setError('Failed to load departments'))
        .finally(() => setLoadingDepts(false));
    }
  }, [isOpen]);

  // Fetch doctors when department changes
  useEffect(() => {
    if (selectedDeptId) {
      setLoadingDoctors(true);
      doctorsApi.list(Number(selectedDeptId))
        .then(docs => {
          setDoctors(docs);
          if (docs.length > 0) {
            setSelectedDoctorId(docs[0].user_id);
          } else {
            setSelectedDoctorId('');
          }
        })
        .catch(err => setError('Failed to load doctors'))
        .finally(() => setLoadingDoctors(false));
    }
  }, [selectedDeptId]);

  // Fetch slots when doctor or date changes
  useEffect(() => {
    if (selectedDoctorId && selectedDate) {
      setLoadingSlots(true);
      appointmentsApi.getSlots(Number(selectedDoctorId), selectedDate)
        .then(res => {
          setAvailableSlots(res.slots);
          // Pick first available slot if not selected
          const firstFree = res.slots.find(s => s.is_available);
          setSelectedTime(firstFree ? firstFree.time : '');
        })
        .catch(err => setError('Failed to check slot availability'))
        .finally(() => setLoadingSlots(false));
    }
  }, [selectedDoctorId, selectedDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDeptId || !selectedDoctorId || !selectedDate || !selectedTime) {
      setError('Please select department, doctor, date, and an available time slot.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const apt = await appointmentsApi.create({
        department_id: Number(selectedDeptId),
        doctor_id: Number(selectedDoctorId),
        appointment_date: selectedDate,
        appointment_time: selectedTime,
        reason: reason.trim() || 'General OPD Consultation'
      });
      onSuccess(apt);
      onClose();
    } catch (err: any) {
      console.error(err);
      const detail = err.response?.data?.detail || 'Failed to book appointment. Please try again.';
      setError(detail);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const currentDoctor = doctors.find(d => d.user_id === Number(selectedDoctorId));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-hospital-700 to-teal-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/20">
              <Calendar className="w-5 h-5 text-teal-200" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Book Medical Appointment</h2>
              <p className="text-xs text-hospital-100">Select department, specialist, date, and OPD time slot</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-rose-800 text-xs">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* 1. Department Selector */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              1. Hospital Department
            </label>
            <select
              value={selectedDeptId}
              onChange={(e) => setSelectedDeptId(Number(e.target.value))}
              disabled={loadingDepts}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-medium text-slate-800 focus:ring-2 focus:ring-hospital-500 focus:border-hospital-500 shadow-2xs"
            >
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name} ({dept.code}) - {dept.description}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Doctor Selector */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              2. Consulting Specialist Doctor
            </label>
            {doctors.length === 0 ? (
              <p className="text-xs text-amber-600 italic">No doctors currently registered in this department.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {doctors.map((doc) => {
                  const isSelected = selectedDoctorId === doc.user_id;
                  return (
                    <div
                      key={doc.user_id}
                      onClick={() => setSelectedDoctorId(doc.user_id)}
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'border-hospital-600 bg-hospital-50/70 shadow-xs ring-2 ring-hospital-500/20'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-sm text-slate-900">{doc.full_name}</span>
                        <span className="text-[11px] font-semibold text-teal-700 bg-teal-100 px-2 py-0.5 rounded">
                          {doc.room_number}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">{doc.specialization}</p>
                      <div className="mt-2 flex items-center justify-between text-xs text-slate-600">
                        <span>Avg ~{doc.avg_consultation_time} mins</span>
                        <span className="font-bold text-hospital-700">${doc.consultation_fee}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 3. Date Selection */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              3. Appointment Date
            </label>
            <input
              type="date"
              value={selectedDate}
              min={new Date().toISOString().split('T')[0]}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full sm:w-64 px-3.5 py-2 rounded-xl border border-slate-300 text-sm font-medium text-slate-800 focus:ring-2 focus:ring-hospital-500 focus:border-hospital-500 shadow-2xs"
            />
          </div>

          {/* 4. Time Slot Grid */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              4. Available Time Slots
            </label>
            {loadingSlots ? (
              <p className="text-xs text-slate-400">Checking slot availability...</p>
            ) : availableSlots.length === 0 ? (
              <p className="text-xs text-slate-400 italic">Select a doctor to view time slots.</p>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {availableSlots.map((slot, idx) => {
                  const isSelected = selectedTime === slot.time;
                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={!slot.is_available}
                      onClick={() => setSelectedTime(slot.time)}
                      className={`py-2 px-2.5 rounded-lg text-xs font-semibold transition-all border text-center ${
                        isSelected
                          ? 'bg-hospital-600 text-white border-hospital-600 shadow-sm'
                          : slot.is_available
                          ? 'bg-white text-slate-700 border-slate-200 hover:border-hospital-400 hover:bg-hospital-50/50'
                          : 'bg-slate-100 text-slate-400 border-slate-200 line-through cursor-not-allowed opacity-60'
                      }`}
                    >
                      {slot.time}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 5. Consultation Reason */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              5. Chief Complaint / Reason for Visit
            </label>
            <textarea
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Chest tightness, routine cardiac follow-up, headache..."
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm text-slate-800 focus:ring-2 focus:ring-hospital-500 focus:border-hospital-500 shadow-2xs"
            />
          </div>

          {/* Instant Token Preview Box */}
          <div className="p-4 rounded-xl bg-teal-50 border border-teal-200 flex items-start gap-3">
            <Ticket className="w-5 h-5 text-teal-700 shrink-0 mt-0.5" />
            <div className="text-xs text-teal-900">
              <span className="font-bold block">Instant Digital Token Generation</span>
              Upon booking confirmation, your digital queue token will be generated automatically and live tracking will activate on your dashboard.
            </div>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !selectedTime || !selectedDoctorId}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-hospital-600 to-teal-600 hover:from-hospital-700 hover:to-teal-700 text-white text-xs font-bold shadow-md shadow-hospital-500/20 disabled:opacity-50 transition-all"
            >
              {submitting ? 'Confirming...' : 'Confirm Appointment & Generate Token'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
