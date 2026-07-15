import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useLocalStorage } from './hooks/useLocalStorage';
import { Recipe, MealPlan, UserProfile } from './types';
import { useAuth } from './contexts/AuthContext';
import { Login } from './components/Login';
import { LockScreen } from './components/LockScreen';
import { VerifyEmailScreen } from './components/VerifyEmailScreen';
import { useProfileSync } from './lib/profileSync';
import { Generator } from './components/Generator';
import { MealPlanView } from './components/MealPlanCalendar';
import { ShoppingListView } from './components/ShoppingListView';
import { Profile } from './components/Profile';
import { PlateAnalyzer } from './components/PlateAnalyzer';
import { JourneyVisualizer } from './components/JourneyVisualizer';
import { JuiceGenerator } from './components/JuiceGenerator';
import { ErrorBoundary } from './components/ErrorBoundary';
import { BarcodeScanner } from './components/BarcodeScanner';
import { FoodAllergyDetector } from './components/FoodAllergyDetector';
import { ProductComparer } from './components/ProductComparer';
import { EmotionalTracker } from './components/EmotionalTracker';
import { ChallengeView } from './components/ChallengeView';
import { HabitTracker } from './components/HabitTracker';
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
import { BodyAnalyzer } from './components/BodyAnalyzer';
import { SplashScreen } from './components/SplashScreen';
import { PartnerBanner } from './components/PartnerBanner';
import { DeliveryPartnerPortal } from './components/DeliveryPartnerPortal';
import { GamificationCenter } from './components/GamificationCenter';
import { DraggableNav } from './components/DraggableNav';
import { AcademyPortal } from './components/AcademyPortal';
import { BloodPressureTracker } from './components/BloodPressureTracker';
import { Notebook } from './components/Notebook';
import { MedicinalHerbs } from './components/MedicinalHerbs';
import { SmartFridge } from './components/SmartFridge';
import { SmartGarden } from './components/SmartGarden';
import { WellnessHub } from './components/WellnessHub';
import { PhotoEvolution } from './components/PhotoEvolution';
import { Assistant360 } from './components/Assistant360';
import { NotificationSystem, AppNotification } from './components/NotificationSystem';
import { LiveAssistant } from './components/LiveAssistant';
import { FeedbackSystem } from './components/FeedbackSystem';
import { Utensils, CalendarDays, ShoppingBasket, User, Camera, Sparkles, Moon, Sun, GlassWater, Barcode, Brain, Trophy, Droplet, RefreshCw, ChefHat, Medal, TrendingUp, Dumbbell, Store, Crown, Map as MapIcon, Zap, MessageSquare, Globe, BookOpen } from 'lucide-react';
import { IntakeLog } from './types';
import { playSfx, vibrate } from './lib/sensory';
import { useTranslation } from 'react-i18next';
import { changeLanguage as changeAppLanguage } from './i18n';

import { MagicRecipeFAB } from './components/MagicRecipeFAB';
import { LanguageModal } from './components/LanguageModal';
import { AutoTranslator } from './components/AutoTranslator';
import { GlobalSearch } from './components/GlobalSearch';

import { useMealPushNotifications } from './hooks/useMealPushNotifications';

const TAB_ORDER = [
  'assistant360', 'coach', 'generator', 'fridge', 'garden', 'herbs', 'juice', 
  'habits', 'notes', 'bloodpressure', 'barcode', 'allergy', 'comparer', 
  'emotional', 'analyzer', 'body', 'plan', 'shopping', 'journey', 'evolution', 
  'challenge', 'swaps', 'dining', 'market', 'frescor', 'trainer', 'wellness', 
  'academies', 'gamification', 'prediction', 'profile', 'pricing', 'partner', 'delivery'
];

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? '30%' : direction < 0 ? '-30%' : 0,
    opacity: 0,
    filter: 'blur(8px)',
  }),
  center: {
    x: 0,
    opacity: 1,
    filter: 'blur(0px)',
  },
  exit: (direction: number) => ({
    x: direction > 0 ? '-30%' : direction < 0 ? '30%' : 0,
    opacity: 0,
    filter: 'blur(8px)',
  }),
};

