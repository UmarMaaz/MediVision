
import React from 'react';
import { PipelineStep } from '../types';
import { PIPELINE_STEPS } from '../constants';

interface LoadingPipelineProps {
    currentStep: PipelineStep;
}

export const LoadingPipeline: React.FC<LoadingPipelineProps> = ({ currentStep }) => {
    const getStepStatus = (stepKey: string) => {
        const stepOrder = ['quality-check', 'scanning', 'ensemble', 'reasoning', 'complete'];
        const currentIndex = stepOrder.indexOf(currentStep);
        const stepIndex = stepOrder.indexOf(stepKey);

        if (currentIndex === -1) return 'idle';
        if (stepIndex < currentIndex) return 'complete';
        if (stepIndex === currentIndex) return 'active';
        return 'idle';
    };

    const isActive = ['quality-check', 'scanning', 'ensemble', 'reasoning'].includes(currentStep);

    if (!isActive) return null;

    return (
        <div className="glass-card p-6 space-y-6 animate-fade-in">
            {/* Neural network animation */}
            <div className="relative h-32 flex items-center justify-center overflow-hidden rounded-xl bg-[var(--bg-primary)]">
                {/* Scan line effect */}
                <div
                    className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-60"
                    style={{ animation: 'scan-line 2s ease-in-out infinite' }}
                />

                {/* Pulsing core */}
                <div className="relative">
                    <div className="w-16 h-16 rounded-full border-2 border-blue-500/30 flex items-center justify-center">
                        <div className="w-10 h-10 rounded-full border-2 border-blue-400/50 flex items-center justify-center animate-spin-slow">
                            <div className="w-4 h-4 rounded-full bg-blue-500 animate-pulse-glow" />
                        </div>
                    </div>
                    {/* Ring pulse */}
                    <div
                        className="absolute inset-0 rounded-full border border-blue-500/30"
                        style={{ animation: 'ring-pulse 1.5s ease-out infinite' }}
                    />
                    <div
                        className="absolute inset-0 rounded-full border border-blue-500/20"
                        style={{ animation: 'ring-pulse 1.5s ease-out infinite 0.5s' }}
                    />
                </div>

                {/* Status text */}
                <div className="absolute bottom-3 left-0 right-0 text-center">
                    <p className="text-[10px] font-bold text-blue-400 uppercase tracking-[0.2em]">
                        {currentStep === 'quality-check' && 'Assessing Image Quality...'}
                        {currentStep === 'scanning' && 'Neural Network Scanning...'}
                        {currentStep === 'ensemble' && 'Ensemble Model Synthesis...'}
                        {currentStep === 'reasoning' && 'Generating Clinical Insights...'}
                    </p>
                </div>
            </div>

            {/* Pipeline steps */}
            <div className="flex items-center justify-between">
                {PIPELINE_STEPS.map((step, index) => {
                    const status = getStepStatus(step.key);
                    return (
                        <React.Fragment key={step.key}>
                            <div className={`pipeline-step ${status}`}>
                                <span className="text-sm">{step.icon}</span>
                                <span className="hidden sm:inline">{step.label}</span>
                                {status === 'complete' && (
                                    <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                                    </svg>
                                )}
                            </div>
                            {index < PIPELINE_STEPS.length - 1 && (
                                <div className={`pipeline-connector flex-1 mx-1 ${getStepStatus(PIPELINE_STEPS[index + 1].key) !== 'idle' ? 'active' : ''
                                    }`} />
                            )}
                        </React.Fragment>
                    );
                })}
            </div>
        </div>
    );
};
