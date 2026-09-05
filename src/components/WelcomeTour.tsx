import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, Compass, Utensils, ChefHat, ArrowRight, 
  Check, X, ChevronRight, Zap, Lightbulb 
} from 'lucide-react';
import { playSfx, vibrate } from '../lib/sensory';

interface WelcomeTourProps {
  onFinish?: () => void;
  onNavigateTab?: (tab: string) => void;
}

interface TourStep {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  targetId?: string;
  icon: React.ReactNode;
  badge: string;
  primaryActionLabel: string;
  suggestedTab?: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    title: 'Bem-vindo ao NutriAI!',
    subtitle: 'Sua jornada de nutrição e saúde inteligente começa aqui.',
    description: 'Criamos um guia rápido e interativo de 3 passos para você dominar todas as ferramentas e começar a gerar suas refeições agora.',
    icon: <Sparkles className="w-6 h-6 text-emerald-500 animate-pulse" />,
    badge: 'Início Rápido',
    primaryActionLabel: 'Conhecer as Funções',
  },
  {
    id: 'navigation',
    title: 'Barra de Navegação Inteligente',
    subtitle: 'Mais de 25 ferramentas integradas em um só lugar.',
    description: 'Deslize a barra de navegação no topo da tela para alternar entre Assistente 360°, Pratos Rápidos, Geladeira Inteligente, Monitor de Saúde, Calistenia e muito mais.',
    targetId: 'main-draggable-nav',
    icon: <Compass className="w-6 h-6 text-indigo-500 animate-bounce" />,
    badge: 'Navegação',
    primaryActionLabel: 'Ver Geração de Receitas',
  },
  {
    id: 'recipes',
    title: 'Geração de Receitas com IA',
    subtitle: 'Crie pratos mágicos com os ingredientes que você tem em casa.',
    description: 'Acesse a aba "Receitas" ou clique no botão do Chef IA no canto inferior para digitar ou falar seus ingredientes e receber refeições balanceadas em segundos.',
    targetId: 'chef-magic-fab-btn',
    suggestedTab: 'generator',
    icon: <ChefHat className="w-6 h-6 text-amber-500 animate-pulse" />,
    badge: 'Chef IA & Receitas',
    primaryActionLabel: 'Começar a Usar o NutriAI',
  },
];

const STORAGE_KEY = 'nutri-welcome-tour-completed';

