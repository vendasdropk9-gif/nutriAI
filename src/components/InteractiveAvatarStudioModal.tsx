import React, { useState, useEffect, useRef, useMemo, Suspense } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  RotateCcw,
  Sparkles,
  Zap,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Compass,
  Eye,
  ZoomIn,
  Camera,
  Layers,
  ChevronDown,
  ChevronUp,
  Activity,
  Sliders,
  Check,
  Dumbbell,
  ShieldCheck,
  Maximize2,
  Share2
} from 'lucide-react';
import { AvatarAnatomico } from './AvatarAnatomico';
import {
  EXERCISE_DATABASE,
  DetailedExercise,
  getExerciseById,
  MUSCLE_GROUPS_CONFIG
} from '../data/exerciseDatabase';
import { UserProfile } from '../types';
import { playSfx, vibrate } from '../lib/sensory';
import { speak, stopSpeech } from '../lib/speech';
import { avatarGlobalStore } from '../lib/avatarGlobalState';

export interface InteractiveAvatarStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile?: UserProfile | null;
  initialExerciseId?: string;
}

export interface AvatarPoseItem {
  id: string;
  name: string;
  category: 'pose' | 'exercise';
  icon: string;
  targetMuscles: string[];
  description: string;
  maluTip: string;
}

export const AVATAR_SPECIAL_POSES: AvatarPoseItem[] = [
  {
    id: 'pose-flex-biceps',
    name: 'Duplo Bíceps Frontal',
    category: 'pose',
    icon: '💪',
    targetMuscles: ['Bíceps', 'Deltóides', 'Peitoral'],
    description: 'Pose clássica do fisiculturismo que contrai intensamente os picos dos bíceps, antebraços e deltóides com expansão da caixa torácica.',
    maluTip: 'Contração máxima nos bíceps e deltóides! Mantenha os cotovelos alinhados aos ombros e o abdômen travado.'
  },
  {
    id: 'pose-victory',
    name: 'Pose de Vitória',
    category: 'pose',
    icon: '🏆',
    targetMuscles: ['Deltóides', 'Trapézio', 'Dorsais'],
    description: 'Braços erguidos em celebração de vitória com expansão torácica e ativação da cadeia posterior.',
    maluTip: 'Comemoração de vitória! Parabéns pelo foco. Essa postura eleva a energia e expande a capacidade pulmonar.'
  },
  {
    id: 'pose-stretch',
    name: 'Alongamento Dinâmico',
    category: 'pose',
    icon: '🧘',
    targetMuscles: ['Dorsais', 'Oblíquos', 'Intercostais'],
    description: 'Alongamento lateral dos braços e cadeia lateral do tronco para aumentar flexibilidade e alívio articular.',
    maluTip: 'Alongamento dinâmico: respire fundo e sinta o alívio nas fáscias musculares e na coluna vertebral.'
  },
  {
    id: 'pose-guard',
    name: 'Postura de Guarda & Foco',
    category: 'pose',
    icon: '🥊',
    targetMuscles: ['Core', 'Deltóides', 'Antebraço'],
    description: 'Postura atlética com queixo protegido, cotovelos fechados e core sob tensão contínua.',
    maluTip: 'Postura de guarda ativa: queixo protegido, abdômen firme e pés bem apoiados para rápida resposta motora.'
  },
  {
    id: 'pose-breathe',
    name: 'Respiração Diafragmática',
    category: 'pose',
    icon: '🌬️',
    targetMuscles: ['Diafragma', 'Transverso Abdominal'],
    description: 'Exercício de regulação respiratória e expansão torácica para oxigenação muscular e foco mental.',
    maluTip: 'Puxe o ar pelo nariz expandindo a caixa torácica por 4 segundos, segure por 2 e solte lentamente.'
  },
  {
    id: 'pose-wave',
    name: 'Aceno Amigável da Malu',
    category: 'pose',
    icon: '👋',
    targetMuscles: ['Deltóides', 'Antebraço'],
    description: 'Aceno amigável da assistente virtual com movimento biomecânico natural do membro superior.',
    maluTip: 'Olá! Sou a Malu, sua nutricionista e treinadora inteligente. Estou aqui para guiar cada movimento seu!'
  }
];

