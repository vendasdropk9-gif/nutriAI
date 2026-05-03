import React, { useState } from 'react';
import { MealPlan, Recipe, UserProfile, IntakeLog } from '../types';
import { Plus, X, Wand2, Loader2, Info } from 'lucide-react';
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

  const dayPlan = mealPlan[selectedDay]?.meals || {};

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
          <div className="flex justify-between items-center bg-white/40 dark:bg-slate-800/40 backdrop-blur-md p-6 rounded-[32px] border border-white/60 dark:border-slate-700/50 shadow-sm">
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

          {MEALS.map((mealType) => {
            const recipe = dayPlan[mealType.id as keyof typeof dayPlan];
            
            return (
              <div key={mealType.id} className="bg-white/40 dark:bg-slate-800/40 backdrop-blur-xl rounded-[32px] p-6 md:p-8 border border-white/60 dark:border-slate-700/50 shadow-xl">
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
