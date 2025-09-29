
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Chat } from '@google/genai';
import { Sidebar } from './components/Sidebar';
import { NovaCore } from './components/NovaCore';
import { ChatInterface } from './components/ChatInterface';
import { CameraFeed, CameraFeedHandle } from './components/CameraFeed';
import { Message, Reminder, Contact, WebSource } from './types';
import { useSystemStats } from './hooks/useSystemStats';
import { getChatSession, generateVisualResponse, generateGroundedResponse } from './services/geminiService';

type KnowledgeBase = { [key: string]: string };
export type AssistantStatus = 'listening' | 'thinking' | 'speaking' | 'idle';

const WebSourcesComponent: React.FC<{ sources: WebSource[] }> = ({ sources }) => {
  if (!sources || sources.length === 0) {
    return null;
  }

  return (
    <div className="w-full flex flex-col space-y-4">
      <h2 className="text-sm text-cyan-400 tracking-[0.2em] uppercase" style={{ textShadow: '0 0 5px #22d3ee' }}>WEB SOURCES</h2>
      <div className="flex flex-col space-y-2 text-xs">
        {sources.map((source, index) => (
          source.web && (
            <a
              key={index}
              href={source.web.uri}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-cyan-900/30 p-2 rounded-md hover:bg-cyan-900/60 transition-colors"
            >
              <p className="text-cyan-300 font-semibold truncate" title={source.web.title}>
                {source.web.title || 'Untitled Source'}
              </p>
              <p className="text-cyan-500 text-xs truncate" title={source.web.uri}>
                {source.web.uri}
              </p>
            </a>
          )
        ))}
      </div>
    </div>
  );
};