export const MUSCLE_ANATOMY_GUIDE: {
  id: string;
  name: string;
  role: string;
  bestExercises: string[];
  primaryTone: string;
}[] = [
  {
    id: 'peitoral',
    name: 'Peitoral Maior & Menor',
    role: 'Adução e flexão horizontal do ombro. Fundamental para empurrar, estabilizar os membros superiores e proteger a articulação gleno-umeral.',
    bestExercises: ['Supino Reto', 'Flexão de Braço', 'Crucifixo'],
    primaryTone: '#ef4444'
  },
  {
    id: 'biceps',
    name: 'Bíceps Braquial',
    role: 'Flexão do cotovelo e supinação potente do antebraço. Composto por cabeça longa e curta.',
    bestExercises: ['Rosca Direta', 'Rosca Martelo', 'Rosca Scott'],
    primaryTone: '#f97316'
  },
  {
    id: 'triceps',
    name: 'Tríceps Braquial',
    role: 'Extensão completa do cotovelo. Representa aproximadamente 60% do volume total do braço.',
    bestExercises: ['Tríceps Testa', 'Tríceps Corda', 'Mergulho'],
    primaryTone: '#38bdf8'
  },
  {
    id: 'deltoides',
    name: 'Deltóides (Ombros)',
    role: 'Abdução, flexão e rotação do braço. Proporciona largura escapular e proteção do manguito rotador.',
    bestExercises: ['Elevação Lateral', 'Desenvolvimento Militar', 'Elevação Frontal'],
    primaryTone: '#eab308'
  },
  {
    id: 'abdomen',
    name: 'Abdômen & Core',
    role: 'Estabilização central da coluna vertebral, controle intra-abdominal e sustentação de cargas axiais.',
    bestExercises: ['Prancha Isométrica', 'Crunch Abdominal', 'Elevação de Pernas'],
    primaryTone: '#10b981'
  },
  {
    id: 'costas',
    name: 'Dorsais & Trapézio',
    role: 'Puxadas verticais e horizontais, retração escapular e suporte da postura bípede ereta.',
    bestExercises: ['Puxada Alta', 'Remada Curvada', 'Barra Fixa'],
    primaryTone: '#8b5cf6'
  },
  {
    id: 'quadriceps',
    name: 'Quadríceps Femoral',
    role: 'Extensão potente dos joelhos e absorção de impacto na marcha, salto e agachamento.',
    bestExercises: ['Agachamento Livre', 'Leg Press 45°', 'Cadeira Extensora'],
    primaryTone: '#ec4899'
  },
  {
    id: 'gluteos',
    name: 'Glúteos (Máximo e Médio)',
    role: 'Maior grupo muscular propulsor do corpo humano. Responsável pela extensão e abdução do quadril.',
    bestExercises: ['Agachamento', 'Elevação Pélvica', 'Passada'],
    primaryTone: '#f43f5e'
  },
  {
    id: 'panturrilha',
    name: 'Panturrilhas (Tríceps Sural)',
    role: 'Flexão plantar do tornozelo e bombeamento do sangue venoso de volta ao coração.',
    bestExercises: ['Gêmeos em Pé', 'Gêmeos Sentado', 'Pulos de Corda'],
    primaryTone: '#06b6d4'
  }
];

export const GLOW_PRESETS = [
  { id: 'fire', label: 'Fogo Neon', primary: '#ef4444', secondary: '#f97316' },
  { id: 'emerald', label: 'NutriAI Bio', primary: '#10b981', secondary: '#34d399' },
  { id: 'cyan', label: 'Cyber Tech', primary: '#06b6d4', secondary: '#38bdf8' },
  { id: 'purple', label: 'Ametista VIP', primary: '#a855f7', secondary: '#c084fc' },
  { id: 'amber', label: 'Âmbar Solar', primary: '#f59e0b', secondary: '#fbbf24' }
];

