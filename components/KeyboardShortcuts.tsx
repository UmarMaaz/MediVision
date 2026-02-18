
import React, { useEffect, useState } from 'react';

interface KeyboardShortcutsProps {
    onRunAnalysis: () => void;
    onToggleHeatmap: () => void;
    onInvertColors: () => void;
    onResetView: () => void;
    onZoomIn: () => void;
    onZoomOut: () => void;
    onToggleFullscreen: () => void;
    onUpload: () => void;
    isEnabled: boolean;
}

const SHORTCUTS = [
    { key: 'Space', label: 'Run Analysis', action: 'runAnalysis' },
    { key: 'H', label: 'Toggle Heatmap', action: 'toggleHeatmap' },
    { key: 'I', label: 'Invert Colors', action: 'invertColors' },
    { key: 'R', label: 'Reset View', action: 'resetView' },
    { key: '+', label: 'Zoom In', action: 'zoomIn' },
    { key: '−', label: 'Zoom Out', action: 'zoomOut' },
    { key: 'F', label: 'Fullscreen', action: 'fullscreen' },
    { key: 'U', label: 'Upload Image', action: 'upload' },
    { key: '?', label: 'Show Shortcuts', action: 'showHelp' },
];

export const KeyboardShortcuts: React.FC<KeyboardShortcutsProps> = ({
    onRunAnalysis, onToggleHeatmap, onInvertColors, onResetView,
    onZoomIn, onZoomOut, onToggleFullscreen, onUpload, isEnabled
}) => {
    const [showHelp, setShowHelp] = useState(false);

    useEffect(() => {
        if (!isEnabled) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            // Don't fire if user is typing in an input/textarea
            if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

            switch (e.key.toLowerCase()) {
                case ' ':
                    e.preventDefault();
                    onRunAnalysis();
                    break;
                case 'h':
                    onToggleHeatmap();
                    break;
                case 'i':
                    onInvertColors();
                    break;
                case 'r':
                    onResetView();
                    break;
                case '=':
                case '+':
                    onZoomIn();
                    break;
                case '-':
                    onZoomOut();
                    break;
                case 'f':
                    onToggleFullscreen();
                    break;
                case 'u':
                    onUpload();
                    break;
                case '?':
                    setShowHelp(prev => !prev);
                    break;
                case 'escape':
                    setShowHelp(false);
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isEnabled, onRunAnalysis, onToggleHeatmap, onInvertColors, onResetView, onZoomIn, onZoomOut, onToggleFullscreen, onUpload]);

    if (!showHelp) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center" onClick={() => setShowHelp(false)}>
            <div className="absolute inset-0" style={{ background: 'rgba(5, 10, 24, 0.8)', backdropFilter: 'blur(8px)' }} />
            <div className="relative glass-card p-6 w-full max-w-md mx-4 animate-fade-in" style={{ borderRadius: 'var(--radius-xl)' }}
                onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-5">
                    <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>⌨ Keyboard Shortcuts</h3>
                    <button onClick={() => setShowHelp(false)} className="btn-icon !w-8 !h-8">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                <div className="space-y-2">
                    {SHORTCUTS.map(s => (
                        <div key={s.key} className="flex items-center justify-between py-2 px-3 rounded-lg"
                            style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)' }}>
                            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{s.label}</span>
                            <kbd className="px-2.5 py-1 rounded text-[10px] font-bold"
                                style={{
                                    background: 'var(--bg-tertiary)',
                                    border: '1px solid var(--border-medium)',
                                    color: 'var(--accent-primary-light)',
                                    fontFamily: 'var(--font-mono)'
                                }}>
                                {s.key}
                            </kbd>
                        </div>
                    ))}
                </div>
                <p className="text-[10px] text-center mt-4" style={{ color: 'var(--text-muted)' }}>
                    Press <kbd className="px-1.5 py-0.5 rounded text-[9px]" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)' }}>Esc</kbd> to close
                </p>
            </div>
        </div>
    );
};
