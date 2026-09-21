import React, { useState, useMemo } from 'react';
import { 
  History, 
  AlertCircle, 
  CheckCircle2, 
  Plus, 
  Check, 
  DollarSign, 
  Sparkles, 
  Volume2, 
  VolumeX, 
  TrendingDown, 
  Clock, 
  Layers, 
  ShieldCheck, 
  AlertTriangle, 
  ArrowRight, 
  Flame, 
  ChevronDown, 
  ChevronUp, 
  Package
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PantryDepletionPrediction, PantryReplenishmentSummary } from '../types';
import { predictPantryDepletion } from '../lib/pantryPrediction';
import { speak, stopSpeech } from '../lib/speech';
import { playSfx, vibrate } from '../lib/sensory';

interface PantryDepletionPredictorProps {
  shoppingItems: { name: string; checked?: boolean }[];
  currentTotalCost: number;
  budgetLimit: number;
  onAddItemToShoppingList: (itemName: string) => void;
  onAddMultipleItemsToShoppingList: (itemNames: string[]) => void;
}

export function PantryDepletionPredictor({
  shoppingItems,
  currentTotalCost,
  budgetLimit,
  onAddItemToShoppingList,
  onAddMultipleItemsToShoppingList
}: PantryDepletionPredictorProps) {
  const [filterMode, setFilterMode] = useState<'all' | 'critical' | 'affordable'>('all');
  const [isExpanded, setIsExpanded] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Compute real-time depletion predictions and budget compatibility
  const summary: PantryReplenishmentSummary = useMemo(() => {
    return predictPantryDepletion(shoppingItems, currentTotalCost, budgetLimit);
  }, [shoppingItems, currentTotalCost, budgetLimit]);

  // Filtered items based on user choice
  const displayedPredictions = useMemo(() => {
    if (filterMode === 'critical') {
      return summary.predictions.filter(p => p.urgency === 'critical');
    }
    if (filterMode === 'affordable') {
      return summary.predictions.filter(p => p.canAffordWithinBudget && !p.isAlreadyInShoppingList);
    }
    return summary.predictions;
  }, [summary.predictions, filterMode]);

  const criticalAffordableItems = useMemo(() => {
    return summary.predictions.filter(p => p.urgency === 'critical' && p.canAffordWithinBudget && !p.isAlreadyInShoppingList);
  }, [summary.predictions]);

  // Voice narration with Chef Malu (Aoede voice)
  const handleToggleVoice = () => {
    vibrate(10);
    playSfx('tap');

    if (isSpeaking) {
      stopSpeech();
      setIsSpeaking(false);
      return;
    }

    setIsSpeaking(true);
    speak(summary.aiVoiceSummary, {
      onEnded: () => {
        setIsSpeaking(false);
      }
    });
  };

  const handleAddSingle = (item: PantryDepletionPrediction) => {
    vibrate(15);
    playSfx('pop');
    onAddItemToShoppingList(item.name);
  };

  const handleAddAllAffordableCritical = () => {
    if (criticalAffordableItems.length === 0) return;
    vibrate(20);
    playSfx('crystal');
    const names = criticalAffordableItems.map(i => i.name);
    onAddMultipleItemsToShoppingList(names);
  };

  return (
    <div className="bg-gradient-to-br from-indigo-50/70 via-white to-purple-50/40 dark:from-slate-900/90 dark:via-slate-900 dark:to-indigo-950/30 rounded-[32px] border border-indigo-100 dark:border-indigo-900/50 shadow-md p-6 sm:p-8 space-y-6 transition-all">
      
      {/* Header with Malu Voice & Status */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-indigo-100/80 dark:border-indigo-900/40 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400">
              <History className="w-4 h-4 animate-pulse" />
            </span>
            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500 dark:text-indigo-400">
              Inteligência de Despensa & Consumo
            </span>
          </div>
          <h3 className="text-xl md:text-2xl font-serif font-black text-slate-800 dark:text-white flex items-center gap-2">
            Previsão de Itens a Acabar
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium max-w-xl">
            A IA cruza seu histórico de consumo e rotina com o teto de gastos para sugerir reposições antes que os ingredientes essenciais faltem.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleToggleVoice}
            className={`px-3.5 py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 outline-none ${
              isSpeaking
                ? 'bg-amber-100 border-amber-300 text-amber-700 dark:bg-amber-950/40 animate-pulse'
                : 'bg-white dark:bg-slate-800 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50'
            }`}
            title="Ouvir diagnóstico da despensa com a Chef Malu"
          >
            {isSpeaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-indigo-600" />}
            <span className="hidden sm:inline">{isSpeaking ? 'Pausar Voz' : 'Ouvir Malu'}</span>
          </button>

          {criticalAffordableItems.length > 0 && (
            <button
              type="button"
              onClick={handleAddAllAffordableCritical}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-all shadow-sm shadow-indigo-500/20 flex items-center gap-1.5 cursor-pointer outline-none border-none"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Adicionar Críticos ({criticalAffordableItems.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* Quick Budget Feasibility Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Critical items count */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-800 flex items-center gap-3.5 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase text-slate-400 block tracking-wider">
              Acabando em até 48h
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-mono font-black text-rose-600 dark:text-rose-400">
                {summary.criticalCount}
              </span>
              <span className="text-xs text-slate-400 font-semibold">itens essenciais</span>
            </div>
          </div>
        </div>

        {/* Affordable within budget */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-800 flex items-center gap-3.5 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase text-slate-400 block tracking-wider">
              Cabem no Orçamento
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-mono font-black text-emerald-600 dark:text-emerald-400">
                {summary.affordableItemsCount}
              </span>
              <span className="text-xs text-slate-400 font-semibold">reposições seguras</span>
            </div>
          </div>
        </div>

        {/* Remaining budget margin */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-800 flex items-center gap-3.5 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase text-slate-400 block tracking-wider">
              Margem Disponível
            </span>
            <div className="flex items-baseline gap-1">
              <span className={`text-xl font-mono font-black ${
                budgetLimit - currentTotalCost >= 0 
                  ? 'text-indigo-600 dark:text-indigo-400' 
                  : 'text-rose-600 dark:text-rose-400'
              }`}>
                R$ {Math.max(0, budgetLimit - currentTotalCost).toFixed(2)}
              </span>
              <span className="text-xs text-slate-400 font-semibold">de R$ {budgetLimit.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Collapse Control */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <div className="flex items-center gap-1.5 bg-white/80 dark:bg-slate-800/80 p-1 rounded-xl border border-indigo-100 dark:border-indigo-900/60 shadow-xs">
          {[
            { id: 'all', label: 'Todos os Itens' },
            { id: 'critical', label: `Críticos (${summary.criticalCount})` },
            { id: 'affordable', label: `Cabem no Orçamento (${summary.affordableItemsCount})` }
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                vibrate(5);
                setFilterMode(tab.id as any);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border-none ${
                filterMode === tab.id
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-indigo-600 bg-transparent'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-xs font-bold text-slate-400 hover:text-indigo-600 flex items-center gap-1 cursor-pointer bg-transparent border-none outline-none"
        >
          {isExpanded ? 'Recolher Previsões' : 'Expandir Previsões'}
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Predictions Cards Grid */}
      {isExpanded && (
        <AnimatePresence>
          <motion.div 
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            {displayedPredictions.map((pred) => {
              const isCritical = pred.urgency === 'critical';
              const isSoon = pred.urgency === 'soon';

              return (
                <motion.div
                  key={pred.id}
                  layout
                  initial={{ opacity: 0, scale: 0.96, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ type: "spring", stiffness: 350, damping: 25 }}
                  className={`bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border transition-all flex flex-col justify-between space-y-3.5 relative overflow-hidden shadow-xs hover:shadow-md ${
                    isCritical
                      ? 'border-rose-200 dark:border-rose-900/60'
                      : isSoon
                      ? 'border-amber-200 dark:border-amber-900/60'
                      : 'border-slate-200/80 dark:border-slate-800'
                  }`}
                >
                  {/* Urgency Badge & Category */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 truncate">
                      {pred.category}
                    </span>

                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                      isCritical
                        ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 animate-pulse'
                        : isSoon
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                        : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                    }`}>
                      <Clock className="w-3 h-3" />
                      {pred.estimatedDaysRemaining === 0
                        ? 'Acaba Hoje'
                        : pred.estimatedDaysRemaining === 1
                        ? 'Acaba Amanhã'
                        : `Acaba em ~${pred.estimatedDaysRemaining} dias`}
                    </span>
                  </div>

                  {/* Item Name & Stock info */}
                  <div className="space-y-1">
                    <h4 className="font-serif font-black text-base text-slate-900 dark:text-white leading-tight">
                      {pred.name}
                    </h4>
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
                      <span>Restante: <strong className="text-slate-700 dark:text-slate-200">{pred.currentStock}</strong></span>
                      <span>•</span>
                      <span>Taxa: {pred.avgDailyConsumption}</span>
                    </div>
                  </div>

                  {/* Budget Impact pill */}
                  <div className={`p-2.5 rounded-xl border text-xs flex flex-col gap-1 ${
                    pred.canAffordWithinBudget
                      ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40 text-emerald-800 dark:text-emerald-300'
                      : 'bg-rose-50/60 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40 text-rose-800 dark:text-rose-300'
                  }`}>
                    <div className="flex items-center justify-between font-bold">
                      <span className="flex items-center gap-1">
                        {pred.canAffordWithinBudget ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        ) : (
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                        )}
                        <span>{pred.canAffordWithinBudget ? 'Cabe no Orçamento' : 'Estoura Orçamento'}</span>
                      </span>
                      <span className="font-mono font-black">
                        ~R$ {pred.estimatedRestockCost.toFixed(2)}
                      </span>
                    </div>
                    <span className="text-[10px] opacity-85 leading-tight font-medium">
                      {pred.canAffordWithinBudget
                        ? `Margem restante após inclusão: R$ ${pred.budgetImpact.remainingMargin.toFixed(2)}`
                        : `Excederá o teto em R$ ${pred.budgetImpact.exceededAmount.toFixed(2)}`}
                    </span>
                  </div>

                  {/* Action Button */}
                  <div className="pt-1">
                    {pred.isAlreadyInShoppingList ? (
                      <div className="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs font-bold flex items-center justify-center gap-1.5">
                        <Check className="w-4 h-4 text-emerald-500" />
                        <span>Já está na Lista</span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleAddSingle(pred)}
                        className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer outline-none border-none ${
                          pred.canAffordWithinBudget
                            ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs shadow-indigo-500/20'
                            : 'bg-amber-600 hover:bg-amber-700 text-white shadow-xs shadow-amber-500/20'
                        }`}
                      >
                        <Plus className="w-4 h-4" />
                        <span>{pred.canAffordWithinBudget ? 'Adicionar à Lista' : 'Adicionar Mesmo Assim'}</span>
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </AnimatePresence>
      )}

    </div>
  );
}
