import React, { useState, useRef, useEffect } from 'react';
import { AnalysisResult, MedicalInsight, Annotation, Patient } from '../types';

interface ReportExportProps {
  analysis: AnalysisResult;
  insight: MedicalInsight | null;
  annotations: Annotation[];
  patientHistory: string;
  patient: Patient | null;
  image: string | null;
}

export const ReportExport: React.FC<ReportExportProps> = ({ analysis, insight, annotations, patientHistory, patient, image }) => {
  const [dictatedImpression, setDictatedImpression] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      setVoiceSupported(true);
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'en-US';
      rec.onresult = (event: any) => {
        let t = '';
        for (let i = 0; i < event.results.length; i++) t += event.results[i][0].transcript;
        setDictatedImpression(t);
      };
      rec.onend = () => setIsListening(false);
      rec.onerror = () => setIsListening(false);
      recognitionRef.current = rec;
    }
  }, []);

  const toggleDictation = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setDictatedImpression('');
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const generateReportHTML = () => {
    const now = new Date();
    
    // Use dictated impression if available, otherwise use AI impression
    const finalImpression = dictatedImpression.trim() || insight?.impression || analysis.primaryClinicalDriver;
    
    // Fallback patient data if not selected
    const pName = patient ? `${patient.first_name} ${patient.last_name}` : 'Unknown Patient';
    const pDob = patient && patient.dob ? new Date(patient.dob).toLocaleDateString() : 'N/A';
    const pGender = patient ? (patient.gender === 'M' ? 'Male' : patient.gender === 'F' ? 'Female' : 'Other') : 'N/A';
    const pMrn = patient?.mrn || 'N/A';
    const examDate = new Date(analysis.timestamp || now).toLocaleDateString();
    const reportId = `RPT-${Date.now().toString(36).toUpperCase()}`;

    const findingsHTML = analysis.findings.map((f, i) => `
      <div style="margin-bottom: 12px;">
        <strong>${i + 1}. ${f.region}:</strong> ${f.description}
      </div>
    `).join('');

    const ensembleHTML = analysis.ensembleContributions.map(c => `
      <tr>
        <td style="padding:6px;border:1px solid #e2e8f0;">${c.modelName}</td>
        <td style="padding:6px;border:1px solid #e2e8f0;">${c.prediction}</td>
        <td style="padding:6px;border:1px solid #e2e8f0;">${Math.round(c.confidence * 100)}%</td>
      </tr>
    `).join('');

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Radiology Report</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', sans-serif; background: #ffffff; color: #1e293b; line-height: 1.6; padding: 40px; max-width: 900px; margin: 0 auto; }
    
    .header { border-bottom: 2px solid #1e293b; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-end; }
    .header-left h1 { font-size: 24px; font-weight: 800; color: #0f172a; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 1px; }
    .header-left p { font-size: 14px; color: #475569; font-weight: 600; }
    .header-right { text-align: right; font-size: 12px; color: #475569; }
    
    .demographics { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 30px; padding: 15px; border: 1px solid #cbd5e1; border-radius: 4px; background: #f8fafc; }
    .demographics div { font-size: 13px; }
    .demographics strong { color: #334155; }
    
    .section { margin-bottom: 24px; }
    .section h2 { font-size: 14px; font-weight: 700; color: #0f172a; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-bottom: 12px; }
    .section p { font-size: 13px; color: #334155; margin-bottom: 8px; }
    
    .impression-box { border: 2px solid #0f172a; padding: 16px; border-radius: 4px; background: #f8fafc; margin-top: 30px; }
    .impression-box h2 { border: none; padding: 0; margin-bottom: 8px; font-size: 16px; }
    .impression-box p { font-size: 14px; font-weight: 600; color: #0f172a; }
    
    .image-container { margin-top: 40px; text-align: center; page-break-inside: avoid; }
    .image-container img { max-width: 100%; max-height: 600px; border: 1px solid #cbd5e1; border-radius: 4px; }
    .image-caption { font-size: 11px; color: #64748b; margin-top: 8px; font-style: italic; }
    
    .footer { margin-top: 50px; text-align: center; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 20px; }
    
    @media print {
      body { padding: 0; max-width: 100%; }
    }
  </style>
</head>
<body>

  <div class="header">
    <div class="header-left" style="display: flex; align-items: center; gap: 16px;">
      <img src="/logo.png" alt="MediVision" style="width: 48px; height: 48px; border-radius: 8px;" />
      <div>
        <h1>Radiology Report</h1>
        <p>${analysis.modality}</p>
      </div>
    </div>
    <div class="header-right" style="display: flex; align-items: center; gap: 16px; text-align: right;">
      <div>
        <div>Report ID: ${reportId}</div>
        <div>Date: ${examDate}</div>
      </div>
      <img src="/clinic.png" alt="Clinic Logo" style="width: 64px; height: 64px; object-fit: contain;" />
    </div>
  </div>

  <div class="demographics">
    <div><strong>Patient Name:</strong> ${pName}</div>
    <div><strong>DOB:</strong> ${pDob}</div>
    <div><strong>MRN:</strong> ${pMrn}</div>
    <div><strong>Gender:</strong> ${pGender}</div>
  </div>

  <div class="section">
    <h2>Clinical Indication</h2>
    <p>${insight?.indication || patientHistory || 'No clinical history provided.'}</p>
  </div>

  <div class="section">
    <h2>Comparison</h2>
    <p>${insight?.comparison || 'None available.'}</p>
  </div>

  <div class="section">
    <h2>Technique</h2>
    <p>${insight?.technique || `Standard ${analysis.modality} protocol.`}</p>
  </div>

  <div class="section">
    <h2>Findings</h2>
    ${insight?.findings ? `<p>${insight.findings}</p>` : ''}
    <div style="margin-top: 16px;">
      ${findingsHTML || '<p>No acute abnormalities detected.</p>'}
    </div>
  </div>

  <div class="impression-box section">
    <h2>Impression</h2>
    <p>${finalImpression}</p>
    ${insight?.differentialDiagnosis?.length ? `
      <div style="margin-top: 12px;">
        <span style="font-size: 12px; color: #475569;">Differential Diagnosis: </span>
        <span style="font-size: 12px; font-weight: 400;">${insight.differentialDiagnosis.join(', ')}</span>
      </div>
    ` : ''}
    ${insight?.suggestedActions?.length ? `
      <div style="margin-top: 12px;">
        <span style="font-size: 12px; color: #475569;">Recommendations: </span>
        <ul style="font-size: 12px; font-weight: 400; padding-left: 20px; margin-top: 4px;">
          ${insight.suggestedActions.map(a => `<li>${a}</li>`).join('')}
        </ul>
      </div>
    ` : ''}
  </div>

  ${image ? `
  <div class="image-container">
    <img src="${image}" alt="Medical Scan" />
    <div class="image-caption">Image Exhibit: ${analysis.modality} provided for analysis.</div>
  </div>
  ` : ''}

  <div class="footer">
    <p>Electronically generated on ${now.toLocaleString()}</p>
    <p style="margin-top: 4px;"><strong>Disclaimer:</strong> This document is not a substitute for professional medical diagnosis. Findings must be verified by a licensed radiologist or physician.</p>
  </div>

</body>
</html>`;
  };

  const handleExport = () => {
    const html = generateReportHTML();
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Radiology_Report_${patient?.last_name || 'Patient'}_${new Date().toISOString().slice(0, 10)}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    const html = generateReportHTML();
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
      setTimeout(() => win.print(), 500);
    }
  };

  return (
    <div className="space-y-3">
      {/* Voice Dictation Panel */}
      {voiceSupported && (
        <div className="glass-dark p-3 rounded-xl space-y-2" style={{ border: '1px solid var(--border-subtle)' }}>
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>🎙️ Dictate Impression</span>
            <div className="flex gap-2">
              {dictatedImpression && (
                <button onClick={() => setDictatedImpression('')} className="text-[9px] underline" style={{ color: 'var(--text-muted)' }}>Clear</button>
              )}
              <button
                onClick={toggleDictation}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[9px] font-bold transition-all"
                style={isListening ? {
                  background: 'rgba(239,68,68,0.15)',
                  border: '1px solid rgba(239,68,68,0.4)',
                  color: '#f87171'
                } : {
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-secondary)'
                }}
              >
                {isListening ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                    Stop Recording
                  </>
                ) : (
                  <>
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                    Start Dictating
                  </>
                )}
              </button>
            </div>
          </div>
          {dictatedImpression ? (
            <p className="text-[10px] leading-relaxed" style={{ color: 'var(--text-primary)' }}>{dictatedImpression}</p>
          ) : (
            <p className="text-[10px] italic" style={{ color: 'var(--text-muted)' }}>
              {isListening ? 'Listening... speak your impression now.' : 'Click "Start Dictating" to record a custom impression that will override the AI text in the report.'}
            </p>
          )}
        </div>
      )}

      {/* Export Buttons */}
      <div className="flex gap-2">
        <button onClick={handleExport} className="btn-ghost flex items-center gap-1.5 !text-[9px]">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Export HTML
        </button>
        <button onClick={handlePrint} className="btn-ghost flex items-center gap-1.5 !text-[9px]">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Print / PDF
        </button>
      </div>
    </div>
  );
};
