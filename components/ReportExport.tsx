
import React from 'react';
import { AnalysisResult, MedicalInsight, Annotation } from '../types';

interface ReportExportProps {
  analysis: AnalysisResult;
  insight: MedicalInsight | null;
  annotations: Annotation[];
  patientHistory: string;
}

export const ReportExport: React.FC<ReportExportProps> = ({ analysis, insight, annotations, patientHistory }) => {

  const generateReportHTML = () => {
    const now = new Date();
    const findingsHTML = analysis.findings.map((f, i) => `
      <tr>
        <td style="padding:8px;border:1px solid #333;color:#e2e8f0;">${i + 1}</td>
        <td style="padding:8px;border:1px solid #333;color:#e2e8f0;">${f.region}</td>
        <td style="padding:8px;border:1px solid #333;color:#e2e8f0;">${f.pattern}</td>
        <td style="padding:8px;border:1px solid #333;color:#e2e8f0;">${f.severityLevel}</td>
        <td style="padding:8px;border:1px solid #333;color:#e2e8f0;">${Math.round(f.confidence * 100)}%</td>
        <td style="padding:8px;border:1px solid #333;color:#e2e8f0;">${f.description}</td>
      </tr>
    `).join('');

    const ensembleHTML = analysis.ensembleContributions.map(c => `
      <tr>
        <td style="padding:8px;border:1px solid #333;color:#e2e8f0;">${c.modelName}</td>
        <td style="padding:8px;border:1px solid #333;color:#e2e8f0;">${c.prediction}</td>
        <td style="padding:8px;border:1px solid #333;color:#e2e8f0;">${Math.round(c.confidence * 100)}%</td>
        <td style="padding:8px;border:1px solid #333;color:#e2e8f0;">${c.logic}</td>
      </tr>
    `).join('');

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>MediVision CDS Report - ${now.toLocaleDateString()}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', sans-serif; background: #050a18; color: #e2e8f0; padding: 40px; }
    .header { text-align: center; margin-bottom: 32px; padding-bottom: 24px; border-bottom: 2px solid #1e293b; }
    .header h1 { font-size: 28px; font-weight: 800; background: linear-gradient(135deg, #3b82f6, #14b8a6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .header p { color: #64748b; font-size: 12px; margin-top: 8px; }
    .section { margin-bottom: 28px; }
    .section h2 { font-size: 16px; font-weight: 700; color: #93c5fd; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #1e293b; }
    .section h3 { font-size: 13px; font-weight: 600; color: #94a3b8; margin-bottom: 6px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    th { padding: 10px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; background: #0f172a; border: 1px solid #333; }
    .meta-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 16px; }
    .meta-card { background: #0f172a; padding: 14px; border-radius: 12px; border: 1px solid #1e293b; }
    .meta-card .label { font-size: 9px; text-transform: uppercase; letter-spacing: 2px; color: #64748b; }
    .meta-card .value { font-size: 20px; font-weight: 800; margin-top: 4px; }
    .badge { display: inline-block; padding: 3px 10px; border-radius: 6px; font-size: 10px; font-weight: 700; }
    .critical { background: rgba(239,68,68,0.15); color: #fca5a5; }
    .severe { background: rgba(249,115,22,0.15); color: #fdba74; }
    .moderate { background: rgba(245,158,11,0.15); color: #fcd34d; }
    .mild { background: rgba(34,197,94,0.15); color: #86efac; }
    .normal { background: rgba(59,130,246,0.15); color: #93c5fd; }
    .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #1e293b; color: #475569; font-size: 10px; }
    .disclaimer { background: rgba(245,158,11,0.08); border: 1px solid rgba(245,158,11,0.2); border-radius: 10px; padding: 14px; margin-top: 24px; }
    .disclaimer p { font-size: 11px; color: #fbbf24; line-height: 1.6; }
    @media print { body { background: white; color: #1e293b; } th { background: #f1f5f9; color: #334155; border-color: #e2e8f0; } td { border-color: #e2e8f0; color: #334155; } .meta-card { background: #f8fafc; border-color: #e2e8f0; } .header h1 { -webkit-text-fill-color: #3b82f6; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>MediVision CDS — Analysis Report</h1>
    <p>Generated ${now.toLocaleString()} • ${analysis.modality} • Ensemble Confidence: ${Math.round(analysis.ensembleConfidence * 100)}%</p>
  </div>

  <div class="meta-grid">
    <div class="meta-card">
      <div class="label">Modality</div>
      <div class="value" style="font-size:16px;color:#e2e8f0;">${analysis.modality}</div>
    </div>
    <div class="meta-card">
      <div class="label">Overall Severity</div>
      <div class="value"><span class="badge ${analysis.overallSeverity.toLowerCase()}">${analysis.overallSeverity}</span></div>
    </div>
    <div class="meta-card">
      <div class="label">Ensemble Confidence</div>
      <div class="value" style="color:#22c55e;">${Math.round(analysis.ensembleConfidence * 100)}%</div>
    </div>
  </div>

  <div class="section">
    <h2>Primary Clinical Driver</h2>
    <p style="font-size:18px;font-weight:700;color:#f8fafc;margin-bottom:8px;">${analysis.primaryClinicalDriver}</p>
    <p style="font-size:12px;color:#94a3b8;">Model Agreement: ${analysis.modelAgreement} • Image Quality: ${analysis.imageQuality}</p>
  </div>

  ${patientHistory ? `
  <div class="section">
    <h2>Patient History</h2>
    <p style="font-size:13px;line-height:1.6;color:#cbd5e1;">${patientHistory}</p>
  </div>` : ''}

  <div class="section">
    <h2>Findings (${analysis.findings.length})</h2>
    <table>
      <thead>
        <tr><th>#</th><th>Region</th><th>Pattern</th><th>Severity</th><th>Confidence</th><th>Description</th></tr>
      </thead>
      <tbody>${findingsHTML}</tbody>
    </table>
  </div>

  <div class="section">
    <h2>Ensemble Model Contributions</h2>
    <table>
      <thead>
        <tr><th>Model</th><th>Prediction</th><th>Confidence</th><th>Reasoning</th></tr>
      </thead>
      <tbody>${ensembleHTML}</tbody>
    </table>
  </div>

  ${insight ? `
  <div class="section">
    <h2>Clinical Radiology Report</h2>
    <div style="margin-bottom:16px;padding:16px;background:#0f172a;border-radius:12px;border:1px solid #1e293b;border-left:4px solid #3b82f6;">
      <h3 style="color:#3b82f6;text-transform:uppercase;font-size:10px;margin-bottom:8px;">I. Findings</h3>
      <p style="font-size:13px;line-height:1.6;color:#cbd5e1;">${insight.findings}</p>
    </div>
    <div style="margin-bottom:16px;padding:16px;background:rgba(168,85,247,0.04);border-radius:12px;border:1px solid #1e293b;border-left:4px solid #a855f7;">
      <h3 style="color:#a855f7;text-transform:uppercase;font-size:10px;margin-bottom:8px;">II. Impression</h3>
      <p style="font-size:14px;line-height:1.6;font-weight:700;color:#f8fafc;">${insight.impression}</p>
    </div>
    <div style="margin-bottom:16px;padding:16px;background:#0f172a;border-radius:12px;border:1px solid #1e293b;border-left:4px solid #14b8a6;">
      <h3 style="color:#14b8a6;text-transform:uppercase;font-size:10px;margin-bottom:8px;">III. Recommendations</h3>
      <p style="font-size:13px;line-height:1.6;color:#cbd5e1;">${insight.recommendations}</p>
    </div>
  </div>

  ${insight.criticalFindings?.length ? `
  <div class="section">
    <h2 style="color:#ef4444;">Critical Findings</h2>
    <ul style="padding-left:20px;">
      ${insight.criticalFindings.map(f => `<li style="color:#fca5a5;margin-bottom:4px;font-size:13px;">${f}</li>`).join('')}
    </ul>
  </div>` : ''}

  ${insight.differentialDiagnosis?.length ? `
  <div class="section">
    <h2>Differential Diagnosis</h2>
    <div style="display:flex;gap:8px;flex-wrap:wrap;">
      ${insight.differentialDiagnosis.map(d => `<span class="badge normal">${d}</span>`).join('')}
    </div>
  </div>` : ''}

  ${insight.suggestedActions?.length ? `
  <div class="section">
    <h2>Suggested Actions</h2>
    <ol style="padding-left:20px;">
      ${insight.suggestedActions.map(a => `<li style="color:#cbd5e1;margin-bottom:6px;font-size:13px;">${a}</li>`).join('')}
    </ol>
  </div>` : ''}` : ''}

  ${annotations.length > 0 ? `
  <div class="section">
    <h2>Annotations (${annotations.length})</h2>
    <p style="font-size:12px;color:#94a3b8;">${annotations.filter(a => a.type === 'circle').length} circles, ${annotations.filter(a => a.type === 'arrow').length} arrows, ${annotations.filter(a => a.type === 'text').length} text labels</p>
    ${annotations.filter(a => a.label).map(a => `<p style="font-size:12px;color:#cbd5e1;margin-top:4px;">📝 "${a.label}" at (${Math.round(a.x)}%, ${Math.round(a.y)}%)</p>`).join('')}
  </div>` : ''}

  ${analysis.limitations?.length ? `
  <div class="section">
    <h2>Limitations</h2>
    <ul style="padding-left:20px;">
      ${analysis.limitations.map(l => `<li style="color:#94a3b8;margin-bottom:4px;font-size:12px;">${l}</li>`).join('')}
    </ul>
  </div>` : ''}

  <div class="disclaimer">
    <p>⚠ <strong>Disclaimer:</strong> This report is generated by AI for clinical decision support only and is NOT a substitute for professional medical diagnosis. All findings should be verified by qualified healthcare professionals. Do not make treatment decisions based solely on this analysis.</p>
  </div>

  <div class="footer">
    <p>MediVision CDS v2.0 • Gemini Vision + ML Ensemble • Report ID: RPT-${Date.now().toString(36).toUpperCase()}</p>
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
    a.download = `MediVision_Report_${new Date().toISOString().slice(0, 10)}.html`;
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
  );
};
