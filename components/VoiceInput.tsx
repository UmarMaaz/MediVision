
import React, { useState, useRef, useEffect } from 'react';

interface VoiceInputProps {
    onTranscript: (text: string) => void;
    currentText: string;
}

export const VoiceInput: React.FC<VoiceInputProps> = ({ onTranscript, currentText }) => {
    const [isListening, setIsListening] = useState(false);
    const [supported, setSupported] = useState(false);
    const recognitionRef = useRef<any>(null);

    useEffect(() => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SpeechRecognition) {
            setSupported(true);
            const recognition = new SpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = 'en-US';

            recognition.onresult = (event: any) => {
                let transcript = '';
                for (let i = 0; i < event.results.length; i++) {
                    transcript += event.results[i][0].transcript;
                }
                onTranscript(currentText ? `${currentText} ${transcript}` : transcript);
            };

            recognition.onerror = () => {
                setIsListening(false);
            };

            recognition.onend = () => {
                setIsListening(false);
            };

            recognitionRef.current = recognition;
        }
    }, []);

    const toggle = () => {
        if (!recognitionRef.current) return;

        if (isListening) {
            recognitionRef.current.stop();
            setIsListening(false);
        } else {
            recognitionRef.current.start();
            setIsListening(true);
        }
    };

    if (!supported) return null;

    return (
        <button
            onClick={toggle}
            className="btn-icon !w-9 !h-9 relative"
            title={isListening ? 'Stop Recording' : 'Start Voice Input'}
            style={isListening ? {
                background: 'rgba(239, 68, 68, 0.15)',
                borderColor: 'rgba(239, 68, 68, 0.3)',
                color: '#fb7185'
            } : {}}
        >
            {isListening && (
                <span className="absolute inset-0 rounded-lg animate-ping" style={{ background: 'rgba(239, 68, 68, 0.2)' }} />
            )}
            <svg className="w-4 h-4 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5"
                    d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
        </button>
    );
};
