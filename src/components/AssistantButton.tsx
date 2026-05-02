import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, Bot, X, Send, Mic, MicOff, Loader2 } from 'lucide-react';
import { chatWithAssistant, textToSpeech } from '../lib/gemini';
import { UserProfile } from '../types';

interface AssistantButtonProps {
  profile: UserProfile | null;
}

export function AssistantButton({ profile }: AssistantButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ id: string; role: 'user' | 'model'; text: string }[]>([
    { id: '1', role: 'model', text: 'Oi! Quer uma sugestão saudável pra hoje? Me fala o que você tem na geladeira 😊' }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const currentAudioSourceRef = useRef<AudioBufferSourceNode | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  useEffect(() => {
    // Setup Speech Recognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'pt-BR';

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputText(transcript);
        handleSend(transcript);
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
    
    // Setup Audio Context
    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      if (currentAudioSourceRef.current) {
        currentAudioSourceRef.current.stop();
      }
    };
  }, []);

  const toggleListen = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      if (isPlaying) {
        stopAudio();
      }
      try {
        recognitionRef.current?.start();
        setIsListening(true);
      } catch (e) {
        console.error(e);
      }
    }
  };

  const playTTS = async (text: string) => {
    try {
      const base64Audio = await textToSpeech(text);
      if (!base64Audio) return;

      const binary = atob(base64Audio);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const int16Array = new Int16Array(bytes.buffer);
      
      const float32Array = new Float32Array(int16Array.length);
      for (let i = 0; i < int16Array.length; i++) {
        float32Array[i] = int16Array[i] / 32768.0;
      }
      
      const audioCtx = audioContextRef.current;
      if (!audioCtx) return;
      
      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }

      const buffer = audioCtx.createBuffer(1, float32Array.length, 24000);
      buffer.getChannelData(0).set(float32Array);
      
      stopAudio();
      
      const source = audioCtx.createBufferSource();
      source.buffer = buffer;
      source.connect(audioCtx.destination);
      
      source.onended = () => {
        setIsPlaying(false);
        currentAudioSourceRef.current = null;
      };
      
      currentAudioSourceRef.current = source;
      source.start();
      setIsPlaying(true);
    } catch (e) {
      console.error("Error playing audio", e);
    }
  };

  const stopAudio = () => {
    if (currentAudioSourceRef.current) {
      currentAudioSourceRef.current.stop();
      currentAudioSourceRef.current = null;
      setIsPlaying(false);
    }
  };

  const handleSend = async (overrideText?: string) => {
    const textToSend = overrideText || inputText;
    if (!textToSend.trim()) return;

    if (isPlaying) stopAudio();

    const userMessage = { id: crypto.randomUUID(), role: 'user' as const, text: textToSend.trim() };
    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsTyping(true);

    const historyForGemini = messages.map(m => ({ role: m.role, parts: [{ text: m.text }] }));

    const responseText = await chatWithAssistant(historyForGemini, userMessage.text, profile);
    
    const botMessage = { id: crypto.randomUUID(), role: 'model' as const, text: responseText };
    setMessages(prev => [...prev, botMessage]);
    setIsTyping(false);
    
    // Play the TTS logic in background
    playTTS(responseText);
  };

  return (
    <>
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
        {/* Chat Window */}
        {isOpen && (
          <div className="bg-white/90 dark:bg-slate-900/95 backdrop-blur-xl w-[320px] sm:w-[380px] h-[500px] mb-4 rounded-[32px] shadow-2xl border border-white/60 dark:border-slate-800/60 flex flex-col overflow-hidden animate-in slide-in-from-bottom-8 fade-in duration-500 origin-bottom-right">
            {/* Header */}
            <div className="p-4 bg-emerald-500 text-white flex justify-between items-center shadow-md">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center shrink-0">
                  <Bot className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-sans font-medium text-lg leading-tight">Assistente Nutri</h3>
                  <p className="text-emerald-100 text-xs">Sempre aqui pra ajudar</p>
                </div>
              </div>
              <button 
                onClick={() => { setIsOpen(false); stopAudio(); }} 
                className="w-8 h-8 flex items-center justify-center hover:bg-white/20 rounded-full transition-colors"
                aria-label="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 font-sans text-sm">
              {messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div 
                    className={`max-w-[85%] p-3 rounded-2xl ${
                      msg.role === 'user' 
                      ? 'bg-emerald-500 text-white rounded-tr-sm' 
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-tl-sm'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-2xl rounded-tl-sm text-slate-500 dark:text-slate-400 flex gap-1 items-center h-10">
                    <span className="w-2 h-2 bg-slate-400 dark:bg-slate-600 rounded-full animate-bounce"></span>
                    <span className="w-2 h-2 bg-slate-400 dark:bg-slate-600 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                    <span className="w-2 h-2 bg-slate-400 dark:bg-slate-600 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white/60 dark:bg-slate-900/60 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleListen}
                  className={`w-10 h-10 flex items-center justify-center rounded-full transition-all shrink-0 ${
                    isListening 
                    ? 'bg-red-500 text-white animate-pulse' 
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                  title={isListening ? 'Parar gravação' : 'Falar com a assistente'}
                >
                  {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Digite ou fale algo..."
                    disabled={isListening}
                    className="w-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-full px-4 py-2.5 outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all text-sm disabled:opacity-50"
                  />
                  <button
                    onClick={() => handleSend()}
                    disabled={!inputText.trim() || isListening}
                    className="absolute right-1 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-emerald-500 text-white rounded-full hover:bg-emerald-600 disabled:opacity-50 disabled:hidden transition-colors"
                  >
                    <Send className="w-4 h-4 ml-0.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Floating Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`relative flex items-center justify-center w-14 h-14 bg-emerald-500 text-white rounded-full shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95 group focus:outline-none ${
            isPlaying || isListening ? 'animate-pulse ring-4 ring-emerald-500/30' : ''
          }`}
          aria-label="Abrir Assistente"
        >
          {isOpen ? (
            <X className="w-6 h-6 transform group-hover:rotate-90 transition-transform duration-300" />
          ) : (
            <Bot className="w-6 h-6 transform group-hover:-translate-y-1 transition-transform" />
          )}
          {/* Subtle glow / dot when inactive but closed */}
          {!isOpen && !isPlaying && !isListening && (
            <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 border-2 border-white rounded-full"></span>
          )}
        </button>
      </div>
    </>
  );
}