export function WelcomeTour({ onFinish, onNavigateTab }: WelcomeTourProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  useEffect(() => {
    try {
      const isCompleted = window.localStorage.getItem(STORAGE_KEY);
      if (!isCompleted) {
        // Small delay after login/mount so the interface loads smoothly
        const timer = setTimeout(() => {
          setIsOpen(true);
          playSfx('pop');
          vibrate(20);
        }, 800);
        return () => clearTimeout(timer);
      }
    } catch (err) {
      console.warn('Could not read tour completed status:', err);
    }
  }, []);

  // Allow reopening tour via custom event if requested
  useEffect(() => {
    const handleReopenTour = () => {
      setCurrentStepIndex(0);
      setIsOpen(true);
      playSfx('pop');
      vibrate(20);
    };
    window.addEventListener('app:openWelcomeTour', handleReopenTour);
    return () => window.removeEventListener('app:openWelcomeTour', handleReopenTour);
  }, []);

  const handleClose = (markCompleted = true) => {
    if (markCompleted) {
      try {
        window.localStorage.setItem(STORAGE_KEY, 'true');
      } catch (e) {}
    }
    setIsOpen(false);
    playSfx('tap');
    vibrate(10);
    if (onFinish) onFinish();
  };

  const handleNext = () => {
    playSfx('tap');
    vibrate(15);
    if (currentStepIndex < TOUR_STEPS.length - 1) {
      const nextIndex = currentStepIndex + 1;
      setCurrentStepIndex(nextIndex);
      
      const nextStep = TOUR_STEPS[nextIndex];
      if (nextStep?.suggestedTab && onNavigateTab) {
        onNavigateTab(nextStep.suggestedTab);
      }
    } else {
      // Finished
      const lastStep = TOUR_STEPS[currentStepIndex];
      if (lastStep?.suggestedTab && onNavigateTab) {
        onNavigateTab(lastStep.suggestedTab);
      }
      handleClose(true);
      playSfx('success');
      vibrate([30, 40, 50]);
    }
  };

  if (typeof document === 'undefined') return null;

  const currentStep = TOUR_STEPS[currentStepIndex];
  const isLastStep = currentStepIndex === TOUR_STEPS.length - 1;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div 
          id="welcome-tour-overlay"
          className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 overflow-hidden select-none"
        >
          {/* Backdrop blur with high contrast dark atmosphere */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={() => handleClose(true)}
            className="absolute inset-0 bg-slate-950/75 backdrop-blur-md cursor-pointer transition-opacity"
          />

          {/* Highlight spotlight pointers if targeting an element */}
          {currentStep.targetId === 'main-draggable-nav' && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute top-16 md:top-20 left-0 right-0 h-16 pointer-events-none border-2 border-emerald-400/80 shadow-[0_0_30px_rgba(16,185,129,0.45)] z-40 rounded-2xl mx-4 animate-pulse"
            />
          )}

          {currentStep.targetId === 'chef-magic-fab-btn' && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute bottom-16 right-4 md:bottom-20 md:right-6 w-16 h-16 pointer-events-none border-2 border-amber-400 shadow-[0_0_30px_rgba(245,158,11,0.6)] z-40 rounded-full animate-ping"
            />
          )}

          {/* Modal Card with scale 0.95 -> 1 on mount */}
          <motion.div
            key={currentStep.id}
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ 
              type: 'spring', 
              damping: 26, 
              stiffness: 290, 
              mass: 0.8,
              opacity: { duration: 0.25 },
              scale: { duration: 0.3 }
            }}
            className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-100 dark:border-slate-800 z-50 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top ambient color glow */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-gradient-to-br from-emerald-500/20 via-teal-500/10 to-transparent rounded-full blur-2xl pointer-events-none" />

            {/* Header Bar */}
            <div className="flex items-center justify-between gap-4 mb-5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40">
                <Lightbulb className="w-3.5 h-3.5" />
                <span>{currentStep.badge}</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">
                  {currentStepIndex + 1} de {TOUR_STEPS.length}
                </span>
                <button
                  type="button"
                  onClick={() => handleClose(true)}
                  className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Pular Tour"
                  id="btn-skip-welcome-tour"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Icon & Title Group */}
            <div className="flex items-start gap-4 mb-4">
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700/60 shadow-xs shrink-0">
                {currentStep.icon}
              </div>
              <div className="space-y-1 min-w-0">
                <h3 className="text-xl sm:text-2xl font-bold font-serif text-slate-900 dark:text-white leading-tight">
                  {currentStep.title}
                </h3>
                <p className="text-xs sm:text-sm font-medium text-emerald-600 dark:text-emerald-400">
                  {currentStep.subtitle}
                </p>
              </div>
            </div>

            {/* Description */}
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed mb-6 font-normal">
              {currentStep.description}
            </p>

            {/* Step Indicators (Dots) */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-1.5">
                {TOUR_STEPS.map((step, idx) => (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => {
                      setCurrentStepIndex(idx);
                      playSfx('tap');
                    }}
                    className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                      idx === currentStepIndex
                        ? 'w-6 bg-emerald-500 dark:bg-emerald-400 shadow-xs'
                        : 'w-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600'
                    }`}
                    aria-label={`Ir para passo ${idx + 1}`}
                  />
                ))}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2.5">
                {currentStepIndex > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      playSfx('tap');
                      setCurrentStepIndex(prev => prev - 1);
                    }}
                    className="px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                  >
                    Voltar
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleNext}
                  id="btn-next-welcome-tour-step"
                  className="inline-flex items-center gap-2 px-5 py-2.5 sm:py-3 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-600 hover:to-teal-600 text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-500/25 hover:shadow-emerald-500/40 active:scale-[0.98] transition-all cursor-pointer select-none"
                >
                  <span>{currentStep.primaryActionLabel}</span>
                  {isLastStep ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <ArrowRight className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