export default function App() {
  const { user, loading: authLoading } = useAuth();
  const { i18n } = useTranslation();
  const [showSplash, setShowSplash] = useState(true);
  const [emailVerificationBypassed, setEmailVerificationBypassed] = useState(false);
  const [isDarkMode, setIsDarkMode] = useLocalStorage<boolean>('nutri-dark-mode', false);
  const [profile, setProfile] = useLocalStorage<UserProfile | null>('nutri-profile', null);
  const { syncToFirestore } = useProfileSync(user, profile, setProfile);

  // Auto-detect language on first execution and keep in sync with Profile/Supabase/LocalStorage
  useEffect(() => {
    const detectedLng = window.localStorage.getItem('language') || window.localStorage.getItem('i18nextLng') || navigator.language?.split('-')[0] || 'pt-BR';
    const targetLng = detectedLng.startsWith('pt') ? 'pt-BR' : detectedLng;
    
    if (profile) {
      if (!profile.language) {
        const updated = { ...profile, language: targetLng };
        setProfile(updated);
        if (user) {
          syncToFirestore(updated);
        }
        if (i18n.language !== targetLng) {
          changeAppLanguage(targetLng);
        }
      } else if (profile.language && i18n.language !== profile.language) {
        changeAppLanguage(profile.language);
      }
    } else {
      if (i18n.language !== targetLng) {
        changeAppLanguage(targetLng);
      }
    }
  }, [profile?.language, user?.uid]);

  const [isLocked, setIsLocked] = useState(() => {
    try {
      return window.localStorage.getItem('nutri-biometric-enabled') === 'true';
    } catch (e) {
      return false;
    }
  });

  // Wrapper for setProfile to also sync
  const updateProfile = (value: React.SetStateAction<UserProfile | null>) => {
    setProfile(prev => {
      const newValue = typeof value === 'function' ? (value as any)(prev) : value;
      if (newValue && user) {
        setTimeout(() => syncToFirestore(newValue), 0);
      }
      return newValue;
    });
  };

  const [activeTab, setActiveTab] = useState<'generator' | 'plan' | 'shopping' | 'profile' | 'analyzer' | 'body' | 'journey' | 'evolution' | 'juice' | 'barcode' | 'allergy' | 'comparer' | 'emotional' | 'challenge' | 'habits' | 'notes' | 'bloodpressure' | 'swaps' | 'dining' | 'ranking' | 'prediction' | 'trainer' | 'market' | 'pricing' | 'partner' | 'delivery' | 'frescor' | 'coach' | 'gamification' | 'academies' | 'herbs' | 'fridge' | 'garden' | 'wellness' | 'assistant360'>('assistant360');
  const [prevTab, setPrevTab] = useState<string>('assistant360');
  const [direction, setDirection] = useState<number>(0);

  if (activeTab !== prevTab) {
    const prevIndex = TAB_ORDER.indexOf(prevTab);
    const currIndex = TAB_ORDER.indexOf(activeTab);
    const dir = currIndex > prevIndex ? 1 : -1;
    setDirection(dir);
    setPrevTab(activeTab);
  }

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isRecipesGenerating, setIsRecipesGenerating] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [isLanguageOpen, setIsLanguageOpen] = useState(false);

  const addNotification = (notif: Omit<AppNotification, 'id'>) => {
    const id = Math.random().toString(36).substring(7);
    setNotifications(prev => [...prev, { ...notif, id }]);
    playSfx('notification');
    vibrate([50, 50, 50]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  };

  useEffect(() => {
    const handleNavigate = (e: any) => {
      if (e.detail?.tab) {
        setActiveTab(e.detail.tab);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    };
    window.addEventListener('app:navigate', handleNavigate);

    const handleNotification = (e: any) => {
      if (e.detail?.title && e.detail?.message) {
        addNotification({
          title: e.detail.title,
          message: e.detail.message,
          type: e.detail.type || 'info'
        });
      }
    };
    window.addEventListener('app:notification', handleNotification);

    // Checker for scheduled recipe preparation reminders
    const checkRemindersInterval = setInterval(() => {
      try {
        const stored = window.localStorage.getItem('nutri-prep-reminders');
        if (!stored) return;
        
        const reminders = JSON.parse(stored);
        if (!Array.isArray(reminders) || reminders.length === 0) return;
        
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        
        let updated = false;
        const remainingReminders = reminders.filter(reminder => {
          if (reminder.notified) return false;
          
          const [startHour, startMin] = reminder.startTime.split(':').map(Number);
          
          // Check if it matches the scheduled date and time has come
          const isToday = reminder.dateStr === dateStr;
          const hasTimeCome = currentHour > startHour || (currentHour === startHour && currentMinute >= startMin);
          
          if (isToday && hasTimeCome) {
            // Trigger notification
            addNotification({
              title: `Hora de cozinhar! 🍳`,
              message: `Inicie o preparo de "${reminder.recipeName}". Tempo estimado: ${reminder.prepTime}. Horário planejado para servir: ${reminder.targetTime}.`,
              type: 'info'
            });
            
            // Try to trigger standard browser notification
            try {
              if ('Notification' in window && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
                new Notification(`Hora de cozinhar! 🍳`, {
                  body: `Inicie o preparo de "${reminder.recipeName}" para comer às ${reminder.targetTime}.`,
                  icon: '/icon.png'
                });
              }
            } catch (err) {
              console.warn("Could not trigger system push notification:", err);
            }
            
            updated = true;
            return false; // remove from list since it has fired
          }
          
          return true; // keep in list
        });
        
        if (updated) {
          window.localStorage.setItem('nutri-prep-reminders', JSON.stringify(remainingReminders));
          // Dispatch custom event to notify components that reminders changed
          window.dispatchEvent(new CustomEvent('app:prep-reminders-updated'));
        }
      } catch (err) {
        console.warn("Error checking prep reminders:", err);
      }
    }, 10000); // Check every 10 seconds for precise triggers

    return () => {
      window.removeEventListener('app:navigate', handleNavigate);
      window.removeEventListener('app:notification', handleNotification);
      clearInterval(checkRemindersInterval);
    };
  }, []);

  useMealPushNotifications(profile, addNotification);

  useEffect(() => {
    if (!profile) return;
    const today = new Date().toISOString().split('T')[0];
    const hasSleepToday = profile.sleepLogs?.some(log => log.date.startsWith(today));
    
    // Using sessionStorage so we only nudge once per day/session
    try {
      if (!hasSleepToday && !window.sessionStorage.getItem('habits_nudge')) {
        window.sessionStorage.setItem('habits_nudge', 'true');
        setTimeout(() => {
          addNotification({
            title: 'Dica Inteligente',
            message: 'Como você dormiu e se hidratou hoje? Registre seus hábitos para análises mais precisas da IA.',
            type: 'info'
          });
        }, 6000);
      }
    } catch(e) {
      console.warn('Storage blocked:', e);
    }
  }, [profile?.sleepLogs]);

  const handleLogIntake = (log: IntakeLog) => {
    const newProfile = profile ? {
      ...profile,
      intakeLogs: [...(profile.intakeLogs || []), log]
    } : null;
    
    if (newProfile) {
      updateProfile(newProfile);
      awardPoints(15, 'Refeição registrada no plano');
    }
  };

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const mealPlan = profile?.mealPlan || {};
  const savedRecipes = profile?.savedRecipes || [];

  const handleSaveRecipe = (recipe: Recipe) => {
    updateProfile(prev => {
      if (!prev) return prev;
      const prevRecipes = prev.savedRecipes || [];
      if (prevRecipes.find(r => r.id === recipe.id)) return prev;
      awardPoints(20, 'Nova receita gerada');
      return { ...prev, savedRecipes: [recipe, ...prevRecipes] };
    });
  };

  const awardPoints = (amount: number, reason: string) => {
    updateProfile(prev => {
      if (!prev) return prev;
      const newPoints = (prev.points || 0) + amount;
      const newEntry = {
        id: crypto.randomUUID(),
        date: new Date().toISOString(),
        amount,
        reason
      };
      const updatedProfile = {
        ...prev,
        points: newPoints,
        pointsHistory: [...(prev.pointsHistory || []), newEntry]
      };
      
      addNotification({
        title: 'Pontos Adquiridos!',
        message: `${reason} (+${amount} XP)`,
        type: 'point'
      });

      return updatedProfile;
    });
  };

  const handleUpdatePlan = (day: string, mealName: string, recipeId: string | null, recipeObj?: Recipe) => {
    updateProfile(prev => {
      if (!prev) return prev;
      const prevPlan = prev.mealPlan || {};
      const newPlan = { ...prevPlan };
      if (!newPlan[day]) {
        newPlan[day] = { date: day, meals: {} };
      }
      
      let newRecipes = prev.savedRecipes || [];

      if (recipeObj) {
        newPlan[day].meals[mealName as 'breakfast' | 'lunch' | 'snack' | 'dinner'] = recipeObj;
        if (!newRecipes.find(r => r.id === recipeObj.id)) {
          newRecipes = [recipeObj, ...newRecipes];
        }
      } else if (recipeId) {
        const recipe = newRecipes.find(r => r.id === recipeId);
        if (recipe) {
          newPlan[day].meals[mealName as 'breakfast' | 'lunch' | 'snack' | 'dinner'] = recipe;
        }
      } else {
        delete newPlan[day].meals[mealName as 'breakfast' | 'lunch' | 'snack' | 'dinner'];
      }
      
      return { ...prev, mealPlan: newPlan, savedRecipes: newRecipes };
    });
  };

  const renderContent = () => {
    if (authLoading) {
      return (
        <div className="w-full h-[100vh] bg-[#f4f9f6] dark:bg-[#08111d] flex flex-col items-center justify-center box-border overflow-hidden">
          {!showSplash && <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>}
        </div>
      );
    }

    if (!user) {
      return <Login />;
    }

    // Enforce email verification (if not Google and not bypassed)
    const isGoogleProvider = user?.providerData?.some(p => p.providerId === 'google.com');
    if (!user.emailVerified && !isGoogleProvider && !emailVerificationBypassed) {
      return <VerifyEmailScreen user={user} onVerified={() => setEmailVerificationBypassed(true)} />;
    }

    if (isLocked) {
      return (
        <LockScreen 
          onUnlock={() => setIsLocked(false)} 
          userEmail={user.email} 
          onDisableBiometric={() => {
            try {
              window.localStorage.removeItem('nutri-biometric-enabled');
            } catch(e) {}
            setIsLocked(false);
          }}
          isDarkMode={isDarkMode}
          onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
        />
      );
    }

    return (
      <div className="w-full h-[100vh] flex flex-col bg-[#f4f9f6] dark:bg-[#08111d] overflow-hidden box-border text-slate-800 dark:text-slate-100 font-sans relative selection:bg-emerald-500/20 selection:text-emerald-400 transition-colors duration-500">
        <motion.div 
          className="flex-1 flex flex-col h-full overflow-y-auto overflow-x-hidden no-scrollbar"
          initial={{ opacity: 0 }}
          animate={{ opacity: showSplash ? 0 : 1 }}
          transition={{ duration: 1, ease: "easeOut" }}
        >
          {/* Mesh Background */}
        <div className="fixed inset-0 z-0 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-teal-200/30 dark:bg-teal-900/30 blur-[100px] transition-colors duration-1000"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-emerald-100/40 dark:bg-emerald-900/20 blur-[120px] transition-colors duration-1000"></div>
          <div className="absolute top-[20%] right-[10%] w-[40%] h-[40%] rounded-full bg-slate-200/50 dark:bg-slate-800/40 blur-[100px] transition-colors duration-1000"></div>
        </div>

        <header className="relative z-20 clay-panel backdrop-blur-md border-b border-white/60 dark:border-slate-800/50 sticky top-0 transition-colors duration-500">

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 md:h-20 gap-4">
            <div className="flex items-center gap-2 sm:gap-3 text-emerald-600 dark:text-emerald-400 shrink-0">
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
              >
                <Utensils className="w-8 h-8" />
              </motion.div>
              <span className="font-serif text-2xl font-semibold tracking-wide">NutriAI</span>
            </div>
            
            {/* Global Search Bar */}
            <GlobalSearch activeTab={activeTab} onNavigate={setActiveTab} isDarkMode={isDarkMode} />

            <div className="flex items-center gap-2 sm:gap-3">
              <motion.button 
                whileHover={{ scale: 1.04, y: -0.5 }} 
                whileTap={{ scale: 0.96 }}
                onClick={() => {
                  playSfx('tap');
                  setIsFeedbackOpen(true);
                }}
                className="relative p-[1.5px] rounded-full overflow-hidden shrink-0 shadow-[0_0_12px_rgba(16,185,129,0.3)] dark:shadow-[0_0_15px_rgba(255,255,255,0.12)] focus:outline-none active:scale-95 cursor-pointer group flex items-center justify-center"
                title="Deixe seu feedback"
                id="header-feedback-trigger-btn"
              >
                {/* Sleek pulsing and shimmering ambient border */}
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-400 dark:from-emerald-500 dark:via-teal-400 dark:to-emerald-500 animate-pulse" />
                
                {/* Perfectly centered inner button mask */}
                <div className="relative flex items-center justify-center gap-1.5 p-2 sm:px-3.5 sm:py-1.5 md:px-4 md:py-2 rounded-full bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 font-medium hover:bg-slate-50/90 dark:hover:bg-slate-800/90 transition-all duration-300 w-full h-full">
                  <div className="absolute inset-0 rounded-full bg-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <MessageSquare className="w-4 h-4 text-emerald-500 relative z-10 shrink-0" />
                  <span className="hidden sm:inline-block text-xs md:text-sm font-semibold relative z-10 text-slate-800 dark:text-slate-200 leading-none tracking-wide">
                    Feedback
                  </span>
                </div>
              </motion.button>

              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                onClick={() => {
                  playSfx('tap');
                  vibrate(10);
                  setIsLanguageOpen(true);
                }}
                className="p-2.5 rounded-full text-slate-500 hover:text-emerald-500 hover:bg-emerald-50 dark:text-slate-400 dark:hover:text-emerald-400 dark:hover:bg-slate-800 transition-colors shrink-0 cursor-pointer flex items-center justify-center"
                title="Mudar idioma / Change language"
                id="header-language-trigger-btn"
              >
                <Globe className="w-5 h-5" />
              </motion.button>

              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.95 }}
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="p-2.5 rounded-full text-slate-500 hover:text-amber-500 hover:bg-amber-50 dark:text-slate-400 dark:hover:text-amber-300 dark:hover:bg-slate-800 transition-colors shrink-0 flex items-center justify-center"
                title={isDarkMode ? "Mudar para modo claro" : "Mudar para modo escuro"}
              >
                {isDarkMode ? (
                  <Sun 
                    className="w-5 h-5" 
                  />
                ) : (
                  <Moon 
                    className="w-5 h-5" 
                  />
                )}
              </motion.button>
            </div>
          </div>
        </div>
      </header>

      <div className="sticky top-16 md:top-20 z-[15] w-full">
        <DraggableNav activeTab={activeTab} onTabChange={setActiveTab} />
      </div>

      <PartnerBanner />

      <main className={`relative z-10 flex-1 flex flex-col min-h-0 w-full mx-auto transition-all duration-500 ${
        activeTab === 'frescor' 
        ? 'max-w-none px-0 py-0' 
        : activeTab === 'partner'
        ? 'max-w-7xl px-0 sm:px-6 lg:px-8 py-0 md:py-16'
        : 'max-w-7xl px-4 sm:px-6 lg:px-8 py-8 md:py-16'
      }`}>
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={activeTab}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="w-full flex-1 flex flex-col min-h-[400px]"
          >
            <ErrorBoundary>
              {(activeTab === 'generator' || activeTab === 'plan') && (
              <FoodGalleryBanner 
                onNavigateToMarket={() => setActiveTab('market')} 
                isGenerating={isRecipesGenerating} 
                recipesCount={savedRecipes.length}
              />
            )}
            {activeTab === 'assistant360' && (
              <Assistant360 profile={profile} onNavigate={(tab) => {
                if (tab === 'live') {
                  // handle opening live assistant (we might have a state or we can just keep the floating button for it)
                  // Let's just dispatch an event to open live assistant
                  window.dispatchEvent(new CustomEvent('app:openLiveAssistant'));
                } else {
                  setActiveTab(tab as any);
                }
              }} />
            )}
            {activeTab === 'generator' && (
              <Generator 
                onSaveRecipe={handleSaveRecipe} 
                profile={profile} 
                onAwardPoints={awardPoints} 
                onGeneratingChange={setIsRecipesGenerating}
              />
            )}
            {activeTab === 'juice' && (
              <JuiceGenerator profile={profile} onAwardPoints={awardPoints} />
            )}
            {activeTab === 'habits' && (
              <HabitTracker 
                profile={profile} 
                onUpdateProfile={(updated) => updateProfile(prev => prev ? { ...prev, ...updated } : null)} 
                onAwardPoints={awardPoints}
                addNotification={addNotification}
              />
            )}
            {activeTab === 'notes' && (
              <Notebook 
                profile={profile} 
                onUpdateProfile={(updated) => updateProfile(prev => prev ? { ...prev, ...updated } : null)} 
                onAwardPoints={awardPoints}
              />
            )}
            {activeTab === 'bloodpressure' && (
              <BloodPressureTracker 
                profile={profile} 
                onUpdateProfile={(updated) => updateProfile(prev => prev ? { ...prev, ...updated } : null)} 
                onAwardPoints={awardPoints}
              />
            )}
            {activeTab === 'barcode' && (
              <BarcodeScanner profile={profile} />
            )}
            {activeTab === 'allergy' && (
              <FoodAllergyDetector />
            )}
            {activeTab === 'comparer' && (
              <ProductComparer />
            )}
            {activeTab === 'emotional' && (
              <EmotionalTracker 
                profile={profile} 
                onUpdateLogs={(newLogs) => updateProfile(prev => prev ? { ...prev, emotionalLogs: newLogs } : null)} 
              />
            )}
            {activeTab === 'plan' && (
              <MealPlanView 
                mealPlan={mealPlan} 
                savedRecipes={savedRecipes} 
                onUpdatePlan={handleUpdatePlan} 
                onLogIntake={handleLogIntake}
                profile={profile}
                onGeneratingChange={setIsRecipesGenerating}
              />
            )}
            {activeTab === 'coach' && (
              <AdaptiveCoach 
                profile={profile} 
                onUpdateProfile={updateProfile}
                onUpdatePlan={handleUpdatePlan}
              />
            )}
            {activeTab === 'shopping' && (
              <ShoppingListView mealPlan={mealPlan} />
            )}
            {activeTab === 'profile' && (
              <Profile profile={profile} onSaveProfile={updateProfile} />
            )}
            {activeTab === 'gamification' && (
              <GamificationCenter profile={profile} onUpdateProfile={updateProfile} />
            )}
            {activeTab === 'ranking' && (
              <RankingView profile={profile} />
            )}
            {activeTab === 'market' && (
              <Marketplace 
                profile={profile} 
                onUpdateCart={(cart) => updateProfile(prev => prev ? { ...prev, cart } : null)} 
                onUpdateFavorites={(favorites) => updateProfile(prev => prev ? { ...prev, favorites } : null)}
                onOpenPartner={() => setActiveTab('partner')}
                onOpenMap={() => setActiveTab('frescor')}
                addNotification={addNotification}
              />
            )}
            {activeTab === 'frescor' && (
              <FreshnessMap onBack={() => setActiveTab('market')} />
            )}
            {activeTab === 'trainer' && (
              <PersonalTrainer profile={profile} onAwardPoints={awardPoints} onUpdateProfile={updateProfile} />
            )}
            {activeTab === 'wellness' && (
              <WellnessHub />
            )}
            {activeTab === 'prediction' && (
              <ResultPrediction 
                profile={profile} 
                onUpdatePrediction={(prediction) => updateProfile(prev => prev ? { ...prev, prediction } : null)} 
              />
            )}
            {activeTab === 'analyzer' && (
              <PlateAnalyzer profile={profile} onAwardPoints={awardPoints} />
            )}
            {activeTab === 'body' && (
              <BodyAnalyzer 
                profile={profile} 
                onUpdateProfile={(updated) => updateProfile(prev => prev ? { ...prev, ...updated } : null)}
                onAwardPoints={awardPoints} 
              />
            )}
            {activeTab === 'journey' && (
              <JourneyVisualizer profile={profile} />
            )}
            {activeTab === 'evolution' && (
              <PhotoEvolution profile={profile} onAwardPoints={awardPoints} />
            )}
            {activeTab === 'challenge' && (
              <ChallengeView 
                profile={profile} 
                onUpdateChallenge={(challenge) => updateProfile(prev => prev ? { ...prev, currentChallenge: challenge } : null)} 
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
            {activeTab === 'delivery' && (
              <DeliveryPartnerPortal onBack={() => setActiveTab('market')} addNotification={addNotification} />
            )}
            {activeTab === 'academies' && (
              <AcademyPortal />
            )}
            {activeTab === 'herbs' && (
              <MedicinalHerbs />
            )}
            {activeTab === 'fridge' && (
              <SmartFridge />
            )}
            {activeTab === 'garden' && (
              <SmartGarden />
            )}
            </ErrorBoundary>
          </motion.div>
        </AnimatePresence>
      </main>

      <SmartChat profile={profile} onNavigate={(tab) => setActiveTab(tab as any)} />
      <LiveAssistant profile={profile} />
      <MagicRecipeFAB profile={profile} />
      
      <FeedbackSystem 
        profile={profile} 
        isOpen={isFeedbackOpen} 
        onClose={() => setIsFeedbackOpen(false)} 
        addNotification={addNotification} 
      />

      <LanguageModal
        isOpen={isLanguageOpen}
        onClose={() => setIsLanguageOpen(false)}
        profile={profile}
        onUpdateProfile={updateProfile}
      />
      
      <NotificationSystem 
        notifications={notifications} 
        onDismiss={(id) => setNotifications(prev => prev.filter(n => n.id !== id))} 
      />
      </motion.div>
    </div>
    );
  };

  return (
    <>
      <AutoTranslator />
      {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}
      {renderContent()}
    </>
  );
}
