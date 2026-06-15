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
      let userFriendlyMsg = "Permissão de microfone negada ou erro ao conectar.";
      if (e.name === 'NotFoundError' || e.message?.toLowerCase().includes('device not found') || e.message?.toLowerCase().includes('requested device')) {
        userFriendlyMsg = "Microfone físico não encontrado ou indisponível neste dispositivo. Conecte um fone de ouvido ou microfone se desejar usar o Assistente de Voz.";
      }
      setError(userFriendlyMsg);
      setIsConnecting(false);
    }
  };

  return (
    <>
      <div 
        className="fixed bottom-24 left-4 md:bottom-6 md:left-6 z-40"
        style={{
          marginRight: '68px',
          marginLeft: '0px',
          paddingBottom: '0px',
          paddingRight: '0px',
          paddingTop: '0px',
          marginTop: '0px',
          marginBottom: '-91px'
        }}
      >
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute bottom-full left-0 mb-4 w-72 bg-rose-500 text-white text-xs font-medium rounded-2xl p-4 shadow-xl border border-rose-450 flex flex-col gap-2 z-50 leading-relaxed"
            >
              <div className="flex justify-between items-center">
                <span className="font-bold uppercase tracking-wider text-[10px] text-rose-100">Assistente Malu</span>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setError(null);
                  }} 
                  className="p-1 hover:bg-rose-600 rounded-lg transition-colors text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <p>{error}</p>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            if (isConnected || isConnecting) {
              stopLive();
            } else {
              startLive();
            }
          }}
          className={`clay-btn p-4 rounded-full shadow-lg flex items-center justify-center gap-2 relative group overflow-hidden transition-all duration-300 ${
            isConnected ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-500 dark:text-emerald-400' : ''
          }`}
          style={{ color: isConnected ? undefined : '#4ac6ca' }}
          title={isConnected ? "Desativar assistente de voz" : "Ativar assistente de voz (Malu)"}
        >
          {(isConnected || isConnecting) && (
            <motion.div
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.4, 0, 0.4]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className={`absolute inset-0 rounded-full ${
                isConnecting ? 'bg-[#4ac6ca]/20' : 'bg-emerald-500/30'
              }`}
            />
          )}
          {isConnecting ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : isConnected ? (
            <Waves className="w-6 h-6 text-emerald-500 dark:text-emerald-400" />
          ) : (
            <Mic className="w-6 h-6" />
          )}
        </motion.button>
      </div>
    </>
  );
}
