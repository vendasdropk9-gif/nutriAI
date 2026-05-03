import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Brain, Sparkles, TrendingUp, Zap, ChevronRight, Activity, Calendar, CheckCircle2, AlertCircle, Volume2, Plus, Target, PieChart as pieChartIcon, RefreshCw, Dumbbell, Utensils, Star, ActivitySquare } from 'lucide-react';
import { UserProfile, IntakeLog, Recipe, NutritionInfo, MasterPlanStrategy } from '../types';
import { adjustMealPlan, generateAdaptiveInsight, generateMasterStrategy, generateBehavioralIntervention, BehavioralIntervention } from '../lib/gemini';
import { speak } from '../lib/speech';
import { PersonalizationWizard } from './PersonalizationWizard';

interface AdaptiveCoachProps {
  profile: UserProfile | null;
  onUpdateProfile: (profile: UserProfile) => void;
  onUpdatePlan: (day: string, mealName: string, recipeId: string | null, recipeObj?: Recipe) => void;
}

export const AdaptiveCoach: React.FC<AdaptiveCoachProps> = ({ profile, onUpdateProfile, onUpdatePlan }) => {
  const [insight, setInsight] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [suggestedMeal, setSuggestedMeal] = useState<{ type: string; recipe: Omit<Recipe, 'id'> } | null>(null);
  const [behavioralIntervention, setBehavioralIntervention] = useState<BehavioralIntervention | null>(null);

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
      const intervention = await generateBehavioralIntervention(profile);
      if (intervention) {
        setBehavioralIntervention(intervention);
        setInsight(intervention.voiceMessage);
      }
    }
  };

  const generateStrategy = async () => {
    if (!profile) return;
    setLoading(true);
    setInsight("Pode deixar comigo, vou montar tudo do seu jeito 💚");
    const strategy = await generateMasterStrategy(profile);
    if (strategy) {
      onUpdateProfile({ ...profile, masterPlan: strategy });
    }
    setLoading(false);
  };

  const loadInsight = async () => {
    if (!profile) return;
    setLoading(true);
    const text = await generateAdaptiveInsight(profile, profile.intakeLogs || []);
    setInsight(text);
    setLoading(false);
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
    if (!profile) return;
    setLoading(true);
    const meal = await adjustMealPlan(profile, profile.intakeLogs || [], mealType);
    if (meal) {
      setSuggestedMeal({ type: mealType, recipe: meal });
    }
    setLoading(false);
  };

  const applyAdjustment = () => {
    if (!suggestedMeal || !profile) return;
    const rId = crypto.randomUUID();
    const recipe: Recipe = { ...suggestedMeal.recipe, id: rId };
    
    const mealKeyMap = {
      'Café da Manhã': 'breakfast',
      'Almoço': 'lunch',
      'Lanche': 'snack',
      'Jantar': 'dinner'
    };
    
    const day = new Date().toISOString().split('T')[0];
    onUpdatePlan(day, mealKeyMap[suggestedMeal.type as keyof typeof mealKeyMap], recipe.id, recipe);
    setSuggestedMeal(null);
    
    // Add point for adjusting
    const newPoints = (profile.points || 0) + 50;
    onUpdateProfile({ 
      ...profile, 
      points: newPoints,
      pointsHistory: [...(profile.pointsHistory || []), {
        id: crypto.randomUUID(),
        date: new Date().toISOString(),
        amount: 50,
        reason: 'Plano adaptado pela IA'
      }]
    });
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
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header Insight */}
      <div className="relative overflow-hidden rounded-[40px] bg-gradient-to-br from-emerald-600 to-teal-800 p-8 text-white shadow-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
        
        <div className="relative z-10 space-y-6">
          <div className="flex items-center gap-2 px-4 py-1.5 bg-white/20 rounded-full w-max text-xs font-black uppercase tracking-widest backdrop-blur-md">
            <Zap className="w-3 h-3 fill-current" />
            Nutricionista Digital Ativo
          </div>

          <div className="flex items-start justify-between gap-6">
            <div className="space-y-2">
              <h1 className="text-3xl font-black tracking-tight leading-tight">
                {loading ? 'Analisando seu dia...' : 'Análise Adaptativa Real'}
              </h1>
              <p className="text-emerald-50/80 text-lg font-medium leading-relaxed max-w-2xl">
                {loading ? 'Monitorando seus micronutrientes e biotipo para otimizar o próximo passo...' : insight || 'Estou pronta para ajustar seu dia conforme suas escolhas reais.'}
              </p>
            </div>
            
            <button 
              onClick={handleSpeak}
              disabled={isPlaying || loading}
              className={`w-16 h-16 rounded-[24px] flex items-center justify-center transition-all ${
                isPlaying ? 'bg-white text-emerald-600 animate-pulse' : 'bg-white/20 hover:bg-white text-white hover:text-emerald-700'
              }`}
            >
              <Volume2 className="w-8 h-8" />
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
          <div key={i} className="bg-white dark:bg-slate-900 p-6 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none">
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

      {/* Behavioral Intervention Display */}
      {behavioralIntervention && (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800 rounded-[32px] p-8 shadow-xl relative overflow-hidden"
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
        <div className="bg-slate-900 rounded-[40px] p-8 md:p-10 text-white shadow-2xl relative overflow-hidden">
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
                     <p className="text-xl font-bold text-white">{profile.masterPlan.macros.protein}g</p>
                  </div>
                  <div className="bg-white/5 p-4 rounded-3xl border border-white/10">
                     <p className="text-[10px] uppercase font-black tracking-wider text-slate-400 mb-1">Carbos</p>
                     <p className="text-xl font-bold text-white">{profile.masterPlan.macros.carbs}g</p>
                  </div>
                  <div className="bg-white/5 p-4 rounded-3xl border border-white/10">
                     <p className="text-[10px] uppercase font-black tracking-wider text-slate-400 mb-1">Gorduras</p>
                     <p className="text-xl font-bold text-white">{profile.masterPlan.macros.fat}g</p>
                  </div>
               </div>
            </div>

            <div className="w-full md:w-80 space-y-4">
               <div className="bg-white/5 p-6 rounded-[32px] border border-white/10 space-y-4">
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

               <div className="bg-white/5 p-6 rounded-[32px] border border-white/10 space-y-4">
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
      <div className="bg-white dark:bg-slate-900 rounded-[40px] p-8 border border-slate-100 dark:border-slate-800 shadow-2xl">
        <div className="flex items-center justify-between mb-8">
            <div className="space-y-1">
                <h2 className="text-2xl font-black text-slate-900 dark:text-white">Ajuste em Tempo Real</h2>
                <p className="text-sm font-medium text-slate-500">Selecione qual refeição você quer que a IA adapte agora.</p>
            </div>
            <div className="p-3 bg-amber-500/10 text-amber-500 rounded-2xl">
                <Brain className="w-6 h-6" />
            </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {['Café da Manhã', 'Almoço', 'Lanche', 'Jantar'].map((meal) => (
                <button
                    key={meal}
                    onClick={() => handleAdjustPlan(meal as any)}
                    className="group relative h-32 rounded-[28px] border-2 border-slate-100 dark:border-slate-800 hover:border-emerald-500 dark:hover:border-emerald-600 transition-all overflow-hidden"
                >
                    <div className="absolute inset-0 bg-slate-50 dark:bg-slate-800 transition-all group-hover:bg-emerald-50 dark:group-hover:bg-emerald-900/10" />
                    <div className="relative z-10 h-full flex flex-col items-center justify-center space-y-2">
                        <Plus className="w-6 h-6 text-slate-400 group-hover:text-emerald-500 transition-colors" />
                        <span className="text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-300">{meal}</span>
                    </div>
                </button>
            ))}
        </div>
      </div>

      {/* Suggested Adjustment Overlay */}
      <AnimatePresence>
        {suggestedMeal && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed inset-x-4 bottom-24 md:bottom-32 z-50 max-w-lg mx-auto"
          >
            <div className="bg-white dark:bg-slate-900 rounded-[32px] p-6 shadow-2xl border-2 border-emerald-500 ring-4 ring-emerald-500/10">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-500 rounded-xl text-white">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-lg font-black text-slate-900 dark:text-white">Ajuste Inteligente: {suggestedMeal.type}</h4>
                    <p className="text-xs font-bold text-emerald-500">Compensação Nutricional IA</p>
                  </div>
                </div>
                <button onClick={() => setSuggestedMeal(null)} className="text-slate-400 hover:text-slate-600">
                    <CheckCircle2 className="w-6 h-6" />
                </button>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl mb-6">
                <h5 className="font-bold text-slate-900 dark:text-white mb-1">{suggestedMeal.recipe.name}</h5>
                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">{suggestedMeal.recipe.description}</p>
                <div className="flex gap-3 mt-3">
                    <div className="text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-2 py-1 rounded">
                        {suggestedMeal.recipe.nutrition.protein}g Proteína
                    </div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-600 bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded">
                        {suggestedMeal.recipe.nutrition.calories} kcal
                    </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => setSuggestedMeal(null)}
                  className="flex-1 py-4 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-sm"
                >
                  Recusar
                </button>
                <button 
                  onClick={applyAdjustment}
                  className="flex-[2] py-4 rounded-2xl bg-emerald-600 text-white font-black text-sm uppercase tracking-widest shadow-xl shadow-emerald-600/30 hover:bg-emerald-700 transition-all"
                >
                  Trocar agora no plano
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Body Stats & Biotype Info */}
      <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-slate-50 dark:bg-slate-900/40 p-8 rounded-[40px] space-y-6">
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

          <div className="bg-emerald-50 dark:bg-emerald-950/20 p-8 rounded-[40px] space-y-6">
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
