import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from '../contexts/LanguageContext';
import { Camera, Image as ImageIcon, Loader2, Sparkles, AlertCircle, RefreshCw, Activity, CheckCircle2, ShieldCheck, Heart, User, Droplet, Dumbbell, Upload, Target, X, HeartPulse, Zap, Cpu, Gauge, Layers, Eye, Sliders, Flame } from 'lucide-react';
import { analyzeBodyImage, getGeneralBodyTips } from '../lib/gemini';
import { UserProfile, AnatomicalMarker } from '../types';
import { BodySensorsMonitor } from './BodySensorsMonitor';
import { VoicePlayButton } from './VoicePlayButton';
import { AvatarAnatomico } from './AvatarAnatomico';
import { AnatomicalPresetController } from './AnatomicalPresetController';
import { ContractionSpeedController } from './ContractionSpeedController';
import { getOptimalAvatarLOD, isMobileOrLowPowerDevice } from './AnatomicalSculptor';
import { playSfx, vibrate } from '../lib/sensory';

const MUSCLE_FOCUS_OPTIONS = [
  { id: 'shoulders', label: 'Ombros / Deltóides', icon: '⚡', muscles: ['Deltoids', 'Lateral Deltoid', 'Anterior Deltoid'] },
  { id: 'chest', label: 'Peitoral Maior', icon: '🛡️', muscles: ['Pectorals', 'Chest'] },
  { id: 'abs', label: 'Abdômen / Core', icon: '🧱', muscles: ['Abs', 'Obliques'] },
  { id: 'quads', label: 'Quadríceps', icon: '🦵', muscles: ['Quadriceps', 'Vastus Lateralis'] },
  { id: 'arms', label: 'Bíceps / Tríceps', icon: '💪', muscles: ['Biceps', 'Triceps'] },
  { id: 'back', label: 'Dorsal / Trapézio', icon: '🦅', muscles: ['Trapezius', 'Latissimus Dorsi'] },
];

interface BodyAnalyzerProps {
  profile: UserProfile | null;
  onUpdateProfile?: (updated: Partial<UserProfile>) => void;
  onAwardPoints?: (amount: number, reason: string) => void;
}

