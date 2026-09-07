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
import { BodyAnalyzer } from './components/BodyAnalyzer';
import { SplashScreen } from './components/SplashScreen';
import { PartnerBanner } from './components/PartnerBanner';
import { DeliveryPartnerPortal } from './components/DeliveryPartnerPortal';
import { GamificationCenter } from './components/GamificationCenter';
import { DraggableNav } from './components/DraggableNav';
import { AcademyPortal } from './components/AcademyPortal';
import { BloodPressureTracker } from './components/BloodPressureTracker';
import { GlucoseTracker } from './components/GlucoseTracker';
import { Notebook } from './components/Notebook';
import { MedicinalHerbs } from './components/MedicinalHerbs';
import { SmartFridge } from './components/SmartFridge';
import { SmartPlateCombiner } from './components/SmartPlateCombiner';
import { SmartGarden } from './components/SmartGarden';
import { WellnessHub } from './components/WellnessHub';
import { PhotoEvolution } from './components/PhotoEvolution';
import { Assistant360 } from './components/Assistant360';
import { QuickDishes } from './components/QuickDishes';
import { NotificationSystem, AppNotification } from './components/NotificationSystem';
import { LiveAssistant } from './components/LiveAssistant';
import { FeedbackSystem } from './components/FeedbackSystem';
import { WelcomeTour } from './components/WelcomeTour';
import { HeaderAvatar } from './components/HeaderAvatar';
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
  'assistant360', 'quickdishes', 'coach', 'smartplate', 'generator', 'fridge', 'garden', 'herbs', 'juice', 
  'habits', 'notes', 'bloodpressure', 'glucose', 'barcode', 'allergy', 'comparer', 
  'emotional', 'analyzer', 'body', 'plan', 'shopping', 'journey', 'evolution', 
  'challenge', 'swaps', 'dining', 'market', 'frescor', 'trainer', 'wellness', 
  'academies', 'gamification', 'prediction', 'profile', 'pricing', 'partner', 'delivery'
];

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 32 : direction < 0 ? -32 : 0,
    opacity: 0,
    scale: 0.96,
    filter: 'blur(4px)',
  }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1,
    filter: 'blur(0px)',
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -32 : direction < 0 ? 32 : 0,
    opacity: 0,
    scale: 0.96,
    filter: 'blur(4px)',
  }),
};

