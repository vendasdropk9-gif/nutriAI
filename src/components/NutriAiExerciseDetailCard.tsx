import React, { useState, useMemo, Suspense, lazy } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Play,
  Pause,
  ChevronDown,
  ChevronUp,
  Settings,
  Target,
  Dumbbell,
  Clock,
  Video,
  Volume2,
  VolumeX,
  X,
  Check,
  RotateCcw,
  Sparkles,
  Layers,
  FileText,
  ShoppingBag
} from 'lucide-react';
import { DetailedExercise, EXERCISE_DATABASE, getExerciseById } from '../data/exerciseDatabase';
import { UserProfile } from '../types';
import { playSfx, vibrate } from '../lib/sensory';
import { speak, stopSpeech } from '../lib/speech';
import type { MuscleHighlightMode } from './AvatarAnatomico';

// Lazy load the 3D Anatomical Avatar
const AvatarAnatomico = lazy(() => import('./AvatarAnatomico'));

export interface NutriAiExerciseDetailCardProps {
  /** The exercise to display (object or ID). Defaults to 'seated-lateral-raises' */
  exercise?: DetailedExercise | string;
  /** User profile for gender/avatar preferences */
  profile?: UserProfile | null;
  /** Optional callback when user taps "Iniciar Treino" */
  onStartTraining?: (exerciseData: {
    exercise: DetailedExercise;
    sets: number;
    reps: number;
    weight: number;
    rest: number;
  }) => void;
  /** Optional callback to close if used inside a modal */
  onClose?: () => void;
  /** Optional container className */
  className?: string;
  /** If true, renders with a close button in the top right */
  isModal?: boolean;
}

