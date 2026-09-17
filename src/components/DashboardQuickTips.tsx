import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Lightbulb, 
  Sparkles, 
  ChevronRight, 
  ChevronLeft, 
  RefreshCw, 
  Utensils, 
  Flame, 
  Droplets, 
  Scale, 
  Moon, 
  Plus, 
  CheckCircle2, 
  Clock, 
  X,
  ArrowRight
} from 'lucide-react';
import { UserProfile, IntakeLog } from '../types';
import { generateHistoryQuickTips, DashboardQuickTip, identifyMealType } from '../lib/quickTipsEngine';
import { generateQuickTipsInsight } from '../lib/gemini';
import { VoicePlayButton } from './VoicePlayButton';
import { playSfx, vibrate } from '../lib/sensory';

interface DashboardQuickTipsProps {
  profile: UserProfile | null;
  onNavigate: (tabId: string) => void;
  onLogIntake?: (log: IntakeLog) => void;
}

export function DashboardQuickTips({ profile, onNavigate, onLogIntake }: DashboardQuickTipsProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [aiEnrichment, setAiEnrichment] = useState<{
    title?: string;
    suggestion?: string;
    details?: string;
    actionLabel?: string;
  } | null>(null);

  // Estado para abrir o painel de registro rápido DIRETAMENTE NA FRENTE desta aba
  const [isQuickLogOpen, setIsQuickLogOpen] = useState(false);
  const [selectedMealType, setSelectedMealType] = useState<'lunch' | 'dinner' | 'breakfast'>('lunch');
  const [customMealName, setCustomMealName] = useState('');
  const [customMealCalories, setCustomMealCalories] = useState('450');
  const cardContainerRef = useRef<HTMLDivElement>(null);

  // Gera dicas locais instantâneas a partir do histórico
  const localTips = useMemo(() => {
    return generateHistoryQuickTips(profile);
  }, [profile?.intakeLogs, profile?.goals, profile?.weight, profile?.targetWeight, profile?.hydrationLogs]);

  // Se houver enriquecimento por IA, sobrepõe na primeira dica
  const currentTips = useMemo(() => {
    if (!localTips.length) return [];
    if (!aiEnrichment) return localTips;

    const enriched = [...localTips];
    if (enriched[0]) {
      enriched[0] = {
        ...enriched[0],
        title: aiEnrichment.title || enriched[0].title,
        suggestion: aiEnrichment.suggestion || enriched[0].suggestion,
        details: aiEnrichment.details || enriched[0].details,
        actionLabel: aiEnrichment.actionLabel || enriched[0].actionLabel,
      };
    }
    return enriched;
  }, [localTips, aiEnrichment]);

  const activeTip: DashboardQuickTip | undefined = currentTips[currentIndex] || currentTips[0];

  // Identifica o status das refeições de hoje
  const todayMealsStatus = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const todayLogs = (profile?.intakeLogs || []).filter(l => {
      if (!l || !l.date) return false;
      return l.date.startsWith(todayStr) || new Date(l.date).toDateString() === new Date().toDateString();
    });

    const hasBreakfast = todayLogs.some(l => identifyMealType(l) === 'breakfast');
    const lunchLog = todayLogs.find(l => identifyMealType(l) === 'lunch');
    const dinnerLog = todayLogs.find(l => identifyMealType(l) === 'dinner');

    return {
      breakfast: hasBreakfast,
      lunch: !!lunchLog,
      lunchName: lunchLog?.recipeName,
      lunchCalories: lunchLog?.actual?.calories || lunchLog?.planned?.calories,
      dinner: !!dinnerLog,
      dinnerName: dinnerLog?.recipeName,
      totalMeals: todayLogs.length
    };
  }, [profile?.intakeLogs]);

  // Abre o painel de registro rápido na frente desta aba
  const openQuickLog = (mealType: 'lunch' | 'dinner' | 'breakfast' = 'lunch') => {
    playSfx('tap');
    vibrate(12);
    setSelectedMealType(mealType);
    if (mealType === 'breakfast') setCustomMealCalories('320');
    else if (mealType === 'dinner') setCustomMealCalories('280');
    else setCustomMealCalories('450');
    setIsQuickLogOpen(true);
    // Garante que o card esteja visível na frente dos olhos do usuário
    cardContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  // Atualização com Gemini AI
  const handleRefresh = async () => {
    playSfx('tap');
    vibrate(20);
    setIsRefreshing(true);

    try {
      if (profile) {
        const result = await generateQuickTipsInsight(profile, profile.intakeLogs || []);
        if (result && result.suggestion) {
          setAiEnrichment(result);
          playSfx('crystal');
        }
      }
    } catch (err) {
      console.warn('Erro ao obter dica enriquecida:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleNext = () => {
    playSfx('tap');
    setCurrentIndex((prev) => (prev + 1) % currentTips.length);
  };

  const handlePrev = () => {
    playSfx('tap');
    setCurrentIndex((prev) => (prev - 1 + currentTips.length) % currentTips.length);
  };

  // Registrar refeição rápida (ex: almoço rápido para alimentar o histórico)
  const handlePerformQuickLog = (mealName: string, calories: number, mealType: 'lunch' | 'dinner' | 'breakfast' = 'lunch') => {
    if (!onLogIntake) return;
    playSfx('success');
    vibrate(40);

    const log: IntakeLog = {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      mealId: `quick-${mealType}-${Date.now()}`,
      recipeName: mealName,
      mealType,
      planned: {
        calories,
        protein: Math.round((calories * 0.3) / 4),
        carbs: Math.round((calories * 0.4) / 4),
        fat: Math.round((calories * 0.3) / 9),
        fiber: 5,
        sugar: 2
      },
      actual: {
        calories,
        protein: Math.round((calories * 0.3) / 4),
        carbs: Math.round((calories * 0.4) / 4),
        fat: Math.round((calories * 0.3) / 9),
        fiber: 5,
        sugar: 2
      },
      adjusted: false
    };

    onLogIntake(log);
    setIsQuickLogOpen(false);
    setCustomMealName('');
    // Força ir para a primeira dica de adaptação
    setCurrentIndex(0);
  };

  // Opções rápidas de 1 toque de acordo com a refeição selecionada
  const mealQuickOptions = useMemo(() => {
    if (selectedMealType === 'breakfast') {
      return [
        { name: 'Ovos Mexidos com Pão Integral e Café', calories: 320, desc: 'Proteína e energia matinal limpa', icon: '🍳' },
        { name: 'Iogurte com Granola, Frutas e Chia', calories: 290, desc: 'Probióticos e saciedade duradoura', icon: '🥣' },
        { name: 'Panqueca de Aveia, Banana e Canela', calories: 310, desc: 'Carboidrato complexo sem picos', icon: '🥞' },
      ];
    }
    if (selectedMealType === 'dinner') {
      return [
        { name: 'Sopa Funcional de Abóbora com Frango', calories: 280, desc: 'Digestão leve e conforto noturno', icon: '🍲' },
        { name: 'Omelete de Claras com Espinafre e Ricota', calories: 240, desc: 'Proteína pura e sem peso gástrico', icon: '🍳' },
        { name: 'Salmão com Brócolis e Cenoura ao Vapor', calories: 350, desc: 'Ômega-3 protetor e micronutrientes', icon: '🐟' },
      ];
    }
    // lunch (default)
    return [
      { name: 'Salada Caesar com Frango Grelhado', calories: 420, desc: 'Proteína magra + folhas verdes', icon: '🥗' },
      { name: 'Bowl de Quinoa, Ovos e Legumes', calories: 480, desc: 'Fibras lentas e minerais', icon: '🥣' },
      { name: 'Peixe com Purê de Mandioquinha e Brócolis', calories: 390, desc: 'Digestão rápida e ômega-3', icon: '🐟' },
    ];
  }, [selectedMealType]);

  const customPlaceholder = useMemo(() => {
    if (selectedMealType === 'breakfast') return 'Ex: Tapioca com ovos e suco verde';
    if (selectedMealType === 'dinner') return 'Ex: Sopa de legumes ou salada com frango';
    return 'Ex: Arroz integral, feijão e frango assado';
  }, [selectedMealType]);

  const getTipIcon = (iconType: string) => {
    switch (iconType) {
      case 'flame':
        return <Flame className="w-5 h-5 text-orange-500" />;
      case 'droplet':
        return <Droplets className="w-5 h-5 text-blue-500" />;
      case 'moon':
        return <Moon className="w-5 h-5 text-indigo-400" />;
      case 'scale':
        return <Scale className="w-5 h-5 text-purple-400" />;
      case 'sparkles':
        return <Sparkles className="w-5 h-5 text-amber-400" />;
      case 'utensils':
      default:
        return <Utensils className="w-5 h-5 text-emerald-500" />;
    }
  };

  if (!activeTip) return null;

  return (
    <div 
      ref={cardContainerRef}
      id="dashboard-quick-tips-card"
      className="relative rounded-[32px] overflow-hidden bg-gradient-to-br from-white via-slate-50 to-emerald-50/20 dark:from-[#151B23] dark:via-[#18212B] dark:to-[#0F161E] border border-slate-200/80 dark:border-[#243040] p-5 sm:p-7 shadow-lg shadow-emerald-500/5 transition-all duration-300"
    >
      {/* Luz ambiente sutil */}
      <div className="absolute top-0 right-1/4 w-72 h-36 bg-emerald-500/10 dark:bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-48 h-48 bg-orange-500/10 dark:bg-orange-500/5 rounded-full blur-2xl pointer-events-none" />

      {/* Header exatamente alinhado ao print com indicador de histórico, voz e controles */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-sm">
            <Lightbulb className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-display font-black text-base sm:text-lg text-slate-900 dark:text-white tracking-tight">
                Dicas Rápidas do Dia
              </h3>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-wider border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                Histórico Conectado
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-[#B5BDC9]">
              Recomendações adaptadas aos seus registros e objetivo
            </p>
          </div>
        </div>

        {/* Controles do topo: Voz Malu, Atualização e Navegação */}
        <div className="flex items-center gap-2">
          {/* Botão de voz usando voz Aoede da Malu */}
          <VoicePlayButton 
            text={`${activeTip.suggestion} ${activeTip.details}`}
            size="sm"
          />

          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            title="Atualizar dica com IA"
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#1C2532] dark:hover:bg-[#253243] text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-emerald-500' : ''}`} />
          </button>

          {currentTips.length > 1 && (
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#1C2532] rounded-xl p-0.5">
              <button
                onClick={handlePrev}
                className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-[#253243] text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                title="Dica anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 px-1">
                {currentIndex + 1}/{currentTips.length}
              </span>
              <button
                onClick={handleNext}
                className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-[#253243] text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                title="Próxima dica"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Barra de Status das Refeições de Hoje (Contexto Visual Imediato e Seleção Rápida de Refeição) */}
      <div className="relative z-10 grid grid-cols-3 gap-2 p-2.5 rounded-2xl bg-white/60 dark:bg-[#10161D]/80 border border-slate-200/60 dark:border-[#202B38] mb-5 text-xs backdrop-blur-sm">
        
        {/* Café */}
        <button
          type="button"
          onClick={() => openQuickLog('breakfast')}
          className={`flex items-center gap-2 px-2.5 py-2 rounded-xl text-left transition-all cursor-pointer ${
            todayMealsStatus.breakfast 
              ? 'bg-emerald-500/10 border border-emerald-500/20' 
              : 'bg-slate-50/50 dark:bg-white/[0.02] hover:bg-slate-100 dark:hover:bg-white/[0.05]'
          }`}
          title="Clique para registrar ou revisar o Café da Manhã"
        >
          <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${todayMealsStatus.breakfast ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`} />
          <div className="truncate flex-1">
            <span className="font-semibold text-slate-700 dark:text-slate-300 block text-[11px]">Café da Manhã</span>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate block">
              {todayMealsStatus.breakfast ? 'Registrado ✓' : 'Não registrado'}
            </span>
          </div>
        </button>

        {/* Almoço */}
        <button
          type="button"
          onClick={() => openQuickLog('lunch')}
          className={`flex items-center gap-2 px-2.5 py-2 rounded-xl text-left transition-all cursor-pointer ${
            todayMealsStatus.lunch 
              ? 'bg-emerald-500/10 border border-emerald-500/20' 
              : 'bg-orange-500/10 border border-orange-500/30 hover:bg-orange-500/20 shadow-sm'
          }`}
          title="Clique para abrir e registrar o Almoço na frente"
        >
          <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${todayMealsStatus.lunch ? 'bg-emerald-500' : 'bg-orange-400 animate-pulse'}`} />
          <div className="truncate flex-1">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-700 dark:text-slate-300 block text-[11px]">Almoço</span>
              {todayMealsStatus.lunch && (
                <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400">
                  {todayMealsStatus.lunchCalories ? `${todayMealsStatus.lunchCalories} kcal` : '✓'}
                </span>
              )}
            </div>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate block">
              {todayMealsStatus.lunch 
                ? (todayMealsStatus.lunchName || 'Registrado ✓')
                : 'Pendente hoje'}
            </span>
          </div>
        </button>

        {/* Jantar */}
        <button
          type="button"
          onClick={() => openQuickLog('dinner')}
          className={`flex items-center gap-2 px-2.5 py-2 rounded-xl text-left transition-all cursor-pointer ${
            todayMealsStatus.dinner 
              ? 'bg-emerald-500/10 border border-emerald-500/20' 
              : 'bg-slate-50/50 dark:bg-white/[0.02] hover:bg-slate-100 dark:hover:bg-white/[0.05]'
          }`}
          title="Clique para registrar ou revisar o Jantar"
        >
          <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${todayMealsStatus.dinner ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`} />
          <div className="truncate flex-1">
            <span className="font-semibold text-slate-700 dark:text-slate-300 block text-[11px]">Jantar</span>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate block">
              {todayMealsStatus.dinner 
                ? (todayMealsStatus.dinnerName || 'Registrado ✓')
                : 'Sugerido: Leve 🥗'}
            </span>
          </div>
        </button>

      </div>

      {/* Conteúdo: Dica Ativa (Exatamente como no print do usuário) */}
      <div className="relative z-10 space-y-4">
        {/* Tag e Título */}
        <div className="flex items-center gap-2">
          <span className={`px-2.5 py-0.5 rounded-full border text-[11px] font-bold uppercase tracking-wider ${activeTip.badgeColor}`}>
            {activeTip.tag}
          </span>
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            {getTipIcon(activeTip.iconType)}
            {activeTip.title}
          </span>
        </div>

        {/* Dica Principal em Destaque */}
        <div className="p-4 sm:p-5 rounded-2xl bg-emerald-500/5 dark:bg-emerald-500/[0.06] border border-emerald-500/20 dark:border-emerald-500/30">
          <p className="text-base sm:text-lg font-display font-bold text-slate-900 dark:text-white leading-snug">
            "{activeTip.suggestion}"
          </p>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-[#C5CDD9] mt-2.5 leading-relaxed">
            {activeTip.details}
          </p>
        </div>

        {/* Botões de Ação */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex flex-wrap items-center gap-2">
            {activeTip.actionLabel && activeTip.actionTab && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  playSfx('tap');
                  vibrate(15);
                  onNavigate(activeTip.actionTab!);
                }}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-display font-bold text-xs sm:text-sm flex items-center gap-2 shadow-md shadow-emerald-500/20 hover:opacity-95 transition-all cursor-pointer"
              >
                <span>{activeTip.actionLabel}</span>
                <ArrowRight className="w-4 h-4" />
              </motion.button>
            )}

            {/* Botão de Registro Rápido de Almoço (Abre na frente desta aba) */}
            {!todayMealsStatus.lunch && onLogIntake && (
              <button
                onClick={() => openQuickLog('lunch')}
                className="px-4 py-2.5 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 text-orange-600 dark:text-orange-400 font-semibold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                title="Abre o registro diretamente na frente desta aba"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Registrar Almoço Rápido</span>
              </button>
            )}

            {todayMealsStatus.lunch && !todayMealsStatus.dinner && onLogIntake && (
              <button
                onClick={() => openQuickLog('dinner')}
                className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#1E2836] dark:hover:bg-[#283648] text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-emerald-500" />
                <span>Registrar Jantar Leve</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-1">
            {currentTips.map((_, idx) => (
              <button
                key={idx}
                onClick={() => {
                  playSfx('tap');
                  setCurrentIndex(idx);
                }}
                aria-label={`Ir para dica ${idx + 1}`}
                className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                  currentIndex === idx 
                    ? 'w-6 bg-emerald-500' 
                    : 'w-2 bg-slate-300 dark:bg-slate-700 hover:bg-slate-400'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* PAINEL QUE ABRE DIRETAMENTE NA FRENTE DESTA ABA DO PRINT (FADE-IN-UP SUAVEMENTE SOBREPOSTO) */}
      <AnimatePresence>
        {isQuickLogOpen && (
          <motion.div
            initial={{ opacity: 0, y: 32, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
            className="absolute inset-0 z-30 rounded-[32px] bg-white/98 dark:bg-[#151B23]/98 backdrop-blur-xl p-5 sm:p-6 flex flex-col justify-between overflow-y-auto border-2 border-orange-500/40 shadow-2xl shadow-orange-500/20 animate-fade-in-up"
          >
            <div className="space-y-4">
              {/* Header do painel frontal */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-[#243040]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-orange-500/10 text-orange-500 border border-orange-500/20 flex items-center justify-center shadow-sm">
                    <Utensils className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-display font-black text-slate-900 dark:text-white text-base sm:text-lg">
                        {selectedMealType === 'breakfast' 
                          ? 'Registrar Café da Manhã' 
                          : selectedMealType === 'dinner' 
                          ? 'Registrar Jantar' 
                          : 'Registrar Almoço'}
                      </h4>
                      <span className="px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400 text-[10px] font-bold uppercase tracking-wider border border-orange-500/20">
                        Registro Rápido
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-[#B5BDC9]">
                      Alimenta o histórico para sugestões adaptativas da IA
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    playSfx('tap');
                    setIsQuickLogOpen(false);
                  }}
                  className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-[#1E2836] text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
                  title="Fechar e voltar à dica"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Seletor rápido de tipo de refeição dentro do painel */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    playSfx('tap');
                    setSelectedMealType('breakfast');
                    setCustomMealCalories('320');
                  }}
                  className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all text-center cursor-pointer ${
                    selectedMealType === 'breakfast'
                      ? 'bg-emerald-500 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-[#1C2532] text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-[#253243]'
                  }`}
                >
                  Café da Manhã
                </button>
                <button
                  type="button"
                  onClick={() => {
                    playSfx('tap');
                    setSelectedMealType('lunch');
                    setCustomMealCalories('450');
                  }}
                  className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all text-center cursor-pointer ${
                    selectedMealType === 'lunch'
                      ? 'bg-orange-500 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-[#1C2532] text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-[#253243]'
                  }`}
                >
                  Almoço
                </button>
                <button
                  type="button"
                  onClick={() => {
                    playSfx('tap');
                    setSelectedMealType('dinner');
                    setCustomMealCalories('280');
                  }}
                  className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all text-center cursor-pointer ${
                    selectedMealType === 'dinner'
                      ? 'bg-indigo-500 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-[#1C2532] text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-[#253243]'
                  }`}
                >
                  Jantar
                </button>
              </div>

              {/* Opções de 1 Toque */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-slate-400 dark:text-[#B5BDC9] uppercase tracking-wider block">
                  Escolha rápida em 1 toque:
                </span>
                <div className="grid grid-cols-1 gap-2">
                  {mealQuickOptions.map((opt, idx) => (
                    <button
                      key={idx}
                      onClick={() => handlePerformQuickLog(opt.name, opt.calories, selectedMealType)}
                      className="w-full text-left p-3 rounded-2xl bg-slate-50/90 hover:bg-emerald-50/70 dark:bg-[#1C2532] dark:hover:bg-[#223040] border border-slate-200/80 dark:border-[#263547] hover:border-emerald-500/50 transition-all flex items-center justify-between group cursor-pointer"
                    >
                      <div>
                        <div className="font-bold text-xs text-slate-800 dark:text-slate-100 group-hover:text-emerald-500 flex items-center gap-1.5">
                          <span className="text-sm">{opt.icon}</span>
                          <span>{opt.name}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          {opt.desc}
                        </div>
                      </div>
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg shrink-0 ml-2 border border-emerald-500/20">
                        {opt.calories} kcal
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Ou digite seu prato */}
              <div className="pt-2 border-t border-slate-200/80 dark:border-[#263547] space-y-2.5">
                <span className="text-[11px] font-bold text-slate-400 dark:text-[#B5BDC9] uppercase tracking-wider block">
                  Ou digite seu prato:
                </span>
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder={customPlaceholder}
                    value={customMealName}
                    onChange={(e) => setCustomMealName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#10151D] border border-slate-200 dark:border-[#263547] text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:border-orange-500 transition-colors"
                  />
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <input
                        type="number"
                        placeholder="Calorias estimadas (ex: 450)"
                        value={customMealCalories}
                        onChange={(e) => setCustomMealCalories(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#10151D] border border-slate-200 dark:border-[#263547] text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:border-orange-500 transition-colors"
                      />
                    </div>
                    <button
                      disabled={!customMealName.trim()}
                      onClick={() => {
                        if (customMealName.trim()) {
                          handlePerformQuickLog(
                            customMealName.trim(), 
                            parseInt(customMealCalories, 10) || 450, 
                            selectedMealType
                          );
                        }
                      }}
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 disabled:opacity-50 text-white font-bold text-xs transition-all cursor-pointer shrink-0 shadow-md shadow-orange-500/20"
                    >
                      Salvar {selectedMealType === 'breakfast' ? 'Café' : selectedMealType === 'dinner' ? 'Jantar' : 'Almoço'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Rodapé do painel */}
            <div className="pt-3 mt-3 border-t border-slate-200/70 dark:border-[#243040] flex items-center justify-between text-xs text-slate-500">
              <span>Toque no X para fechar e voltar para as dicas</span>
              <button
                type="button"
                onClick={() => setIsQuickLogOpen(false)}
                className="font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white cursor-pointer"
              >
                Voltar à dica
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
