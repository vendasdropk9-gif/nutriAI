import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  TrendingUp,
  Flame,
  Scale,
  Ruler,
  SlidersHorizontal,
  Volume2,
  VolumeX,
  Calendar,
  ShieldCheck,
  Award,
  Activity,
  Compass,
  Camera,
  Layers,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';
import { Profile3DAvatar, PoseType } from './Profile3DAvatar';
import { UserProfile } from '../types';
import avatarGlobalStore, { useAvatarGlobalState, SomatotypeType } from '../lib/avatarGlobalState';
import { playSfx, vibrate } from '../lib/sensory';
import { speak, stopSpeech } from '../lib/speech';

export interface Evolution3DTimelapseModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile | null;
}

export function Evolution3DTimelapseModal({
  isOpen,
  onClose,
  profile
}: Evolution3DTimelapseModalProps) {
  // Global avatar state for current profile settings
  const avatarState = useAvatarGlobalState();

  // Historical progress logs from profile or defaults
  const progressLogs = useMemo(() => {
    if (!profile || !profile.progressLogs || profile.progressLogs.length === 0) {
      // Benchmark simulated data if no history yet
      const today = new Date();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(today.getDate() - 30);
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(today.getDate() - 60);

      const baseWeight = profile?.weight || 84;
      const currentBf = avatarState.bodyFatPercentage || 14;

      return [
        {
          date: sixtyDaysAgo.toISOString(),
          weight: baseWeight + 9.5,
          bodyFat: currentBf + 12,
          muscleMassKg: 32.5,
          waistCm: 94,
          chestCm: 102
        },
        {
          date: thirtyDaysAgo.toISOString(),
          weight: baseWeight + 4.2,
          bodyFat: currentBf + 6,
          muscleMassKg: 34.0,
          waistCm: 88,
          chestCm: 105
        },
        {
          date: today.toISOString(),
          weight: baseWeight,
          bodyFat: currentBf,
          muscleMassKg: 36.2,
          waistCm: 80,
          chestCm: 110
        }
      ];
    }

    // Sort chronologically (oldest first)
    return [...profile.progressLogs].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [profile, avatarState.bodyFatPercentage]);

  const oldestLog = progressLogs[0];
  const newestLog = progressLogs[progressLogs.length - 1];

  // Calculated Deltas
  const initialWeight = oldestLog.weight || 82;
  const currentWeight = newestLog.weight || (profile?.weight ? Number(profile.weight) : 74);

  const initialBodyFat = oldestLog.bodyFat || 26;
  const currentBodyFat = newestLog.bodyFat || avatarState.bodyFatPercentage || 14;

  const weightDelta = Number((currentWeight - initialWeight).toFixed(1));
  const fatDelta = Number((currentBodyFat - initialBodyFat).toFixed(1));

  // Calculated Muscle Mass Delta
  const initialFatKg = (initialWeight * initialBodyFat) / 100;
  const currentFatKg = (currentWeight * currentBodyFat) / 100;
  const fatMassDeltaKg = Number((currentFatKg - initialFatKg).toFixed(1));

  const initialLeanKg = initialWeight - initialFatKg;
  const currentLeanKg = currentWeight - currentFatKg;
  const leanMassDeltaKg = Number((currentLeanKg - initialLeanKg).toFixed(1));

  // Interactive Timelapse Animation Controls
  const [timelapseProgress, setTimelapseProgress] = useState<number>(100); // 0% = Before, 100% = Today
  const [isPlayingTimelapse, setIsPlayingTimelapse] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [selectedPose, setSelectedPose] = useState<PoseType>('flex');
  const [viewMode, setViewMode] = useState<'side-by-side' | 'morph-slider'>('side-by-side');
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);

  // Computed Interpolated Metrics based on timelapseProgress (0 - 100)
  const interpProgress = timelapseProgress / 100;
  const interpWeight = Number((initialWeight + (currentWeight - initialWeight) * interpProgress).toFixed(1));
  const interpBodyFat = Number((initialBodyFat + (currentBodyFat - initialBodyFat) * interpProgress).toFixed(1));
  const interpShoulderRatio = Number((1.05 + (avatarState.shoulderWaistRatio - 1.05) * interpProgress).toFixed(2));

  // Audio Malu Guidance
  const handleSpeakMaluSummary = () => {
    stopSpeech();
    setIsSpeaking(true);
    playSfx('tap');
    vibrate(12);

    const message = `Comparativo 3D de Evolução Corporal! Você começou com ${initialWeight} quilos e ${initialBodyFat}% de gordura. Hoje seu corpo apresenta ${currentWeight} quilos com ${currentBodyFat}% de gordura corporal. Houve uma recomposição com redução de ${Math.abs(fatMassDeltaKg)} quilos de gordura pura e ganho de ${Math.max(0, leanMassDeltaKg)} quilos de massa magra. Parabéns pelo foco!`;

    speak(message, {
      voice: 'Aoede',
      onEnded: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false)
    });
  };

  // Timelapse Ticker Effect
  useEffect(() => {
    let animFrame: number;
    let lastTime = performance.now();

    const tick = (now: number) => {
      if (!isPlayingTimelapse) return;

      const dt = (now - lastTime) / 1000;
      lastTime = now;

      setTimelapseProgress((prev) => {
        const next = prev + dt * 25 * playbackSpeed; // 0 to 100 in 4 seconds at 1x
        if (next >= 100) {
          setIsPlayingTimelapse(false);
          playSfx('crystal');
          vibrate([20, 30]);
          return 100;
        }
        return next;
      });

      animFrame = requestAnimationFrame(tick);
    };

    if (isPlayingTimelapse) {
      lastTime = performance.now();
      animFrame = requestAnimationFrame(tick);
    }

    return () => {
      if (animFrame) cancelAnimationFrame(animFrame);
    };
  }, [isPlayingTimelapse, playbackSpeed]);

  const handleTogglePlayTimelapse = () => {
    playSfx('tap');
    vibrate(10);
    if (isPlayingTimelapse) {
      setIsPlayingTimelapse(false);
    } else {
      if (timelapseProgress >= 100) {
        setTimelapseProgress(0);
      }
      setIsPlayingTimelapse(true);
    }
  };

  const handleResetTimelapse = () => {
    playSfx('pop');
    vibrate(10);
    setIsPlayingTimelapse(false);
    setTimelapseProgress(0);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/92 backdrop-blur-xl overflow-hidden select-none animate-in fade-in duration-300">
        
        {/* ================================================================ */}
        {/* TOP BAR: Title, Mode Tabs & Close Button                        */}
        {/* ================================================================ */}
        <div className="absolute top-4 inset-x-4 md:inset-x-8 z-30 flex items-center justify-between pointer-events-auto">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-purple-500/30 shadow-xl backdrop-blur-md">
              <TrendingUp className="w-4 h-4 text-purple-400" />
              <h2 className="text-xs md:text-sm font-bold text-white tracking-wide flex items-center gap-1.5">
                <span>Timelapse 3D de Evolução Corporal</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  ANTES VS. HOJE
                </span>
              </h2>
            </div>

            {/* View Mode Toggle (Side-by-Side vs Morph Slider) */}
            <div className="hidden sm:flex items-center p-1 rounded-xl bg-slate-900/90 border border-slate-700/80 backdrop-blur-md">
              <button
                type="button"
                onClick={() => {
                  playSfx('tap');
                  setViewMode('side-by-side');
                }}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  viewMode === 'side-by-side'
                    ? 'bg-purple-500 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Lado a Lado (3D Duplo)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  playSfx('tap');
                  setViewMode('morph-slider');
                }}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  viewMode === 'morph-slider'
                    ? 'bg-purple-500 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Morfose Interativa</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Malu Audio Summary Button */}
            <button
              type="button"
              onClick={handleSpeakMaluSummary}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold shadow-lg transition-all active:scale-95 cursor-pointer border ${
                isSpeaking
                  ? 'bg-rose-500/20 border-rose-500/40 text-rose-300 animate-pulse'
                  : 'bg-slate-900/90 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/20'
              }`}
              title="Malu lê a análise de recomposição corporal"
            >
              {isSpeaking ? (
                <>
                  <VolumeX className="w-3.5 h-3.5 text-rose-400" />
                  <span className="hidden sm:inline">Parar Áudio</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden sm:inline">Ouvir Análise Malu</span>
                </>
              )}
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={() => {
                stopSpeech();
                onClose();
              }}
              className="p-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 transition-all cursor-pointer active:scale-95"
              title="Fechar comparativo"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ================================================================ */}
        {/* CENTER 3D COMPARATIVE STAGE                                      */}
        {/* ================================================================ */}
        <div className="w-full h-full pt-16 pb-36 px-4 md:px-8 flex flex-col justify-center items-center relative z-10">
          
          {/* DELTA SUMMARY CARDS TOP BANNER */}
          <div className="w-full max-w-4xl grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-3 pointer-events-auto">
            {/* Delta Peso */}
            <div className="p-2.5 sm:p-3 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between shadow-lg backdrop-blur-md">
              <div>
                <span className="text-[10px] font-mono uppercase font-bold text-slate-400 block">Variação de Peso</span>
                <span className="text-base sm:text-lg font-mono font-black text-white">
                  {interpWeight} kg
                </span>
              </div>
              <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-lg border ${
                weightDelta <= 0
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
              }`}>
                {weightDelta > 0 ? `+${weightDelta}` : weightDelta} kg
              </span>
            </div>

            {/* Delta Gordura */}
            <div className="p-2.5 sm:p-3 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between shadow-lg backdrop-blur-md">
              <div>
                <span className="text-[10px] font-mono uppercase font-bold text-slate-400 block">Gordura Corporal</span>
                <span className="text-base sm:text-lg font-mono font-black text-amber-300">
                  {interpBodyFat}% BF
                </span>
              </div>
              <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-lg border ${
                fatDelta <= 0
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
              }`}>
                {fatDelta > 0 ? `+${fatDelta}` : fatDelta}%
              </span>
            </div>

            {/* Fat Mass Delta */}
            <div className="p-2.5 sm:p-3 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between shadow-lg backdrop-blur-md">
              <div>
                <span className="text-[10px] font-mono uppercase font-bold text-slate-400 block">Massa Gorda</span>
                <span className="text-base sm:text-lg font-mono font-black text-rose-300">
                  {fatMassDeltaKg} kg
                </span>
              </div>
              <Flame className="w-5 h-5 text-rose-400" />
            </div>

            {/* Lean Mass Delta */}
            <div className="p-2.5 sm:p-3 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between shadow-lg backdrop-blur-md">
              <div>
                <span className="text-[10px] font-mono uppercase font-bold text-slate-400 block">Massa Magra</span>
                <span className="text-base sm:text-lg font-mono font-black text-emerald-300">
                  +{Math.max(0, leanMassDeltaKg)} kg
                </span>
              </div>
              <Award className="w-5 h-5 text-emerald-400" />
            </div>
          </div>

          {/* 3D STAGE STAGE CONTAINER */}
          {viewMode === 'side-by-side' ? (
            <div className="w-full max-w-5xl h-full flex flex-col sm:flex-row gap-4 items-center justify-center relative">
              
              {/* LEFT 3D CANVAS: ANTES / INICIAL */}
              <div className="w-full sm:w-1/2 h-full rounded-3xl bg-gradient-to-b from-slate-900/90 via-slate-900/70 to-slate-950/90 border-2 border-slate-800 shadow-2xl relative overflow-hidden flex flex-col justify-between p-4 group">
                <div className="flex items-center justify-between relative z-20">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-300 bg-amber-500/20 px-2.5 py-1 rounded-xl border border-amber-500/30">
                      PONTO DE PARTIDA (ANTES)
                    </span>
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-400 bg-black/50 px-2.5 py-1 rounded-xl border border-white/10">
                    {initialWeight} kg • {initialBodyFat}% BF
                  </span>
                </div>

                {/* 3D Model Before */}
                <div className="w-full h-full absolute inset-0 z-10 pointer-events-auto">
                  <Profile3DAvatar
                    points={profile?.points || 0}
                    streak={profile?.streak || 0}
                    level={profile?.level || 1}
                    avatarId={profile?.avatarId || 'athena-fit-pro'}
                    userSkinTone={profile?.skinTone}
                  />
                </div>

                {/* Footer specs */}
                <div className="relative z-20 mt-auto pt-2 flex justify-between text-[10px] font-mono text-slate-400 bg-slate-950/70 p-2 rounded-xl border border-white/5">
                  <span>Biotipo: Endomorfo / Suave</span>
                  <span>Definição: Natural</span>
                </div>
              </div>

              {/* RIGHT 3D CANVAS: HOJE / ATUAL */}
              <div className="w-full sm:w-1/2 h-full rounded-3xl bg-gradient-to-b from-slate-900/90 via-slate-900/70 to-slate-950/90 border-2 border-purple-500/40 shadow-2xl relative overflow-hidden flex flex-col justify-between p-4 group">
                <div className="flex items-center justify-between relative z-20">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-300 bg-emerald-500/20 px-2.5 py-1 rounded-xl border border-emerald-500/30">
                      RESULTADO ATUAL (HOJE)
                    </span>
                  </div>
                  <span className="text-xs font-mono font-bold text-emerald-300 bg-black/50 px-2.5 py-1 rounded-xl border border-emerald-500/30">
                    {currentWeight} kg • {currentBodyFat}% BF
                  </span>
                </div>

                {/* 3D Model Today */}
                <div className="w-full h-full absolute inset-0 z-10 pointer-events-auto">
                  <Profile3DAvatar
                    points={profile?.points || 0}
                    streak={profile?.streak || 0}
                    level={profile?.level || 1}
                    avatarId={profile?.avatarId || 'athena-fit-pro'}
                    userSkinTone={profile?.skinTone}
                  />
                </div>

                {/* Footer specs */}
                <div className="relative z-20 mt-auto pt-2 flex justify-between text-[10px] font-mono text-emerald-300/80 bg-slate-950/70 p-2 rounded-xl border border-emerald-500/20">
                  <span>Biotipo: Mesomorfo V-Taper</span>
                  <span>Definição: Esculpido / Atleta</span>
                </div>
              </div>

            </div>
          ) : (
            /* MORPH SLIDER SINGLE 3D STAGE MODE */
            <div className="w-full max-w-3xl h-full rounded-3xl bg-gradient-to-b from-slate-900 via-slate-900/90 to-slate-950 border-2 border-purple-500/40 shadow-2xl relative overflow-hidden flex flex-col justify-between p-4 pointer-events-auto">
              <div className="flex items-center justify-between relative z-20">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-purple-300 bg-purple-500/20 px-3 py-1 rounded-xl border border-purple-500/30 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                  Evolução em Morfose Contínua ({Math.round(timelapseProgress)}%)
                </span>
                <span className="text-xs font-mono font-bold text-white bg-black/50 px-3 py-1 rounded-xl border border-white/10">
                  {interpWeight} kg • {interpBodyFat}% BF
                </span>
              </div>

              {/* Single Interactive 3D Model */}
              <div className="w-full h-full absolute inset-0 z-10">
                <Profile3DAvatar
                  points={profile?.points || 0}
                  streak={profile?.streak || 0}
                  level={profile?.level || 1}
                  avatarId={profile?.avatarId || 'athena-fit-pro'}
                  userSkinTone={profile?.skinTone}
                />
              </div>

              {/* Specs Overlay */}
              <div className="relative z-20 mt-auto pt-2 flex justify-between text-xs font-mono text-slate-300 bg-slate-950/80 p-3 rounded-2xl border border-white/10">
                <span>V-Taper Estimado: <strong className="text-rose-300">{interpShoulderRatio}x</strong></span>
                <span>Ativação Muscular: <strong className="text-emerald-300">{Math.round(timelapseProgress)}%</strong></span>
              </div>
            </div>
          )}
        </div>

        {/* ================================================================ */}
        {/* BOTTOM TIMELAPSE PLAYBACK DOCK                                   */}
        {/* ================================================================ */}
        <div className="absolute bottom-4 inset-x-4 md:inset-x-8 z-30 max-w-4xl mx-auto pointer-events-auto">
          <div className="rounded-3xl bg-slate-950/95 border border-purple-500/30 shadow-[0_20px_50px_rgba(0,0,0,0.8)] backdrop-blur-xl p-4 space-y-3">
            
            {/* Slider Row */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                <span className="flex items-center gap-1.5 text-purple-300">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Linha do Tempo de Transformação 3D:</span>
                </span>
                <span className="font-mono text-xs text-amber-300">
                  {timelapseProgress <= 5 ? 'Dia 1 (Antes)' : timelapseProgress >= 95 ? 'Dia Atual (Resultado)' : `Progresso: ${Math.round(timelapseProgress)}%`}
                </span>
              </div>

              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={timelapseProgress}
                onChange={(e) => {
                  setIsPlayingTimelapse(false);
                  setTimelapseProgress(Number(e.target.value));
                }}
                className="w-full h-2.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
              />

              <div className="flex justify-between items-center text-[10px] font-mono text-slate-400">
                <span>Antes ({initialWeight}kg | {initialBodyFat}% BF)</span>
                <span className="text-purple-400 font-bold">◄ Arraste para comparar ►</span>
                <span className="text-emerald-300">Hoje ({currentWeight}kg | {currentBodyFat}% BF)</span>
              </div>
            </div>

            {/* Playback Controls Row */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/80">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleTogglePlayTimelapse}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer active:scale-95 flex items-center gap-2 shadow-lg ${
                    isPlayingTimelapse
                      ? 'bg-amber-500 text-slate-950 shadow-amber-500/20'
                      : 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-600/30'
                  }`}
                >
                  {isPlayingTimelapse ? (
                    <>
                      <Pause className="w-4 h-4 fill-current" />
                      <span>Pausar</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-current" />
                      <span>▶️ Tocar Timelapse 3D</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleResetTimelapse}
                  className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 text-xs font-bold transition-all cursor-pointer"
                  title="Recomeçar do início"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>

              {/* Speed Buttons */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-400">Velocidade:</span>
                {[0.5, 1.0, 2.0].map((spd) => (
                  <button
                    key={spd}
                    type="button"
                    onClick={() => {
                      playSfx('tap');
                      setPlaybackSpeed(spd);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                      playbackSpeed === spd
                        ? 'bg-purple-500 text-white'
                        : 'bg-slate-900 text-slate-400 hover:text-white'
                    }`}
                  >
                    {spd}x
                  </button>
                ))}
              </div>
            </div>

          </div>
        </div>

      </div>
    </AnimatePresence>
  );
}

export default Evolution3DTimelapseModal;
