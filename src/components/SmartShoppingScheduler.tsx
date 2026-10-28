import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar, ShoppingBag, Sparkles, Store, CheckCircle2, Circle, 
  DollarSign, Clock, Volume2, Plus, RefreshCw, Loader2, ArrowRight, 
  ShieldCheck, AlertTriangle, Layers, ChevronDown, ChevronUp, Package, Trash2, CheckSquare, Square
} from 'lucide-react';
import { MealPlan, UserProfile, SmartShoppingSchedule, SmartShoppingAisle, SmartShoppingItem } from '../types';
import { analyzeWeeklyMealPlanForShopping } from '../lib/gemini';
import { speak, stopSpeech } from '../lib/speech';
import { playSfx, vibrate } from '../lib/sensory';
import { safeGet, safeSet } from '../lib/storage';
import { db, auth } from '../lib/firebase';
import { collection, addDoc, serverTimestamp, getDocs, query } from '../lib/firebase';

interface SmartShoppingSchedulerProps {
  mealPlan?: MealPlan | null;
  profile?: UserProfile | null;
  onNavigateToShoppingList?: () => void;
}

export function SmartShoppingScheduler({
  mealPlan: initialMealPlan,
  profile,
  onNavigateToShoppingList
}: SmartShoppingSchedulerProps) {
  const [mealPlan, setMealPlan] = useState<MealPlan | null>(initialMealPlan || null);
  const [pantryItems, setPantryItems] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [scheduleData, setScheduleData] = useState<SmartShoppingSchedule | null>(null);
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [isAddingToList, setIsAddingToList] = useState<boolean>(false);
  const [addedSuccess, setAddedSuccess] = useState<boolean>(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const [expandedAisle, setExpandedAisle] = useState<string | null>(null);

  // Load MealPlan & Pantry Items
  useEffect(() => {
    let active = true;

    const loadData = async () => {
      setLoading(true);
      let targetPlan: MealPlan | null = initialMealPlan || null;
      let pItems: string[] = [];

      try {
        // Load meal plan if not provided in props
        if (!targetPlan) {
          const storedPlan = safeGet('nutri_meal_plan');
          if (storedPlan) {
            targetPlan = JSON.parse(storedPlan);
          }
        }

        // Load pantry items
        const storedFridge = safeGet('nutri_fridge_items');
        if (storedFridge) {
          const parsed = JSON.parse(storedFridge);
          if (Array.isArray(parsed)) {
            pItems = parsed.map((i: any) => typeof i === 'string' ? i : (i.name || '')).filter(Boolean);
          }
        }

        // Check Firestore if logged in
        if (auth.currentUser) {
          if (!targetPlan) {
            const planRef = collection(db, 'users', auth.currentUser.uid, 'mealPlans');
            const snap = await getDocs(query(planRef));
            if (!snap.empty) {
              const latestDoc = snap.docs[0].data();
              if (latestDoc && latestDoc.plan) targetPlan = latestDoc.plan;
            }
          }

          if (pItems.length === 0) {
            const userPantryRef = collection(db, 'users', auth.currentUser.uid, 'pantry');
            const pSnap = await getDocs(query(userPantryRef));
            if (!pSnap.empty) {
              pItems = pSnap.docs.map(d => d.data()?.name || d.data()?.title).filter(Boolean);
            }
          }
        }
      } catch (err) {
        console.warn("Aviso ao carregar dados do agendador:", err);
      }

      if (pItems.length === 0) {
        pItems = ["Azeite de Oliva", "Sal", "Arroz", "Pimenta do reino", "Cebola", "Alho"];
      }

      if (active) {
        setMealPlan(targetPlan);
        setPantryItems(pItems);
        if (targetPlan) {
          await runAnalysis(targetPlan, pItems);
        } else {
          // Default fallback plan if empty
          const dummyPlan: MealPlan = {
            'Segunda': {
              date: 'Segunda-feira',
              meals: {
                breakfast: { id: 'm1', name: 'Omelete de Espinafre e Ricota', description: 'Rico em proteínas', prepTime: '10 min', ingredients: ['Ovos Caipiras (3 un)', 'Espinafre Baby (1 maço)', 'Ricota Light (50g)'], instructions: ['Bata os ovos', 'Refogue o espinafre'], nutrition: { calories: 280, protein: 22, carbs: 6, fat: 18 } },
                lunch: { id: 'm2', name: 'Filé de Frango Grelhado com Quinoa', description: 'Almoço equilibrado', prepTime: '20 min', ingredients: ['Peito de Frango (150g)', 'Quinoa em Grãos (60g)', 'Tomate Cereja (6 un)', 'Azeite de Oliva (1 colher)'], instructions: ['Grelhe o frango', 'Cozinhe a quinoa'], nutrition: { calories: 420, protein: 38, carbs: 32, fat: 12 } },
                dinner: { id: 'm3', name: 'Salada Mediterrânea com Abacate', description: 'Jantar leve e rico em gorduras boas', prepTime: '15 min', ingredients: ['Mix de Folhas (2 xícaras)', 'Abacate (1/2 un)', 'Azeitonas Pretas (5 un)', 'Iogurte Grego (2 colheres)'], instructions: ['Misture as folhas', 'Adicione o abacate e molho'], nutrition: { calories: 310, protein: 12, carbs: 18, fat: 22 } }
              }
            }
          };
          setMealPlan(dummyPlan);
          await runAnalysis(dummyPlan, pItems);
        }
      }
    };

    loadData();
    return () => {
      active = false;
    };
  }, [initialMealPlan]);

  const runAnalysis = async (plan: MealPlan, items: string[]) => {
    setLoading(true);
    try {
      const res = await analyzeWeeklyMealPlanForShopping(plan, items, profile);
      if (res) {
        setScheduleData(res);
        // Pre-check all missing items
        const initialChecked: Record<string, boolean> = {};
        res.aisles?.forEach(aisle => {
          aisle.items?.forEach(item => {
            initialChecked[item.id] = true;
          });
        });
        setCheckedItems(initialChecked);
      }
    } catch (e) {
      console.warn("Erro na análise do Smart Shopping Scheduler:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleCheckItem = (id: string) => {
    setCheckedItems(prev => ({ ...prev, [id]: !prev[id] }));
    playSfx('tap');
    vibrate(10);
  };

  const handleToggleAisleCheck = (aisle: SmartShoppingAisle) => {
    const allChecked = aisle.items.every(i => !!checkedItems[i.id]);
    const next = { ...checkedItems };
    aisle.items.forEach(i => {
      next[i.id] = !allChecked;
    });
    setCheckedItems(next);
    playSfx(allChecked ? 'pop' : 'success');
  };

  const handleAddSelectedToShoppingList = async () => {
    if (!scheduleData) return;

    setIsAddingToList(true);
    setAddedSuccess(false);
    playSfx('crystal');
    vibrate(20);

    const itemsToAdd: any[] = [];
    scheduleData.aisles.forEach(aisle => {
      aisle.items.forEach(item => {
        if (checkedItems[item.id]) {
          itemsToAdd.push({
            id: `sched-item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            name: item.name,
            amount: item.estimatedAmount,
            price: item.estimatedCost,
            aisle: aisle.aisleName,
            checked: false,
            addedAt: new Date().toISOString()
          });
        }
      });
    });

    try {
      // Save locally
      const stored = safeGet('nutri_shopping_list');
      let currentList: any[] = [];
      if (stored) {
        try { currentList = JSON.parse(stored); } catch (e) {}
      }

      const combined = [...itemsToAdd, ...currentList];
      safeSet('nutri_shopping_list', JSON.stringify(combined));

      // Save in Firestore if logged in
      if (auth.currentUser) {
        const userListRef = collection(db, 'users', auth.currentUser.uid, 'shoppingList');
        for (const item of itemsToAdd) {
          await addDoc(userListRef, {
            ...item,
            userId: auth.currentUser.uid,
            createdAt: serverTimestamp()
          });
        }
      }

      window.dispatchEvent(new CustomEvent('app:shopping-list-updated'));
      window.dispatchEvent(new CustomEvent('app:notification', {
        detail: {
          title: "Lista Atualizada! 🛒",
          message: `${itemsToAdd.length} ingredientes do plano semanal foram adicionados à sua Lista de Compras.`,
          type: "success"
        }
      }));

      setAddedSuccess(true);
      setTimeout(() => setAddedSuccess(false), 4000);
    } catch (err) {
      console.warn("Erro ao salvar itens na lista de compras:", err);
    } finally {
      setIsAddingToList(false);
    }
  };

  const handleSpeakSummary = () => {
    if (!scheduleData?.aiVoiceSummary) return;
    if (isPlayingAudio) {
      stopSpeech();
      setIsPlayingAudio(false);
      return;
    }

    setIsPlayingAudio(true);
    speak(scheduleData.aiVoiceSummary, {
      onEnded: () => setIsPlayingAudio(false),
      onError: () => setIsPlayingAudio(false)
    });
  };

  const selectedCount = Object.values(checkedItems).filter(Boolean).length;

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500 pb-16 px-2 sm:px-4">
      {/* Header Banner */}
      <div className="clay-card p-6 sm:p-10 bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 text-white rounded-[32px] border border-emerald-500/30 shadow-2xl relative overflow-hidden space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
              Agendador Inteligente de Compras
            </div>
            <h2 className="font-serif text-2xl sm:text-4xl font-black text-white tracking-tight">
              Smart Shopping Scheduler
            </h2>
            <p className="text-xs sm:text-sm text-slate-300/90 leading-relaxed font-medium">
              Análise contínua do seu plano alimentar semanal cruzado com a sua despensa. Adicione automaticamente apenas os ingredientes faltantes, organizados por corredor do mercado.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => mealPlan && runAnalysis(mealPlan, pantryItems)}
              disabled={loading}
              className="p-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white transition-all border border-white/20 active:scale-95 disabled:opacity-50 cursor-pointer"
              title="Recalcular plano e estoque"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>

            {scheduleData?.aiVoiceSummary && (
              <button
                onClick={handleSpeakSummary}
                className={`p-3 rounded-2xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                  isPlayingAudio
                    ? 'bg-rose-600 text-white border-rose-500 animate-pulse'
                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                }`}
                title="Ouvir resumo do agendamento com a voz da Malu"
              >
                <Volume2 className="w-5 h-5" />
                <span className="hidden sm:inline">Ouvir Resumo</span>
              </button>
            )}
          </div>
        </div>

        {/* Schedule Insights Stats Row */}
        {scheduleData && !loading && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4 border-t border-emerald-500/20 text-xs">
            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
              <span className="text-slate-400 font-bold uppercase text-[10px] block mb-1">Melhor Dia de Compras</span>
              <p className="text-sm sm:text-base font-black text-emerald-400 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-emerald-400" />
                {scheduleData.recommendedDay}
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
              <span className="text-slate-400 font-bold uppercase text-[10px] block mb-1">Horário Recomendado</span>
              <p className="text-xs sm:text-sm font-bold text-amber-300 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-300" />
                {scheduleData.recommendedTimeSlot}
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
              <span className="text-slate-400 font-bold uppercase text-[10px] block mb-1">Orçamento Estimado</span>
              <p className="text-sm sm:text-base font-black text-white flex items-center gap-1">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                R$ {scheduleData.estimatedTotalBudget.toFixed(2).replace('.', ',')}
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
              <span className="text-slate-400 font-bold uppercase text-[10px] block mb-1">Cobertura da Despensa</span>
              <p className="text-sm sm:text-base font-black text-teal-300 flex items-center gap-1.5">
                <Package className="w-4 h-4 text-teal-400" />
                {scheduleData.pantryCoveragePercentage}% em casa
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Main Body */}
      {loading ? (
        <div className="clay-card p-12 text-center bg-white dark:bg-[#0c1524] rounded-[28px] border border-slate-200 dark:border-slate-800 space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-emerald-500 mx-auto" />
          <h3 className="font-serif font-bold text-lg text-slate-800 dark:text-slate-200">
            Analisando refeições da semana e verificando estoque...
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Identificando cada ingrediente faltante e agrupando por corredores do mercado.
          </p>
        </div>
      ) : scheduleData ? (
        <div className="space-y-6">
          {/* Quick Action bar: Add selected to list */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40">
            <div className="flex items-center gap-3 text-slate-800 dark:text-slate-200 text-sm font-semibold">
              <CheckSquare className="w-5 h-5 text-emerald-500" />
              <span>
                <strong>{selectedCount}</strong> de {scheduleData.totalMissingItemsCount} itens selecionados
              </span>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                onClick={handleAddSelectedToShoppingList}
                disabled={selectedCount === 0 || isAddingToList}
                className="w-full sm:w-auto bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold px-6 py-3 rounded-xl transition-all shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2.5 text-sm disabled:opacity-50 cursor-pointer active:scale-95"
              >
                {isAddingToList ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Adicionando à Lista...</span>
                  </>
                ) : addedSuccess ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                    <span>Adicionados com Sucesso! 🎉</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    <span>Adicionar Faltantes à Lista de Compras</span>
                  </>
                )}
              </button>

              {onNavigateToShoppingList && (
                <button
                  onClick={onNavigateToShoppingList}
                  className="px-4 py-3 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs sm:text-sm font-bold transition-all shrink-0 cursor-pointer"
                >
                  Ver Lista
                </button>
              )}
            </div>
          </div>

          {/* Aisles Accordion Grid */}
          <div className="grid gap-6">
            {scheduleData.aisles?.map((aisle, aIdx) => {
              const aisleCheckedCount = aisle.items.filter(i => !!checkedItems[i.id]).length;
              const isAllAisleChecked = aisleCheckedCount === aisle.items.length;
              const isExpanded = expandedAisle === aisle.aisleName || expandedAisle === null;

              return (
                <div 
                  key={aIdx}
                  className="clay-card bg-white dark:bg-[#0c1524] border border-slate-200/80 dark:border-slate-800/80 rounded-[24px] shadow-lg overflow-hidden transition-all"
                >
                  {/* Aisle Header */}
                  <div className="p-5 sm:p-6 bg-slate-50/60 dark:bg-slate-900/60 border-b border-slate-200/60 dark:border-slate-800/60 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl p-2 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/20">
                        {aisle.icon}
                      </span>
                      <div>
                        <h3 className="font-serif font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                          {aisle.aisleName}
                          <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-sans font-bold">
                            {aisleCheckedCount}/{aisle.items.length} itens
                          </span>
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                          {aisle.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleAisleCheck(aisle)}
                        className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline px-2 py-1 rounded-lg cursor-pointer"
                      >
                        {isAllAisleChecked ? 'Desmarcar Corredor' : 'Marcar Corredor'}
                      </button>

                      <button
                        onClick={() => setExpandedAisle(isExpanded ? '' : aisle.aisleName)}
                        className="p-2 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 transition-all cursor-pointer"
                      >
                        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  {/* Aisle Items List */}
                  {isExpanded && (
                    <div className="p-4 sm:p-6 grid sm:grid-cols-2 gap-3">
                      {aisle.items.map((item) => {
                        const isChecked = !!checkedItems[item.id];
                        return (
                          <div
                            key={item.id}
                            onClick={() => handleToggleCheckItem(item.id)}
                            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
                              isChecked
                                ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-500/30'
                                : 'bg-slate-50 dark:bg-slate-900/50 border-slate-200/60 dark:border-slate-800/60 opacity-80'
                            }`}
                          >
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleCheckItem(item.id);
                              }}
                              className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all cursor-pointer ${
                                isChecked
                                  ? 'bg-emerald-600 border-emerald-600 text-white'
                                  : 'border-slate-300 dark:border-slate-700'
                              }`}
                            >
                              {isChecked && <CheckCircle2 className="w-4 h-4 text-white" />}
                            </button>

                            <div className="flex-1 space-y-1">
                              <div className="flex items-center justify-between gap-2">
                                <span className={`font-bold text-sm ${isChecked ? 'text-slate-900 dark:text-white' : 'line-through text-slate-400'}`}>
                                  {item.name}
                                </span>
                                <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                                  R$ {item.estimatedCost.toFixed(2).replace('.', ',')}
                                </span>
                              </div>

                              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                                Quantidade: <strong className="text-slate-700 dark:text-slate-300">{item.estimatedAmount}</strong>
                              </p>

                              {item.recipesUsed && item.recipesUsed.length > 0 && (
                                <div className="flex flex-wrap gap-1 pt-1">
                                  {item.recipesUsed.map((r, rIdx) => (
                                    <span key={rIdx} className="text-[10px] px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium">
                                      🍲 {r}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
