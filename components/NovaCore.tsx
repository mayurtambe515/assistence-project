import React from 'react';
import { AssistantStatus } from '../App';

interface NovaCoreProps {
    status: AssistantStatus;
}

export const NovaCore: React.FC<NovaCoreProps> = ({ status }) => {
    let coreClasses = 'absolute w-16 h-16 rounded-full bg-cyan-400 transition-all duration-300';
    let glowClasses = 'absolute w-16 h-16 rounded-full bg-cyan-400 blur-2xl transition-all duration-300';
    let statusText = '';

    switch (status) {
        case 'listening':
            coreClasses += ' animate-pulse';
            glowClasses += ' scale-100';
            statusText = 'LISTENING';
            break;
        case 'thinking':
            coreClasses += ' animate-ping';
            glowClasses += ' scale-150';
            statusText = 'THINKING...';
            break;
        case 'speaking':
            coreClasses += ' ring-4 ring-cyan-300 ring-opacity-75 scale-110';
            glowClasses += ' scale-125';
            statusText = 'SPEAKING...';
            break;
        default:
            coreClasses += ' bg-cyan-600';
            glowClasses += ' scale-75 blur-xl';
            statusText = 'IDLE';
            break;
    }
  
  return (
    <div className="relative w-64 h-64 flex items-center justify-center">
        <div className={glowClasses}></div>
        <div className={coreClasses}></div>

        <svg viewBox="0 0 200 200" className="absolute w-full h-full text-cyan-500/50">
            <circle cx="100" cy="100" r="45" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="5 5" className="animate-rotate-reverse" />
            <circle cx="100" cy="100" r="60" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="8 8" className="animate-rotate" />
            <circle cx="100" cy="100" r="75" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="2 6" className="animate-rotate-reverse" />
            <circle cx="100" cy="100" r="90" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="1 10" className="animate-rotate" />
        </svg>

        <div className="absolute text-cyan-400 text-xs tracking-widest animate-pulse">{statusText}</div>
    </div>
  );
};
