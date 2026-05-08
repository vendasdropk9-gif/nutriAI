import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useLocalStorage } from './hooks/useLocalStorage';
import { Recipe, MealPlan, UserProfile } from './types';
import { useAuth } from './contexts/AuthContext';
import { Login } from './components/Login';
import { useProfileSync } from './lib/profileSync';
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
import { SplashScreen } from './components/SplashScreen';
import { PartnerBanner } from './components/PartnerBanner';
import { DeliveryPartnerPortal } from './components/DeliveryPartnerPortal';
import { GamificationCenter } from './components/GamificationCenter';
import { DraggableNav } from './components/DraggableNav';
import { NotificationSystem, AppNotification } from './components/NotificationSystem';
import { LiveAssistant } from './components/LiveAssistant';
import { Utensils, CalendarDays, ShoppingBasket, User, Camera, Sparkles, Moon, Sun, GlassWater, Barcode, Brain, Trophy, Droplet, RefreshCw, ChefHat, Medal, TrendingUp, Dumbbell, Store, Crown, Map as MapIcon, Zap, Fingerprint } from 'lucide-react';
import { IntakeLog } from './types';

export default function App() {
  const { user, loading: authLoading } = useAuth();
  const [showSplash, setShowSplash] = useState(true);
  const [isDarkMode, setIsDarkMode] = useLocalStorage<boolean>('nutri-dark-mode', false);
  const [savedRecipes, setSavedRecipes] = useLocalStorage<Recipe[]>('nutri-recipes', []);
  const [mealPlan, setMealPlan] = useLocalStorage<MealPlan>('nutri-mealplan', {});
  const [profile, setProfile] = useLocalStorage<UserProfile | null>('nutri-profile', null);

  const { syncToFirestore } = useProfileSync(user, profile, setProfile);

  // Wrapper for setProfile to also sync
  const updateProfile = (newProfile: UserProfile | null) => {
    setProfile(newProfile);
    if (newProfile && user) {
      syncToFirestore(newProfile);
    }
  };

  const [activeTab, setActiveTab] = useState<'generator' | 'plan' | 'shopping' | 'profile' | 'analyzer' | 'journey' | 'juice' | 'barcode' | 'emotional' | 'challenge' | 'hydration' | 'swaps' | 'dining' | 'ranking' | 'prediction' | 'trainer' | 'market' | 'pricing' | 'partner' | 'delivery' | 'frescor' | 'coach' | 'gamification'>('market');
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const addNotification = (notif: Omit<AppNotification, 'id'>) => {
    const id = Math.random().toString(36).substring(7);
    setNotifications(prev => [...prev, { ...notif, id }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  };

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
    const handleNavigate = (e: CustomEvent) => {
      if (e.detail?.tab) {
        setActiveTab(e.detail.tab);
      }
    };
    window.addEventListener('app:navigate', handleNavigate as EventListener);
    return () => window.removeEventListener('app:navigate', handleNavigate as EventListener);
  }, []);

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

      if (user) syncToFirestore(updatedProfile);
      return updatedProfile;
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

  const [biometricUnlocked, setBiometricUnlocked] = useState(false);
  
  useEffect(() => {
    // If the device has biometric enabled, we require unlock when user is present
    if (user && localStorage.getItem('nutri-biometric-enabled') === 'true' && !biometricUnlocked) {
      import('./lib/biometric').then(({ verifyBiometric }) => {
        verifyBiometric().then(success => {
          if (success) setBiometricUnlocked(true);
        });
      });
    } else {
      setBiometricUnlocked(true);
    }
  }, [user, biometricUnlocked]);

  const handleManualBiometricRetry = async () => {
    const { verifyBiometric } = await import('./lib/biometric');
    const success = await verifyBiometric();
    if (success) {
      setBiometricUnlocked(true);
    } else {
      // If biometric fails completely, allow fallback to sign out
      import('./lib/supabase').then(({ supabase }) => supabase?.auth.signOut());
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] dark:bg-slate-950 flex flex-col items-center justify-center">
        <Utensils className="w-16 h-16 text-emerald-500 animate-pulse mb-6" />
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  if (!biometricUnlocked) {
    return (
      <div className="min-h-screen bg-[#f8fafc] dark:bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <Fingerprint className="w-20 h-20 text-emerald-500 mb-6 animate-pulse" />
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">App Bloqueado</h2>
        <p className="text-slate-500 dark:text-slate-400 mb-8">Por favor, autentique com biometria ou Face ID.</p>
        <button 
          onClick={handleManualBiometricRetry}
          className="bg-emerald-500 text-white font-bold py-3 px-8 rounded-full shadow-lg shadow-emerald-500/30 hover:bg-emerald-600 active:scale-95 transition-all"
        >
          Desbloquear
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f9f6] dark:bg-[#0f172a] text-slate-800 dark:text-slate-100 font-sans relative selection:bg-emerald-500/20 selection:text-emerald-700 dark:selection:text-emerald-400 flex flex-col transition-colors duration-500">
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
          <div className="flex justify-between items-center h-16 md:h-20">
            <div className="flex items-center gap-3 text-emerald-600 dark:text-emerald-400">
              <Utensils className="w-8 h-8" />
              <span className="font-serif text-2xl font-semibold tracking-wide">NutriAI</span>
            </div>
            
            <div className="flex items-center gap-4">
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.95 }}
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="p-2.5 rounded-full text-slate-500 hover:text-amber-500 hover:bg-amber-50 dark:text-slate-400 dark:hover:text-amber-300 dark:hover:bg-slate-800 transition-colors shrink-0"
                title={isDarkMode ? "Mudar para modo claro" : "Mudar para modo escuro"}
              >
                {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </motion.button>
            </div>
          </div>
        </div>
      </header>

      <div className="sticky top-16 md:top-20 z-[15]">
        <DraggableNav activeTab={activeTab} onTabChange={setActiveTab} />
      </div>

      <PartnerBanner />

      <main className={`relative z-10 flex-1 flex flex-col min-h-0 w-full mx-auto transition-all duration-500 ${
        activeTab === 'frescor' 
        ? 'max-w-none px-0 py-0' 
        : 'max-w-7xl px-4 sm:px-6 lg:px-8 py-8 md:py-16'
      }`}>
        <AnimatePresence mode="popLayout">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="w-full flex-1 flex flex-col min-h-[400px]"
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
            {activeTab === 'gamification' && (
              <GamificationCenter profile={profile} onUpdateProfile={updateProfile} />
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
            {activeTab === 'delivery' && (
              <DeliveryPartnerPortal onBack={() => setActiveTab('market')} />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      <SmartChat profile={profile} onNavigate={(tab) => setActiveTab(tab as any)} />
      <LiveAssistant profile={profile} />
      
      <NotificationSystem 
        notifications={notifications} 
        onDismiss={(id) => setNotifications(prev => prev.filter(n => n.id !== id))} 
      />
      </motion.div>
    </div>
  );
}
