
import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { UserRole, AnalysisResult, MedicalInsight, PipelineStep, Modality, Annotation, AnalysisSession, ImageAdjustments } from './types';
import { Disclaimer } from './components/Disclaimer';
import { AnalysisPanel } from './components/AnalysisPanel';
import { HeatmapOverlay } from './components/HeatmapOverlay';
import { LoadingPipeline } from './components/LoadingPipeline';
import { KeyboardShortcuts } from './components/KeyboardShortcuts';
import { OnboardingTour } from './components/OnboardingTour';
import { HistoryTimeline } from './components/HistoryTimeline';
import { AnnotationCanvas } from './components/AnnotationCanvas';
import { ImageControls } from './components/ImageControls';
import { ReportExport } from './components/ReportExport';
import { VoiceInput } from './components/VoiceInput';
import { analyzeMedicalImage, generateMedicalInsights } from './services/geminiService';
import { APP_NAME, APP_VERSION } from './constants';

const MODALITY_ICONS: Record<string, string> = {
  [Modality.XRAY]: '🩻',
  [Modality.CT_SCAN]: '🔬',
  [Modality.MRI]: '🧲',
  [Modality.ULTRASOUND]: '📡',
  [Modality.MAMMOGRAPHY]: '🎗️',
  [Modality.PET_SCAN]: '⚡',
  [Modality.DENTAL_XRAY]: '🦷',
};

const MODALITY_DESCRIPTIONS: Record<string, string> = {
  [Modality.XRAY]: 'RadImageNet + CheXNet',
  [Modality.CT_SCAN]: 'RadImageNet + Med-SAM',
  [Modality.MRI]: 'RadImageNet + Med-SAM',
  [Modality.ULTRASOUND]: 'BiomedCLIP + Med-SAM',
  [Modality.MAMMOGRAPHY]: 'RadImageNet + BiomedCLIP',
  [Modality.PET_SCAN]: 'RadImageNet + BiomedCLIP',
  [Modality.DENTAL_XRAY]: 'CheXNet + BiomedCLIP',
};

const HISTORY_KEY = 'medivision_history';

/** Create a small thumbnail from a data URL */
const createThumbnail = (dataUrl: string, size = 80): Promise<string> => {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d')!;
      const scale = Math.max(size / img.width, size / img.height);
      const x = (size - img.width * scale) / 2;
      const y = (size - img.height * scale) / 2;
      ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
      resolve(canvas.toDataURL('image/jpeg', 0.5));
    };
    img.src = dataUrl;
  });
};

