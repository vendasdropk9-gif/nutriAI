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

import { MagicRecipeFAB } from './components/MagicRecipeFAB';
import { LanguageModal } from './components/LanguageModal';

import { useMealPushNotifications } from './hooks/useMealPushNotifications';

export default function App() {
  const { user, loading: authLoading } = useAuth();
  const [showSplash, setShowSplash] = useState(true);
  const [emailVerificationBypassed, setEmailVerificationBypassed] = useState(false);
  const [isDarkMode, setIsDarkMode] = useLocalStorage<boolean>('nutri-dark-mode', false);
  const [profile, setProfile] = useLocalStorage<UserProfile | null>('nutri-profile', null);
  const { syncToFirestore } = useProfileSync(user, profile, setProfile);

  const [isLocked, setIsLocked] = useState(() => {
    return localStorage.getItem('nutri-biometric-enabled') === 'true';
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
    return () => window.removeEventListener('app:navigate', handleNavigate);
  }, []);

  useMealPushNotifications(profile, addNotification);

  useEffect(() => {
    if (!profile) return;
    const today = new Date().toISOString().split('T')[0];
    const hasSleepToday = profile.sleepLogs?.some(log => log.date.startsWith(today));
    
    // Using sessionStorage so we only nudge once per day/session
    if (!hasSleepToday && !sessionStorage.getItem('habits_nudge')) {
      sessionStorage.setItem('habits_nudge', 'true');
      setTimeout(() => {
        addNotification({
          title: 'Dica Inteligente',
          message: 'Como você dormiu e se hidratou hoje? Registre seus hábitos para análises mais precisas da IA.',
          type: 'info'
        });
      }, 6000);
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

  if (!user && !authLoading) {
    return <Login />;
  }

  // Enforce email verification (if not Google and not bypassed)
  const isGoogleProvider = user?.providerData.some(p => p.providerId === 'google.com');
  if (user && !user.emailVerified && !isGoogleProvider && !emailVerificationBypassed) {
    return <VerifyEmailScreen user={user} onVerified={() => setEmailVerificationBypassed(true)} />;
  }

  if (user && isLocked) {
    return (
      <LockScreen 
        onUnlock={() => setIsLocked(false)} 
        userEmail={user.email} 
        onDisableBiometric={() => {
          localStorage.removeItem('nutri-biometric-enabled');
          setIsLocked(false);
        }}
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
      />
    );
  }

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-[#f4f9f6] dark:bg-[#0f172a] text-slate-800 dark:text-slate-100 font-sans relative selection:bg-emerald-500/20 selection:text-emerald-700 dark:selection:text-emerald-400 flex flex-col transition-colors duration-500">
      {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}
      
      <motion.div 
        className="flex-1 flex flex-col"
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
                     <div className="flex items-center gap-2 sm:gap-3">
              <motion.button 
                whileHover={{ scale: 1.05, y: -0.5 }} 
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  playSfx('tap');
                  setIsFeedbackOpen(true);
                }}
                className="relative p-[1.5px] rounded-full overflow-hidden shrink-0 shadow-[0_0_15px_rgba(93,255,0,0.45)] dark:shadow-[0_0_20px_rgba(255,255,255,0.18)] focus:outline-none active:scale-95 cursor-pointer group"
                title="Deixe seu feedback"
                id="header-feedback-trigger-btn"
              >
                {/* Rotating neon light trail - custom green in light mode, white in dark mode */}
                <div className="absolute inset-[-150%] bg-[conic-gradient(from_0deg,transparent_40%,rgba(93,255,0,0.15)_60%,#5dff00_90%,rgba(93,255,0,0.15)_100%)] dark:bg-[conic-gradient(from_0deg,transparent_40%,rgba(255,255,255,0.15)_60%,#ffffff_90%,rgba(255,255,255,0.15)_100%)] animate-[spin_2.5s_linear_infinite]" />
                
                {/* Inner button mask */}
                <div className="relative flex items-center gap-1.5 px-3.5 py-1.5 md:px-4 md:py-2 rounded-full bg-white dark:bg-slate-900 border border-transparent text-emerald-600 dark:text-emerald-400 font-medium text-xs md:text-sm hover:bg-slate-50 dark:hover:bg-slate-800/90 transition-colors">
                  <div className="absolute inset-0 rounded-full bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <MessageSquare className="w-4 h-4 text-emerald-500 relative z-10 shrink-0" />
                  <span className="inline-block text-xs md:text-sm font-semibold relative z-10 text-slate-800 dark:text-slate-200">
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
                className="p-2.5 rounded-full text-slate-500 hover:text-emerald-500 hover:bg-emerald-50 dark:text-slate-400 dark:hover:text-emerald-400 dark:hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
                title="Mudar idioma / Change language"
                id="header-language-trigger-btn"
              >
                <Globe className="w-5 h-5" />
              </motion.button>

              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.95 }}
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="p-2.5 rounded-full text-slate-500 hover:text-amber-500 hover:bg-amber-50 dark:text-slate-400 dark:hover:text-amber-300 dark:hover:bg-slate-800 transition-colors shrink-0"
                title={isDarkMode ? "Mudar para modo claro" : "Mudar para modo escuro"}
              >
                {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5 text-indigo-400" />}
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
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, scale: 0.98, filter: 'blur(4px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, scale: 1.02, filter: 'blur(4px)' }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
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
      />
      
      <NotificationSystem 
        notifications={notifications} 
        onDismiss={(id) => setNotifications(prev => prev.filter(n => n.id !== id))} 
      />
      </motion.div>
    </div>
  );
}