export function BodyAnalyzer({ profile, onUpdateProfile, onAwardPoints }: BodyAnalyzerProps) {
  const { t } = useTranslation();
  const [bodySubTab, setBodySubTab] = useState<'biometrics' | 'shape' | 'avatar3d'>('biometrics');
  const [avatarPerformanceMode, setAvatarPerformanceMode] = useState<'auto' | 'high' | 'eco_mobile'>('auto');
  const [avatarCameraView, setAvatarCameraView] = useState<'front' | 'side' | 'detail' | 'back'>('front');
  const [avatarMuscleFocus, setAvatarMuscleFocus] = useState<string>('shoulders');
  const [muscleDefinition, setMuscleDefinition] = useState<number>(1.0);
  const [skinTexture, setSkinTexture] = useState<number>(0.5);
  const [isContractionAnimating, setIsContractionAnimating] = useState<boolean>(true);
  const [contractionSpeed, setContractionSpeed] = useState<number>(1.0);
  const [contractionPhase, setContractionPhase] = useState<number>(50);
  const [realtimeFps, setRealtimeFps] = useState<number>(60);
  const [recommendedLODMode, setRecommendedLODMode] = useState<'high' | 'eco_mobile'>('high');
  const [isAutoLODEnabled, setIsAutoLODEnabled] = useState<boolean>(true);
  const [isAutoLODDowngraded, setIsAutoLODDowngraded] = useState<boolean>(false);
  const [muscleFatigue, setMuscleFatigue] = useState<number>(0.85);
  const [isFailureModeActive, setIsFailureModeActive] = useState<boolean>(true);
  const [isXRayMode, setIsXRayMode] = useState<boolean>(false);
  const [isMirrorMode, setIsMirrorMode] = useState<boolean>(false);
  const [isStretching, setIsStretching] = useState<boolean>(false);
  const [anatomicalPreset, setAnatomicalPreset] = useState<'atleta' | 'equilibrado' | 'resistencia'>('equilibrado');
  const [isScanning, setIsScanning] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<any | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isMarkerModalOpen, setIsMarkerModalOpen] = useState(false);
  const [markerNote, setMarkerNote] = useState('');
  const [markerType, setMarkerType] = useState<'note' | 'pain' | 'goal'>('note');
  const [pendingMarkerPosition, setPendingMarkerPosition] = useState<{ x: number, y: number, z: number } | null>(null);
  const [pendingMuscleTag, setPendingMuscleTag] = useState<string | undefined>(undefined);
  const [contractionRhythm, setContractionRhythm] = useState<'isometric' | 'moderate' | 'intense' | 'explosive'>('moderate');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Real-time WebGL muscle contraction telemetry sync effect
  useEffect(() => {
    if (!isContractionAnimating) {
      setContractionPhase(30);
      return;
    }
    const speed = contractionSpeed;
    const interval = setInterval(() => {
      const now = Date.now() / 1000;
      const phase = Math.round(((Math.sin(now * 2.8 * speed) + 1) / 2) * 100);
      setContractionPhase(phase);
    }, 50);
    return () => clearInterval(interval);
  }, [isContractionAnimating, contractionSpeed]);

  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

  const startCamera = async () => {
    setCameraError(null);
    setIsCameraActive(true);
    setPreviewImage(null);
    setAnalysisResult(null);

    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }
        });
      } catch (firstErr) {
        console.warn("Retrying with simple video constraints due to:", firstErr);
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      }
      setCameraStream(stream);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 100);
    } catch (err: any) {
      console.warn("Accessing camera failed:", err);
      let userFriendlyMsg = "Não foi possível acessar a câmera frontal do dispositivo. Verifique se deu permissão de acesso.";
      if (err.name === 'NotFoundError' || err.message?.toLowerCase().includes('device not found') || err.message?.toLowerCase().includes('requested device')) {
        userFriendlyMsg = "Câmera de vídeo física não encontrada neste dispositivo. Por favor, faça upload de uma foto sua utilizando a seleção de arquivo abaixo.";
      }
      setCameraError(userFriendlyMsg);
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setIsCameraActive(false);
    setCameraError(null);
  };

  const captureCameraPhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    
    try {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg');
        const base64Data = dataUrl.split(',')[1];
        
        setPreviewImage(dataUrl);
        stopCamera();
        analyzeCapturedBase64(base64Data, 'image/jpeg');
      }
    } catch (err) {
      console.warn("Failed to capture picture from stream:", err);
      alert("Erro ao capturar imagem da câmera.");
    }
  };

  const analyzeCapturedBase64 = async (base64Data: string, mimeType: string) => {
    try {
      setIsScanning(true);
      setAnalysisResult(null);

      const data = await analyzeBodyImage(base64Data, mimeType, profile);
      if (data) {
        setAnalysisResult(data);
        if (onAwardPoints) onAwardPoints(100, 'Análise de evolução corporal concluída');
      } else {
        alert('Não foi possível realizar a análise. Tente novamente.');
      }
      setIsScanning(false);
    } catch (error) {
      console.warn(error);
      alert('Erro ao processar a imagem do corpo.');
      setIsScanning(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsScanning(true);
      setAnalysisResult(null);
      setIsCameraActive(false);
      
      const previewUrl = URL.createObjectURL(file);
      setPreviewImage(previewUrl);

      const reader = new FileReader();
      reader.onloadend = async () => {
        const result = reader.result as string;
        const base64Data = result.split(',')[1];
        const mimeType = file.type;

        analyzeCapturedBase64(base64Data, mimeType);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.warn(error);
      alert('Erro ao carregar imagem.');
      setIsScanning(false);
    }
  };

  const handleGeneralTips = async () => {
    stopCamera();
    setIsScanning(true);
    setAnalysisResult(null);
    setPreviewImage(null);

    const data = await getGeneralBodyTips(profile);
    if (data) {
      setAnalysisResult(data);
      if (onAwardPoints) onAwardPoints(50, 'Dicas gerais de bem-estar consultadas');
    } else {
      alert('Não foi possível gerar dicas. Tente novamente.');
    }
    setIsScanning(false);
  };

  const resetAnalyzer = () => {
    stopCamera();
    setPreviewImage(null);
    setAnalysisResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSimulateExercise = () => {
    setIsContractionAnimating(!isContractionAnimating);
    playSfx('tap');
    vibrate(20);
  };

  const applyPreset = (preset: 'atleta' | 'equilibrado' | 'resistencia') => {
    setAnatomicalPreset(preset);
    const config = preset === 'atleta' ? { def: 1.8, skin: 0.2 } : preset === 'equilibrado' ? { def: 1.2, skin: 0.5 } : { def: 0.8, skin: 0.8 };
    setMuscleDefinition(config.def);
    setSkinTexture(config.skin);
    playSfx('tap');
    vibrate(10);
  };

  const handleToggleStretching = () => {
    setIsStretching(!isStretching);
    if (!isStretching) setIsContractionAnimating(false);
    playSfx('tap');
    vibrate(15);
  };

  const handleAddMarker = (position: { x: number; y: number; z: number }, muscleTag?: string) => {
    setPendingMarkerPosition(position);
    setPendingMuscleTag(muscleTag);
    setMarkerNote(muscleTag ? `${muscleTag}` : '');
    setMarkerType('note');
    setIsMarkerModalOpen(true);
    playSfx('tap');
    vibrate(10);
  };

  const saveAnatomicalMarker = () => {
    if (!onUpdateProfile || !profile || !pendingMarkerPosition) return;
    
    const newMarker: AnatomicalMarker = {
      id: Math.random().toString(36).substr(2, 9),
      label: markerNote || pendingMuscleTag || t('note'),
      position: pendingMarkerPosition,
      type: markerType,
      createdAt: new Date().toISOString(),
    };
    
    const currentMarkers = profile.anatomicalMarkers || [];
    onUpdateProfile({
      anatomicalMarkers: [...currentMarkers, newMarker],
    });
    
    setIsMarkerModalOpen(false);
    setPendingMarkerPosition(null);
    setPendingMuscleTag(undefined);
    setMarkerNote('');
    
    playSfx('success');
    vibrate(25);
  };

  const removeMarker = (markerId: string) => {
    if (!onUpdateProfile || !profile) return;
    const currentMarkers = profile.anatomicalMarkers || [];
    onUpdateProfile({
      anatomicalMarkers: currentMarkers.filter(m => m.id !== markerId)
    });
    playSfx('tap');
  };

  const clearMarkers = () => {
    if (!onUpdateProfile) return;
    onUpdateProfile({ anatomicalMarkers: [] });
    playSfx('tap');
  };

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700 pb-16 px-2 sm:px-4">
      
      {/* Premium sub-tab top navigation controls */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center mb-8 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div className="text-center md:text-left">
          <span className="font-mono text-[10px] text-emerald-500 font-bold uppercase tracking-widest block">{t('body_portal_title', 'Portal Clínico Corporal')}</span>
          <h3 className="font-sans font-bold text-slate-800 dark:text-slate-100 text-sm">Selecione a abordagem corporal por sensoriamento eletrônico</h3>
        </div>
        <div className="grid grid-cols-3 p-1 bg-slate-100 dark:bg-slate-800/60 rounded-2xl border border-slate-200/50 dark:border-slate-700/30 w-full md:w-auto md:flex md:flex-row gap-0.5">
          <button
            onClick={() => setBodySubTab('biometrics')}
            className={`px-3 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all truncate text-center cursor-pointer ${
              bodySubTab === 'biometrics'
                ? 'bg-white dark:bg-slate-800 shadow-sm text-emerald-600 dark:text-emerald-400 font-bold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
            }`}
            title="Biometria e Sensores"
          >
            <span className="truncate block">🩺 Biometria</span>
          </button>
          <button
            onClick={() => setBodySubTab('shape')}
            className={`px-3 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all truncate text-center cursor-pointer ${
              bodySubTab === 'shape'
                ? 'bg-white dark:bg-slate-800 shadow-sm text-emerald-600 dark:text-emerald-400 font-bold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
            }`}
            title="Evolução do Shape (Fotos)"
          >
            <span className="truncate block">📐 Shape (Fotos)</span>
          </button>
          <button
            onClick={() => setBodySubTab('avatar3d')}
            className={`px-3 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all truncate text-center cursor-pointer ${
              bodySubTab === 'avatar3d'
                ? 'bg-white dark:bg-slate-800 shadow-sm text-emerald-600 dark:text-emerald-400 font-bold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
            }`}
            title="Avatar 3D Anatômico & Malha Otimizada"
          >
            <span className="truncate block">👤 Avatar 3D</span>
          </button>
        </div>
      </div>

      {bodySubTab === 'biometrics' ? (
        <BodySensorsMonitor 
          profile={profile} 
          onUpdateProfile={onUpdateProfile || (() => {})} 
          onAwardPoints={onAwardPoints} 
        />
      ) : bodySubTab === 'shape' ? (
        <>
          <div className="text-center space-y-4 mb-12">
            <h2 className="font-serif text-4xl md:text-5xl font-medium tracking-tight text-emerald-700 dark:text-emerald-400">
              Clínica Corporal e Evolução
            </h2>
            <p className="font-sans text-slate-500 dark:text-slate-400 max-w-xl mx-auto text-lg leading-relaxed">
              Nossa IA avalia sua forma de maneira neutra e confidencial para sugerir ajustes na sua jornada. 100% privado e opcional.
            </p>
          </div>

          <div className="clay-card p-6 md:p-8 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[32px]">
            
            {/* State 1: Selection - Live Camera, Photo Upload or Recommendations only */}
            {!previewImage && !isScanning && !analysisResult && !isCameraActive && (
          <div className="space-y-8 animate-in fade-in duration-300">
            <div className="bg-emerald-50 dark:bg-emerald-900/10 rounded-[24px] p-6 border border-emerald-100 dark:border-emerald-800/30 flex items-start gap-4">
              <ShieldCheck className="w-8 h-8 text-emerald-600 mt-1 shrink-0" />
              <div>
                <h4 className="font-bold text-emerald-800 dark:text-emerald-400 text-lg mb-1">Privacidade Garantida</h4>
                <p className="text-emerald-700/80 dark:text-emerald-400/80 text-sm">
                  Sua foto não é salva ou compartilhada. O processamento é feito em tempo real para gerar dicas e depois a imagem é descartada. Você também pode receber dicas sem enviar foto.
                </p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div 
                className="flex flex-col items-center justify-center p-8 md:p-12 border-2 border-dashed border-emerald-300 dark:border-emerald-700/50 bg-white/50 dark:bg-slate-800/50 rounded-[24px] hover:bg-emerald-50 dark:hover:bg-slate-800 transition-all group"
              >
                <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                  <Camera className="w-8 h-8" />
                </div>
                <h4 className="text-slate-800 dark:text-white font-bold text-lg mb-3">{t('body_photo_analysis', 'Análise por Foto')}</h4>
                <p className="text-slate-500 dark:text-slate-400 text-center text-xs sm:text-sm mb-6 max-w-xs leading-relaxed">
                  Tire uma foto frontal com roupas de treino ou envie da galeria para receber recomendações de evolução.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-3 w-full justify-center">
                  <button
                    onClick={startCamera}
                    className="flex-1 py-2.5 px-4 bg-emerald-500 hover:bg-emerald-600 text-white font-sans font-medium text-xs rounded-full transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-95 hover:-translate-y-0.5 duration-200"
                  >
                    <Camera className="w-4 h-4" />
                    Tirar Foto
                  </button>

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-sans font-medium text-xs rounded-full transition-all flex items-center justify-center gap-1.5 active:scale-95 hover:-translate-y-0.5 duration-200"
                  >
                    <Upload className="w-4 h-4" />
                    Enviar Foto
                  </button>
                </div>
              </div>

              <div 
                className="flex flex-col items-center justify-center p-8 md:p-12 border-2 border-slate-200 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/50 rounded-[24px] hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer group animate-in fade-in duration-300"
                onClick={handleGeneralTips}
              >
                <div className="w-16 h-16 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                  <Sparkles className="w-8 h-8" />
                </div>
                <h4 className="text-slate-800 dark:text-white font-bold text-lg mb-3">Dicas Gerais</h4>
                <p className="text-slate-500 dark:text-slate-400 text-center text-xs sm:text-sm leading-relaxed max-w-xs">
                  Prefiro não utilizar foto neste momento, mas quero orientações inteligentes da NutriAI com base no meu objetivo atual.
                </p>
              </div>
            </div>

            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              ref={fileInputRef}
              className="hidden"
            />
          </div>
        )}

        {/* State 1.5: Front-facing/Webcam Live Stream Preview */}
        {isCameraActive && !previewImage && (
          <div className="flex flex-col items-center justify-center space-y-6 w-full animate-in fade-in duration-300">
            <div className="relative w-full aspect-[4/3] md:aspect-video rounded-[24px] overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center shadow-inner">
              
              {cameraStream && !cameraError && (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover scale-x-[-1]" /* Mirrored for intuitive selfie view */
                />
              )}

              {!cameraStream && !cameraError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 space-y-3 bg-slate-900">
                  <Loader2 className="w-10 h-10 animate-spin text-emerald-500" />
                  <p className="text-sm">Iniciando câmera frontal...</p>
                </div>
              )}

              {cameraStream && !cameraError && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="w-48 h-48 sm:w-64 sm:h-64 border border-dashed border-white/40 rounded-full flex items-center justify-center animate-pulse">
                    <Target className="w-8 h-8 text-white/30" />
                  </div>
                </div>
              )}

              {cameraError && (
                <div className="absolute inset-0 bg-slate-900 flex flex-col items-center justify-center p-6 text-center animate-in fade-in">
                  <p className="text-red-400 font-semibold mb-6 px-4 text-sm max-w-md leading-relaxed">
                    {cameraError}
                  </p>
                  <button
                    onClick={stopCamera}
                    className="bg-slate-800 hover:bg-slate-700 text-white font-medium px-6 py-2.5 rounded-full text-xs transition-all active:scale-95 shadow-md"
                  >
                    Voltar para Seleção
                  </button>
                </div>
              )}
            </div>

            {cameraStream && !cameraError && (
              <div className="relative flex items-center justify-center w-full px-4 h-20">
                <button
                  type="button"
                  onClick={stopCamera}
                  className="absolute left-0 sm:left-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium px-4 py-2 sm:px-5 sm:py-2.5 rounded-full transition-colors flex items-center gap-1.5 text-xs sm:text-sm shadow-sm active:scale-95"
                >
                  Cancelar
                </button>
                
                <button
                  type="button"
                  onClick={captureCameraPhoto}
                  className="w-16 h-16 rounded-full bg-white border-4 border-slate-200 dark:border-slate-800 flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all duration-150"
                  title="Capturar Foto"
                >
                  <div className="w-12 h-12 rounded-full bg-emerald-500 hover:bg-emerald-600 transition-colors flex items-center justify-center">
                    <Camera className="w-5 h-5 text-white" />
                  </div>
                </button>
              </div>
            )}
          </div>
        )}

        {/* State 2: Scanning / Processing Model */}
        {isScanning && (
          <div className="relative w-full aspect-[4/3] md:aspect-video rounded-[24px] overflow-hidden bg-emerald-100 flex items-center justify-center border border-white/60 animate-in fade-in duration-300">
            {previewImage && <img src={previewImage} alt="Análise Corporal" className="absolute inset-0 w-full h-full object-cover blur-[4px] opacity-70" />}
            <div className={`absolute inset-0 flex flex-col items-center justify-center z-10 ${previewImage ? 'bg-emerald-900/60 backdrop-blur-sm text-white' : 'bg-slate-50 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400'}`}>
              <Loader2 className="w-12 h-12 animate-spin mb-4" />
              <p className="text-lg font-medium">{previewImage ? 'Analisando forma e evolução...' : 'Buscando recomendações personalizadas...'}</p>
            </div>
            
            {previewImage && (
              <div className="absolute top-0 left-0 right-0 h-2 bg-emerald-400 shadow-[0_0_20px_#34d399] z-20 animate-[scan_2s_ease-in-out_infinite]"></div>
            )}
          </div>
        )}

        {/* State 3: Analysis Done & Results Layout */}
        {analysisResult && !isScanning && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
            
            <div className="flex flex-col md:flex-row gap-6 items-start clay-card p-6 bg-white dark:bg-slate-800 border-none shadow-xl rounded-[24px]">
              {previewImage ? (
                 <div className="w-32 h-32 md:w-48 md:h-48 shrink-0 rounded-[20px] overflow-hidden shadow-lg border-4 border-white dark:border-slate-700 relative mx-auto md:mx-0">
                    <img src={previewImage} alt="Sua Análise" className="w-full h-full object-cover opacity-90" />
                 </div>
              ) : (
                 <div className="w-24 h-24 shrink-0 rounded-full bg-emerald-100 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-500 shadow-inner mx-auto md:mx-0">
                    <User className="w-12 h-12" />
                 </div>
              )}
              
              <div className="flex-1 space-y-4 w-full">
                <div className="flex items-start gap-4">
                  {analysisResult.assistantMessage && (
                    <VoicePlayButton
                      text={analysisResult.assistantMessage}
                      size="md"
                      title="Ouvir análise com a voz da Malu"
                    />
                  )}
                  <div className="pt-1 flex-1">
                    <h4 className="font-serif text-xl text-slate-800 dark:text-slate-100 font-medium mb-2">Mensagem do Treinador:</h4>
                    <p className="font-sans text-slate-600 dark:text-slate-300 text-base md:text-lg leading-relaxed italic border-l-4 border-emerald-500 pl-4 bg-slate-50 dark:bg-slate-800/40 py-2 rounded-r-lg">
                      "{analysisResult.assistantMessage}"
                    </p>
                  </div>
                </div>
              </div>
              <div className="shrink-0 w-full md:w-auto pt-2 flex justify-end">
                 <button
                  onClick={resetAnalyzer}
                  className="bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 px-6 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 w-full md:w-auto shadow-sm"
                >
                  <RefreshCw className="w-4 h-4" />
                  Reiniciar
                </button>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-orange-50/50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-800 rounded-[24px] p-6 shadow-sm">
                 <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-xl flex items-center justify-center">
                       <Heart className="w-5 h-5" />
                    </div>
                    <h5 className="font-bold text-orange-800 dark:text-orange-400">{t('body_nutrition', 'Nutrição')}</h5>
                 </div>
                 <ul className="space-y-3">
                    {analysisResult.recommendations?.food?.map((tip: string, idx: number) => (
                      <li key={idx} className="flex gap-2 text-slate-600 dark:text-slate-300 text-sm">
                         <span className="text-orange-400 mt-1 shrink-0">•</span>
                         <span className="leading-relaxed">{tip}</span>
                      </li>
                    ))}
                 </ul>
              </div>

              <div className="bg-blue-50/50 dark:bg-blue-900/10 border border-blue-105 dark:border-blue-800 rounded-[24px] p-6 shadow-sm">
                 <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center">
                       <Droplet className="w-5 h-5" />
                    </div>
                    <h5 className="font-bold text-blue-800 dark:text-blue-400">{t('body_routine_hydration', 'Rotina & Hidratação')}</h5>
                 </div>
                 <ul className="space-y-3">
                    {analysisResult.recommendations?.hydration?.map((tip: string, idx: number) => (
                      <li key={idx} className="flex gap-2 text-slate-600 dark:text-slate-300 text-sm">
                         <span className="text-blue-400 mt-1 shrink-0">•</span>
                         <span className="leading-relaxed">{tip}</span>
                      </li>
                    ))}
                 </ul>
              </div>

              <div className="bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-800 rounded-[24px] p-6 shadow-sm">
                 <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center">
                       <Dumbbell className="w-5 h-5" />
                    </div>
                    <h5 className="font-bold text-indigo-800 dark:text-indigo-400">Exercícios</h5>
                 </div>
                 <ul className="space-y-3">
                    {analysisResult.recommendations?.exercise?.map((tip: string, idx: number) => (
                      <li key={idx} className="flex gap-2 text-slate-600 dark:text-slate-300 text-sm">
                         <span className="text-indigo-400 mt-1 shrink-0">•</span>
                         <span className="leading-relaxed">{tip}</span>
                      </li>
                    ))}
                 </ul>
              </div>
            </div>

            {analysisResult.manipulationDetected && (
               <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 p-4 rounded-xl flex items-start gap-4 animate-in slide-in-from-bottom-2">
                  <AlertCircle className="w-6 h-6 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-amber-800 dark:text-amber-300 text-sm leading-relaxed">
                    Notei alguns detalhes na imagem que parecem sugerir filtros ou manipulação de imagem. Para a saúde real das emoções e do corpo, evite se comparar com padrões irreais, seja de redes sociais, ou da própria foto. Caso sinta que a percepção do seu corpo está te prejudicando emocionalmente, uma avaliação com um profissional psicólogo pode ser uma excelente e cuidadosa escolha nesse momento!
                  </p>
               </div>
            )}
            
          </div>
        )}
          </div>
        </>
      ) : (
        /* Avatar 3D Anatômico View with Mobile-optimized polygon mesh LOD */
        <div className="space-y-8 animate-in fade-in duration-500">
          <div className="text-center space-y-4 mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-mono font-bold uppercase tracking-wider">
              <Zap className="w-3.5 h-3.5 text-emerald-500" />
              Motor de Malha 3D Otimizada • LOD Dinâmico
            </div>
            <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-medium tracking-tight text-emerald-700 dark:text-emerald-400">
              Avatar do Corpo & Biomecânica
            </h2>
            <p className="font-sans text-slate-500 dark:text-slate-400 max-w-xl mx-auto text-sm sm:text-base leading-relaxed">
              Estrutura muscular contínua baseada em modelos anatômicos de precisão, com redução inteligente de polígonos para máxima fluidez em celulares e aparelhos de menor potência.
            </p>
          </div>

          {/* Performance & Mesh Telemetry Control Bar */}
          <div className="clay-card p-4 sm:p-6 bg-slate-900 border border-slate-800 text-white rounded-3xl space-y-4 shadow-xl">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between border-b border-slate-800/80 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-emerald-400" />
                  <span className="font-sans font-bold text-sm text-slate-100 flex items-center gap-2">
                    Monitor de Performance & Auto-LOD Adaptativo
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold border ${
                      realtimeFps >= 52
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                        : realtimeFps >= 32
                        ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                        : 'bg-rose-500/20 text-rose-400 border-rose-500/30 animate-pulse'
                    }`}>
                      {realtimeFps} FPS {realtimeFps >= 52 ? '• Fluido' : realtimeFps >= 32 ? '• Moderado' : '• Baixa Fluidez'}
                    </span>
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  {avatarPerformanceMode === 'eco_mobile' || (avatarPerformanceMode === 'auto' && isMobileOrLowPowerDevice())
                    ? 'Modo Eco Mobile ativado: ~17.200 triângulos (economia de 75% de GPU).'
                    : 'Modo Alta Fidelidade ativado: ~68.500 triângulos (densidade máxima de vértices).'}
                </p>
              </div>

              {/* Mode Toggle Switcher & Auto-LOD Toggle */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    playSfx('tap');
                    vibrate(10);
                    setIsAutoLODEnabled(!isAutoLODEnabled);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
                    isAutoLODEnabled
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                  title="Ajusta automaticamente a densidade de polígonos com base na contagem de FPS em tempo real"
                >
                  <Gauge className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Auto-LOD FPS ({isAutoLODEnabled ? 'ON' : 'OFF'})</span>
                </button>

                <div className="flex items-center p-1 bg-slate-950 rounded-2xl border border-slate-800 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      playSfx('tap');
                      vibrate(10);
                      setAvatarPerformanceMode('eco_mobile');
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      avatarPerformanceMode === 'eco_mobile' || (avatarPerformanceMode === 'auto' && isMobileOrLowPowerDevice())
                        ? 'bg-emerald-500 text-white shadow-md'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                    title="Otimizado para celulares e economia de bateria (17.200 triângulos)"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>Eco (17k)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      playSfx('tap');
                      vibrate(10);
                      setAvatarPerformanceMode('high');
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      avatarPerformanceMode === 'high' || (avatarPerformanceMode === 'auto' && !isMobileOrLowPowerDevice())
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                    title="Resolução nativa máxima (68.500 triângulos)"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>HQ (68k)</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Low FPS Auto-LOD Notification Banner */}
            {isAutoLODDowngraded && isAutoLODEnabled && (
              <div className="p-3 bg-amber-950/80 border border-amber-500/40 rounded-2xl flex items-center gap-3 text-xs text-amber-200 animate-in fade-in duration-300">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                <p className="leading-snug">
                  <strong className="font-bold text-amber-300">Auto-LOD Adaptativo Ativado:</strong> Detectamos FPS reduzido em seu dispositivo ({realtimeFps} FPS). A malha foi otimizada para <strong>Eco Mobile (~17.200 triângulos)</strong> para manter 60 FPS de fluidez contínua.
                </p>
              </div>
            )}

            {/* Live Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-1">
              <div className="p-3 bg-slate-950/60 rounded-2xl border border-slate-800/60">
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Taxa de Quadros (FPS)</span>
                <span className={`text-lg font-bold font-mono ${
                  realtimeFps >= 52 ? 'text-emerald-400' : realtimeFps >= 32 ? 'text-amber-400' : 'text-rose-400'
                }`}>
                  {realtimeFps} FPS
                </span>
                <span className="text-[10px] text-slate-500 block">
                  {realtimeFps >= 52 ? 'Monitoramento 60Hz' : 'Ajuste de malha ativo'}
                </span>
              </div>

              <div className="p-3 bg-slate-950/60 rounded-2xl border border-slate-800/60">
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Polígonos (Triângulos)</span>
                <span className="text-lg font-bold text-emerald-400 font-mono">
                  {avatarPerformanceMode === 'eco_mobile' || (avatarPerformanceMode === 'auto' && isMobileOrLowPowerDevice()) ? '~17.200' : '~68.500'}
                </span>
                <span className="text-[10px] text-slate-500 block">
                  {avatarPerformanceMode === 'eco_mobile' || (avatarPerformanceMode === 'auto' && isMobileOrLowPowerDevice()) ? '-75% de overhead GPU' : 'Resolução completa'}
                </span>
              </div>

              <div className="p-3 bg-slate-950/60 rounded-2xl border border-slate-800/60">
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Decimação Inicial</span>
                <span className="text-lg font-bold text-emerald-300 font-mono">-40% Muscular</span>
                <span className="text-[10px] text-emerald-500 block">60% retenção anatômica</span>
              </div>

              <div className="p-3 bg-slate-950/60 rounded-2xl border border-slate-800/60">
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Amostragem DPR</span>
                <span className="text-lg font-bold text-cyan-400 font-mono">
                  {avatarPerformanceMode === 'eco_mobile' || (avatarPerformanceMode === 'auto' && isMobileOrLowPowerDevice()) ? '1.25x' : '1.75x'}
                </span>
                <span className="text-[10px] text-slate-500 block">Cap térmico anti-aquecimento</span>
              </div>

              <div className="p-3 bg-slate-950/60 rounded-2xl border border-slate-800/60">
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Sistema LOD Dinâmico</span>
                <span className="text-lg font-bold text-amber-400 font-sans">Corpo / Zoom</span>
                <span className="text-[10px] text-slate-500 block">Grupos & Contração Real-time</span>
              </div>
            </div>
          </div>

          {/* 3D Anatomical Avatar Interactive Stage */}
          <div className="space-y-4">
            <div className="w-full h-[520px] sm:h-[580px] md:h-[640px] relative rounded-[32px] overflow-hidden bg-slate-950 border border-emerald-500/20 shadow-2xl">
              <AvatarAnatomico
                profile={profile}
                cameraView={avatarCameraView}
                performanceMode={avatarPerformanceMode}
                onPerformanceModeChange={(m) => setAvatarPerformanceMode(m)}
                primaryMuscles={MUSCLE_FOCUS_OPTIONS.find(m => m.id === avatarMuscleFocus)?.muscles}
                enableOrbitControls={true}
                showReferenceControls={true}
                showOverlayBadges={true}
                showPerformanceBadge={true}
                muscleDefinition={muscleDefinition}
                skinTexture={skinTexture}
                fatigueLevel={isFailureModeActive ? muscleFatigue : 0.0}
                xRayMode={isXRayMode}
                isMirrorMode={isMirrorMode}
                isStretching={isStretching}
                markers={profile?.anatomicalMarkers || []}
                onAddMarker={handleAddMarker}
                isPlaying={isContractionAnimating || isStretching}
                playbackSpeed={isContractionAnimating ? contractionSpeed : 0}
                exercisePace={isContractionAnimating ? contractionSpeed : 0}
                onFpsUpdate={(fps, recMode, isDowngraded) => {
                  setRealtimeFps(fps);
                  setRecommendedLODMode(recMode);
                  setIsAutoLODDowngraded(isDowngraded);
                  if (isAutoLODEnabled && isDowngraded && avatarPerformanceMode !== 'eco_mobile') {
                    setAvatarPerformanceMode('eco_mobile');
                  }
                }}
                className="w-full h-full"
              />
            </div>
            
            {/* Control Panel: Presets & Simulation */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AnatomicalPresetController 
                currentPreset={anatomicalPreset} 
                onApplyPreset={applyPreset} 
              />
              <ContractionSpeedController
                speed={contractionSpeed}
                onSpeedChange={setContractionSpeed}
              />
            </div>
            <button
                onClick={() => setIsXRayMode(!isXRayMode)}
                className={`w-full py-4 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 border transition-all ${
                  isXRayMode 
                  ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300' 
                  : 'bg-slate-800 border-slate-700 text-slate-400'
                }`}
              >
                <Eye className="w-5 h-5" />
                {isXRayMode ? t('disable_xray') : t('xray_view')}
            </button>
            
            <button
                onClick={() => setIsMirrorMode(!isMirrorMode)}
                className={`w-full py-4 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 border transition-all ${
                  isMirrorMode 
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-300' 
                  : 'bg-slate-800 border-slate-700 text-slate-400'
                }`}
              >
                <RefreshCw className="w-5 h-5" />
                {isMirrorMode ? t('disable_mirror') : t('mirror_mode')}
            </button>
            
            <button
                onClick={handleToggleStretching}
                className={`w-full py-4 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 border transition-all ${
                  isStretching 
                  ? 'bg-blue-500/20 border-blue-500/40 text-blue-300' 
                  : 'bg-slate-800 border-slate-700 text-slate-400'
                }`}
              >
                <Zap className="w-5 h-5" />
                {isStretching ? t('stop_stretching') : t('stretching_animation')}
            </button>
            
            <button
                onClick={handleSimulateExercise}
                className={`w-full py-4 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 border transition-all ${
                  isContractionAnimating 
                  ? 'bg-rose-500/20 border-rose-500/40 text-rose-300' 
                  : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                }`}
              >
                <Activity className="w-5 h-5" />
                {isContractionAnimating ? t('stop_simulation') : t('simulate_exercise')}
            </button>

            {profile?.anatomicalMarkers && profile.anatomicalMarkers.length > 0 && (
              <div className="pt-4 border-t border-slate-800 mt-4">
                <div className="flex items-center justify-between mb-3">
                  <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('anatomical_markers')} ({profile.anatomicalMarkers.length})</h5>
                  <button onClick={clearMarkers} className="text-[10px] text-rose-400 hover:text-rose-300 font-bold uppercase transition-colors">{t('clear_markers')}</button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {profile.anatomicalMarkers.map((m) => (
                    <div key={m.id} className="px-2 py-1 rounded-md bg-slate-800 border border-slate-700 text-[10px] text-slate-300">
                      {m.label}
                    </div>
                  ))}
                </div>
                <p className="text-[9px] text-slate-500 mt-2 italic">{t('marker_tip')}</p>
              </div>
            )}
          </div>

          {/* Muscle Failure & Fatigue Simulation Engine Card (Falha Concentrica do Avatar) */}
          <div className="clay-card p-5 sm:p-6 bg-slate-900 border border-slate-800 text-white rounded-[28px] space-y-5 shadow-xl">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
                  <Flame className="w-5 h-5 animate-pulse text-rose-400" />
                </div>
                <div>
                  <h4 className="font-sans font-bold text-sm text-slate-100 flex items-center gap-2">
                    Simulação de Treino até a Falha Concêntrica
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold">
                      Muscular Failure Engine
                    </span>
                  </h4>
                  <p className="text-xs text-slate-400">
                    Simula tremores biomecânicos de fasciculação, ponto de travamento (sticking point) e surgimento de veias turgidas por hiperemia.
                  </p>
                </div>
              </div>

              {/* Toggle Failure Mode Switch */}
              <button
                type="button"
                onClick={() => {
                  playSfx('tap');
                  vibrate(12);
                  setIsFailureModeActive(!isFailureModeActive);
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer border shadow-md active:scale-95 ${
                  isFailureModeActive
                    ? 'bg-gradient-to-r from-rose-500 to-red-600 text-white border-rose-400 font-extrabold shadow-rose-900/30'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                }`}
              >
                <Flame className={`w-4 h-4 ${isFailureModeActive ? 'fill-white' : ''}`} />
                <span>{isFailureModeActive ? 'Falha Muscular Ativa' : 'Ativar Modo Falha'}</span>
              </button>
            </div>

            {/* Fatigue Slider & Preset Buttons */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-200 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-rose-400" />
                  <span>Nível de Fadiga Muscular & Tensão (RPE)</span>
                </label>
                <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  {Math.round(muscleFatigue * 100)}% {muscleFatigue >= 0.8 ? '🔥 Falha Total (RPE 10)' : muscleFatigue >= 0.4 ? '⚡ Carga Elevada (RPE 8)' : '🟢 Normal (RPE 6)'}
                </span>
              </div>

              <input
                type="range"
                min="0.0"
                max="1.0"
                step="0.05"
                value={muscleFatigue}
                onChange={(e) => {
                  setMuscleFatigue(parseFloat(e.target.value));
                  if (!isFailureModeActive) setIsFailureModeActive(true);
                  playSfx('tap');
                }}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500 hover:accent-rose-400 transition-all"
              />

              {/* Preset RPE Buttons */}
              <div className="grid grid-cols-3 gap-2 pt-1">
                {[
                  { rpe: 'RPE 6 (0%)', val: 0.0, label: '🟢 Execução Fluida', color: 'border-slate-800 hover:border-slate-700' },
                  { rpe: 'RPE 8 (50%)', val: 0.5, label: '🟡 Tensão Elevada', color: 'border-slate-800 hover:border-amber-500/50' },
                  { rpe: 'RPE 10 (100%)', val: 1.0, label: '🔴 Falha Concêntrica + Tremor', color: 'border-rose-500/50 bg-rose-500/10 text-rose-300' },
                ].map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      playSfx('tap');
                      vibrate(10);
                      setMuscleFatigue(preset.val);
                      setIsFailureModeActive(true);
                    }}
                    className={`p-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
                      muscleFatigue === preset.val && isFailureModeActive
                        ? 'bg-rose-500/20 border-rose-500 text-rose-300 ring-1 ring-rose-500/40'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span className="block font-sans">{preset.rpe}</span>
                    <span className="text-[10px] font-mono text-slate-400 block mt-0.5">{preset.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Live Failure Telemetry Box */}
            <div className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800/80 grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-2.5 bg-slate-900/60 rounded-xl border border-slate-800">
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Fasciculação (Tremor)</span>
                <span className={`text-sm font-bold font-mono ${isFailureModeActive && muscleFatigue > 0.1 ? 'text-rose-400 animate-pulse' : 'text-slate-500'}`}>
                  {isFailureModeActive && muscleFatigue > 0.1 ? `${Math.round(38 + muscleFatigue * 16)} Hz` : 'Inativo'}
                </span>
                <span className="text-[10px] text-slate-500 block">Jitter micro-biomecânico</span>
              </div>

              <div className="p-2.5 bg-slate-900/60 rounded-xl border border-slate-800">
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Ponto de Travamento</span>
                <span className={`text-sm font-bold font-mono ${isFailureModeActive && muscleFatigue > 0.4 ? 'text-amber-400' : 'text-slate-500'}`}>
                  {isFailureModeActive && muscleFatigue > 0.4 ? `Desaceleração ${Math.round(1 + muscleFatigue * 3.5)}x` : 'Velocidade Normal'}
                </span>
                <span className="text-[10px] text-slate-500 block">Sticking Point concêntrico</span>
              </div>

              <div className="p-2.5 bg-slate-900/60 rounded-xl border border-slate-800">
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Vascularidade</span>
                <span className={`text-sm font-bold font-mono ${isFailureModeActive && muscleFatigue > 0.2 ? 'text-cyan-400' : 'text-slate-500'}`}>
                  {isFailureModeActive && muscleFatigue > 0.2 ? 'Surgimento Turgido' : 'Padrão'}
                </span>
                <span className="text-[10px] text-slate-500 block">Hiperemia metabólica</span>
              </div>

              <div className="p-2.5 bg-slate-900/60 rounded-xl border border-slate-800">
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Sinergistas</span>
                <span className={`text-sm font-bold font-mono ${isFailureModeActive && muscleFatigue > 0.5 ? 'text-emerald-400' : 'text-slate-500'}`}>
                  {isFailureModeActive && muscleFatigue > 0.5 ? `Recrutamento +${Math.round(muscleFatigue * 45)}%` : 'Base'}
                </span>
                <span className="text-[10px] text-slate-500 block">Compensação muscular</span>
              </div>
            </div>
          </div>

          {/* WebGL Dynamic Muscle Contraction Animation System Card */}
          <div className="clay-card p-5 sm:p-6 bg-slate-900 border border-slate-800 text-white rounded-[28px] space-y-5 shadow-xl">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                  <Activity className="w-5 h-5 animate-pulse text-amber-400" />
                </div>
                <div>
                  <h4 className="font-sans font-bold text-sm text-slate-100 flex items-center gap-2">
                    Sistema de Animação de Contração Muscular WebGL
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold">
                      WebGL Flex Shader
                    </span>
                  </h4>
                  <p className="text-xs text-slate-400">
                    Contrações hiper-realistas em tempo real nos grupos musculares selecionados, respondendo aos sliders de definição e pele.
                  </p>
                </div>
              </div>

              {/* Contraction Play / Pause Toggle Button */}
              <button
                type="button"
                onClick={() => {
                  playSfx('tap');
                  vibrate(12);
                  setIsContractionAnimating(!isContractionAnimating);
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer border shadow-md active:scale-95 ${
                  isContractionAnimating
                    ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 border-amber-400 font-extrabold'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                }`}
              >
                <Zap className={`w-4 h-4 ${isContractionAnimating ? 'fill-slate-950' : ''}`} />
                <span>{isContractionAnimating ? 'Animação Ativa' : 'Pausar Animação'}</span>
              </button>
            </div>

            {/* Rhythm Selector Buttons */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-2">
                  <Gauge className="w-4 h-4 text-amber-400" />
                  <span>Cadência e Ritmo de Flexão (GLSL Pace)</span>
                </label>
                <span className="font-mono text-[11px] text-amber-300 font-bold">
                  {contractionRhythm === 'isometric' && '0.4x • Isométrico (Tensão Estática)'}
                  {contractionRhythm === 'moderate' && '1.0x • Moderado (Hipertrofia 2s/2s)'}
                  {contractionRhythm === 'intense' && '1.6x • Intenso (Potência Cíclica)'}
                  {contractionRhythm === 'explosive' && '2.4x • Explosivo (Alta Cadência)'}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'isometric', label: '⚡ Isométrico', speed: '0.4x' },
                  { id: 'moderate', label: '💪 Moderado', speed: '1.0x' },
                  { id: 'intense', label: '🔥 Intenso', speed: '1.6x' },
                  { id: 'explosive', label: '🚀 Explosivo', speed: '2.4x' },
                ].map((rhythm) => (
                  <button
                    key={rhythm.id}
                    type="button"
                    onClick={() => {
                      playSfx('tap');
                      vibrate(8);
                      setContractionRhythm(rhythm.id as any);
                    }}
                    className={`p-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
                      contractionRhythm === rhythm.id
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300 ring-1 ring-amber-500/40 shadow-sm'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                    }`}
                  >
                    <span className="block font-sans">{rhythm.label}</span>
                    <span className="text-[10px] font-mono text-slate-500 block mt-0.5">{rhythm.speed}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Live Telemetry Meter (Concentric Contraction Flexing Bar) */}
            <div className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-300 flex items-center gap-2">
                  <HeartPulse className="w-4 h-4 text-emerald-400 animate-pulse" />
                  <span>Telemetria Muscular em Tempo Real ({MUSCLE_FOCUS_OPTIONS.find(m => m.id === avatarMuscleFocus)?.label})</span>
                </span>
                <span className="font-mono font-bold text-amber-400 text-xs">
                  {contractionPhase}% Pico de Contração Muscular
                </span>
              </div>

              {/* Dynamic Progress Bar */}
              <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden p-0.5 border border-slate-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-amber-400 to-rose-500 transition-all duration-75 shadow-[0_0_12px_rgba(251,191,36,0.5)]"
                  style={{ width: `${Math.max(5, contractionPhase)}%` }}
                />
              </div>

              <div className="flex justify-between text-[10px] font-mono text-slate-400 pt-1">
                <span>0% Excentricidade (Repouso)</span>
                <span className="text-amber-300 font-bold">50% Tensão Muscular</span>
                <span className="text-rose-400 font-bold">100% Pico Conêntrico (Flexão)</span>
              </div>
            </div>
          </div>

          {/* Real-time WebGL Shader Control Sliders (Definição Muscular & Textura da Pele) */}
          <div className="clay-card p-5 sm:p-6 bg-slate-900 border border-slate-800 text-white rounded-[28px] space-y-5 shadow-xl">
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-sans font-bold text-sm text-slate-100 flex items-center gap-2">
                    Controles de Shaders WebGL em Tempo Real
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold">
                      GLSL Uniforms
                    </span>
                  </h4>
                  <p className="text-xs text-slate-400">
                    Ajuste a intensidade da definição muscular e a textura da pele do avatar 3D com atualização instantânea na GPU.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  playSfx('tap');
                  vibrate(10);
                  setMuscleDefinition(1.0);
                  setSkinTexture(0.5);
                }}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border border-slate-700/60"
                title="Restaurar padrão inicial dos shaders (100% definição / 50% textura)"
              >
                <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
                <span>Restaurar Padrão</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Slider 1: Muscle Definition Intensity */}
              <div className="space-y-3 p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80 hover:border-emerald-500/40 transition-colors">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-200 flex items-center gap-2">
                    <Dumbbell className="w-4 h-4 text-emerald-400" />
                    <span>Intensidade da Definição Muscular</span>
                  </label>
                  <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {Math.round(muscleDefinition * 100)}%
                  </span>
                </div>

                <input
                  type="range"
                  min="0.0"
                  max="2.0"
                  step="0.05"
                  value={muscleDefinition}
                  onChange={(e) => {
                    setMuscleDefinition(parseFloat(e.target.value));
                    playSfx('tap');
                  }}
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500 hover:accent-emerald-400 transition-all"
                />

                <div className="flex justify-between text-[10px] font-mono text-slate-400">
                  <span>0% (Suave)</span>
                  <span className="text-emerald-400 font-bold">100% (Anatômico Natural)</span>
                  <span>200% (Ultra Hipertrofia)</span>
                </div>
              </div>

              {/* Slider 2: Skin Texture & Micro-roughness */}
              <div className="space-y-3 p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80 hover:border-indigo-500/40 transition-colors">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-200 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-400" />
                    <span>Textura da Pele (Microrrugosidade)</span>
                  </label>
                  <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    {Math.round(skinTexture * 100)}%
                  </span>
                </div>

                <input
                  type="range"
                  min="0.0"
                  max="1.0"
                  step="0.05"
                  value={skinTexture}
                  onChange={(e) => {
                    setSkinTexture(parseFloat(e.target.value));
                    playSfx('tap');
                  }}
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-400 transition-all"
                />

                <div className="flex justify-between text-[10px] font-mono text-slate-400">
                  <span>0% (Acetinado / Liso)</span>
                  <span className="text-indigo-300 font-bold">50% (Porosidade Natural)</span>
                  <span>100% (Atleta Especular)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Muscle Group Focus Selector & Angles */}
          <div className="clay-card p-6 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[28px] space-y-6 shadow-sm">
            <div>
              <h4 className="font-sans font-bold text-slate-800 dark:text-slate-100 text-sm mb-3 flex items-center gap-2">
                <Target className="w-4 h-4 text-emerald-500" />
                Destaque Muscular & Análise de Volume
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                {MUSCLE_FOCUS_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      playSfx('tap');
                      vibrate(8);
                      setAvatarMuscleFocus(opt.id);
                    }}
                    className={`p-3 rounded-2xl text-left border transition-all cursor-pointer ${
                      avatarMuscleFocus === opt.id
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 ring-2 ring-emerald-500/20 shadow-sm'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <span className="text-lg block mb-1">{opt.icon}</span>
                    <span className={`text-xs font-bold block ${avatarMuscleFocus === opt.id ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-700 dark:text-slate-300'}`}>
                      {opt.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-slate-100 dark:border-slate-800 pt-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Ângulo de Câmera Rápido:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: 'front', label: 'Frontal' },
                  { id: 'side', label: 'Perfil' },
                  { id: 'detail', label: 'Detalhe' },
                  { id: 'back', label: 'Costas' },
                ].map((cam) => (
                  <button
                    key={cam.id}
                    type="button"
                    onClick={() => {
                      playSfx('tap');
                      vibrate(8);
                      setAvatarCameraView(cam.id as any);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      avatarCameraView === cam.id
                        ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {cam.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Anatomical Markers List */}
          {profile?.anatomicalMarkers && profile.anatomicalMarkers.length > 0 && (
            <div className="clay-card p-6 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[28px] space-y-4 shadow-sm animate-in fade-in duration-500">
              <div className="flex items-center justify-between">
                <h4 className="font-sans font-bold text-slate-800 dark:text-slate-100 text-sm flex items-center gap-2">
                  <Activity className="w-4 h-4 text-rose-500" />
                  {t('anatomical_markers')}
                </h4>
                <button
                  onClick={clearMarkers}
                  className="text-xs font-bold text-rose-500 hover:text-rose-600 transition-colors cursor-pointer"
                >
                  {t('clear_markers')}
                </button>
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                {profile.anatomicalMarkers.map((marker) => (
                  <div 
                    key={marker.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 group"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${
                        marker.type === 'pain' ? 'bg-red-500 shadow-[0_0_8px_#ef4444]' :
                        marker.type === 'goal' ? 'bg-amber-400 shadow-[0_0_8px_#fbbf24]' :
                        'bg-blue-400 shadow-[0_0_8px_#60a5fa]'
                      }`} />
                      <div>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-100">{marker.label}</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">
                          {new Date(marker.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => removeMarker(marker.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all opacity-0 group-hover:opacity-100"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Anatomical Marker Modal */}
      {isMarkerModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-md" onClick={() => setIsMarkerModalOpen(false)} />
          <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-[32px] shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-6 overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-emerald-500 to-teal-400" />
            
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-xl font-bold text-slate-800 dark:text-white">{t('add_anatomical_marker')}</h3>
              <button 
                onClick={() => setIsMarkerModalOpen(false)}
                className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {t('marker_type')}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'note', label: t('note'), color: 'bg-blue-500', active: 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' },
                    { id: 'pain', label: t('pain'), color: 'bg-red-500', active: 'border-red-500 bg-red-50 dark:bg-red-900/20' },
                    { id: 'goal', label: t('hypertrophy_goal'), color: 'bg-amber-400', active: 'border-amber-400 bg-amber-50 dark:bg-amber-900/20' },
                  ].map((type) => (
                    <button
                      key={type.id}
                      onClick={() => setMarkerType(type.id as any)}
                      className={`flex flex-col items-center gap-2 p-2 rounded-xl border transition-all ${
                        markerType === type.id 
                          ? type.active
                          : 'border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full ${type.color} shadow-sm`} />
                      <span className="text-[10px] font-bold text-center leading-tight">{type.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {t('marker_note')}
                </label>
                <textarea
                  value={markerNote}
                  onChange={(e) => setMarkerNote(e.target.value)}
                  placeholder={t('marker_note_placeholder')}
                  className="w-full h-24 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none resize-none dark:text-white"
                  autoFocus
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setIsMarkerModalOpen(false)}
                className="flex-1 py-3.5 rounded-2xl text-sm font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
              >
                {t('cancel')}
              </button>
              <button
                onClick={saveAnatomicalMarker}
                className="flex-1 py-3.5 rounded-2xl text-sm font-bold bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/25 transition-all active:scale-95"
              >
                {t('save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
