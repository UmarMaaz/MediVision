import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { Patient } from '../types';

interface PatientDashboardProps {
  onSelectPatient: (patient: Patient) => void;
}

export const PatientDashboard: React.FC<PatientDashboardProps> = ({ onSelectPatient }) => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingPatientId, setEditingPatientId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    dob: '',
    gender: 'M',
    mrn: '',
    medical_history: ''
  });

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('patients').select('*').order('created_at', { ascending: false });
    if (!error && data) {
      setPatients(data);
    }
    setLoading(false);
  };

  const handleEditClick = (p: Patient, e: React.MouseEvent) => {
    e.stopPropagation(); // prevent selecting the patient card
    setEditingPatientId(p.id);
    setFormData({
      first_name: p.first_name,
      last_name: p.last_name,
      dob: p.dob,
      gender: p.gender,
      mrn: p.mrn || '',
      medical_history: p.medical_history || ''
    });
    setShowAddForm(true);
  };

  const handleDeleteClick = async (p: Patient, e: React.MouseEvent) => {
    e.stopPropagation(); // prevent selecting the patient card
    if (window.confirm(`Are you sure you want to delete ${p.first_name} ${p.last_name}? This will permanently delete all their scan history.`)) {
      const { error } = await supabase.from('patients').delete().eq('id', p.id);
      if (!error) {
        setPatients(patients.filter(pat => pat.id !== p.id));
      } else {
        alert("Failed to delete patient: " + error.message);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Convert empty strings to null to avoid unique constraint errors on mrn
    const payload = {
      ...formData,
      mrn: formData.mrn.trim() === '' ? null : formData.mrn,
      medical_history: formData.medical_history.trim() === '' ? null : formData.medical_history
    };

    if (editingPatientId) {
      // Update existing
      const { data, error } = await supabase.from('patients').update(payload).eq('id', editingPatientId).select();
      if (!error && data) {
        setPatients(patients.map(p => p.id === editingPatientId ? data[0] : p));
        resetForm();
      } else {
        alert(`Failed to update patient: ${error?.message || 'Unknown error'}`);
      }
    } else {
      // Insert new
      const { data, error } = await supabase.from('patients').insert([payload]).select();
      if (!error && data) {
        setPatients([data[0], ...patients]);
        resetForm();
      } else {
        alert(`Failed to add patient: ${error?.message || 'Unknown error'}`);
      }
    }
  };

  const resetForm = () => {
    setShowAddForm(false);
    setEditingPatientId(null);
    setFormData({ first_name: '', last_name: '', dob: '', gender: 'M', mrn: '', medical_history: '' });
  };

  return (
    <div className="glass-card p-6 md:p-8 space-y-6" style={{ borderRadius: 'var(--radius-xl)' }}>
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl md:text-2xl font-black tracking-tight text-gradient">
            Patient Dashboard
          </h2>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Select a patient to begin or manage existing records.</p>
        </div>
        <button className="btn-primary !px-4 !py-2 !text-xs" onClick={() => {
            if (showAddForm) {
                resetForm();
            } else {
                setShowAddForm(true);
            }
        }}>
          {showAddForm ? 'Cancel' : '+ New Patient'}
        </button>
      </div>

      {showAddForm && (
        <form onSubmit={handleSubmit} className="glass-dark p-4 space-y-4" style={{ borderRadius: 'var(--radius-lg)' }}>
          <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
              {editingPatientId ? 'Edit Patient Details' : 'Add New Patient'}
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <input required placeholder="First Name" className="chat-input" value={formData.first_name} onChange={e => setFormData({...formData, first_name: e.target.value})} />
            <input required placeholder="Last Name" className="chat-input" value={formData.last_name} onChange={e => setFormData({...formData, last_name: e.target.value})} />
            <input required type="date" placeholder="DOB" className="chat-input" value={formData.dob} onChange={e => setFormData({...formData, dob: e.target.value})} />
            <select className="chat-input" value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value})}>
              <option value="M">Male</option>
              <option value="F">Female</option>
              <option value="O">Other</option>
            </select>
            <input placeholder="MRN (Optional)" className="chat-input col-span-2" value={formData.mrn} onChange={e => setFormData({...formData, mrn: e.target.value})} />
            <textarea placeholder="Medical History (Optional)" className="chat-input col-span-2" value={formData.medical_history} onChange={e => setFormData({...formData, medical_history: e.target.value})} />
          </div>
          <button type="submit" className="btn-primary w-full !py-2 text-xs">
            {editingPatientId ? 'Update Patient' : 'Save Patient'}
          </button>
        </form>
      )}

      {loading ? (
        <p className="text-center text-xs" style={{ color: 'var(--text-muted)' }}>Loading patients...</p>
      ) : patients.length === 0 ? (
        <p className="text-center text-xs" style={{ color: 'var(--text-muted)' }}>No patients found. Create one above.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {patients.map(p => (
            <div key={p.id} className="glass-card p-4 cursor-pointer hover:bg-white/5 transition-all relative group" style={{ borderRadius: 'var(--radius-lg)' }} onClick={() => onSelectPatient(p)}>
              
              {/* Action Buttons */}
              <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                <button onClick={(e) => handleEditClick(p, e)} className="p-1.5 rounded bg-black/40 hover:bg-blue-500/30 text-blue-400 transition-colors" title="Edit Patient">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button onClick={(e) => handleDeleteClick(p, e)} className="p-1.5 rounded bg-black/40 hover:bg-red-500/30 text-red-400 transition-colors" title="Delete Patient">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>

              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  {p.first_name[0]}{p.last_name[0]}
                </div>
                <div>
                  <h3 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{p.first_name} {p.last_name}</h3>
                  <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>MRN: {p.mrn || 'N/A'}</p>
                </div>
              </div>
              <div className="flex gap-2 text-[10px]" style={{ color: 'var(--text-secondary)' }}>
                <span className="bg-black/30 px-2 py-1 rounded">{p.gender}</span>
                <span className="bg-black/30 px-2 py-1 rounded">DOB: {new Date(p.dob).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
