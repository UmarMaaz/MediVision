
import React, { useState } from 'react';
import { DISCLAIMER_TEXT } from '../constants';

export const Disclaimer: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div
      className="glass-card overflow-hidden transition-all duration-300 cursor-pointer group"
      onClick={() => setCollapsed(!collapsed)}
      style={{ borderLeft: '3px solid var(--accent-primary)' }}
    >
      <div className="flex items-center gap-3 p-4">
        {/* Icon */}
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(59, 130, 246, 0.1)' }}>
          <svg className="w-4 h-4" style={{ color: 'var(--accent-primary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>

        {/* Title */}
        <div className="flex-1 min-w-0">
          <h4 className="text-[10px] font-extrabold uppercase tracking-[0.15em]"
            style={{ color: 'var(--accent-primary-light)' }}>
            Clinical Advisory
          </h4>
          {collapsed && (
            <p className="text-[10px] mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>
              Tap to read full disclaimer
            </p>
          )}
        </div>

        {/* Toggle icon */}
        <svg
          className={`w-4 h-4 transition-transform duration-300 ${collapsed ? '' : 'rotate-180'}`}
          style={{ color: 'var(--text-muted)' }}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" />
        </svg>
      </div>

      {/* Body (collapsible) */}
      <div className={`overflow-hidden transition-all duration-300 ${collapsed ? 'max-h-0' : 'max-h-40'}`}>
        <p className="px-4 pb-4 text-[11px] leading-relaxed font-medium"
          style={{ color: 'var(--text-secondary)' }}>
          {DISCLAIMER_TEXT}
        </p>
      </div>
    </div>
  );
};
