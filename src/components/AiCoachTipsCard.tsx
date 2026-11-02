import React, { useState, useEffect, useMemo } from 'react';
import { Sparkles, Brain, Zap, ShieldAlert, CheckCircle2, RefreshCw, Volume2, ArrowRight, Activity, Flame, HeartPulse, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile, WeeklyWorkoutPlan, WeeklyWorkoutDay } from '../types';
import { chatWithAssistant } from '../lib/gemini';
import { speak, stopSpeech } from '../lib/speech';
import { playSfx, vibrate } from '../lib/sensory';
import avatarGlobalStore from '../lib/avatarGlobalState';

interface AiCoachTipsCardProps {
  profile: UserProfile | null;
  weeklyPlan: WeeklyWorkoutPlan | null;
  onApplyAdjustment?: (newPlan: WeeklyWorkoutPlan, reason: string) => void;
  onUpdateProfile?: (updatedProfile: UserProfile) => void;
}

export const AiCoachTipsCard: React.FC<AiCoachTipsCardProps> = ({
  profile,
  weeklyPlan,
  onApplyAdjustment,
  onUpdateProfile
}) => {
  const [isConsultingAi, setIsConsultingAi] = useState(false);
  const [customAiAdvice, setCustomAiAdvice] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [appliedAdjustment, setAppliedAdjustment] = useState<string | null>(null);

  // 1. Gather & analyze fatigue data from Emotional Tracker logs & Body Monitor
  const fatigueData = useMemo(() => {
    let recentLogs: any[] = [];
    
    // Check profile emotional logs
    if (profile?.emotionalLogs && Array.isArray(profile.emotionalLogs)) {
      recentLogs = [...recentLogs, ...profile.emotionalLogs];
    }
    
    // Check localStorage logs if any
    try {
      const storedEmo = localStorage.getItem('nutriai_emotional_logs') || localStorage.getItem('nutri-emotional-logs');
      if (storedEmo) {
        const parsed = JSON.parse(storedEmo);
        if (Array.isArray(parsed)) recentLogs = [...recentLogs, ...parsed];
      }
    } catch (e) {}

    // Calculate fatigue score (0-100)
    let totalFatigueScore = 30; // base moderate baseline
    let fatigueReasons: string[] = [];

    if (recentLogs.length > 0) {
      const lastLogs = recentLogs.slice(-5);
      let tiredCount = 0;
      let stressCount = 0;

      lastLogs.forEach(log => {
        const mood = (log.mood || '').toLowerCase();
        if (mood.includes('cansad') || mood.includes('exaurid') || mood.includes('fadig')) {
          tiredCount++;
        }
        if (mood.includes('estress') || mood.includes('ansios') || mood.includes('preocup')) {
          stressCount++;
        }
      });

      if (tiredCount >= 2) {
        totalFatigueScore += 35;
        fatigueReasons.push(`${tiredCount} registros recentes de cansaço no Diário Emocional`);
      } else if (tiredCount === 1) {
        totalFatigueScore += 15;
        fatigueReasons.push('Relato de fadiga recente registrado');
      }

      if (stressCount >= 2) {
        totalFatigueScore += 25;
        fatigueReasons.push('Nível de estresse/ansiedade elevado');
      }
    }

    // Check body monitor logs if present
    if (profile?.bodyMonitorLogs && profile.bodyMonitorLogs.length > 0) {
      const lastMonitor = profile.bodyMonitorLogs[profile.bodyMonitorLogs.length - 1];
      if (lastMonitor.fatigueLevel) {
        totalFatigueScore = Math.round((totalFatigueScore + lastMonitor.fatigueLevel) / 2);
        fatigueReasons.push(`Monitoramento biométrico indica fadiga de ${lastMonitor.fatigueLevel}%`);
      }
    }

    const level: 'low' | 'moderate' | 'high' = 
      totalFatigueScore >= 65 ? 'high' : totalFatigueScore >= 45 ? 'moderate' : 'low';

    return {
      score: Math.min(100, Math.max(10, totalFatigueScore)),
      level,
      reasons: fatigueReasons.length > 0 ? fatigueReasons : ['Nível de energia estável e sem sobrecarga relatada']
    };
  }, [profile]);

  // 2. Gather & analyze intake calorie volume
  const intakeData = useMemo(() => {
    let consumedCalories = 0;
    const targetCalories = profile?.masterPlan?.dailyCalories || 2000;

    // Check intake logs from profile or localstorage
    if (profile?.intakeLogs && Array.isArray(profile.intakeLogs)) {
      const todayIso = new Date().toISOString().split('T')[0];
      const todayLogs = profile.intakeLogs.filter(log => log.date && log.date.startsWith(todayIso));
      consumedCalories = todayLogs.reduce((acc, curr) => acc + (curr.actual?.calories || 0), 0);
    }

    if (consumedCalories === 0) {
      // Check stored meal logs in localStorage
      try {
        const storedMeals = localStorage.getItem('nutriai_daily_meals') || localStorage.getItem('nutri-meals');
        if (storedMeals) {
          const parsed = JSON.parse(storedMeals);
          if (Array.isArray(parsed)) {
            consumedCalories = parsed.reduce((acc: number, item: any) => acc + (item.calories || item.nutrition?.calories || 0), 0);
          }
        }
      } catch (e) {}
    }

    // Fallback estimation if no daily log recorded yet today (e.g. ~60% of goal)
    if (consumedCalories === 0) {
      consumedCalories = Math.round(targetCalories * 0.65);
    }

    const deficitOrSurplus = consumedCalories - targetCalories;
    const ratio = consumedCalories / targetCalories;

    let status: 'severe_deficit' | 'moderate_deficit' | 'balanced' | 'surplus' = 'balanced';
    if (ratio < 0.70) status = 'severe_deficit';
    else if (ratio < 0.90) status = 'moderate_deficit';
    else if (ratio > 1.15) status = 'surplus';

    return {
      consumed: consumedCalories,
      target: targetCalories,
      deficitOrSurplus,
      status
    };
  }, [profile]);

  // 3. Generate dynamic adaptive workout recommendation rule based on physiological status
  const recommendation = useMemo(() => {
    const isHighFatigue = fatigueData.level === 'high';
    const isModerateFatigue = fatigueData.level === 'moderate';
    const isSevereDeficit = intakeData.status === 'severe_deficit';
    const isModerateDeficit = intakeData.status === 'moderate_deficit';

    if (isHighFatigue && isSevereDeficit) {
      return {
        title: "⚠️ Redução Emergencial de Volume (-25%) & Foco em Nutrição",
        badge: "Modo Proteção Contra Overreaching",
        badgeColor: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30",
        description: "Seu diário emocional registra cansaço elevado e sua ingestão calórica está consideravelmente abaixo da meta. Realizar treinos extenuantes hoje pode causar lesões ou catabolismo.",
        actionNote: "Sugerimos reduzir 25% das repetições dos exercícios de força e substituir circuitos intensos por 15 minutos de caminhada regenerativa ou alongamento guiado.",
        suggestedAdjustmentType: "reduce_25_reps",
        intensityText: "Leve / Regenerativo",
        nutritionAdvice: "Consuma um lanche rico em carboidratos complexos e proteicos antes do treino para repor o glicogênio muscular."
      };
    }

    if (isHighFatigue) {
      return {
        title: "🧘 Adaptação para Recuperação Ativa & Mobilidade",
        badge: "Fadiga Elevada Detectada",
        badgeColor: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
        description: "Devido ao acúmulo de fadiga nos últimos dias, o treino do dia foi ajustado para focar em controle postural, respiração e descompressão articular.",
        actionNote: "Redução de 15% nas repetições com acréscimo de 60 segundos de descanso ativo entre séries.",
        suggestedAdjustmentType: "active_recovery",
        intensityText: "Moderado / Foco Técnico",
        nutritionAdvice: "Reforce a hidratação e tome um chá calmante (como camomila ou hortelã) pós-treino."
      };
    }

    if (isSevereDeficit) {
      return {
        title: "⚡ Ajuste de Volume por Déficit Calórico Severo",
        badge: "Manutenção de Massa Magra",
        badgeColor: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
        description: "Sua ingestão calórica de hoje está abaixo de 70% da meta diária. Priorize séries mais curtas com boa carga técnica em vez de treinos cardiovasculares longos.",
        actionNote: "Redução do volume total em 15% para proteger suas reservas energéticas.",
        suggestedAdjustmentType: "reduce_15_reps",
        intensityText: "Moderado / Cadenciado",
        nutritionAdvice: "Adicione uma porção extra de proteína de absorção rápida (como ovos, iogurte ou whey) pós-treino."
      };
    }

    if (isModerateFatigue || isModerateDeficit) {
      return {
        title: "🎯 Ajuste Fino de Intensidade & Cadência Controlada",
        badge: "Carga Balanceada Sugerida",
        badgeColor: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
        description: "Seu corpo apresenta leve fadiga e consumo calórico moderado. A cadência dos exercícios deve ser mantida com descanso ideal para otimizar ganhos.",
        actionNote: "Manter plano atual com recomendação de 45 segundos de pausa entre exercícios.",
        suggestedAdjustmentType: "balance_tempo",
        intensityText: "Moderado",
        nutritionAdvice: "Mantenha o plano nutricional regular e mantenha garrafa de água à mão."
      };
    }

    return {
      title: "🔥 Condição Ideal para Sobrecarga Progressiva (+10%)",
      badge: "Energia no Máximo!",
      badgeColor: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
      description: "Excelente! Seus registros emocionais e volume nutricional mostram ótimos níveis de energia e recuperação. Momento perfeito para desafiar seus limites!",
      actionNote: "Sugerimos adicionar 2 repetições extras em cada exercício principal do seu treino diário.",
      suggestedAdjustmentType: "boost_10_reps",
      intensityText: "Alta Intensidade / Progresso",
      nutritionAdvice: "Aproveite a janela anabólica consumindo sua refeição completa dentro de 1 hora pós-treino."
    };
  }, [fatigueData, intakeData]);

  // Handle applying the automatic adjustment to the weekly plan
  const handleApplyAdjustment = () => {
    if (!weeklyPlan) return;
    playSfx('success');
    vibrate([30, 40, 30]);

    const newPlan: WeeklyWorkoutPlan = JSON.parse(JSON.stringify(weeklyPlan));
    
    // Get today's day key (or default monday/first day)
    const daysMap = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const todayKey = daysMap[new Date().getDay()];
    
    let targetDayIndex = newPlan.days.findIndex(d => d.dayKey === todayKey);
    if (targetDayIndex === -1) targetDayIndex = 0;

    const dayToEdit = newPlan.days[targetDayIndex];

    if (recommendation.suggestedAdjustmentType === 'reduce_25_reps') {
      dayToEdit.workoutTitle = `[Adaptado] ${dayToEdit.workoutTitle} (Modo Regenerativo)`;
      dayToEdit.intensity = "Iniciante";
      dayToEdit.exercises.forEach(ex => {
        if (ex.reps) ex.reps = Math.max(6, Math.round(ex.reps * 0.75));
        if (ex.duration) ex.duration = Math.max(20, Math.round(ex.duration * 0.75));
      });
    } else if (recommendation.suggestedAdjustmentType === 'active_recovery' || recommendation.suggestedAdjustmentType === 'reduce_15_reps') {
      dayToEdit.workoutTitle = `[Adaptado] ${dayToEdit.workoutTitle} (Volume Controlado)`;
      dayToEdit.exercises.forEach(ex => {
        if (ex.reps) ex.reps = Math.max(8, Math.round(ex.reps * 0.85));
        if (ex.duration) ex.duration = Math.max(25, Math.round(ex.duration * 0.85));
      });
    } else if (recommendation.suggestedAdjustmentType === 'boost_10_reps') {
      dayToEdit.workoutTitle = `[Intensificado] ${dayToEdit.workoutTitle} (+Progresso)`;
      dayToEdit.exercises.forEach(ex => {
        if (ex.reps) ex.reps = Math.round(ex.reps * 1.15);
      });
    }

    if (onApplyAdjustment) {
      onApplyAdjustment(newPlan, recommendation.title);
    }

    setAppliedAdjustment(`Plano de treino de ${dayToEdit.dayName} ajustado com sucesso!`);
    avatarGlobalStore.triggerMotivationalSmile(3500);

    setTimeout(() => setAppliedAdjustment(null), 5000);
  };

  // Handle querying Gemini AI Coach for live custom micro-coaching advice
  const handleConsultAiCoach = async () => {
    setIsConsultingAi(true);
    playSfx('tap');
    vibrate(15);
    try {
      const prompt = `Como Malu (Personal Trainer e Nutricionista IA do NutriAI), dê uma dica rápida e personalizada de 3 a 4 frases para o treino de hoje. 
Contexto do usuário:
- Pontuação de fadiga emocional recente: ${fatigueData.score}% (${fatigueData.level}).
- Motivos de fadiga: ${fatigueData.reasons.join(', ')}.
- Consumo calórico hoje: ${intakeData.consumed} kcal de uma meta de ${intakeData.target} kcal (${intakeData.status}).
- Sugira o melhor foco e ajuste para o treino do dia. Seja empática, encorajadora e técnica.`;

      const res = await chatWithAssistant(profile!, [], prompt);
      if (res && res.text) {
        setCustomAiAdvice(res.text);
        playSfx('success');
      }
    } catch (e) {
      console.warn("Erro ao consultar Coach IA:", e);
    } finally {
      setIsConsultingAi(false);
    }
  };

  // Speak coach advice using Malu's Aoede Brazilian Portuguese voice
  const handleToggleSpeak = async () => {
    const textToSpeak = customAiAdvice || `${recommendation.title}. ${recommendation.description} ${recommendation.actionNote}`;
    
    if (isSpeaking) {
      stopSpeech();
      setIsSpeaking(false);
      return;
    }

    setIsSpeaking(true);
    try {
      await speak(textToSpeak, {
        onEnded: () => setIsSpeaking(false),
        onError: () => setIsSpeaking(false),
      });
    } catch (err) {
      console.warn("Speech error:", err);
      setIsSpeaking(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 text-white rounded-3xl p-6 sm:p-7 shadow-xl border border-emerald-500/30 overflow-hidden relative"
    >
      {/* Glow effect background */}
      <div className="absolute -right-16 -top-16 w-56 h-56 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -left-16 -bottom-16 w-56 h-56 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Card Header */}
      <div className="flex items-center justify-between gap-4 border-b border-slate-700/60 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-tr from-emerald-500 to-teal-400 rounded-2xl shadow-lg shadow-emerald-500/20 text-slate-900">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-white">
                Dicas do Coach IA
              </h3>
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${recommendation.badgeColor}`}>
                {recommendation.badge}
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Análise fisiológica preditiva baseada em fadiga emocional e balanço nutricional
            </p>
          </div>
        </div>

        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-2 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-xl transition-all"
          title={isExpanded ? "Recolher detalhes" : "Expandir detalhes"}
        >
          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>
      </div>

      {/* Status Bar Indicators */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5">
        {/* Fatigue Status */}
        <div className="bg-slate-800/70 border border-slate-700/60 rounded-2xl p-4 flex items-center gap-3.5">
          <div className={`p-3 rounded-xl ${
            fatigueData.level === 'high' ? 'bg-rose-500/20 text-rose-400' :
            fatigueData.level === 'moderate' ? 'bg-amber-500/20 text-amber-400' :
            'bg-emerald-500/20 text-emerald-400'
          }`}>
            <HeartPulse className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-center text-xs mb-1">
              <span className="text-slate-400 font-medium">Índice de Fadiga (Diário Emocional)</span>
              <span className="font-bold text-slate-200">{fatigueData.score}%</span>
            </div>
            <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-500 rounded-full ${
                  fatigueData.level === 'high' ? 'bg-rose-500' :
                  fatigueData.level === 'moderate' ? 'bg-amber-500' :
                  'bg-emerald-400'
                }`} 
                style={{ width: `${fatigueData.score}%` }} 
              />
            </div>
            <p className="text-[11px] text-slate-400 truncate mt-1">
              {fatigueData.reasons[0]}
            </p>
          </div>
        </div>

        {/* Caloric Intake Status */}
        <div className="bg-slate-800/70 border border-slate-700/60 rounded-2xl p-4 flex items-center gap-3.5">
          <div className={`p-3 rounded-xl ${
            intakeData.status === 'severe_deficit' ? 'bg-amber-500/20 text-amber-400' :
            intakeData.status === 'surplus' ? 'bg-blue-500/20 text-blue-400' :
            'bg-emerald-500/20 text-emerald-400'
          }`}>
            <Flame className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-center text-xs mb-1">
              <span className="text-slate-400 font-medium">Volume Calórico</span>
              <span className="font-bold text-slate-200">{intakeData.consumed} / {intakeData.target} kcal</span>
            </div>
            <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-500 rounded-full ${
                  intakeData.status === 'severe_deficit' ? 'bg-amber-500' :
                  intakeData.status === 'surplus' ? 'bg-blue-400' :
                  'bg-emerald-400'
                }`} 
                style={{ width: `${Math.min(100, Math.round((intakeData.consumed / intakeData.target) * 100))}%` }} 
              />
            </div>
            <p className="text-[11px] text-slate-400 truncate mt-1">
              {intakeData.deficitOrSurplus < 0 ? `Déficit de ${Math.abs(intakeData.deficitOrSurplus)} kcal` : `Superávit de ${intakeData.deficitOrSurplus} kcal`}
            </p>
          </div>
        </div>
      </div>

      {/* Main Recommendation Body */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="space-y-4 pt-5"
          >
            {/* Advice Box */}
            <div className="bg-slate-800/90 border border-emerald-500/30 rounded-2xl p-5 space-y-3">
              <h4 className="font-bold text-emerald-400 text-base sm:text-lg flex items-center gap-2">
                <Zap className="w-5 h-5 text-emerald-400 shrink-0" />
                {recommendation.title}
              </h4>
              <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                {customAiAdvice || recommendation.description}
              </p>
              
              <div className="bg-slate-900/60 rounded-xl p-3.5 border border-slate-700/50 space-y-1.5">
                <p className="text-xs font-bold text-amber-400 uppercase tracking-wider">Ajuste Sugerido para o Treino:</p>
                <p className="text-xs text-slate-300 font-medium leading-relaxed">
                  {recommendation.actionNote}
                </p>
              </div>

              <div className="bg-emerald-950/40 rounded-xl p-3 border border-emerald-500/20 text-xs text-emerald-300 flex items-start gap-2">
                <Activity className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>Dica Nutricional Sincronizada:</strong> {recommendation.nutritionAdvice}</span>
              </div>
            </div>

            {/* Notification message when plan adjustment is applied */}
            {appliedAdjustment && (
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-emerald-500 text-slate-950 p-3.5 rounded-xl text-xs font-bold flex items-center justify-between shadow-lg"
              >
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  {appliedAdjustment}
                </span>
              </motion.div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleApplyAdjustment}
                  className="px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Aplicar Ajuste no Plano
                </button>

                <button
                  onClick={handleConsultAiCoach}
                  disabled={isConsultingAi}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold text-xs sm:text-sm rounded-xl border border-slate-700 transition-all active:scale-95 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isConsultingAi ? (
                    <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
                  ) : (
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                  )}
                  Consultar Malu IA
                </button>
              </div>

              <button
                onClick={handleToggleSpeak}
                className={`p-2.5 rounded-xl border transition-all flex items-center gap-2 text-xs font-bold cursor-pointer ${
                  isSpeaking 
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse' 
                    : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:text-white'
                }`}
                title="Ouvir orientações com a voz da Malu"
              >
                <Volume2 className="w-4 h-4 text-emerald-400" />
                <span>{isSpeaking ? "Parar Áudio" : "Ouvir Malu"}</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
