
import React from 'react';
import { AnalysisSession } from '../types';
import { SEVERITY_CONFIG } from '../constants';

interface HistoryTimelineProps {
    sessions: AnalysisSession[];
    onLoadSession: (session: AnalysisSession) => void;
    onClearHistory: () => void;
}

export const HistoryTimeline: React.FC<HistoryTimelineProps> = ({ sessions, onLoadSession, onClearHistory }) => {
    if (sessions.length === 0) return null;

    const formatTime = (ts: string) => {
        const d = new Date(ts);
        const now = new Date();
        const diff = now.getTime() - d.getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'Just now';
        if (mins < 60) return `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h ago`;
        return d.toLocaleDateString();
    };

    return (
        <div className="glass-card p-4 space-y-3 animate-fade-in" style={{ borderRadius: 'var(--radius-lg)' }}>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <svg className="w-4 h-4" style={{ color: 'var(--accent-primary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <h4 className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-primary)' }}>
                        Recent Analyses
                    </h4>
                </div>
                <button onClick={onClearHistory} className="text-[9px] font-bold uppercase tracking-widest hover:opacity-70 transition-opacity" style={{ color: 'var(--text-muted)' }}>
                    Clear
                </button>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto no-scrollbar">
                {sessions.slice(0, 10).map(session => {
                    const sv = SEVERITY_CONFIG[session.severity] || SEVERITY_CONFIG['Normal'];
                    return (
                        <button
                            key={session.id}
                            onClick={() => onLoadSession(session)}
                            className="w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-all"
                            style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)' }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-accent)'; }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; }}
                        >
                            {/* Thumbnail */}
                            <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0"
                                style={{ background: 'var(--bg-secondary)' }}>
                                {session.imageThumb && (
                                    <img src={session.imageThumb} alt="" className="w-full h-full object-cover" style={{ filter: 'brightness(0.8)' }} />
                                )}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                                        {session.primaryFinding}
                                    </span>
                                    <span className={`badge ${sv.bgClass}`} style={{ fontSize: '7px', padding: '1px 5px' }}>
                                        {session.severity}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>{session.modality}</span>
                                    <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>•</span>
                                    <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>{formatTime(session.timestamp)}</span>
                                </div>
                            </div>

                            {/* Confidence */}
                            <span className="text-[9px] font-bold flex-shrink-0" style={{ color: 'var(--accent-primary-light)' }}>
                                {Math.round(session.confidence * 100)}%
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};
