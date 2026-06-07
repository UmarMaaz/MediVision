import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { AnalysisSession, Patient } from '../types';

interface ExtendedSession extends AnalysisSession {
  patient?: Patient;
}

export const AnalyticsDashboard: React.FC = () => {
  const [sessions, setSessions] = useState<ExtendedSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      // Fetch both sessions and patients to correlate data
      const [sessionsRes, patientsRes] = await Promise.all([
        supabase.from('scan_sessions').select('session_data, patient_id, created_at').order('created_at', { ascending: false }),
        supabase.from('patients').select('*')
      ]);

      if (!sessionsRes.error && sessionsRes.data && !patientsRes.error && patientsRes.data) {
        const patientsMap = new Map(patientsRes.data.map(p => [p.id, p as Patient]));
        const enriched = sessionsRes.data.map(row => {
          const session = row.session_data as AnalysisSession;
          return {
            ...session,
            timestamp: row.created_at || session.timestamp || new Date().toISOString(),
            patient: patientsMap.get(row.patient_id)
          };
        });
        setSessions(enriched);
      }
      setLoading(false);
    };
    fetchAll();
  }, []);

  if (loading) {
    return (
      <div className="glass-card p-12 flex flex-col items-center justify-center space-y-4" style={{ borderRadius: 'var(--radius-xl)' }}>
        <div className="w-10 h-10 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
        <p className="text-sm font-bold tracking-widest uppercase text-blue-400">Aggregating Clinic Data...</p>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="glass-card p-16 text-center space-y-4" style={{ borderRadius: 'var(--radius-xl)' }}>
        <div className="w-24 h-24 mx-auto rounded-3xl bg-blue-500/10 flex items-center justify-center mb-6">
          <span className="text-5xl">📊</span>
        </div>
        <h3 className="text-xl font-black text-white">No Analytics Available</h3>
        <p className="text-sm text-slate-400 max-w-md mx-auto">
          Your dashboard will populate with rich, clinic-wide insights as soon as you process your first patient scan.
        </p>
      </div>
    );
  }

  // --- CORE METRICS ---
  const totalScans = sessions.length;
  const thisWeekScans = sessions.filter(s => Date.now() - new Date(s.timestamp).getTime() < 7 * 24 * 3600 * 1000).length;
  const avgConfidence = Math.round(sessions.reduce((acc, s) => acc + s.confidence, 0) / totalScans * 100);
  
  // Abnormal / Critical Finding Yield (Any severity that isn't Normal)
  const abnormalScans = sessions.filter(s => s.severity !== 'Normal').length;
  const diagnosticYield = Math.round((abnormalScans / totalScans) * 100);

  // --- MODALITY BREAKDOWN ---
  const modalityCounts = sessions.reduce((acc, s) => {
    acc[s.modality] = (acc[s.modality] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const sortedModalities = Object.entries(modalityCounts).sort(([,a],[,b]) => (b as number) - (a as number));

  // --- SEVERITY BREAKDOWN ---
  const severityCounts = sessions.reduce((acc, s) => {
    // Normalize severity to match our matrix cases
    const sev = s.severity === 'High' ? 'Severe' : s.severity === 'Low' ? 'Mild' : s.severity;
    acc[sev] = (acc[sev] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // --- DEMOGRAPHICS (Gender & Age) ---
  const genderCounts = { Male: 0, Female: 0, Other: 0 };
  let ageSum = 0;
  let validAges = 0;

  sessions.forEach(s => {
    if (s.patient) {
      if (s.patient.gender === 'M' || s.patient.gender === 'Male') genderCounts.Male++;
      else if (s.patient.gender === 'F' || s.patient.gender === 'Female') genderCounts.Female++;
      else genderCounts.Other++;

      if (s.patient.dob) {
        const ageDifMs = Date.now() - new Date(s.patient.dob).getTime();
        const ageDate = new Date(ageDifMs);
        ageSum += Math.abs(ageDate.getUTCFullYear() - 1970);
        validAges++;
      }
    }
  });
  const avgAge = validAges > 0 ? Math.round(ageSum / validAges) : 0;

  // --- RECENT VOLUME TREND ---
  let mostRecentTime = Date.now();
  if (sessions.length > 0) {
    const validTimes = sessions.map(s => new Date(s.timestamp).getTime()).filter(t => !isNaN(t));
    if (validTimes.length > 0) {
      mostRecentTime = Math.max(...validTimes);
    }
  }

  const trendDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mostRecentTime);
    d.setDate(d.getDate() - (6 - i));
    const label = d.toLocaleDateString('en-US', { weekday: 'short' });
    const fullDate = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const count = sessions.filter(s => new Date(s.timestamp).toDateString() === d.toDateString()).length;
    return { label, fullDate, count };
  });
  const maxTrend = Math.max(...trendDays.map(d => d.count), 1);

  // Colors
  const SEV_COLORS: Record<string, string> = { 'Critical': '#ef4444', 'Severe': '#f97316', 'Moderate': '#f59e0b', 'Mild': '#10b981', 'Normal': '#3b82f6' };
  const MOD_COLORS: Record<string, string> = { 'X-Ray': '#3b82f6', 'CT Scan': '#8b5cf6', 'MRI': '#06b6d4', 'Ultrasound': '#10b981' };

  return (
    <div className="space-y-6 lg:space-y-8 animate-fade-in pb-12">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-white mb-1">Clinic Intelligence</h2>
          <p className="text-sm text-slate-400">Broad overview of scan volumes, demographics, and AI diagnostic yield.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Live Data Sync
          </span>
        </div>
      </div>

      {/* Primary KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card p-5 border-t-4 border-t-blue-500 rounded-2xl relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 text-6xl opacity-5 group-hover:scale-110 transition-transform">🩻</div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Total Scans</p>
          <p className="text-4xl font-black text-white">{totalScans}</p>
          <p className="text-[10px] text-blue-400 mt-2 font-bold">+{thisWeekScans} this week</p>
        </div>

        <div className="glass-card p-5 border-t-4 border-t-purple-500 rounded-2xl relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 text-6xl opacity-5 group-hover:scale-110 transition-transform">🎯</div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">AI Confidence</p>
          <p className="text-4xl font-black text-white">{avgConfidence}%</p>
          <p className="text-[10px] text-purple-400 mt-2 font-bold">Ensemble average</p>
        </div>

        <div className="glass-card p-5 border-t-4 border-t-rose-500 rounded-2xl relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 text-6xl opacity-5 group-hover:scale-110 transition-transform">🚨</div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Diagnostic Yield</p>
          <p className="text-4xl font-black text-white">{diagnosticYield}%</p>
          <p className="text-[10px] text-rose-400 mt-2 font-bold">Scans with abnormal findings</p>
        </div>

        <div className="glass-card p-5 border-t-4 border-t-amber-500 rounded-2xl relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 text-6xl opacity-5 group-hover:scale-110 transition-transform">👥</div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Patient Avg Age</p>
          <p className="text-4xl font-black text-white">{avgAge > 0 ? avgAge : '--'}</p>
          <p className="text-[10px] text-amber-400 mt-2 font-bold">Years old</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Trend Chart */}
        <div className="glass-card p-6 rounded-2xl lg:col-span-2">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-sm font-bold text-white uppercase tracking-widest">Recent Volume Trend</h3>
            <span className="text-xs text-slate-400">{thisWeekScans} total</span>
          </div>
          <div className="flex items-end justify-between gap-2 h-48 mt-4">
            {trendDays.map((day, i) => (
              <div key={i} className="flex-1 flex flex-col justify-end items-center gap-2 group cursor-crosshair h-full">
                <span className="text-xs font-bold text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity -translate-y-2">{day.count}</span>
                <div 
                  className="w-full relative rounded-t-xl transition-all duration-500 ease-out group-hover:brightness-125"
                  style={{ 
                    height: `${Math.max((day.count / maxTrend) * 100, 5)}%`,
                    background: 'linear-gradient(to top, rgba(59, 130, 246, 0.2), rgba(59, 130, 246, 0.8))',
                    boxShadow: day.count > 0 ? '0 0 20px rgba(59,130,246,0.2)' : 'none'
                  }}
                />
                <span className="text-xs font-medium text-slate-400">{day.label}</span>
                <span className="text-[9px] text-slate-500">{day.fullDate}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Demographics Ring (Simulated with bars for simplicity) */}
        <div className="glass-card p-6 rounded-2xl flex flex-col justify-between">
          <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-6">Patient Demographics</h3>
          
          <div className="space-y-6">
            <div>
              <div className="flex justify-between text-xs mb-2">
                <span className="text-slate-300 font-bold">Male</span>
                <span className="text-blue-400 font-black">{genderCounts.Male}</span>
              </div>
              <div className="h-2.5 rounded-full bg-slate-800 overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(genderCounts.Male / Math.max(genderCounts.Male + genderCounts.Female + genderCounts.Other, 1)) * 100}%` }} />
              </div>
            </div>
            
            <div>
              <div className="flex justify-between text-xs mb-2">
                <span className="text-slate-300 font-bold">Female</span>
                <span className="text-pink-400 font-black">{genderCounts.Female}</span>
              </div>
              <div className="h-2.5 rounded-full bg-slate-800 overflow-hidden">
                <div className="h-full bg-pink-500 rounded-full" style={{ width: `${(genderCounts.Female / Math.max(genderCounts.Male + genderCounts.Female + genderCounts.Other, 1)) * 100}%` }} />
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50 text-center mt-4">
              <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-1">Most Active Demographic</p>
              <p className="text-sm font-bold text-white">
                {genderCounts.Female > genderCounts.Male ? 'Female' : 'Male'} • Avg {avgAge} yrs
              </p>
            </div>
          </div>
        </div>

        {/* Modality Breakdown */}
        <div className="glass-card p-6 rounded-2xl">
          <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-6">Modality Distribution</h3>
          <div className="space-y-4">
            {sortedModalities.map(([mod, count]) => {
              const countNum = count as number;
              const pct = Math.round((countNum / totalScans) * 100);
              const color = MOD_COLORS[mod] || '#8b5cf6';
              return (
                <div key={mod} className="group cursor-default">
                  <div className="flex justify-between items-baseline mb-1.5">
                    <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">{mod}</span>
                    <span className="text-xs font-black" style={{ color }}>{countNum} <span className="text-[10px] font-normal text-slate-500 ml-1">({pct}%)</span></span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${pct}%`, background: color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Severity Matrix */}
        <div className="glass-card p-6 rounded-2xl lg:col-span-2">
          <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-6">Clinical Severity Matrix</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {['Critical', 'Severe', 'Moderate', 'Mild', 'Normal'].map(sev => {
              const count = severityCounts[sev] || 0;
              const color = SEV_COLORS[sev];
              const pct = Math.round((count / totalScans) * 100) || 0;
              
              return (
                <div key={sev} className="relative p-4 rounded-xl border flex flex-col items-center justify-center text-center transition-all hover:-translate-y-1"
                     style={{ 
                       background: `linear-gradient(180deg, ${color}10, transparent)`, 
                       borderColor: count > 0 ? `${color}40` : 'var(--border-subtle)' 
                     }}>
                  <span className="text-3xl font-black mb-1" style={{ color: count > 0 ? color : 'var(--text-muted)' }}>
                    {count}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: count > 0 ? color : 'var(--text-muted)' }}>
                    {sev}
                  </span>
                  <div className="absolute top-2 right-2 text-[8px] font-bold text-slate-500">{pct}%</div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
};
