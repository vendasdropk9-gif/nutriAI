import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bot, User, Send, X, MessageCircle, Navigation, Dumbbell, Utensils, Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { UserProfile } from '../types';
import { chatWithAssistant } from '../lib/gemini';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { speak, stopSpeech } from '../lib/speech';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  action?: 'NAVIGATE' | 'SHOW_RECIPE' | 'SHOW_WORKOUT' | 'UPDATE_PLAN' | 'NONE';
  actionData?: any;
  timestamp: string;
}

interface SmartChatProps {
  profile: UserProfile | null;
  onNavigate?: (tab: string) => void;
}

export function SmartChat({ profile, onNavigate }: SmartChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useLocalStorage<ChatMessage[]>('nutriai-chat-history', []);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  
  // Voice state
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [transcript, setTranscript] = useState('');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
       // Send initial welcome message
       const welcomeText = "Oi… já entendi seu perfil. Vou cuidar disso com você 💚 O que vamos fazer hoje?";
       setMessages([{
           id: crypto.randomUUID(),
           sender: 'assistant',
           text: welcomeText,
           timestamp: new Date().toISOString()
       }]);

       if (voiceEnabled) {
         playAssistantVoice(welcomeText);
       }
    }
  }, [isOpen]);

  // Setup Speech Recognition
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'pt-BR';

      recognitionRef.current.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        if (finalTranscript) {
          setTranscript("");
          setInput(prev => prev + (prev ? ' ' : '') + finalTranscript);
          // Auto send after recognizing final phrase if we wanted to
          // For now, let user hit send, or auto-send if they drop the mic
        } else {
          setTranscript(interimTranscript);
        }
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        setIsListening(false);
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      stopAudio();
    };
  }, []);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      setTranscript('');
    } else {
      stopAudio(); // Stop any current TTS
      setInput('');
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

  const stopAudio = () => {
    if (audioSourceRef.current) {
      audioSourceRef.current.stop();
      audioSourceRef.current.disconnect();
      audioSourceRef.current = null;
    }
    stopSpeech();
    setIsSpeaking(false);
  };

  const playAssistantVoice = async (text: string) => {
    try {
      setIsSpeaking(true);
      await speak(text, {
        onEnded: () => setIsSpeaking(false)
      });
    } catch (e) {
      console.error(e);
      setIsSpeaking(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, transcript]);

  const handleSend = async () => {
    const textToSend = input.trim() || transcript.trim();
    if (!textToSend || !profile) return;
    
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      setTranscript('');
    }

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    try {
      const pastMessages = messages.map(m => ({ role: (m.sender === 'user' ? 'user' : 'model') as 'user' | 'model', text: m.text }));
      const response = await chatWithAssistant(profile, pastMessages, textToSend);
      
      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        sender: 'assistant',
        text: response.text,
        action: response.action as any,
        actionData: response.actionData,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, assistantMessage]);

      if (voiceEnabled) {
        playAssistantVoice(response.text);
      }
    } catch (error) {
      console.error(error);
      const errText = 'Tá tudo bem… tive um errinho de conexão. Quer tentar de novo? 💚';
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        sender: 'assistant',
        text: errText,
        timestamp: new Date().toISOString()
      }]);
      if (voiceEnabled) playAssistantVoice(errText);
    } finally {
      setIsTyping(false);
    }
  };

  const handleAction = (action: string, data: any) => {
      if (action === 'NAVIGATE' && onNavigate && data?.tab) {
          onNavigate(data.tab);
          setIsOpen(false);
      }
  };

  return (
    <>
      {/* Floating Action Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0, opacity: 0, y: 20 }}
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-24 right-4 md:bottom-6 md:right-6 z-40 bg-emerald-600 text-white p-4 rounded-full shadow-lg shadow-emerald-600/30 hover:shadow-xl hover:shadow-emerald-600/40 hover:bg-emerald-500 transition-colors"
          >
            <MessageCircle className="w-6 h-6" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95, filter: 'blur(10px)' }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: 40, scale: 0.95, filter: 'blur(10px)' }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="fixed inset-x-4 bottom-24 md:bottom-24 md:right-6 md:left-auto md:w-[400px] h-[650px] max-h-[85vh] z-50 flex flex-col bg-[#F0F4F8] dark:bg-[#0f172a] rounded-[32px] clay-panel shadow-[0_20px_50px_rgba(16,185,129,0.15)] dark:shadow-[0_20px_50px_rgba(16,185,129,0.05)] overflow-hidden border border-emerald-50 dark:border-slate-800"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 bg-[#f8fafc]/80 dark:bg-[#1e293b]/80 backdrop-blur-md border-b border-white/50 dark:border-slate-700/50">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <motion.div 
                    animate={isSpeaking ? { scale: [1, 1.1, 1], boxShadow: ['0 0 0 0 rgba(16,185,129,0.4)', '0 0 20px 4px rgba(16,185,129,0.6)', '0 0 0 0 rgba(16,185,129,0.4)'] } : {}}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="w-12 h-12 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center text-emerald-500 shadow-[inset_2px_2px_4px_rgba(255,255,255,0.8),inset_-2px_-2px_4px_rgba(0,0,0,0.05),4px_4px_8px_rgba(16,185,129,0.2)] dark:shadow-[inset_2px_2px_4px_rgba(255,255,255,0.05),inset_-2px_-2px_4px_rgba(0,0,0,0.2),4px_4px_8px_rgba(16,185,129,0.1)]"
                  >
                    <Bot className="w-6 h-6" />
                  </motion.div>
                  <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-400 border-2 border-white dark:border-slate-800 rounded-full"></div>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900 dark:text-white text-lg leading-tight">Malu</h3>
                    {isSpeaking && (
                      <div className="flex items-center gap-1 h-3">
                        <motion.div animate={{ height: [4, 12, 4] }} transition={{ duration: 0.8, repeat: Infinity, delay: 0 }} className="w-1 bg-emerald-500 rounded-full" />
                        <motion.div animate={{ height: [4, 8, 4] }} transition={{ duration: 0.8, repeat: Infinity, delay: 0.2 }} className="w-1 bg-emerald-500 rounded-full" />
                        <motion.div animate={{ height: [4, 10, 4] }} transition={{ duration: 0.8, repeat: Infinity, delay: 0.4 }} className="w-1 bg-emerald-500 rounded-full" />
                      </div>
                    )}
                  </div>
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider">Coach IA</p>
                </div>
              </div>
              <motion.button 
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
                onClick={() => setIsOpen(false)}
                className="w-10 h-10 flex items-center justify-center rounded-full clay-btn text-slate-400"
              >
                <X className="w-5 h-5" />
              </motion.button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <AnimatePresence initial={false}>
                {messages.map((message) => (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                    key={message.id} 
                    className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[80%] rounded-[24px] p-5 ${
                      message.sender === 'user' 
                        ? 'bg-emerald-500 text-white rounded-br-sm shadow-[inset_2px_2px_4px_rgba(255,255,255,0.3),inset_-2px_-2px_4px_rgba(0,0,0,0.1),4px_4px_8px_rgba(16,185,129,0.2)]' 
                        : 'bg-[#f8fafc] dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-bl-sm shadow-[inset_2px_2px_6px_rgba(255,255,255,0.8),inset_-2px_-2px_6px_rgba(0,0,0,0.02),6px_6px_16px_rgba(0,0,0,0.04)] dark:shadow-[inset_2px_2px_4px_rgba(255,255,255,0.05),inset_-2px_-2px_4px_rgba(0,0,0,0.2),4px_4px_12px_rgba(0,0,0,0.2)]'
                    }`}>
                      <p className="text-sm font-medium leading-relaxed">{message.text}</p>
                      
                      {/* Render action buttons if any */}
                      {message.sender === 'assistant' && message.action && message.action !== 'NONE' && (
                          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                              {message.action === 'NAVIGATE' && onNavigate && (
                                  <button 
                                    onClick={() => handleAction(message.action!, message.actionData)}
                                    className="flex items-center gap-2 text-xs font-bold text-emerald-600 bg-[#f1f5f9] dark:bg-slate-700 px-4 py-2.5 rounded-[16px] transition hover:scale-105 active:scale-95 shadow-[inset_1px_1px_2px_rgba(255,255,255,0.5),inset_-1px_-1px_2px_rgba(0,0,0,0.05),2px_2px_4px_rgba(0,0,0,0.05)] dark:shadow-[inset_1px_1px_2px_rgba(255,255,255,0.05),inset_-1px_-1px_2px_rgba(0,0,0,0.2),2px_2px_4px_rgba(0,0,0,0.2)]"
                                  >
                                      <Navigation className="w-4 h-4" />
                                      {message.actionData?.label || 'Ir para a tela'}
                                  </button>
                              )}
                              {message.action === 'SHOW_RECIPE' && (
                                  <button 
                                    onClick={() => onNavigate && onNavigate('plan')}
                                    className="flex items-center gap-2 text-xs font-bold text-amber-600 bg-[#f1f5f9] dark:bg-slate-700 px-4 py-2.5 rounded-[16px] transition hover:scale-105 active:scale-95 shadow-[inset_1px_1px_2px_rgba(255,255,255,0.5),inset_-1px_-1px_2px_rgba(0,0,0,0.05),2px_2px_4px_rgba(0,0,0,0.05)] dark:shadow-[inset_1px_1px_2px_rgba(255,255,255,0.05),inset_-1px_-1px_2px_rgba(0,0,0,0.2),2px_2px_4px_rgba(0,0,0,0.2)]"
                                  >
                                      <Utensils className="w-4 h-4" />
                                      Ver no Plano
                                  </button>
                              )}
                               {message.action === 'SHOW_WORKOUT' && (
                                  <button 
                                    onClick={() => onNavigate && onNavigate('trainer')}
                                    className="flex items-center gap-2 text-xs font-bold text-blue-600 bg-[#f1f5f9] dark:bg-slate-700 px-4 py-2.5 rounded-[16px] transition hover:scale-105 active:scale-95 shadow-[inset_1px_1px_2px_rgba(255,255,255,0.5),inset_-1px_-1px_2px_rgba(0,0,0,0.05),2px_2px_4px_rgba(0,0,0,0.05)] dark:shadow-[inset_1px_1px_2px_rgba(255,255,255,0.05),inset_-1px_-1px_2px_rgba(0,0,0,0.2),2px_2px_4px_rgba(0,0,0,0.2)]"
                                  >
                                      <Dumbbell className="w-4 h-4" />
                                      Ir para Treino
                                  </button>
                              )}
                               {message.action === 'UPDATE_PLAN' && (
                                  <button 
                                    onClick={() => onNavigate && onNavigate('coach')}
                                    className="flex items-center gap-2 text-xs font-bold text-indigo-600 bg-[#f1f5f9] dark:bg-slate-700 px-4 py-2.5 rounded-[16px] transition hover:scale-105 active:scale-95 shadow-[inset_1px_1px_2px_rgba(255,255,255,0.5),inset_-1px_-1px_2px_rgba(0,0,0,0.05),2px_2px_4px_rgba(0,0,0,0.05)] dark:shadow-[inset_1px_1px_2px_rgba(255,255,255,0.05),inset_-1px_-1px_2px_rgba(0,0,0,0.2),2px_2px_4px_rgba(0,0,0,0.2)]"
                                  >
                                      <Utensils className="w-4 h-4" />
                                      Ajustar Plano
                                  </button>
                              )}
                          </div>
                      )}
                    </div>
                  </motion.div>
                ))}
                
                {isTyping && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.98 }}
                    transition={{ duration: 0.2 }}
                    className="flex justify-start"
                  >
                    <div className="bg-[#f8fafc] dark:bg-slate-800 rounded-[24px] rounded-bl-sm p-5 shadow-[inset_2px_2px_6px_rgba(255,255,255,0.8),inset_-2px_-2px_6px_rgba(0,0,0,0.02),6px_6px_16px_rgba(0,0,0,0.04)] flex items-center gap-2">
                      <motion.div animate={{ opacity: [0.4, 1, 0.4], y: [0, -3, 0] }} transition={{ duration: 0.8, repeat: Infinity, delay: 0 }} className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      <motion.div animate={{ opacity: [0.4, 1, 0.4], y: [0, -3, 0] }} transition={{ duration: 0.8, repeat: Infinity, delay: 0.15 }} className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      <motion.div animate={{ opacity: [0.4, 1, 0.4], y: [0, -3, 0] }} transition={{ duration: 0.8, repeat: Infinity, delay: 0.3 }} className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-5 bg-white/50 dark:bg-slate-800/50 backdrop-blur-md rounded-b-[32px] border-t border-white/50 dark:border-slate-700/50 shadow-[0_-10px_20px_rgba(0,0,0,0.02)]">
               {/* Quick Suggestions */}
               {messages.length < 3 && !isListening && (
                   <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide">
                       <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setInput('O que eu como agora?')} className="shrink-0 text-xs font-bold px-4 py-2.5 clay-btn text-slate-500">🥗 O que eu como agora?</motion.button>
                       <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setInput('Quero treinar!')} className="shrink-0 text-xs font-bold px-4 py-2.5 clay-btn text-slate-500">🏋️ Quero treinar!</motion.button>
                   </div>
               )}

               {/* Transcript preview when listening */}
               <AnimatePresence>
                 {isListening && (
                   <motion.div 
                     initial={{ opacity: 0, height: 0 }}
                     animate={{ opacity: 1, height: 'auto' }}
                     exit={{ opacity: 0, height: 0 }}
                     className="mb-4 px-4 py-3 bg-emerald-50/80 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 rounded-[20px] shadow-[inset_2px_2px_4px_rgba(0,0,0,0.05),inset_-2px_-2px_4px_rgba(255,255,255,0.8)] text-sm italic"
                   >
                     {transcript || "Ouvindo..."}
                   </motion.div>
                 )}
               </AnimatePresence>

              <div className="flex items-end gap-3">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setVoiceEnabled(!voiceEnabled)}
                  className={`w-12 h-12 flex items-center justify-center rounded-[20px] transition shrink-0 ${
                    voiceEnabled 
                      ? 'clay-btn text-emerald-600 dark:text-slate-300' 
                      : 'bg-[#f1f5f9] dark:bg-slate-800 text-slate-400 shadow-[inset_2px_2px_4px_rgba(0,0,0,0.05)]'
                  }`}
                  title={voiceEnabled ? "Desativar voz da IA" : "Ativar voz da IA"}
                >
                  {voiceEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                </motion.button>
                
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder={isListening ? "Fale agora..." : "Escreva algo..."}
                  disabled={isListening}
                  className={`w-full max-h-32 min-h-12 p-3.5 bg-[#f1f5f9] dark:bg-slate-900 rounded-[24px] outline-none transition resize-none text-sm font-medium ${
                    isListening ? 'shadow-[inset_2px_2px_4px_rgba(16,185,129,0.3)] opacity-50' : 'shadow-[inset_4px_4px_8px_rgba(0,0,0,0.03),inset_-4px_-4px_8px_rgba(255,255,255,0.8)] dark:shadow-[inset_4px_4px_8px_rgba(0,0,0,0.3),inset_-4px_-4px_8px_rgba(255,255,255,0.02)]'
                  }`}
                />
                
                {(!input.trim() && !transcript.trim() && !isListening) || isListening ? (
                  <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={toggleListening}
                    className={`w-12 h-12 flex items-center justify-center rounded-[20px] transition shrink-0 relative overflow-hidden ${
                      isListening 
                        ? 'bg-red-500 text-white shadow-[inset_2px_2px_4px_rgba(255,255,255,0.3),4px_4px_8px_rgba(239,68,68,0.3)]' 
                        : 'clay-btn text-emerald-600 hover:text-emerald-500'
                    }`}
                  >
                    {isListening && (
                      <motion.div 
                        animate={{ scale: [1, 1.5], opacity: [0.5, 0] }} 
                        transition={{ duration: 1, repeat: Infinity }} 
                        className="absolute inset-0 bg-white rounded-full"
                      />
                    )}
                    {isListening ? <MicOff className="w-5 h-5 relative z-10" /> : <Mic className="w-5 h-5" />}
                  </motion.button>
                ) : (
                  <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleSend}
                    disabled={(!input.trim() && !transcript.trim()) || isTyping}
                    className="w-12 h-12 flex items-center justify-center clay-primary transition shrink-0"
                  >
                    <Send className="w-5 h-5 ml-1" />
                  </motion.button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
