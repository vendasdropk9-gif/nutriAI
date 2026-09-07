import React, { useState, useEffect } from 'react';
import { 
  Target, Trophy, Flame, ChevronRight, CheckCircle2, Circle, Sparkles, Calendar, Timer,
  Utensils, ChefHat, Clock, Zap, BookOpen, Lightbulb, Play, Check, Award, ArrowRight,
  Filter, Plus, RefreshCw, Volume2, X, ShoppingCart, Bookmark, BookmarkCheck, AlertCircle,
  HelpCircle, Star, Compass, Layers, ShieldCheck, Heart
} from 'lucide-react';
import { 
  Challenge, UserProfile, CulinaryChallenge, CulinaryChallengeRecipe, 
  CulinaryChallengeTip, CulinaryChallengeDailyMission, Recipe 
} from '../types';
import { generateChallengeFeedback, generatePersonalizedCulinaryChallenge } from '../lib/gemini';
import { getFilteredCulinaryChallenges, DEFAULT_CULINARY_CHALLENGES } from '../data/culinaryChallengesData';
import { ConfettiCelebration } from './ConfettiCelebration';
import { VoicePlayButton } from './VoicePlayButton';
import { speak } from '../lib/speech';
import { playSfx, vibrate } from '../lib/sensory';

interface ChallengeViewProps {
  profile: UserProfile | null;
  onUpdateChallenge: (challenge: Challenge | undefined) => void;
  onUpdateProfile?: (updater: (prev: UserProfile | null) => UserProfile | null) => void;
  onAwardPoints?: (amount: number, reason: string) => void;
  onNavigate?: (tab: string) => void;
  onSaveRecipe?: (recipe: Recipe) => void;
}

