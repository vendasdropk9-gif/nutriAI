import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useLocalStorage } from './hooks/useLocalStorage';
import { Recipe, MealPlan, UserProfile } from './types';
import { Generator } from './components/Generator';
import { MealPlanView } from './components/MealPlanCalendar';
import { ShoppingListView } from './components/ShoppingListView';
import { Profile } from './components/Profile';
import { PlateAnalyzer } from './components/PlateAnalyzer';
import { JourneyVisualizer } from './components/JourneyVisualizer';
import { JuiceGenerator } from './components/JuiceGenerator';
import { BarcodeScanner } from './components/BarcodeScanner';
import { EmotionalTracker } from './components/EmotionalTracker';
import { ChallengeView } from './components/ChallengeView';
import { HydrationTracker } from './components/HydrationTracker';
import { SmartSwaps } from './components/SmartSwaps';
import { DiningOut } from './components/DiningOut';
import { RankingView } from './components/RankingView';
import { FoodGalleryBanner } from './components/FoodGalleryBanner';
import { ResultPrediction } from './components/ResultPrediction';
import { PersonalTrainer } from './components/PersonalTrainer';
import { Marketplace } from './components/Marketplace';
import { Pricing } from './components/Pricing';
import { PartnerPortal } from './components/PartnerPortal';
import { FreshnessMap } from './components/FreshnessMap';
import { AdaptiveCoach } from './components/AdaptiveCoach';
import { SmartChat } from './components/SmartChat';
import { Utensils, CalendarDays, ShoppingBasket, User, Camera, Sparkles, Moon, Sun, GlassWater, Barcode, Brain, Trophy, Droplet, RefreshCw, ChefHat, Medal, TrendingUp, Dumbbell, Store, Crown, Map as MapIcon, Zap } from 'lucide-react';
import { IntakeLog } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<'generator' | 'plan' | 'shopping' | 'profile' | 'analyzer' | 'journey' | 'juice' | 'barcode' | 'emotional' | 'challenge' | 'hydration' | 'swaps' | 'dining' | 'ranking' | 'prediction' | 'trainer' | 'market' | 'pricing' | 'partner' | 'frescor' | 'coach'>('market');

  const handleLogIntake = (log: IntakeLog) => {
    setProfile(prev => {
      if (!prev) return null;
      const logs = prev.intakeLogs || [];
      return {
        ...prev,
        intakeLogs: [...logs, log]
      };
    });
    awardPoints(15, 'Refeição registrada no plano');
  };

  
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
      awardPoints(20, 'Nova receita gerada');
      return [recipe, ...prev];
    });
  };

  const awardPoints = (amount: number, reason: string) => {
    setProfile(prev => {
      if (!prev) return null;
      const newPoints = (prev.points || 0) + amount;
      const newEntry = {
        id: crypto.randomUUID(),
        date: new Date().toISOString(),
        amount,
        reason
      };
      return {
        ...prev,
        points: newPoints,
        pointsHistory: [...(prev.pointsHistory || []), newEntry]
      };
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
    <div className="min-h-screen bg-[#f8fafc] dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-sans relative selection:bg-emerald-500/20 selection:text-emerald-700 dark:selection:text-emerald-400 flex flex-col transition-colors duration-500">
      {/* Mesh Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-200/40 dark:bg-emerald-900/40 blur-[100px] transition-colors duration-1000"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-orange-200/30 dark:bg-orange-900/20 blur-[120px] transition-colors duration-1000"></div>
        <div className="absolute top-[20%] right-[10%] w-[40%] h-[40%] rounded-full bg-sky-100/50 dark:bg-sky-900/30 blur-[100px] transition-colors duration-1000"></div>
      </div>

      <header className="relative z-10 bg-white/40 dark:bg-slate-900/60 backdrop-blur-md border-b border-white/60 dark:border-slate-800/50 sticky top-0 transition-colors duration-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center py-4 md:py-0 md:h-20 gap-4">
            <div className="flex items-center gap-3 text-emerald-600 dark:text-emerald-400">
              <Utensils className="w-8 h-8" />
              <span className="font-serif text-2xl font-semibold tracking-wide">NutriAI</span>
            </div>
            
            <nav className="flex items-center gap-2 md:gap-4 bg-white/40 dark:bg-slate-800/50 p-1.5 rounded-full border border-white/60 dark:border-slate-700/50 backdrop-blur-md shadow-sm transition-colors duration-500 overflow-x-auto max-w-full hide-scrollbar">
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.95 }}
                onClick={() => setActiveTab('coach')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300 whitespace-nowrap ${
                  activeTab === 'coach' 
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg border border-transparent' 
                  : 'text-emerald-700 hover:bg-white/60 hover:text-emerald-900 dark:text-emerald-400 dark:hover:text-amber-200 dark:hover:bg-slate-800/40'
                }`}
              >
                <Zap className="w-4 h-4 shrink-0" />
                <span className="hidden md:inline font-bold italic">Coach IA</span>
              </motion.button>

              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.95 }}
                onClick={() => setActiveTab('generator')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300 whitespace-nowrap ${
                  activeTab === 'generator' 
                  ? 'bg-white text-emerald-600 shadow-sm border border-white/80 dark:bg-slate-800 dark:text-emerald-400 dark:border-slate-700' 
                  : 'text-slate-500 hover:text-slate-700 hover:bg-white/40 dark:text-slate-400 dark:hover:text-amber-200 dark:hover:bg-slate-800/40'
                }`}
              >
                <Utensils className="w-4 h-4 shrink-0" />
                <span className="hidden md:inline">Receitas</span>
              </motion.button>

              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.95 }}
                onClick={() => setActiveTab('juice')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300 whitespace-nowrap ${
                  activeTab === 'juice' 
                  ? 'bg-white text-emerald-600 shadow-sm border border-white/80 dark:bg-slate-800 dark:text-emerald-400 dark:border-slate-700' 
                  : 'text-slate-500 hover:text-slate-700 hover:bg-white/40 dark:text-slate-400 dark:hover:text-amber-200 dark:hover:bg-slate-800/40'
                }`}
              >
                <GlassWater className="w-4 h-4 shrink-0" />
                <span className="hidden md:inline">Sucos Detox</span>
              </motion.button>

              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.95 }}
                onClick={() => setActiveTab('hydration')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300 whitespace-nowrap ${
                  activeTab === 'hydration' 
                  ? 'bg-white text-emerald-600 shadow-sm border border-white/80 dark:bg-slate-800 dark:text-emerald-400 dark:border-slate-700' 
                  : 'text-slate-500 hover:text-slate-700 hover:bg-white/40 dark:text-slate-400 dark:hover:text-amber-200 dark:hover:bg-slate-800/40'
                }`}
              >
                <Droplet className="w-4 h-4 shrink-0" />
                <span className="hidden md:inline">Água</span>
              </motion.button>

              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.95 }}
                onClick={() => setActiveTab('barcode')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300 whitespace-nowrap ${
                  activeTab === 'barcode' 
                  ? 'bg-white text-emerald-600 shadow-sm border border-white/80 dark:bg-slate-800 dark:text-emerald-400 dark:border-slate-700' 
                  : 'text-slate-500 hover:text-slate-700 hover:bg-white/40 dark:text-slate-400 dark:hover:text-amber-200 dark:hover:bg-slate-800/40'
                }`}
              >
                <Barcode className="w-4 h-4 shrink-0" />
                <span className="hidden md:inline">Scanner</span>
              </motion.button>

              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.95 }}
                onClick={() => setActiveTab('emotional')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300 whitespace-nowrap ${
                  activeTab === 'emotional' 
                  ? 'bg-white text-emerald-600 shadow-sm border border-white/80 dark:bg-slate-800 dark:text-emerald-400 dark:border-slate-700' 
                  : 'text-slate-500 hover:text-slate-700 hover:bg-white/40 dark:text-slate-400 dark:hover:text-amber-200 dark:hover:bg-slate-800/40'
                }`}
              >
                <Brain className="w-4 h-4 shrink-0" />
                <span className="hidden md:inline">Mente</span>
              </motion.button>

              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.95 }}
                onClick={() => setActiveTab('analyzer')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300 whitespace-nowrap ${
                  activeTab === 'analyzer' 
                  ? 'bg-white text-emerald-600 shadow-sm border border-white/80 dark:bg-slate-800 dark:text-emerald-400 dark:border-slate-700' 
                  : 'text-slate-500 hover:text-slate-700 hover:bg-white/40 dark:text-slate-400 dark:hover:text-amber-200 dark:hover:bg-slate-800/40'
                }`}
              >
                <Camera className="w-4 h-4 shrink-0" />
                <span className="hidden md:inline">Análise</span>
              </motion.button>
              
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.95 }}
                onClick={() => setActiveTab('plan')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300 whitespace-nowrap ${
                  activeTab === 'plan' 
                  ? 'bg-white text-emerald-600 shadow-sm border border-white/80 dark:bg-slate-800 dark:text-emerald-400 dark:border-slate-700' 
                  : 'text-slate-500 hover:text-slate-700 hover:bg-white/40 dark:text-slate-400 dark:hover:text-amber-200 dark:hover:bg-slate-800/40'
                }`}
              >
                <CalendarDays className="w-4 h-4 shrink-0" />
                <span className="hidden md:inline">Plano</span>
              </motion.button>

              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.95 }}
                onClick={() => setActiveTab('shopping')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300 whitespace-nowrap ${
                  activeTab === 'shopping' 
                  ? 'bg-white text-emerald-600 shadow-sm border border-white/80 dark:bg-slate-800 dark:text-emerald-400 dark:border-slate-700' 
                  : 'text-slate-500 hover:text-slate-700 hover:bg-white/40 dark:text-slate-400 dark:hover:text-amber-200 dark:hover:bg-slate-800/40'
                }`}
              >
                <ShoppingBasket className="w-4 h-4 shrink-0" />
                <span className="hidden md:inline">Compras</span>
              </motion.button>
              
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.95 }}
                onClick={() => setActiveTab('journey')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300 whitespace-nowrap ${
                  activeTab === 'journey' 
                  ? 'bg-gradient-to-r from-emerald-500 to-indigo-500 text-white shadow-md border border-transparent' 
                  : 'text-indigo-600 hover:bg-white/60 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 dark:hover:bg-slate-800/40'
                }`}
              >
                <Sparkles className="w-4 h-4 shrink-0" />
                <span className="hidden md:inline">Evolução</span>
              </motion.button>

              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.95 }}
                onClick={() => setActiveTab('challenge')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300 whitespace-nowrap ${
                  activeTab === 'challenge' 
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md border border-transparent' 
                  : 'text-orange-600 hover:bg-white/60 hover:text-orange-800 dark:text-orange-400 dark:hover:text-orange-300 dark:hover:bg-slate-800/40'
                }`}
              >
                <Trophy className="w-4 h-4 shrink-0" />
                <span className="hidden md:inline">Desafio</span>
              </motion.button>

              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.95 }}
                onClick={() => setActiveTab('swaps')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300 whitespace-nowrap ${
                  activeTab === 'swaps' 
                  ? 'bg-white text-emerald-600 shadow-sm border border-white/80 dark:bg-slate-800 dark:text-emerald-400 dark:border-slate-700' 
                  : 'text-slate-500 hover:text-slate-700 hover:bg-white/40 dark:text-slate-400 dark:hover:text-amber-200 dark:hover:bg-slate-800/40'
                }`}
              >
                <RefreshCw className="w-4 h-4 shrink-0" />
                <span className="hidden md:inline">Trocas</span>
              </motion.button>

              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.95 }}
                onClick={() => setActiveTab('dining')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300 whitespace-nowrap ${
                  activeTab === 'dining' 
                  ? 'bg-white text-emerald-600 shadow-sm border border-white/80 dark:bg-slate-800 dark:text-emerald-400 dark:border-slate-700' 
                  : 'text-slate-500 hover:text-slate-700 hover:bg-white/40 dark:text-slate-400 dark:hover:text-amber-200 dark:hover:bg-slate-800/40'
                }`}
              >
                <ChefHat className="w-4 h-4 shrink-0" />
                <span className="hidden md:inline">Comi Fora</span>
              </motion.button>

              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.95 }}
                onClick={() => setActiveTab('market')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300 whitespace-nowrap ${
                  activeTab === 'market' 
                  ? 'bg-emerald-600 text-white shadow-xl shadow-emerald-600/20' 
                  : 'text-slate-500 hover:text-slate-700 hover:bg-white/40 dark:text-slate-400 dark:hover:text-emerald-400 dark:hover:bg-slate-800/40'
                }`}
              >
                <Store className="w-4 h-4 shrink-0" />
                <span className="hidden md:inline">Market</span>
              </motion.button>

              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.95 }}
                onClick={() => setActiveTab('frescor')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300 whitespace-nowrap ${
                  activeTab === 'frescor' 
                  ? 'bg-emerald-100 text-emerald-600 border border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800' 
                  : 'text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:text-slate-400 dark:hover:text-emerald-400 dark:hover:bg-slate-800/40'
                }`}
              >
                <MapIcon className="w-4 h-4 shrink-0" />
                <span className="hidden md:inline font-bold">Mapa de Frescor</span>
              </motion.button>

              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.95 }}
                onClick={() => setActiveTab('trainer')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300 whitespace-nowrap ${
                  activeTab === 'trainer' 
                  ? 'bg-slate-900 text-white shadow-xl shadow-slate-900/20' 
                  : 'text-slate-500 hover:text-slate-700 hover:bg-white/40 dark:text-slate-400 dark:hover:text-emerald-400 dark:hover:bg-slate-800/40'
                }`}
              >
                <Dumbbell className="w-4 h-4 shrink-0" />
                <span className="hidden md:inline">Treinar</span>
              </motion.button>

              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.95 }}
                onClick={() => setActiveTab('ranking')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300 whitespace-nowrap ${
                  activeTab === 'ranking' 
                  ? 'bg-gradient-to-r from-amber-400 to-yellow-600 text-white shadow-md border border-transparent' 
                  : 'text-amber-600 hover:bg-white/60 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-300 dark:hover:bg-slate-800/40'
                }`}
              >
                <Medal className="w-4 h-4 shrink-0" />
                <span className="hidden md:inline">Ranking</span>
              </motion.button>

              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.95 }}
                onClick={() => setActiveTab('prediction')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300 whitespace-nowrap ${
                  activeTab === 'prediction' 
                  ? 'bg-white text-emerald-600 shadow-sm border border-white/80 dark:bg-slate-800 dark:text-emerald-400 dark:border-slate-700' 
                  : 'text-slate-500 hover:text-slate-700 hover:bg-white/40 dark:text-slate-400 dark:hover:text-amber-200 dark:hover:bg-slate-800/40'
                }`}
              >
                <TrendingUp className="w-4 h-4 shrink-0" />
                <span className="hidden md:inline">Previsão</span>
              </motion.button>

              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.95 }}
                onClick={() => setActiveTab('profile')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300 whitespace-nowrap ${
                  activeTab === 'profile' 
                  ? 'bg-white text-emerald-600 shadow-sm border border-white/80 dark:bg-slate-800 dark:text-emerald-400 dark:border-slate-700' 
                  : 'text-slate-500 hover:text-slate-700 hover:bg-white/40 dark:text-slate-400 dark:hover:text-amber-200 dark:hover:bg-slate-800/40'
                }`}
              >
                <User className="w-4 h-4 shrink-0" />
                <span className="hidden md:inline">Perfil</span>
              </motion.button>
              
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.95 }}
                onClick={() => setActiveTab('pricing')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300 whitespace-nowrap ${
                  activeTab === 'pricing' 
                  ? 'bg-gradient-to-r from-amber-400 to-amber-600 text-white shadow-xl shadow-amber-500/20' 
                  : 'text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-slate-800/40'
                }`}
              >
                <Crown className="w-4 h-4 shrink-0" />
                <span className="hidden md:inline text-amber-500 font-bold uppercase tracking-tighter text-xs">Premium</span>
              </motion.button>
              
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.95 }}
                onClick={() => setActiveTab('partner')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300 whitespace-nowrap ${
                  activeTab === 'partner' 
                  ? 'bg-emerald-100 text-emerald-600 shadow-sm border border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800' 
                  : 'text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:text-slate-400 dark:hover:text-emerald-300 dark:hover:bg-slate-800/40'
                }`}
              >
                <Store className="w-4 h-4 shrink-0" />
                <span className="hidden md:inline font-bold">Seja Parceiro</span>
              </motion.button>

              <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1 shrink-0"></div>
              
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.95 }}
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="p-2.5 rounded-full text-slate-500 hover:text-amber-500 hover:bg-amber-50 dark:text-slate-400 dark:hover:text-amber-300 dark:hover:bg-slate-800 transition-colors shrink-0"
                title={isDarkMode ? "Mudar para modo claro" : "Mudar para modo escuro"}
              >
                {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </motion.button>
            </nav>
          </div>
        </div>
      </header>

      <main className={`relative z-10 flex-1 w-full mx-auto transition-all duration-500 ${
        activeTab === 'frescor' 
        ? 'max-w-none px-0 py-0 flex flex-col' 
        : 'max-w-7xl px-4 sm:px-6 lg:px-8 py-12 md:py-20'
      }`}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10, filter: 'blur(5px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -10, filter: 'blur(5px)' }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="w-full h-full flex flex-col"
          >
            {(activeTab === 'generator' || activeTab === 'plan') && (
              <FoodGalleryBanner onNavigateToMarket={() => setActiveTab('market')} />
            )}
            {activeTab === 'generator' && (
              <Generator onSaveRecipe={handleSaveRecipe} profile={profile} onAwardPoints={awardPoints} />
            )}
            {activeTab === 'juice' && (
              <JuiceGenerator profile={profile} onAwardPoints={awardPoints} />
            )}
            {activeTab === 'hydration' && (
              <HydrationTracker 
                profile={profile} 
                onUpdateProtocol={(goal, logs) => setProfile(prev => prev ? { ...prev, waterGoal: goal, hydrationLogs: logs } : null)} 
                onAwardPoints={awardPoints}
              />
            )}
            {activeTab === 'barcode' && (
              <BarcodeScanner profile={profile} />
            )}
            {activeTab === 'emotional' && (
              <EmotionalTracker 
                profile={profile} 
                onUpdateLogs={(newLogs) => setProfile(prev => prev ? { ...prev, emotionalLogs: newLogs } : null)} 
              />
            )}
            {activeTab === 'plan' && (
              <MealPlanView 
                mealPlan={mealPlan} 
                savedRecipes={savedRecipes} 
                onUpdatePlan={handleUpdatePlan} 
                onLogIntake={handleLogIntake}
                profile={profile}
              />
            )}
            {activeTab === 'coach' && (
              <AdaptiveCoach 
                profile={profile} 
                onUpdateProfile={setProfile}
                onUpdatePlan={handleUpdatePlan}
              />
            )}
            {activeTab === 'shopping' && (
              <ShoppingListView mealPlan={mealPlan} />
            )}
            {activeTab === 'profile' && (
              <Profile profile={profile} onSaveProfile={setProfile} />
            )}
            {activeTab === 'ranking' && (
              <RankingView profile={profile} />
            )}
            {activeTab === 'market' && (
              <Marketplace 
                profile={profile} 
                onUpdateCart={(cart) => setProfile(prev => prev ? { ...prev, cart } : null)} 
                onUpdateFavorites={(favorites) => setProfile(prev => prev ? { ...prev, favorites } : null)}
                onOpenPartner={() => setActiveTab('partner')}
                onOpenMap={() => setActiveTab('frescor')}
              />
            )}
            {activeTab === 'frescor' && (
              <FreshnessMap onBack={() => setActiveTab('market')} />
            )}
            {activeTab === 'trainer' && (
              <PersonalTrainer profile={profile} onAwardPoints={awardPoints} onUpdateProfile={setProfile} />
            )}
            {activeTab === 'prediction' && (
              <ResultPrediction 
                profile={profile} 
                onUpdatePrediction={(prediction) => setProfile(prev => prev ? { ...prev, prediction } : null)} 
              />
            )}
            {activeTab === 'analyzer' && (
              <PlateAnalyzer onAwardPoints={awardPoints} />
            )}
            {activeTab === 'journey' && (
              <JourneyVisualizer profile={profile} />
            )}
            {activeTab === 'challenge' && (
              <ChallengeView 
                profile={profile} 
                onUpdateChallenge={(challenge) => setProfile(prev => prev ? { ...prev, currentChallenge: challenge } : null)} 
                onAwardPoints={awardPoints}
              />
            )}
            {activeTab === 'swaps' && (
              <SmartSwaps profile={profile} onAwardPoints={awardPoints} />
            )}
            {activeTab === 'dining' && (
              <DiningOut profile={profile} onAwardPoints={awardPoints} />
            )}
            {activeTab === 'pricing' && (
              <Pricing />
            )}
            {activeTab === 'partner' && (
              <PartnerPortal />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      <SmartChat profile={profile} onNavigate={(tab) => setActiveTab(tab as any)} />
    </div>
  );
}