export function InteractiveAvatarStudioModal({
  isOpen,
  onClose,
  profile,
  initialExerciseId = 'seated-lateral-raises'
}: InteractiveAvatarStudioModalProps) {
  // Navigation & Tool State
  const [activeTab, setActiveTab] = useState<'poses' | 'exercises' | 'anatomy' | 'style'>('poses');
  const [isDockCollapsed, setIsDockCollapsed] = useState(false);

  // Active Pose / Exercise Selection
  const [selectedPoseId, setSelectedPoseId] = useState<string>('pose-flex-biceps');
  const [selectedExerciseId, setSelectedExerciseId] = useState<string>(initialExerciseId);
  const [isSpecialPoseActive, setIsSpecialPoseActive] = useState(true);

  // 3D Viewport Controls
  const [cameraView, setCameraView] = useState<'front' | 'side' | 'back' | 'detail'>('front');
  const [gender, setGender] = useState<'male' | 'female'>(() => {
    const pGender = profile?.gender?.toLowerCase() || '';
    return pGender.includes('fem') || pGender.includes('mulher') ? 'female' : 'male';
  });
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [activeGlowPreset, setActiveGlowPreset] = useState(GLOW_PRESETS[1]); // Emerald
  const [selectedMuscle, setSelectedMuscle] = useState<string | null>(null);

  // Audio & Speech
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [screenshotSuccess, setScreenshotSuccess] = useState<boolean>(false);

  // Sync initial exercise if provided
  useEffect(() => {
    if (initialExerciseId) {
      setSelectedExerciseId(initialExerciseId);
    }
  }, [initialExerciseId]);

  // Construct active exercise representation for 3D engine
  const activeExerciseFor3D = useMemo<DetailedExercise>(() => {
    if (isSpecialPoseActive) {
      const pose = AVATAR_SPECIAL_POSES.find(p => p.id === selectedPoseId) || AVATAR_SPECIAL_POSES[0];
      return {
        id: pose.id,
        name: pose.name,
        category: 'shoulders',
        categoryLabel: 'Pose Interativa',
        position: 'standing',
        primaryMuscles: pose.targetMuscles,
        secondaryMuscles: ['Core', 'Estabilizadores'],
        suggestedSets: 3,
        suggestedReps: 'Contração isométrica',
        restSeconds: 30,
        description: pose.description,
        executionTips: [pose.maluTip],
        audioExplanation: pose.maluTip,
        highlightColorPrimary: activeGlowPreset.primary,
        highlightColorSecondary: activeGlowPreset.secondary
      };
    }

    const ex = getExerciseById(selectedExerciseId) || EXERCISE_DATABASE[0];
    return {
      ...ex,
      highlightColorPrimary: activeGlowPreset.primary,
      highlightColorSecondary: activeGlowPreset.secondary
    };
  }, [isSpecialPoseActive, selectedPoseId, selectedExerciseId, activeGlowPreset]);

  // Handle Speech with Malu Aoede
  const speakWithMalu = async (text: string) => {
    if (!text) return;
    playSfx('tap');
    vibrate(10);
    stopSpeech();
    setIsSpeaking(true);
    try {
      await speak(text, {
        voice: 'Aoede',
        onEnded: () => setIsSpeaking(false),
        onError: () => setIsSpeaking(false)
      });
    } catch {
      setIsSpeaking(false);
    }
  };

  // Trigger pose selection
  const handleSelectPose = (pose: AvatarPoseItem) => {
    playSfx('tap');
    vibrate(12);
    setSelectedPoseId(pose.id);
    setIsSpecialPoseActive(true);
    speakWithMalu(pose.maluTip);
  };

  // Trigger exercise selection
  const handleSelectExercise = (exercise: DetailedExercise) => {
    playSfx('tap');
    vibrate(12);
    setSelectedExerciseId(exercise.id);
    setIsSpecialPoseActive(false);
    speakWithMalu(exercise.audioExplanation || exercise.description);
  };

  // Trigger muscle inspection
  const handleInspectMuscle = (m: typeof MUSCLE_ANATOMY_GUIDE[0]) => {
    playSfx('tap');
    vibrate(14);
    setSelectedMuscle(m.id);
    speakWithMalu(`${m.name}: ${m.role}`);
  };

  // Screenshot / Snapshot feature
  const handleCaptureSnapshot = () => {
    playSfx('camera');
    vibrate(25);
    try {
      const canvases = document.querySelectorAll('canvas');
      if (canvases.length > 0) {
        const lastCanvas = canvases[canvases.length - 1];
        const dataUrl = lastCanvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `nutriai-avatar-${isSpecialPoseActive ? selectedPoseId : selectedExerciseId}.png`;
        link.href = dataUrl;
        link.click();
        setScreenshotSuccess(true);
        setTimeout(() => setScreenshotSuccess(false), 3000);
      }
    } catch (e) {
      console.warn('Could not export canvas directly:', e);
    }
  };

  // Keyboard shortcut 'H' to toggle dock per Skill directives
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'h' || e.key === 'H') {
        setIsDockCollapsed(prev => !prev);
      }
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md overflow-hidden select-none animate-in fade-in duration-300">
        
        {/* ================================================================ */}
        {/* TOP BAR: Title, Spec Badge, Close Button                         */}
        {/* ================================================================ */}
        <div className="absolute top-4 inset-x-4 md:inset-x-8 z-30 flex items-center justify-between pointer-events-auto">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-emerald-500/30 shadow-xl backdrop-blur-md">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <h2 className="text-xs md:text-sm font-serif font-bold text-white tracking-wide flex items-center gap-1.5">
                <span>Estúdio Interativo do Avatar 3D</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  360° LIVRE
                </span>
              </h2>
            </div>

            {/* Gesture Tip Badge */}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/80 border border-slate-700/60 text-[11px] text-slate-300 backdrop-blur-md">
              <Compass className="w-3.5 h-3.5 text-cyan-400" />
              <span>Arraste para girar em qualquer ângulo • Pinça para zoom</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Snapshot Button */}
            <button
              type="button"
              onClick={handleCaptureSnapshot}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700/80 text-xs font-bold shadow-lg transition-all active:scale-95 cursor-pointer"
              title="Salvar foto do avatar em alta definição"
            >
              <Camera className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">{screenshotSuccess ? 'Salvo!' : 'Capturar Foto'}</span>
            </button>

            {/* Malu Voice Guide Button */}
            <button
              type="button"
              onClick={() => {
                if (isSpeaking) {
                  stopSpeech();
                  setIsSpeaking(false);
                } else {
                  speakWithMalu(
                    isSpecialPoseActive
                      ? activeExerciseFor3D.executionTips?.[0] || activeExerciseFor3D.description
                      : activeExerciseFor3D.audioExplanation || activeExerciseFor3D.description
                  );
                }
              }}
              className={`p-2.5 rounded-xl border text-xs font-bold shadow-lg transition-all active:scale-95 cursor-pointer flex items-center justify-center ${
                isSpeaking
                  ? 'bg-emerald-500 text-white border-emerald-400 animate-pulse'
                  : 'bg-slate-900/90 text-slate-300 border-slate-700/80 hover:bg-slate-800'
              }`}
              title="Ouvir instrução de voz com a Malu (Voz Aoede)"
            >
              {isSpeaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={() => {
                playSfx('tap');
                stopSpeech();
                onClose();
              }}
              className="p-2.5 rounded-xl bg-slate-900/90 hover:bg-red-500/20 text-slate-300 hover:text-white border border-slate-700/80 hover:border-red-500/40 transition-all active:scale-95 cursor-pointer"
              title="Fechar Estúdio do Avatar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ================================================================ */}
        {/* CENTER 3D VIEWPORT (100% UNOBSTRUCTED)                           */}
        {/* ================================================================ */}
        <div className="w-full h-full relative cursor-grab active:cursor-grabbing flex items-center justify-center">
          <AvatarAnatomico
            profile={profile}
            exercise={activeExerciseFor3D}
            gender={gender}
            cameraView={cameraView}
            isPlaying={isPlaying}
            playbackSpeed={playbackSpeed}
            enableOrbitControls={true}
            showReferenceControls={false}
            showOverlayBadges={false}
            uHighlightColorPrimary={activeGlowPreset.primary}
            uHighlightColorSecondary={activeGlowPreset.secondary}
            highlightColorPrimary={activeGlowPreset.primary}
            highlightColorSecondary={activeGlowPreset.secondary}
            highlightOverride={selectedMuscle}
          />
        </div>

        {/* Floating Perspective Angles Pill Overlay (Top Right) */}
        <div className="absolute top-20 right-4 md:right-8 z-20 flex flex-col items-end gap-1.5 pointer-events-auto">
          <div className="bg-slate-950/85 backdrop-blur-md p-1.5 rounded-2xl border border-slate-700/60 shadow-2xl flex flex-col gap-1">
            {([
              { id: 'front' as const, label: 'Frente', icon: Eye },
              { id: 'side' as const, label: 'Lateral', icon: Compass },
              { id: 'back' as const, label: 'Costas', icon: RotateCcw },
              { id: 'detail' as const, label: 'Zoom', icon: ZoomIn },
            ]).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  playSfx('tap');
                  vibrate(10);
                  setCameraView(id);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                  cameraView === id
                    ? 'bg-emerald-500 text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
                title={`Mudar para visão de ${label}`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{label}</span>
              </button>
            ))}
          </div>

          {/* Quick Play/Pause & Speed */}
          <div className="bg-slate-950/85 backdrop-blur-md p-1.5 rounded-2xl border border-slate-700/60 shadow-2xl flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                playSfx('tap');
                vibrate(10);
                setIsPlaying(!isPlaying);
              }}
              className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
              title={isPlaying ? 'Pausar Animação' : 'Continuar Animação'}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-emerald-400 text-emerald-400" />}
            </button>
            <button
              type="button"
              onClick={() => {
                playSfx('tap');
                vibrate(10);
                setPlaybackSpeed(prev => prev === 1 ? 1.5 : prev === 1.5 ? 0.5 : 1);
              }}
              className="px-2.5 py-1 rounded-xl text-[11px] font-mono font-bold bg-slate-800/80 hover:bg-slate-700 text-emerald-400 transition-all cursor-pointer"
              title="Velocidade da Animação (0.5x, 1x, 1.5x)"
            >
              {playbackSpeed}x
            </button>
          </div>
        </div>

        {/* ================================================================ */}
        {/* ERGONOMIC COLLAPSIBLE BOTTOM CONTROL DOCK                        */}
        {/* Strictly compliant with Three.js Skill Section 5 directives       */}
        {/* ================================================================ */}
        <div
          className={`absolute left-1/2 -translate-x-1/2 z-30 w-full max-w-4xl px-3 sm:px-6 transition-all duration-300 ease-out pointer-events-auto ${
            isDockCollapsed ? 'bottom-2' : 'bottom-4'
          }`}
        >
          {/* Collapse / Expand Toggle Button */}
          <div className="flex justify-center mb-1.5">
            <button
              type="button"
              onClick={() => {
                playSfx('tap');
                vibrate(10);
                setIsDockCollapsed(!isDockCollapsed);
              }}
              className="flex items-center gap-1.5 px-4 py-1 rounded-full bg-slate-950/90 hover:bg-slate-900 border border-slate-700/80 text-[11px] font-bold text-slate-300 hover:text-white backdrop-blur-md shadow-xl transition-all cursor-pointer active:scale-95"
              title="Ocultar ou Exibir Painel de Controle Interativo (Tecla H)"
            >
              {isDockCollapsed ? (
                <>
                  <ChevronUp className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Exibir Controles do Avatar</span>
                </>
              ) : (
                <>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  <span>Ocultar Controles (Modo Cinema)</span>
                </>
              )}
            </button>
          </div>

          {/* Main Dock Container */}
          {!isDockCollapsed && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 15 }}
              className="rounded-3xl bg-slate-950/95 border border-slate-700/80 shadow-[0_20px_50px_rgba(0,0,0,0.8)] backdrop-blur-xl p-3 md:p-4 space-y-3"
            >
              {/* Category Tab Switcher */}
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar">
                  {[
                    { id: 'poses' as const, label: 'Poses Especiais', icon: Sparkles },
                    { id: 'exercises' as const, label: 'Exercícios 3D', icon: Dumbbell },
                    { id: 'anatomy' as const, label: 'Atlas Muscular', icon: Activity },
                    { id: 'style' as const, label: 'Estilo & Gênero', icon: Sliders }
                  ].map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => {
                        playSfx('tap');
                        vibrate(10);
                        setActiveTab(id);
                      }}
                      className={`px-3 sm:px-4 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        activeTab === id
                          ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/25'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{label}</span>
                    </button>
                  ))}
                </div>

                {/* Gender Switch */}
                <button
                  type="button"
                  onClick={() => {
                    playSfx('tap');
                    vibrate(12);
                    setGender(prev => prev === 'female' ? 'male' : 'female');
                  }}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-bold text-cyan-300 border border-slate-700 transition-all cursor-pointer active:scale-95"
                  title="Alternar entre variante Masculina e Feminina"
                >
                  <span>{gender === 'female' ? 'Feminino ♀' : 'Masculino ♂'}</span>
                </button>
              </div>

              {/* TAB CONTENT 1: SPECIAL POSES */}
              {activeTab === 'poses' && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 pt-1">
                  {AVATAR_SPECIAL_POSES.map((pose) => {
                    const isSelected = isSpecialPoseActive && selectedPoseId === pose.id;
                    return (
                      <button
                        key={pose.id}
                        type="button"
                        onClick={() => handleSelectPose(pose)}
                        className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                          isSelected
                            ? 'bg-emerald-950/60 border-emerald-400 text-white shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                            : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-900 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="text-xl">{pose.icon}</span>
                          {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />}
                        </div>
                        <div>
                          <p className="text-xs font-bold truncate leading-snug">{pose.name}</p>
                          <p className="text-[10px] text-slate-400 truncate">{pose.targetMuscles[0]}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* TAB CONTENT 2: EXERCISES 3D */}
              {activeTab === 'exercises' && (
                <div className="space-y-2 pt-1">
                  <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                    {EXERCISE_DATABASE.slice(0, 10).map((ex) => {
                      const isSelected = !isSpecialPoseActive && selectedExerciseId === ex.id;
                      return (
                        <button
                          key={ex.id}
                          type="button"
                          onClick={() => handleSelectExercise(ex)}
                          className={`shrink-0 px-3 py-2 rounded-2xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                            isSelected
                              ? 'bg-emerald-500 text-white border-emerald-400 shadow-md'
                              : 'bg-slate-900/80 text-slate-300 border-slate-800 hover:bg-slate-900'
                          }`}
                        >
                          <Dumbbell className="w-3.5 h-3.5" />
                          <span>{ex.name}</span>
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[11px] text-slate-400 px-1">
                    Selecione para ver o avatar executando o movimento completo com biomecânica e ativação muscular em tempo real.
                  </p>
                </div>
              )}

              {/* TAB CONTENT 3: ATLAS MUSCULAR (TAP TO INSPECT) */}
              {activeTab === 'anatomy' && (
                <div className="space-y-2 pt-1">
                  <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-9 gap-1.5">
                    {MUSCLE_ANATOMY_GUIDE.map((m) => {
                      const isSelected = selectedMuscle === m.id;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => handleInspectMuscle(m)}
                          className={`p-2 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                            isSelected
                              ? 'bg-emerald-500 text-white border-emerald-400 shadow-md'
                              : 'bg-slate-900/70 text-slate-300 border-slate-800 hover:bg-slate-900'
                          }`}
                        >
                          <Activity className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-[10px] font-bold truncate w-full">{m.name.split(' ')[0]}</span>
                        </button>
                      );
                    })}
                  </div>
                  {selectedMuscle && (
                    <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between text-xs text-slate-300">
                      <p className="line-clamp-1">
                        <strong className="text-emerald-300">
                          {MUSCLE_ANATOMY_GUIDE.find(m => m.id === selectedMuscle)?.name}:
                        </strong>{' '}
                        {MUSCLE_ANATOMY_GUIDE.find(m => m.id === selectedMuscle)?.role}
                      </p>
                      <button
                        type="button"
                        onClick={() => setSelectedMuscle(null)}
                        className="text-[10px] font-bold text-slate-400 hover:text-white shrink-0 ml-2"
                      >
                        Limpar
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* TAB CONTENT 4: STYLE & LIGHTING */}
              {activeTab === 'style' && (
                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  {/* Glow Color Palettes */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 font-bold">Brilho Muscular:</span>
                    <div className="flex items-center gap-1.5">
                      {GLOW_PRESETS.map((p) => {
                        const isSelected = activeGlowPreset.id === p.id;
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => {
                              playSfx('tap');
                              vibrate(8);
                              setActiveGlowPreset(p);
                            }}
                            className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                              isSelected
                                ? 'bg-slate-800 text-white border-emerald-400 shadow-md'
                                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                            }`}
                          >
                            <span
                              className="w-2.5 h-2.5 rounded-full"
                              style={{ backgroundColor: p.primary }}
                            />
                            <span>{p.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Playback speed buttons */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-400 font-bold">Velocidade:</span>
                    {[0.5, 1.0, 1.5, 2.0].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => {
                          playSfx('tap');
                          vibrate(8);
                          setPlaybackSpeed(s);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                          playbackSpeed === s
                            ? 'bg-emerald-500 text-white'
                            : 'bg-slate-900 text-slate-400 hover:text-white'
                        }`}
                      >
                        {s}x
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </div>

      </div>
    </AnimatePresence>
  );
}

export default InteractiveAvatarStudioModal;