export function ChallengeView({ 
  profile, 
  onUpdateChallenge, 
  onUpdateProfile, 
  onAwardPoints,
  onNavigate,
  onSaveRecipe 
}: ChallengeViewProps) {
  // Main view mode: 'culinary' (AI Culinary Challenges) or 'habit' (Fast Habit Tracker)
  const [mainMode, setMainMode] = useState<'culinary' | 'habit'>('culinary');

  // Filter for culinary challenges: 'all' | 'weekly' | 'monthly'
  const [periodFilter, setPeriodFilter] = useState<'all' | 'weekly' | 'monthly'>('all');

  // Active culinary challenge
  const [activeCulinaryChallenge, setActiveCulinaryChallenge] = useState<CulinaryChallenge | null>(() => {
    if (profile?.culinaryChallenges && profile.activeCulinaryChallengeId) {
      return profile.culinaryChallenges.find(c => c.id === profile.activeCulinaryChallengeId) || null;
    }
    return null;
  });

  // Available challenges list (merging default + user generated)
  const [challengesList, setChallengesList] = useState<CulinaryChallenge[]>(() => {
    const curated = getFilteredCulinaryChallenges(profile);
    const userSaved = profile?.culinaryChallenges || [];
    const combined = [...userSaved];
    for (const c of curated) {
      if (!combined.some(existing => existing.id === c.id)) {
        combined.push(c);
      }
    }
    return combined;
  });

  // Modal states
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [customThemeInput, setCustomThemeInput] = useState('');
  const [genPeriod, setGenPeriod] = useState<'weekly' | 'monthly'>('weekly');
  const [isGenerating, setIsGenerating] = useState(false);

  // Recipe detail modal
  const [selectedRecipe, setSelectedRecipe] = useState<CulinaryChallengeRecipe | null>(null);
  const [checkedIngredients, setCheckedIngredients] = useState<Record<string, boolean>>({});
  const [recipeTimerSeconds, setRecipeTimerSeconds] = useState<number | null>(null);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [savedRecipeIds, setSavedRecipeIds] = useState<Record<string, boolean>>({});

  // Habit quick challenge states
  const [selectedHabitType, setSelectedHabitType] = useState<7 | 15 | 30>(7);
  const [habitGoal, setHabitGoal] = useState('');
  const [isProcessingHabit, setIsProcessingHabit] = useState(false);

  // Visual celebrations
  const [showConfetti, setShowConfetti] = useState(false);
  const [celebrationTitle, setCelebrationTitle] = useState('');

  // Sync active challenge from profile on load
  useEffect(() => {
    if (profile?.culinaryChallenges && profile.activeCulinaryChallengeId) {
      const active = profile.culinaryChallenges.find(c => c.id === profile.activeCulinaryChallengeId);
      if (active) setActiveCulinaryChallenge(active);
    }
  }, [profile?.activeCulinaryChallengeId, profile?.culinaryChallenges]);

  // Timer interval for recipe preparation
  useEffect(() => {
    let interval: any = null;
    if (isTimerRunning && recipeTimerSeconds !== null && recipeTimerSeconds > 0) {
      interval = setInterval(() => {
        setRecipeTimerSeconds(prev => (prev !== null && prev > 0 ? prev - 1 : 0));
      }, 1000);
    } else if (recipeTimerSeconds === 0 && isTimerRunning) {
      setIsTimerRunning(false);
      playSfx('confetti');
      vibrate(100);
      alert('⏰ O tempo do preparo da sua receita terminou!');
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, recipeTimerSeconds]);

  // Save changes to profile
  const saveCulinaryChallengeToProfile = (updatedChallenge: CulinaryChallenge, makeActive: boolean = true) => {
    setActiveCulinaryChallenge(updatedChallenge);
    setChallengesList(prev => {
      const idx = prev.findIndex(c => c.id === updatedChallenge.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = updatedChallenge;
        return copy;
      }
      return [updatedChallenge, ...prev];
    });

    if (onUpdateProfile) {
      onUpdateProfile(prev => {
        if (!prev) return prev;
        const prevChallenges = prev.culinaryChallenges || [];
        const filtered = prevChallenges.filter(c => c.id !== updatedChallenge.id);
        return {
          ...prev,
          culinaryChallenges: [updatedChallenge, ...filtered],
          activeCulinaryChallengeId: makeActive ? updatedChallenge.id : prev.activeCulinaryChallengeId
        };
      });
    }
  };

  // Start a culinary challenge
  const handleStartCulinaryChallenge = (challenge: CulinaryChallenge) => {
    playSfx('pop');
    vibrate(25);

    const started: CulinaryChallenge = {
      ...challenge,
      startDate: new Date().toISOString(),
      isActive: true,
      completed: false,
      completedDays: challenge.completedDays || 0,
      dailyMissions: challenge.dailyMissions.map(m => ({ ...m }))
    };

    saveCulinaryChallengeToProfile(started, true);
    setShowConfetti(true);
    setCelebrationTitle(`Desafio "${challenge.title}" Iniciado!`);

    const welcomeSpeech = `Maravilha! Você iniciou o desafio culinário ${challenge.title}. Vamos preparar pratos deliciosos e transformadores!`;
    speak(welcomeSpeech).catch(console.warn);
  };

  // Toggle mission completion
  const handleToggleMission = async (missionDay: number) => {
    if (!activeCulinaryChallenge) return;

    playSfx('success');
    vibrate(30);

    const updatedMissions = activeCulinaryChallenge.dailyMissions.map(m => {
      if (m.day === missionDay) {
        const isNowCompleted = !m.completed;
        return {
          ...m,
          completed: isNowCompleted,
          completedAt: isNowCompleted ? new Date().toISOString() : undefined
        };
      }
      return m;
    });

    const completedCount = updatedMissions.filter(m => m.completed).length;
    const isFinished = completedCount >= activeCulinaryChallenge.totalDays;

    const updatedChallenge: CulinaryChallenge = {
      ...activeCulinaryChallenge,
      dailyMissions: updatedMissions,
      completedDays: completedCount,
      completed: isFinished
    };

    saveCulinaryChallengeToProfile(updatedChallenge, true);

    if (onAwardPoints) {
      onAwardPoints(50, `Missão do Dia ${missionDay} concluída no desafio culinário`);
    }

    if (isFinished) {
      setShowConfetti(true);
      setCelebrationTitle(`🏆 Desafio ${activeCulinaryChallenge.title} Concluído!`);
      playSfx('confetti');
      vibrate(100);
      if (onAwardPoints) {
        onAwardPoints(activeCulinaryChallenge.rewardPoints, `Conquista do Selo: ${activeCulinaryChallenge.badgeName}`);
      }
      const finishSpeech = `Parabéns espetacular! Você concluiu todos os dias do desafio ${activeCulinaryChallenge.title} e desbloqueou o selo ${activeCulinaryChallenge.badgeName}!`;
      speak(finishSpeech).catch(console.warn);
    } else {
      // Short feedback for the day
      const feedback = await generateChallengeFeedback(completedCount, activeCulinaryChallenge.totalDays, profile);
      speak(feedback).catch(console.warn);
    }
  };

  // Generate new AI culinary challenge
  const handleGenerateAIChallenge = async () => {
    setIsGenerating(true);
    playSfx('pop');
    try {
      const newChallenge = await generatePersonalizedCulinaryChallenge(profile, genPeriod, customThemeInput.trim() || undefined);
      setShowGenerateModal(false);
      setCustomThemeInput('');
      handleStartCulinaryChallenge(newChallenge);
    } catch (e) {
      console.error("Erro ao gerar desafio:", e);
      alert("Não foi possível gerar no momento. Usando um dos nossos desafios curados!");
    } finally {
      setIsGenerating(false);
    }
  };

  // Convert Culinary Recipe to standard Recipe format and save
  const handleSaveCulinaryRecipe = (cr: CulinaryChallengeRecipe) => {
    playSfx('success');
    vibrate(20);

    const standardRecipe: Recipe = {
      id: cr.id || `recipe-${Date.now()}`,
      name: cr.name,
      description: cr.description,
      prepTime: cr.prepTime,
      ingredients: cr.ingredients,
      instructions: cr.instructions,
      nutrition: {
        calories: cr.calories,
        protein: cr.macros.protein,
        carbs: cr.macros.carbs,
        fat: cr.macros.fat
      },
      image: cr.imageUrl
    };

    if (onSaveRecipe) {
      onSaveRecipe(standardRecipe);
    } else if (onUpdateProfile) {
      onUpdateProfile(prev => {
        if (!prev) return prev;
        const prevSaved = prev.savedRecipes || [];
        if (prevSaved.some(r => r.name === cr.name)) return prev;
        return {
          ...prev,
          savedRecipes: [standardRecipe, ...prevSaved]
        };
      });
    }

    setSavedRecipeIds(prev => ({ ...prev, [cr.id]: true }));
    if (onAwardPoints) onAwardPoints(20, `Receita "${cr.name}" salva aos favoritos`);
  };

  // Add all ingredients to Shopping list
  const handleAddIngredientsToShopping = (cr: CulinaryChallengeRecipe) => {
    playSfx('pop');
    vibrate(20);
    // Open shopping list or copy to clipboard
    if (navigator.clipboard) {
      const text = `Ingredientes para ${cr.name}:\n` + cr.ingredients.map(i => `• ${i}`).join('\n');
      navigator.clipboard.writeText(text).catch(() => {});
    }
    alert(`🛒 ${cr.ingredients.length} ingredientes adicionados à sua lista de compras!`);
    if (onNavigate) {
      onNavigate('shopping');
    }
  };

  // Habit quick challenge (legacy mode)
  const challenge = profile?.currentChallenge;
  const startHabitChallenge = () => {
    if (!habitGoal.trim()) {
      alert("Por favor, defina uma meta diária (ex: 2L de água, zero açúcar refinado, salada em todo almoço).");
      return;
    }

    const newChallenge: Challenge = {
      type: selectedHabitType,
      startDate: new Date().toISOString(),
      completedDays: 0,
      dailyGoal: habitGoal.trim(),
      history: []
    };

    onUpdateChallenge(newChallenge);
    setShowConfetti(true);
    setCelebrationTitle('Desafio de Foco Iniciado!');
  };

  const completeHabitDay = async () => {
    if (!challenge) return;
    setIsProcessingHabit(true);

    const nextDay = challenge.completedDays + 1;
    const feedback = await generateChallengeFeedback(nextDay, challenge.type, profile);

    const newHistoryEntry = {
      day: nextDay,
      date: new Date().toISOString(),
      completed: true,
      feedback
    };

    const updatedChallenge: Challenge = {
      ...challenge,
      completedDays: nextDay,
      history: [...challenge.history, newHistoryEntry]
    };

    onUpdateChallenge(updatedChallenge);
    if (onAwardPoints) onAwardPoints(100, `Dia ${nextDay} do foco concluído`);
    setIsProcessingHabit(false);
    setShowConfetti(true);
    setCelebrationTitle(`Dia ${nextDay} Concluído com Sucesso!`);
    speak(feedback).catch(console.warn);
  };

  // Filtered challenges list
  const filteredChallenges = challengesList.filter(c => {
    if (periodFilter === 'weekly') return c.period === 'weekly';
    if (periodFilter === 'monthly') return c.period === 'monthly';
    return true;
  });

  const userRestrictions = [...(profile?.restrictions || []), ...(profile?.allergies || [])];

  return (
    <div className="max-w-5xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-28 px-3 sm:px-4">
      <ConfettiCelebration active={showConfetti} onComplete={() => setShowConfetti(false)} mode="all" />

      {/* Header Banner */}
      <div className="text-center space-y-3 pt-2">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-xs font-bold border border-emerald-500/20 shadow-xs">
          <Sparkles className="w-3.5 h-3.5 text-emerald-500 animate-spin" />
          <span>Inteligência Culinária & Gamificação Funcional</span>
        </div>
        <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-slate-900 dark:text-white">
          Desafios de Culinária Saudável
        </h2>
        <p className="font-sans text-slate-600 dark:text-slate-300 max-w-2xl mx-auto text-sm sm:text-base leading-relaxed">
          Transforme sua rotina com propostas culinárias semanais e mensais da Chef Malu. Receitas práticas, substituições inteligentes e metas adaptadas ao seu paladar.
        </p>

        {/* User restrictions badge info */}
        {userRestrictions.length > 0 && (
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/80 dark:bg-slate-800/80 border border-emerald-500/20 shadow-xs text-xs text-slate-600 dark:text-slate-300">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>
              <strong>100% Calibrado para você:</strong> {userRestrictions.join(', ')} ({profile?.goals || 'Vitalidade'})
            </span>
          </div>
        )}
      </div>

      {/* Mode Switcher Tabs */}
      <div className="flex items-center justify-center">
        <div className="bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl inline-flex gap-1.5 border border-slate-200 dark:border-slate-700 shadow-inner">
          <button
            onClick={() => {
              playSfx('tap');
              setMainMode('culinary');
            }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              mainMode === 'culinary'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25 scale-[1.02]'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <ChefHat className="w-4 h-4" />
            <span>Desafios Culinários com IA</span>
          </button>

          <button
            onClick={() => {
              playSfx('tap');
              setMainMode('habit');
            }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              mainMode === 'habit'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25 scale-[1.02]'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Target className="w-4 h-4" />
            <span>Desafio Rápido de Foco</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODE 1: CULINARY AI CHALLENGES */}
      {/* ========================================================================= */}
      {mainMode === 'culinary' && (
        <div className="space-y-10">

          {/* ACTIVE CULINARY CHALLENGE CARD */}
          {activeCulinaryChallenge ? (
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 text-white p-6 sm:p-8 md:p-10 shadow-xl shadow-emerald-900/20 border border-emerald-500/40">
              <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />

              <div className="relative z-10 space-y-8">
                {/* Top Info Bar */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/15 pb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center text-3xl shadow-inner border border-white/20 shrink-0">
                      {activeCulinaryChallenge.badgeIcon || '🍳'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-emerald-100 text-[10px] font-bold uppercase tracking-wider">
                          {activeCulinaryChallenge.period === 'weekly' ? 'Desafio Semanal (7 dias)' : 'Desafio Mensal (30 dias)'}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-400/25 text-amber-200 text-[10px] font-bold">
                          +{activeCulinaryChallenge.rewardPoints} pts
                        </span>
                      </div>
                      <h3 className="font-serif text-2xl sm:text-3xl font-bold mt-1 text-white">
                        {activeCulinaryChallenge.title}
                      </h3>
                      <p className="text-emerald-100/90 text-xs sm:text-sm font-sans mt-0.5 max-w-xl">
                        {activeCulinaryChallenge.tagline}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                    <VoicePlayButton
                      text={`${activeCulinaryChallenge.title}. ${activeCulinaryChallenge.description} Meta do desafio: ${activeCulinaryChallenge.goal}`}
                      size="sm"
                      title="Ouvir apresentação da Chef Malu"
                    />
                    <button
                      onClick={() => {
                        if (confirm('Deseja trocar de desafio culinário? O seu progresso atual ficará salvo.')) {
                          setActiveCulinaryChallenge(null);
                        }
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white/90 text-xs font-semibold border border-white/20 transition-all cursor-pointer"
                    >
                      Trocar Desafio
                    </button>
                  </div>
                </div>

                {/* Progress Bar & Badges */}
                <div className="grid sm:grid-cols-3 gap-6 bg-black/15 p-5 rounded-2xl border border-white/10 backdrop-blur-xs">
                  <div className="sm:col-span-2 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-emerald-100">
                      <span>Progresso das Missões Culinárias</span>
                      <span>
                        {activeCulinaryChallenge.completedDays || 0} de {activeCulinaryChallenge.totalDays} dias concluídos
                      </span>
                    </div>
                    <div className="w-full bg-white/20 h-3.5 rounded-full overflow-hidden p-0.5">
                      <div
                        className="h-full bg-gradient-to-r from-amber-300 to-amber-400 rounded-full transition-all duration-700 shadow-sm"
                        style={{
                          width: `${Math.min(100, (((activeCulinaryChallenge.completedDays || 0) / activeCulinaryChallenge.totalDays) * 100))}%`
                        }}
                      />
                    </div>
                    <p className="text-[11px] text-emerald-100/80 italic">
                      🎯 Meta: {activeCulinaryChallenge.goal}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 border-t sm:border-t-0 sm:border-l border-white/15 pt-3 sm:pt-0 sm:pl-6">
                    <div className="w-12 h-12 rounded-xl bg-amber-400/20 border border-amber-300/30 flex items-center justify-center text-2xl shrink-0">
                      {activeCulinaryChallenge.badgeIcon || '🏆'}
                    </div>
                    <div>
                      <p className="text-[10px] text-emerald-200 uppercase font-bold tracking-wider">Conquista em Jogo</p>
                      <p className="text-sm font-bold text-white leading-tight">{activeCulinaryChallenge.badgeName}</p>
                      <p className="text-[11px] text-amber-300 font-semibold mt-0.5">
                        {activeCulinaryChallenge.completed ? '🎉 Conquistado!' : 'Em andamento'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* DAILY MISSIONS CHECKLIST */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-amber-300" />
                      <h4 className="font-serif text-lg font-bold text-white">Missões Diárias do Desafio</h4>
                    </div>
                    <span className="text-xs text-emerald-200">
                      Clique no dia para registrar seu prato (+50 pts)
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {activeCulinaryChallenge.dailyMissions.map((mission) => {
                      const isDone = !!mission.completed;
                      return (
                        <div
                          key={mission.day}
                          onClick={() => handleToggleMission(mission.day)}
                          className={`p-3.5 rounded-2xl border transition-all cursor-pointer select-none flex flex-col justify-between gap-2.5 relative overflow-hidden group ${
                            isDone
                              ? 'bg-white/20 border-emerald-300/40 text-white shadow-sm'
                              : 'bg-white/10 hover:bg-white/15 border-white/15 text-emerald-50 hover:border-white/30'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="px-2 py-0.5 rounded-md bg-black/25 text-[10px] font-bold tracking-wider uppercase text-emerald-200">
                              Dia {mission.day}
                            </span>
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                              isDone ? 'bg-amber-400 text-slate-900 shadow-sm' : 'border border-white/40 text-transparent group-hover:border-white'
                            }`}>
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            </div>
                          </div>

                          <div>
                            <p className="text-xs font-bold leading-tight text-white">{mission.title}</p>
                            <p className="text-[11px] text-emerald-100/80 line-clamp-2 mt-1 leading-snug">
                              {mission.description}
                            </p>
                          </div>

                          {mission.targetRecipeName && (
                            <span className="text-[10px] font-semibold text-amber-200/90 truncate flex items-center gap-1">
                              <Utensils className="w-2.5 h-2.5" />
                              {mission.targetRecipeName}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* ASSOCIATED RECIPES SECTION */}
                <div className="space-y-4 pt-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Utensils className="w-5 h-5 text-amber-300" />
                      <h4 className="font-serif text-lg font-bold text-white">Receitas Recomendadas do Desafio</h4>
                    </div>
                    <span className="text-xs text-emerald-200">
                      {activeCulinaryChallenge.recipes.length} receitas selecionadas
                    </span>
                  </div>

                  <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {activeCulinaryChallenge.recipes.map((recipe) => {
                      const isSaved = !!savedRecipeIds[recipe.id];
                      return (
                        <div
                          key={recipe.id}
                          className="bg-white/95 dark:bg-slate-900/95 text-slate-800 dark:text-slate-100 rounded-2xl overflow-hidden shadow-lg border border-white/20 flex flex-col justify-between group transition-all hover:-translate-y-1"
                        >
                          {/* Recipe Photo */}
                          <div className="relative h-36 w-full overflow-hidden bg-slate-200 dark:bg-slate-800">
                            <img
                              src={recipe.imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=600'}
                              alt={recipe.name}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                            <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1">
                              {recipe.dietTags.slice(0, 2).map((tag, i) => (
                                <span key={i} className="px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-white text-[10px] font-semibold">
                                  {tag}
                                </span>
                              ))}
                            </div>
                            <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-emerald-600/90 backdrop-blur-md text-white text-[10px] font-bold flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {recipe.prepTime}
                            </div>
                          </div>

                          {/* Recipe Info */}
                          <div className="p-4 space-y-2.5 flex-1 flex flex-col justify-between">
                            <div>
                              <h5 className="font-serif font-bold text-sm leading-snug line-clamp-1 group-hover:text-emerald-600 transition-colors">
                                {recipe.name}
                              </h5>
                              <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                                {recipe.description}
                              </p>
                            </div>

                            {/* Macros bar */}
                            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 dark:text-slate-300 pt-2 border-t border-slate-100 dark:border-slate-800">
                              <span>🔥 {recipe.calories} kcal</span>
                              <span>💪 {recipe.macros.protein}g prot</span>
                              <span>🌾 {recipe.macros.carbs}g carb</span>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-2 pt-1">
                              <button
                                onClick={() => setSelectedRecipe(recipe)}
                                className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
                              >
                                <BookOpen className="w-3.5 h-3.5" />
                                <span>Ver Preparo</span>
                              </button>

                              <button
                                onClick={() => handleSaveCulinaryRecipe(recipe)}
                                title={isSaved ? "Salva nos Favoritos" : "Salvar receita"}
                                className={`p-2 rounded-xl border transition-all cursor-pointer active:scale-90 ${
                                  isSaved
                                    ? 'bg-amber-500/15 text-amber-600 border-amber-500/30'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:text-emerald-600'
                                }`}
                              >
                                {isSaved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                              </button>

                              <button
                                onClick={() => handleAddIngredientsToShopping(recipe)}
                                title="Adicionar à Lista de Compras"
                                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-all cursor-pointer active:scale-90"
                              >
                                <ShoppingCart className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* CHEF MALU TIPS SECTION */}
                {activeCulinaryChallenge.tips.length > 0 && (
                  <div className="space-y-4 pt-2">
                    <div className="flex items-center gap-2">
                      <Lightbulb className="w-5 h-5 text-amber-300" />
                      <h4 className="font-serif text-lg font-bold text-white">Dicas de Ouro da Chef Malu</h4>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-3.5">
                      {activeCulinaryChallenge.tips.map((tip, idx) => (
                        <div
                          key={idx}
                          className="bg-black/20 backdrop-blur-md p-4 rounded-2xl border border-white/15 flex items-start gap-3.5"
                        >
                          <div className="w-8 h-8 rounded-xl bg-amber-400/20 text-amber-300 flex items-center justify-center shrink-0 border border-amber-300/30">
                            {tip.category === 'substituição' ? '🔄' : tip.category === 'técnica' ? '🔪' : tip.category === 'organização' ? '📦' : '🥗'}
                          </div>
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[10px] uppercase font-bold text-amber-200 tracking-wider">
                                {tip.category}
                              </span>
                              <VoicePlayButton text={`${tip.title}. ${tip.content}`} size="sm" />
                            </div>
                            <h6 className="text-xs font-bold text-white">{tip.title}</h6>
                            <p className="text-[11px] text-emerald-100/90 leading-relaxed font-sans">{tip.content}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* HERO CALLOUT TO PICK A CHALLENGE */
            <div className="rounded-3xl p-8 sm:p-10 bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent border border-emerald-500/20 text-center space-y-6">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center text-white text-4xl shadow-xl shadow-emerald-500/20 mx-auto">
                🍳
              </div>
              <div className="space-y-2 max-w-xl mx-auto">
                <h3 className="font-serif text-2xl sm:text-3xl font-bold text-slate-800 dark:text-slate-100">
                  Nenhum Desafio Culinário Ativo
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Escolha um dos nossos desafios temáticos abaixo (como a <strong>Semana Sem Carne Processada</strong> ou <strong>Descubra Vegetais de Raiz</strong>) ou gere um desafio inédito sob medida com a nossa IA!
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => {
                    playSfx('pop');
                    setShowGenerateModal(true);
                  }}
                  className="px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm transition-all shadow-lg shadow-emerald-600/25 flex items-center gap-2 cursor-pointer active:scale-95"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>✨ Gerar Desafio Sob Medida com IA</span>
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* CULINARY CHALLENGES GALLERY */}
          {/* ========================================================================= */}
          <div className="space-y-6 pt-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-serif text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Compass className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                  <span>Catálogo de Desafios Culinários</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Explore e inicie desafios com receitas completas, missões guiadas e dicas práticas.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Period Filter */}
                <div className="flex bg-white/60 dark:bg-slate-800/60 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold">
                  <button
                    onClick={() => setPeriodFilter('all')}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      periodFilter === 'all'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Todos
                  </button>
                  <button
                    onClick={() => setPeriodFilter('weekly')}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      periodFilter === 'weekly'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    📅 Semanais (7d)
                  </button>
                  <button
                    onClick={() => setPeriodFilter('monthly')}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      periodFilter === 'monthly'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    🗓️ Mensais (30d)
                  </button>
                </div>

                {/* AI Generate Button */}
                <button
                  onClick={() => {
                    playSfx('pop');
                    setShowGenerateModal(true);
                  }}
                  className="px-4 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold text-xs border border-emerald-500/30 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Criar Novo c/ IA</span>
                </button>
              </div>
            </div>

            {/* Grid of Challenges */}
            <div className="grid md:grid-cols-2 gap-6">
              {filteredChallenges.map((ch) => {
                const isActive = activeCulinaryChallenge?.id === ch.id;
                return (
                  <div
                    key={ch.id}
                    className={`rounded-3xl p-6 sm:p-7 border transition-all duration-300 flex flex-col justify-between gap-6 relative overflow-hidden ${
                      isActive
                        ? 'bg-emerald-500/5 dark:bg-emerald-950/20 border-emerald-500 ring-2 ring-emerald-500/20 shadow-md'
                        : 'bg-white/80 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-800 border-slate-200/80 dark:border-slate-700/80 hover:border-emerald-500/40 shadow-xs hover:shadow-lg'
                    }`}
                  >
                    <div className="space-y-4">
                      {/* Badge and tags */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/20 flex items-center justify-center text-2xl shadow-xs">
                            {ch.badgeIcon || '🥗'}
                          </div>
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                              {ch.category}
                            </span>
                            <h4 className="font-serif text-xl font-bold text-slate-900 dark:text-white leading-tight">
                              {ch.title}
                            </h4>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 font-bold text-xs border border-amber-500/20">
                            +{ch.rewardPoints} pts
                          </span>
                        </div>
                      </div>

                      {/* Tagline & Description */}
                      <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-sans leading-relaxed">
                        {ch.description}
                      </p>

                      {/* Dietary Suitability Pills */}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-semibold flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />
                          {ch.period === 'weekly' ? '7 dias' : '30 dias'}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-semibold flex items-center gap-1">
                          <Utensils className="w-2.5 h-2.5" />
                          {ch.recipes.length} receitas
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-semibold flex items-center gap-1">
                          <Award className="w-2.5 h-2.5" />
                          {ch.badgeName}
                        </span>
                      </div>

                      {/* Recipes preview chips */}
                      <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-2">
                        <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          Destaques do Cardápio:
                        </p>
                        <div className="flex flex-col gap-1.5">
                          {ch.recipes.slice(0, 3).map((r, i) => (
                            <div key={i} className="flex items-center justify-between text-xs text-slate-700 dark:text-slate-200">
                              <span className="truncate flex items-center gap-1.5 font-medium">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                {r.name}
                              </span>
                              <span className="text-[10px] text-slate-400 shrink-0">{r.prepTime}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Footer Action */}
                    <div className="pt-2">
                      {isActive ? (
                        <button
                          disabled
                          className="w-full py-3 rounded-2xl bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold text-xs flex items-center justify-center gap-2 border border-emerald-500/30"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Desafio Culinário Ativo</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleStartCulinaryChallenge(ch)}
                          className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-all shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                        >
                          <span>Iniciar Este Desafio</span>
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE 2: FAST HABIT FOCUS CHALLENGE */}
      {/* ========================================================================= */}
      {mainMode === 'habit' && (
        <div className="space-y-10 animate-in fade-in duration-500">
          {!challenge ? (
            <div className="clay-card p-8 space-y-10 rounded-3xl bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
              <div className="text-center space-y-2 max-w-xl mx-auto">
                <h3 className="font-serif text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
                  Desafio Rápido de Foco
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Defina um único objetivo pessoal (ex: 2.5L de água por dia, zero refrigerante, jantar antes das 20h) e conte com acompanhamento diário.
                </p>
              </div>

              <div className="space-y-4">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest text-center">
                  Duração do Desafio
                </label>
                <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
                  {[7, 15, 30].map(days => (
                    <button
                      key={days}
                      onClick={() => {
                        playSfx('tap');
                        setSelectedHabitType(days as any);
                      }}
                      className={`py-5 rounded-2xl border-2 transition-all flex flex-col items-center gap-1 cursor-pointer ${
                        selectedHabitType === days 
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-600/25 scale-105' 
                          : 'bg-white/60 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-500 hover:border-emerald-300'
                      }`}
                    >
                      <span className="text-2xl sm:text-3xl font-serif font-bold">{days}</span>
                      <span className="text-[10px] uppercase font-bold tracking-wider">Dias</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3 max-w-lg mx-auto">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest text-center">
                  Qual sua única meta diária?
                </label>
                <input
                  type="text"
                  value={habitGoal}
                  onChange={(e) => setHabitGoal(e.target.value)}
                  placeholder="Ex: Beber 3L de água / Sem açúcar / Comer vegetal em toda refeição"
                  className="w-full p-4 bg-white/60 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500/40 text-center font-serif text-lg text-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="max-w-md mx-auto">
                <button
                  onClick={startHabitChallenge}
                  className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-base shadow-xl shadow-emerald-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                >
                  <Flame className="w-5 h-5" />
                  <span>Começar Desafio de Foco</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Active Habit Header */}
              <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-6 sm:p-8 rounded-3xl bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-md">
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center text-white shadow-lg shrink-0">
                    <Trophy className="w-8 h-8" />
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                      Desafio de Foco Ativo
                    </span>
                    <h3 className="font-serif text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
                      {challenge.type} Dias de Meta
                    </h3>
                    <p className="text-sm font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-2">
                      <Target className="w-4 h-4 text-emerald-600" />
                      {challenge.dailyGoal}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    if (confirm("Deseja realmente cancelar seu desafio de foco atual?")) {
                      onUpdateChallenge(undefined);
                    }
                  }}
                  className="text-xs font-bold text-slate-400 hover:text-rose-500 underline uppercase tracking-widest cursor-pointer"
                >
                  Cancelar Desafio
                </button>
              </div>

              {/* Habit Action and Progress Cards */}
              <div className="grid md:grid-cols-3 gap-6">
                <div className="md:col-span-1 p-6 rounded-3xl bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center space-y-4 text-center">
                  <div className="w-24 h-24 rounded-full border-4 border-emerald-500/20 flex items-center justify-center bg-slate-50 dark:bg-slate-700/50">
                    <Flame className={`w-12 h-12 text-emerald-500 transition-all ${
                      challenge.completedDays > 0 ? 'scale-110' : ''
                    }`} />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-serif text-lg font-bold text-slate-800 dark:text-slate-100">Sua Consistência</h4>
                    <p className="text-xs text-slate-400 uppercase font-bold">Progresso Diário</p>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-emerald-500 transition-all duration-700"
                      style={{ width: `${(challenge.completedDays / challenge.type) * 100}%` }}
                    />
                  </div>
                  <p className="text-2xl font-serif font-bold text-emerald-600 dark:text-emerald-400">
                    {challenge.completedDays} / {challenge.type} dias
                  </p>
                </div>

                <div className="md:col-span-2 p-6 sm:p-8 rounded-3xl bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex flex-col justify-between space-y-6">
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">
                      Próxima Meta
                    </span>
                    <h4 className="font-serif text-2xl font-bold text-slate-900 dark:text-white">
                      Dia {challenge.completedDays + 1}
                    </h4>
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                      Objetivo de hoje: <strong>{challenge.dailyGoal}</strong>
                    </p>
                  </div>

                  {challenge.completedDays < challenge.type ? (
                    <button
                      onClick={completeHabitDay}
                      disabled={isProcessingHabit}
                      className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-base shadow-lg shadow-emerald-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-95"
                    >
                      {isProcessingHabit ? <Timer className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                      <span>Registrar Meta do Dia Concluída (+100 pts)</span>
                    </button>
                  ) : (
                    <div className="bg-emerald-500 text-white p-6 rounded-2xl text-center space-y-2">
                      <Trophy className="w-10 h-10 mx-auto" />
                      <h4 className="text-xl font-bold font-serif">Desafio de Foco Concluído!</h4>
                      <p className="text-xs opacity-90">Parabéns pela disciplina exemplar!</p>
                    </div>
                  )}

                  {challenge.history.length > 0 && challenge.history[challenge.history.length - 1]?.feedback && (
                    <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-500/20 flex items-start gap-3">
                      <VoicePlayButton text={challenge.history[challenge.history.length - 1].feedback!} size="sm" />
                      <p className="text-xs text-slate-700 dark:text-slate-200 italic leading-relaxed pt-0.5">
                        "{challenge.history[challenge.history.length - 1].feedback}"
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: GENERATE NEW AI CULINARY CHALLENGE */}
      {/* ========================================================================= */}
      {showGenerateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-slate-200 dark:border-slate-800 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowGenerateModal(false)}
              className="absolute top-5 right-5 p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Chef Malu AI Studio</span>
              </div>
              <h3 className="font-serif text-2xl font-bold text-slate-900 dark:text-white">
                Gerar Desafio Culinário Sob Medida
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                A IA vai criar um desafio com receitas completas, técnicas de preparo e missões diárias 100% alinhadas ao seu perfil.
              </p>
            </div>

            {/* Duration Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Duração do Desafio</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setGenPeriod('weekly')}
                  className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-1 cursor-pointer ${
                    genPeriod === 'weekly'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <span className="font-serif font-bold text-lg">Semanal (7 Dias)</span>
                  <span className="text-[11px] opacity-80">Rápido, dinâmico e focado</span>
                </button>

                <button
                  type="button"
                  onClick={() => setGenPeriod('monthly')}
                  className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-1 cursor-pointer ${
                    genPeriod === 'monthly'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <span className="font-serif font-bold text-lg">Mensal (30 Dias)</span>
                  <span className="text-[11px] opacity-80">Transformação de hábitos</span>
                </button>
              </div>
            </div>

            {/* Topic Suggestions in 1 click */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Ou Escolha um Tema Sugerido
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  'Sem carne processada',
                  'Descubra vegetais de raiz',
                  'Mês das super fibras e grãos',
                  'Zero açúcar refinado',
                  'Semana anti-inflamatória da horta',
                  '5 Cores no prato todo dia',
                  'Desafio culinária mediterrânea',
                  'Low carb com vegetais frescos'
                ].map((sugg) => (
                  <button
                    key={sugg}
                    type="button"
                    onClick={() => setCustomThemeInput(sugg)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border cursor-pointer ${
                      customThemeInput === sugg
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {sugg}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Input */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Tema / Foco Personalizado (Opcional)
              </label>
              <input
                type="text"
                value={customThemeInput}
                onChange={(e) => setCustomThemeInput(e.target.value)}
                placeholder="Ex: Quero focar em cogumelos e saladas quentes..."
                className="w-full p-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500/30 text-sm text-slate-800 dark:text-slate-100"
              />
            </div>

            {/* Action */}
            <button
              onClick={handleGenerateAIChallenge}
              disabled={isGenerating}
              className="w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-xl shadow-emerald-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-95"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Chef Malu criando receitas e missões sob medida...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Gerar Desafio com IA Agora</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: RECIPE DETAILS & COOKING MODE */}
      {/* ========================================================================= */}
      {selectedRecipe && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 dark:border-slate-800 relative flex flex-col">
            {/* Header image */}
            <div className="relative h-52 sm:h-64 w-full bg-slate-200 dark:bg-slate-800 shrink-0">
              <img
                src={selectedRecipe.imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=800'}
                alt={selectedRecipe.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <button
                onClick={() => setSelectedRecipe(null)}
                className="absolute top-4 right-4 p-2.5 rounded-full bg-black/50 text-white hover:bg-black/70 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="absolute bottom-4 left-4 right-4 text-white space-y-1">
                <div className="flex flex-wrap gap-1.5 mb-1">
                  {selectedRecipe.dietTags.map((tag, i) => (
                    <span key={i} className="px-2.5 py-0.5 rounded-md bg-emerald-500/80 backdrop-blur-md text-[10px] font-bold">
                      {tag}
                    </span>
                  ))}
                </div>
                <h3 className="font-serif text-xl sm:text-2xl font-bold leading-tight">
                  {selectedRecipe.name}
                </h3>
              </div>
            </div>

            {/* Body */}
            <div className="p-6 sm:p-8 space-y-6 flex-1">
              {/* Macros bar */}
              <div className="grid grid-cols-4 gap-2 bg-slate-100 dark:bg-slate-800 p-3 rounded-2xl text-center">
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400">Calorias</p>
                  <p className="text-sm font-bold text-emerald-600">{selectedRecipe.calories} kcal</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400">Proteína</p>
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{selectedRecipe.macros.protein}g</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400">Carboidratos</p>
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{selectedRecipe.macros.carbs}g</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400">Gorduras</p>
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{selectedRecipe.macros.fat}g</p>
                </div>
              </div>

              {/* Description & Speech */}
              <div className="flex items-start justify-between gap-4">
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-sans">
                  {selectedRecipe.description}
                </p>
                <VoicePlayButton
                  text={`${selectedRecipe.name}. ${selectedRecipe.description}. Tempo de preparo: ${selectedRecipe.prepTime}. Dica especial: ${selectedRecipe.tips}`}
                  size="sm"
                  title="Ouvir receita com a voz da Malu"
                />
              </div>

              {/* Ingredients Checklist */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-serif font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                    <Utensils className="w-4 h-4 text-emerald-600" />
                    <span>Ingredientes Necessários ({selectedRecipe.ingredients.length})</span>
                  </h4>
                  <span className="text-[11px] text-slate-400">Marque o que já tem em casa</span>
                </div>

                <div className="space-y-1.5 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                  {selectedRecipe.ingredients.map((ing, i) => {
                    const isChecked = !!checkedIngredients[ing];
                    return (
                      <div
                        key={i}
                        onClick={() => {
                          playSfx('tap');
                          setCheckedIngredients(prev => ({ ...prev, [ing]: !prev[ing] }));
                        }}
                        className={`flex items-center gap-3 p-2 rounded-xl transition-all cursor-pointer text-xs ${
                          isChecked ? 'line-through text-slate-400 bg-emerald-500/5' : 'text-slate-700 dark:text-slate-200'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all ${
                          isChecked ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-300 dark:border-slate-600'
                        }`}>
                          {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <span>{ing}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Instructions */}
              <div className="space-y-3">
                <h4 className="font-serif font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <ChefHat className="w-4 h-4 text-emerald-600" />
                  <span>Modo de Preparo Passo a Passo</span>
                </h4>

                <div className="space-y-2.5">
                  {selectedRecipe.instructions.map((step, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 text-xs sm:text-sm text-slate-700 dark:text-slate-200">
                      <span className="w-6 h-6 rounded-full bg-emerald-600/10 text-emerald-600 dark:text-emerald-400 font-bold flex items-center justify-center text-xs shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <p className="leading-relaxed">{step}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Chef Tip */}
              {selectedRecipe.tips && (
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-3">
                  <Lightbulb className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-amber-800 dark:text-amber-300 mb-0.5">Dica da Chef Malu:</strong>
                    <span>{selectedRecipe.tips}</span>
                  </div>
                </div>
              )}

              {/* Cooking Timer */}
              <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Timer className={`w-5 h-5 ${isTimerRunning ? 'text-rose-500 animate-spin' : 'text-slate-500'}`} />
                  <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Timer Culinário</p>
                    <p className="text-[11px] text-slate-500">
                      {recipeTimerSeconds !== null
                        ? `${Math.floor(recipeTimerSeconds / 60)}:${(recipeTimerSeconds % 60).toString().padStart(2, '0')} restante`
                        : `Tempo sugerido: ${selectedRecipe.prepTime}`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {!isTimerRunning ? (
                    <button
                      onClick={() => {
                        const mins = parseInt(selectedRecipe.prepTime) || 15;
                        setRecipeTimerSeconds(mins * 60);
                        setIsTimerRunning(true);
                        playSfx('pop');
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-emerald-600 text-white font-bold text-xs flex items-center gap-1 shadow-xs cursor-pointer active:scale-95"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>Iniciar Timer</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setIsTimerRunning(false);
                        setRecipeTimerSeconds(null);
                        playSfx('pop');
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-rose-500 text-white font-bold text-xs cursor-pointer"
                    >
                      Parar Timer
                    </button>
                  )}
                </div>
              </div>

              {/* Modal Bottom Actions */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => handleSaveCulinaryRecipe(selectedRecipe)}
                  className="flex-1 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 transition-all cursor-pointer active:scale-95"
                >
                  <Bookmark className="w-4 h-4" />
                  <span>Salvar nos Meus Favoritos</span>
                </button>

                <button
                  onClick={() => handleAddIngredientsToShopping(selectedRecipe)}
                  className="px-4 py-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                >
                  <ShoppingCart className="w-4 h-4" />
                  <span className="hidden sm:inline">Lista de Compras</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
