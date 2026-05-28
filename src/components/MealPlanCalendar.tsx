import React, { useState } from 'react';
import { MealPlan, Recipe, UserProfile, IntakeLog } from '../types';
import { Plus, X, Wand2, Loader2, Info, PieChart, Activity } from 'lucide-react';
import { RecipeCard } from './RecipeCard';
import { generateMealSuggestions } from '../lib/gemini';

interface MealPlanProps {
  mealPlan: MealPlan;
  savedRecipes: Recipe[];
  onUpdatePlan: (day: string, mealName: string, recipeId: string | null, recipeObj?: Recipe) => void;
  onLogIntake: (log: IntakeLog) => void;
  profile: UserProfile | null;
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

export function MealPlanView({ mealPlan, savedRecipes, onUpdatePlan, onLogIntake, profile }: MealPlanProps) {
  const [selectedDay, setSelectedDay] = useState<string>(DAYS_OF_WEEK[0]);
  const [addingTo, setAddingTo] = useState<{day: string, meal: string} | null>(null);
  const [viewRecipe, setViewRecipe] = useState<Recipe | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [loggingMeal, setLoggingMeal] = useState<string | null>(null);

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
        protein: profile.masterPlan.macros.protein,
        carbs: profile.masterPlan.macros.carbs,
        fat: profile.masterPlan.macros.fat,
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
    try {
      const suggestions = await generateMealSuggestions(profile, selectedDay);
      if (suggestions && suggestions.length === 3) {
        // Assign to breakfast, lunch, dinner
        const ids = [crypto.randomUUID(), crypto.randomUUID(), crypto.randomUUID()];
        onUpdatePlan(selectedDay, 'breakfast', ids[0], { ...suggestions[0], id: ids[0] });
        onUpdatePlan(selectedDay, 'lunch', ids[1], { ...suggestions[1], id: ids[1] });
        onUpdatePlan(selectedDay, 'dinner', ids[2], { ...suggestions[2], id: ids[2] });
      } else {
        alert("Não foi possível gerar sugestões suficientes. Tente novamente.");
      }
    } catch (err) {
      console.error(err);
      alert("Erro ao gerar plano.");
    } finally {
      setIsGenerating(false);
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
            <button
              onClick={handleGenerateDay}
              disabled={isGenerating}
              className="bg-emerald-100 dark:bg-emerald-900/40 hover:bg-emerald-200 dark:hover:bg-emerald-800/60 text-emerald-700 dark:text-emerald-300 font-medium px-4 py-2 rounded-full transition-colors flex items-center gap-2 text-sm disabled:opacity-50"
            >
              {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
              Auto-Completar Dia com IA
            </button>
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
              <div className="flex bg-slate-100 dark:bg-slate-900/40 p-1 rounded-xl w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setActiveTrackerTab('planned')}
                  className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                    activeTrackerTab === 'planned'
                      ? 'bg-emerald-500 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  Plano ({selectedDay})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTrackerTab('actual')}
                  className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                    activeTrackerTab === 'actual'
                      ? 'bg-emerald-500 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  Consumo Real (Hoje)
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
                  <div className="grid grid-cols-4 gap-2">
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
    </div>
  );
}
