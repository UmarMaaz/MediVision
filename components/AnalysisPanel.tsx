
import React, { useState, useRef, useEffect } from 'react';
import { AnalysisResult, MedicalInsight, UserRole, PipelineStep, ActiveTab, ChatMessage } from '../types';
import { MODEL_DESCRIPTIONS, SEVERITY_CONFIG } from '../constants';
import { sendChatMessage, getSuggestedQuestions } from '../services/geminiChatService';

interface AnalysisPanelProps {
  analysis: AnalysisResult | null;
  insight: MedicalInsight | null;
  role: UserRole;
  step: PipelineStep;
  activeFindingIndices: number[];
  onToggleFinding: (index: number) => void;
  patientHistory: string;
  onHistoryChange: (history: string) => void;
}

/** Circular confidence gauge */
const ConfidenceGauge: React.FC<{ value: number; size?: number; label?: string }> = ({ value, size = 80, label }) => {
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - value);

  const getColor = () => {
    if (value >= 0.85) return '#22c55e';
    if (value >= 0.6) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} className="-rotate-90">
        <circle className="gauge-track" cx={size / 2} cy={size / 2} r={radius} />
        <circle
          className="gauge-fill"
          cx={size / 2} cy={size / 2} r={radius}
          stroke={getColor()}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute flex flex-col items-center" style={{ marginTop: size * 0.25 }}>
        <span className="text-lg font-black" style={{ color: 'var(--text-primary)' }}>
          {Math.round(value * 100)}%
        </span>
      </div>
      {label && (
        <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
          {label}
        </span>
      )}
    </div>
  );
};

