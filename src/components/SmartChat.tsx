import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bot, User, Send, X, MessageCircle, Navigation, Dumbbell, Utensils, Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { UserProfile } from '../types';
import { chatWithAssistant, textToSpeech } from '../lib/gemini';

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
  const [messages, setMessages] = useState<ChatMessage[]>([]);
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
    setIsSpeaking(false);
  };

  const playAssistantVoice = async (text: string) => {
    try {
      setIsSpeaking(true);
      const audioUrl = await textToSpeech(text);
      if (!audioUrl) {
        setIsSpeaking(false);
        return;
      }
      
      const audio = new Audio(audioUrl);
      audio.onended = () => setIsSpeaking(false);
      audio.play().catch(e => {
        console.error("Audio play failed, user interaction may be required:", e);
        setIsSpeaking(false);
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
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-24 right-4 z-40 bg-emerald-600 text-white p-4 rounded-full shadow-lg hover:shadow-xl hover:bg-emerald-700 transition"
          >
            <MessageCircle className="w-6 h-6" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.95 }}
            className="fixed inset-x-4 bottom-24 md:bottom-6 md:right-6 md:left-auto md:w-96 h-[600px] max-h-[80vh] z-50 flex flex-col bg-slate-50 dark:bg-slate-900 rounded-[32px] shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/50 rounded-full flex items-center justify-center text-emerald-600">
                    <Bot className="w-6 h-6" />
                  </div>
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-slate-800 rounded-full"></div>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900 dark:text-white leading-tight">Malu</h3>
                    {isSpeaking && (
                      <div className="flex items-center gap-0.5 h-3">
                        <motion.div animate={{ height: [4, 12, 4] }} transition={{ duration: 0.8, repeat: Infinity, delay: 0 }} className="w-1 bg-emerald-500 rounded-full" />
                        <motion.div animate={{ height: [4, 8, 4] }} transition={{ duration: 0.8, repeat: Infinity, delay: 0.2 }} className="w-1 bg-emerald-500 rounded-full" />
                        <motion.div animate={{ height: [4, 10, 4] }} transition={{ duration: 0.8, repeat: Infinity, delay: 0.4 }} className="w-1 bg-emerald-500 rounded-full" />
                      </div>
                    )}
                  </div>
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider">Coach IA</p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => (
                <div 
                  key={message.id} 
                  className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[80%] rounded-2xl p-4 ${
                    message.sender === 'user' 
                      ? 'bg-emerald-600 text-white rounded-br-none' 
                      : 'bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-bl-none shadow-sm'
                  }`}>
                    <p className="text-sm font-medium leading-relaxed">{message.text}</p>
                    
                    {/* Render action buttons if any */}
                    {message.sender === 'assistant' && message.action && message.action !== 'NONE' && (
                        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                            {message.action === 'NAVIGATE' && onNavigate && (
                                <button 
                                  onClick={() => handleAction(message.action!, message.actionData)}
                                  className="flex items-center gap-2 text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 px-3 py-2 rounded-xl transition hover:bg-emerald-100"
                                >
                                    <Navigation className="w-4 h-4" />
                                    {message.actionData?.label || 'Ir para a tela'}
                                </button>
                            )}
                            {message.action === 'SHOW_RECIPE' && (
                                <button 
                                  onClick={() => onNavigate && onNavigate('plan')}
                                  className="flex items-center gap-2 text-xs font-bold text-amber-600 bg-amber-50 dark:bg-amber-900/30 px-3 py-2 rounded-xl transition hover:bg-amber-100"
                                >
                                    <Utensils className="w-4 h-4" />
                                    Ver no Plano
                                </button>
                            )}
                             {message.action === 'SHOW_WORKOUT' && (
                                <button 
                                  onClick={() => onNavigate && onNavigate('trainer')}
                                  className="flex items-center gap-2 text-xs font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/30 px-3 py-2 rounded-xl transition hover:bg-blue-100"
                                >
                                    <Dumbbell className="w-4 h-4" />
                                    Ir para Treino
                                </button>
                            )}
                        </div>
                    )}
                  </div>
                </div>
              ))}
              
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl rounded-bl-none p-4 shadow-sm flex items-center gap-2">
                    <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1, repeat: Infinity, delay: 0 }} className="w-2 h-2 rounded-full bg-slate-300" />
                    <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1, repeat: Infinity, delay: 0.2 }} className="w-2 h-2 rounded-full bg-slate-300" />
                    <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1, repeat: Infinity, delay: 0.4 }} className="w-2 h-2 rounded-full bg-slate-300" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700">
               {/* Quick Suggestions */}
               {messages.length < 3 && !isListening && (
                   <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide">
                       <button onClick={() => setInput('O que eu como agora?')} className="shrink-0 text-xs font-bold px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700 transition">🥗 O que eu como agora?</button>
                       <button onClick={() => setInput('Quero treinar!')} className="shrink-0 text-xs font-bold px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700 transition">🏋️ Quero treinar!</button>
                   </div>
               )}

               {/* Transcript preview when listening */}
               <AnimatePresence>
                 {isListening && (
                   <motion.div 
                     initial={{ opacity: 0, height: 0 }}
                     animate={{ opacity: 1, height: 'auto' }}
                     exit={{ opacity: 0, height: 0 }}
                     className="mb-3 px-3 py-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 rounded-xl text-sm italic border border-emerald-100 dark:border-emerald-800"
                   >
                     {transcript || "Ouvindo..."}
                   </motion.div>
                 )}
               </AnimatePresence>

              <div className="flex items-end gap-2">
                <button
                  onClick={() => setVoiceEnabled(!voiceEnabled)}
                  className={`w-12 h-12 flex items-center justify-center rounded-2xl transition shrink-0 ${
                    voiceEnabled 
                      ? 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600' 
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                  title={voiceEnabled ? "Desativar voz da IA" : "Ativar voz da IA"}
                >
                  {voiceEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                </button>
                
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
                  className={`w-full max-h-32 min-h-12 p-3 bg-slate-50 dark:bg-slate-900 border rounded-2xl outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition resize-none text-sm font-medium ${
                    isListening ? 'border-emerald-500 ring-1 ring-emerald-500 opacity-50' : 'border-slate-200 dark:border-slate-700'
                  }`}
                />
                
                {(!input.trim() && !transcript.trim() && !isListening) || isListening ? (
                  <button 
                    onClick={toggleListening}
                    className={`w-12 h-12 flex items-center justify-center rounded-2xl transition shrink-0 relative overflow-hidden ${
                      isListening 
                        ? 'bg-red-500 text-white shadow-lg shadow-red-500/30' 
                        : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400 hover:bg-emerald-200'
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
                  </button>
                ) : (
                  <button 
                    onClick={handleSend}
                    disabled={(!input.trim() && !transcript.trim()) || isTyping}
                    className="w-12 h-12 flex items-center justify-center bg-emerald-600 text-white rounded-2xl hover:bg-emerald-700 transition disabled:opacity-50 disabled:hover:bg-emerald-600 shrink-0"
                  >
                    <Send className="w-5 h-5 ml-1" />
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
