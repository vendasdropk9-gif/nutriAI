import React, { useState, useEffect, useMemo, Suspense, lazy } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Video,
  Info,
  ChevronRight,
  Wind,
  Zap,
  AlertTriangle,
  Sparkles
} from 'lucide-react';
import { useTranslation } from '../contexts/LanguageContext';
import { playSfx, vibrate } from '../lib/sensory';
import { UserProfile } from '../types';
import {
  DetailedExercise,
  EXERCISE_DATABASE,
  MUSCLE_GROUPS_CONFIG,
  MuscleGroupCategory,
  getExercisesByCategory,
  getExerciseById
} from '../data/exerciseDatabase';

// Lazy load the unified NutriAi Exercise Detail Card (adopting the reference design)
const NutriAiExerciseDetailCard = lazy(() => import('./NutriAiExerciseDetailCard'));

interface SmartExerciseDemonstrationProps {
  profile: UserProfile | null;
  initialExerciseId?: string;
  autoStartVoice?: boolean;
  onStartActiveTraining?: (exercise: DetailedExercise) => void;
  onUpdateProfile?: (profile: UserProfile) => void;
}

export function SmartExerciseDemonstration({
  profile,
  initialExerciseId = 'seated-lateral-raises',
  onStartActiveTraining,
  onUpdateProfile
}: SmartExerciseDemonstrationProps) {
  const { t } = useTranslation();

  // Selected Category and Exercise State
  const [selectedCategory, setSelectedCategory] = useState<MuscleGroupCategory>('shoulders');
  const [selectedExerciseId, setSelectedExerciseId] = useState<string>(initialExerciseId);

  // Synchronize initial exercise if passed
  useEffect(() => {
    if (initialExerciseId) {
      const found = getExerciseById(initialExerciseId);
      if (found) {
        setSelectedExerciseId(found.id);
        setSelectedCategory(found.category);
      }
    }
  }, [initialExerciseId]);

  // Listen to global exercise demo event (e.g. triggered by Malu or exercise cards)
  useEffect(() => {
    const handleOpenDemo = (e: any) => {
      const exId = e.detail?.exerciseId;
      if (exId) {
        const found = getExerciseById(exId);
        if (found) {
          setSelectedExerciseId(found.id);
          setSelectedCategory(found.category);
        }
      }
    };

    window.addEventListener('app:openExerciseDemo', handleOpenDemo);
    return () => {
      window.removeEventListener('app:openExerciseDemo', handleOpenDemo);
    };
  }, []);

  const currentExercise = useMemo(() => {
    return getExerciseById(selectedExerciseId) || EXERCISE_DATABASE[0];
  }, [selectedExerciseId]);

  // Available exercises in the current selected muscle group
  const categoryExercises = useMemo(() => {
    return getExercisesByCategory(selectedCategory);
  }, [selectedCategory]);

  // Explanation Modal / Accordion
  const [isExplanationOpen, setIsExplanationOpen] = useState<boolean>(false);

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col items-center justify-center space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-16 px-3 sm:px-4 md:px-6">

      {/* TOP HEADER: Branding & Subtitle */}
      <div className="text-center space-y-2.5 w-full max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-sky-500/10 dark:bg-sky-400/10 border border-sky-500/25 text-sky-600 dark:text-sky-400 text-xs sm:text-sm font-bold tracking-wide">
          <Video className="w-4 h-4 text-sky-400 animate-pulse" />
          <span>{t('smart_demonstration_badge', 'Demonstração Anatômica NutriAi')}</span>
        </div>

        <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-medium tracking-tight text-slate-900 dark:text-white">
          {t('smart_demonstration_title', 'Demonstração Inteligente')}
        </h2>

        <p className="font-sans text-slate-600 dark:text-slate-300 max-w-xl mx-auto text-xs sm:text-sm md:text-base leading-relaxed">
          {t('smart_demonstration_subtitle', 'Visualização anatômica com destaque de ativação muscular em tempo real e controle cinemático multi-ângulos.')}
        </p>
      </div>

      {/* MUSCLE GROUP SELECTOR TABS */}
      <div className="w-full overflow-x-auto no-scrollbar py-1">
        <div className="flex items-center justify-start md:justify-center gap-2 min-w-max px-2">
          {MUSCLE_GROUPS_CONFIG.map((group) => {
            const isSelected = selectedCategory === group.id;
            return (
              <button
                key={group.id}
                type="button"
                onClick={() => {
                  playSfx('tap');
                  vibrate(12);
                  setSelectedCategory(group.id as MuscleGroupCategory);
                  const firstEx = getExercisesByCategory(group.id as MuscleGroupCategory)[0];
                  if (firstEx) setSelectedExerciseId(firstEx.id);
                }}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer select-none border shadow-xs ${
                  isSelected
                    ? 'bg-[#09152e] text-sky-400 border-sky-500/60 shadow-md shadow-sky-500/25 ring-1 ring-sky-500/40 scale-105'
                    : 'bg-white dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-slate-200/70 dark:border-slate-700/60 hover:border-sky-500/40'
                }`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: group.color }}
                />
                <span>{t(`muscle_cat_${group.id}`, group.label)}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* EXERCISE PILLS FOR CURRENT MUSCLE GROUP */}
      <div className="w-full flex items-center justify-start md:justify-center gap-2 overflow-x-auto no-scrollbar py-1">
        {categoryExercises.map((ex) => {
          const isSelected = ex.id === selectedExerciseId;
          return (
            <button
              key={ex.id}
              type="button"
              onClick={() => {
                playSfx('tap');
                vibrate(10);
                setSelectedExerciseId(ex.id);
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                isSelected
                  ? 'bg-sky-500 text-white font-bold shadow-md shadow-sky-500/30 scale-102'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {t(ex.name)}
            </button>
          );
        })}
      </div>

      {/* ======================================================== */}
      {/* CARD ÚNICO DO EXERCÍCIO (DESIGN COM BRILHO AZUL CIBERNÉTICO) */}
      {/* ======================================================== */}
      <div className="w-full flex flex-col items-center justify-center space-y-6 animate-in fade-in zoom-in-95 duration-500">
        <Suspense
          fallback={
            <div className="w-full max-w-[460px] h-[650px] rounded-[38px] bg-[#070d1e] border border-sky-500/30 flex flex-col items-center justify-center space-y-3">
              <div className="w-10 h-10 rounded-full border-2 border-sky-400/30 border-t-sky-400 animate-spin" />
              <p className="text-xs text-sky-300 font-mono">Carregando Card NutriAi...</p>
            </div>
          }
        >
          <NutriAiExerciseDetailCard
            exercise={currentExercise}
            profile={profile}
            onStartTraining={(data) => {
              if (onStartActiveTraining) {
                onStartActiveTraining(data.exercise);
              }
            }}
          />
        </Suspense>

        {/* Biomechanical Details Accordion below the Unified Card */}
        <div className="w-full max-w-[460px] space-y-3">
          <button
            type="button"
            onClick={() => {
              playSfx('tap');
              setIsExplanationOpen(!isExplanationOpen);
            }}
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-sky-500/15 via-blue-500/10 to-transparent border border-sky-500/30 hover:border-sky-500/50 text-sky-300 font-bold text-xs sm:text-sm flex items-center justify-between transition-all cursor-pointer shadow-xs"
          >
            <div className="flex items-center gap-2.5">
              <Info className="w-4 h-4 text-sky-400" />
              <span className="font-bold tracking-wide">GUIA BIOMECÂNICO & ERROS COMUNS</span>
            </div>
            <ChevronRight className={`w-4 h-4 transition-transform ${isExplanationOpen ? 'rotate-90' : ''}`} />
          </button>

          <AnimatePresence>
            {isExplanationOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-[#080f24] text-white rounded-2xl border border-sky-500/35 p-5 space-y-4 overflow-hidden text-left shadow-xl"
              >
                <div className="space-y-4">
                  {/* 1. Posição Inicial */}
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-sky-400 uppercase tracking-wide">
                      1. Posição Inicial
                    </p>
                    <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-medium">
                      {currentExercise.initialPosition}
                    </p>
                  </div>

                  {/* 2. Como Executar */}
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-sky-400 uppercase tracking-wide">
                      2. Como Executar
                    </p>
                    <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-medium">
                      {currentExercise.movement}
                    </p>
                  </div>

                  {/* 3. Respiração */}
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-blue-400 uppercase tracking-wide flex items-center gap-1.5">
                      <Wind className="w-3.5 h-3.5" />
                      <span>3. Respiração</span>
                    </p>
                    <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-medium">
                      {currentExercise.breathing.inhale}
                    </p>
                    <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-medium">
                      {currentExercise.breathing.exhale}
                    </p>
                  </div>

                  {/* 4. Músculos Trabalhados */}
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-orange-400 uppercase tracking-wide flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5" />
                      <span>4. Músculos Trabalhados</span>
                    </p>
                    <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-medium">
                      <strong className="text-red-400">Principal:</strong> {currentExercise.primaryMuscles.join(', ')}
                      {currentExercise.secondaryMuscles.length > 0 && (
                        <> • <strong className="text-amber-400">Secundários:</strong> {currentExercise.secondaryMuscles.join(', ')}</>
                      )}
                    </p>
                  </div>

                  {/* 5. Erros Comuns */}
                  <div className="space-y-2 pt-1">
                    <p className="text-xs font-bold text-red-400 uppercase tracking-wide flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>5. Erros Comuns</span>
                    </p>
                    <div className="space-y-2">
                      {currentExercise.commonMistakes.map((m, idx) => (
                        <div key={idx} className="p-3 rounded-xl bg-red-950/40 border border-red-500/30 space-y-1">
                          <p className="text-xs font-bold text-red-300">
                            ❌ {m.mistake}
                          </p>
                          <p className="text-xs text-slate-200 font-medium">
                            ✅ {m.fix}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 6. Dica de Execução */}
                  {currentExercise.proTips.length > 0 && (
                    <div className="p-3.5 rounded-xl bg-sky-950/50 border border-sky-500/40 space-y-1">
                      <p className="text-xs font-bold text-sky-300 flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>6. Dica de Execução Pro</span>
                      </p>
                      <p className="text-xs text-slate-200 italic">
                        "{currentExercise.proTips[0]}"
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

export default SmartExerciseDemonstration;
