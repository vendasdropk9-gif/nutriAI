import { safeGet, safeSet, safeRemove } from "../lib/storage";
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Brain, Sparkles, TrendingUp, Zap, ChevronRight, Activity, Calendar, 
  CheckCircle2, AlertCircle, Volume2, Plus, Target, PieChart as pieChartIcon, 
  RefreshCw, Dumbbell, Utensils, Star, ActivitySquare, ArrowUpRight, Loader2,
  Coffee, Apple, Moon, Clock, Flame, Check, X, RotateCcw
} from 'lucide-react';
import { UserProfile, IntakeLog, Recipe, NutritionInfo, MasterPlanStrategy, AdaptiveInsight, WorkoutLog } from '../types';
import { adjustMealPlan, generateAdaptiveInsight, generateMasterStrategy, generateBehavioralIntervention, BehavioralIntervention } from '../lib/gemini';
import { speak } from '../lib/speech';
import { playSfx, vibrate } from '../lib/sensory';
import { PersonalizationWizard } from './PersonalizationWizard';
import { db } from '../lib/firebase';
import { collection, addDoc, query, where, orderBy, limit, getDocs, onSnapshot, serverTimestamp } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firebaseUtils';
import { useAuth } from '../contexts/AuthContext';

interface AdaptiveCoachProps {
  profile: UserProfile | null;
  onUpdateProfile: (profile: UserProfile) => void;
  onUpdatePlan: (day: string, mealName: string, recipeId: string | null, recipeObj?: Recipe) => void;
}

