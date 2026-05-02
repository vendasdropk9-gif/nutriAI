import React, { useState, useEffect } from 'react';
import { useLocalStorage } from './hooks/useLocalStorage';
import { Recipe, MealPlan, UserProfile } from './types';
import { Generator } from './components/Generator';
import { MealPlanView } from './components/MealPlanCalendar';
import { ShoppingListView } from './components/ShoppingListView';
import { Profile } from './components/Profile';
import { AssistantButton } from './components/AssistantButton';
import { PlateAnalyzer } from './components/PlateAnalyzer';
import { JourneyVisualizer } from './components/JourneyVisualizer';
import { Utensils, CalendarDays, ShoppingBasket, User, Camera, Sparkles, Moon, Sun } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'generator' | 'plan' | 'shopping' | 'profile' | 'analyzer' | 'journey'>('generator');
  
  const [isDarkMode, setIsDarkMode] = useLocalStorage<boolean>('nutri-dark-mode', false);
  const [savedRecipes, setSavedRecipes] = useLocalStorage<Recipe[]>('nutri-recipes', []);
  const [mealPlan, setMealPlan] = useLocalStorage<MealPlan>('nutri-mealplan', {});
  const [profile, setProfile] = useLocalStorage<UserProfile | null>('nutri-profile', null);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const handleSaveRecipe = (recipe: Recipe) => {
    setSavedRecipes(prev => {
      if (prev.find(r => r.id === recipe.id)) return prev;
      return [recipe, ...prev];
    });
  };

  const handleUpdatePlan = (day: string, mealName: string, recipeId: string | null, recipeObj?: Recipe) => {
    setMealPlan(prev => {
      const newPlan = { ...prev };
      if (!newPlan[day]) {
        newPlan[day] = { date: day, meals: {} };
      }
      
      if (recipeObj) {
        newPlan[day].meals[mealName as 'breakfast' | 'lunch' | 'snack' | 'dinner'] = recipeObj;
        // Optionally save to generic saved recipes, too
        setSavedRecipes(prev => {
          if (prev.find(r => r.id === recipeObj.id)) return prev;
          return [recipeObj, ...prev];
        });
      } else if (recipeId) {
        const recipe = savedRecipes.find(r => r.id === recipeId);
        newPlan[day].meals[mealName as 'breakfast' | 'lunch' | 'snack' | 'dinner'] = recipe;
      } else {
        delete newPlan[day].meals[mealName as 'breakfast' | 'lunch' | 'snack' | 'dinner'];
      }
      
      return newPlan;
    });
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-sans relative overflow-hidden selection:bg-emerald-500/20 selection:text-emerald-700 dark:selection:text-emerald-400 flex flex-col transition-colors duration-500">
      {/* Mesh Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-200/40 dark:bg-emerald-900/40 blur-[100px] transition-colors duration-1000"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-orange-200/30 dark:bg-orange-900/20 blur-[120px] transition-colors duration-1000"></div>
        <div className="absolute top-[20%] right-[10%] w-[40%] h-[40%] rounded-full bg-sky-100/50 dark:bg-sky-900/30 blur-[100px] transition-colors duration-1000"></div>
      </div>

      <header className="relative z-10 bg-white/40 dark:bg-slate-900/60 backdrop-blur-md border-b border-white/60 dark:border-slate-800/50 sticky top-0 transition-colors duration-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center gap-3 text-emerald-600 dark:text-emerald-400">
              <Utensils className="w-8 h-8" />
              <span className="font-serif text-2xl font-semibold tracking-wide">NutriAI</span>
            </div>
            
            <nav className="flex items-center gap-2 md:gap-4 bg-white/40 dark:bg-slate-800/50 p-1.5 rounded-full border border-white/60 dark:border-slate-700/50 backdrop-blur-md shadow-sm transition-colors duration-500">
              <button
                onClick={() => setActiveTab('generator')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${
                  activeTab === 'generator' 
                  ? 'bg-white text-emerald-600 shadow-sm border border-white/80 dark:bg-slate-800 dark:text-emerald-400 dark:border-slate-700' 
                  : 'text-slate-500 hover:text-slate-700 hover:bg-white/40 dark:text-slate-400 dark:hover:text-amber-200 dark:hover:bg-slate-800/40'
                }`}
              >
                <Utensils className="w-4 h-4" />
                <span className="hidden md:inline">Receitas</span>
              </button>

              <button
                onClick={() => setActiveTab('analyzer')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${
                  activeTab === 'analyzer' 
                  ? 'bg-white text-emerald-600 shadow-sm border border-white/80 dark:bg-slate-800 dark:text-emerald-400 dark:border-slate-700' 
                  : 'text-slate-500 hover:text-slate-700 hover:bg-white/40 dark:text-slate-400 dark:hover:text-amber-200 dark:hover:bg-slate-800/40'
                }`}
              >
                <Camera className="w-4 h-4" />
                <span className="hidden md:inline">Análise</span>
              </button>
              
              <button
                onClick={() => setActiveTab('plan')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${
                  activeTab === 'plan' 
                  ? 'bg-white text-emerald-600 shadow-sm border border-white/80 dark:bg-slate-800 dark:text-emerald-400 dark:border-slate-700' 
                  : 'text-slate-500 hover:text-slate-700 hover:bg-white/40 dark:text-slate-400 dark:hover:text-amber-200 dark:hover:bg-slate-800/40'
                }`}
              >
                <CalendarDays className="w-4 h-4" />
                <span className="hidden md:inline">Plano</span>
              </button>

              <button
                onClick={() => setActiveTab('shopping')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${
                  activeTab === 'shopping' 
                  ? 'bg-white text-emerald-600 shadow-sm border border-white/80 dark:bg-slate-800 dark:text-emerald-400 dark:border-slate-700' 
                  : 'text-slate-500 hover:text-slate-700 hover:bg-white/40 dark:text-slate-400 dark:hover:text-amber-200 dark:hover:bg-slate-800/40'
                }`}
              >
                <ShoppingBasket className="w-4 h-4" />
                <span className="hidden md:inline">Compras</span>
              </button>
              
              <button
                onClick={() => setActiveTab('journey')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${
                  activeTab === 'journey' 
                  ? 'bg-gradient-to-r from-emerald-500 to-indigo-500 text-white shadow-md border border-transparent' 
                  : 'text-indigo-600 hover:bg-white/60 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 dark:hover:bg-slate-800/40'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                <span className="hidden md:inline">Evolução</span>
              </button>

              <button
                onClick={() => setActiveTab('profile')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${
                  activeTab === 'profile' 
                  ? 'bg-white text-emerald-600 shadow-sm border border-white/80 dark:bg-slate-800 dark:text-emerald-400 dark:border-slate-700' 
                  : 'text-slate-500 hover:text-slate-700 hover:bg-white/40 dark:text-slate-400 dark:hover:text-amber-200 dark:hover:bg-slate-800/40'
                }`}
              >
                <User className="w-4 h-4" />
                <span className="hidden md:inline">Perfil</span>
              </button>
              
              <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1"></div>
              
              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="p-2.5 rounded-full text-slate-500 hover:text-amber-500 hover:bg-amber-50 dark:text-slate-400 dark:hover:text-amber-300 dark:hover:bg-slate-800 transition-colors"
                title={isDarkMode ? "Mudar para modo claro" : "Mudar para modo escuro"}
              >
                {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
            </nav>
          </div>
        </div>
      </header>

      <main className="relative z-10 flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">
        {activeTab === 'generator' && (
          <Generator onSaveRecipe={handleSaveRecipe} profile={profile} />
        )}
        {activeTab === 'plan' && (
          <MealPlanView 
            mealPlan={mealPlan} 
            savedRecipes={savedRecipes} 
            onUpdatePlan={handleUpdatePlan} 
            profile={profile}
          />
        )}
        {activeTab === 'shopping' && (
          <ShoppingListView mealPlan={mealPlan} />
        )}
        {activeTab === 'profile' && (
          <Profile profile={profile} onSaveProfile={setProfile} />
        )}
        {activeTab === 'analyzer' && (
          <PlateAnalyzer />
        )}
        {activeTab === 'journey' && (
          <JourneyVisualizer profile={profile} />
        )}
      </main>

      <AssistantButton profile={profile} />
    </div>
  );
}
