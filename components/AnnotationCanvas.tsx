
import React, { useRef, useEffect, useState } from 'react';
import { Annotation } from '../types';

interface AnnotationCanvasProps {
    annotations: Annotation[];
    onAddAnnotation: (annotation: Annotation) => void;
    onClearAnnotations: () => void;
    activeTool: 'none' | 'circle' | 'arrow' | 'text';
    onToolChange: (tool: 'none' | 'circle' | 'arrow' | 'text') => void;
}

export const AnnotationCanvas: React.FC<AnnotationCanvasProps> = ({
    annotations, onAddAnnotation, onClearAnnotations, activeTool, onToolChange
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [startPos, setStartPos] = useState({ x: 0, y: 0 });
    const [textInput, setTextInput] = useState('');
    const [textPos, setTextPos] = useState<{ x: number; y: number } | null>(null);

    const colors = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#a855f7'];
    const [activeColor, setActiveColor] = useState(colors[0]);

    const getRelativePos = (e: React.MouseEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        return {
            x: ((e.clientX - rect.left) / rect.width) * 100,
            y: ((e.clientY - rect.top) / rect.height) * 100
        };
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if (activeTool === 'none') return;
        const pos = getRelativePos(e);

        if (activeTool === 'text') {
            setTextPos(pos);
            return;
        }

        setIsDrawing(true);
        setStartPos(pos);
    };

    const handleMouseUp = (e: React.MouseEvent) => {
        if (!isDrawing || activeTool === 'none') return;
        const endPos = getRelativePos(e);
        setIsDrawing(false);

        if (activeTool === 'circle') {
            const dx = endPos.x - startPos.x;
            const dy = endPos.y - startPos.y;
            const radius = Math.sqrt(dx * dx + dy * dy);
            if (radius < 1) return;
            onAddAnnotation({
                id: Date.now().toString(),
                type: 'circle',
                x: startPos.x,
                y: startPos.y,
                radius,
                color: activeColor
            });
        } else if (activeTool === 'arrow') {
            const dx = endPos.x - startPos.x;
            const dy = endPos.y - startPos.y;
            if (Math.sqrt(dx * dx + dy * dy) < 1) return;
            onAddAnnotation({
                id: Date.now().toString(),
                type: 'arrow',
                x: startPos.x,
                y: startPos.y,
                endX: endPos.x,
                endY: endPos.y,
                color: activeColor
            });
        }
    };

    const handleTextSubmit = () => {
        if (!textPos || !textInput.trim()) return;
        onAddAnnotation({
            id: Date.now().toString(),
            type: 'text',
            x: textPos.x,
            y: textPos.y,
            label: textInput.trim(),
            color: activeColor
        });
        setTextInput('');
        setTextPos(null);
    };

    // Draw annotations on canvas
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const parent = canvas.parentElement;
        if (parent) {
            canvas.width = parent.clientWidth;
            canvas.height = parent.clientHeight;
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        annotations.forEach(ann => {
            const x = (ann.x / 100) * canvas.width;
            const y = (ann.y / 100) * canvas.height;

            ctx.strokeStyle = ann.color;
            ctx.fillStyle = ann.color;
            ctx.lineWidth = 2;

            if (ann.type === 'circle' && ann.radius) {
                const r = (ann.radius / 100) * canvas.width;
                ctx.setLineDash([6, 4]);
                ctx.beginPath();
                ctx.arc(x, y, r, 0, Math.PI * 2);
                ctx.stroke();
                ctx.setLineDash([]);
            } else if (ann.type === 'arrow' && ann.endX !== undefined && ann.endY !== undefined) {
                const ex = (ann.endX / 100) * canvas.width;
                const ey = (ann.endY / 100) * canvas.height;

                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.lineTo(ex, ey);
                ctx.stroke();

                // Arrowhead
                const angle = Math.atan2(ey - y, ex - x);
                const headLen = 12;
                ctx.beginPath();
                ctx.moveTo(ex, ey);
                ctx.lineTo(ex - headLen * Math.cos(angle - Math.PI / 6), ey - headLen * Math.sin(angle - Math.PI / 6));
                ctx.moveTo(ex, ey);
                ctx.lineTo(ex - headLen * Math.cos(angle + Math.PI / 6), ey - headLen * Math.sin(angle + Math.PI / 6));
                ctx.stroke();
            } else if (ann.type === 'text' && ann.label) {
                ctx.font = 'bold 12px Inter, sans-serif';
                const metrics = ctx.measureText(ann.label);
                const pad = 6;

                ctx.fillStyle = 'rgba(5, 10, 24, 0.85)';
                ctx.beginPath();
                ctx.roundRect(x - pad, y - 14, metrics.width + pad * 2, 20, 4);
                ctx.fill();

                ctx.fillStyle = ann.color;
                ctx.fillText(ann.label, x, y);
            }
        });
    }, [annotations]);

    // Resize observer
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas?.parentElement) return;
        const observer = new ResizeObserver(() => {
            canvas.width = canvas.parentElement!.clientWidth;
            canvas.height = canvas.parentElement!.clientHeight;
        });
        observer.observe(canvas.parentElement);
        return () => observer.disconnect();
    }, []);

    const tools = [
        { id: 'none' as const, label: 'Pan', icon: '✋' },
        { id: 'circle' as const, label: 'Circle', icon: '⭕' },
        { id: 'arrow' as const, label: 'Arrow', icon: '➡️' },
        { id: 'text' as const, label: 'Text', icon: '📝' },
    ];

    return (
        <>
            {/* Annotation canvas overlay */}
            <canvas
                ref={canvasRef}
                className="absolute inset-0 z-10"
                style={{
                    pointerEvents: activeTool !== 'none' ? 'auto' : 'none',
                    cursor: activeTool === 'circle' || activeTool === 'arrow' ? 'crosshair' : activeTool === 'text' ? 'text' : 'default'
                }}
                onMouseDown={handleMouseDown}
                onMouseUp={handleMouseUp}
            />

            {/* Text input popup */}
            {textPos && (
                <div className="absolute z-20 animate-fade-in" style={{ left: `${textPos.x}%`, top: `${textPos.y}%` }}>
                    <div className="flex gap-1 glass-dark p-1 rounded-lg">
                        <input
                            autoFocus
                            value={textInput}
                            onChange={e => setTextInput(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') handleTextSubmit(); if (e.key === 'Escape') setTextPos(null); }}
                            placeholder="Label..."
                            className="chat-input !py-1.5 !px-2 !text-xs w-32"
                        />
                        <button onClick={handleTextSubmit} className="btn-primary !py-1.5 !px-3 !text-[9px]">Add</button>
                    </div>
                </div>
            )}

            {/* Annotation toolbar */}
            <div className="absolute top-4 right-4 z-20 flex flex-col gap-1 glass-dark p-1.5"
                style={{ borderRadius: 'var(--radius-md)' }}>
                {tools.map(t => (
                    <button
                        key={t.id}
                        onClick={() => onToolChange(t.id)}
                        className="btn-icon !w-8 !h-8 !border-0 text-sm"
                        title={t.label}
                        style={activeTool === t.id && t.id !== 'none' ? {
                            background: 'rgba(59, 130, 246, 0.2)',
                            color: 'var(--accent-primary-light)'
                        } : {}}
                    >
                        {t.icon}
                    </button>
                ))}
                <div className="w-6 h-px mx-auto my-0.5" style={{ background: 'var(--border-subtle)' }} />
                {/* Color picker */}
                {colors.map(c => (
                    <button
                        key={c}
                        onClick={() => setActiveColor(c)}
                        className="w-5 h-5 rounded-full mx-auto transition-transform"
                        style={{
                            background: c,
                            transform: activeColor === c ? 'scale(1.3)' : 'scale(1)',
                            border: activeColor === c ? '2px solid white' : 'none'
                        }}
                    />
                ))}
                <div className="w-6 h-px mx-auto my-0.5" style={{ background: 'var(--border-subtle)' }} />
                <button onClick={onClearAnnotations} className="btn-icon !w-8 !h-8 !border-0 text-sm" title="Clear All">
                    🗑️
                </button>
            </div>
        </>
    );
};
