import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, X, Loader2, Volume2, Waves } from 'lucide-react';
import { UserProfile } from '../types';

interface LiveAssistantProps {
  profile: UserProfile | null;
}

export function LiveAssistant({ profile }: LiveAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);

  // Audio queue for playback
  const audioQueueRef = useRef<AudioBuffer[]>([]);
  const isPlayingRef = useRef(false);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);

  useEffect(() => {
    return () => {
      stopLive();
    };
  }, []);

  const playNextAudio = () => {
    if (audioQueueRef.current.length === 0 || !audioContextRef.current) {
      isPlayingRef.current = false;
      return;
    }
    
    isPlayingRef.current = true;
    const buffer = audioQueueRef.current.shift();
    if (!buffer) return;

    const source = audioContextRef.current.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContextRef.current.destination);
    source.onended = () => {
      playNextAudio();
    };
    source.start();
    sourceNodeRef.current = source;
  };

  const handleAudioData = async (base64OpusOrPcm: string) => {
    if (!audioContextRef.current) return;
    try {
      // Decode base64 16-bit 24kHz PCM from Gemini to AudioBuffer
      const binaryStr = atob(base64OpusOrPcm);
      const pcm16 = new Int16Array(binaryStr.length / 2);
      for (let i = 0; i < pcm16.length; i++) {
        const low = binaryStr.charCodeAt(i * 2);
        const high = binaryStr.charCodeAt(i * 2 + 1);
        pcm16[i] = (high << 8) | low;
      }
      
      const audioBuffer = audioContextRef.current.createBuffer(1, pcm16.length, 24000);
      const channelData = audioBuffer.getChannelData(0);
      for (let i = 0; i < pcm16.length; i++) {
        channelData[i] = pcm16[i] / 0x7FFF;
      }
      
      audioQueueRef.current.push(audioBuffer);
      if (!isPlayingRef.current) {
        playNextAudio();
      }
    } catch (e) {
      console.error("Audio decode error:", e);
    }
  };

  const stopLive = () => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (sessionRef.current) {
      try { sessionRef.current.close(); } catch(e){}
      sessionRef.current = null;
    }
    if (sourceNodeRef.current) {
      try { sourceNodeRef.current.stop(); } catch(e){}
      sourceNodeRef.current = null;
    }
    audioQueueRef.current = [];
    isPlayingRef.current = false;
    setIsConnected(false);
    setIsConnecting(false);
  };

  const startLive = async () => {
    setIsConnecting(true);
    setError(null);
    try {
      if (!audioContextRef.current) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        audioContextRef.current = new AudioContextClass({ sampleRate: 16000 });
      } else if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const source = audioContextRef.current.createMediaStreamSource(stream);
      const processor = audioContextRef.current.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;
      
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${protocol}//${window.location.host}/live`);
      sessionRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        setIsConnecting(false);
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          
          if (msg.error) {
            setError(msg.error);
            stopLive();
          }
          if (msg.audio) {
            handleAudioData(msg.audio);
          }
          if (msg.interrupted) {
            if (sourceNodeRef.current) {
              try { sourceNodeRef.current.stop(); } catch(e){}
              sourceNodeRef.current = null;
            }
            audioQueueRef.current = [];
            isPlayingRef.current = false;
          }
        } catch(e) {
          console.error("Error parsing WS message:", e);
        }
      };

      ws.onerror = (err) => {
        console.error(err);
        setError("Erro na conexão com o servidor Live");
        stopLive();
      };

      ws.onclose = () => {
        stopLive();
      };

      processor.onaudioprocess = (e) => {
        if (!sessionRef.current || sessionRef.current.readyState !== WebSocket.OPEN) return;
        const inputData = e.inputBuffer.getChannelData(0);
        const pcm16 = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          pcm16[i] = Math.max(-1, Math.min(1, inputData[i])) * 0x7FFF;
        }
        
        // base64 encode
        const buffer = new ArrayBuffer(pcm16.length * 2);
        const view = new DataView(buffer);
        for (let i = 0; i < pcm16.length; i++) {
          view.setInt16(i * 2, pcm16[i], true); // little-endian
        }
        const uint8Array = new Uint8Array(buffer);
        let binaryStr = '';
        for (let i = 0; i < uint8Array.length; i++) {
          binaryStr += String.fromCharCode(uint8Array[i]);
        }
        const base64Data = btoa(binaryStr);
        
        sessionRef.current.send(JSON.stringify({ audio: base64Data }));
      };
      
      source.connect(processor);
      processor.connect(audioContextRef.current.destination);

    } catch (e: any) {
      console.error(e);
      setError("Permissão de microfone negada ou erro ao conectar.");
      setIsConnecting(false);
    }
  };

  return (
    <>
      <div className="fixed bottom-24 left-4 md:bottom-6 md:left-6 z-40">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            setIsOpen(true);
            if (!isConnected && !isConnecting) {
              startLive();
            }
          }}
          className="clay-btn p-4 rounded-full shadow-lg flex items-center justify-center gap-2 relative group overflow-hidden"
          style={{ color: '#4ac6ca' }}
        >
          {isConnected && (
            <motion.div animate={{ scale: [1, 1.3], opacity: [0.5, 0] }} transition={{ duration: 1.5, repeat: Infinity }} className="absolute inset-0 bg-[#4ac6ca]/20 rounded-full" />
          )}
          <Mic className="w-6 h-6" />
        </motion.button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="fixed bottom-40 left-4 md:bottom-24 md:left-6 z-50 w-80 bg-white dark:bg-slate-900 rounded-[32px] p-6 shadow-2xl border border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center gap-6"
          >
            <button onClick={() => { setIsOpen(false); stopLive(); }} className="absolute top-4 right-4 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
            <div className="text-center space-y-2">
              <h3 className="font-bold text-lg">Malu Ao Vivo</h3>
              <p className="text-xs text-slate-500">Conversa natural por voz</p>
            </div>
            
            <div className="relative">
              <motion.div 
                animate={isConnected ? { scale: [1, 1.2, 1] } : {}} 
                transition={{ duration: 2, repeat: Infinity }}
                className={`w-24 h-24 rounded-full flex items-center justify-center ${isConnected ? 'bg-emerald-500 shadow-lg shadow-emerald-500/40 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}
              >
                {isConnecting ? <Loader2 className="w-8 h-8 animate-spin" /> : <Mic className="w-8 h-8" />}
              </motion.div>
            </div>

            {error && <div className="text-red-500 text-sm text-center">{error}</div>}

            <div className="text-sm font-medium">
              {isConnecting ? "Conectando..." : isConnected ? "Ouvindo... Pode falar!" : "Desconectado"}
            </div>
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={isConnected ? stopLive : startLive}
              className={`w-full py-3 rounded-xl font-bold transition-colors ${isConnected ? 'bg-red-50 text-red-500 hover:bg-red-100' : 'bg-emerald-50 text-emerald-500 hover:bg-emerald-100'}`}
            >
              {isConnected ? "Encerrar" : "Ligar"}
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