const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'system', text: 'Initializing Nova Assistant... Stand by.' }
  ]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [novaVoice, setNovaVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [isSessionActive, setIsSessionActive] = useState(true);
  const [isPhotoCaptured, setIsPhotoCaptured] = useState(false);
  const [capturedImageData, setCapturedImageData] = useState<string | null>(null);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [knowledge, setKnowledge] = useState<KnowledgeBase>({});
  const [webSources, setWebSources] = useState<WebSource[]>([]);
  const chatRef = useRef<Chat | null>(null);
  const cameraFeedRef = useRef<CameraFeedHandle>(null);

  const leftStats = useSystemStats({
    'CORE TEMP': { value: 75, unit: '°C' },
    'MEMORY USAGE': { value: 60, unit: '%' },
    'STORAGE I/O': { value: 45, unit: 'MB/s' },
    'GPU POWER': { value: 80, unit: '%' },
  });

  const rightStats = useSystemStats({
    'IP ADDRESS': { value: '192.168.1.7', isStatic: true },
    'DOWN/UP': { value: '98/25', unit: 'Mbps', isStatic: true },
    'PING': { value: 12, unit: 'ms' },
  });

  useEffect(() => {
    try {
      const storedKnowledge = localStorage.getItem('novaKnowledgeBase');
      if (storedKnowledge) {
        setKnowledge(JSON.parse(storedKnowledge));
      }
    } catch (error) {
      console.error('Failed to load knowledge from localStorage', error);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('novaKnowledgeBase', JSON.stringify(knowledge));
    } catch (error) {
      console.error('Failed to save knowledge to localStorage', error);
    }
  }, [knowledge]);

  useEffect(() => {
    chatRef.current = getChatSession();
    const loadVoices = () => {
      const voices = speechSynthesis.getVoices();
      if (voices.length > 0) {
        let selectedVoice = voices.find(voice => voice.name.includes('Google') && voice.lang.startsWith('en'));
        if (!selectedVoice) {
          selectedVoice = voices.find(voice => voice.lang.startsWith('en-US') && voice.name.includes('Female'));
        }
        if (!selectedVoice) {
          selectedVoice = voices.find(voice => voice.lang.startsWith('en-US'));
        }
        setNovaVoice(selectedVoice || voices[0]);
      }
    };

    loadVoices();
    if (speechSynthesis.onvoiceschanged !== undefined) {
      speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  const speak = useCallback((text: string, onEnd?: () => void) => {
    if ('speechSynthesis' in window && text && novaVoice) {
      speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.voice = novaVoice;
      utterance.pitch = 1.1;
      utterance.rate = 1;
      utterance.onerror = (event) => {
        console.error("Speech synthesis error:", event);
        onEnd?.();
      };
      utterance.onend = () => {
        onEnd?.();
      };
      speechSynthesis.speak(utterance);
    } else {
      console.warn('Speech synthesis not supported or no voice available.');
      onEnd?.();
    }
  }, [novaVoice]);


  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      reminders.forEach(reminder => {
        if (now >= reminder.dueTime) {
          const reminderMessage = `REMINDER: ${reminder.text}`;
          setMessages(prev => [...prev, { role: 'system', text: reminderMessage }]);
          setIsSpeaking(true);
          speak(reminderMessage, () => setIsSpeaking(false));
          setReminders(prev => prev.filter(r => r.id !== reminder.id));
        }
      });
    }, 1000); // Check every second

    return () => clearInterval(interval);
  }, [reminders, speak]);


  const capturePhoto = useCallback(() => {
    let systemMessageText: string;
    if (cameraFeedRef.current) {
        const imageDataUrl = cameraFeedRef.current.capture();
        if (imageDataUrl) {
            systemMessageText = 'Visual input captured.';
            setIsPhotoCaptured(true);
            setCapturedImageData(imageDataUrl);
        } else {
            systemMessageText = 'Error: Could not capture visual input.';
        }
    } else {
        systemMessageText = 'Error: Visual input component not available.';
    }
    setMessages(prev => [...prev, { role: 'system', text: systemMessageText }]);
  }, []);

  const clearPhoto = useCallback(() => {
    if (cameraFeedRef.current) {
      cameraFeedRef.current.clear();
      setIsPhotoCaptured(false);
      setCapturedImageData(null);
      setMessages(prev => [...prev, { role: 'system', text: 'Visual input cleared. Resuming live feed.' }]);
    }
  }, []);
  
  const handleSavePhoto = useCallback(() => {
    if (capturedImageData) {
      const link = document.createElement('a');
      link.href = capturedImageData;
      link.download = `nova-capture-${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setMessages(prev => [...prev, { role: 'system', text: 'Acknowledged. Preparing secure download. Please authorize the save action in your browser.' }]);
    } else {
      setMessages(prev => [...prev, { role: 'system', text: 'Action failed: No visual input has been captured. Please capture a photo before saving.' }]);
    }
  }, [capturedImageData]);


  const handleSendMessage = useCallback(async (text: string) => {
    setWebSources([]); // Clear sources on every new message
    const userMessage: Message = { role: 'user', text };
    
    const recallPatterns = [
        /what is my (.+)\?/i, /what's my (.+)\?/i, /what did i tell you about (.+)\?/i,
        /recall my (.+)/i, /do you remember my (.+)\?/i,
    ];
    let recalledInfo: { key: string; value: string; } | null = null;
    for (const pattern of recallPatterns) {
        const match = text.trim().match(pattern);
        if (match && match[1]) {
            const keyToRecall = match[1].trim().toLowerCase();
            const storedKey = Object.keys(knowledge).find(k => k.toLowerCase() === keyToRecall);
            if (storedKey && knowledge[storedKey]) {
                recalledInfo = { key: storedKey, value: knowledge[storedKey] };
                break;
            }
        }
    }

    if (recalledInfo) {
        setMessages(prev => [...prev, userMessage]);
        setTimeout(() => {
            const recallResponse = `Based on my records, your ${recalledInfo.key} is: ${recalledInfo.value}`;
            setIsSpeaking(true);
            speak(recallResponse, () => setIsSpeaking(false));
        }, 300);
        return;
    }

    if (!text.trim() || isLoading || !chatRef.current) return;

    setIsLoading(true);
    setMessages(prev => [...prev, userMessage]);
    
    const lowerText = text.toLowerCase();
    const isVisualQuery = ['see', 'look at', 'what is this', 'describe this', 'analyze this image'].some(kw => lowerText.includes(kw));
    const isSearchQuery = ['search for', 'look up', "what's the latest", 'who won', 'news about'].some(kw => lowerText.includes(kw));

    try {
        if (isVisualQuery && cameraFeedRef.current) {
            const imageDataUrl = cameraFeedRef.current.capture();
            if (imageDataUrl) {
                setMessages(prev => [...prev, { role: 'system', text: 'Analyzing visual input...' }]);
                const base64Data = imageDataUrl.split(',')[1];
                const response = await generateVisualResponse(text, base64Data);
                const responseText = response.text;
                setIsSpeaking(true);
                speak(responseText, () => setIsSpeaking(false));
            } else {
                const errorMsg = "I couldn't get an image from the camera. Please try again.";
                setMessages(prev => [...prev, { role: 'system', text: errorMsg }]);
                setIsSpeaking(true);
                speak(errorMsg, () => setIsSpeaking(false));
            }
        } else if (isSearchQuery) {
            setMessages(prev => [...prev, { role: 'system', text: 'Searching the web...' }]);
            const response = await generateGroundedResponse(text);
            const responseText = response.text;
            const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
            // FIX: The API's GroundingChunk[] type is incompatible with the app's WebSource[] type.
            // We must filter for valid web sources (with a URI) and map them to the WebSource shape.
            const validSources: WebSource[] = sources
              .filter(source => source.web && source.web.uri)
              .map(source => ({
                web: {
                  uri: source.web!.uri!,
                  title: source.web!.title || source.web!.uri!,
                }
              }));
            setWebSources(validSources);
            setIsSpeaking(true);
            speak(responseText, () => setIsSpeaking(false));
        } else {
            const response = await chatRef.current.sendMessage({ message: text });
            const fullModelResponse = response.text;
            const actionRegex = /\[ACTION:([^\]]+)\]/;
            const match = fullModelResponse.match(actionRegex);
            const userVisibleText = match ? fullModelResponse.replace(actionRegex, '').trim() : fullModelResponse.trim();

            if (userVisibleText) {
                setIsSpeaking(true);
                speak(userVisibleText, () => setIsSpeaking(false));
            }
      
            if (match) {
                const actionContent = match[1];
                const [actionName, ...paramsParts] = actionContent.split(':');
                const paramsString = paramsParts.join(':');

                setTimeout(() => {
                    let systemMessageText = `Executing: ${actionName}...`;
                    const params: { [key:string]: string } = {};
                    paramsString.split('|').forEach(part => {
                        const [key, value] = part.split('=');
                        if (key && value) params[key.trim()] = value.trim();
                    });

                    switch(actionName) {
                        case 'capture_photo': capturePhoto(); break;
                        case 'clear_photo': clearPhoto(); break;
                        case 'save_photo': handleSavePhoto(); break;
                        case 'set_reminder':
                            const dueInSeconds = parseInt(params['dueInSeconds'], 10);
                            if (!isNaN(dueInSeconds) && params['message']) {
                                setReminders(prev => [...prev, { id: Date.now(), text: params['message'], dueTime: new Date(Date.now() + dueInSeconds * 1000) }]);
                                systemMessageText = `Reminder set: "${params['message']}"`;
                            } else { systemMessageText = `Error: Could not set reminder.`; }
                            setMessages(prev => [...prev, { role: 'system', text: systemMessageText }]);
                            break;
                        // ... Other cases from the original file ...
                        case 'open_app':
                          const appName = paramsString;
                          if (appName.toLowerCase() === 'nova') {
                            systemMessageText = "Acknowledged: This is the Nova Personal Assistant interface.";
                          } else {
                            systemMessageText = `Simulating: open_app('${appName}')...`;
                          }
                          setMessages(prev => [...prev, { role: 'system', text: systemMessageText }]);
                          break;
                        case 'close_app':
                          const appToClose = paramsString;
                          systemMessageText = `Executing: close_app('${appToClose}')...`;
                          if (appToClose.toLowerCase() === 'nova') {
                            systemMessageText = 'Acknowledged. Terminating Nova session.';
                            setTimeout(() => setIsSessionActive(false), 1500);
                          }
                          setMessages(prev => [...prev, { role: 'system', text: systemMessageText }]);
                          break;
                        case 'add_contact':
                          const { name, phone } = params;
                          if (name && phone) {
                            if (contacts.some(c => c.name.toLowerCase() === name.toLowerCase())) {
                                systemMessageText = `Error: A contact named '${name}' already exists.`;
                            } else {
                                setContacts(prev => [...prev, { id: Date.now(), name, phone }]);
                                systemMessageText = `Contact '${name}' added successfully.`;
                            }
                          } else { systemMessageText = `Error: Could not add contact.`; }
                          setMessages(prev => [...prev, { role: 'system', text: systemMessageText }]);
                          break;
                        case 'view_contacts':
                          setMessages(prev => [...prev, { role: 'system', text: `Displaying all saved contacts.` }]);
                          break;
                        case 'delete_contact':
                          const nameToDelete = params['name'];
                          if (nameToDelete) {
                            if (contacts.some(c => c.name.toLowerCase() === nameToDelete.toLowerCase())) {
                                setContacts(prev => prev.filter(c => c.name.toLowerCase() !== nameToDelete.toLowerCase()));
                                systemMessageText = `Contact '${nameToDelete}' has been removed.`;
                            } else { systemMessageText = `Error: Contact '${nameToDelete}' not found.`; }
                          } else { systemMessageText = `Error: Contact name not provided.`; }
                          setMessages(prev => [...prev, { role: 'system', text: systemMessageText }]);
                          break;
                        case 'remember':
                          const { key, value } = params;
                          if (key && value) {
                            setKnowledge(prev => ({ ...prev, [key]: value }));
                            systemMessageText = `Memory updated. I will remember that your ${key} is ${value}.`;
                          } else { systemMessageText = `Error: Could not update memory.`; }
                          setMessages(prev => [...prev, { role: 'system', text: systemMessageText }]);
                          break;
                        case 'forget':
                          const keyToForget = params['key'];
                          if (keyToForget) {
                            if (Object.prototype.hasOwnProperty.call(knowledge, keyToForget)) {
                              setKnowledge(prev => {
                                const newKnowledge = { ...prev };
                                delete newKnowledge[keyToForget];
                                return newKnowledge;
                              });
                              systemMessageText = `Acknowledged. I have forgotten the information about '${keyToForget}'.`;
                            } else { systemMessageText = `Error: No information found for '${keyToForget}'.`; }
                          } else { systemMessageText = `Error: Key not provided.`; }
                          setMessages(prev => [...prev, { role: 'system', text: systemMessageText }]);
                          break;
                        case 'view_memory':
                          if (Object.keys(knowledge).length > 0) {
                            const memoryItems = Object.entries(knowledge).map(([k, v]) => `• ${k}: ${v}`).join('\n');
                            systemMessageText = `Recalling all stored information:\n${memoryItems}`;
                          } else { systemMessageText = `My memory banks are currently empty.`; }
                          setMessages(prev => [...prev, { role: 'system', text: systemMessageText }]);
                          break;
                        case 'call_contact':
                        case 'send_whatsapp':
                          const { recipient, message } = params;
                          const phoneRegex = /^(?=.*\d)[\d\s+-]+$/;
                          let targetPhone = '';
                          const contact = contacts.find(c => c.name.toLowerCase() === (recipient || '').toLowerCase());
                          if (contact) {
                            targetPhone = contact.phone;
                          } else if (phoneRegex.test(recipient)) {
                            targetPhone = recipient;
                          }

                          if (targetPhone) {
                            const phoneNumber = targetPhone.replace(/[\s-]/g, '');
                            if (actionName === 'call_contact') {
                              window.location.href = `tel:${phoneNumber}`;
                              systemMessageText = `Initiating call to ${recipient || phoneNumber}...`;
                            } else {
                              const encodedMessage = encodeURIComponent(message || '');
                              window.open(`https://wa.me/${phoneNumber}?text=${encodedMessage}`, '_blank');
                              systemMessageText = 'Opening WhatsApp... Please confirm and send the message in the new tab.';
                            }
                          } else {
                            systemMessageText = `Recipient '${recipient}' not found or invalid.`;
                          }
                          setMessages(prev => [...prev, { role: 'system', text: systemMessageText }]);
                          break;
                    }
                }, 500);
            }
        }
    } catch (error) {
      console.error("Error sending message:", error);
      const errorMessage = 'Error communicating with Nova Core. Please check your connection or API key.';
       setMessages(prev => [...prev, { role: 'system', text: errorMessage }]);
      setIsSpeaking(true);
      speak(errorMessage, () => setIsSpeaking(false));
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, capturePhoto, clearPhoto, handleSavePhoto, speak, contacts, knowledge]);

  if (!isSessionActive) {
    return (
      <div className="bg-gray-950 text-cyan-200 min-h-screen flex flex-col items-center justify-center transition-opacity duration-500">
        <h1 className="text-2xl font-bold text-cyan-400 tracking-[0.3em] uppercase" style={{ textShadow: '0 0 8px #22d3ee' }}>
          NOVA SESSION TERMINATED
        </h1>
        <p className="text-cyan-300 mt-2">Refresh the page to restart.</p>
      </div>
    );
  }
  
  let assistantStatus: AssistantStatus = 'listening';
  if (isLoading) {
    assistantStatus = 'thinking';
  } else if (isSpeaking) {
    assistantStatus = 'speaking';
  }


  return (
    <div className="bg-gray-950 text-cyan-200 min-h-screen flex flex-col p-4 gap-4">
      <header className="flex-shrink-0 text-center">
        <h1 className="text-xl font-bold text-cyan-400 tracking-[0.3em] uppercase" style={{ textShadow: '0 0 8px #22d3ee' }}>NOVA PERSONAL ASSISTANT</h1>
      </header>
      
      <main className="flex-grow grid grid-cols-1 md:grid-cols-4 gap-4 h-[calc(100vh-80px)]">
        <div className="md:col-span-1 bg-black/20 p-4 border border-cyan-900/50 rounded-lg flex flex-col gap-4 overflow-y-auto">
            <Sidebar title="System Status" stats={leftStats} />
            <div className="border-t border-cyan-900/50"></div>
            <WebSourcesComponent sources={webSources} />
            {webSources.length > 0 && <div className="border-t border-cyan-900/50"></div>}
            <div className="w-full flex flex-col space-y-4">
                <h2 className="text-sm text-cyan-400 tracking-[0.2em] uppercase" style={{ textShadow: '0 0 5px #22d3ee' }}>ACTIVE REMINDERS</h2>
                {reminders.length > 0 ? (
                    <div className="flex flex-col space-y-2 text-xs">
                        {reminders.map(reminder => (
                            <div key={reminder.id} className="bg-cyan-900/30 p-2 rounded-md">
                                <p className="text-cyan-300">{reminder.text}</p>
                                <p className="text-cyan-500 text-right">Due at: {reminder.dueTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-xs text-cyan-700 italic">No active reminders.</p>
                )}
            </div>
            <div className="border-t border-cyan-900/50"></div>
            <div className="w-full flex flex-col space-y-4">
                <h2 className="text-sm text-cyan-400 tracking-[0.2em] uppercase" style={{ textShadow: '0 0 5px #22d3ee' }}>CONTACTS</h2>
                {contacts.length > 0 ? (
                    <div className="flex flex-col space-y-2 text-xs">
                        {contacts.map(contact => (
                            <div key={contact.id} className="bg-cyan-900/30 p-2 rounded-md">
                                <p className="text-cyan-300 font-semibold">{contact.name}</p>
                                <p className="text-cyan-500">{contact.phone}</p>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-xs text-cyan-700 italic">No contacts saved.</p>
                )}
            </div>
            <div className="border-t border-cyan-900/50"></div>
            <div className="w-full flex flex-col space-y-4">
                <h2 className="text-sm text-cyan-400 tracking-[0.2em] uppercase" style={{ textShadow: '0 0 5px #22d3ee' }}>KNOWLEDGE BASE</h2>
                {Object.keys(knowledge).length > 0 ? (
                    <div className="flex flex-col space-y-2 text-xs">
                        {Object.entries(knowledge).map(([key, value]) => (
                            <div key={key} className="bg-cyan-900/30 p-2 rounded-md">
                                <p className="text-cyan-300 font-semibold">{key}</p>
                                <p className="text-cyan-500 truncate" title={value}>{value}</p>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-xs text-cyan-700 italic">No information stored.</p>
                )}
            </div>
        </div>

        <div className="md:col-span-2 bg-black/20 p-4 border border-cyan-900/50 rounded-lg flex flex-col items-center justify-between">
            <NovaCore status={assistantStatus} />
            
            <div className="flex items-center gap-4">
              {isPhotoCaptured ? (
                  <>
                      <button
                          onClick={handleSavePhoto}
                          className="border-2 border-green-500/50 text-green-400 hover:bg-green-500/20 hover:border-green-500 transition-all duration-300 rounded-full px-6 py-2 uppercase tracking-widest text-sm font-semibold flex items-center gap-2"
                          aria-label="Save captured photo"
                      >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                          Save Photo
                      </button>
                      <button
                          onClick={clearPhoto}
                          className="border-2 border-red-500/50 text-red-400 hover:bg-red-500/20 hover:border-red-500 transition-all duration-300 rounded-full px-6 py-2 uppercase tracking-widest text-sm font-semibold flex items-center gap-2"
                          aria-label="Clear captured photo"
                      >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                          Clear Photo
                      </button>
                  </>
              ) : (
                  <button
                      onClick={capturePhoto}
                      className="border-2 border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/20 hover:border-cyan-500 transition-all duration-300 rounded-full px-6 py-2 uppercase tracking-widest text-sm font-semibold flex items-center gap-2"
                      aria-label="Capture photo from visual input"
                  >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                      Manual Capture
                  </button>
              )}
            </div>
            
            <div className="w-full h-1/2">
                <ChatInterface onSendMessage={handleSendMessage} messages={messages} isBusy={isLoading || isSpeaking} />
            </div>
        </div>

        <div className="md:col-span-1 bg-black/20 p-4 border border-cyan-900/50 rounded-lg flex flex-col gap-4">
            <Sidebar title="Network Interface" stats={rightStats} />
            <div className="border-t border-cyan-900/50"></div>
            <CameraFeed ref={cameraFeedRef} />
        </div>
      </main>
    </div>
  );
};

export default App;