export function NutriAiExerciseDetailCard({
  exercise = 'seated-lateral-raises',
  profile,
  onStartTraining,
  onClose,
  className = '',
  isModal = false
}: NutriAiExerciseDetailCardProps) {
  // Resolve exercise object
  const currentExercise: DetailedExercise = useMemo(() => {
    if (typeof exercise === 'string') {
      return getExerciseById(exercise) || EXERCISE_DATABASE[0];
    }
    return exercise || EXERCISE_DATABASE[0];
  }, [exercise]);

  // Camera perspective view ('back' | 'side' | 'front')
  // The reference image has 'side' (Lateral) selected with the bright glowing orange border
  const [selectedAngle, setSelectedAngle] = useState<'back' | 'side' | 'front'>('side');

  // Interactive Workout Steppers State
  const [sets, setSets] = useState<number>(currentExercise.suggestedSets || 3);
  const [reps, setReps] = useState<number>(() => {
    // Parse integer from '10-12 reps' or default to 10
    const match = currentExercise.suggestedReps?.match(/\d+/);
    return match ? parseInt(match[0], 10) : 10;
  });
  const [weight, setWeight] = useState<number>(10); // 10 kg matching reference
  const [rest, setRest] = useState<number>(currentExercise.restSeconds || 60);

  // Playback & Audio State
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [muscleHighlightMode, setMuscleHighlightMode] = useState<MuscleHighlightMode>('all');
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [showPersonalizeModal, setShowPersonalizeModal] = useState<boolean>(false);

  // Stepper Handlers with sensory feedback
  const handleStep = (
    type: 'sets' | 'reps' | 'weight',
    direction: 'up' | 'down'
  ) => {
    playSfx('tap');
    vibrate(10);
    if (type === 'sets') {
      setSets((prev) => (direction === 'up' ? Math.min(prev + 1, 12) : Math.max(prev - 1, 1)));
    } else if (type === 'reps') {
      setReps((prev) => (direction === 'up' ? Math.min(prev + 1, 50) : Math.max(prev - 1, 1)));
    } else if (type === 'weight') {
      setWeight((prev) => (direction === 'up' ? Math.min(prev + 2, 200) : Math.max(prev - 2, 0)));
    }
  };

  // Malu Audio / Video explanation toggle
  const handleToggleVoiceVideo = async () => {
    playSfx('tap');
    vibrate(12);
    if (isSpeaking) {
      stopSpeech();
      setIsSpeaking(false);
    } else {
      setIsSpeaking(true);
      try {
        await speak(currentExercise.audioExplanation, {
          voice: 'Aoede',
          onEnded: () => setIsSpeaking(false),
          onError: () => setIsSpeaking(false)
        });
      } catch {
        setIsSpeaking(false);
      }
    }
  };

  // Primary muscle name string
  const primaryMuscleName = currentExercise.primaryMuscles?.[0] || 'Deltóides (ombros)';
  const formattedCategory = currentExercise.categoryLabel || 'Ombros';

  return (
    <div
      className={`relative w-full max-w-[420px] sm:max-w-[460px] mx-auto rounded-[32px] sm:rounded-[38px] p-4 sm:p-5 text-white select-none overflow-hidden transition-all duration-300 ${className}`}
      style={{
        background: 'linear-gradient(180deg, #0b152d 0%, #070d1e 40%, #040812 100%)',
        border: '1.5px solid rgba(56, 189, 248, 0.45)',
        boxShadow:
          '0 0 35px rgba(14, 165, 233, 0.28), 0 20px 50px rgba(0, 0, 0, 0.8), inset 0 0 20px rgba(56, 189, 248, 0.08)'
      }}
    >
      {/* Background Cyber Grid Lines Accent */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage:
            'radial-gradient(circle at 50% 15%, rgba(56, 189, 248, 0.25) 0%, transparent 60%), linear-gradient(rgba(56, 189, 248, 0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(56, 189, 248, 0.06) 1px, transparent 1px)',
          backgroundSize: '100% 100%, 28px 28px, 28px 28px'
        }}
      />

      {/* ==================================================================== */}
      {/* 1. HEADER: NutriAi - Detalhes do Exercício                           */}
      {/* ==================================================================== */}
      <div className="relative z-10 flex items-center justify-between pb-3 pt-1 px-1">
        <div className="w-8" /> {/* Spacer for centering */}
        <h2 className="text-center font-sans font-bold text-lg sm:text-xl text-white tracking-tight drop-shadow-[0_2px_12px_rgba(56,189,248,0.5)]">
          NutriAi - Detalhes do Exercício
        </h2>
        {isModal && onClose ? (
          <button
            type="button"
            onClick={() => {
              playSfx('tap');
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-slate-900/80 border border-sky-500/40 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer hover:border-sky-400"
            title="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        ) : (
          <div className="w-8" />
        )}
      </div>

      {/* ==================================================================== */}
      {/* 2. PERSPECTIVE / ANGLE SELECTOR BAR (3 CARDS)                         */}
      {/* ==================================================================== */}
      <div className="relative z-10 grid grid-cols-3 gap-2.5 sm:gap-3 my-2.5 px-0.5">
        {/* CARD 1: COSTAS (BACK VIEW) */}
        <button
          type="button"
          onClick={() => {
            playSfx('tap');
            vibrate(10);
            setSelectedAngle('back');
          }}
          className={`relative rounded-2xl p-1.5 transition-all duration-200 cursor-pointer flex flex-col items-center justify-center overflow-hidden aspect-[1/1.12] ${
            selectedAngle === 'back'
              ? 'border-2 border-orange-500 rounded-2xl shadow-[0_0_18px_rgba(249,115,22,0.7)] ring-1 ring-orange-400/40 bg-[#121c35]'
              : 'border border-sky-500/35 bg-[#091224]/85 hover:border-sky-400/60'
          }`}
        >
          {/* Anatomical Back Silhouette with active red deltoids */}
          <div className="w-full h-full relative flex items-center justify-center">
            <svg viewBox="0 0 100 115" className="w-full h-full drop-shadow-md">
              <defs>
                <linearGradient id="skinBackGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#dce4f2" />
                  <stop offset="100%" stopColor="#7a8ba3" />
                </linearGradient>
                <filter id="redGlowBack">
                  <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#ff0033" floodOpacity="0.9" />
                </filter>
              </defs>
              {/* Head */}
              <circle cx="50" cy="22" r="10" fill="url(#skinBackGrad)" />
              {/* Neck & Traps */}
              <path d="M42,32 L58,32 L65,42 L35,42 Z" fill="url(#skinBackGrad)" />
              {/* Torso back */}
              <path d="M35,42 L65,42 L60,82 L40,82 Z" fill="url(#skinBackGrad)" />
              {/* Arms */}
              <path d="M28,44 Q22,60 22,78 L30,78 Q30,60 34,44 Z" fill="url(#skinBackGrad)" />
              <path d="M72,44 Q78,60 78,78 L70,78 Q70,60 66,44 Z" fill="url(#skinBackGrad)" />
              {/* Shorts */}
              <path d="M40,82 L60,82 L63,100 L37,100 Z" fill="#0d1422" />
              {/* Highlighted Deltoids & Upper Traps in RED */}
              <path
                d="M26,42 Q32,38 37,44 Q33,56 26,54 Z"
                fill="#ff0033"
                filter="url(#redGlowBack)"
                className="animate-pulse"
              />
              <path
                d="M74,42 Q68,38 63,44 Q67,56 74,54 Z"
                fill="#ff0033"
                filter="url(#redGlowBack)"
                className="animate-pulse"
              />
            </svg>
          </div>
        </button>

        {/* CARD 2: LATERAL (SIDE VIEW) - Selected by default in reference image! */}
        <button
          type="button"
          onClick={() => {
            playSfx('tap');
            vibrate(10);
            setSelectedAngle('side');
          }}
          className={`relative rounded-2xl p-1.5 transition-all duration-200 cursor-pointer flex flex-col items-center justify-center overflow-hidden aspect-[1/1.12] ${
            selectedAngle === 'side'
              ? 'border-2 border-orange-500 rounded-2xl shadow-[0_0_20px_rgba(249,115,22,0.85)] ring-1 ring-orange-400/50 bg-[#121c35]'
              : 'border border-sky-500/35 bg-[#091224]/85 hover:border-sky-400/60'
          }`}
        >
          {/* Anatomical Side Silhouette with active red deltoid */}
          <div className="w-full h-full relative flex items-center justify-center">
            <svg viewBox="0 0 100 115" className="w-full h-full drop-shadow-md">
              <defs>
                <linearGradient id="skinSideGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#dce4f2" />
                  <stop offset="100%" stopColor="#7a8ba3" />
                </linearGradient>
                <filter id="redGlowSide">
                  <feDropShadow dx="0" dy="0" stdDeviation="3.5" floodColor="#ff0033" floodOpacity="0.95" />
                </filter>
              </defs>
              {/* Head side profile */}
              <circle cx="50" cy="22" r="10" fill="url(#skinSideGrad)" />
              {/* Neck */}
              <path d="M46,31 L55,31 L56,42 L45,42 Z" fill="url(#skinSideGrad)" />
              {/* Torso side */}
              <path d="M45,42 Q58,55 54,82 L42,82 Q40,55 45,42 Z" fill="url(#skinSideGrad)" />
              {/* Arm side */}
              <path d="M48,46 Q47,62 48,82 L54,82 Q53,62 55,46 Z" fill="url(#skinSideGrad)" />
              {/* Shorts */}
              <path d="M41,82 L55,82 L53,100 L42,100 Z" fill="#0d1422" />
              {/* Highlighted Lateral Deltoid in Vibrant RED */}
              <path
                d="M45,41 Q57,43 56,53 Q47,56 45,41 Z"
                fill="#ff0033"
                filter="url(#redGlowSide)"
                className="animate-pulse"
              />
            </svg>
          </div>
        </button>

        {/* CARD 3: FRENTE (FRONT VIEW) */}
        <button
          type="button"
          onClick={() => {
            playSfx('tap');
            vibrate(10);
            setSelectedAngle('front');
          }}
          className={`relative rounded-2xl p-1.5 transition-all duration-200 cursor-pointer flex flex-col items-center justify-center overflow-hidden aspect-[1/1.12] ${
            selectedAngle === 'front'
              ? 'border-2 border-orange-500 rounded-2xl shadow-[0_0_18px_rgba(249,115,22,0.7)] ring-1 ring-orange-400/40 bg-[#121c35]'
              : 'border border-sky-500/35 bg-[#091224]/85 hover:border-sky-400/60'
          }`}
        >
          {/* Anatomical Front Silhouette with active red deltoids */}
          <div className="w-full h-full relative flex items-center justify-center">
            <svg viewBox="0 0 100 115" className="w-full h-full drop-shadow-md">
              <defs>
                <linearGradient id="skinFrontGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#dce4f2" />
                  <stop offset="100%" stopColor="#7a8ba3" />
                </linearGradient>
                <filter id="redGlowFront">
                  <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#ff0033" floodOpacity="0.9" />
                </filter>
              </defs>
              {/* Head */}
              <circle cx="50" cy="22" r="10" fill="url(#skinFrontGrad)" />
              {/* Neck */}
              <path d="M44,32 L56,32 L58,42 L42,42 Z" fill="url(#skinFrontGrad)" />
              {/* Pecs & Abs */}
              <path d="M35,42 L65,42 L59,82 L41,82 Z" fill="url(#skinFrontGrad)" />
              {/* Chest lines */}
              <path d="M42,50 Q50,54 58,50" stroke="#5d6f88" strokeWidth="1.5" fill="none" />
              {/* Arms */}
              <path d="M28,44 Q22,60 22,78 L30,78 Q30,60 34,44 Z" fill="url(#skinFrontGrad)" />
              <path d="M72,44 Q78,60 78,78 L70,78 Q70,60 66,44 Z" fill="url(#skinFrontGrad)" />
              {/* Shorts */}
              <path d="M40,82 L60,82 L63,100 L37,100 Z" fill="#0d1422" />
              {/* Highlighted Deltoids in RED */}
              <path
                d="M26,42 Q32,38 37,44 Q33,56 26,54 Z"
                fill="#ff0033"
                filter="url(#redGlowFront)"
                className="animate-pulse"
              />
              <path
                d="M74,42 Q68,38 63,44 Q67,56 74,54 Z"
                fill="#ff0033"
                filter="url(#redGlowFront)"
                className="animate-pulse"
              />
            </svg>
          </div>
        </button>
      </div>

      {/* ==================================================================== */}
      {/* 3. CENTRAL 3D ANATOMICAL STAGE WITH HUD OVERLAYS                     */}
      {/* ==================================================================== */}
      <div
        className="relative z-10 w-full rounded-2xl overflow-hidden my-2 border border-sky-500/40 bg-[#050813] flex items-center justify-center shadow-inner"
        style={{
          height: '350px',
          boxShadow: 'inset 0 0 35px rgba(6, 182, 212, 0.15)'
        }}
      >
        {/* Futuristic Cyber Viewport Corner Reticles */}
        <div className="absolute top-2.5 left-2.5 z-20 pointer-events-none text-sky-400/50 font-mono text-[10px] flex items-center gap-1">
          <span className="w-2.5 h-2.5 border-t border-l border-sky-400 block" />
          <span>SYS.ANATOMY//01</span>
        </div>
        <div className="absolute top-2.5 right-2.5 z-20 pointer-events-none text-sky-400/50 font-mono text-[10px]">
          <span className="w-2.5 h-2.5 border-t border-r border-sky-400 block" />
        </div>
        <div className="absolute bottom-2.5 left-2.5 z-20 pointer-events-none text-sky-400/50 font-mono text-[10px]">
          <span className="w-2.5 h-2.5 border-b border-l border-sky-400 block" />
        </div>
        <div className="absolute bottom-2.5 right-2.5 z-20 pointer-events-none text-sky-400/50 font-mono text-[10px]">
          <span className="w-2.5 h-2.5 border-b border-r border-sky-400 block" />
        </div>

        {/* Muscle Highlighting Mode Selector: Todos | Apenas Primário | Secundários */}
        <div className="absolute top-2.5 left-1/2 -translate-x-1/2 z-30 flex items-center p-0.5 rounded-full bg-slate-950/85 backdrop-blur-md border border-sky-500/35 shadow-lg">
          <button
            type="button"
            onClick={() => {
              playSfx('tap');
              vibrate(10);
              setMuscleHighlightMode('all');
            }}
            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono transition-all cursor-pointer ${
              muscleHighlightMode === 'all'
                ? 'bg-gradient-to-r from-red-600 to-orange-500 text-white shadow-sm'
                : 'text-sky-300 hover:text-white'
            }`}
            title="Destacar todos os músculos ativos no atlas 3D"
          >
            Todos
          </button>
          <button
            type="button"
            onClick={() => {
              playSfx('tap');
              vibrate(10);
              setMuscleHighlightMode('primary-only');
            }}
            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono transition-all cursor-pointer ${
              muscleHighlightMode === 'primary-only'
                ? 'bg-gradient-to-r from-red-600 to-red-500 text-white shadow-sm shadow-red-500/50'
                : 'text-sky-300 hover:text-white'
            }`}
            title="Destacar apenas músculo primário em vermelho neon"
          >
            Primário
          </button>
          <button
            type="button"
            onClick={() => {
              playSfx('tap');
              vibrate(10);
              setMuscleHighlightMode('secondary-only');
            }}
            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono transition-all cursor-pointer ${
              muscleHighlightMode === 'secondary-only'
                ? 'bg-gradient-to-r from-amber-600 to-orange-500 text-white shadow-sm shadow-orange-500/50'
                : 'text-sky-300 hover:text-white'
            }`}
            title="Destacar apenas músculos secundários (sinergistas) em âmbar"
          >
            Secundário
          </button>
        </div>

        {/* 3D Model Rendering */}
        <div className="w-full h-full relative">
          <Suspense
            fallback={
              <div className="w-full h-full flex flex-col items-center justify-center space-y-3 bg-[#060a16]">
                <div className="w-9 h-9 rounded-full border-2 border-sky-400/30 border-t-sky-400 animate-spin" />
                <p className="text-[11px] font-mono text-sky-300 tracking-wider">
                  Carregando Biomecânica...
                </p>
              </div>
            }
          >
            <AvatarAnatomico
              profile={profile}
              exercise={currentExercise}
              cameraView={selectedAngle}
              highlightMode={muscleHighlightMode}
              isPlaying={isPlaying}
              playbackSpeed={1}
              showReferenceControls={false}
              showOverlayBadges={false}
            />
          </Suspense>
        </div>

        {/* ================================================================== */}
        {/* SCI-FI HUD CALLOUT LABELS & LEADER LINES (EXACTLY LIKE IMAGE.PNG)   */}
        {/* ================================================================== */}
        <div className="absolute inset-0 pointer-events-none z-20">
          {/* Top Left: DELTÓIDES: ATIVAÇÃO */}
          <div className="absolute top-12 left-3 sm:left-4 text-left">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-ping" />
              <p className="text-[10px] sm:text-[11px] font-bold text-sky-300 tracking-wider font-mono drop-shadow-[0_0_6px_rgba(56,189,248,0.7)]">
                DELTÓIDES:
              </p>
            </div>
            <p className="text-[9px] font-mono text-sky-400/80 pl-3">ATIVAÇÃO</p>
            <div className="w-16 h-[1px] bg-gradient-to-r from-sky-400/70 to-transparent mt-0.5 ml-2" />
          </div>

          {/* Top Right: DELTÓIDES: ATIVAÇÃO MÁXIMA (BRIGHT RED!) */}
          <div className="absolute top-12 right-3 sm:right-4 text-right">
            <div className="flex items-center justify-end gap-1.5">
              <p className="text-[10px] sm:text-[11px] font-black text-[#ff0033] tracking-wider font-mono drop-shadow-[0_0_8px_rgba(255,0,51,0.9)] animate-pulse">
                DELTÓIDES:
              </p>
              <span className="w-2 h-2 rounded-full bg-[#ff0033] shadow-[0_0_10px_#ff0033] animate-pulse" />
            </div>
            <p className="text-[9px] font-mono font-bold text-[#ff2244] pr-3 drop-shadow-[0_0_6px_rgba(255,0,51,0.8)]">
              ATIVAÇÃO MÁXIMA
            </p>
            <div className="w-20 h-[1.5px] bg-gradient-to-l from-[#ff0033] to-transparent mt-0.5 mr-1" />
          </div>

          {/* Mid Right: ABDS: ATIVAÇÃO / ESTABILIZAÇÃO */}
          <div className="absolute top-[48%] right-3 sm:right-5 text-right">
            <p className="text-[9px] sm:text-[10px] font-bold text-sky-300 font-mono">
              ABDS:
            </p>
            <p className="text-[8px] font-mono text-sky-400/80">
              ESTABILIZAÇÃO
            </p>
            <div className="w-12 h-[1px] bg-gradient-to-l from-sky-400/60 to-transparent mt-0.5 mr-0" />
          </div>

          {/* Bottom Right: QUADRÍCEPS: SUPORTE / ATIVAÇÃO */}
          <div className="absolute bottom-12 right-3 sm:right-5 text-right">
            <p className="text-[9px] sm:text-[10px] font-bold text-sky-300 font-mono">
              QUADES:
            </p>
            <p className="text-[8px] font-mono text-sky-400/80">
              ATIVAÇÃO
            </p>
            <div className="w-12 h-[1px] bg-gradient-to-l from-sky-400/60 to-transparent mt-0.5 mr-0" />
          </div>

          {/* Bottom Left: DELTÓIDES: ATIVAÇÃO / TELEMETRIA */}
          <div className="absolute bottom-12 left-3 sm:left-4 text-left">
            <p className="text-[9px] sm:text-[10px] font-bold text-sky-300 font-mono">
              DELTÓIDES:
            </p>
            <p className="text-[8px] font-mono text-sky-400/80">
              ATIVAÇÃO
            </p>
            <div className="w-14 h-[1px] bg-gradient-to-r from-sky-400/60 to-transparent mt-0.5 ml-0" />
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 4. DADOS DO TREINO (EXACT FORMAT FROM REFERENCE IMAGE)              */}
      {/* ==================================================================== */}
      <div className="relative z-10 py-2.5 px-1 space-y-1 text-left">
        <h3 className="text-sky-400 font-bold text-sm sm:text-base tracking-wide flex items-center gap-1.5 drop-shadow-[0_1px_6px_rgba(56,189,248,0.4)]">
          <span>DADOS DO TREINO:</span>
          <span className="text-white font-semibold">{currentExercise.name}.</span>
        </h3>

        <div className="space-y-1 text-xs sm:text-[13px] text-slate-200 font-medium leading-relaxed">
          <p className="flex items-center gap-2">
            <span className="text-sky-400 font-bold">🎯</span>
            <span>
              <strong className="text-white font-semibold">Músculos-Alvo:</strong> {primaryMuscleName} ({formattedCategory.toLowerCase()}).
            </span>
          </p>

          <p className="flex items-center gap-2">
            <span className="text-sky-400 font-bold">🏋️</span>
            <span>
              <strong className="text-white font-semibold">Séries:</strong> {sets}.{' '}
              <strong className="text-white font-semibold">Repetições:</strong> {reps}.{' '}
              <strong className="text-white font-semibold">Peso:</strong> {weight} kg.
            </span>
          </p>

          <p className="flex items-center gap-2">
            <span className="text-sky-400 font-bold">⏱️</span>
            <span>
              <strong className="text-white font-semibold">Descanso:</strong> {rest} seg.
            </span>
          </p>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 5. INTERACTIVE STEPPERS: SÉRIE | REPETIÇÕES | PESO                  */}
      {/* ==================================================================== */}
      <div className="relative z-10 space-y-2 my-2">
        {/* ROW 1: SÉRIE */}
        <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-[#091328]/90 border border-sky-500/30">
          <div className="flex items-center gap-2.5">
            <FileText className="w-4 h-4 text-sky-400" />
            <span className="font-mono text-xs sm:text-sm font-bold tracking-wider text-slate-200">
              SÉRIE
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => handleStep('sets', 'down')}
              className="w-8 h-8 rounded-lg bg-[#0e1c3a] border border-sky-500/40 text-sky-300 hover:text-white hover:border-sky-400 flex items-center justify-center transition-all cursor-pointer active:scale-90"
              title="Diminuir série"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
            <span className="font-mono font-bold text-sm sm:text-base text-white w-6 text-center">
              {sets}
            </span>
            <button
              type="button"
              onClick={() => handleStep('sets', 'up')}
              className="w-8 h-8 rounded-lg bg-[#0e1c3a] border border-sky-500/40 text-sky-300 hover:text-white hover:border-sky-400 flex items-center justify-center transition-all cursor-pointer active:scale-90"
              title="Aumentar série"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ROW 2: REPETIÇÕES */}
        <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-[#091328]/90 border border-sky-500/30">
          <div className="flex items-center gap-2.5">
            <Layers className="w-4 h-4 text-sky-400" />
            <span className="font-mono text-xs sm:text-sm font-bold tracking-wider text-slate-200">
              REPETIÇÕES
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => handleStep('reps', 'down')}
              className="w-8 h-8 rounded-lg bg-[#0e1c3a] border border-sky-500/40 text-sky-300 hover:text-white hover:border-sky-400 flex items-center justify-center transition-all cursor-pointer active:scale-90"
              title="Diminuir repetições"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
            <span className="font-mono font-bold text-sm sm:text-base text-white w-6 text-center">
              {reps}
            </span>
            <button
              type="button"
              onClick={() => handleStep('reps', 'up')}
              className="w-8 h-8 rounded-lg bg-[#0e1c3a] border border-sky-500/40 text-sky-300 hover:text-white hover:border-sky-400 flex items-center justify-center transition-all cursor-pointer active:scale-90"
              title="Aumentar repetições"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ROW 3: PESO */}
        <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-[#091328]/90 border border-sky-500/30">
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="w-4 h-4 text-sky-400" />
            <span className="font-mono text-xs sm:text-sm font-bold tracking-wider text-slate-200">
              PESO
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => handleStep('weight', 'down')}
              className="w-8 h-8 rounded-lg bg-[#0e1c3a] border border-sky-500/40 text-sky-300 hover:text-white hover:border-sky-400 flex items-center justify-center transition-all cursor-pointer active:scale-90"
              title="Diminuir peso"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
            <span className="font-mono font-bold text-sm sm:text-base text-white w-6 text-center">
              {weight}
            </span>
            <button
              type="button"
              onClick={() => handleStep('weight', 'up')}
              className="w-8 h-8 rounded-lg bg-[#0e1c3a] border border-sky-500/40 text-sky-300 hover:text-white hover:border-sky-400 flex items-center justify-center transition-all cursor-pointer active:scale-90"
              title="Aumentar peso"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 6. ACTION BUTTONS: INICIAR TREINO | VER VÍDEO | PERSONALIZAR         */}
      {/* ==================================================================== */}
      <div className="relative z-10 grid grid-cols-3 gap-2 pt-2.5 pb-2">
        {/* BUTTON 1: INICIAR TREINO */}
        <button
          type="button"
          onClick={() => {
            playSfx('success');
            vibrate(20);
            if (onStartTraining) {
              onStartTraining({
                exercise: currentExercise,
                sets,
                reps,
                weight,
                rest
              });
            } else {
              // Dispatch global event for workout session
              window.dispatchEvent(
                new CustomEvent('app:startWorkoutExercise', {
                  detail: {
                    exerciseId: currentExercise.id,
                    sets,
                    reps,
                    weight,
                    rest
                  }
                })
              );
            }
          }}
          className="flex items-center justify-center gap-1.5 py-3 px-2 rounded-xl text-xs font-bold text-white transition-all cursor-pointer active:scale-95 shadow-[0_0_15px_rgba(56,189,248,0.35)] hover:shadow-[0_0_20px_rgba(56,189,248,0.55)] border border-sky-400/80 bg-gradient-to-r from-[#0c2a5e] to-[#124b94]"
        >
          <Play className="w-3.5 h-3.5 fill-current text-sky-300" />
          <span className="truncate">Iniciar Treino</span>
        </button>

        {/* BUTTON 2: VER VÍDEO / EXPLICAÇÃO DE VOZ */}
        <button
          type="button"
          onClick={handleToggleVoiceVideo}
          className={`flex items-center justify-center gap-1.5 py-3 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 border ${
            isSpeaking
              ? 'bg-orange-500/25 border-orange-500 text-orange-300 shadow-[0_0_12px_rgba(249,115,22,0.4)] animate-pulse'
              : 'bg-[#09152e]/85 border-sky-500/40 text-sky-200 hover:border-sky-400 hover:text-white'
          }`}
          title="Ver demonstração e ouvir explicação com a voz Aoede da Malu"
        >
          {isSpeaking ? (
            <VolumeX className="w-3.5 h-3.5 text-orange-400" />
          ) : (
            <Video className="w-3.5 h-3.5 text-sky-400" />
          )}
          <span className="truncate">{isSpeaking ? 'Parar Áudio' : 'Ver Vídeo'}</span>
        </button>

        {/* BUTTON 3: PERSONALIZAR */}
        <button
          type="button"
          onClick={() => {
            playSfx('tap');
            vibrate(10);
            setShowPersonalizeModal(true);
          }}
          className="flex items-center justify-center gap-1.5 py-3 px-2 rounded-xl text-xs font-bold bg-[#09152e]/85 border border-sky-500/40 text-sky-200 hover:border-sky-400 hover:text-white transition-all cursor-pointer active:scale-95"
        >
          <Settings className="w-3.5 h-3.5 text-sky-400" />
          <span className="truncate">Personalizar</span>
        </button>
      </div>

      {/* ==================================================================== */}
      {/* 7. FOOTER: Powered by NutriAi                                        */}
      {/* ==================================================================== */}
      <div className="relative z-10 pt-2 text-center">
        <p className="text-[11px] font-mono text-slate-400/90 flex items-center justify-center gap-1.5">
          <span>Powered by</span>
          <span className="text-sky-400">⚛</span>
          <strong className="text-white font-bold tracking-wider">NutriAi</strong>
        </p>
      </div>

      {/* ==================================================================== */}
      {/* MODAL: PERSONALIZAR DETALHES DO TREINO                               */}
      {/* ==================================================================== */}
      <AnimatePresence>
        {showPersonalizeModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-[#040814]/95 backdrop-blur-md p-5 flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-sky-500/30">
                <h4 className="font-bold text-sm text-sky-400 flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Personalizar Parâmetros
                </h4>
                <button
                  type="button"
                  onClick={() => setShowPersonalizeModal(false)}
                  className="p-1 rounded-full text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Tempo de Descanso */}
              <div className="space-y-1.5 text-left">
                <label className="text-xs text-slate-300 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-sky-400" />
                  Tempo de Descanso entre Séries
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[30, 45, 60, 90].map((sec) => (
                    <button
                      key={sec}
                      type="button"
                      onClick={() => {
                        playSfx('tap');
                        setRest(sec);
                      }}
                      className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        rest === sec
                          ? 'bg-sky-500/30 border-sky-400 text-white shadow-[0_0_10px_rgba(56,189,248,0.4)]'
                          : 'bg-[#09152e] border-slate-700 text-slate-400 hover:border-slate-500'
                      }`}
                    >
                      {sec}s
                    </button>
                  ))}
                </div>
              </div>

              {/* Posição Inicial e Dica Pro */}
              <div className="p-3 rounded-xl bg-sky-950/40 border border-sky-500/30 text-left space-y-1">
                <p className="text-[11px] font-bold text-sky-300">💡 Dica Biomecânica</p>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  {currentExercise.proTips?.[0] ||
                    'Mantenha o tronco estável, ombros baixos e execute com cadência controlada.'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                playSfx('tap');
                vibrate(10);
                setShowPersonalizeModal(false);
              }}
              className="w-full py-3 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg cursor-pointer"
            >
              <Check className="w-4 h-4" />
              Salvar Configurações
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default NutriAiExerciseDetailCard;