export default function App() {
  const { user, loading: authLoading } = useAuth();
  const { i18n } = useTranslation();
  const [showSplash, setShowSplash] = useState(true);
  const [emailVerificationBypassed, setEmailVerificationBypassed] = useState(false);
  const [isDarkMode, setIsDarkMode] = useLocalStorage<boolean>('nutri-dark-mode', false);
  const [isReadingMode, setIsReadingMode] = useLocalStorage<boolean>('nutri-reading-mode', false);
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

  const [activeTab, setActiveTab] = useState<'generator' | 'quickdishes' | 'plan' | 'shopping' | 'profile' | 'analyzer' | 'body' | 'journey' | 'evolution' | 'juice' | 'barcode' | 'allergy' | 'comparer' | 'emotional' | 'challenge' | 'habits' | 'notes' | 'bloodpressure' | 'glucose' | 'swaps' | 'dining' | 'ranking' | 'prediction' | 'trainer' | 'market' | 'pricing' | 'partner' | 'delivery' | 'frescor' | 'coach' | 'gamification' | 'academies' | 'herbs' | 'fridge' | 'garden' | 'wellness' | 'smartplate' | 'assistant360'>('assistant360');
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
      const tabTarget = e.detail?.tab || (typeof e.detail === 'string' ? e.detail : null);
      if (tabTarget) {
        setActiveTab(tabTarget);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    };
    window.addEventListener('app:navigate', handleNavigate);
    window.addEventListener('app:changeTab', handleNavigate);

    const handleOpenQuickDishes = () => {
      setActiveTab('quickdishes');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    window.addEventListener('app:openQuickDishes', handleOpenQuickDishes);

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
      window.removeEventListener('app:changeTab', handleNavigate);
      window.removeEventListener('app:openQuickDishes', handleOpenQuickDishes);
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

  useEffect(() => {
    const storedContrast = window.localStorage.getItem('nutri-high-contrast') === 'true';
    const isHighContrast = profile?.highContrast !== undefined ? profile.highContrast : storedContrast;
    if (isHighContrast) {
      document.documentElement.classList.add('high-contrast');
    } else {
      document.documentElement.classList.remove('high-contrast');
    }
  }, [profile?.highContrast]);

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

        <header className="relative z-20 clay-panel backdrop-blur-md border-b border-white/60 dark:border-slate-800/50 sticky top-0 transition-colors duration-500 w-full flex items-center justify-center">
          <div className="w-full max-w-5xl mx-auto px-3 sm:px-6 h-[54px] flex items-center justify-between gap-2 sm:gap-4">
            <motion.div 
              className="flex items-center gap-2 sm:gap-2.5 text-emerald-600 dark:text-emerald-400 shrink-0 cursor-pointer select-none"
              animate={{ 
                rotate: [0, 0, -4, 4, -3, 3, 0, 0],
                y: [0, 0, -3, 1, -2, 0, 0, 0],
                scale: [1, 1, 1.05, 0.98, 1.02, 1, 1, 1]
              }}
              transition={{
                duration: 5,
                repeat: Infinity,
                ease: "easeInOut",
                times: [0, 0.72, 0.76, 0.81, 0.86, 0.91, 0.96, 1]
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                playSfx('tap');
                setActiveTab('assistant360');
              }}
            >
              <motion.div
                animate={{ 
                  rotate: [0, 0, -12, 14, -8, 8, 0, 0],
                  scale: [1, 1, 1.15, 0.95, 1.08, 1, 1, 1]
                }}
                transition={{ 
                  duration: 5,
                  repeat: Infinity, 
                  ease: "easeInOut",
                  times: [0, 0.72, 0.76, 0.81, 0.86, 0.91, 0.96, 1]
                }}
              >
                <Utensils className="w-6 h-6 sm:w-7 sm:h-7" />
              </motion.div>
              <span className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 leading-none">NutriAI</span>
            </motion.div>
            
            {/* Global Search Bar (Desktop) */}
            <div className="hidden md:flex flex-1 max-w-md justify-center mx-2">
              <GlobalSearch variant="desktop" activeTab={activeTab} onNavigate={setActiveTab} isDarkMode={isDarkMode} />
            </div>

            {/* Action Buttons Cluster (Avatar, Search on mobile, Feedback, Language, Dark Mode) */}
            <div className="flex items-center justify-end gap-1.5 sm:gap-2 shrink-0">
              {/* Header Profile Photo / Avatar Selector */}
              <HeaderAvatar
                profile={profile}
                onSaveProfile={(updated) => {
                  setProfile(updated);
                  if (user) syncToFirestore(updated);
                }}
                onOpenProfileTab={() => setActiveTab('profile')}
              />

              {/* Mobile Search Trigger */}
              <div className="md:hidden flex items-center">
                <GlobalSearch variant="mobile" activeTab={activeTab} onNavigate={setActiveTab} isDarkMode={isDarkMode} />
              </div>

              {/* Feedback Button */}
              <motion.button 
                whileHover={{ scale: 1.06, y: -0.5 }} 
                whileTap={{ scale: 0.94 }}
                onClick={() => {
                  playSfx('tap');
                  setIsFeedbackOpen(true);
                }}
                className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-full p-[1.5px] overflow-hidden shrink-0 shadow-[0_0_12px_rgba(16,185,129,0.3)] dark:shadow-[0_0_15px_rgba(255,255,255,0.12)] focus:outline-none cursor-pointer flex items-center justify-center"
                title="Deixe seu feedback"
                id="header-feedback-trigger-btn"
              >
                {/* Sleek pulsing ambient ring */}
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-400 dark:from-emerald-500 dark:via-teal-400 dark:to-emerald-500 animate-pulse" />
                
                {/* Perfectly centered inner icon */}
                <div className="relative flex items-center justify-center rounded-full bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 w-full h-full">
                  <MessageSquare className="w-4 h-4 text-emerald-500 shrink-0" />
                </div>
              </motion.button>

              {/* Reading Mode (Acessibilidade e Alto Contraste) */}
              <motion.button 
                whileHover={{ scale: 1.06 }} 
                whileTap={{ scale: 0.94 }}
                onClick={() => {
                  playSfx('crystal');
                  vibrate(15);
                  const next = !isReadingMode;
                  setIsReadingMode(next);
                  window.dispatchEvent(new CustomEvent('app:reading-mode-changed', { detail: next }));
                }}
                className={`relative w-9 h-9 sm:w-10 sm:h-10 rounded-full transition-all shrink-0 flex items-center justify-center cursor-pointer ${
                  isReadingMode 
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 ring-2 ring-emerald-400' 
                    : 'text-slate-600 hover:text-emerald-500 hover:bg-emerald-50 dark:text-slate-300 dark:hover:text-emerald-400 dark:hover:bg-slate-800'
                }`}
                title={isReadingMode ? "Desativar Modo de Leitura" : "Ativar Modo de Leitura (Alto Contraste e Letras Grandes)"}
                id="header-reading-mode-toggle-btn"
              >
                <BookOpen className="w-4 h-4 sm:w-5 sm:h-5" />
                {isReadingMode && (
                  <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-amber-400 rounded-full border-2 border-white dark:border-slate-900" />
                )}
              </motion.button>

              {/* Language Switcher Button */}
              <motion.button 
                whileHover={{ scale: 1.06 }} 
                whileTap={{ scale: 0.94 }}
                onClick={() => {
                  playSfx('tap');
                  vibrate(10);
                  setIsLanguageOpen(true);
                }}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full text-slate-600 hover:text-emerald-500 hover:bg-emerald-50 dark:text-slate-300 dark:hover:text-emerald-400 dark:hover:bg-slate-800 transition-colors shrink-0 cursor-pointer flex items-center justify-center"
                title="Mudar idioma / Change language"
                id="header-language-trigger-btn"
              >
                <Globe className="w-4 h-4 sm:w-5 sm:h-5" />
              </motion.button>

              {/* Dark Mode Toggle Button */}
              <motion.button 
                whileHover={{ scale: 1.06 }} 
                whileTap={{ scale: 0.94 }}
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full text-slate-600 hover:text-amber-500 hover:bg-amber-50 dark:text-slate-300 dark:hover:text-amber-300 dark:hover:bg-slate-800 transition-colors shrink-0 flex items-center justify-center cursor-pointer"
                title={isDarkMode ? "Mudar para modo claro" : "Mudar para modo escuro"}
              >
                {isDarkMode ? (
                  <Sun className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
                ) : (
                  <Moon className="w-4 h-4 sm:w-5 sm:h-5 text-slate-700" />
                )}
              </motion.button>
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
            transition={{ 
              type: "spring", 
              stiffness: 280, 
              damping: 28, 
              mass: 0.8,
              opacity: { duration: 0.25 },
              scale: { duration: 0.3 }
            }}
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
            {activeTab === 'quickdishes' && (
              <QuickDishes
                profile={profile}
                onSaveRecipe={handleSaveRecipe}
                onAwardPoints={awardPoints}
              />
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
            {activeTab === 'glucose' && (
              <GlucoseTracker />
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
                onUpdateProfile={updateProfile}
                onUpdateChallenge={(challenge) => updateProfile(prev => prev ? { ...prev, currentChallenge: challenge } : null)} 
                onAwardPoints={awardPoints}
                onNavigate={(tab) => setActiveTab(tab as any)}
                onSaveRecipe={handleSaveRecipe}
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
            {activeTab === 'smartplate' && (
              <SmartPlateCombiner onClose={() => setActiveTab('assistant360')} profile={profile} />
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

      <LiveAssistant 
        profile={profile} 
        activeTab={activeTab}
        onNavigate={(tab) => setActiveTab(tab as any)}
        onOpenLanguage={() => setIsLanguageOpen(true)}
        onOpenFeedback={() => setIsFeedbackOpen(true)}
        onAwardPoints={awardPoints}
        onUpdateProfile={updateProfile}
      />
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

      <WelcomeTour 
        onNavigateTab={(tab) => {
          setActiveTab(tab as any);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
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
