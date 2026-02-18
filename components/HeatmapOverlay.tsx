
import React, { useEffect, useRef } from 'react';
import { Finding } from '../types';

interface HeatmapOverlayProps {
  findings: Finding[];
  visible: boolean;
  activeIndices: number[];
}

export const HeatmapOverlay: React.FC<HeatmapOverlayProps> = ({ findings, visible, activeIndices }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const timeRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !visible) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight;
      }
    };

    const drawHeatmap = (time: number) => {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const breathe = Math.sin(time * 0.002) * 0.15 + 0.85; // 0.7 to 1.0

      findings.forEach((finding, index) => {
        if (!finding.location || !activeIndices.includes(index)) return;

        const { x, y, radius } = finding.location;
        const centerX = (x / 100) * canvas.width;
        const centerY = (y / 100) * canvas.height;
        const pixelRadius = (radius / 100) * canvas.width * breathe;

        // Grad-CAM style heatmap gradient
        const gradient = ctx.createRadialGradient(
          centerX, centerY, 0,
          centerX, centerY, pixelRadius
        );

        const intensity = finding.confidence;

        // Severity-based color mapping
        const isHighSeverity = finding.severityLevel === 'Severe' || finding.severityLevel === 'Critical';

        if (isHighSeverity) {
          gradient.addColorStop(0, `rgba(255, 50, 50, ${0.65 * intensity})`);
          gradient.addColorStop(0.25, `rgba(255, 100, 0, ${0.45 * intensity})`);
          gradient.addColorStop(0.5, `rgba(255, 180, 0, ${0.25 * intensity})`);
          gradient.addColorStop(0.75, `rgba(255, 255, 100, ${0.1 * intensity})`);
          gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        } else {
          gradient.addColorStop(0, `rgba(59, 130, 246, ${0.55 * intensity})`);
          gradient.addColorStop(0.3, `rgba(96, 165, 250, ${0.35 * intensity})`);
          gradient.addColorStop(0.6, `rgba(147, 197, 253, ${0.15 * intensity})`);
          gradient.addColorStop(0.85, `rgba(191, 219, 254, ${0.05 * intensity})`);
          gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        }

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(centerX, centerY, pixelRadius, 0, Math.PI * 2);
        ctx.fill();

        // Draw a thin marker ring
        const ringAlpha = 0.3 + Math.sin(time * 0.003) * 0.15;
        ctx.strokeStyle = isHighSeverity
          ? `rgba(255, 100, 100, ${ringAlpha})`
          : `rgba(96, 165, 250, ${ringAlpha})`;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.arc(centerX, centerY, pixelRadius * 1.1, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // Draw label
        const labelY = centerY - pixelRadius - 12;
        ctx.font = '600 9px Inter, sans-serif';
        ctx.textAlign = 'center';

        const label = `${finding.region} — ${Math.round(finding.confidence * 100)}%`;
        const labelWidth = ctx.measureText(label).width + 12;

        // Label background
        ctx.fillStyle = 'rgba(5, 10, 24, 0.85)';
        ctx.beginPath();
        ctx.roundRect(centerX - labelWidth / 2, labelY - 8, labelWidth, 16, 4);
        ctx.fill();

        // Label border
        ctx.strokeStyle = isHighSeverity
          ? 'rgba(255, 100, 100, 0.4)'
          : 'rgba(96, 165, 250, 0.4)';
        ctx.lineWidth = 0.5;
        ctx.stroke();

        // Label text
        ctx.fillStyle = isHighSeverity
          ? 'rgba(255, 150, 150, 0.9)'
          : 'rgba(147, 197, 253, 0.9)';
        ctx.fillText(label, centerX, labelY + 4);
      });

      timeRef.current = time;
      animationRef.current = requestAnimationFrame(drawHeatmap);
    };

    resize();
    animationRef.current = requestAnimationFrame(drawHeatmap);
    window.addEventListener('resize', resize);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationRef.current);
    };
  }, [findings, visible, activeIndices]);

  if (!visible) return null;

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{
        filter: 'blur(4px)',
        mixBlendMode: 'screen',
        opacity: 0.9
      }}
    />
  );
};