export const AdaptiveCoach: React.FC<AdaptiveCoachProps> = ({ profile, onUpdateProfile, onUpdatePlan }) => {
  const { user } = useAuth();
  const [insight, setInsight] = useState<string>('');
  const [adaptiveInsight, setAdaptiveInsight] = useState<AdaptiveInsight | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMeal, setLoadingMeal] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [suggestedMeal, setSuggestedMeal] = useState<{ type: string; recipe: Omit<Recipe, 'id'> } | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [behavioralIntervention, setBehavioralIntervention] = useState<BehavioralIntervention | null>(null);

  useEffect(() => {
    if (!profile) return;
    if (!user) return; // test mode bypasses firestore listen

    const isLocalUser = user.uid.startsWith('local-user-') || user.email?.includes('local');
    if (isLocalUser) {
      // Load local insight if any exists from localStorage
      const localInsightStr = safeGet(`nutri-local-adaptive-insight-${user.uid}`);
      if (localInsightStr) {
        try {
          setAdaptiveInsight(JSON.parse(localInsightStr));
        } catch (e) {
          console.warn(e);
        }
      }
      return;
    }

    // Load existing insights from Firestore
    const insightsRef = collection(db, `users/${user.uid}/adaptiveInsights`);
    const q = query(insightsRef, orderBy('date', 'desc'), limit(1));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        setAdaptiveInsight({ id: doc.id, ...doc.data() } as AdaptiveInsight);
      }
    }, (error) => {
      try { handleFirestoreError(error, OperationType.LIST, `users/${user.uid}/adaptiveInsights`); } catch(e) {}
    });

    return () => unsubscribe();
  }, [user, profile]);

  useEffect(() => {
    if (profile && profile.bodyType && profile.metabolism) {
      if (!profile.masterPlan) {
        generateStrategy();
      } else {
        loadInsight();
        checkBehavioralIntervention();
      }
    }
  }, [profile?.bodyType, profile?.metabolism, profile?.routine, profile?.masterPlan]);

  const checkBehavioralIntervention = async () => {
    if (!profile) return;
    // We only trigger this if they have some logs to avoid constant spam
    const hasEnoughLogs = (profile.intakeLogs?.length || 0) > 3 || (profile.workoutLogs?.length || 0) > 1;
    if (hasEnoughLogs) {
      try {
        const intervention = await generateBehavioralIntervention(profile);
        if (intervention) {
          setBehavioralIntervention(intervention);
          setInsight(intervention.voiceMessage);
        }
      } catch (err) {
        console.warn("Failing to generate behavioral intervention:", err);
      }
    }
  };

  const generateStrategy = async () => {
    if (!profile) return;
    setLoading(true);
    setInsight("Pode deixar comigo, vou montar tudo do seu jeito 💚");
    try {
      const strategy = await generateMasterStrategy(profile);
      if (strategy) {
        onUpdateProfile({ ...profile, masterPlan: strategy });
      }
    } catch (err) {
      console.warn("Failing to generate master strategy:", err);
      setInsight("Tive um probleminha ao sincronizar o seu plano de metas, mas já estou analisando o que podemos melhorar hoje!");
    } finally {
      setLoading(false);
    }
  };

  const loadInsight = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const data = await generateAdaptiveInsight(profile, profile.intakeLogs || [], profile.workoutLogs || []);
      if (data) {
        setInsight(data.recommendation);
        // Save to Firestore if it's high confidence/significant
        if (user) {
          const isLocalUser = user.uid.startsWith('local-user-') || user.email?.includes('local');
          if (isLocalUser) {
            const localInsightObj = {
              id: crypto.randomUUID(),
              ...data,
              status: 'pending',
              date: new Date().toISOString()
            } as any;
            safeSet(`nutri-local-adaptive-insight-${user.uid}`, JSON.stringify(localInsightObj));
            setAdaptiveInsight(localInsightObj);
          } else {
            try {
              const insightsRef = collection(db, `users/${user.uid}/adaptiveInsights`);
              await addDoc(insightsRef, {
                ...data,
                status: 'pending',
                date: new Date().toISOString(),
                userId: user.uid,
                createdAt: serverTimestamp()
              });
            } catch (error) {
              try { handleFirestoreError(error, OperationType.CREATE, `users/${user.uid}/adaptiveInsights`); } catch(e) {}
            }
          }
        }
      }
    } catch (err) {
      console.warn("Failing to generate adaptive insight:", err);
      setInsight("Notei que você está no caminho certo! Continue registrando suas atividades diárias para podermos traçar novas estratégias de alta performance.");
    } finally {
      setLoading(false);
    }
  };

  const handleSpeak = async () => {
    if (!insight || isPlaying) return;
    setIsPlaying(true);
    await speak(insight, { onEnded: () => setIsPlaying(false) });
  };

  const getDailyTotals = () => {
    const today = new Date().toDateString();
    const todayLogs = (profile?.intakeLogs || []).filter(log => new Date(log.date).toDateString() === today);
    
    return todayLogs.reduce((acc, log) => ({
      calories: acc.calories + log.actual.calories,
      protein: acc.protein + log.actual.protein,
      carbs: acc.carbs + log.actual.carbs,
      fat: acc.fat + log.actual.fat,
    }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
  };

  const handleAdjustPlan = async (mealType: 'Café da Manhã' | 'Almoço' | 'Lanche' | 'Jantar') => {
    playSfx('tap');
    vibrate(30);
    setLoading(true);
    setLoadingMeal(mealType);

    const activeProfile: UserProfile = profile || {
      name: user?.displayName || 'Usuário',
      goals: 'Emagrecimento e Saúde',
      bodyType: 'Mesomorfo',
      metabolism: 'Moderado',
      weight: 70,
      height: 175,
      age: 28,
      equipment: [],
      restrictions: [],
      allergies: [],
      favorites: [],
      cart: []
    };

    try {
      const meal = await adjustMealPlan(activeProfile, activeProfile.intakeLogs || [], mealType);
      if (meal) {
        setSuggestedMeal({ type: mealType, recipe: meal });
        playSfx('success');
      } else {
        // Fallback meal guarantee
        const fallbackOptions: Record<string, Omit<Recipe, 'id'>> = {
          'Café da Manhã': {
            name: 'Omelete Funcional com Espinafre e Queijo Branco',
            description: 'Café da manhã rico em proteínas de alto valor biológico e ferro, ideal para manter a saciedade.',
            prepTime: '12 min',
            ingredients: [
              '2 ovos caipiras inteiros + 1 clara',
              '1 xícara de folhas de espinafre fresco picado',
              '2 fatias de queijo branco em cubos',
              '1 fatia de pão integral',
              '1 colher de chá de azeite extra virgem',
              'Sal marinho, orégano e cúrcuma a gosto'
            ],
            instructions: [
              'Bata os ovos com uma pitada de sal, orégano e cúrcuma.',
              'Refogue o espinafre no azeite até murchar.',
              'Adicione os ovos batidos e o queijo branco.',
              'Deixe dourar, dobre ao meio e sirva com a torrada integral.'
            ],
            nutrition: { calories: 340, protein: 26, carbs: 18, fat: 16 }
          },
          'Almoço': {
            name: 'Bowl de Quinoa Real com Frango Grelhado e Legumes',
            description: 'Almoço completo e balanceado, combinando proteínas magras, carboidratos de baixo índice glicêmico e fibras.',
            prepTime: '20 min',
            ingredients: [
              '150g de peito de frango grelhado em tiras',
              '1/2 xícara de quinoa cozida',
              '1 xícara de brócolis e cenoura no vapor',
              'Mix de folhas verdes',
              '1 colher de sopa de azeite extra virgem',
              'Gotas de limão siciliano e ervas finas'
            ],
            instructions: [
              'Grelhe o frango temperado com ervas e limão.',
              'Disponha a quinoa na base do prato/bowl.',
              'Adicione o frango, os legumes e o mix de folhas.',
              'Regue com o azeite de oliva e finalize com limão.'
            ],
            nutrition: { calories: 450, protein: 42, carbs: 38, fat: 14 }
          },
          'Lanche': {
            name: 'Parfait de Iogurte Grego com Frutas Vermelhas e Castanhas',
            description: 'Lanche proteico e prático para controlar a fome e otimizar os níveis de energia.',
            prepTime: '5 min',
            ingredients: [
              '1 pote (150g) de iogurte grego natural sem açúcar',
              '1/2 xícara de morangos e mirtilos frescos',
              '1 colher de sopa de sementes de chia',
              '1 colher de sobremesa de castanhas picadas',
              '1 pitada de canela em pó'
            ],
            instructions: [
              'Coloque o iogurte grego em um bowl ou taça.',
              'Adicione as frutas vermelhas e as sementes de chia.',
              'Finalize com as castanhas picadas e a canela em pó.'
            ],
            nutrition: { calories: 220, protein: 18, carbs: 20, fat: 7 }
          },
          'Jantar': {
            name: 'Filé de Tilápia com Purê de Mandioquinha e Legumes Salteados',
            description: 'Jantar leve de fácil digestão rico em ômega e minerais, ideal para um descanso tranquilo.',
            prepTime: '20 min',
            ingredients: [
              '1 filé grande (160g) de tilápia grelhada',
              '1 mandioquinha média cozida e amassada com sal',
              '1 xícara de abobrinha e tomates cereja salteados',
              '1 colher de chá de azeite extra virgem',
              'Ervas frescas e limão a gosto'
            ],
            instructions: [
              'Grelhe o peixe temperado com limão, sal e ervas.',
              'Amasse a mandioquinha ainda quente para formar o purê suave.',
              'Salteie a abobrinha com os tomatinhos cereja no azeite.',
              'Sirva o peixe ao lado do purê e dos legumes.'
            ],
            nutrition: { calories: 380, protein: 36, carbs: 28, fat: 11 }
          }
        };
        setSuggestedMeal({ type: mealType, recipe: fallbackOptions[mealType] || fallbackOptions['Almoço'] });
        playSfx('success');
      }
    } catch (err) {
      console.warn("Erro ao ajustar plano:", err);
    } finally {
      setLoading(false);
      setLoadingMeal(null);
    }
  };

  const applyAdjustment = () => {
    if (!suggestedMeal) return;
    const rId = crypto.randomUUID();
    const recipe: Recipe = { ...suggestedMeal.recipe, id: rId };
    
    const mealKeyMap: Record<string, string> = {
      'Café da Manhã': 'breakfast',
      'Almoço': 'lunch',
      'Lanche': 'snack',
      'Jantar': 'dinner'
    };
    
    const day = new Date().toISOString().split('T')[0];
    const key = mealKeyMap[suggestedMeal.type] || 'lunch';
    onUpdatePlan(day, key, recipe.id, recipe);
    
    // Add point for adjusting
    if (profile) {
      const newPoints = (profile.points || 0) + 50;
      onUpdateProfile({ 
        ...profile, 
        points: newPoints,
        pointsHistory: [...(profile.pointsHistory || []), {
          id: crypto.randomUUID(),
          date: new Date().toISOString(),
          amount: 50,
          reason: `Refeição adaptada pela IA (${suggestedMeal.type})`
        }]
      });
    }

    playSfx('confetti');
    vibrate([50, 50, 100]);
    setToastMessage(`🎉 ${suggestedMeal.type} ajustado e salvo com sucesso no seu plano de hoje! (+50 XP)`);
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);

    setSuggestedMeal(null);
  };

  const handleWizardComplete = (data: Partial<UserProfile>) => {
    if (profile) {
      onUpdateProfile({ ...profile, ...data });
    } else {
      onUpdateProfile({
        name: 'Usuário',
        restrictions: data.restrictions || [],
        favorites: [],
        cart: [],
        weight: 0,
        height: 0,
        goals: 'Ser Saudável',
        ...data
      } as any);
    }
    // Set a timeout to allow the "Plano criado com sucesso" screen to be seen for 2s
    setTimeout(() => {
        loadInsight();
    }, 2000);
  };

  if (!profile?.bodyType || !profile?.metabolism || !profile?.routine) {
    return <PersonalizationWizard profile={profile} onComplete={handleWizardComplete} />;
  }

  const totals = getDailyTotals();

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 flex flex-col items-stretch">
      {/* Header Insight */}
      <div className="relative overflow-hidden rounded-[32px] sm:rounded-[40px] clay-card bg-gradient-to-br from-emerald-600 to-teal-800 p-6 sm:p-8 text-white shadow-2xl w-full">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none" />
        
        <div className="relative z-10 space-y-5 sm:space-y-6">
          <div className="flex items-center gap-2 px-3.5 py-1.5 bg-white/20 rounded-full w-max text-[11px] sm:text-xs font-black uppercase tracking-widest backdrop-blur-md">
            <Zap className="w-3 h-3 fill-current" />
            Nutricionista Digital Ativo
          </div>

          <div className="flex flex-col sm:flex-row items-start justify-between gap-5 sm:gap-6">
            <div className="space-y-2.5 flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight leading-tight">
                {loading ? 'Analisando seu dia...' : 'Análise Adaptativa Real'}
              </h1>
              <p className="text-emerald-50/90 text-sm sm:text-base md:text-lg font-medium leading-relaxed max-w-2xl">
                {loading ? 'Monitorando seus micronutrientes e biotipo para otimizar o próximo passo...' : insight || 'Estou pronta para ajustar seu dia conforme suas escolhas reais.'}
              </p>
              {!loading && (
                <div className="pt-2">
                  <button
                    onClick={loadInsight}
                    className="px-4 sm:px-5 py-2 sm:py-2.5 bg-white/15 hover:bg-white/25 text-white rounded-2xl text-xs sm:text-sm font-bold tracking-wide transition-all border border-white/25 shadow-sm flex items-center gap-2 cursor-pointer active:scale-95"
                  >
                    <Zap className="w-4 h-4 fill-current" /> Atualizar Análise
                  </button>
                </div>
              )}
            </div>
            
            <button 
              onClick={handleSpeak}
              disabled={isPlaying || loading}
              className={`w-12 h-12 sm:w-16 sm:h-16 rounded-2xl sm:rounded-[24px] flex items-center justify-center shrink-0 transition-all cursor-pointer shadow-lg ${
                isPlaying ? 'bg-white text-emerald-600 animate-pulse ring-4 ring-white/30' : 'bg-white/20 hover:bg-white text-white hover:text-emerald-700'
              }`}
              title="Ouvir análise"
            >
              <Volume2 className="w-6 h-6 sm:w-8 sm:h-8" />
            </button>
          </div>
        </div>
      </div>

      {/* Grid Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Calorias', value: totals.calories, unit: 'kcal', color: 'emerald', icon: Activity },
          { label: 'Proteínas', value: totals.protein, unit: 'g', color: 'blue', icon: Zap },
          { label: 'Carbos', value: totals.carbs, unit: 'g', color: 'amber', icon: TrendingUp },
          { label: 'Gorduras', value: totals.fat, unit: 'g', color: 'rose', icon: pieChartIcon }
        ].map((stat, i) => (
          <div key={i} className="clay-card p-6 shadow-xl shadow-slate-200/50 dark:shadow-none">
            <div className="flex items-center justify-between mb-2">
                <div className={`p-2 rounded-xl bg-${stat.color}-500/10 text-${stat.color}-500`}>
                    <stat.icon className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Consumido</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-slate-900 dark:text-white">{stat.value.toFixed(0)}</span>
              <span className="text-xs font-bold text-slate-400">{stat.unit}</span>
            </div>
            <p className="text-xs font-medium text-slate-500 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Adaptive Insights Section */}
      {adaptiveInsight && adaptiveInsight.status === 'pending' && (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-emerald-950 rounded-[40px] clay-card p-8 text-white border border-emerald-500/30 shadow-2xl relative overflow-hidden"
        >
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
            
            <div className="relative z-10 space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/20 rounded-full text-[10px] font-black uppercase tracking-widest text-emerald-400 border border-emerald-500/20">
                        <Sparkles className="w-3 h-3" />
                        Otimização Disponível
                    </div>
                    <span className="text-[10px] font-bold text-emerald-500/60 uppercase">Aprendizado de Máquina Ativo</span>
                </div>

                <div className="space-y-2">
                    <h3 className="text-2xl font-black">{adaptiveInsight.type === 'macro_adjustment' ? 'Ajuste de Macros Detectado' : 'Adaptação de Rotina'}</h3>
                    <p className="text-emerald-100/80 leading-relaxed font-medium">
                        {adaptiveInsight.recommendation}
                    </p>
                </div>

                <div className="bg-white/5 rounded-3xl p-6 border border-white/10 space-y-4">
                    <div className="flex items-start gap-4">
                        <div className="p-2 bg-emerald-500/20 rounded-xl">
                            <Brain className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div>
                            <p className="text-xs font-black uppercase tracking-widest text-emerald-500 mb-1">Raciocínio da IA</p>
                            <p className="text-sm text-slate-300 leading-relaxed">{adaptiveInsight.reasoning}</p>
                        </div>
                    </div>

                    {adaptiveInsight.changes && (
                        <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                            <div className="flex gap-4">
                                <div>
                                    <p className="text-[10px] font-black uppercase text-slate-500">Novo Alvo Calórico</p>
                                    <p className="text-lg font-bold text-white">{adaptiveInsight.changes.dailyCalories} kcal</p>
                                </div>
                            </div>
                            <button
                                onClick={async () => {
                                    if (adaptiveInsight.changes && profile) {
                                      // Update local profile
                                      const newProfile = { 
                                        ...profile, 
                                        masterPlan: { 
                                          ...profile.masterPlan!, 
                                          ...adaptiveInsight.changes,
                                          macros: { ...profile.masterPlan!.macros, ...adaptiveInsight.changes.macros }
                                        } 
                                      };
                                      onUpdateProfile(newProfile);
                                      
                                      // Mark as applied in Firestore
                                      if (user) {
                                        const isLocalUser = user.uid.startsWith('local-user-') || user.email?.includes('local');
                                        if (isLocalUser) {
                                          const localInsightObj = { ...adaptiveInsight, status: 'applied' };
                                          safeSet(`nutri-local-adaptive-insight-${user.uid}`, JSON.stringify(localInsightObj));
                                        } else {
                                          try {
                                              const { doc, updateDoc } = await import('../lib/firebase');
                                              await updateDoc(doc(db, `users/${user.uid}/adaptiveInsights`, adaptiveInsight.id), { status: 'applied' });
                                          } catch (e) { console.warn(e); }
                                        }
                                      }
                                      setAdaptiveInsight(null);
                                    }
                                }}
                                className="px-6 py-3 bg-emerald-500 hover:clay-primary px-6 py-3 font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-emerald-500/20"
                            >
                                Aplicar Ajustes
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
      )}

      {/* Behavioral Intervention Display */}
      {behavioralIntervention && (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800 rounded-[32px] clay-card p-8 shadow-xl relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl" />
            <div className="flex items-start gap-4 relative z-10">
              <div className="p-3 bg-indigo-500 text-white rounded-2xl shrink-0 shadow-lg shadow-indigo-500/30">
                <Brain className="w-6 h-6" />
              </div>
              <div className="space-y-3">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/50 dark:bg-black/20 rounded-full text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                  <ActivitySquare className="w-3 h-3" />
                  Aprendizado Contínuo IA
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Análise de Comportamento</h3>
                
                {behavioralIntervention.suggestedAction && (
                  <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-800/50">
                    <p className="text-sm font-bold text-indigo-700 dark:text-indigo-400 mb-1">
                      Ajuste sugerido: {behavioralIntervention.suggestedAction.type.replace('_', ' ')}
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                      {behavioralIntervention.suggestedAction.description}
                    </p>
                  </div>
                )}
                
                <div className="flex items-center gap-3 bg-indigo-100 dark:bg-indigo-900/50 p-4 rounded-2xl text-indigo-800 dark:text-indigo-300">
                  <TrendingUp className="w-5 h-5 shrink-0" />
                  <p className="text-sm font-medium">{behavioralIntervention.predictionText}</p>
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      )}

      {/* Master Plan Presentation */}
      {profile.masterPlan && (
        <div className="bg-slate-900 rounded-[40px] clay-card p-8 md:p-10 text-white shadow-2xl relative overflow-hidden">
          <div className="absolute -right-20 -top-20 w-64 h-64 bg-emerald-500/20 blur-[100px] rounded-full point-events-none" />
          
          <div className="flex flex-col md:flex-row gap-8 relative z-10">
            <div className="flex-1 space-y-6">
               <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full text-xs font-black uppercase tracking-widest text-emerald-400">
                  <Star className="w-4 h-4" />
                  Estratégia Mestra
               </div>
               <h2 className="text-3xl font-black leading-tight">
                  Sua Rota de Alta Performance
               </h2>
               <p className="text-slate-300 font-medium leading-relaxed">
                  {profile.masterPlan.adaptiveNotes}
               </p>

               <div className="grid grid-cols-3 gap-4 pt-4">
                  <div className="bg-white/5 p-4 rounded-3xl border border-white/10">
                     <p className="text-[10px] uppercase font-black tracking-wider text-slate-400 mb-1">Proteína</p>
                     <p className="text-xl font-bold text-white">{profile.masterPlan.macros?.protein || 0}g</p>
                  </div>
                  <div className="bg-white/5 p-4 rounded-3xl border border-white/10">
                     <p className="text-[10px] uppercase font-black tracking-wider text-slate-400 mb-1">Carbos</p>
                     <p className="text-xl font-bold text-white">{profile.masterPlan.macros?.carbs || 0}g</p>
                  </div>
                  <div className="bg-white/5 p-4 rounded-3xl border border-white/10">
                     <p className="text-[10px] uppercase font-black tracking-wider text-slate-400 mb-1">Gorduras</p>
                     <p className="text-xl font-bold text-white">{profile.masterPlan.macros?.fat || 0}g</p>
                  </div>
               </div>
            </div>

            <div className="w-full md:w-80 space-y-4">
               <div className="bg-white/5 p-6 rounded-[32px] clay-card border border-white/10 space-y-4">
                  <div className="flex items-center gap-3">
                     <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
                        <Utensils className="w-5 h-5" />
                     </div>
                     <h3 className="font-bold">Foco Nutricional</h3>
                  </div>
                  <p className="text-sm text-slate-300 leading-relaxed">
                     {profile.masterPlan.nutritionFocus}
                  </p>
               </div>

               <div className="bg-white/5 p-6 rounded-[32px] clay-card border border-white/10 space-y-4">
                  <div className="flex items-center gap-3">
                     <div className="p-2 bg-blue-500/20 text-blue-400 rounded-xl">
                        <Dumbbell className="w-5 h-5" />
                     </div>
                     <h3 className="font-bold">Diretriz de Treino</h3>
                  </div>
                  <p className="text-sm text-slate-300 leading-relaxed">
                     {profile.masterPlan.workoutFocus}
                  </p>
               </div>
            </div>
          </div>
        </div>
      )}

      {/* Adjustment Console */}
      <div className="bg-white dark:bg-slate-900 rounded-[32px] sm:rounded-[40px] clay-card p-6 sm:p-8 border border-slate-100 dark:border-slate-800 shadow-2xl w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
            <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[11px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Motor Adaptativo Ativo</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">Ajuste em Tempo Real</h2>
                <p className="text-xs sm:text-sm font-medium text-slate-500">Selecione qual refeição você quer que a IA adapte agora com base no seu dia.</p>
            </div>
            <div className="p-3 bg-amber-500/10 text-amber-500 rounded-2xl w-max self-start sm:self-auto">
                <Brain className="w-6 h-6" />
            </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            {[
              { type: 'Café da Manhã', icon: Coffee, color: 'from-amber-500/10 to-orange-500/10 text-amber-500 border-amber-500/30 hover:border-amber-500', desc: 'Energia matinal' },
              { type: 'Almoço', icon: Utensils, color: 'from-emerald-500/10 to-teal-500/10 text-emerald-500 border-emerald-500/30 hover:border-emerald-500', desc: 'Nutrição principal' },
              { type: 'Lanche', icon: Apple, color: 'from-purple-500/10 to-pink-500/10 text-purple-500 border-purple-500/30 hover:border-purple-500', desc: 'Pausa proteica' },
              { type: 'Jantar', icon: Moon, color: 'from-blue-500/10 to-indigo-500/10 text-blue-500 border-blue-500/30 hover:border-blue-500', desc: 'Digestão leve' },
            ].map((item) => {
              const Icon = item.icon;
              const isCurrentLoading = loadingMeal === item.type;
              return (
                <button
                    key={item.type}
                    disabled={!!loadingMeal}
                    onClick={() => handleAdjustPlan(item.type as any)}
                    className={`group relative min-h-[140px] p-5 rounded-[28px] border-2 transition-all flex flex-col items-center justify-between text-center overflow-hidden disabled:opacity-60 disabled:cursor-not-allowed bg-gradient-to-b ${item.color} shadow-sm hover:shadow-lg active:scale-95`}
                >
                    <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 shadow-md flex items-center justify-center transition-transform group-hover:scale-110">
                        {isCurrentLoading ? (
                            <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
                        ) : (
                            <Icon className="w-6 h-6 transition-colors" />
                        )}
                    </div>
                    
                    <div className="space-y-0.5">
                        <span className="block text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                          {isCurrentLoading ? 'Ajustando...' : item.type}
                        </span>
                        <span className="block text-[10px] font-semibold text-slate-400 dark:text-slate-400">
                          {isCurrentLoading ? 'Calculando nutrientes...' : item.desc}
                        </span>
                    </div>

                    <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 opacity-90 group-hover:opacity-100">
                        <Sparkles className="w-3 h-3" />
                        <span>Adaptar IA</span>
                    </div>
                </button>
              );
            })}
        </div>
      </div>

      {/* Suggested Adjustment Centered Modal with createPortal for top-level overlay */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {suggestedMeal && (
            <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md overflow-hidden">
              <motion.div
                initial={{ opacity: 0, scale: 0.92, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.92, y: 15 }}
                transition={{ type: "spring", duration: 0.3 }}
                className="bg-[#0b131f] text-slate-100 rounded-[28px] sm:rounded-[36px] shadow-2xl border-2 border-emerald-500/40 ring-4 ring-emerald-500/10 max-w-lg w-full max-h-[88vh] flex flex-col overflow-hidden my-auto relative"
              >
                {/* Header (Fixed) */}
                <div className="shrink-0 p-4 sm:p-5 border-b border-emerald-500/20 flex items-start justify-between gap-3 bg-gradient-to-r from-[#0d1c2c] via-[#0f242d] to-[#0d1c2c] relative overflow-hidden">
                  <div className="absolute -right-8 -top-8 w-32 h-32 bg-emerald-500/15 blur-2xl rounded-full pointer-events-none" />
                  
                  <div className="flex items-center gap-3 min-w-0 relative z-10">
                    <div className="p-2.5 sm:p-3 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl text-white shadow-lg shadow-emerald-500/30 shrink-0">
                      <Sparkles className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                    <div className="min-w-0">
                      <span className="inline-block text-[10px] font-black uppercase tracking-wider text-emerald-300 bg-emerald-950/80 border border-emerald-500/30 px-2.5 py-0.5 rounded-full mb-1 shadow-xs">
                        Compensação Nutricional IA
                      </span>
                      <h4 className="text-base sm:text-lg font-black text-white truncate">
                        Ajuste: {suggestedMeal.type}
                      </h4>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSuggestedMeal(null)} 
                    className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors shrink-0 relative z-10"
                    aria-label="Fechar"
                  >
                    <X className="w-5 h-5 sm:w-6 sm:h-6" />
                  </button>
                </div>

                {/* Scrollable Content Body */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-[#0b131f]">
                  <div className="bg-gradient-to-b from-[#111d2e] to-[#0e1726] p-4 sm:p-5 rounded-2xl border border-emerald-500/20 shadow-md space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <h5 className="text-base sm:text-lg font-black text-white leading-snug">
                        {suggestedMeal.recipe.name}
                      </h5>
                      {suggestedMeal.recipe.prepTime && (
                        <span className="flex items-center gap-1 text-[11px] sm:text-xs font-bold text-emerald-300 bg-emerald-950/80 px-2.5 py-1 rounded-lg shrink-0 border border-emerald-500/30 shadow-xs">
                          <Clock className="w-3.5 h-3.5 text-amber-400" />
                          {suggestedMeal.recipe.prepTime}
                        </span>
                      )}
                    </div>
                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
                      {suggestedMeal.recipe.description}
                    </p>

                    {/* Macronutrient Grid (Responsive 2x2 on mobile, 4 cols on larger) */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5 pt-1">
                      <div className="bg-emerald-950/60 p-2.5 sm:p-3 rounded-2xl text-center border border-emerald-500/30 shadow-xs flex flex-col items-center justify-center">
                        <span className="block text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-emerald-400 whitespace-nowrap">
                          Proteína
                        </span>
                        <span className="text-base sm:text-lg font-black text-emerald-200 mt-0.5">
                          {suggestedMeal.recipe.nutrition?.protein || 0}g
                        </span>
                      </div>
                      <div className="bg-amber-950/60 p-2.5 sm:p-3 rounded-2xl text-center border border-amber-500/30 shadow-xs flex flex-col items-center justify-center">
                        <span className="block text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-amber-400 whitespace-nowrap">
                          Calorias
                        </span>
                        <span className="text-base sm:text-lg font-black text-amber-200 mt-0.5">
                          {suggestedMeal.recipe.nutrition?.calories || 0} <span className="text-[11px] font-bold">kcal</span>
                        </span>
                      </div>
                      <div className="bg-blue-950/60 p-2.5 sm:p-3 rounded-2xl text-center border border-blue-500/30 shadow-xs flex flex-col items-center justify-center">
                        <span className="block text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-blue-400 whitespace-nowrap">
                          Carbos
                        </span>
                        <span className="text-base sm:text-lg font-black text-blue-200 mt-0.5">
                          {suggestedMeal.recipe.nutrition?.carbs || 0}g
                        </span>
                      </div>
                      <div className="bg-purple-950/60 p-2.5 sm:p-3 rounded-2xl text-center border border-purple-500/30 shadow-xs flex flex-col items-center justify-center">
                        <span className="block text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-purple-400 whitespace-nowrap">
                          Gorduras
                        </span>
                        <span className="text-base sm:text-lg font-black text-purple-200 mt-0.5">
                          {suggestedMeal.recipe.nutrition?.fat || 0}g
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Ingredients snippet */}
                  {suggestedMeal.recipe.ingredients && suggestedMeal.recipe.ingredients.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                        <Utensils className="w-3.5 h-3.5" />
                        Ingredientes Principais
                      </span>
                      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-36 overflow-y-auto pr-1">
                        {suggestedMeal.recipe.ingredients.map((ing, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-xs text-slate-200 bg-[#121f31] p-2 rounded-xl border border-slate-700/60">
                            <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                            <span className="leading-snug">{ing}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Preparation steps (if available) */}
                  {suggestedMeal.recipe.instructions && suggestedMeal.recipe.instructions.length > 0 && (
                    <div className="space-y-2 pt-1">
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" />
                        Modo de Preparo
                      </span>
                      <ol className="space-y-2 max-h-36 overflow-y-auto pr-1">
                        {suggestedMeal.recipe.instructions.map((step, idx) => (
                          <li key={idx} className="flex items-start gap-2.5 text-xs text-slate-200 bg-[#121f31] p-2.5 rounded-xl border border-slate-700/60">
                            <span className="w-4 h-4 rounded-full bg-emerald-900/80 border border-emerald-500/40 text-emerald-300 text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">
                              {idx + 1}
                            </span>
                            <span className="leading-relaxed">{step}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                </div>

                {/* Fixed Footer Action Buttons */}
                <div className="shrink-0 p-4 sm:p-5 border-t border-emerald-500/20 bg-[#0d1726]/95 backdrop-blur-md flex flex-col-reverse sm:flex-row gap-2.5">
                  <button 
                    onClick={() => handleAdjustPlan(suggestedMeal.type as any)}
                    disabled={!!loadingMeal}
                    className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 font-bold text-xs sm:text-sm border border-slate-700 transition-colors active:scale-95 disabled:opacity-50"
                  >
                    <RotateCcw className={`w-4 h-4 ${loadingMeal ? 'animate-spin' : ''}`} />
                    <span>Outra Sugestão</span>
                  </button>

                  <button 
                    onClick={applyAdjustment}
                    className="flex-1 flex items-center justify-center gap-2 py-3.5 px-5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs sm:text-sm uppercase tracking-wider shadow-lg shadow-emerald-600/30 active:scale-98 transition-all border border-emerald-400/30"
                  >
                    <Check className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span>Trocar no plano (+50 XP)</span>
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Toast Notification with createPortal */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {toastMessage && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className="fixed top-5 left-1/2 -translate-x-1/2 z-[100000] max-w-md w-full px-4 pointer-events-none"
            >
              <div className="bg-emerald-600 text-white p-4 rounded-2xl shadow-2xl flex items-center gap-3 border border-emerald-400 pointer-events-auto">
                <Sparkles className="w-5 h-5 shrink-0 text-amber-300 animate-pulse" />
                <p className="text-xs font-bold leading-tight">{toastMessage}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Body Stats & Biotype Info */}
      <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-slate-50 dark:bg-slate-900/40 p-8 rounded-[40px] clay-card space-y-6">
              <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-500/10 text-blue-500 rounded-2xl">
                      <Target className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white">Perfil Metabólico</h3>
              </div>
              
              <div className="space-y-4">
                  <div className="flex justify-between items-center p-4 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-white dark:border-slate-700">
                      <span className="text-sm font-bold text-slate-500">Biotipo Dominante</span>
                      <span className="px-3 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded-lg text-xs font-black uppercase tracking-widest">
                        {profile.bodyType || 'Não analisado'}
                      </span>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-white dark:border-slate-700">
                      <span className="text-sm font-bold text-slate-500">Metabolismo</span>
                      <span className="px-3 py-1 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 rounded-lg text-xs font-black uppercase tracking-widest">
                        {profile.metabolism || 'Moderado'}
                      </span>
                  </div>
              </div>

              <div className="p-4 bg-blue-500/5 rounded-2xl border border-blue-500/10">
                <p className="text-xs text-blue-600 dark:text-blue-400 font-medium leading-relaxed">
                    Sua IA personaliza os macronutrientes com base nessas informações. Se você comeu mais gordura, a próxima refeição será ajustada para compensar.
                </p>
              </div>
          </div>

          <div className="bg-emerald-50 dark:bg-emerald-950/20 p-8 rounded-[40px] clay-card space-y-6">
            <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-2xl">
                    <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white">Dicas do Nutricionista</h3>
            </div>

            <div className="space-y-4 text-sm font-medium text-slate-600 dark:text-slate-300">
                <div className="flex gap-3">
                    <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] shrink-0 mt-1">1</div>
                    <p>Mantenha seus logs de alimentação sempre atualizados.</p>
                </div>
                <div className="flex gap-3">
                    <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] shrink-0 mt-1">2</div>
                    <p>Ao comer algo fora do plano, use a função "Comi Fora" para que a IA possa analisar e compensar.</p>
                </div>
                <div className="flex gap-3">
                    <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] shrink-0 mt-1">3</div>
                    <p>Siga as trocas inteligentes sugeridas quando estiver com pressa ou falta de tempo.</p>
                </div>
            </div>
          </div>
      </div>
    </div>
  );
};
