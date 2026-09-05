import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, Compass, Utensils, ChefHat, ArrowRight, 
  Check, X, ChevronRight, Zap, Lightbulb, HeartPulse,
  Refrigerator, Activity, BookOpen, Volume2, ShieldCheck,
  Scan, Camera, Droplets, Dumbbell, ShoppingCart, HelpCircle,
  Clock, Flame, Apple, Brain, Smile
} from 'lucide-react';
import { playSfx, vibrate } from '../lib/sensory';

interface WelcomeTourProps {
  onFinish?: () => void;
  onNavigateTab?: (tab: string) => void;
}

interface FeatureHighlight {
  icon: React.ReactNode;
  title: string;
  description: string;
  badge?: string;
  tagColor?: string;
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
  highlights?: FeatureHighlight[];
  proTip?: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    title: 'Bem-vindo ao NutriAI!',
    subtitle: 'Seu ecossistema completo de nutrição, saúde e culinária inteligente.',
    description: 'O NutriAI foi desenvolvido para simplificar sua alimentação diária com inteligência artificial de ponta, acompanhamento de saúde em tempo real e mais de 25 ferramentas integradas.',
    icon: <Sparkles className="w-6 h-6 text-emerald-500 animate-pulse" />,
    badge: 'Visão Geral & Início Rápido',
    primaryActionLabel: 'Conhecer os Recursos',
    highlights: [
      {
        icon: <ChefHat className="w-4 h-4 text-amber-500" />,
        title: 'Chef IA & Gerador Mágico',
        description: 'Crie refeições saudáveis com o que você já tem em casa com cálculo preciso de calorias e macros.',
        tagColor: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
      },
      {
        icon: <Volume2 className="w-4 h-4 text-teal-500" />,
        title: 'Assistente Malu com Voz Real',
        description: 'Converse por voz, ouça o passo a passo das receitas e receba dicas personalizadas em áudio.',
        tagColor: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20'
      },
      {
        icon: <HeartPulse className="w-4 h-4 text-rose-500" />,
        title: 'Monitores de Saúde & Glicose',
        description: 'Acompanhe pressão arterial, glicemia, consumo de água, peso e registro de bem-estar.',
        tagColor: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
      },
      {
        icon: <Refrigerator className="w-4 h-4 text-sky-500" />,
        title: 'Geladeira & Despensa Inteligente',
        description: 'Controle validades, evite desperdícios e gere listas de compras automáticas com 1 toque.',
        tagColor: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20'
      },
      {
        icon: <BookOpen className="w-4 h-4 text-emerald-500" />,
        title: 'Modo de Leitura Acessível',
        description: 'Fontes ampliadas, alto contraste (P&B e Amarelo) e checklist para facilitar o preparo.',
        tagColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
      },
      {
        icon: <ShieldCheck className="w-4 h-4 text-indigo-500" />,
        title: '100% Seguro & Sincronizado',
        description: 'Seus dados são salvos na nuvem de forma segura e protegida em todos os seus dispositivos.',
        tagColor: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20'
      }
    ],
    proTip: 'Dica: Você pode reabrir este guia ou personalizar suas metas na aba de Perfil a qualquer momento.'
  },
  {
    id: 'chef-recipes',
    title: 'Geração de Receitas & Chef IA',
    subtitle: 'Pratos personalizados criados em segundos para a sua rotina.',
    description: 'Basta indicar os ingredientes que você tem na geladeira ou escolher seu objetivo nutricional para receber receitas detalhadas e equilibradas.',
    targetId: 'chef-magic-fab-btn',
    suggestedTab: 'generator',
    icon: <ChefHat className="w-6 h-6 text-amber-500 animate-pulse" />,
    badge: 'Chef IA & Culinária',
    primaryActionLabel: 'Ver Saúde & Monitores',
    highlights: [
      {
        icon: <Apple className="w-4 h-4 text-emerald-500" />,
        title: 'Filtros por Objetivo',
        description: 'Emagrecimento, Hipertrofia, Diabéticos, Low Carb, Vegetariano, Sem Glúten e Detox.',
        tagColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
      },
      {
        icon: <Clock className="w-4 h-4 text-sky-500" />,
        title: 'Timers de Cozimento Integrados',
        description: 'Cada etapa possui cronômetros automáticos para você nunca queimar um prato.',
        tagColor: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20'
      },
      {
        icon: <Volume2 className="w-4 h-4 text-amber-500" />,
        title: 'Comandos de Voz Mãos-Livres',
        description: 'Peça para a Malu avançar passos enquanto você cozinha sem precisar tocar na tela.',
        tagColor: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
      },
      {
        icon: <Flame className="w-4 h-4 text-rose-500" />,
        title: 'Tabela Nutricional Completa',
        description: 'Calorias, proteínas, carboidratos, gorduras, fibras e micronutrientes calculados na hora.',
        tagColor: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
      }
    ],
    proTip: 'Toque no botão flutuante com chapéu de chef no canto inferior direito para acesso instantâneo ao gerador.'
  },
  {
    id: 'health-trackers',
    title: 'Monitor de Saúde & Biomarcadores',
    subtitle: 'Acompanhamento preventivo e registro do seu progresso diário.',
    description: 'Monitore seus sinais vitais, controle sua hidratação e veja como seus hábitos alimentares refletem no seu corpo e na sua disposição.',
    targetId: 'main-draggable-nav',
    suggestedTab: 'wellness',
    icon: <HeartPulse className="w-6 h-6 text-rose-500 animate-bounce" />,
    badge: 'Saúde & Bem-Estar',
    primaryActionLabel: 'Ver Geladeira & Câmera',
    highlights: [
      {
        icon: <Activity className="w-4 h-4 text-rose-500" />,
        title: 'Pressão Arterial & Glicemia',
        description: 'Histórico gráfico com médias semanais e relatórios fáceis de compartilhar com seu médico.',
        tagColor: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
      },
      {
        icon: <Droplets className="w-4 h-4 text-blue-500" />,
        title: 'Controle de Hidratação',
        description: 'Ajuste sua meta diária de água em mililitros e receba lembretes visuais de reposição.',
        tagColor: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
      },
      {
        icon: <Smile className="w-4 h-4 text-purple-500" />,
        title: 'Rastreador Emocional & Estresse',
        description: 'Entenda a relação entre seu humor, ansiedade e episódios de compulsão alimentar.',
        tagColor: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20'
      },
      {
        icon: <Dumbbell className="w-4 h-4 text-amber-500" />,
        title: 'Treinador & Calistenia',
        description: 'Exercícios guiados de peso corporal para acelerar seu gasto calórico sem precisar de aparelhos.',
        tagColor: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
      }
    ],
    proTip: 'Use a aba "Saúde" para registrar suas medições diárias e visualizar sua evolução nos gráficos.'
  },
  {
    id: 'fridge-scanner',
    title: 'Geladeira, Câmera & Despensa',
    subtitle: 'Escaneie pratos e gerencie seus alimentos sem complicação.',
    description: 'Use a inteligência visual para identificar ingredientes por foto, ler códigos de barras de produtos e receber alertas de validade antes que vençam.',
    targetId: 'main-draggable-nav',
    suggestedTab: 'fridge',
    icon: <Refrigerator className="w-6 h-6 text-sky-500 animate-pulse" />,
    badge: 'Despensa & Visão IA',
    primaryActionLabel: 'Ver Acessibilidade',
    highlights: [
      {
        icon: <Camera className="w-4 h-4 text-teal-500" />,
        title: 'Analisador de Pratos por Foto',
        description: 'Tire uma foto do seu prato pronto para a IA estimar os ingredientes e a densidade calórica.',
        tagColor: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20'
      },
      {
        icon: <Scan className="w-4 h-4 text-indigo-500" />,
        title: 'Leitor de Código de Barras',
        description: 'Descubra na hora se um produto é ultraprocessado ou se contém aditivos prejudiciais.',
        tagColor: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20'
      },
      {
        icon: <ShoppingCart className="w-4 h-4 text-emerald-500" />,
        title: 'Lista de Compras Inteligente',
        description: 'Adicione itens que faltam diretamente das receitas para organizar suas compras no mercado.',
        tagColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
      }
    ],
    proTip: 'Acesse a aba "Geladeira" para conferir receitas sugeridas automaticamente com o que está prestes a vencer.'
  },
  {
    id: 'accessibility',
    title: 'Acessibilidade & Recursos Especiais',
    subtitle: 'Pensado para todos: inclusão, facilidade e conforto visual.',
    description: 'O NutriAI conta com ferramentas dedicadas para facilitar o uso por pessoas com dificuldades visuais, mobilidade reduzida ou que preferem narração por áudio.',
    suggestedTab: 'assistant360',
    icon: <BookOpen className="w-6 h-6 text-emerald-500 animate-pulse" />,
    badge: 'Inclusão & Acessibilidade',
    primaryActionLabel: 'Concluir e Começar!',
    highlights: [
      {
        icon: <BookOpen className="w-4 h-4 text-emerald-500" />,
        title: 'Modo de Leitura Especial',
        description: 'Ative no botão do topo para aumentar as fontes (até 30px) e aplicar contraste alto (P&B ou Amarelo).',
        tagColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
      },
      {
        icon: <Volume2 className="w-4 h-4 text-amber-500" />,
        title: 'Leitura em Voz Alta Completa',
        description: 'Botão para ouvir todos os ingredientes ou cada passo individual narrado pela assistente Malu.',
        tagColor: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
      },
      {
        icon: <Check className="w-4 h-4 text-sky-500" />,
        title: 'Checklist com Toque Ampliado',
        description: 'Grandes botões de marcação para separar ingredientes e acompanhar etapas concluídas com facilidade.',
        tagColor: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20'
      }
    ],
    proTip: 'Você pode alternar entre o Modo Escuro, Modo Claro ou Modo de Leitura a qualquer instante pelo cabeçalho superior.'
  }
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
          className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-6 overflow-y-auto select-none"
        >
          {/* Backdrop blur with high contrast dark atmosphere */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={() => handleClose(true)}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-md cursor-pointer transition-opacity"
          />

          {/* Highlight spotlight pointers if targeting an element */}
          {currentStep.targetId === 'main-draggable-nav' && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="fixed top-16 md:top-20 left-0 right-0 h-16 pointer-events-none border-2 border-emerald-400/80 shadow-[0_0_30px_rgba(16,185,129,0.45)] z-40 rounded-2xl mx-4 animate-pulse"
            />
          )}

          {currentStep.targetId === 'chef-magic-fab-btn' && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              className="fixed bottom-16 right-4 md:bottom-20 md:right-6 w-16 h-16 pointer-events-none border-2 border-amber-400 shadow-[0_0_30px_rgba(245,158,11,0.6)] z-40 rounded-full animate-ping"
            />
          )}

          {/* Modal Card with scale 0.95 -> 1 on mount */}
          <motion.div
            key={currentStep.id}
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ 
              type: 'spring', 
              damping: 26, 
              stiffness: 290, 
              mass: 0.8,
              opacity: { duration: 0.25 },
              scale: { duration: 0.3 }
            }}
            className="relative w-full max-w-xl max-h-[92vh] flex flex-col bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-7 shadow-2xl border border-slate-100 dark:border-slate-800 z-50 overflow-hidden my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top ambient color glow */}
            <div className="absolute -top-24 -right-24 w-52 h-52 bg-gradient-to-br from-emerald-500/20 via-teal-500/10 to-transparent rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 w-52 h-52 bg-gradient-to-tr from-indigo-500/15 via-purple-500/10 to-transparent rounded-full blur-2xl pointer-events-none" />

            {/* Header Bar */}
            <div className="flex items-center justify-between gap-4 mb-4 shrink-0">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold tracking-wide uppercase bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40 shadow-xs">
                <Lightbulb className="w-3.5 h-3.5 text-emerald-500" />
                <span>{currentStep.badge}</span>
              </div>

              <div className="flex items-center gap-2.5">
                <span className="text-xs font-bold px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                  {currentStepIndex + 1} de {TOUR_STEPS.length}
                </span>
                <button
                  type="button"
                  onClick={() => handleClose(true)}
                  className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Fechar Guia"
                  id="btn-skip-welcome-tour"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Scrollable Body Content */}
            <div className="overflow-y-auto pr-1 space-y-4 custom-scrollbar">
              {/* Icon & Title Group */}
              <div className="flex items-start gap-3.5">
                <div className="p-3 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800/90 dark:to-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 shadow-sm shrink-0">
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
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                {currentStep.description}
              </p>

              {/* Feature Highlights Grid */}
              {currentStep.highlights && currentStep.highlights.length > 0 && (
                <div className="space-y-2 pt-1">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Principais Destaques:
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {currentStep.highlights.map((h, i) => (
                      <div 
                        key={i} 
                        className="p-3 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800/80 hover:border-slate-200 dark:hover:border-slate-700 transition-all flex items-start gap-2.5"
                      >
                        <div className="p-2 rounded-xl bg-white dark:bg-slate-800 shadow-xs shrink-0 mt-0.5">
                          {h.icon}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-tight">
                            {h.title}
                          </h4>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug mt-0.5">
                            {h.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Pro Tip Box */}
              {currentStep.proTip && (
                <div className="p-3 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-transparent border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 flex items-start gap-2.5 text-xs">
                  <Zap className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span className="leading-relaxed font-medium">{currentStep.proTip}</span>
                </div>
              )}
            </div>

            {/* Footer / Step Indicators & Navigation Actions */}
            <div className="flex items-center justify-between pt-4 mt-3 border-t border-slate-100 dark:border-slate-800 shrink-0">
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
                        ? 'w-7 bg-emerald-500 dark:bg-emerald-400 shadow-xs'
                        : 'w-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600'
                    }`}
                    aria-label={`Ir para passo ${idx + 1}`}
                  />
                ))}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                {currentStepIndex > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      playSfx('tap');
                      setCurrentStepIndex(prev => prev - 1);
                    }}
                    className="px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
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