export const AnalysisPanel: React.FC<AnalysisPanelProps> = ({
  analysis, insight, role, step, activeFindingIndices, onToggleFinding,
  patientHistory, onHistoryChange
}) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('findings');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [expandedFinding, setExpandedFinding] = useState<number | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const isGeneral = role === UserRole.GENERAL;
  const isDoctor = role === UserRole.DOCTOR;

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Reset chat when analysis changes
  useEffect(() => {
    setChatMessages([]);
  }, [analysis]);

  const handleSendMessage = async (message?: string) => {
    const text = message || chatInput.trim();
    if (!text || !analysis) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date().toISOString()
    };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setIsSending(true);

    try {
      const response = await sendChatMessage(text, analysis, role, chatMessages);
      const assistantMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date().toISOString()
      };
      setChatMessages(prev => [...prev, assistantMsg]);
    } catch {
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I'm sorry, I couldn't process that request. Please try again.",
        timestamp: new Date().toISOString()
      };
      setChatMessages(prev => [...prev, errorMsg]);
    }
    setIsSending(false);
  };

  if (!analysis) return null;

  const suggestedQuestions = analysis ? getSuggestedQuestions(analysis, role) : [];
  const severityConfig = SEVERITY_CONFIG[analysis.overallSeverity] || SEVERITY_CONFIG['Normal'];

  const tabs: { key: ActiveTab; label: string }[] = [
    { key: 'findings', label: 'Findings' },
    { key: 'ensemble', label: 'Ensemble' },
    { key: 'report', label: 'Report' },
    { key: 'chat', label: 'AI Chat' },
  ];

  return (
    <div className="space-y-4 animate-fade-in">

      {/* Hero: Primary Clinical Driver */}
      <section className="glass-card p-6 relative overflow-hidden" style={{ borderRadius: 'var(--radius-xl)' }}>
        <div className="absolute top-0 right-0 w-48 h-48 rounded-full blur-[80px] -mr-24 -mt-24"
          style={{ background: 'rgba(59, 130, 246, 0.12)' }} />
        <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full blur-[60px] -ml-16 -mb-16"
          style={{ background: 'rgba(20, 184, 166, 0.08)' }} />

        <div className="relative z-10 flex flex-col gap-4">
          <div className="flex justify-between items-start gap-3">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                  style={{ backgroundColor: severityConfig.color }} />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5"
                  style={{ backgroundColor: severityConfig.color }} />
              </span>
              <p className="text-[10px] font-bold uppercase tracking-[0.15em]" style={{ color: 'var(--accent-primary-light)' }}>
                {isGeneral ? 'Main Observation' : 'Primary Clinical Driver'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`badge ${severityConfig.bgClass}`}>
                {analysis.overallSeverity}
              </span>
            </div>
          </div>

          <h2 className="text-2xl md:text-3xl font-black tracking-tighter leading-none text-gradient">
            {isGeneral ? insight?.dominantObservation || 'Pattern Detected' : analysis.primaryClinicalDriver}
          </h2>

          <div className="flex items-center gap-4 flex-wrap">
            <div className="relative w-[70px] h-[70px]">
              <ConfidenceGauge value={analysis.ensembleConfidence} size={70} />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                Ensemble Confidence
              </span>
              <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                Agreement: <span style={{ color: analysis.modelAgreement === 'high' ? '#22c55e' : analysis.modelAgreement === 'moderate' ? '#f59e0b' : '#ef4444' }}>{analysis.modelAgreement}</span>
              </span>
              <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                Quality: <span style={{ color: analysis.imageQuality === 'excellent' ? '#22c55e' : '#f59e0b' }}>{analysis.imageQuality}</span>
              </span>
            </div>
          </div>

          {/* Model chips */}
          {!isGeneral && (
            <div className="flex gap-2 overflow-x-auto no-scrollbar pt-1">
              {analysis.ensembleContributions.slice(0, 5).map((c, i) => (
                <span key={i} className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[8px] font-bold uppercase tracking-wider"
                  style={{
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-secondary)'
                  }}>
                  <div className={`w-1.5 h-1.5 rounded-full ${c.confidence > 0.8 ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                  {c.modelName.split('(')[0].trim()}
                </span>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Patient History - Doctor Only */}
      {isDoctor && (
        <section className="glass-card p-5" style={{ borderRadius: 'var(--radius-lg)' }}>
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(59, 130, 246, 0.1)' }}>
              <svg className="w-3.5 h-3.5" style={{ color: 'var(--accent-primary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            </div>
            <h3 className="text-sm font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Patient History</h3>
          </div>
          <textarea
            value={patientHistory}
            onChange={(e) => onHistoryChange(e.target.value)}
            placeholder="Enter relevant history (prior surgeries, chronic conditions, smoking status) to refine analysis..."
            className="chat-input w-full h-24 resize-none"
          />
          <p className="text-[9px] font-bold uppercase tracking-widest mt-2" style={{ color: 'var(--text-muted)' }}>
            • History influences differential diagnosis logic
          </p>
        </section>
      )}

      {/* Tabs */}
      <div className="tab-bar">
        {tabs.map(tab => (
          <button
            key={tab.key}
            className={`tab-item ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ─── Tab: Findings ─── */}
      {activeTab === 'findings' && (
        <div className="space-y-3">
          {analysis.findings.map((f, i) => {
            const isActive = activeFindingIndices.includes(i);
            const isExpanded = expandedFinding === i;
            const sv = SEVERITY_CONFIG[f.severityLevel] || SEVERITY_CONFIG['Normal'];

            return (
              <div
                key={i}
                className={`finding-card ${isActive ? 'active' : ''}`}
                onClick={() => setExpandedFinding(isExpanded ? null : i)}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{f.region}</h4>
                      <span className={`badge ${sv.bgClass}`}>{f.severityLevel}</span>
                      <span className="badge badge-blue">{Math.round(f.confidence * 100)}%</span>
                    </div>
                    <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--accent-primary-light)' }}>
                      {f.pattern}
                    </p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); onToggleFinding(i); }}
                    className="btn-icon flex-shrink-0 ml-2"
                    style={isActive ? { background: 'rgba(59, 130, 246, 0.2)', borderColor: 'var(--border-accent)', color: 'var(--accent-primary-light)' } : {}}
                    title={isActive ? "Hide on heatmap" : "Show on heatmap"}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {isActive ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M3 3l18 18" />
                      )}
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </button>
                </div>

                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {isGeneral ? f.description.replace(/[A-Z][a-z]+ion/g, 'activity') : f.description}
                </p>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="mt-3 pt-3 space-y-3 animate-fade-in" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                    {/* Precision bar */}
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Precision Score</span>
                        <span className="text-[9px] font-bold" style={{ color: 'var(--text-secondary)' }}>{Math.round(f.precisionScore * 100)}%</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border-subtle)' }}>
                        <div
                          className="h-full rounded-full transition-all duration-1000"
                          style={{
                            width: `${f.precisionScore * 100}%`,
                            background: f.precisionScore >= 0.85 ? '#22c55e' : f.precisionScore >= 0.6 ? '#f59e0b' : '#ef4444'
                          }}
                        />
                      </div>
                    </div>

                    {!isGeneral && (
                      <>
                        <div className="p-3 rounded-xl" style={{ background: 'rgba(59, 130, 246, 0.06)', border: '1px solid rgba(59, 130, 246, 0.1)' }}>
                          <span className="text-[9px] font-bold uppercase tracking-widest block mb-1" style={{ color: 'var(--accent-primary-light)' }}>
                            Evidence Basis
                          </span>
                          <p className="text-[11px] italic" style={{ color: 'var(--text-secondary)' }}>
                            "{f.evidenceBasis}"
                          </p>
                        </div>
                        <div className="p-3 rounded-xl" style={{ background: 'rgba(20, 184, 166, 0.06)', border: '1px solid rgba(20, 184, 166, 0.1)' }}>
                          <span className="text-[9px] font-bold uppercase tracking-widest block mb-1" style={{ color: 'var(--accent-secondary)' }}>
                            Suggested Follow-up
                          </span>
                          <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                            {f.suggestedFollowUp}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Tab: Ensemble ─── */}
      {activeTab === 'ensemble' && (
        <div className="space-y-3">
          {analysis.ensembleContributions.map((c, idx) => {
            const modelInfo = MODEL_DESCRIPTIONS[c.modelName as keyof typeof MODEL_DESCRIPTIONS];
            return (
              <div key={idx} className="glass-card p-5" style={{ borderRadius: 'var(--radius-lg)' }}>
                <div className="flex justify-between items-start mb-3">
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold" style={{ color: 'var(--accent-primary-light)' }}>{c.modelName}</h4>
                    {modelInfo && (
                      <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{modelInfo.description}</p>
                    )}
                  </div>
                  <span className={`badge ${c.confidence >= 0.8 ? 'badge-emerald' : 'badge-amber'}`}>
                    {Math.round(c.confidence * 100)}%
                  </span>
                </div>
                <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>{c.prediction}</p>
                <div className="p-3 rounded-lg" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)' }}>
                  <p className="text-[11px] italic leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    {c.logic}
                  </p>
                </div>
                {c.specialization && (
                  <div className="mt-2 flex items-center gap-1.5">
                    <div className="w-1 h-1 rounded-full" style={{ background: 'var(--accent-secondary)' }} />
                    <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                      {c.specialization}
                    </span>
                  </div>
                )}
                {modelInfo && (
                  <div className="mt-2 flex items-center gap-1.5">
                    <div className="w-1 h-1 rounded-full" style={{ background: 'var(--accent-tertiary)' }} />
                    <span className="text-[9px] font-bold" style={{ color: 'var(--text-muted)' }}>
                      Trained on: {modelInfo.trainedOn}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Tab: Report ─── */}
      {activeTab === 'report' && insight && (
        <div className="space-y-4 animate-fade-in">
          {/* Technical/Patient Report */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 px-1">
              <svg className="w-4 h-4" style={{ color: 'var(--accent-primary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                {isGeneral ? 'Health Explanation' : 'Clinical Radiology Report'}
              </h3>
            </div>

            {isGeneral ? (
              <div className="glass-card p-5" style={{ borderRadius: 'var(--radius-lg)' }}>
                <p className="text-xs leading-relaxed whitespace-pre-line" style={{ color: 'var(--text-secondary)' }}>
                  {insight.patientExplanation}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Findings Section */}
                <div className="glass-card p-5" style={{ borderRadius: 'var(--radius-lg)', borderLeft: '4px solid var(--accent-primary)' }}>
                  <h4 className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--accent-primary-light)' }}>
                    I. Findings
                  </h4>
                  <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    {insight.findings}
                  </p>
                </div>

                {/* Impression Section */}
                <div className="glass-card p-5" style={{ borderRadius: 'var(--radius-lg)', borderLeft: '4px solid var(--accent-tertiary)', background: 'rgba(168, 85, 247, 0.04)' }}>
                  <h4 className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--accent-tertiary)' }}>
                    II. Impression
                  </h4>
                  <p className="text-xs font-semibold leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                    {insight.impression}
                  </p>
                </div>

                {/* Recommendations Section */}
                <div className="glass-card p-5" style={{ borderRadius: 'var(--radius-lg)', borderLeft: '4px solid var(--accent-secondary)' }}>
                  <h4 className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--accent-secondary)' }}>
                    III. Recommendations
                  </h4>
                  <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    {insight.recommendations}
                  </p>
                </div>
              </div>
            )}
          </section>

          {/* Critical findings */}
          {insight.criticalFindings && insight.criticalFindings.length > 0 && (
            <section className="p-4 rounded-xl" style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.15)', borderRadius: 'var(--radius-lg)' }}>
              <h4 className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: '#ef4444' }}>
                ⚠ Critical Findings
              </h4>
              <ul className="space-y-1.5">
                {insight.criticalFindings.map((finding, idx) => (
                  <li key={idx} className="text-xs flex items-start gap-2" style={{ color: '#fca5a5' }}>
                    <div className="w-1 h-1 rounded-full mt-1.5 flex-shrink-0" style={{ background: '#ef4444' }} />
                    {finding}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Differential Diagnosis */}
          {!isGeneral && insight.differentialDiagnosis && insight.differentialDiagnosis.length > 0 && (
            <section className="glass-card p-5" style={{ borderRadius: 'var(--radius-lg)' }}>
              <h4 className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>
                Differential Diagnosis
              </h4>
              <div className="flex flex-wrap gap-2">
                {insight.differentialDiagnosis.map((d, idx) => (
                  <span key={idx} className="badge badge-purple">{d}</span>
                ))}
              </div>
            </section>
          )}

          {/* Suggested Actions */}
          {insight.suggestedActions && insight.suggestedActions.length > 0 && (
            <section className="glass-card p-5" style={{ borderRadius: 'var(--radius-lg)' }}>
              <h4 className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--accent-secondary)' }}>
                {isGeneral ? 'What You Can Do' : 'Suggested Next Steps'}
              </h4>
              <ul className="space-y-2">
                {insight.suggestedActions.map((action, idx) => (
                  <li key={idx} className="text-xs flex items-start gap-2.5" style={{ color: 'var(--text-secondary)' }}>
                    <span className="text-[10px] font-bold flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center"
                      style={{ background: 'rgba(20, 184, 166, 0.1)', color: 'var(--accent-secondary)' }}>
                      {idx + 1}
                    </span>
                    {action}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Uncertainty */}
          {insight.uncertaintyNotes && (
            <div className="p-4 rounded-xl" style={{ background: 'rgba(245, 158, 11, 0.06)', border: '1px solid rgba(245, 158, 11, 0.12)', borderRadius: 'var(--radius-lg)' }}>
              <p className="text-[10px] leading-relaxed italic" style={{ color: 'var(--text-secondary)' }}>
                <span className="font-bold" style={{ color: '#fbbf24' }}>Note:</span> {insight.uncertaintyNotes}
              </p>
            </div>
          )}

          {/* Quality Report */}
          {analysis.qualityReport && (
            <section className="glass-card p-5" style={{ borderRadius: 'var(--radius-lg)' }}>
              <h4 className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>
                Image Quality Report
              </h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Quality:</span>
                  <span className={`badge ${analysis.qualityReport.overallQuality === 'excellent' ? 'badge-emerald' : analysis.qualityReport.overallQuality === 'acceptable' ? 'badge-amber' : 'badge-rose'}`}>
                    {analysis.qualityReport.overallQuality}
                  </span>
                </div>
                {analysis.qualityReport.issues.length > 0 && (
                  <div>
                    <span className="text-[9px] font-bold uppercase tracking-widest block mb-1" style={{ color: 'var(--text-muted)' }}>Issues:</span>
                    {analysis.qualityReport.issues.map((issue, idx) => (
                      <p key={idx} className="text-[11px] ml-3" style={{ color: 'var(--text-secondary)' }}>• {issue}</p>
                    ))}
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Limitations */}
          {analysis.limitations && analysis.limitations.length > 0 && (
            <section className="glass-card p-5" style={{ borderRadius: 'var(--radius-lg)' }}>
              <h4 className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>
                Analysis Limitations
              </h4>
              <ul className="space-y-1.5">
                {analysis.limitations.map((lim, idx) => (
                  <li key={idx} className="text-[11px] flex items-start gap-2" style={{ color: 'var(--text-secondary)' }}>
                    <div className="w-1 h-1 rounded-full mt-1.5 flex-shrink-0" style={{ background: 'var(--text-muted)' }} />
                    {lim}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

      {/* ─── Tab: Chat ─── */}
      {activeTab === 'chat' && (
        <div className="glass-card overflow-hidden flex flex-col" style={{ borderRadius: 'var(--radius-lg)', height: '420px' }}>
          {/* Chat messages */}
          <div className="chat-messages flex-1 overflow-y-auto">
            {chatMessages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-4 p-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(59, 130, 246, 0.1)' }}>
                  <svg className="w-6 h-6" style={{ color: 'var(--accent-primary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Ask about your analysis</p>
                  <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
                    Powered by Gemini Vision for follow-up Q&A
                  </p>
                </div>
                {/* Suggested questions */}
                <div className="space-y-2 w-full max-w-[280px]">
                  {suggestedQuestions.map((q, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(q)}
                      className="w-full text-left p-3 rounded-xl text-[11px] transition-all"
                      style={{
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-subtle)',
                        color: 'var(--text-secondary)'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'var(--border-accent)';
                        e.currentTarget.style.background = 'var(--bg-card-hover)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'var(--border-subtle)';
                        e.currentTarget.style.background = 'var(--bg-card)';
                      }}
                    >
                      💬 {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {chatMessages.map(msg => (
              <div key={msg.id} className={`chat-bubble ${msg.role}`}>
                {msg.content}
              </div>
            ))}

            {isSending && (
              <div className="chat-bubble assistant">
                <div className="flex gap-1.5 items-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400" style={{ animation: 'breathe 1s ease-in-out infinite' }} />
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400" style={{ animation: 'breathe 1s ease-in-out infinite 0.2s' }} />
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400" style={{ animation: 'breathe 1s ease-in-out infinite 0.4s' }} />
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Chat input */}
          <div className="chat-input-area">
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
              placeholder="Ask a follow-up question..."
              className="chat-input"
              disabled={isSending}
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={!chatInput.trim() || isSending}
              className="btn-primary !py-2.5 !px-4 !text-[10px]"
            >
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
