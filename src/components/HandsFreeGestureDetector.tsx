import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, CameraOff, Hand, Sparkles, AlertCircle, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { playSfx, vibrate } from '../lib/sensory';

export interface HandsFreeGestureDetectorProps {
  isActive: boolean;
  isEnabled: boolean;
  isSpeaking: boolean;
  onToggleEnabled: (enabled: boolean) => void;
  onGestureDetected: (type: 'wave' | 'palm') => void;
  lastGestureTrigger?: { type: 'wave' | 'palm'; timestamp: number } | null;
  className?: string;
}

export const HandsFreeGestureDetector: React.FC<HandsFreeGestureDetectorProps> = ({
  isActive,
  isEnabled,
  isSpeaking,
  onToggleEnabled,
  onGestureDetected,
  lastGestureTrigger,
  className = ''
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const prevFrameDataRef = useRef<Uint8ClampedArray | null>(null);
  const lastTriggerTimeRef = useRef<number>(0);

  const [cameraStatus, setCameraStatus] = useState<'idle' | 'requesting' | 'active' | 'denied' | 'unsupported'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [motionIntensity, setMotionIntensity] = useState<number>(0);
  const [justTriggered, setJustTriggered] = useState<boolean>(false);

  // Trigger gesture action with haptics and cooldown
  const triggerGesture = useCallback((type: 'wave' | 'palm') => {
    const now = Date.now();
    // Enforce 1400ms cooldown between gesture triggers
    if (now - lastTriggerTimeRef.current < 1400) return;

    lastTriggerTimeRef.current = now;
    setJustTriggered(true);
    playSfx('pop');
    vibrate([40, 60, 40]);
    onGestureDetected(type);

    setTimeout(() => {
      setJustTriggered(false);
    }, 1800);
  }, [onGestureDetected]);

  // Clean up camera stream
  const stopCamera = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    prevFrameDataRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraStatus('idle');
    setMotionIntensity(0);
  }, []);

  // Start camera stream for motion detection
  const startCamera = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setCameraStatus('unsupported');
      setErrorMessage('Câmera não suportada neste navegador.');
      return;
    }

    try {
      setCameraStatus('requesting');
      setErrorMessage(null);

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 160 },
          height: { ideal: 120 },
          frameRate: { max: 15 }
        },
        audio: false
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch((err) => {
          console.warn('Video play error:', err);
        });
      }

      setCameraStatus('active');
    } catch (err: any) {
      console.warn('Gesture camera permission/access error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraStatus('denied');
        setErrorMessage('Permissão de câmera negada. Você pode simular o aceno de mão abaixo.');
      } else {
        setCameraStatus('denied');
        setErrorMessage('Câmera indisponível no ambiente. Use o simulador de gesto.');
      }
    }
  }, []);

  // Handle active/enabled lifecycle
  useEffect(() => {
    if (isActive && isEnabled) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isActive, isEnabled, startCamera, stopCamera]);

  // Frame processing loop for motion / wave detection
  useEffect(() => {
    if (cameraStatus !== 'active') return;

    let isProcessing = true;
    const canvas = canvasRef.current || document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 24;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    let lastSampleTime = 0;

    const processFrame = (timestamp: number) => {
      if (!isProcessing) return;

      // Sample every ~80ms (approx 12 fps, very light on CPU)
      if (timestamp - lastSampleTime >= 80 && videoRef.current && ctx) {
        lastSampleTime = timestamp;

        try {
          if (videoRef.current.readyState >= 2) {
            ctx.drawImage(videoRef.current, 0, 0, 32, 24);
            const frame = ctx.getImageData(0, 0, 32, 24);
            const currentData = frame.data;

            if (prevFrameDataRef.current) {
              const prevData = prevFrameDataRef.current;
              let totalDelta = 0;
              let significantPixels = 0;
              const totalPixels = 32 * 24;

              for (let i = 0; i < currentData.length; i += 4) {
                // Luminance diff
                const rDiff = Math.abs(currentData[i] - prevData[i]);
                const gDiff = Math.abs(currentData[i + 1] - prevData[i + 1]);
                const bDiff = Math.abs(currentData[i + 2] - prevData[i + 2]);
                const delta = (rDiff + gDiff + bDiff) / 3;

                totalDelta += delta;
                if (delta > 30) {
                  significantPixels++;
                }
              }

              const avgDelta = totalDelta / totalPixels;
              const ratioChanged = significantPixels / totalPixels;
              const computedIntensity = Math.min(100, Math.round(avgDelta * 2.5 + ratioChanged * 50));
              setMotionIntensity(computedIntensity);

              // Gesture detection threshold: sudden hand wave across lens or open palm coverage
              // avgDelta > 18 or ratioChanged > 0.22 indicates deliberate movement in front of device
              if ((avgDelta > 19 || ratioChanged > 0.25) && (Date.now() - lastTriggerTimeRef.current > 1400)) {
                triggerGesture('wave');
              }
            }

            // Copy frame for next tick
            prevFrameDataRef.current = new Uint8ClampedArray(currentData);
          }
        } catch (e) {
          // Non-fatal frame capture error
        }
      }

      animationFrameRef.current = requestAnimationFrame(processFrame);
    };

    animationFrameRef.current = requestAnimationFrame(processFrame);

    return () => {
      isProcessing = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [cameraStatus, triggerGesture]);

  return (
    <div
      className={`rounded-2xl border transition-all duration-300 ${
        justTriggered
          ? 'bg-amber-950/70 border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.35)]'
          : isEnabled
          ? 'bg-slate-900/80 border-cyan-500/30 shadow-md'
          : 'bg-slate-900/50 border-white/10 opacity-80'
      } p-3 sm:p-4 ${className}`}
    >
      {/* Hidden offscreen canvas and video element for optical motion analysis */}
      <div className="hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          width={160}
          height={120}
        />
        <canvas ref={canvasRef} width={32} height={24} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left Side: Sensor Status & Explanatory Text */}
        <div className="flex items-center gap-3">
          {/* Animated Sensor Icon / Radar */}
          <div className="relative flex items-center justify-center">
            {cameraStatus === 'active' && isEnabled && (
              <span
                className={`absolute w-8 h-8 rounded-full pointer-events-none transition-all ${
                  justTriggered
                    ? 'bg-amber-400 animate-ping'
                    : 'bg-cyan-400/30 animate-pulse'
                }`}
              />
            )}
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center text-white transition-all shadow-md ${
                justTriggered
                  ? 'bg-gradient-to-br from-amber-500 to-orange-500 text-slate-950 shadow-amber-500/30'
                  : cameraStatus === 'active' && isEnabled
                  ? 'bg-gradient-to-br from-cyan-500 to-blue-600 shadow-cyan-500/20'
                  : 'bg-slate-800 text-slate-400 border border-white/10'
              }`}
            >
              <Hand
                className={`w-5 h-5 transition-transform ${
                  justTriggered
                    ? 'scale-125 rotate-12 text-slate-950'
                    : cameraStatus === 'active' && isEnabled
                    ? 'animate-pulse text-white'
                    : 'text-slate-400'
                }`}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span
                className={`text-[11px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border flex items-center gap-1.5 ${
                  justTriggered
                    ? 'bg-amber-500 text-slate-950 border-amber-300 font-extrabold shadow-sm'
                    : cameraStatus === 'active' && isEnabled
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                    : cameraStatus === 'denied'
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                    : 'bg-slate-800 text-slate-400 border-white/10'
                }`}
              >
                {justTriggered ? (
                  <>
                    <Sparkles className="w-3 h-3 text-slate-950" />
                    <span>✋ Gesto Detectado: Leitura Pausada!</span>
                  </>
                ) : cameraStatus === 'active' && isEnabled ? (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                    <span>Sensor de Gesto Ativo</span>
                  </>
                ) : cameraStatus === 'denied' ? (
                  <>
                    <AlertCircle className="w-3 h-3 text-rose-400" />
                    <span>Câmera Indisponível</span>
                  </>
                ) : (
                  <span>Sensor de Gesto Desativado</span>
                )}
              </span>

              {/* Real-time optical motion meter */}
              {cameraStatus === 'active' && isEnabled && (
                <div
                  className="hidden sm:flex items-center gap-1 text-[10px] font-mono text-cyan-300/80 bg-black/40 px-2 py-0.5 rounded-md border border-cyan-500/20"
                  title="Intensidade de movimento capturada pela lente"
                >
                  <span>Sensibilidade:</span>
                  <div className="w-12 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-100 ${
                        motionIntensity > 35 ? 'bg-amber-400' : 'bg-cyan-400'
                      }`}
                      style={{ width: `${Math.min(100, motionIntensity)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            <p className="text-xs text-slate-300 mt-0.5 font-medium flex items-center gap-1.5">
              {justTriggered ? (
                <span className="text-amber-300 font-bold">
                  A leitura foi pausada imediatamente pelo seu aceno. Diga "Continuar" para retomar.
                </span>
              ) : cameraStatus === 'active' && isEnabled ? (
                <span>
                  Passe a mão ou mostre a palma ✋ na frente da câmera para <strong>pausar a leitura</strong> sem tocar na tela.
                </span>
              ) : cameraStatus === 'denied' ? (
                <span>{errorMessage || 'Use o botão de simulação para testar a pausa por gesto.'}</span>
              ) : (
                <span>Ative o sensor de câmera para pausar acenando a mão enquanto cozinha com mãos ocupadas.</span>
              )}
            </p>
          </div>
        </div>

        {/* Right Side Controls: Toggle & Simulation Button */}
        <div className="flex items-center gap-2">
          {/* Quick Simulation Button for Immediate Testing */}
          <button
            type="button"
            onClick={() => triggerGesture('wave')}
            className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-bold transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 shadow-sm"
            title="Simular aceno de mão para pausar a leitura imediatamente"
          >
            <Hand className="w-3.5 h-3.5" />
            <span>Simular Aceno ✋</span>
          </button>

          {/* Camera Sensor On/Off Toggle */}
          <button
            type="button"
            onClick={() => onToggleEnabled(!isEnabled)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 ${
              isEnabled
                ? 'bg-cyan-500/25 border-cyan-400/50 text-cyan-200 hover:bg-cyan-500/35'
                : 'bg-slate-800 border-white/10 text-slate-400 hover:text-white'
            }`}
            title={isEnabled ? 'Desativar sensor de gesto por câmera' : 'Ativar sensor de gesto por câmera'}
          >
            {isEnabled ? (
              <>
                <Camera className="w-3.5 h-3.5 text-cyan-400" />
                <span>Sensor Ligado</span>
              </>
            ) : (
              <>
                <CameraOff className="w-3.5 h-3.5 text-slate-400" />
                <span>Ligar Sensor</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Privacy Guarantee Note */}
      {isEnabled && cameraStatus === 'active' && (
        <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-slate-400">
          <span className="flex items-center gap-1 text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            Processamento 100% óptico e local no seu aparelho. Nenhum vídeo ou foto é gravado ou transmitido.
          </span>
          <span className="text-[10px] font-mono text-cyan-400">
            Pausa Instantânea ✋
          </span>
        </div>
      )}
    </div>
  );
};

export default HandsFreeGestureDetector;
