import React, { useState, useRef } from 'react';
import { MealPlan, Recipe, UserProfile, IntakeLog } from '../types';
import { Plus, X, Wand2, Loader2, Info, PieChart, Activity, Share2, Download, ExternalLink, Sparkles } from 'lucide-react';
import { RecipeCard } from './RecipeCard';
import { generateMealSuggestions } from '../lib/gemini';
import { motion, AnimatePresence } from 'motion/react';
import { exportElementAsImage, downloadBlobUrl } from '../lib/cardExport';

interface MealPlanProps {
  mealPlan: MealPlan;
  savedRecipes: Recipe[];
  onUpdatePlan: (day: string, mealName: string, recipeId: string | null, recipeObj?: Recipe) => void;
  onLogIntake: (log: IntakeLog) => void;
  profile: UserProfile | null;
  onGeneratingChange?: (generating: boolean) => void;
}

const DAYS_OF_WEEK = [
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
  'Domingo'
];

const MEALS = [
  { id: 'breakfast', label: 'Café da Manhã' },
  { id: 'lunch', label: 'Almoço' },
  { id: 'snack', label: 'Lanche' },
  { id: 'dinner', label: 'Jantar' },
];

export function MealPlanView({ mealPlan, savedRecipes, onUpdatePlan, onLogIntake, profile, onGeneratingChange }: MealPlanProps) {
  const [selectedDay, setSelectedDay] = useState<string>(DAYS_OF_WEEK[0]);
  const [addingTo, setAddingTo] = useState<{day: string, meal: string} | null>(null);
  const [viewRecipe, setViewRecipe] = useState<Recipe | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [loggingMeal, setLoggingMeal] = useState<string | null>(null);

  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isExportingCard, setIsExportingCard] = useState(false);
  const [exportedCardUrl, setExportedCardUrl] = useState<string | null>(null);
  const [exportedBlobUrl, setExportedBlobUrl] = useState<string | null>(null);
  const shareCardRef = useRef<HTMLDivElement>(null);

  const handleExportCard = async () => {
    if (!shareCardRef.current) return;
    setIsExportingCard(true);
    try {
      const fileName = `plano-alimentar-${selectedDay.toLowerCase().replace(/[^a-z0-9]/g, '-')}.png`;
      const result = await exportElementAsImage(
        shareCardRef.current,
        fileName,
        `Plano Alimentar - ${selectedDay}`
      );

      if (result.success && result.dataUrl) {
        setExportedCardUrl(result.dataUrl);
        if (result.blobUrl) {
          setExportedBlobUrl(result.blobUrl);
        }

        window.dispatchEvent(new CustomEvent('app:notification', {
          detail: {
            title: result.shared ? "Compartilhado com Sucesso! 📸" : "Imagem Pronta! 📸",
            message: result.shared 
              ? `Plano de ${selectedDay} compartilhado.`
              : `Toque no botão Salvar ou mantenha pressionado para baixar.`,
            type: "success"
          }
        }));
      } else {
        throw new Error(result.error || "Falha ao gerar imagem.");
      }
    } catch (err: any) {
      console.warn("Erro ao gerar imagem do plano:", err);
      window.dispatchEvent(new CustomEvent('app:notification', {
        detail: {
          title: "Aviso de Exportação",
          message: "Você pode tirar um print ou tentar novamente.",
          type: "info"
        }
      }));
    } finally {
      setIsExportingCard(false);
    }
  };

  // States for calorie/nutrient tracker and quick log
  const [activeTrackerTab, setActiveTrackerTab] = useState<'planned' | 'actual'>('planned');
  const [showQuickLogForm, setShowQuickLogForm] = useState(false);
  const [quickLogName, setQuickLogName] = useState('');
  const [quickLogCal, setQuickLogCal] = useState<number>(200);
  const [quickLogProtein, setQuickLogProtein] = useState<number>(15);
  const [quickLogCarbs, setQuickLogCarbs] = useState<number>(25);
  const [quickLogFat, setQuickLogFat] = useState<number>(5);

  const dayPlan = mealPlan[selectedDay]?.meals || {};

  // Formulate recommended values dynamically based on profile
  const getRecommendedStats = () => {
    if (profile?.masterPlan?.dailyCalories) {
      return {
        calories: profile.masterPlan.dailyCalories,
        protein: profile.masterPlan.macros?.protein || 0,
        carbs: profile.masterPlan.macros?.carbs || 0,
        fat: profile.masterPlan.macros?.fat || 0,
        fiber: 30,
        sugar: 50,
      };
    }

    // Fallback calculation based on profile (Mifflin-St Jeor)
    const weight = profile?.weight || 70;
    const height = profile?.height || 170;
    const age = profile?.age || 30;
    const isMale = profile?.gender?.toLowerCase() === 'masculino';
    
    const s = isMale ? 5 : -161;
    const bmr = 10 * weight + 6.25 * height - 5 * age + s;
    
    let multiplier = 1.3;
    if (profile?.activityLevel?.toLowerCase().includes('alto') || profile?.activityLevel?.toLowerCase().includes('pesado') || profile?.activityLevel?.toLowerCase().includes('muito')) {
      multiplier = 1.6;
    } else if (profile?.activityLevel?.toLowerCase().includes('moderado') || profile?.activityLevel?.toLowerCase().includes('médio')) {
      multiplier = 1.4;
    } else if (profile?.activityLevel?.toLowerCase().includes('baixo') || profile?.activityLevel?.toLowerCase().includes('leve')) {
      multiplier = 1.2;
    }

    let calories = Math.round(bmr * multiplier);
    const goalText = (profile?.goals || '').toLowerCase();
    
    if (goalText.includes('perda') || goalText.includes('emagrecer') || goalText.includes('perder') || goalText.includes('seca')) {
      calories -= 400;
    } else if (goalText.includes('ganho') || goalText.includes('hipertrofia') || goalText.includes('massa') || goalText.includes('bulking')) {
      calories += 300;
    }

    calories = Math.max(1200, calories);

    let protein = Math.round(weight * 1.5);
    if (goalText.includes('ganho') || goalText.includes('hipertrofia')) {
      protein = Math.round(weight * 2.0);
    }
    protein = Math.max(50, Math.min(220, protein));

    const fat = Math.round((calories * 0.25) / 9);
    const carbs = Math.round((calories - (protein * 4) - (fat * 9)) / 4);

    return {
      calories,
      protein,
      carbs,
      fat,
      fiber: 30,
      sugar: 50
    };
  };

  const getPlannedStats = () => {
    let calories = 0;
    let protein = 0;
    let carbs = 0;
    let fat = 0;
    let fiber = 0;
    let sugar = 0;
    const vitaminsSet = new Set<string>();
    const mineralsSet = new Set<string>();

    Object.values(dayPlan).forEach((recipe: any) => {
      if (recipe && recipe.nutrition) {
        calories += recipe.nutrition.calories || 0;
        protein += recipe.nutrition.protein || 0;
        carbs += recipe.nutrition.carbs || 0;
        fat += recipe.nutrition.fat || 0;
        fiber += recipe.nutrition.fiber || 0;
        sugar += recipe.nutrition.sugar || 0;
        if (recipe.nutrition.vitamins) {
          recipe.nutrition.vitamins.forEach((v: string) => vitaminsSet.add(v));
        }
        if (recipe.nutrition.minerals) {
          recipe.nutrition.minerals.forEach((m: string) => mineralsSet.add(m));
        }
      }
    });

    return {
      calories,
      protein,
      carbs,
      fat,
      fiber,
      sugar,
      vitamins: Array.from(vitaminsSet),
      minerals: Array.from(mineralsSet)
    };
  };

  const getTodayIntakeStats = () => {
    let calories = 0;
    let protein = 0;
    let carbs = 0;
    let fat = 0;
    let fiber = 0;
    let sugar = 0;
    const vitaminsSet = new Set<string>();
    const mineralsSet = new Set<string>();

    const todayStr = new Date().toDateString();
    
    const todayLogs = (profile?.intakeLogs || []).filter(log => {
      return new Date(log.date).toDateString() === todayStr;
    });

    todayLogs.forEach(log => {
      const nut = log.actual || log.planned;
      if (nut) {
        calories += nut.calories || 0;
        protein += nut.protein || 0;
        carbs += nut.carbs || 0;
        fat += nut.fat || 0;
        fiber += nut.fiber || 0;
        sugar += nut.sugar || 0;
        if (nut.vitamins) {
          nut.vitamins.forEach(v => vitaminsSet.add(v));
        }
        if (nut.minerals) {
          nut.minerals.forEach(m => mineralsSet.add(m));
        }
      }
    });

    return {
      calories,
      protein,
      carbs,
      fat,
      fiber,
      sugar,
      vitamins: Array.from(vitaminsSet),
      minerals: Array.from(mineralsSet)
    };
  };

  const recommendedNutrition = getRecommendedStats();
  const plannedNutrition = getPlannedStats();
  const actualNutrition = getTodayIntakeStats();

  const currentNutrition = activeTrackerTab === 'planned' ? plannedNutrition : actualNutrition;

  const handleQuickLogSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickLogName.trim()) return;

    const log: IntakeLog = {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      mealId: 'custom-log-' + crypto.randomUUID(),
      recipeName: quickLogName,
      planned: {
        calories: Number(quickLogCal),
        protein: Number(quickLogProtein),
        carbs: Number(quickLogCarbs),
        fat: Number(quickLogFat),
        fiber: 0,
        sugar: 0
      },
      actual: {
        calories: Number(quickLogCal),
        protein: Number(quickLogProtein),
        carbs: Number(quickLogCarbs),
        fat: Number(quickLogFat),
        fiber: 0,
        sugar: 0
      },
      adjusted: false
    };

    onLogIntake(log);
    setQuickLogName('');
    setShowQuickLogForm(false);
  };

  const handleLogMeal = (recipe: Recipe, mealLabel: string) => {
    const log: IntakeLog = {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      mealId: recipe.id,
      recipeName: recipe.name,
      planned: recipe.nutrition,
      actual: recipe.nutrition, // By default we assume they ate what was planned unless they adjust
      adjusted: false
    };
    onLogIntake(log);
    setLoggingMeal(mealLabel);
    setTimeout(() => setLoggingMeal(null), 2000);
  };

  const handleGenerateDay = async () => {
    setIsGenerating(true);
    if (onGeneratingChange) onGeneratingChange(true);
    try {
      const suggestions = await generateMealSuggestions(profile, selectedDay);
      if (suggestions && suggestions.length > 0) {
        const mealTypes = ['breakfast', 'lunch', 'snack', 'dinner'];
        suggestions.forEach((recipe, idx) => {
          if (idx < mealTypes.length) {
            const mealType = mealTypes[idx];
            const recipeId = crypto.randomUUID();
            onUpdatePlan(selectedDay, mealType, recipeId, { ...recipe, id: recipeId } as any);
          }
        });
      } else {
        alert("Não foi possível gerar sugestões suficientes. Tente novamente.");
      }
    } catch (err) {
      console.warn(err);
      alert("Erro ao gerar plano.");
    } finally {
      setIsGenerating(false);
      if (onGeneratingChange) onGeneratingChange(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="text-center space-y-4 mb-12">
        <h2 className="font-serif text-4xl md:text-5xl font-medium tracking-tight text-emerald-700 dark:text-emerald-400">
          Seu Plano Semanal
        </h2>
        <p className="font-sans text-slate-500 dark:text-slate-400 max-w-xl mx-auto text-lg leading-relaxed">
          Organize suas refeições geradas pela IA e mantenha o foco na sua rotina saudável.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1 space-y-2">
          {DAYS_OF_WEEK.map((day) => (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              className={`w-full text-left px-6 py-4 rounded-2xl transition-all duration-300 font-medium font-sans ${
                selectedDay === day
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                  : 'bg-white/40 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 hover:bg-white/60 dark:hover:bg-slate-700/60 border border-white/60 dark:border-slate-700/50 backdrop-blur-md'
              }`}
            >
              {day}
            </button>
          ))}
        </div>

        <div className="lg:col-span-3 space-y-6">
          <div className="flex justify-between items-center clay-card p-8 shadow-sm">
            <div>
              <h3 className="font-serif text-2xl font-medium text-slate-800 dark:text-slate-100">{selectedDay}</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm">Planeje suas 3 principais refeições.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={() => setIsShareModalOpen(true)}
                className="bg-indigo-50 dark:bg-indigo-900/40 hover:bg-indigo-100 dark:hover:bg-indigo-800/60 text-indigo-700 dark:text-indigo-300 font-medium px-4 py-2 rounded-full transition-colors flex items-center justify-center gap-2 text-sm"
              >
                <Share2 className="w-4 h-4" />
                Compartilhar
              </button>
              <button
                onClick={handleGenerateDay}
                disabled={isGenerating}
                className="bg-emerald-100 dark:bg-emerald-900/40 hover:bg-emerald-200 dark:hover:bg-emerald-800/60 text-emerald-700 dark:text-emerald-300 font-medium px-4 py-2 rounded-full transition-colors flex items-center justify-center gap-2 text-sm disabled:opacity-50"
              >
                {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                Auto-Completar
              </button>
            </div>
          </div>


          {/* NOVO: Acompanhamento de Calorias e Nutrientes */}
          <div className="bg-white/40 dark:bg-slate-800/40 backdrop-blur-xl rounded-[32px] clay-card p-6 md:p-8 border border-white/60 dark:border-slate-700/50 shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h4 className="font-serif text-2xl font-medium text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <PieChart className="w-6 h-6 text-emerald-500" />
                  Acompanhamento Nutricional Diário
                </h4>
                <p className="text-slate-500 dark:text-slate-400 text-sm">Acompanhe suas calorias e nutrientes contra a meta recomendada.</p>
              </div>
              <div className="grid grid-cols-2 p-1 bg-slate-100 dark:bg-slate-900/40 rounded-xl w-full sm:w-auto sm:flex sm:flex-row gap-0.5">
                <button
                  type="button"
                  onClick={() => setActiveTrackerTab('planned')}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all truncate text-center cursor-pointer ${
                    activeTrackerTab === 'planned'
                      ? 'bg-emerald-500 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                  title={`Plano (${selectedDay})`}
                >
                  <span className="truncate block">Plano ({selectedDay})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTrackerTab('actual')}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all truncate text-center cursor-pointer ${
                    activeTrackerTab === 'actual'
                      ? 'bg-emerald-500 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                  title="Consumo Real (Hoje)"
                >
                  <span className="truncate block">Consumo Real</span>
                </button>
              </div>
            </div>

            {/* Stats & Progress */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Calories radial progress representation */}
              <div className="lg:col-span-4 flex flex-col items-center justify-center p-6 bg-white/60 dark:bg-slate-800/60 backdrop-blur-md rounded-[24px] border border-white/60 dark:border-slate-700/40 shadow-sm text-center">
                <span className="text-xs uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold mb-2">Calorias Diárias</span>
                <div className="relative w-36 h-36 flex items-center justify-center">
                  {/* SVG ring */}
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="72"
                      cy="72"
                      r="60"
                      className="stroke-slate-100 dark:stroke-slate-700/40"
                      strokeWidth="10"
                      fill="transparent"
                    />
                    <circle
                      cx="72"
                      cy="72"
                      r="60"
                      className="stroke-emerald-500"
                      strokeWidth="10"
                      fill="transparent"
                      strokeDasharray={377}
                      strokeDashoffset={377 - (377 * Math.min(100, Math.round((currentNutrition.calories / recommendedNutrition.calories) * 100))) / 100}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-bold font-serif text-slate-800 dark:text-slate-100">{currentNutrition.calories}</span>
                    <span className="text-xs font-medium text-slate-400 dark:text-slate-500">de {recommendedNutrition.calories} kcal</span>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full">
                  <Activity className="w-3.5 h-3.5 text-emerald-500" />
                  {Math.round((currentNutrition.calories / recommendedNutrition.calories) * 100)}% da meta atingida
                </div>
              </div>

              {/* Macronutrient Breakdown progress bars */}
              <div className="lg:col-span-8 space-y-5">
                <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-700/40">
                  <span className="text-xs uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold">Macronutrientes</span>
                  <span className="text-xs font-medium text-slate-400 dark:text-slate-500">Consumido / Recomendado</span>
                </div>

                {/* Protein macro */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-sm font-medium">
                    <span className="text-slate-700 dark:text-slate-300 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block"></span>
                      Proteínas
                    </span>
                    <span className="font-mono text-slate-400 dark:text-slate-500">
                      <span className="font-bold text-slate-700 dark:text-slate-200">{currentNutrition.protein}g</span> / {recommendedNutrition.protein}g
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-700/40 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-blue-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.round((currentNutrition.protein / recommendedNutrition.protein) * 100))}%` }}
                    />
                  </div>
                </div>

                {/* Carbs macro */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-sm font-medium">
                    <span className="text-slate-700 dark:text-slate-300 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
                      Carboidratos
                    </span>
                    <span className="font-mono text-slate-400 dark:text-slate-500">
                      <span className="font-bold text-slate-700 dark:text-slate-200">{currentNutrition.carbs}g</span> / {recommendedNutrition.carbs}g
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-700/40 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-amber-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.round((currentNutrition.carbs / recommendedNutrition.carbs) * 100))}%` }}
                    />
                  </div>
                </div>

                {/* Fats macro */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-sm font-medium">
                    <span className="text-slate-700 dark:text-slate-300 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span>
                      Gorduras
                    </span>
                    <span className="font-mono text-slate-400 dark:text-slate-500">
                      <span className="font-bold text-slate-700 dark:text-slate-200">{currentNutrition.fat}g</span> / {recommendedNutrition.fat}g
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-700/40 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-rose-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.round((currentNutrition.fat / recommendedNutrition.fat) * 100))}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Micronutrients breakdown inside tracker */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100 dark:border-slate-700/40 text-sm">
              <div>
                <h5 className="font-bold text-xs uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">Fibras e Açúcares</h5>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 dark:bg-slate-800/30 p-3 rounded-xl border border-slate-100 dark:border-slate-700/50">
                    <p className="text-xs text-slate-400 dark:text-slate-500">Fibras Totais</p>
                    <p className="text-base font-bold text-slate-700 dark:text-slate-200 font-mono mt-0.5">{currentNutrition.fiber}g <span className="text-xs text-slate-400 font-normal">/ {recommendedNutrition.fiber}g</span></p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/30 p-3 rounded-xl border border-slate-100 dark:border-slate-700/50">
                    <p className="text-xs text-slate-400 dark:text-slate-500">Açúcares Diários</p>
                    <p className="text-base font-bold text-slate-700 dark:text-slate-200 font-mono mt-0.5">{currentNutrition.sugar}g <span className="text-xs text-slate-400 font-normal">/ max {recommendedNutrition.sugar}g</span></p>
                  </div>
                </div>
              </div>

              <div>
                <h5 className="font-bold text-xs uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">Minerais e Vitaminas Ingeridos</h5>
                <div className="bg-slate-50 dark:bg-slate-800/30 p-3 rounded-xl border border-slate-100 dark:border-slate-700/50 min-h-[4.5rem] flex flex-wrap gap-1.5 items-start content-start">
                  {currentNutrition.vitamins.length === 0 && currentNutrition.minerals.length === 0 ? (
                    <p className="text-xs text-slate-400 dark:text-slate-500 italic mt-2">Nenhum micronutriente registrado para as refeições deste dia.</p>
                  ) : (
                    <>
                      {currentNutrition.vitamins.map((v, i) => (
                        <span key={`v-${i}`} className="text-[10px] font-semibold bg-emerald-500/10 text-emerald-900 dark:text-emerald-400 px-2 py-0.5 rounded-md flex items-center gap-1">🧪 {v}</span>
                      ))}
                      {currentNutrition.minerals.map((m, i) => (
                        <span key={`m-${i}`} className="text-[10px] font-semibold bg-sky-500/10 text-sky-900 dark:text-sky-400 px-2 py-0.5 rounded-md flex items-center gap-1">💎 {m}</span>
                      ))}
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Action buttons to trigger Quick Log form */}
            <div className="flex flex-wrap justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowQuickLogForm(!showQuickLogForm)}
                className="bg-emerald-50 dark:bg-emerald-950/20 hover:bg-emerald-100/80 hover:dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 font-semibold text-xs px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 border border-emerald-500/10"
              >
                <Plus className="w-4 h-4" />
                {showQuickLogForm ? 'Fechar Registro Rápido' : 'Registro Rápido de Alimento'}
              </button>
            </div>

            {showQuickLogForm && (
              <form onSubmit={handleQuickLogSubmit} className="bg-slate-50 dark:bg-slate-900/30 p-5 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
                <div className="flex justify-between items-center pb-2 border-b border-slate-200/50 dark:border-slate-700/50">
                  <h5 className="font-serif text-base font-bold text-slate-800 dark:text-slate-200 font-bold">Registrar Alimento</h5>
                  <span className="text-[10px] font-mono tracking-wider font-extrabold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-md uppercase font-black">Ganhe +15 Pontos</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider font-bold">Nome do Alimento</label>
                    <input
                      type="text"
                      placeholder="Ex: Banana com aveia, Whey protein"
                      value={quickLogName}
                      onChange={(e) => setQuickLogName(e.target.value)}
                      required
                      className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/30 text-slate-800 dark:text-slate-100 text-sm shadow-sm"
                    />
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase font-bold">Kcal</label>
                      <input
                        type="number"
                        min="0"
                        value={quickLogCal}
                        onChange={(e) => setQuickLogCal(Number(e.target.value))}
                        required
                        className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/30 text-slate-800 dark:text-slate-100 text-sm font-mono text-center shadow-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase font-bold">Proteínas</label>
                      <input
                        type="number"
                        min="0"
                        value={quickLogProtein}
                        onChange={(e) => setQuickLogProtein(Number(e.target.value))}
                        required
                        className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/30 text-slate-800 dark:text-slate-100 text-sm font-mono text-center shadow-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase font-bold">Carbos</label>
                      <input
                        type="number"
                        min="0"
                        value={quickLogCarbs}
                        onChange={(e) => setQuickLogCarbs(Number(e.target.value))}
                        required
                        className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/30 text-slate-800 dark:text-slate-100 text-sm font-mono text-center shadow-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase font-bold">Gorduras</label>
                      <input
                        type="number"
                        min="0"
                        value={quickLogFat}
                        onChange={(e) => setQuickLogFat(Number(e.target.value))}
                        required
                        className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/30 text-slate-800 dark:text-slate-100 text-sm font-mono text-center shadow-sm"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowQuickLogForm(false)}
                    className="bg-transparent hover:bg-slate-100 text-slate-500 dark:hover:bg-slate-800 px-4 py-2 rounded-xl text-xs font-semibold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2 rounded-xl text-xs font-semibold shadow-md shadow-emerald-500/20 flex items-center gap-1"
                  >
                    Salvar Alimento
                  </button>
                </div>
              </form>
            )}
          </div>

          {MEALS.map((mealType) => {
            const recipe = dayPlan[mealType.id as keyof typeof dayPlan];
            
            return (
              <div key={mealType.id} className="bg-white/40 dark:bg-slate-800/40 backdrop-blur-xl rounded-[32px] clay-card p-6 md:p-8 border border-white/60 dark:border-slate-700/50 shadow-xl">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-serif text-2xl font-medium text-slate-800 dark:text-slate-100">
                    {mealType.label}
                  </h3>
                  {recipe && (
                    <button
                      onClick={() => onUpdatePlan(selectedDay, mealType.id, null)}
                      className="text-slate-400 hover:text-red-500 p-2 rounded-full hover:bg-white/60 dark:hover:bg-slate-700/60 transition-colors"
                      title="Remover refeição"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>

                {recipe ? (
                  <div className="flex items-center justify-between bg-white/60 dark:bg-slate-800/60 backdrop-blur-md rounded-[24px] p-4 border border-white/80 dark:border-slate-600/50 shadow-sm">
                    <div>
                      <p className="font-medium text-slate-800 dark:text-slate-200">{recipe.name}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{recipe.prepTime} • {recipe.nutrition.calories} kcal</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handleLogMeal(recipe, mealType.label)}
                        disabled={loggingMeal === mealType.label}
                        className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-all ${
                          loggingMeal === mealType.label
                          ? 'bg-emerald-500 text-white'
                          : 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100'
                        }`}
                      >
                        {loggingMeal === mealType.label ? (
                          <span className="flex items-center gap-1">✓ Logado</span>
                        ) : 'Eu comi!'}
                      </button>
                      <button 
                        onClick={() => setViewRecipe(recipe)}
                        className="text-slate-400 hover:text-emerald-500 dark:hover:text-emerald-400 p-2 transition-colors"
                      >
                        <Info className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    {addingTo?.day === selectedDay && addingTo?.meal === mealType.id ? (
                      <div className="space-y-4">
                        <select 
                          className="w-full p-4 bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border border-white/60 dark:border-slate-600/50 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500/30 font-sans text-slate-700 dark:text-slate-200 shadow-sm"
                          onChange={(e) => {
                            onUpdatePlan(selectedDay, mealType.id, e.target.value);
                            setAddingTo(null);
                          }}
                          defaultValue=""
                        >
                          <option value="" disabled>Escolha uma receita salva...</option>
                          {savedRecipes.map(r => (
                            <option key={r.id} value={r.id}>{r.name}</option>
                          ))}
                        </select>
                        <button 
                          onClick={() => setAddingTo(null)}
                          className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 font-medium px-2"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setAddingTo({ day: selectedDay, meal: mealType.id })}
                        className="w-full py-8 border-2 border-dashed border-white/80 dark:border-slate-700/50 bg-white/20 dark:bg-slate-800/20 rounded-[24px] text-slate-400 dark:text-slate-500 hover:text-emerald-500 dark:hover:text-emerald-400 hover:border-emerald-400 dark:hover:border-emerald-500 hover:bg-white/40 dark:hover:bg-slate-700/40 transition-all flex items-center justify-center gap-2 font-medium"
                      >
                        <Plus className="w-5 h-5" />
                        Adicionar Refeição
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {viewRecipe && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-transparent rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-y-auto relative shadow-2xl">
            <button 
              onClick={() => setViewRecipe(null)}
              className="absolute top-6 right-6 p-2 bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border border-white/60 dark:border-slate-600/50 rounded-full hover:bg-white dark:hover:bg-slate-700 transition-colors z-10"
            >
              <X className="w-6 h-6 text-slate-600 dark:text-slate-300" />
            </button>
            <RecipeCard recipe={viewRecipe} />
          </div>
        </div>
      )}

      {/* Modal de Compartilhamento */}
      {typeof document !== 'undefined' && (
        <AnimatePresence>
          {isShareModalOpen && (
            <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-[99999] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                className="bg-[#0b131f] text-slate-100 rounded-[28px] sm:rounded-[36px] max-w-lg w-full p-5 sm:p-7 shadow-2xl relative border border-emerald-500/30 max-h-[92vh] flex flex-col my-auto"
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-4 shrink-0 pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
                      <Share2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-serif text-lg sm:text-xl font-bold text-white leading-tight">
                        Compartilhar Plano
                      </h3>
                      <p className="text-xs text-slate-400">
                        {selectedDay} • Card de Alta Resolução
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setIsShareModalOpen(false);
                      setExportedCardUrl(null);
                    }}
                    className="p-2 hover:bg-slate-800 rounded-full transition-all text-slate-400 hover:text-white"
                    aria-label="Fechar"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Viewport Card wrapper or Exported Image */}
                <div className="flex-1 overflow-y-auto flex flex-col items-center justify-center p-2 rounded-2xl bg-slate-950/60 border border-slate-800/80 my-2">
                  {exportedCardUrl ? (
                    <div className="flex flex-col items-center justify-center p-2 space-y-3 w-full">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-950/80 px-3 py-1 rounded-full border border-emerald-500/30">
                        <Sparkles className="w-3.5 h-3.5" />
                        Imagem Gerada com Sucesso!
                      </div>
                      <img 
                        src={exportedCardUrl} 
                        alt="Card Exportado" 
                        className="max-w-[260px] sm:max-w-[300px] rounded-2xl shadow-2xl border-2 border-emerald-500/30 object-contain" 
                      />
                      <p className="text-slate-300 text-center text-[11px] max-w-xs font-medium leading-relaxed bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                        💡 <strong>Dica:</strong> Toque no botão de baixar abaixo ou <strong>pressione e segure</strong> o dedo sobre a imagem para salvar direto na sua galeria.
                      </p>
                    </div>
                  ) : (
                    <div 
                      ref={shareCardRef}
                      id="mealplan-social-share-card"
                      className="w-[320px] sm:w-[340px] bg-[#0c1626] p-5 sm:p-6 rounded-[24px] relative overflow-hidden flex flex-col text-white shadow-2xl border border-emerald-500/30"
                    >
                      {/* Header Branding */}
                      <div className="flex items-center justify-between border-b border-emerald-500/20 pb-3 mb-4">
                        <div className="flex items-center gap-2">
                          <span className="text-base">🥗</span>
                          <span className="font-serif text-sm font-black tracking-widest text-emerald-400 uppercase">
                            NutriAI
                          </span>
                        </div>
                        <span className="text-[9px] uppercase tracking-widest font-black text-emerald-300 bg-emerald-950 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                          Planejamento Alimentar
                        </span>
                      </div>

                      {/* Main Content */}
                      <div className="flex-1 flex flex-col gap-3">
                        <h2 className="text-xl sm:text-2xl font-black font-serif tracking-tight text-white">
                          {selectedDay}
                        </h2>
                        
                        <div className="space-y-2">
                          {['Café da Manhã', 'Almoço', 'Jantar'].map((mealType) => {
                            const mealKey = mealType === 'Café da Manhã' ? 'breakfast' : mealType === 'Almoço' ? 'lunch' : 'dinner';
                            const mealItem = mealPlan[selectedDay]?.meals?.[mealKey as 'breakfast' | 'lunch' | 'dinner'];
                            return (
                              <div key={mealType} className="bg-[#112033] border border-slate-700/60 rounded-xl p-2.5">
                                <p className="text-[9px] text-emerald-400 uppercase tracking-widest font-black mb-0.5">{mealType}</p>
                                {mealItem ? (
                                  <p className="text-xs font-semibold text-white/95 leading-tight">
                                    {mealItem.name}
                                  </p>
                                ) : (
                                  <p className="text-xs text-slate-400 italic">Não planejado</p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Footer */}
                      <div className="pt-3 mt-4 border-t border-slate-800 flex justify-between items-center text-[10px] uppercase tracking-widest font-black text-slate-400">
                        <span>Total Estimado</span>
                        <span className="text-emerald-400 text-xs font-black">
                          {Math.round(
                            Object.values(dayPlan).reduce((acc: number, curr: any) => acc + (curr?.nutrition?.calories || 0), 0)
                          )} kcal
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions Footer */}
                <div className="mt-4 flex flex-col sm:flex-row gap-2.5 shrink-0 pt-2">
                  {exportedCardUrl ? (
                    <>
                      <button
                        onClick={() => {
                          if (exportedBlobUrl) {
                            downloadBlobUrl(exportedBlobUrl, `plano-alimentar-${selectedDay.toLowerCase().replace(/[^a-z0-9]/g, '-')}.png`);
                          } else if (exportedCardUrl) {
                            downloadBlobUrl(exportedCardUrl, `plano-alimentar-${selectedDay.toLowerCase().replace(/[^a-z0-9]/g, '-')}.png`);
                          }
                        }}
                        className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black text-xs sm:text-sm transition-all shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 border border-emerald-400/30"
                      >
                        <Download className="w-4 h-4" />
                        <span>Baixar Arquivo</span>
                      </button>

                      {exportedBlobUrl && (
                        <button
                          onClick={() => window.open(exportedBlobUrl, '_blank')}
                          className="py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-2xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 border border-slate-700"
                        >
                          <ExternalLink className="w-4 h-4" />
                          <span>Abrir Imagem</span>
                        </button>
                      )}

                      <button
                        onClick={() => setExportedCardUrl(null)}
                        className="py-3 px-4 bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white rounded-2xl font-bold text-xs transition-all border border-slate-700"
                      >
                        Voltar
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => setIsShareModalOpen(false)}
                        className="flex-1 py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl font-bold text-xs sm:text-sm transition-all border border-slate-700"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleExportCard}
                        disabled={isExportingCard}
                        className="flex-1 py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-2xl font-black text-xs sm:text-sm transition-all shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed border border-emerald-400/30"
                      >
                        {isExportingCard ? (
                          <><Loader2 className="w-4 h-4 animate-spin" /> Gerando Imagem...</>
                        ) : (
                          <><Download className="w-4 h-4" /> Baixar Imagem</>
                        )}
                      </button>
                    </>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}
