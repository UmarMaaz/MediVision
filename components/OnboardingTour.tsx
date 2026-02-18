
import React, { useState, useEffect } from 'react';

interface OnboardingTourProps {
    onComplete: () => void;
}

const TOUR_STEPS = [
    {
        icon: '🎯',
        title: 'Select Imaging Modality',
        content: 'Choose the type of scan you want to analyze. Each modality loads specialized ML models optimized for that imaging type.',
    },
    {
        icon: '📤',
        title: 'Upload Your Scan',
        content: 'Drag & drop or click to upload a medical image. Supports PNG, JPG, and DICOM-wrapped images.',
    },
    {
        icon: '🧠',
        title: 'AI Analysis Pipeline',
        content: 'Click "Run Analysis Pipeline" to activate the multi-pass ensemble. Pass 1 checks image quality, Pass 2 runs deep analysis with CheXNet, BiomedCLIP, Med-SAM, and Gemini Vision.',
    },
    {
        icon: '🔬',
        title: 'Explore Findings',
        content: 'Review findings in the tabbed panel: Findings, Ensemble Logic, Report, and AI Chat. Toggle heatmap overlays to visualize findings on the image.',
    },
    {
        icon: '💬',
        title: 'Ask Follow-up Questions',
        content: 'Use the AI Chat tab to ask Gemini about specific findings. It adapts responses based on your role (Doctor, Radiologist, or General).',
    },
    {
        icon: '🖊️',
        title: 'Annotate & Export',
        content: 'Draw annotations on images, adjust brightness/contrast, compare with previous scans, and export structured reports.',
    },
    {
        icon: '⌨️',
        title: 'Keyboard Shortcuts',
        content: 'Press ? anytime to see all keyboard shortcuts. Space = Run Analysis, H = Heatmap, I = Invert, F = Fullscreen.',
    },
];

export const OnboardingTour: React.FC<OnboardingTourProps> = ({ onComplete }) => {
    const [currentStep, setCurrentStep] = useState(0);
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        const hasSeenTour = localStorage.getItem('medivision_tour_complete');
        if (hasSeenTour) {
            setIsVisible(false);
        }
    }, []);

    const handleNext = () => {
        if (currentStep < TOUR_STEPS.length - 1) {
            setCurrentStep(prev => prev + 1);
        } else {
            handleComplete();
        }
    };

    const handleComplete = () => {
        localStorage.setItem('medivision_tour_complete', 'true');
        setIsVisible(false);
        onComplete();
    };

    if (!isVisible) return null;

    const step = TOUR_STEPS[currentStep];

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center">
            <div className="absolute inset-0" style={{ background: 'rgba(5, 10, 24, 0.9)', backdropFilter: 'blur(12px)' }} />
            <div className="relative w-full max-w-lg mx-4 animate-fade-in">
                <div className="glass-card p-8 text-center space-y-5" style={{ borderRadius: 'var(--radius-xl)' }}>
                    {/* Progress indicator */}
                    <div className="flex justify-center gap-1.5">
                        {TOUR_STEPS.map((_, i) => (
                            <div
                                key={i}
                                className="h-1 rounded-full transition-all duration-300"
                                style={{
                                    width: i === currentStep ? '24px' : '8px',
                                    background: i <= currentStep ? 'var(--accent-primary)' : 'var(--border-subtle)',
                                }}
                            />
                        ))}
                    </div>

                    {/* Step content */}
                    <div className="text-4xl">{step.icon}</div>
                    <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{step.title}</h2>
                    <p className="text-sm leading-relaxed max-w-sm mx-auto" style={{ color: 'var(--text-secondary)' }}>
                        {step.content}
                    </p>

                    {/* Step counter */}
                    <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                        {currentStep + 1} of {TOUR_STEPS.length}
                    </p>

                    {/* Actions */}
                    <div className="flex gap-3 justify-center pt-2">
                        <button onClick={handleComplete} className="btn-ghost !px-5">
                            Skip Tour
                        </button>
                        <button onClick={handleNext} className="btn-primary !px-8">
                            {currentStep < TOUR_STEPS.length - 1 ? 'Next' : 'Get Started'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
