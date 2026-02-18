
import React from 'react';
import { ImageAdjustments } from '../types';

interface ImageControlsProps {
    adjustments: ImageAdjustments;
    onAdjust: (adj: ImageAdjustments) => void;
    onReset: () => void;
}

export const ImageControls: React.FC<ImageControlsProps> = ({ adjustments, onAdjust, onReset }) => {
    const sliders = [
        { label: 'Brightness', key: 'brightness' as keyof ImageAdjustments, icon: '☀️' },
        { label: 'Contrast', key: 'contrast' as keyof ImageAdjustments, icon: '◐' },
    ];

    const isDefault = adjustments.brightness === 0 && adjustments.contrast === 0;

    return (
        <div className="glass-dark p-3 space-y-3" style={{ borderRadius: 'var(--radius-md)' }}>
            <div className="flex items-center justify-between">
                <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                    Window / Level
                </span>
                {!isDefault && (
                    <button onClick={onReset} className="text-[9px] font-bold uppercase tracking-widest transition-opacity hover:opacity-70" style={{ color: 'var(--accent-primary-light)' }}>
                        Reset
                    </button>
                )}
            </div>
            {sliders.map(s => (
                <div key={s.key} className="space-y-1">
                    <div className="flex items-center justify-between">
                        <span className="text-[9px] flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
                            <span>{s.icon}</span> {s.label}
                        </span>
                        <span className="text-[9px] font-bold" style={{ color: 'var(--text-muted)' }}>
                            {adjustments[s.key] > 0 ? '+' : ''}{adjustments[s.key]}
                        </span>
                    </div>
                    <input
                        type="range"
                        min={-100}
                        max={100}
                        value={adjustments[s.key]}
                        onChange={e => onAdjust({ ...adjustments, [s.key]: parseInt(e.target.value) })}
                        className="slider"
                    />
                </div>
            ))}
        </div>
    );
};