const App: React.FC = () => {
  const [role, setRole] = useState<UserRole>(UserRole.DOCTOR);
  const [selectedModality, setSelectedModality] = useState<Modality | null>(null);
  const [image, setImage] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [insight, setInsight] = useState<MedicalInsight | null>(null);
  const [step, setStep] = useState<PipelineStep>('idle');
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [activeFindingIndices, setActiveFindingIndices] = useState<number[]>([]);
  const [patientHistory, setPatientHistory] = useState("");
  const [dragOver, setDragOver] = useState(false);

  // Image viewer state
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [invertColors, setInvertColors] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [imageAdjustments, setImageAdjustments] = useState<ImageAdjustments>({ brightness: 0, contrast: 0 });

  // Annotation state
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [annotationTool, setAnnotationTool] = useState<'none' | 'circle' | 'arrow' | 'text'>('none');

  // Comparison view
  const [comparisonImage, setComparisonImage] = useState<string | null>(null);
  const [showComparison, setShowComparison] = useState(false);
  const comparisonInputRef = useRef<HTMLInputElement>(null);

  // History
  const [history, setHistory] = useState<AnalysisSession[]>([]);

  // Toast
  const [toast, setToast] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const viewerRef = useRef<HTMLDivElement>(null);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const lastOffset = useRef({ x: 0, y: 0 });

  // Load history from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(HISTORY_KEY);
      if (stored) setHistory(JSON.parse(stored));
    } catch { }
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const saveToHistory = async (res: AnalysisResult, ins: MedicalInsight | null, imgData: string) => {
    const thumb = await createThumbnail(imgData);
    const session: AnalysisSession = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      modality: res.modality,
      primaryFinding: res.primaryClinicalDriver,
      severity: res.overallSeverity,
      confidence: res.ensembleConfidence,
      imageThumb: thumb,
      findings: res.findings,
      analysis: res,
      insight: ins,
    };
    const updated = [session, ...history].slice(0, 20);
    setHistory(updated);
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(updated)); } catch { }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) loadImage(file);
  };

  const loadImage = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      setImage(event.target?.result as string);
      setAnalysis(null);
      setInsight(null);
      setShowHeatmap(false);
      setActiveFindingIndices([]);
      setAnnotations([]);
      setAnnotationTool('none');
      setStep('idle');
      resetView();
    };
    reader.readAsDataURL(file);
  };

  const handleComparisonUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setComparisonImage(event.target?.result as string);
      setShowComparison(true);
      showToast('📊 Comparison view enabled');
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) loadImage(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const resetView = () => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
    lastOffset.current = { x: 0, y: 0 };
    setInvertColors(false);
    setImageAdjustments({ brightness: 0, contrast: 0 });
  };

  const handleZoom = useCallback((delta: number, centerX?: number, centerY?: number) => {
    setScale(prevScale => {
      const newScale = Math.min(Math.max(prevScale * delta, 0.5), 20);
      if (centerX !== undefined && centerY !== undefined && viewerRef.current) {
        const rect = viewerRef.current.getBoundingClientRect();
        const mouseX = centerX - rect.left - rect.width / 2;
        const mouseY = centerY - rect.top - rect.height / 2;
        const ratio = 1 - delta;
        setOffset(prev => {
          const nextOffset = { x: prev.x + (mouseX - prev.x) * ratio, y: prev.y + (mouseY - prev.y) * ratio };
          lastOffset.current = nextOffset;
          return nextOffset;
        });
      }
      return newScale;
    });
  }, []);

  const handleWheel = (e: React.WheelEvent) => {
    if (!image) return;
    e.preventDefault();
    handleZoom(e.deltaY > 0 ? 0.9 : 1.1, e.clientX, e.clientY);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!image || annotationTool !== 'none') return;
    setIsDragging(true);
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    lastOffset.current = offset;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setOffset({
      x: lastOffset.current.x + e.clientX - dragStartPos.current.x,
      y: lastOffset.current.y + e.clientY - dragStartPos.current.y
    });
  };

  const handleMouseUp = () => {
    if (isDragging) {
      setIsDragging(false);
      lastOffset.current = offset;
    }
  };

  const toggleFinding = (index: number) => {
    setActiveFindingIndices(prev =>
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(prev => !prev);
  }, []);

  const loadSession = (session: AnalysisSession) => {
    setAnalysis(session.analysis);
    setInsight(session.insight);
    setSelectedModality(session.modality);
    setStep('complete');
    setActiveFindingIndices(session.findings.map((_, i) => i));
    showToast(`📂 Loaded: ${session.primaryFinding}`);
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem(HISTORY_KEY);
    showToast('🗑️ History cleared');
  };

  const runPipeline = useCallback(async () => {
    if (!image || !selectedModality) return;
    try {
      setStep('quality-check');
      await new Promise(r => setTimeout(r, 300));
      setStep('scanning');
      const result = await analyzeMedicalImage(image, selectedModality, patientHistory);
      setStep('ensemble');
      setAnalysis(result);
      setActiveFindingIndices(result.findings.map((_, i) => i));
      await new Promise(r => setTimeout(r, 200));
      setStep('reasoning');
      const insights = await generateMedicalInsights(result, role, patientHistory);
      setInsight(insights);
      setStep('complete');
      setShowHeatmap(true);
      await saveToHistory(result, insights, image);
      showToast('✅ Analysis complete — Results saved');
    } catch (error) {
      console.error('Pipeline error:', error);
      setStep('error');
      showToast('❌ Pipeline failed — check console');
    }
  }, [image, selectedModality, role, patientHistory]);

  const isLoading = useMemo(() => ['quality-check', 'scanning', 'ensemble', 'reasoning'].includes(step), [step]);

  // Build image filter string
  const imageFilter = useMemo(() => {
    const parts: string[] = [];
    if (invertColors) parts.push('invert(1)');
    if (imageAdjustments.brightness !== 0) parts.push(`brightness(${1 + imageAdjustments.brightness / 100})`);
    if (imageAdjustments.contrast !== 0) parts.push(`contrast(${1 + imageAdjustments.contrast / 100})`);
    return parts.length ? parts.join(' ') : 'none';
  }, [invertColors, imageAdjustments]);

  // ─── Render the image viewer content ───
  const renderViewer = (isFS = false) => (
    <div
      ref={!isFS ? viewerRef : undefined}
      className={`relative overflow-hidden flex items-center justify-center select-none ${image ? (annotationTool !== 'none' ? 'cursor-crosshair' : isDragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-pointer'
        } ${dragOver ? 'drag-over' : ''}`}
      style={{
        background: 'var(--bg-secondary)',
        borderRadius: isFS ? 0 : 'var(--radius-xl)',
        border: isFS ? 'none' : dragOver ? '2px solid var(--accent-primary)' : '2px solid var(--border-subtle)',
        aspectRatio: isFS ? 'auto' : '1',
        height: isFS ? '100%' : 'auto',
        boxShadow: isFS ? 'none' : 'var(--shadow-lg)',
        transition: 'border-color 0.3s'
      }}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={() => setDragOver(false)}
    >
      {image ? (
        <>
          <div
            className="w-full h-full flex items-center justify-center will-change-transform"
            style={{
              transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
              transformOrigin: 'center',
              filter: imageFilter
            }}
          >
            <img src={image} className="max-w-full max-h-full object-contain pointer-events-none" alt="Medical Scan" />
            <HeatmapOverlay
              findings={analysis?.findings || []}
              visible={showHeatmap}
              activeIndices={activeFindingIndices}
            />
          </div>

          {/* Annotation Canvas */}
          <AnnotationCanvas
            annotations={annotations}
            onAddAnnotation={ann => setAnnotations(prev => [...prev, ann])}
            onClearAnnotations={() => { setAnnotations([]); showToast('🗑️ Annotations cleared'); }}
            activeTool={annotationTool}
            onToolChange={setAnnotationTool}
          />

          {/* Top-left info overlay */}
          <div className="absolute top-4 left-4 z-30 flex flex-col gap-2">
            <div className="glass-dark px-3 py-1.5 flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest"
              style={{ borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)' }}>
              <span>{selectedModality && MODALITY_ICONS[selectedModality]}</span>
              <span>{selectedModality}</span>
              <div className="w-px h-3" style={{ background: 'var(--border-subtle)' }} />
              <span style={{ color: 'var(--text-muted)' }}>{Math.round(scale * 100)}%</span>
            </div>
            {analysis && (
              <div className="glass-dark px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest"
                style={{ borderRadius: 'var(--radius-sm)', color: 'var(--severity-normal)' }}>
                ✓ Analysis Complete
              </div>
            )}
          </div>

          {/* Viewport toolbar */}
          <div className={`absolute ${isFS ? 'bottom-8' : 'bottom-4'} left-1/2 -translate-x-1/2 z-30 glass-dark flex items-center gap-0.5 p-1`}
            style={{ borderRadius: 'var(--radius-md)' }}>
            <button onClick={() => handleZoom(1.2)} className="btn-icon !w-9 !h-9 !border-0" title="Zoom In (+)">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
              </svg>
            </button>
            <button onClick={() => handleZoom(0.8)} className="btn-icon !w-9 !h-9 !border-0" title="Zoom Out (−)">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M20 12H4" />
              </svg>
            </button>
            <div className="w-px h-5 mx-0.5" style={{ background: 'var(--border-subtle)' }} />
            <button onClick={resetView} className="btn-icon !w-9 !h-9 !border-0" title="Reset View (R)">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            <button onClick={() => setInvertColors(!invertColors)} className="btn-icon !w-9 !h-9 !border-0" title="Invert Colors (I)"
              style={invertColors ? { color: 'var(--accent-primary-light)', background: 'rgba(59, 130, 246, 0.15)' } : {}}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </button>
            <div className="w-px h-5 mx-0.5" style={{ background: 'var(--border-subtle)' }} />
            <button onClick={toggleFullscreen} className="btn-icon !w-9 !h-9 !border-0" title="Fullscreen (F)">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isFS ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                )}
              </svg>
            </button>
          </div>
        </>
      ) : (
        /* Upload dropzone */
        <div
          className="flex flex-col items-center gap-4 p-8 text-center w-full h-full justify-center"
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center animate-float"
            style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid var(--border-accent)' }}>
            <svg className="w-7 h-7" style={{ color: 'var(--accent-primary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
              Upload {selectedModality} Image
            </h3>
            <p className="text-[10px] font-bold uppercase tracking-widest mt-1" style={{ color: 'var(--text-muted)' }}>
              Drag & drop or click • PNG / JPG / DICOM
            </p>
          </div>
          <div className="flex flex-wrap gap-2 justify-center">
            {['CheXNet', 'BiomedCLIP', 'Med-SAM', 'Gemini'].map(model => (
              <span key={model} className="badge badge-blue">{model}</span>
            ))}
          </div>
        </div>
      )}
      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-primary)' }}>

      {/* ═══ ONBOARDING TOUR ═══ */}
      <OnboardingTour onComplete={() => showToast('🎉 Welcome to MediVision CDS!')} />

      {/* ═══ KEYBOARD SHORTCUTS ═══ */}
      <KeyboardShortcuts
        onRunAnalysis={runPipeline}
        onToggleHeatmap={() => { if (analysis) setShowHeatmap(p => !p); }}
        onInvertColors={() => setInvertColors(p => !p)}
        onResetView={resetView}
        onZoomIn={() => handleZoom(1.2)}
        onZoomOut={() => handleZoom(0.8)}
        onToggleFullscreen={toggleFullscreen}
        onUpload={() => fileInputRef.current?.click()}
        isEnabled={!!selectedModality}
      />

      {/* ═══ FULLSCREEN VIEWER ═══ */}
      {isFullscreen && image && (
        <div className="fullscreen-viewer animate-fade-in">
          {renderViewer(true)}
          {/* Image controls in fullscreen */}
          <div className="absolute top-4 left-4 z-30 w-56">
            <ImageControls
              adjustments={imageAdjustments}
              onAdjust={setImageAdjustments}
              onReset={() => setImageAdjustments({ brightness: 0, contrast: 0 })}
            />
          </div>
        </div>
      )}

      {/* ═══ NAVBAR ═══ */}
      <nav className="glass-dark sticky top-0 z-50 h-16 px-4 md:px-8" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="max-w-[1440px] mx-auto h-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-white text-sm"
              style={{ background: 'var(--accent-gradient)', boxShadow: 'var(--shadow-glow)' }}>
              M
            </div>
            <div className="hidden sm:block">
              <h1 className="font-black text-base tracking-tight leading-none" style={{ color: 'var(--text-primary)' }}>
                {APP_NAME}
              </h1>
              <p className="text-[8px] font-bold uppercase tracking-[0.25em] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {APP_VERSION} • Gemini Vision + ML Ensemble
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Role Switcher */}
            <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)' }}>
              {Object.values(UserRole).map(r => (
                <button
                  key={r}
                  onClick={() => setRole(r)}
                  className="px-3 md:px-5 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all"
                  style={{
                    background: role === r ? 'var(--bg-card)' : 'transparent',
                    color: role === r ? 'var(--accent-primary-light)' : 'var(--text-muted)',
                    boxShadow: role === r ? 'var(--shadow-sm)' : 'none'
                  }}
                >
                  {r}
                </button>
              ))}
            </div>
            {/* Shortcuts hint */}
            <button
              onClick={() => { const e = new KeyboardEvent('keydown', { key: '?' }); window.dispatchEvent(e); }}
              className="btn-icon !w-8 !h-8 hide-on-mobile"
              title="Keyboard Shortcuts (?)"
            >
              <span className="text-xs">⌨</span>
            </button>
          </div>
        </div>
      </nav>

      {/* ═══ MAIN CONTENT ═══ */}
      <main className="flex-1 max-w-[1440px] mx-auto w-full px-4 md:px-8 py-6 md:py-8 grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 items-start">

        {/* ─── LEFT COLUMN: Viewer ─── */}
        <div className="lg:col-span-7 space-y-4 animate-fade-in">
          <Disclaimer />

          {!selectedModality ? (
            /* Modality Selection */
            <div className="glass-card p-6 md:p-8 text-center space-y-6" style={{ borderRadius: 'var(--radius-xl)' }}>
              <div className="space-y-2">
                <h2 className="text-xl md:text-2xl font-black tracking-tight text-gradient">
                  Select Imaging Modality
                </h2>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Each modality loads specialized ML models trained for that scan type
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {Object.values(Modality).map(m => (
                  <button
                    key={m}
                    onClick={() => setSelectedModality(m)}
                    className="glass-card flex items-center gap-3 p-4 text-left group transition-all"
                    style={{ borderRadius: 'var(--radius-md)' }}
                  >
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                      style={{ background: 'var(--bg-primary)' }}>
                      {MODALITY_ICONS[m]}
                    </div>
                    <div className="min-w-0">
                      <span className="text-[10px] font-bold uppercase tracking-widest block" style={{ color: 'var(--text-primary)' }}>
                        {m}
                      </span>
                      <span className="text-[8px] font-bold uppercase tracking-wider block mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        {MODALITY_DESCRIPTIONS[m]}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Comparison View */}
              {showComparison && comparisonImage && image ? (
                <div className="comparison-container">
                  <div className="comparison-pane">
                    <span className="comparison-label glass-dark" style={{ color: 'var(--text-muted)' }}>Previous</span>
                    <img src={comparisonImage} alt="Previous scan" style={{ filter: imageFilter }} />
                  </div>
                  <div className="comparison-pane">
                    <span className="comparison-label glass-dark" style={{ color: 'var(--accent-primary-light)' }}>Current</span>
                    <img src={image} alt="Current scan" style={{ filter: imageFilter }} />
                  </div>
                </div>
              ) : (
                renderViewer()
              )}

              {/* Image Controls (brightness/contrast) */}
              {image && (
                <ImageControls
                  adjustments={imageAdjustments}
                  onAdjust={setImageAdjustments}
                  onReset={() => setImageAdjustments({ brightness: 0, contrast: 0 })}
                />
              )}

              {/* Action Buttons */}
              <div className="grid grid-cols-4 gap-3">
                <button
                  disabled={!image || isLoading}
                  onClick={runPipeline}
                  className="btn-primary col-span-2 !rounded-xl"
                  style={{ padding: '16px' }}
                >
                  {isLoading ? '◉ Pipeline Running...' : '▶ Run Analysis'}
                </button>
                <button
                  onClick={() => setShowHeatmap(!showHeatmap)}
                  disabled={!analysis}
                  className="btn-ghost !rounded-xl"
                  style={showHeatmap ? {
                    background: 'rgba(239, 68, 68, 0.1)',
                    borderColor: 'rgba(239, 68, 68, 0.3)',
                    color: '#fb7185'
                  } : {}}
                >
                  {showHeatmap ? 'Hide Map' : 'Heatmap'}
                </button>
                <button
                  onClick={() => {
                    if (showComparison) {
                      setShowComparison(false);
                      setComparisonImage(null);
                    } else {
                      comparisonInputRef.current?.click();
                    }
                  }}
                  disabled={!image}
                  className="btn-ghost !rounded-xl"
                  style={showComparison ? {
                    background: 'rgba(139, 92, 246, 0.1)',
                    borderColor: 'rgba(139, 92, 246, 0.3)',
                    color: '#a78bfa'
                  } : {}}
                >
                  {showComparison ? 'Single' : 'Compare'}
                </button>
              </div>
              <input type="file" ref={comparisonInputRef} className="hidden" accept="image/*" onChange={handleComparisonUpload} />

              {/* Export + Voice row */}
              <div className="flex items-center gap-3">
                {analysis && (
                  <ReportExport analysis={analysis} insight={insight} annotations={annotations} patientHistory={patientHistory} />
                )}
                <div className="flex-1" />
                {role === UserRole.DOCTOR && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Voice</span>
                    <VoiceInput onTranscript={setPatientHistory} currentText={patientHistory} />
                  </div>
                )}
              </div>

              {/* Navigation */}
              <button
                onClick={() => {
                  setImage(null);
                  setSelectedModality(null);
                  setStep('idle');
                  setAnalysis(null);
                  setInsight(null);
                  setComparisonImage(null);
                  setShowComparison(false);
                  setAnnotations([]);
                  resetView();
                }}
                className="btn-ghost w-full !rounded-xl text-[10px] uppercase tracking-widest"
              >
                ← Change Modality
              </button>
            </div>
          )}
        </div>

        {/* ─── RIGHT COLUMN: Analysis ─── */}
        <div className="lg:col-span-5 space-y-4 animate-fade-in delay-1">
          {/* Pipeline Loading */}
          <LoadingPipeline currentStep={step} />

          {/* Skeleton Loading State */}
          {isLoading && !analysis && (
            <div className="glass-card p-6 space-y-4 skeleton-card" style={{ borderRadius: 'var(--radius-xl)' }}>
              <div className="flex items-center gap-3">
                <div className="skeleton skeleton-circle" style={{ width: 48, height: 48 }} />
                <div className="flex-1 space-y-2">
                  <div className="skeleton skeleton-text lg" />
                  <div className="skeleton skeleton-text sm" />
                </div>
              </div>
              <div className="skeleton skeleton-text lg" />
              <div className="skeleton skeleton-text md" />
              <div className="skeleton skeleton-text sm" />
              <div className="flex gap-2">
                <div className="skeleton" style={{ width: 60, height: 22, borderRadius: 99 }} />
                <div className="skeleton" style={{ width: 80, height: 22, borderRadius: 99 }} />
                <div className="skeleton" style={{ width: 50, height: 22, borderRadius: 99 }} />
              </div>
              <div className="space-y-3 mt-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="p-4 rounded-xl space-y-2" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)' }}>
                    <div className="skeleton skeleton-text md" />
                    <div className="skeleton skeleton-text lg" />
                    <div className="skeleton skeleton-text sm" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Analysis Panel */}
          <AnalysisPanel
            analysis={analysis}
            insight={insight}
            role={role}
            step={step}
            activeFindingIndices={activeFindingIndices}
            onToggleFinding={toggleFinding}
            patientHistory={patientHistory}
            onHistoryChange={setPatientHistory}
          />

          {/* Differential Diagnosis "Did You Consider?" */}
          {analysis && insight && insight.differentialDiagnosis && insight.differentialDiagnosis.length > 0 && step === 'complete' && role !== UserRole.GENERAL && (
            <div className="diff-diag-card animate-fade-in">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-base">🤔</span>
                <h4 className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--accent-tertiary)' }}>
                  Did You Consider?
                </h4>
              </div>
              <p className="text-[11px] mb-3" style={{ color: 'var(--text-secondary)' }}>
                Based on the imaging pattern, these differentials share overlapping features:
              </p>
              <div className="flex flex-wrap gap-2">
                {insight.differentialDiagnosis.map((d, i) => (
                  <span key={i} className="badge badge-purple">{d}</span>
                ))}
              </div>
            </div>
          )}

          {/* History Timeline */}
          <HistoryTimeline sessions={history} onLoadSession={loadSession} onClearHistory={clearHistory} />

          {/* Idle State */}
          {step === 'idle' && !analysis && (
            <div className="glass-card p-8 flex flex-col items-center justify-center text-center space-y-4"
              style={{ borderRadius: 'var(--radius-xl)', border: '2px dashed var(--border-subtle)' }}>
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{ background: 'rgba(148, 163, 184, 0.05)' }}>
                <svg className="w-7 h-7" style={{ color: 'var(--text-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                  System Awaiting Input
                </p>
                <p className="text-[11px] mt-1 max-w-[220px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                  Select a modality and upload a medical image to begin ensemble neural analysis.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 justify-center">
                <span className="badge badge-blue">CheXNet</span>
                <span className="badge badge-emerald">Med-SAM</span>
                <span className="badge badge-purple">BiomedCLIP</span>
                <span className="badge badge-amber">RadImageNet</span>
              </div>
              <p className="text-[9px]" style={{ color: 'var(--text-muted)' }}>
                Press <kbd className="px-1.5 py-0.5 rounded text-[8px]" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)' }}>?</kbd> for keyboard shortcuts
              </p>
            </div>
          )}

          {/* Error State */}
          {step === 'error' && (
            <div className="glass-card p-6 text-center space-y-3"
              style={{ borderRadius: 'var(--radius-xl)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
              <div className="w-12 h-12 rounded-xl mx-auto flex items-center justify-center"
                style={{ background: 'rgba(239, 68, 68, 0.1)' }}>
                <svg className="w-6 h-6" style={{ color: '#ef4444' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-sm font-bold" style={{ color: '#ef4444' }}>Analysis Error</h3>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                The pipeline couldn't complete. Check your API key and image quality.
              </p>
              <button onClick={runPipeline} className="btn-primary !py-2.5 !px-6 !text-[10px]">
                Retry Analysis
              </button>
            </div>
          )}
        </div>
      </main>

      {/* ═══ FOOTER ═══ */}
      <footer className="px-4 md:px-8 py-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
        <div className="max-w-[1440px] mx-auto flex flex-col sm:flex-row justify-between items-center gap-2">
          <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
            {APP_NAME} {APP_VERSION} • For clinical decision support only • Press ? for shortcuts
          </p>
          <div className="flex items-center gap-3">
            <span className="badge badge-blue">Gemini Vision</span>
            <span className="badge badge-emerald">CheXNet</span>
            <span className="badge badge-purple">Med-SAM</span>
          </div>
        </div>
      </footer>

      {/* ═══ TOAST ═══ */}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
};

export default App;
