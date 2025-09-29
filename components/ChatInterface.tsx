import React, { useRef, useEffect, useState } from 'react';
import { Message } from '../types';

interface ChatInterfaceProps {
  onSendMessage: (text: string) => void;
  messages: Message[];
  isBusy: boolean;
}

const UserIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
);

const SystemIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
);


export const ChatInterface: React.FC<ChatInterfaceProps> = ({ onSendMessage, messages, isBusy }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const [isListening, setIsListening] = useState(false);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn("Speech recognition not supported by this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
        setIsListening(true);
    };

    recognition.onend = () => {
        setIsListening(false);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[event.results.length - 1][0].transcript.trim();
      if (transcript) {
        onSendMessage(transcript);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    }
  }, [onSendMessage]);


  const handleMicButtonClick = () => {
    if (!recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.error("Could not start recognition:", e);
      }
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);


  return (
    <div className="h-full flex flex-col">
      <div className="flex-grow overflow-y-auto pr-2">
        {messages.filter(msg => msg.role !== 'model').map((msg, index) => (
          <div key={index} className={`flex items-start gap-3 my-2 text-sm ${msg.role === 'user' ? 'justify-end' : ''}`}>
             {msg.role === 'system' && (
                <div className="relative group flex-shrink-0 text-yellow-400">
                    <SystemIcon />
                    <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 whitespace-nowrap bg-gray-800 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                        System Notification
                    </span>
                </div>
             )}
            
            <div className={`max-w-md md:max-w-2xl rounded-lg px-4 py-2 ${
                msg.role === 'user' ? 'bg-cyan-900/50 text-cyan-200' : 
                'bg-yellow-900/30 text-yellow-400 italic'
            }`}>
              {msg.text}
            </div>

            {msg.role === 'user' && (
                <div className="relative group flex-shrink-0 text-cyan-400">
                    <UserIcon />
                    <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 whitespace-nowrap bg-gray-800 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                        User Transcript
                    </span>
                </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <div className="flex-shrink-0 mt-4 flex items-center justify-center text-center h-16">
        <button
          onClick={handleMicButtonClick}
          disabled={isBusy}
          className={`
            relative rounded-full w-14 h-14 flex items-center justify-center
            transition-all duration-300 ease-in-out
            focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-950
            ${isListening 
              ? 'bg-red-500/80 text-white focus:ring-red-400 shadow-[0_0_15px_5px_rgba(239,68,68,0.6)]' 
              : 'bg-cyan-500/80 text-cyan-100 hover:bg-cyan-400 focus:ring-cyan-400'
            }
            disabled:bg-gray-600/50 disabled:text-gray-400 disabled:cursor-not-allowed disabled:shadow-none
          `}
          aria-label={isListening ? 'Stop listening' : 'Speak a command'}
        >
          {isListening && (
            <span className="absolute inset-0 rounded-full bg-red-500 animate-ping"></span>
          )}
          <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-14 0m7 10v4M5 8v3a7 7 0 0014 0V8M12 18h.01" />
          </svg>
        </button>
      </div>
    </div>
  );
};
