import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { 
  Sparkles, 
  TrendingDown, 
  AlertTriangle, 
  AlertCircle,
  CheckCircle2, 
  ArrowRight, 
  RotateCcw, 
  DollarSign, 
  Sliders, 
  Store, 
  Volume2, 
  VolumeX, 
  ShieldCheck, 
  Zap, 
  ChevronDown, 
  ChevronUp, 
  Check, 
  Info,
  Layers,
  ArrowDownRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { BudgetMonitoringAnalysis, SmartBudgetSubstitution } from '../types';
import { analyzeShoppingListBudget, applySmartSubstitution } from '../lib/priceMonitor';
import { analyzeBudgetAndSubstitutions } from '../lib/gemini';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { speak, stopSpeech } from '../lib/speech';
import { playSfx, vibrate } from '../lib/sensory';

interface BudgetPriceMonitorProps {
  items: { name: string; checked: boolean; isCustom?: boolean }[];
  budgetLimit?: number;
  onBudgetLimitChange?: (val: number) => void;
  onApplySubstitution?: (substitution: SmartBudgetSubstitution) => void;
  onApplyAllSubstitutions?: (substitutions: SmartBudgetSubstitution[]) => void;
  onUndoSubstitution?: (substitution: SmartBudgetSubstitution) => void;
  appliedSubstitutions?: SmartBudgetSubstitution[];
  onUpdateItems?: (newItems: { name: string; checked: boolean; isCustom?: boolean }[]) => void;
  userLocationName?: string;
}

const BUDGET_PRESETS = [80, 120, 150, 200, 300];

export function BudgetPriceMonitor({ 
  items, 
  budgetLimit: controlledBudgetLimit,
  onBudgetLimitChange,
  onApplySubstitution,
  onApplyAllSubstitutions,
  onUndoSubstitution,
  appliedSubstitutions: controlledAppliedSubs,
  onUpdateItems, 
  userLocationName = 'São Paulo, SP' 
}: BudgetPriceMonitorProps) {
  const [internalBudgetLimit, setInternalBudgetLimit] = useLocalStorage<number>('nutri-budget-limit', 150);
  const budgetLimit = controlledBudgetLimit !== undefined ? controlledBudgetLimit : internalBudgetLimit;
  const setBudgetLimit = (val: number) => {
    if (onBudgetLimitChange) onBudgetLimitChange(val);
    setInternalBudgetLimit(val);
  };

  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [internalAppliedSubs, setInternalAppliedSubs] = useLocalStorage<SmartBudgetSubstitution[]>('nutri-applied-substitutions', []);
  const appliedSubstitutions = controlledAppliedSubs !== undefined ? controlledAppliedSubs : internalAppliedSubs;

  const [isExpanded, setIsExpanded] = useState(true);
  const [aiAnalysisResult, setAiAnalysisResult] = useState<BudgetMonitoringAnalysis | null>(null);

  // Computa a análise determinística em tempo real sempre que os itens ou o limite mudam
  const localAnalysis = useMemo(() => {
    return analyzeShoppingListBudget(items, budgetLimit);
  }, [items, budgetLimit]);

  // Se houver resultado recente da IA Gemini usamos ele, senão o localAnalysis
  const activeAnalysis = aiAnalysisResult || localAnalysis;

  // Atualiza resultado da IA se itens ou orçamento mudarem bruscamente
  useEffect(() => {
    if (aiAnalysisResult) {
      setAiAnalysisResult(null); // invalida para recalcular
    }
  }, [budgetLimit, items.length]);

  // Função para acionar a análise aprofundada com Gemini
  const handleRunAiAnalysis = async () => {
    if (items.length === 0) return;
    vibrate(15);
    playSfx('crystal');
    setIsAiLoading(true);

    try {
      const result = await analyzeBudgetAndSubstitutions(items, budgetLimit, userLocationName);
      if (result) {
        setAiAnalysisResult(result);
        vibrate(25);
        playSfx('success');
      }
    } catch (err) {
      console.warn("Erro na análise IA de orçamento:", err);
    } finally {
      setIsAiLoading(false);
    }
  };

  // Reproduz o resumo por voz da Chef Malu (Aoede)
  const handleToggleVoiceSummary = async () => {
    if (isSpeaking) {
      stopSpeech();
      setIsSpeaking(false);
      return;
    }

    vibrate(10);
    setIsSpeaking(true);
    await speak(activeAnalysis.voiceSummary, {
      onEnded: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false)
    });
  };

  // Aplica uma substituição individual
  const handleApplySingleSubstitution = (substitution: SmartBudgetSubstitution) => {
    vibrate(20);
    playSfx('crystal');

    if (onApplySubstitution) {
      onApplySubstitution(substitution);
    } else if (onUpdateItems) {
      const updated = applySmartSubstitution(items, substitution);
      onUpdateItems(updated);
    }

    if (!controlledAppliedSubs) {
      setInternalAppliedSubs(prev => {
        if (!prev.some(s => s.id === substitution.id || s.originalItem.toLowerCase() === substitution.originalItem.toLowerCase())) {
          return [...prev, substitution];
        }
        return prev;
      });
    }
  };

  // Aplica todas as substituições disponíveis de uma só vez
  const handleApplyAllSubstitutions = () => {
    if (activeAnalysis.substitutions.length === 0) return;
    vibrate(35);
    playSfx('success');

    if (onApplyAllSubstitutions) {
      onApplyAllSubstitutions(activeAnalysis.substitutions);
    } else if (onApplySubstitution) {
      activeAnalysis.substitutions.forEach(s => onApplySubstitution(s));
    } else if (onUpdateItems) {
      let updated = [...items];
      activeAnalysis.substitutions.forEach(sub => {
        updated = applySmartSubstitution(updated, sub);
      });
      onUpdateItems(updated);
    }

    if (!controlledAppliedSubs) {
      setInternalAppliedSubs(prev => [...prev, ...activeAnalysis.substitutions]);
    }
  };

  // Reverte uma substituição aplicada
  const handleUndoSubstitution = (substitution: SmartBudgetSubstitution) => {
    vibrate(15);
    playSfx('scratch');

    if (onUndoSubstitution) {
      onUndoSubstitution(substitution);
    } else if (onUpdateItems) {
      const reverted = items.map(item => {
        if (item.name.toLowerCase() === substitution.substituteItem.toLowerCase()) {
          return {
            ...item,
            name: substitution.originalItem,
            checked: false
          };
        }
        return item;
      });
      onUpdateItems(reverted);
    }

    if (!controlledAppliedSubs) {
      setInternalAppliedSubs(prev => prev.filter(s => s.id !== substitution.id));
    }
  };

  // Progresso do orçamento com cores contextuais
  const percentUsed = Math.min(100, activeAnalysis.budgetUsedPercentage);
  const isOverBudget = activeAnalysis.isExceeded;
  const isNearLimit = activeAnalysis.isNearLimit;

  const statusColor = isOverBudget
    ? 'text-rose-500 bg-rose-500/10 border-rose-200 dark:border-rose-900/60'
    : isNearLimit
    ? 'text-amber-500 bg-amber-500/10 border-amber-200 dark:border-amber-900/60'
    : 'text-emerald-500 bg-emerald-500/10 border-emerald-200 dark:border-emerald-900/60';

  const progressBarColor = isOverBudget
    ? 'bg-rose-500'
    : isNearLimit
    ? 'bg-amber-500'
    : 'bg-emerald-500';

  if (items.length === 0) return null;

  return (
    <div className="bg-white dark:bg-slate-900/80 rounded-[32px] border border-slate-200/80 dark:border-slate-800/80 shadow-md p-6 sm:p-8 space-y-6 transition-all">
      
      {/* Header & Status Indicator */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800/80 pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
              <Sparkles className="w-4 h-4" />
            </span>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Monitor de Preços & IA Economizadora
            </span>
          </div>
          <h3 className="text-xl md:text-2xl font-serif font-black text-slate-800 dark:text-white flex items-center gap-2">
            Orçamento & Ofertas de Parceiros
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium max-w-xl">
            A IA compara continuamente seus ingredientes com tabelas de sacolões parceiros locais para manter sua nutrição no alvo pelo menor preço.
          </p>
        </div>

        {/* Quick Voice & AI Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleToggleVoiceSummary}
            className={`px-3.5 py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 outline-none ${
              isSpeaking
                ? 'bg-amber-100 border-amber-300 text-amber-700 dark:bg-amber-950/40 animate-pulse'
                : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-emerald-600'
            }`}
            title="Ouvir análise por voz com a Chef Malu"
          >
            {isSpeaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-emerald-500" />}
            <span className="hidden sm:inline">{isSpeaking ? 'Pausar Voz' : 'Ouvir Malu'}</span>
          </button>

          <button
            type="button"
            onClick={handleRunAiAnalysis}
            disabled={isAiLoading}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white font-bold text-xs transition-all shadow-sm shadow-emerald-500/20 flex items-center gap-1.5 cursor-pointer outline-none border-none"
          >
            <Zap className={`w-3.5 h-3.5 text-amber-300 ${isAiLoading ? 'animate-spin' : ''}`} />
            <span>{isAiLoading ? 'Analisando...' : 'Otimizar com IA'}</span>
          </button>
        </div>
      </div>

      {/* Budget Limit Configurator & Gauge Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        
        {/* Left Column: Progress Meter */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-baseline justify-between gap-2">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">
                Consumo do Orçamento
              </span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-2xl font-mono font-black text-slate-900 dark:text-white">
                  R$ {activeAnalysis.currentTotal.toFixed(2)}
                </span>
                <span className="text-xs font-semibold text-slate-400">
                  de R$ {budgetLimit.toFixed(2)}
                </span>
              </div>
            </div>

            <div className={`px-3 py-1 rounded-full border text-xs font-black uppercase tracking-wider flex items-center gap-1.5 ${statusColor}`}>
              {isOverBudget ? (
                <>
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Excedido ({activeAnalysis.budgetUsedPercentage}%)</span>
                </>
              ) : isNearLimit ? (
                <>
                  <AlertTriangle className="w-3.5 h-3.5 animate-bounce" />
                  <span>Atenção ({activeAnalysis.budgetUsedPercentage}%)</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Seguro ({activeAnalysis.budgetUsedPercentage}%)</span>
                </>
              )}
            </div>
          </div>

          {/* Bar track */}
          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-3.5 overflow-hidden p-0.5 border border-slate-200/50 dark:border-slate-700/50">
            <motion.div 
              className={`h-full rounded-full transition-all ${progressBarColor}`}
              initial={{ width: 0 }}
              animate={{ width: `${percentUsed}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            />
          </div>

          {/* Contextual Status Alert Message */}
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center justify-between">
            <span>{activeAnalysis.statusMessage}</span>
            {isOverBudget && (
              <span className="text-rose-500 font-bold ml-2 shrink-0">
                +R$ {(activeAnalysis.currentTotal - budgetLimit).toFixed(2)} acima da meta
              </span>
            )}
          </div>
        </div>

        {/* Right Column: Interactive Budget Setter */}
        <div className="lg:col-span-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 border border-slate-200/60 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-200">
              <Sliders className="w-3.5 h-3.5 text-emerald-500" />
              <span>Ajustar Teto de Gastos</span>
            </div>
            <span className="font-mono font-black text-sm text-emerald-600 dark:text-emerald-400">
              R$ {budgetLimit.toFixed(2)}
            </span>
          </div>

          {/* Preset Buttons */}
          <div className="flex flex-wrap gap-1.5">
            {BUDGET_PRESETS.map(val => (
              <button
                key={val}
                type="button"
                onClick={() => {
                  vibrate(5);
                  setBudgetLimit(val);
                }}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer border ${
                  budgetLimit === val
                    ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-emerald-500'
                }`}
              >
                R$ {val}
              </button>
            ))}
          </div>

          {/* Range Slider */}
          <div className="pt-1">
            <input
              type="range"
              min="50"
              max="400"
              step="5"
              value={budgetLimit}
              onChange={(e) => setBudgetLimit(Number(e.target.value))}
              className="w-full accent-emerald-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-0.5">
              <span>R$ 50</span>
              <span>R$ 200</span>
              <span>R$ 400</span>
            </div>
          </div>
        </div>

      </div>

      {/* Animated Budget Overrun Alert Banner */}
      <AnimatePresence>
        {isOverBudget && (
          <motion.div
            key="overbudget-alert"
            initial={{ opacity: 0, y: -12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 400, damping: 28 }}
            className="relative overflow-hidden bg-gradient-to-r from-rose-500/15 via-rose-500/10 to-amber-500/10 dark:from-rose-950/50 dark:to-slate-900 border-2 border-rose-300 dark:border-rose-800/80 rounded-2xl p-5 shadow-sm space-y-3"
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-rose-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-rose-500/30 animate-pulse">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-serif font-black text-rose-800 dark:text-rose-200 text-base leading-tight">
                      Alerta: Estouro de Orçamento Detectado!
                    </h4>
                    <span className="px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-900 text-rose-700 dark:text-rose-200 text-[10px] font-black uppercase tracking-wider">
                      +{activeAnalysis.budgetUsedPercentage - 100}% Excedente
                    </span>
                  </div>
                  <p className="text-xs text-rose-700/90 dark:text-rose-300 font-semibold mt-0.5">
                    O total atual (<strong>R$ {activeAnalysis.currentTotal.toFixed(2)}</strong>) ultrapassou seu teto em <strong className="font-mono text-rose-600 dark:text-rose-400">R$ {(activeAnalysis.currentTotal - budgetLimit).toFixed(2)}</strong>.
                  </p>
                </div>
              </div>

              {activeAnalysis.substitutions.length > 0 && (
                <button
                  type="button"
                  onClick={handleApplyAllSubstitutions}
                  className="w-full sm:w-auto px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs transition-all shadow-md shadow-rose-600/30 flex items-center justify-center gap-2 cursor-pointer outline-none border-none shrink-0"
                >
                  <Zap className="w-4 h-4 text-amber-300" />
                  <span>Enquadrar no Orçamento (-R$ {activeAnalysis.totalPotentialSavings.toFixed(2)})</span>
                </button>
              )}
            </div>

            <div className="text-[11px] text-slate-600 dark:text-slate-300 font-medium bg-white/70 dark:bg-slate-900/60 p-2.5 rounded-xl border border-rose-100 dark:border-rose-950 flex items-center gap-2">
              <Info className="w-4 h-4 text-rose-500 shrink-0" />
              <span>
                {activeAnalysis.substitutions.length > 0 
                  ? `Dica da Chef Malu: Aplicando as ${activeAnalysis.substitutions.length} trocas sugeridas abaixo, sua compra cairá para R$ ${activeAnalysis.projectedTotalAfterSubstitutions.toFixed(2)}, recuperando o equilíbrio sem perder nutrientes!`
                  : 'Dica: Aumente o teto com o controle deslizante ou remova itens não essenciais para manter o orçamento.'}
              </span>
            </div>
          </motion.div>
        )}

        {!isOverBudget && isNearLimit && (
          <motion.div
            key="near-limit-alert"
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 400, damping: 28 }}
            className="bg-amber-500/10 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800/80 rounded-2xl p-4 flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                <AlertCircle className="w-5 h-5 animate-bounce" />
              </div>
              <div>
                <h5 className="font-bold text-slate-900 dark:text-white text-xs">
                  Atenção: {activeAnalysis.budgetUsedPercentage}% do Orçamento Utilizado
                </h5>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  Resta uma margem de apenas <strong className="font-mono text-amber-600 dark:text-amber-400">R$ {(budgetLimit - activeAnalysis.currentTotal).toFixed(2)}</strong> antes de ultrapassar seu limite.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Proactive Savings Header Banner if substitutions exist */}
      <AnimatePresence>
        {activeAnalysis.substitutions.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -8 }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            className="bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-emerald-500/5 dark:from-emerald-950/40 dark:to-slate-900 border border-emerald-300/60 dark:border-emerald-700/50 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                <TrendingDown className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                    {activeAnalysis.substitutions.length} {activeAnalysis.substitutions.length === 1 ? 'Substituição Econômica Encontrada' : 'Substituições Econômicas Encontradas'}
                  </h4>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] font-black uppercase">
                    Parceiros Locais
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                  Economia potencial total de <strong className="text-emerald-600 dark:text-emerald-400 font-mono font-black">R$ {activeAnalysis.totalPotentialSavings.toFixed(2)}</strong> na compra. Novo total projetado: <strong className="font-mono text-slate-800 dark:text-slate-200">R$ {activeAnalysis.projectedTotalAfterSubstitutions.toFixed(2)}</strong>.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={handleApplyAllSubstitutions}
                className="w-full sm:w-auto px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs transition-all shadow-md shadow-emerald-600/20 flex items-center justify-center gap-1.5 cursor-pointer outline-none border-none shrink-0"
              >
                <Check className="w-4 h-4" />
                <span>Aplicar Todas as Trocas</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Suggested Substitutions List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-serif text-base font-black text-slate-800 dark:text-white flex items-center gap-2">
            <span>Trocas Inteligentes Recomendadas pela IA</span>
            <span className="text-xs font-mono font-bold text-slate-400">
              ({activeAnalysis.substitutions.length})
            </span>
          </h4>

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 flex items-center gap-1 cursor-pointer outline-none bg-transparent border-none"
          >
            {isExpanded ? 'Recolher' : 'Expandir'}
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {isExpanded && (
          <AnimatePresence>
            {activeAnalysis.substitutions.length === 0 ? (
              <div className="text-center py-8 px-4 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-800/30">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Nenhum ingrediente com custo desproporcional detectado!
                </p>
                <p className="text-[11px] text-slate-400 max-w-md mx-auto mt-1">
                  Sua lista atual já está equilibrada com boas ofertas locais. Você pode ajustar o teto de gastos ou adicionar novos itens no plano alimentar.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeAnalysis.substitutions.map((sub) => {
                  const isItemInCurrentList = items.some(i => i.name.toLowerCase() === sub.originalItem.toLowerCase());
                  const isAlreadyReplaced = items.some(i => i.name.toLowerCase() === sub.substituteItem.toLowerCase());

                  return (
                    <motion.div
                      key={sub.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4 relative overflow-hidden"
                    >
                      {/* Store partner badge */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] font-bold text-slate-700 dark:text-slate-300">
                          <span>{sub.storeLogo || '🏪'}</span>
                          <span className="truncate">{sub.storeName}</span>
                        </div>

                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] font-black uppercase">
                          <ArrowDownRight className="w-3 h-3" />
                          Economia: R$ {sub.potentialSavings.toFixed(2)} (-{sub.savingsPercentage}%)
                        </span>
                      </div>

                      {/* Swap Details: Original vs Substitute */}
                      <div className="grid grid-cols-11 items-center gap-2 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                        {/* Original Item */}
                        <div className="col-span-5 leading-tight">
                          <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">
                            Original na Lista
                          </span>
                          <span className="font-bold text-xs text-slate-700 dark:text-slate-300 line-through truncate block">
                            {sub.originalItem}
                          </span>
                          <span className="text-xs font-mono text-slate-400 font-semibold block">
                            ~R$ {sub.originalPrice.toFixed(2)}
                          </span>
                        </div>

                        {/* Arrow */}
                        <div className="col-span-1 flex justify-center text-slate-400">
                          <ArrowRight className="w-4 h-4 text-emerald-500" />
                        </div>

                        {/* Substitute Item */}
                        <div className="col-span-5 leading-tight text-right">
                          <span className="text-[9px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
                            Substituto Parceiro
                          </span>
                          <span className="font-bold text-xs text-slate-900 dark:text-white truncate block">
                            {sub.substituteItem}
                          </span>
                          <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 font-black block">
                            R$ {sub.substitutePrice.toFixed(2)}
                          </span>
                        </div>
                      </div>

                      {/* Nutritional & Culinary Reasoning */}
                      <div className="space-y-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                        <div className="flex items-start gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                          <p className="leading-snug">
                            <strong className="text-slate-700 dark:text-slate-200">Nutrição:</strong> {sub.nutritionalEquivalence}
                          </p>
                        </div>
                        {sub.culinaryAdvice && (
                          <div className="flex items-start gap-1.5">
                            <Info className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                            <p className="leading-snug italic">
                              {sub.culinaryAdvice}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Action Button */}
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <span className="text-[10px] text-slate-400 font-medium">
                          {isAlreadyReplaced ? 'Substituição já aplicada' : 'Manter mesmo valor nutricional'}
                        </span>

                        <button
                          type="button"
                          onClick={() => handleApplySingleSubstitution(sub)}
                          disabled={!isItemInCurrentList}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 outline-none border-none ${
                            isItemInCurrentList
                              ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                              : 'bg-slate-100 text-slate-400 dark:bg-slate-800'
                          }`}
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>{isItemInCurrentList ? 'Aplicar Substituição' : 'Já Aplicado'}</span>
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </AnimatePresence>
        )}
      </div>

      {/* Applied Substitutions History with Undo Action */}
      {appliedSubstitutions.length > 0 && (
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 space-y-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">
            Substituições Aplicadas Nesta Sessão
          </span>
          <div className="flex flex-wrap gap-2">
            {appliedSubstitutions.map((applied) => (
              <div
                key={applied.id}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                <span className="text-slate-400 line-through text-[11px]">{applied.originalItem}</span>
                <ArrowRight className="w-3 h-3 text-emerald-500" />
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">{applied.substituteItem}</span>
                <span className="text-[10px] font-mono text-slate-400">(-R$ {applied.potentialSavings.toFixed(2)})</span>
                <button
                  type="button"
                  onClick={() => handleUndoSubstitution(applied)}
                  className="ml-1 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer bg-transparent border-none p-0.5"
                  title="Desfazer e voltar ao ingrediente original"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
