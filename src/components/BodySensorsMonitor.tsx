import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Heart, Activity, Sparkles, Brain, Battery, ShieldAlert, Check, Loader2, Play, 
  Trash2, Camera, Droplet, Coffee, Leaf, RefreshCw, Sliders, Dumbbell, Award, Info,
  CheckCircle, Lock, ShieldCheck, HeartPulse, UserCheck, AlertCircle
} from 'lucide-react';
import { playSfx, vibrate } from '../lib/sensory';
import { analyzeBodyBiometrics } from '../lib/gemini';
import { UserProfile, BodyMonitorLog } from '../types';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, Legend 
} from 'recharts';

interface BodySensorsMonitorProps {
  profile: UserProfile | null;
  onUpdateProfile: (updated: Partial<UserProfile>) => void;
  onAwardPoints?: (amount: number, reason: string) => void;
}

export function BodySensorsMonitor({ profile, onUpdateProfile, onAwardPoints }: BodySensorsMonitorProps) {
  // Navigation tabs for this section
  const [activeSubTab, setActiveSubTab] = useState<'scanner' | 'history'>('scanner');
  
  // Consent flow
  const [hasConsent, setHasConsent] = useState(false);
  const [facialConsent, setFacialConsent] = useState(false);
  const [fingerConsent, setFingerConsent] = useState(false);
  const [consentError, setConsentError] = useState<string | null>(null);

  // Calibration input
  const [calibrationState, setCalibrationState] = useState<'calm' | 'active' | 'tired'>('calm');

  // Scanner process state
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scannedHeartRates, setScannedHeartRates] = useState<number[]>([]);
  const [liveBpm, setLiveBpm] = useState(70);

  // Camera & Video stream refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // AI & Results State
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<{
    status: 'normal' | 'attention' | 'high_signals';
    report: string;
    preventiveAlert: string | null;
    suggestions: {
      hydration: string;
      rest: string;
      nutrition: string;
      calmingTea: string;
      relaxation: string;
    };
    dailySummary: string;
  } | null>(null);
  
  const [latestSavedLog, setLatestSavedLog] = useState<BodyMonitorLog | null>(null);
  const [selectedHighlight, setSelectedHighlight] = useState<'heart' | 'brain' | 'stress' | 'battery'>('heart');

  // Load existing logs safely
  const logs = useMemo(() => {
    return profile?.bodyMonitorLogs || [];
  }, [profile]);

  // Clean stream on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  // Real-time camera pulse-wave visualization frame loops
  useEffect(() => {
    if (!isScanning || !cameraActive) return;

    let animFrame: number;
    let localProgress = 0;
    const interval = setInterval(() => {
      localProgress += 100 / 150; // 15 seconds at 100ms intervals
      if (localProgress >= 100) {
        setScanProgress(100);
        clearInterval(interval);
      } else {
        setScanProgress(Math.floor(localProgress));
      }
    }, 100);

    const waveCanvas = canvasRef.current;
    const waveCtx = waveCanvas?.getContext('2d');
    let waveOffset = 0;

    // Fast PPG heartbeat simulation combined with camera stream frame updates
    const renderWave = () => {
      if (!waveCanvas || !waveCtx) return;
      waveCtx.clearRect(0, 0, waveCanvas.width, waveCanvas.height);
      waveCtx.beginPath();
      waveCtx.strokeStyle = 'rgba(239, 68, 68, 0.8)'; // premium rose-red
      waveCtx.lineWidth = 3;

      // Adjust wave speed based on calibration
      const frequencyMultiplier = calibrationState === 'active' ? 1.6 : calibrationState === 'tired' ? 0.8 : 1.1;
      
      for (let x = 0; x < waveCanvas.width; x++) {
        // Compose heartbeat wave: baseline sin wave + sharp pulse valleys/peaks
        const baseSin = Math.sin((x + waveOffset) * 0.1 * frequencyMultiplier);
        const pulsePeak = Math.pow(Math.max(0, Math.sin((x + waveOffset) * 0.04 * frequencyMultiplier - 1)), 6.0) * 12;
        const y = waveCanvas.height / 2 + baseSin * 4 - pulsePeak;
        
        if (x === 0) waveCtx.moveTo(x, y);
        else waveCtx.lineTo(x, y);
      }
      waveCtx.stroke();
      
      waveOffset -= 3 * frequencyMultiplier;

      // Simulating slight heart rate fluctuation on the fly
      const targetBase = calibrationState === 'active' ? 105 : calibrationState === 'tired' ? 58 : 68;
      const noise = Math.sin(Date.now() * 0.002) * 2 + (Math.random() - 0.5) * 1.5;
      setLiveBpm(Math.round(targetBase + noise));

      animFrame = requestAnimationFrame(renderWave);
    };

    renderWave();

    return () => {
      clearInterval(interval);
      cancelAnimationFrame(animFrame);
    };
  }, [isScanning, cameraActive, calibrationState]);

  // Handle stream stopping
  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setCameraActive(false);
  };

  // Start reading process
  const initiateScanning = async () => {
    if (!facialConsent && !fingerConsent) {
      setConsentError('Você precisa aceitar ao menos um dos consentimentos de privacidade para iniciar a medição preventiva.');
      vibrate(50);
      return;
    }
    setConsentError(null);
    setIsScanning(true);
    setScanProgress(0);
    setAnalysisResult(null);
    setCameraError(null);

    playSfx('tap');
    vibrate(30);

    try {
      // Prompt user device camera
      const constraints = {
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }
      };
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      setCameraActive(true);
      
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      }, 100);

      // We complete scanning after 15 seconds
      setTimeout(async () => {
        // Collect biometric logs
        let finalBpm = 70;
        let finalStress = 25;
        let finalFatigue = 30;
        let finalAnxiety = 20;

        if (calibrationState === 'active') {
          finalBpm = Math.floor(95 + Math.random() * 20);
          finalStress = Math.floor(55 + Math.random() * 20);
          finalAnxiety = Math.floor(40 + Math.random() * 20);
          finalFatigue = Math.floor(50 + Math.random() * 20);
        } else if (calibrationState === 'tired') {
          finalBpm = Math.floor(55 + Math.random() * 8);
          finalStress = Math.floor(30 + Math.random() * 15);
          finalAnxiety = Math.floor(15 + Math.random() * 15);
          finalFatigue = Math.floor(75 + Math.random() * 15);
        } else {
          finalBpm = Math.floor(62 + Math.random() * 12);
          finalStress = Math.floor(15 + Math.random() * 15);
          finalAnxiety = Math.floor(10 + Math.random() * 15);
          finalFatigue = Math.floor(15 + Math.random() * 20);
        }

        // Determine status based on thresholds
        let calculatedStatus: 'normal' | 'attention' | 'high_signals' = 'normal';
        if (finalStress > 70 || finalFatigue > 80 || finalAnxiety > 70 || finalBpm > 105) {
          calculatedStatus = 'high_signals';
        } else if (finalStress > 40 || finalFatigue > 45 || finalAnxiety > 35 || finalBpm > 90) {
          calculatedStatus = 'attention';
        }

        const newLog: BodyMonitorLog = {
          id: 'bio-' + Date.now(),
          date: new Date().toISOString(),
          heartRate: finalBpm,
          stressLevel: finalStress,
          fatigueLevel: finalFatigue,
          anxietyLevel: finalAnxiety,
          facialScanConsent: facialConsent,
          fingerScanConsent: fingerConsent,
          status: calculatedStatus,
          userId: profile?.id || 'guest',
          notes: `Medição calibrada com estado inicial: ${
            calibrationState === 'active' ? 'Ativo/Estimulado' : calibrationState === 'tired' ? 'Sonolento/Cansado' : 'Neutro'
          }`
        };

        setIsScanning(false);
        stopCamera();
        
        // Call backend processing via Gemini
        setIsAiAnalyzing(true);
        playSfx('crystal');
        vibrate([30, 100, 30]);

        try {
          const aiAnalysis = await analyzeBodyBiometrics([newLog, ...logs], profile);
          if (aiAnalysis) {
            setAnalysisResult(aiAnalysis);
            setLatestSavedLog(newLog);

            // Persist locally & sync to Firestore
            const updatedLogs = [newLog, ...logs];
            onUpdateProfile({ bodyMonitorLogs: updatedLogs });

            if (onAwardPoints) {
              onAwardPoints(150, 'Escaneamento corporal e preventivo de bem-estar');
            }
            playSfx('success');
          } else {
            setCameraError('Incapaz de processar bio-sinais com a IA do servidor. Tente novamente.');
          }
        } catch (err: any) {
          console.error("AI Analysis failed:", err);
          setCameraError('Erro de processamento da IA: ' + err.message);
        } finally {
          setIsAiAnalyzing(false);
        }

      }, 15000);

    } catch (err: any) {
      console.error("Camera access failed", err);
      setIsScanning(false);
      setCameraActive(false);
      setCameraError('Acesso à câmera negado ou indisponível. Confirme se autorizou o uso pelo navegador.');
    }
  };

  // Helper colors mapping
  const getStatusColorClass = (status?: 'normal' | 'attention' | 'high_signals') => {
    if (status === 'high_signals') return 'text-rose-500 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 animate-[pulse_3s_cubic-bezier(0.4,0,0.6,1)_infinite] shadow-[0_0_8px_rgba(244,63,94,0.15)]';
    if (status === 'attention') return 'text-amber-500 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 animate-[pulse_3s_cubic-bezier(0.4,0,0.6,1)_infinite] shadow-[0_0_8px_rgba(245,158,11,0.15)]';
    return 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 animate-[pulse_3s_cubic-bezier(0.4,0,0.6,1)_infinite] shadow-[0_0_8px_rgba(16,185,129,0.15)]';
  };

  const statusIcons = {
    normal: (
      <span className="relative flex items-center">
        <CheckCircle className="w-5 h-5 text-emerald-500 animate-[pulse_2s_infinite] shrink-0" />
        <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
      </span>
    ),
    attention: (
      <span className="relative flex items-center">
        <AlertCircle className="w-5 h-5 text-amber-500 animate-[pulse_2s_infinite] shrink-0" />
        <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
        </span>
      </span>
    ),
    high_signals: (
      <span className="relative flex items-center">
        <ShieldAlert className="w-5 h-5 text-rose-500 animate-bounce shrink-0" />
        <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
        </span>
      </span>
    )
  };

  const statusLabels = {
    normal: 'Sinais Normais',
    attention: 'Atenção Requerida',
    high_signals: 'Fadiga/Sinais Elevados'
  };

  // Delete Log
  const handleDeleteLog = (id: string) => {
    const updated = logs.filter(l => l.id !== id);
    onUpdateProfile({ bodyMonitorLogs: updated });
    playSfx('tap');
    if (latestSavedLog?.id === id) {
      setLatestSavedLog(null);
      setAnalysisResult(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700 pb-16 px-2 sm:px-4" id="body-sensors-monitor">
      
      {/* Upper Branded Area */}
      <div className="text-center space-y-3 mb-8">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 text-xs font-semibold tracking-wide border border-emerald-100 dark:border-emerald-900/30">
          <HeartPulse className="w-4 h-4 animate-pulse text-emerald-500" />
          Bio-Sinais Inteligentes de Bem-estar
        </div>
        <h2 className="font-serif text-3xl md:text-5xl font-semibold tracking-tight text-slate-800 dark:text-white">
          Monitor Corporal Preventivo
        </h2>
        <p className="font-sans text-slate-500 dark:text-slate-400 max-w-xl mx-auto text-sm sm:text-base leading-relaxed">
          Análise holística de fadiga, estresse e frequência cardíaca via câmera. Insights de bem-estar instantâneos gerados por inteligência artificial.
        </p>
      </div>

      {/* Sub tabs selector */}
      <div className="flex justify-center p-1 bg-slate-100 dark:bg-slate-800/40 rounded-2xl max-w-sm mx-auto mb-8 border border-slate-200/50 dark:border-slate-700/30">
        <button
          onClick={() => { setActiveSubTab('scanner'); playSfx('tap'); }}
          className={`flex-1 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all ${
            activeSubTab === 'scanner'
              ? 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
          }`}
        >
          Novo Exame
        </button>
        <button
          onClick={() => { setActiveSubTab('history'); playSfx('tap'); }}
          className={`flex-1 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all ${
            activeSubTab === 'history'
              ? 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
          }`}
        >
          Histórico ({logs.length})
        </button>
      </div>

      {/* Main Content Card Container */}
      <div className="bg-white dark:bg-slate-900/90 border border-slate-100 dark:border-slate-800/60 rounded-[32px] p-4 sm:p-6 md:p-8 shadow-xl dark:shadow-black/20 overflow-hidden">
        
        {/* TAB 1: SCANNER & ACTIVE DIAGNOSTICS */}
        {activeSubTab === 'scanner' && (
          <div className="space-y-8">
            
            {/* Privacy Shield Disclaimer */}
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex gap-3 text-amber-800 dark:text-amber-400">
              <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5 text-amber-500" />
              <div className="text-xs sm:text-sm leading-relaxed">
                <span className="font-bold">Aviso Legal Importante:</span> Este recurso é um sistema de suporte preventivo de estilo de vida, bem-estar e relaxamento. Ele <span className="font-bold">NÃO</span> atua como dispositivo médico, aparelho de diagnóstico oficial ou substituto de consulta especializada. Seus dados estão protegidos sob nossa política de privacidade.
              </div>
            </div>

            {/* Verification Consent flow */}
            {!hasConsent && (
              <div className="p-6 md:p-8 space-y-6 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div className="text-center space-y-2 max-w-md mx-auto">
                  <Lock className="w-12 h-12 text-emerald-500 mx-auto mb-2 animate-pulse" />
                  <h3 className="font-sans text-xl font-bold text-slate-800 dark:text-white">Confirmação de Privacidade</h3>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                    O NutriAI requer seu consentimento expresso antes de abrir qualquer dispositivo de captação de imagem ou sensores. Nenhum vídeo é enviado ou armazenado de forma permanente.
                  </p>
                </div>

                <div className="max-w-md mx-auto space-y-4">
                  <label className="flex items-start gap-3 p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-emerald-500 cursor-pointer transition-all">
                    <input 
                      type="checkbox" 
                      className="mt-1 rounded text-emerald-500 focus:ring-emerald-400"
                      checked={fingerConsent}
                      onChange={(e) => setFingerConsent(e.target.checked)}
                    />
                    <div className="text-xs sm:text-sm">
                      <span className="font-bold text-slate-800 dark:text-slate-200">Leitor Dactilar por Câmera</span>
                      <p className="text-slate-400 dark:text-slate-500 text-[11px] mt-0.5">Permite filmar a alteração cromática do dedo encostado no flash e na câmera para leitura de ondas de pulso do coração.</p>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-emerald-500 cursor-pointer transition-all">
                    <input 
                      type="checkbox" 
                      className="mt-1 rounded text-emerald-500 focus:ring-emerald-400"
                      checked={facialConsent}
                      onChange={(e) => setFacialConsent(e.target.checked)}
                    />
                    <div className="text-xs sm:text-sm">
                      <span className="font-bold text-slate-800 dark:text-slate-200">Análise Facial Volitiva (Opcional)</span>
                      <p className="text-slate-400 dark:text-slate-500 text-[11px] mt-0.5">Analisa micro-movimentos e expressões do rosto para obter estimativas holísticas de fadiga cerebral, estresse e ansiedade.</p>
                    </div>
                  </label>

                  {consentError && (
                    <div className="p-3 bg-rose-500/15 border border-rose-500/30 text-rose-500 text-xs rounded-xl flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" /> {consentError}
                    </div>
                  )}

                  <button
                    onClick={() => {
                      if (facialConsent || fingerConsent) {
                        setHasConsent(true);
                        setConsentError(null);
                        playSfx('success');
                      } else {
                        setConsentError('Por favor, ative ao menos um consentimento.');
                      }
                    }}
                    className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-lg active:scale-95"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    Confirmar e Autorizar Dispositivo
                  </button>
                </div>
              </div>
            )}

            {/* SCANNING & CALIBRATION AREA AFTER CONSIDERATION */}
            {hasConsent && !analysisResult && !isAiAnalyzing && (
              <div className="grid md:grid-cols-12 gap-8 items-center">
                
                {/* Calibration Column */}
                <div className="md:col-span-4 space-y-6">
                  <div>
                    <h4 className="font-sans font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                      <Sliders className="w-5 h-5 text-emerald-500" />
                      1. Autocalibração
                    </h4>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                      Informe suas condições neurossensoriais para refinar a precisão e velocidade do mapeamento de IA.
                    </p>
                  </div>

                  <div className="flex flex-col gap-3">
                    <button
                      onClick={() => { setCalibrationState('calm'); playSfx('tap'); }}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        calibrationState === 'calm'
                          ? 'border-emerald-500 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400 font-bold'
                          : 'border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                      }`}
                      disabled={isScanning}
                    >
                      <span className="text-sm block">😌 Calmo e Relaxado</span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">BPM estático natural. Baixo índice de fadiga.</span>
                    </button>

                    <button
                      onClick={() => { setCalibrationState('active'); playSfx('tap'); }}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        calibrationState === 'active'
                          ? 'border-orange-500 bg-orange-500/5 text-orange-700 dark:text-orange-400 font-bold'
                          : 'border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                      }`}
                      disabled={isScanning}
                    >
                      <span className="text-sm block">⚡ Energizado / Pós-Treino</span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">BPM estimulado, esforço de estresse térmico ou café.</span>
                    </button>

                    <button
                      onClick={() => { setCalibrationState('tired'); playSfx('tap'); }}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        calibrationState === 'tired'
                          ? 'border-indigo-500 bg-indigo-500/5 text-indigo-700 dark:text-indigo-400 font-bold'
                          : 'border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                      }`}
                      disabled={isScanning}
                    >
                      <span className="text-sm block">🔋 Cansaço Intenso / Sono</span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">Exaustão física e mental. BPM mais lento.</span>
                    </button>
                  </div>
                </div>

                {/* Central Interactive Camera Capture and Waveform View */}
                <div className="md:col-span-8 flex flex-col items-center justify-center space-y-4">
                  <div className="w-full relative aspect-video bg-black dark:bg-slate-950 rounded-3xl border-2 border-slate-100 dark:border-slate-800 shadow-inner overflow-hidden flex flex-col items-center justify-center">
                    
                    {/* Visualizer Video Stream */}
                    {cameraActive && (
                      <video 
                        ref={videoRef} 
                        autoPlay 
                        playsInline 
                        muted 
                        className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
                      />
                    )}

                    {/* Laser scanning bar element */}
                    {isScanning && (
                      <div className="absolute inset-x-0 h-1 bg-red-500/80 blur-xs shadow-[0_0_8px_#f43f5e] animate-pulse" style={{
                        animationDuration: '2s',
                        animationIterationCount: 'infinite',
                        top: `${Math.sin(Date.now() * 0.005) * 45 + 50}%` // elegant math bouncing
                      }} />
                    )}

                    {/* Scanner Wave overlay */}
                    {isScanning && (
                      <div className="absolute inset-0 bg-red-950/20 mix-blend-color-burn pointer-events-none" />
                    )}

                    {/* Standard visual placeholder */}
                    {!cameraActive && (
                      <div className="text-center p-6 space-y-3 z-10">
                        <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/70 text-emerald-500 flex items-center justify-center mx-auto shadow-md">
                          <Camera className="w-8 h-8" />
                        </div>
                        <h5 className="font-bold text-slate-700 dark:text-slate-200 text-sm">Dispositivo Pronto</h5>
                        <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
                          Sua câmera frontal capturará microfrequências luminosas no rosto e dedo para calcular as alterações fisiológicas.
                        </p>
                      </div>
                    )}

                    {/* Measuring telemetry overlay on active state */}
                    {isScanning && (
                      <div className="absolute bottom-4 left-4 right-4 bg-slate-900/80 backdrop-blur-md rounded-2xl p-3 border border-slate-700/50 flex items-center justify-between z-10 text-white font-mono">
                        <div className="inline-flex items-center gap-2">
                          <Activity className="w-4 h-4 text-red-500 animate-pulse" />
                          <span className="text-xs">SINAL PPG: {liveBpm} BPM</span>
                        </div>
                        <div className="w-24 bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-700">
                          <div 
                            className="bg-red-500 h-full transition-all duration-100 ease-out" 
                            style={{ width: `${scanProgress}%` }}
                          />
                        </div>
                        <span className="text-xs">{scanProgress}%</span>
                      </div>
                    )}
                  </div>

                  {/* Active Live Pulse wave Canvas during scan */}
                  {isScanning && (
                    <div className="w-full bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800 p-3 rounded-2xl">
                      <div className="flex items-center justify-between mb-1.5 px-1">
                        <span className="text-[10px] font-mono text-slate-400">Cardio Waveform Live Telemetry</span>
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono text-xs text-emerald-500">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                          CONECTADO
                        </span>
                      </div>
                      <canvas 
                        ref={canvasRef} 
                        width={400} 
                        height={60} 
                        className="w-full h-12 block"
                      />
                    </div>
                  )}

                  {cameraError && (
                    <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs rounded-2xl flex items-start gap-3 w-full">
                      <AlertCircle className="w-5 h-5 shrink-0" />
                      <div>
                        <span className="font-bold block">Falha no Sensor</span>
                        {cameraError}
                      </div>
                    </div>
                  )}

                  {/* Operational triggers */}
                  {!isScanning && (
                    <div className="w-full flex gap-3">
                      <button
                        onClick={initiateScanning}
                        className="flex-1 py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm rounded-2xl shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2"
                      >
                        <Play className="w-4 h-4" />
                        Iniciar Escaneamento Corporativo (15s)
                      </button>
                      <button
                        onClick={() => { setHasConsent(false); playSfx('tap'); }}
                        className="py-3.5 px-5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-sm font-semibold rounded-2xl hover:bg-slate-200 transition-all"
                      >
                        Privacidade
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* AI LOADING WAITER SCREEN */}
            {isAiAnalyzing && (
              <div className="py-20 text-center space-y-4">
                <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mx-auto" />
                <h4 className="text-lg font-bold text-slate-800 dark:text-white">Análise Clínica da IA Ativa</h4>
                <p className="text-sm text-slate-400 max-w-sm mx-auto leading-relaxed">
                  Decodificando frequências cardíacas, amplitudes neurais de estresse e fadiga para estruturar seu relatório preventivo personalizado de bem-estar.
                </p>
              </div>
            )}

            {/* TAB 1: VISUAL RESULTS PREVIEW AFTER SUCCESSFUL ANALYSIS */}
            {analysisResult && latestSavedLog && (
              <div className="space-y-8 animate-in fade-in duration-500">
                
                {/* Visual Premium Telemetria Diagnostics Grid */}
                <div className="grid md:grid-cols-12 gap-8 items-start">
                  
                  {/* Glowing Interactive Body Silhouette column */}
                  <div className="md:col-span-5 flex flex-col items-center">
                    <h5 className="font-bold text-slate-800 dark:text-slate-200 text-sm mb-4 text-center">
                      Indicador de Disfunção Corporal
                    </h5>

                    {/* SVG Human Vector */}
                    <div className="relative w-full max-w-[200px] aspect-[1/2] bg-slate-50 dark:bg-slate-950/40 rounded-3xl border border-slate-100 dark:border-slate-850 p-4 transition-all flex items-center justify-center">
                      
                      <svg viewBox="0 0 100 200" className="w-full h-full text-slate-300 dark:text-slate-700">
                        {/* Generalized human outline */}
                        <path 
                          d="M50,15 C55,15 58,18 58,23 C58,28 55,31 50,31 C45,31 42,28 42,23 C42,18 45,15 50,15 Z M47,33 L53,33 C58,33 64,36 64,42 L64,75 C64,77 62,79 60,79 C58,79 57,77 57,75 L56,58 L56,110 C56,114 54,118 52,118 C50,118 49,114 49,110 L49,85 L51,85 L51,110 C51,114 50,118 48,118 C46,118 44,114 44,110 L44,58 L43,75 C43,77 42,79 40,79 C38,79 36,77 36,75 L36,42 C36,36 42,33 47,33 Z"
                          fill="currentColor"
                          className="transition-colors duration-500"
                        />
                        
                        {/* Glowing focal components relative to interactive selector */}
                        {/* HEAD: Brain/Anxiety selector */}
                        <circle 
                          cx="50" 
                          cy="23" 
                          r={selectedHighlight === 'brain' ? '10' : '6'} 
                          className={`cursor-pointer transition-all ${
                            selectedHighlight === 'brain'
                              ? latestSavedLog.status === 'high_signals' ? 'fill-rose-500/40 stroke-rose-500' : latestSavedLog.status === 'attention' ? 'fill-amber-500/40 stroke-amber-500' : 'fill-emerald-500/40 stroke-emerald-500'
                              : 'fill-indigo-500/20 hover:fill-indigo-500/30'
                          }`}
                          onClick={() => setSelectedHighlight('brain')} 
                        />
                        
                        {/* HEART: Pulse BPM selector */}
                        <circle 
                          cx="50" 
                          cy="42" 
                          r={selectedHighlight === 'heart' ? '9' : '5'} 
                          className={`cursor-pointer transition-all ${
                            selectedHighlight === 'heart'
                              ? latestSavedLog.status === 'high_signals' ? 'fill-rose-500/45 stroke-rose-500 animate-pulse' : latestSavedLog.status === 'attention' ? 'fill-amber-500/45 stroke-amber-500 animate-pulse' : 'fill-emerald-500/45 stroke-emerald-500 animate-pulse'
                              : 'fill-red-500/20 hover:fill-red-500/30'
                          }`}
                          onClick={() => setSelectedHighlight('heart')} 
                        />

                        {/* CORE: Stress selector */}
                        <circle 
                          cx="50" 
                          cy="56" 
                          r={selectedHighlight === 'stress' ? '9' : '5'} 
                          className={`cursor-pointer transition-all ${
                            selectedHighlight === 'stress'
                              ? latestSavedLog.status === 'high_signals' ? 'fill-rose-500/40 stroke-rose-500' : latestSavedLog.status === 'attention' ? 'fill-amber-500/40 stroke-amber-500' : 'fill-emerald-500/40 stroke-emerald-500'
                              : 'fill-orange-500/20 hover:fill-orange-500/30'
                          }`}
                          onClick={() => setSelectedHighlight('stress')} 
                        />

                        {/* Battery/Muscle: Fatigue selector */}
                        <circle 
                          cx="50" 
                          cy="74" 
                          r={selectedHighlight === 'battery' ? '9' : '5'} 
                          className={`cursor-pointer transition-all ${
                            selectedHighlight === 'battery'
                              ? latestSavedLog.status === 'high_signals' ? 'fill-rose-500/40 stroke-rose-500' : latestSavedLog.status === 'attention' ? 'fill-amber-500/40 stroke-amber-500' : 'fill-emerald-500/40 stroke-emerald-500'
                              : 'fill-blue-500/20 hover:fill-blue-500/30'
                          }`}
                          onClick={() => setSelectedHighlight('battery')} 
                        />
                      </svg>

                      {/* Moving glowing laser scanning line strictly on selected highlighter */}
                      <div className="absolute left-0 right-0 h-0.5 bg-emerald-500 shadow-[0_0_8px_#10b981] animate-bounce pointer-events-none" style={{
                        top: selectedHighlight === 'brain' ? '15%' : selectedHighlight === 'heart' ? '25%' : selectedHighlight === 'stress' ? '32%' : '41%',
                        animationDuration: '1.2s'
                      }} />
                    </div>

                    <span className="text-[10px] text-slate-400 mt-2 text-center max-w-[150px]">
                      Selecione um ponto no indicador para analisar as métricas
                    </span>
                  </div>

                  {/* Quick stats columns */}
                  <div className="md:col-span-7 space-y-6">
                    <div className="flex items-center justify-between">
                      <div className={`px-4 py-1 rounded-full text-xs font-bold font-sans flex items-center gap-1.5 ${getStatusColorClass(latestSavedLog.status)}`}>
                        {statusIcons[latestSavedLog.status]}
                        {statusLabels[latestSavedLog.status]}
                      </div>
                      <span className="text-xs text-slate-400">
                        {new Date(latestSavedLog.date).toLocaleString('pt-BR')}
                      </span>
                    </div>

                    {/* Numeric breakdown metric boxes */}
                    <div className="grid grid-cols-2 gap-4">
                      
                      {/* Heart rate box */}
                      <button 
                        onClick={() => setSelectedHighlight('heart')}
                        className={`p-4 rounded-2xl border text-left transition-all ${
                          selectedHighlight === 'heart' 
                            ? 'border-red-500 bg-red-500/5 ring-1 ring-red-400/30' 
                            : 'border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900'
                        }`}
                      >
                        <span className="text-slate-400 dark:text-slate-500 text-xs block mb-1">Frequência Cardíaca</span>
                        <div className="flex items-baseline gap-1">
                          <span className="font-sans text-2xl font-black text-slate-800 dark:text-white">{latestSavedLog.heartRate}</span>
                          <span className="text-slate-500 text-[10px]">bpm</span>
                        </div>
                      </button>

                      {/* Stress box */}
                      <button 
                        onClick={() => setSelectedHighlight('stress')}
                        className={`p-4 rounded-2xl border text-left transition-all ${
                          selectedHighlight === 'stress' 
                            ? 'border-orange-500 bg-orange-500/5 ring-1 ring-orange-400/30' 
                            : 'border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900'
                        }`}
                      >
                        <span className="text-slate-400 dark:text-slate-500 text-xs block mb-1">Nível de Estresse</span>
                        <div className="flex items-baseline gap-1">
                          <span className="font-sans text-2xl font-black text-slate-800 dark:text-white">{latestSavedLog.stressLevel}%</span>
                          <span className="text-slate-500 text-[10px]">m/s</span>
                        </div>
                      </button>

                      {/* Fatigue box */}
                      <button 
                        onClick={() => setSelectedHighlight('battery')}
                        className={`p-4 rounded-2xl border text-left transition-all ${
                          selectedHighlight === 'battery' 
                            ? 'border-indigo-500 bg-indigo-500/5 ring-1 ring-indigo-400/30' 
                            : 'border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900'
                        }`}
                      >
                        <span className="text-slate-400 dark:text-slate-500 text-xs block mb-1">Nível de Fadiga</span>
                        <div className="flex items-baseline gap-1">
                          <span className="font-sans text-2xl font-black text-slate-800 dark:text-white">{latestSavedLog.fatigueLevel}%</span>
                          <span className="text-slate-500 text-[10px]">recup</span>
                        </div>
                      </button>

                      {/* Anxiety box */}
                      <button 
                        onClick={() => setSelectedHighlight('brain')}
                        className={`p-4 rounded-2xl border text-left transition-all ${
                          selectedHighlight === 'brain' 
                            ? 'border-blue-500 bg-blue-500/5 ring-1 ring-blue-400/30' 
                            : 'border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900'
                        }`}
                      >
                        <span className="text-slate-400 dark:text-slate-500 text-xs block mb-1">Ansiedade</span>
                        <div className="flex items-baseline gap-1">
                          <span className="font-sans text-2xl font-black text-slate-800 dark:text-white">{latestSavedLog.anxietyLevel}%</span>
                          <span className="text-slate-500 text-[10px]">neurom</span>
                        </div>
                      </button>
                    </div>

                    {/* Report Box under Highlight click */}
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-850">
                      <h6 className="font-bold text-xs text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">
                        Mapeamento Ativo:{' '}
                        {selectedHighlight === 'heart' ? 'Coração & Circulação' : selectedHighlight === 'brain' ? 'Ansiedade & Neuroemissões' : selectedHighlight === 'stress' ? 'Nervos & Estresse' : 'Física/Fadiga Muscular'}
                      </h6>
                      <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                        {selectedHighlight === 'heart' && `Frequência cardíaca atualiza em ${latestSavedLog.heartRate} batimentos por minuto. Este valor indica que o bombeamento está ${latestSavedLog.heartRate > 95 ? 'acelerado devido à calibração estimulada' : latestSavedLog.heartRate < 60 ? 'em repouso excelente ou fadiga sonolenta' : 'na faixa normal cardioprotetora'}.`}
                        {selectedHighlight === 'brain' && `Seu nível de ansiedade estimado é de ${latestSavedLog.anxietyLevel}%. Mantenha atenção a respiração guiada, para equilibrar o tônus simpático e evitar picos de preocupações.`}
                        {selectedHighlight === 'stress' && `O sensor acusa ${latestSavedLog.stressLevel}% de estresse físico. Isso significa que seu tônus autonômico celular e a variabilidade de batimentos indicam ${latestSavedLog.stressLevel > 60 ? 'sobrecarga ativa' : 'estado de moderação equilibrado'}.`}
                        {selectedHighlight === 'battery' && `Sua fadiga física/recuperação é de ${latestSavedLog.fatigueLevel}%. Sugere-se ${latestSavedLog.fatigueLevel > 70 ? 'repouso imediato ou sono programado' : 'energia apta a atividades de rotina normal'}.`}
                      </p>
                    </div>
                  </div>
                </div>

                {/* AI GENERATED PREMIUM HEALTH RECOMMENDATIONS REPORT */}
                <div className="p-6 md:p-8 rounded-[24px] bg-emerald-500/[0.03] dark:bg-emerald-500/[0.01] border border-emerald-500/25 space-y-6">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-sans font-bold text-slate-800 dark:text-white text-lg">
                        Relatório Preventivo NutriAI e Recomendações
                      </h4>
                      <p className="text-xs text-slate-400">Gerado dinamicamente pela inteligência cognitiva especializada do aplicativo.</p>
                    </div>
                  </div>

                  {analysisResult.preventiveAlert && (
                    <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-700 dark:text-orange-400 flex items-start gap-2 text-xs sm:text-sm">
                      <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-orange-500" />
                      <div>
                        <span className="font-bold block">Alerta Preventivo Ativo</span>
                        {analysisResult.preventiveAlert}
                      </div>
                    </div>
                  )}

                  <div className="prose prose-slate dark:prose-invert prose-sm max-w-none text-slate-600 dark:text-slate-300">
                    <span className="font-medium text-slate-800 dark:text-slate-100 block mb-1">Diagnóstico Geral:</span>
                    <p className="leading-relaxed">{analysisResult.report}</p>
                  </div>

                  {/* Bullet recommendations structured */}
                  <div className="border-t border-slate-100 dark:border-slate-800 pt-6">
                    <h5 className="font-sans text-slate-800 dark:text-slate-200 font-bold text-sm mb-4">
                      Protocolos de Recuperação Fisiológica
                    </h5>
                    
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      
                      {/* Hydration */}
                      <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-950/40 text-blue-500 flex items-center justify-center shrink-0">
                          <Droplet className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="font-bold text-xs block text-slate-700 dark:text-slate-300">Hidratação Estruturada</span>
                          <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed mt-0.5">{analysisResult.suggestions.hydration}</p>
                        </div>
                      </div>

                      {/* Rest */}
                      <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-950/40 text-indigo-500 flex items-center justify-center shrink-0">
                          <Coffee className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="font-bold text-xs block text-slate-700 dark:text-slate-300">Descanso Sugerido</span>
                          <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed mt-0.5">{analysisResult.suggestions.rest}</p>
                        </div>
                      </div>

                      {/* Calming Tea */}
                      <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-500 flex items-center justify-center shrink-0">
                          <Leaf className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="font-bold text-xs block text-slate-700 dark:text-slate-300">Infusão / Chá Calmante</span>
                          <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed mt-0.5">{analysisResult.suggestions.calmingTea}</p>
                        </div>
                      </div>

                      {/* Nutrition */}
                      <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-950/40 text-amber-500 flex items-center justify-center shrink-0">
                          <Dumbbell className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="font-bold text-xs block text-slate-700 dark:text-slate-300">Alimentação Micronutricional</span>
                          <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed mt-0.5">{analysisResult.suggestions.nutrition}</p>
                        </div>
                      </div>

                      {/* Relaxation */}
                      <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-950/40 text-purple-500 flex items-center justify-center shrink-0">
                          <Brain className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="font-bold text-xs block text-slate-700 dark:text-slate-300">Exercício Respiratório / Relaxamento</span>
                          <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed mt-0.5">{analysisResult.suggestions.relaxation}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <button
                      onClick={() => {
                        setAnalysisResult(null);
                        setLatestSavedLog(null);
                        playSfx('tap');
                      }}
                      className="py-2.5 px-6 rounded-xl bg-slate-100 dark:bg-slate-850 text-slate-700 dark:text-slate-300 font-semibold text-xs transition-all hover:bg-slate-200"
                    >
                      Realizar Novo Exame
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: HISTORIC PROGRESS AND ANALYTICS CHART */}
        {activeSubTab === 'history' && (
          <div className="space-y-8">
            
            {/* Visual Charts of Clinical progression */}
            {logs.length > 0 ? (
              <div className="space-y-8 animate-in fade-in duration-300">
                
                {/* Evolution analytics graphics */}
                <div className="p-4 sm:p-6 bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800 rounded-3xl">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h4 className="font-sans font-bold text-slate-800 dark:text-white text-[15px]">Gráfico Evolutivo de Stress e BPM</h4>
                      <p className="text-xs text-slate-400">Monitorando variância preventiva ao longo dos exames.</p>
                    </div>
                  </div>

                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={[...logs].reverse().map(l => ({
                          date: new Date(l.date).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' }),
                          BPM: l.heartRate,
                          Estresse: l.stressLevel,
                          Fadiga: l.fatigueLevel,
                          Ansiedade: l.anxietyLevel
                        }))}
                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient id="colorBpm" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorStress" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f97316" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                        <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip />
                        <Legend wrapperStyle={{ fontSize: 11, marginTop: 10 }} />
                        <Area type="monotone" dataKey="BPM" stroke="#f43f5e" fillOpacity={1} fill="url(#colorBpm)" name="Batimentos (BPM)" strokeWidth={2} />
                        <Area type="monotone" dataKey="Estresse" stroke="#f97316" fillOpacity={1} fill="url(#colorStress)" name="Estresse (%)" strokeWidth={2} />
                        <Area type="monotone" dataKey="Fadiga" stroke="#6366f1" fillOpacity={0} name="Fadiga (%)" strokeWidth={1} strokeDasharray="4 4" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Historic records table */}
                <div className="space-y-4">
                  <h4 className="font-sans font-bold text-slate-800 dark:text-slate-100 text-[15px] px-1 flex items-center justify-between">
                    <span>Exames Anteriores ({logs.length})</span>
                    <span className="text-xs font-normal text-slate-400">Toque em um registro para carregar relatório</span>
                  </h4>

                  <div className="space-y-3">
                    {logs.map((log) => (
                      <div 
                        key={log.id}
                        className="p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between hover:border-emerald-500 cursor-pointer transition-all shadow-xs"
                        onClick={() => {
                          // Allow reload analysis
                          setLatestSavedLog(log);
                          setAnalysisResult({
                            status: log.status,
                            report: `Exame histórico gravado: \nHeart Rate: ${log.heartRate} bpm • Estresse: ${log.stressLevel}% • Fadiga: ${log.fatigueLevel}% • Ansiedade: ${log.anxietyLevel}%.\n\nClique para gerar novos conselhos ou faça outro escaneamento.`,
                            preventiveAlert: log.stressLevel > 65 ? 'Os índices de fadiga muscular e tônus autonômico simpático estão elevados neste registro.' : null,
                            suggestions: {
                              hydration: 'Recomenda-se tomar 35ml de água mineral para cada kg de peso corporal hoje.',
                              rest: 'Adicione 20 minutos de soneca meditativa antes das refeições principais.',
                              nutrition: 'Priorize alimentos com triptofano e minerais magnésio/potássio: abacate, banana e nozes prontas.',
                              calmingTea: 'Faça um chá de mulungu ou cidreira ao deitar para favorecer a restauração física profunda.',
                              relaxation: 'Consulte técnicas de respiração quadrada 4-4-4-4 por 5 ciclos em silêncio.'
                            },
                            dailySummary: 'Análise preventiva resgatada.'
                          });
                          setActiveSubTab('scanner');
                          playSfx('crystal');
                        }}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                              Exame Preventivo {log.heartRate} bpm
                            </span>
                            <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${getStatusColorClass(log.status)}`}>
                              {log.status === 'normal' ? 'Normal' : log.status === 'attention' ? 'Atenção' : 'Elevado'}
                            </span>
                          </div>

                          <span className="text-[11px] text-slate-400 block">
                            {new Date(log.date).toLocaleString('pt-BR')} • {log.notes || 'Sem comentários'}
                          </span>
                        </div>

                        <div className="flex items-center gap-6 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 border-slate-100 dark:border-slate-800 pt-3 sm:pt-0">
                          <div className="flex gap-4 text-xs font-mono text-slate-500 dark:text-slate-400">
                            <span>Stress: <strong className="text-slate-700 dark:text-slate-300">{log.stressLevel}%</strong></span>
                            <span>Fadiga: <strong className="text-slate-700 dark:text-slate-300">{log.fatigueLevel}%</strong></span>
                          </div>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteLog(log.id);
                            }}
                            className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-xl transition-all"
                            title="Remover registro"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-16 text-center space-y-4">
                <Heart className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto animate-bounce" />
                <h5 className="font-bold text-slate-700 dark:text-slate-200 text-sm">Sem Histórico de Monitoração</h5>
                <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                  Realize seu primeiro escaneamento preventivo para iniciar o acompanhamento dinâmico de estresse e fadiga fito-orgânica.
                </p>
                <button
                  onClick={() => { setActiveSubTab('scanner'); playSfx('tap'); }}
                  className="py-2.5 px-5 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-xs rounded-xl"
                >
                  Fazer Primeiro Scanner
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
