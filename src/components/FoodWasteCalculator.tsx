import React, { useState, useEffect } from 'react';
import { 
  Scale, TrendingDown, AlertTriangle, CheckCircle2, Leaf, 
  DollarSign, Flame, ChefHat, Utensils, RefreshCw, Sparkles, 
  ShieldAlert, Trash2, Clock, ArrowRight, Info, PieChart, Zap,
  Check, ShieldCheck, HeartPulse
} from 'lucide-react';
import { UserProfile, Recipe, PantryItem, PantryRecipeSuggestion } from '../types';
import { generatePantryExpiringRecipes } from '../lib/gemini';
import { playSfx, vibrate } from '../lib/sensory';
import { speak } from '../lib/speech';

interface FoodWasteCalculatorProps {
  items?: PantryItem[];
  profile?: UserProfile | null;
  onCookRecipe?: (recipe: Recipe) => void;
  onItemsUpdated?: () => void;
}

export function FoodWasteCalculator({
  items = [],
  profile,
  onCookRecipe,
  onItemsUpdated
}: FoodWasteCalculatorProps) {
  const [localItems, setLocalItems] = useState<PantryItem[]>(items);
  const [generatingRecipes, setGeneratingRecipes] = useState(false);
  const [zeroWasteRecipes, setZeroWasteRecipes] = useState<PantryRecipeSuggestion[]>([]);
  const [consumedSuccessId, setConsumedSuccessId] = useState<string | null>(null);
  const [selectedUrgentCategory, setSelectedUrgentCategory] = useState<string>('todos');

  // Keep local items synchronized if external prop changes
  useEffect(() => {
    if (items && items.length > 0) {
      setLocalItems(items);
    } else {
      // Load fallback items from localStorage if available
      try {
        const savedPantry = localStorage.getItem('nutri_pantry_items');
        const savedFridge = localStorage.getItem('nutri_local_fridge');
        let combined: PantryItem[] = [];

        if (savedPantry) {
          combined = JSON.parse(savedPantry);
        }
        if (savedFridge) {
          const fridgeParsed = JSON.parse(savedFridge);
          const mappedFridge: PantryItem[] = fridgeParsed.map((f: any) => {
            const today = new Date();
            today.setHours(0,0,0,0);
            const exp = new Date(f.expirationDate + 'T12:00:00');
            const diffDays = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            return {
              id: f.id || `fridge-${Date.now()}-${Math.random().toString(36).substring(2,5)}`,
              name: f.name,
              quantity: f.quantity || '1 unidade',
              category: f.category || 'Outros',
              expirationDate: f.expirationDate,
              daysRemaining: diffDays,
              status: diffDays <= 0 ? 'vencido' : diffDays <= 3 ? 'perto_vencimento' : 'fresco',
              storageLocation: 'geladeira',
              addedAt: f.addedAt || new Date().toISOString()
            };
          });

          // Avoid duplicates by name
          const existingNames = new Set(combined.map(c => c.name.toLowerCase()));
          mappedFridge.forEach(m => {
            if (!existingNames.has(m.name.toLowerCase())) {
              combined.push(m);
            }
          });
        }

        if (combined.length > 0) {
          setLocalItems(combined);
        }
      } catch (e) {
        console.warn('Erro ao carregar itens locais para o calculador:', e);
      }
    }
  }, [items]);

  // Calculations
  const calculateDaysLeft = (expDateStr: string) => {
    if (!expDateStr) return 7;
    const today = new Date();
    today.setHours(0,0,0,0);
    const exp = new Date(expDateStr + (expDateStr.includes('T') ? '' : 'T12:00:00'));
    exp.setHours(0,0,0,0);
    return Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  const processedItems = localItems.map(item => {
    const days = calculateDaysLeft(item.expirationDate);
    let status: 'vencido' | 'perto_vencimento' | 'fresco' = 'fresco';
    if (days <= 0) status = 'vencido';
    else if (days <= 3) status = 'perto_vencimento';
    return { ...item, daysRemaining: days, status };
  }).sort((a, b) => a.daysRemaining - b.daysRemaining);

  const totalCount = processedItems.length;
  const expiredItems = processedItems.filter(i => i.daysRemaining <= 0);
  const urgentItems = processedItems.filter(i => i.daysRemaining > 0 && i.daysRemaining <= 3);
  const warningItems = processedItems.filter(i => i.daysRemaining > 3 && i.daysRemaining <= 7);
  const freshItems = processedItems.filter(i => i.daysRemaining > 7);

  // Waste Risk Index Score (0% to 100%)
  // Weighted score: Expired = 100pts, Urgent(0-3d) = 60pts, Warning(4-7d) = 20pts
  let rawPenalty = 0;
  if (totalCount > 0) {
    rawPenalty = (expiredItems.length * 100 + urgentItems.length * 60 + warningItems.length * 20);
  }
  const maxPossiblePenalty = totalCount > 0 ? totalCount * 100 : 100;
  const wasteIndexScore = totalCount > 0 
    ? Math.min(100, Math.max(0, Math.round((rawPenalty / maxPossiblePenalty) * 100)))
    : 0;

  // Level classification
  let levelInfo = {
    title: 'Excelente (Desperdício Mínimo)',
    subtitle: 'Seu gerenciamento de despensa está impecável! Continue assim.',
    badgeClass: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
    gaugeColor: 'from-emerald-500 to-teal-500',
    iconColor: 'text-emerald-500'
  };

  if (wasteIndexScore > 40) {
    levelInfo = {
      title: 'Risco Alto de Desperdício',
      subtitle: 'Atenção! Vários itens estão prestes a vencer ou vencidos. Resgate imediato recomendado.',
      badgeClass: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30',
      gaugeColor: 'from-amber-500 via-rose-500 to-red-600',
      iconColor: 'text-rose-500'
    };
  } else if (wasteIndexScore > 15) {
    levelInfo = {
      title: 'Alerta Moderado',
      subtitle: 'Alguns ingredientes precisam ser consumidos nos próximos 3 dias para evitar perdas.',
      badgeClass: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
      gaugeColor: 'from-emerald-400 via-amber-400 to-orange-500',
      iconColor: 'text-amber-500'
    };
  }

  // Estimated Financial Risk & Environmental Impact
  const estimatedFinancialRisk = (expiredItems.length * 12.5) + (urgentItems.length * 9.8) + (warningItems.length * 4.5);
  const estimatedKgAtRisk = (expiredItems.length * 0.35) + (urgentItems.length * 0.30) + (warningItems.length * 0.15);
  const co2EqAvoidedKg = (estimatedKgAtRisk * 2.5).toFixed(1);

  // Trigger Gemini AI Zero-Waste Recipes
  const handleGenerateRecipes = async () => {
    if (processedItems.length === 0) {
      alert("Nenhum produto cadastrado na despensa ou geladeira.");
      return;
    }

    setGeneratingRecipes(true);
    playSfx('tap');
    vibrate(15);

    try {
      const recipes = await generatePantryExpiringRecipes(processedItems, profile || undefined);
      setZeroWasteRecipes(recipes);
      if (recipes.length > 0) {
        speak(`Geradas ${recipes.length} receitas focadas no resgate de alimentos com maior prioridade.`, { lang: 'pt-BR' });
      }
    } catch (e) {
      console.warn("Erro ao gerar receitas zero desperdício:", e);
    } finally {
      setGeneratingRecipes(false);
    }
  };

  // Consume ingredients handler
  const handleConsumeRecipeIngredients = (recipe: PantryRecipeSuggestion) => {
    playSfx('success');
    vibrate([20, 80, 20]);

    const rescued = (recipe.urgentExpiringIngredientsUsed || []).map(s => s.toLowerCase());
    const other = (recipe.otherPantryIngredientsUsed || []).map(s => s.toLowerCase());
    const allUsed = [...rescued, ...other];

    const updated = localItems.filter(item => {
      const nameLower = item.name.toLowerCase();
      const match = allUsed.some(u => nameLower.includes(u) || u.includes(nameLower));
      return !match;
    });

    setLocalItems(updated);
    try {
      localStorage.setItem('nutri_pantry_items', JSON.stringify(updated));
    } catch (e) {}

    setConsumedSuccessId(recipe.id);
    speak("Ingredientes resgatados! Seu Índice de Desperdício diminuiu.", { lang: 'pt-BR' });

    if (onItemsUpdated) {
      onItemsUpdated();
    }

    setTimeout(() => setConsumedSuccessId(null), 3500);
  };

  // Filter urgent items by category
  const filteredUrgentList = [...expiredItems, ...urgentItems].filter(item => {
    if (selectedUrgentCategory === 'todos') return true;
    return item.category === selectedUrgentCategory;
  });

  return (
    <div className="w-full space-y-6 animate-fade-in" id="food-waste-calculator-root">
      
      {/* Hero Banner / Gauge Card */}
      <div className="p-6 md:p-8 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 text-white shadow-2xl relative overflow-hidden border border-slate-700/60">
        <div className="absolute -right-10 -top-10 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-10 -bottom-10 w-72 h-72 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-3 text-center md:text-left max-w-lg">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs font-bold uppercase tracking-wider">
              <Scale className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span>Algoritmo de Desperdício Alimentar Zero</span>
            </div>

            <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Índice de Desperdício da Sua Casa
            </h2>

            <p className="text-xs md:text-sm text-slate-300 leading-relaxed">
              Calculado com base no rastreamento das datas de validade dos produtos escaneados e armazenados.
            </p>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 pt-1">
              <span className={`px-3 py-1 rounded-full text-xs font-bold border ${levelInfo.badgeClass}`}>
                {levelInfo.title}
              </span>
              <span className="text-xs text-slate-400 font-medium">
                {totalCount} itens sob monitoramento
              </span>
            </div>
          </div>

          {/* Radial Index Meter Display */}
          <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 text-center min-w-[200px] shadow-inner">
            <div className="relative w-28 h-28 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-slate-700"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className={`text-emerald-400 stroke-current transition-all duration-1000 ease-out`}
                  strokeDasharray={`${wasteIndexScore}, 100`}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-black text-white">{wasteIndexScore}%</span>
                <span className="text-[10px] uppercase font-bold text-slate-400">Risco</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-300 mt-2 max-w-[180px]">
              {levelInfo.subtitle}
            </p>
          </div>
        </div>
      </div>

      {/* Impact & Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-rose-600 dark:text-rose-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Itens Críticos / Vencidos</span>
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-slate-800 dark:text-slate-100">
            {expiredItems.length + urgentItems.length} <span className="text-xs font-semibold text-slate-400">produtos</span>
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400">
            {expiredItems.length} vencidos • {urgentItems.length} vencem em ≤3 dias
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-amber-600 dark:text-amber-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Atenção Moderada</span>
            <Clock className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-slate-800 dark:text-slate-100">
            {warningItems.length} <span className="text-xs font-semibold text-slate-400">produtos</span>
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400">
            Validade entre 4 e 7 dias
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Valor em Risco</span>
            <DollarSign className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-slate-800 dark:text-slate-100">
            R$ {estimatedFinancialRisk.toFixed(2).replace('.', ',')}
          </div>
          <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
            Pode ser economizado com receitas!
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-teal-600 dark:text-teal-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Planeta & Sustentabilidade</span>
            <Leaf className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-slate-800 dark:text-slate-100">
            {co2EqAvoidedKg} <span className="text-xs font-semibold text-slate-400">kg CO₂eq</span>
          </div>
          <p className="text-[10px] text-teal-600 dark:text-teal-400 font-bold">
            Emissões evitadas ao resgatar {estimatedKgAtRisk.toFixed(1)} kg de alimento
          </p>
        </div>
      </div>

      {/* Urgent Items List & Rescue Trigger Section */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-700 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <span>Itens com Prioridade Máxima de Consumo</span>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 text-xs font-bold">
                  {expiredItems.length + urgentItems.length} Alimentos
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Estes itens precisam ser utilizados hoje ou congelados para evitar o desperdício.
              </p>
            </div>
          </div>

          <button
            onClick={handleGenerateRecipes}
            disabled={generatingRecipes}
            className="px-6 py-3 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 active:scale-95 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 transition-all cursor-pointer disabled:opacity-60"
          >
            <ChefHat className={`w-4 h-4 ${generatingRecipes ? 'animate-spin' : ''}`} />
            <span>{generatingRecipes ? 'Gerando Receitas Zero Desperdício...' : 'Sugerir Receitas Anti-Desperdício IA'}</span>
          </button>
        </div>

        {/* List of Urgent Items */}
        {filteredUrgentList.length === 0 ? (
          <div className="p-8 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/40 text-center space-y-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
            <h4 className="font-extrabold text-slate-800 dark:text-slate-100 text-sm">
              Nenhum item em estado crítico no momento!
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              Todos os seus alimentos estão frescos com boa margem de validade.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {filteredUrgentList.map(item => (
              <div
                key={item.id}
                className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                  item.daysRemaining <= 0
                    ? 'bg-rose-50/80 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/60'
                    : 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/60'
                }`}
              >
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    {item.category} • {item.storageLocation}
                  </span>
                  <h4 className="font-extrabold text-xs text-slate-800 dark:text-slate-100 truncate">
                    {item.name}
                  </h4>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                    Qtd: {item.quantity}
                  </span>
                </div>

                <div className="text-right shrink-0">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold block ${
                    item.daysRemaining <= 0 
                      ? 'bg-rose-500 text-white' 
                      : 'bg-amber-500 text-white'
                  }`}>
                    {item.daysRemaining <= 0 ? 'Vencido' : `${item.daysRemaining}d restantes`}
                  </span>
                  <span className="text-[9px] text-slate-400 block mt-1">
                    Val: {new Date(item.expirationDate + 'T12:00:00').toLocaleDateString('pt-BR')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Suggested Zero Waste AI Recipes */}
      {zeroWasteRecipes.length > 0 && (
        <div className="p-6 rounded-3xl bg-slate-900 text-white border border-slate-800 shadow-2xl space-y-6 animate-fade-in">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-emerald-500/20 text-emerald-400">
                <Utensils className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
                  <span>Receitas Resgate Zero Desperdício Recomendadas</span>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500 text-slate-950 text-xs font-bold">
                    IA NutriAI
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  Receitas desenhadas para priorizar a combinação de ingredientes prestes a vencer.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {zeroWasteRecipes.map(recipe => (
              <div
                key={recipe.id}
                className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700/80 space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-[10px] font-extrabold uppercase tracking-wider block w-fit mb-1">
                        Zero Waste Score: {recipe.zeroWasteScore}%
                      </span>
                      <h4 className="font-extrabold text-base text-white">
                        {recipe.title}
                      </h4>
                    </div>

                    <span className="px-3 py-1 rounded-full bg-slate-700 text-slate-200 text-xs font-bold shrink-0">
                      ⏱️ {recipe.prepTime}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    {recipe.description}
                  </p>

                  {/* Rescued Badges */}
                  <div className="space-y-1.5 pt-2 border-t border-slate-700/60">
                    <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block">
                      Ingredientes Resgatados:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {(recipe.urgentExpiringIngredientsUsed || []).map((ing, idx) => (
                        <span
                          key={`rescued-${idx}`}
                          className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] font-bold"
                        >
                          ⚠️ {ing}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Instructions snippet */}
                  <div className="space-y-1 pt-2 text-xs text-slate-300">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Modo de Preparo:</span>
                    <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-300">
                      {recipe.instructions.slice(0, 3).map((step, idx) => (
                        <li key={idx} className="truncate">{step}</li>
                      ))}
                    </ol>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-700/60 flex flex-col sm:flex-row items-center justify-between gap-3">
                  {consumedSuccessId === recipe.id ? (
                    <div className="w-full py-2.5 rounded-full bg-emerald-500 text-slate-950 text-xs font-black text-center flex items-center justify-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Ingredientes Consumidos & Removidos com Sucesso!</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleConsumeRecipeIngredients(recipe)}
                      className="w-full py-2.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md"
                    >
                      <Check className="w-4 h-4" />
                      <span>Marcar Ingredientes como Consumidos / Salvos</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Conservation Tips */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-teal-500/10 via-emerald-500/10 to-emerald-600/10 border border-emerald-500/20 space-y-2">
        <h4 className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-emerald-500" />
          <span>Dicas de Conservação Prolongada do Chef IA</span>
        </h4>
        <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1.5 list-disc list-inside">
          <li><strong>Vegetais folhosos:</strong> Lave, seque bem e guarde em pote hermético com uma folha de papel toalha para absorver a umidade e dobrar a durabilidade.</li>
          <li><strong>Tomates maduros:</strong> Bata com azeite e alho e congele em formas de gelo para ter cubos de molho de tomate caseiro instantâneos.</li>
          <li><strong>Carnes resfriadas:</strong> Se não for preparar em 48h, Tempere levemente e transfira imediatamente para o freezer para estender por 3 meses.</li>
        </ul>
      </div>

    </div>
  );
}
