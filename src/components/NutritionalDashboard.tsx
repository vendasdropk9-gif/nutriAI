import React, { useState, useMemo } from 'react';
import { UserProfile } from '../types';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, 
  Legend, CartesianGrid, PieChart, Pie, Cell 
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Target, TrendingUp, Sparkles, ShieldCheck, RefreshCw, 
  ChevronLeft, ChevronRight, Zap, Apple, Droplet, Flame, BarChart3, 
  PieChart as PieIcon, Settings, X, CheckCircle2, BellRing, AlertTriangle, 
  ArrowUpRight, Activity, ArrowRight, Award
} from 'lucide-react';
import { AnimatedCounter } from './AnimatedCounter';
import { playSfx, vibrate } from '../lib/sensory';
import { auth, db } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';

interface NutritionalDashboardProps {
  profile?: UserProfile | null;
  onUpdateProfile?: (updatedProfile: UserProfile) => void;
}

export function NutritionalDashboard({ profile, onUpdateProfile }: NutritionalDashboardProps) {
  const [selectedMetric, setSelectedMetric] = useState<'all' | 'protein' | 'carbs' | 'fat'>('all');
  const [chartViewMode, setChartViewMode] = useState<'bar' | 'donut'>('bar');
  const [isRefreshingAnimation, setIsRefreshingAnimation] = useState(false);
  const [animationKey, setAnimationKey] = useState(0);

  // Manual priority override if user wants to inspect a specific macro in hero mode
  const [manualPriorityFocus, setManualPriorityFocus] = useState<'auto' | 'protein' | 'carbs' | 'fat'>('auto');

  // Carousel active tip index
  const [activeTipIndex, setActiveTipIndex] = useState(0);

  // Goal configuration modal state
  const [isGoalsModalOpen, setIsGoalsModalOpen] = useState(false);
  const [editProtein, setEditProtein] = useState<number>(profile?.macroTargets?.protein || 140);
  const [editCarbs, setEditCarbs] = useState<number>(profile?.macroTargets?.carbs || 210);
  const [editFat, setEditFat] = useState<number>(profile?.macroTargets?.fat || 65);
  const [editCalories, setEditCalories] = useState<number>(profile?.macroTargets?.calories || 2000);
  const [smartNotificationsEnabled, setSmartNotificationsEnabled] = useState<boolean>(
    (profile as any)?.smartNotificationsEnabled ?? true
  );
  const [isSavingGoals, setIsSavingGoals] = useState(false);

  // Extract user macro targets from profile
  const targets = useMemo(() => {
    if (profile?.macroTargets && (profile.macroTargets.protein > 0 || profile.macroTargets.carbs > 0 || profile.macroTargets.fat > 0)) {
      return {
        protein: profile.macroTargets.protein,
        carbs: profile.macroTargets.carbs,
        fat: profile.macroTargets.fat,
        calories: profile.macroTargets.calories || (profile.macroTargets.protein * 4 + profile.macroTargets.carbs * 4 + profile.macroTargets.fat * 9)
      };
    }

    if (profile?.masterPlan?.macros) {
      return {
        protein: profile.masterPlan.macros.protein || 140,
        carbs: profile.masterPlan.macros.carbs || 210,
        fat: profile.masterPlan.macros.fat || 65,
        calories: profile.masterPlan.dailyCalories || 2000
      };
    }

    const weight = profile?.weight || 70;
    return {
      protein: Math.round(weight * 1.8),
      carbs: Math.round(weight * 2.5),
      fat: Math.round(weight * 0.9),
      calories: 2000
    };
  }, [profile]);

  // Extract weekly intake logs (last 7 days)
  const weeklyData = useMemo(() => {
    const logs = profile?.intakeLogs || [];
    const map = new Map<string, { protein: number; carbs: number; fat: number; calories: number; count: number }>();

    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      map.set(dateStr, { protein: 0, carbs: 0, fat: 0, calories: 0, count: 0 });
    }

    logs.forEach(log => {
      const dateKey = (log.date || '').split('T')[0];
      if (map.has(dateKey)) {
        const current = map.get(dateKey)!;
        const info = log.actual || log.planned || { protein: 0, carbs: 0, fat: 0, calories: 0 };
        map.set(dateKey, {
          protein: current.protein + (info.protein || 0),
          carbs: current.carbs + (info.carbs || 0),
          fat: current.fat + (info.fat || 0),
          calories: current.calories + (info.calories || 0),
          count: current.count + 1
        });
      }
    });

    const dates = Array.from(map.keys()).sort();
    const hasAnyRealData = Array.from(map.values()).some(v => v.count > 0);

    return dates.map((dateKey, idx) => {
      const dObj = new Date(dateKey + 'T12:00:00');
      const dayLabel = dObj.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit' });
      const record = map.get(dateKey)!;

      if (!hasAnyRealData) {
        const factor = 0.85 + (Math.sin(idx + 1 + animationKey * 0.5) * 0.2);
        return {
          date: dateKey,
          dayLabel: dayLabel.charAt(0).toUpperCase() + dayLabel.slice(1),
          protein: Math.round(targets.protein * factor),
          carbs: Math.round(targets.carbs * (factor + 0.05)),
          fat: Math.round(targets.fat * (factor - 0.05)),
          calories: Math.round(targets.calories * factor),
          targetProtein: targets.protein,
          targetCarbs: targets.carbs,
          targetFat: targets.fat
        };
      }

      return {
        date: dateKey,
        dayLabel: dayLabel.charAt(0).toUpperCase() + dayLabel.slice(1),
        protein: Math.round(record.protein),
        carbs: Math.round(record.carbs),
        fat: Math.round(record.fat),
        calories: Math.round(record.calories),
        targetProtein: targets.protein,
        targetCarbs: targets.carbs,
        targetFat: targets.fat
      };
    });
  }, [profile?.intakeLogs, targets, animationKey]);

  const weeklySummary = useMemo(() => {
    const totalDays = weeklyData.length || 1;
    const avgProtein = Math.round(weeklyData.reduce((acc, curr) => acc + curr.protein, 0) / totalDays);
    const avgCarbs = Math.round(weeklyData.reduce((acc, curr) => acc + curr.carbs, 0) / totalDays);
    const avgFat = Math.round(weeklyData.reduce((acc, curr) => acc + curr.fat, 0) / totalDays);
    const avgCalories = Math.round(weeklyData.reduce((acc, curr) => acc + curr.calories, 0) / totalDays);

    const proteinCompliance = Math.round((avgProtein / targets.protein) * 100);
    const carbsCompliance = Math.round((avgCarbs / targets.carbs) * 100);
    const fatCompliance = Math.round((avgFat / targets.fat) * 100);

    return {
      avgProtein,
      avgCarbs,
      avgFat,
      avgCalories,
      proteinCompliance,
      carbsCompliance,
      fatCompliance
    };
  }, [weeklyData, targets]);

  // Automated priority engine for critical macronutrient and health goals
  const criticalNutrient = useMemo(() => {
    const goalText = (profile?.goals || '').toLowerCase();
    const isHypertrophy = goalText.includes('hipertrofia') || goalText.includes('massa') || goalText.includes('força') || goalText.includes('musculo');
    const isWeightLoss = goalText.includes('perda') || goalText.includes('emagrecer') || goalText.includes('peso') || goalText.includes('seca');

    const proteinCompliance = weeklySummary.proteinCompliance;
    const carbsCompliance = weeklySummary.carbsCompliance;
    const fatCompliance = weeklySummary.fatCompliance;

    const proteinGap = targets.protein - weeklySummary.avgProtein;
    const carbsGap = targets.carbs - weeklySummary.avgCarbs;
    const fatGap = targets.fat - weeklySummary.avgFat;

    // Urgency scores
    const proteinUrgency = proteinCompliance < 95 ? (100 - proteinCompliance) * (isHypertrophy ? 1.6 : 1.2) : 0;
    const carbsUrgency = carbsCompliance < 80 
      ? (85 - carbsCompliance) 
      : (carbsCompliance > 115 ? (carbsCompliance - 100) * (isWeightLoss ? 1.5 : 1.1) : 0);
    const fatUrgency = fatCompliance < 80 
      ? (85 - fatCompliance) * 1.2 
      : (fatCompliance > 120 ? (fatCompliance - 100) : 0);

    let priorityType: 'protein' | 'carbs' | 'fat' = 'protein';

    if (manualPriorityFocus !== 'auto') {
      priorityType = manualPriorityFocus;
    } else {
      let maxScore = proteinUrgency;
      if (carbsUrgency > maxScore) {
        priorityType = 'carbs';
        maxScore = carbsUrgency;
      }
      if (fatUrgency > maxScore) {
        priorityType = 'fat';
        maxScore = fatUrgency;
      }

      // If all are well balanced, prioritize based on user health goal
      if (maxScore === 0) {
        if (isHypertrophy) priorityType = 'protein';
        else if (isWeightLoss) priorityType = 'carbs';
        else priorityType = 'protein';
      }
    }

    if (priorityType === 'protein') {
      const isDeficit = proteinGap > 0;
      const isCritical = proteinCompliance < 90;
      return {
        type: 'protein' as const,
        label: 'Proteínas',
        emoji: '🥩',
        consumed: weeklySummary.avgProtein,
        target: targets.protein,
        unit: 'g',
        compliance: proteinCompliance,
        gap: Math.abs(proteinGap),
        isDeficit,
        isCritical,
        statusLabel: isCritical 
          ? 'DÉFICIT CRÍTICO DETECTADO' 
          : (proteinCompliance < 98 ? 'ATENÇÃO AO APORTE' : 'META EM DIA'),
        headline: isCritical
          ? `Atenção: Aporte de Proteína ${proteinGap}g Abaixo da Meta`
          : (isHypertrophy 
              ? 'Foco Principal da Sua Meta: Hipertrofia & Síntese Proteica'
              : 'Manutenção Proteica & Preservação Muscular'),
        explanation: isHypertrophy
          ? `Para seu objetivo de ${profile?.goals || 'hipertrofia'}, cada grama de proteína é indispensável para evitar o catabolismo e potencializar a reconstrução das fibras após os treinos.`
          : 'A ingestão adequada de proteínas garante saciedade prolongada, preserva a massa magra e estabiliza o metabolismo ao longo do dia.',
        suggestedFoods: [
          { name: 'Ovos Cozidos / Mexidos', portion: '2 unidades', gain: '+13g Proteína' },
          { name: 'Peito de Frango Grelhado', portion: '120g', gain: '+36g Proteína' },
          { name: 'Whey Protein Isolado', portion: '1 scoop (30g)', gain: '+25g Proteína' },
          { name: 'Iogurte Grego Natural', portion: '1 pote (150g)', gain: '+15g Proteína' }
        ],
        color: '#10b981',
        ringGradient: 'from-emerald-500 via-teal-400 to-emerald-300',
        cardBg: 'from-emerald-950/70 via-slate-900 to-teal-950/60',
        badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        ringColor: '#10b981'
      };
    } else if (priorityType === 'carbs') {
      const isExceeded = carbsCompliance > 110;
      const isCritical = carbsCompliance < 80 || carbsCompliance > 120;
      return {
        type: 'carbs' as const,
        label: 'Carboidratos',
        emoji: '🍞',
        consumed: weeklySummary.avgCarbs,
        target: targets.carbs,
        unit: 'g',
        compliance: carbsCompliance,
        gap: Math.abs(carbsGap),
        isDeficit: carbsGap > 0,
        isCritical,
        statusLabel: isExceeded 
          ? 'EXCEDENTE ENERGÉTICO DETECTADO' 
          : (carbsCompliance < 85 ? 'DÉFICIT DE ENERGIA' : 'META EM DIA'),
        headline: isExceeded
          ? `Alerta: Consumo de Carboidratos ${Math.abs(carbsGap)}g Acima do Planejado`
          : 'Foco no Fornecimento e Estabilidade Energética',
        explanation: isWeightLoss
          ? 'O controle da carga glicêmica diária é a chave para a oxidação de gorduras e redução da retenção de líquidos.'
          : 'Os carboidratos complexos reabastecem o glicogênio muscular para que você mantenha o rendimento máximo nos treinos.',
        suggestedFoods: [
          { name: 'Aveia em Flocos Finos', portion: '40g', gain: '+24g Carboidrato Lento' },
          { name: 'Batata Doce Cozida', portion: '100g', gain: '+20g Carboidrato Baixo IG' },
          { name: 'Arroz Integral Cateto', portion: '100g', gain: '+25g Fibras & Energia' },
          { name: 'Frutas Vermelhas / Morango', portion: '150g', gain: '+12g Baixo Impacto' }
        ],
        color: '#f59e0b',
        ringGradient: 'from-amber-500 via-yellow-400 to-orange-400',
        cardBg: 'from-amber-950/70 via-slate-900 to-orange-950/60',
        badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
        ringColor: '#f59e0b'
      };
    } else {
      const isDeficit = fatGap > 0;
      const isCritical = fatCompliance < 80;
      return {
        type: 'fat' as const,
        label: 'Gorduras Boas',
        emoji: '🥑',
        consumed: weeklySummary.avgFat,
        target: targets.fat,
        unit: 'g',
        compliance: fatCompliance,
        gap: Math.abs(fatGap),
        isDeficit,
        isCritical,
        statusLabel: isCritical 
          ? 'DÉFICIT DE LIPÍDIOS DETECTADO' 
          : 'EQUILÍBRIO HORMONAL EM FOCO',
        headline: isCritical
          ? `Atenção: Aporte de Gorduras Boas ${fatGap}g Abaixo da Meta`
          : 'Foco em Lipídios Essenciais & Saúde Celular',
        explanation: 'As gorduras boas (mono e poli-insaturadas) são matérias-primas diretas para síntese hormonal (testosterona e estrogênio) e absorção de vitaminas lipossolúveis.',
        suggestedFoods: [
          { name: 'Azeite de Oliva Extra Virgem', portion: '1 colher de sopa (13ml)', gain: '+12g Gordura Boa' },
          { name: 'Abacate Hass Maduro', portion: '80g (meio pequeno)', gain: '+12g Gordura Mono' },
          { name: 'Castanha-do-Pará / Nozes', portion: '4 unidades (20g)', gain: '+13g Ômega & Selênio' },
          { name: 'Sementes de Chia / Linhaça', portion: '15g', gain: '+5g Ômega-3 Vegetal' }
        ],
        color: '#ec4899',
        ringGradient: 'from-rose-500 via-pink-400 to-purple-400',
        cardBg: 'from-rose-950/70 via-slate-900 to-pink-950/60',
        badgeBg: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
        ringColor: '#ec4899'
      };
    }
  }, [weeklySummary, targets, profile?.goals, manualPriorityFocus]);

  // Donut chart data comparing consumed vs targets
  const donutChartData = useMemo(() => {
    return [
      { name: 'Proteínas', value: weeklySummary.avgProtein, target: targets.protein, color: '#10b981' },
      { name: 'Carboidratos', value: weeklySummary.avgCarbs, target: targets.carbs, color: '#f59e0b' },
      { name: 'Gorduras', value: weeklySummary.avgFat, target: targets.fat, color: '#ec4899' }
    ];
  }, [weeklySummary, targets]);

  // Current intake calculations: evaluates today's intake logs vs targets
  const currentIntakeStats = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const todayDateStr = new Date().toDateString();

    const todayLogs = (profile?.intakeLogs || []).filter(l => {
      if (!l?.date) return false;
      return l.date.startsWith(todayStr) || new Date(l.date).toDateString() === todayDateStr;
    });

    const hasTodayLogs = todayLogs.length > 0;

    const todayTotal = todayLogs.reduce((acc, log) => {
      const info = log.actual || log.planned || { protein: 0, carbs: 0, fat: 0, calories: 0 };
      return {
        protein: acc.protein + (info.protein || 0),
        carbs: acc.carbs + (info.carbs || 0),
        fat: acc.fat + (info.fat || 0),
        calories: acc.calories + (info.calories || 0),
      };
    }, { protein: 0, carbs: 0, fat: 0, calories: 0 });

    const currentProtein = hasTodayLogs ? todayTotal.protein : weeklySummary.avgProtein;
    const currentCarbs = hasTodayLogs ? todayTotal.carbs : weeklySummary.avgCarbs;
    const currentFat = hasTodayLogs ? todayTotal.fat : weeklySummary.avgFat;
    const currentCalories = hasTodayLogs ? todayTotal.calories : weeklySummary.avgCalories;

    const proteinRemaining = Math.max(0, targets.protein - currentProtein);
    const carbsRemaining = Math.max(0, targets.carbs - currentCarbs);
    const fatRemaining = Math.max(0, targets.fat - currentFat);
    const caloriesRemaining = Math.max(0, targets.calories - currentCalories);

    const proteinCompliance = Math.round((currentProtein / targets.protein) * 100);
    const carbsCompliance = Math.round((currentCarbs / targets.carbs) * 100);
    const fatCompliance = Math.round((currentFat / targets.fat) * 100);
    const caloriesCompliance = Math.round((currentCalories / targets.calories) * 100);

    return {
      hasTodayLogs,
      todayLogsCount: todayLogs.length,
      currentProtein: Math.round(currentProtein),
      currentCarbs: Math.round(currentCarbs),
      currentFat: Math.round(currentFat),
      currentCalories: Math.round(currentCalories),
      proteinRemaining: Math.round(proteinRemaining),
      carbsRemaining: Math.round(carbsRemaining),
      fatRemaining: Math.round(fatRemaining),
      caloriesRemaining: Math.round(caloriesRemaining),
      proteinCompliance,
      carbsCompliance,
      fatCompliance,
      caloriesCompliance
    };
  }, [profile?.intakeLogs, weeklySummary, targets]);

  // Dynamic AI Tips derived from user real intake metrics and targets
  const dynamicAiTips = useMemo(() => {
    const tips = [];
    const goalName = profile?.healthFocus?.focusLabel || profile?.goals || 'Hipertrofia Muscular';
    const deprioritizedCats = profile?.healthFocus?.deprioritizedCategories || profile?.mutedAdCategories || [];
    const avoidSupplements = deprioritizedCats.includes('supplements');

    // 1. Protein Intake Tip
    if (currentIntakeStats.proteinRemaining > 15) {
      tips.push({
        id: 'tip-prot-deficit',
        category: 'Proteínas & Síntese Muscular',
        icon: Zap,
        color: 'from-emerald-500 to-teal-600',
        textColor: 'text-emerald-400',
        title: 'Déficit Proteico Identificado no Intake Atual',
        metricBadge: `${currentIntakeStats.currentProtein}g / ${targets.protein}g (${currentIntakeStats.proteinCompliance}%)`,
        content: `Você consumiu ${currentIntakeStats.currentProtein}g de proteína até agora. Faltam ${currentIntakeStats.proteinRemaining}g para bater sua meta diária de ${targets.protein}g para ${goalName}.`,
        recommendedAction: avoidSupplements
          ? 'Adicione 3 ovos mexidos, 120g de frango grelhado ou 170g de iogurte grego natural ao próximo lanche.'
          : 'Adicione 3 ovos mexidos, 120g de frango grelhado ou 1 scoop de whey protein ao próximo lanche.'
      });
    } else {
      tips.push({
        id: 'tip-prot-optimized',
        category: 'Proteínas Otimizadas',
        icon: ShieldCheck,
        color: 'from-emerald-600 to-emerald-400',
        textColor: 'text-emerald-400',
        title: 'Meta Proteica em Nível Excelente!',
        metricBadge: `${currentIntakeStats.currentProtein}g de ${targets.protein}g atingidos`,
        content: `Com ${currentIntakeStats.currentProtein}g de proteína (${currentIntakeStats.proteinCompliance}% da meta), seus músculos contam com suporte completo de aminoácidos para recuperação e manutenção muscular.`,
        recommendedAction: 'Mantenha a boa distribuição proteica ao longo do restante do dia.'
      });
    }

    // 2. Carbohydrates Intake Tip
    if (currentIntakeStats.carbsCompliance > 110) {
      tips.push({
        id: 'tip-carb-high',
        category: 'Controle Glicêmico & Fibras',
        icon: Apple,
        color: 'from-amber-500 to-orange-600',
        textColor: 'text-amber-400',
        title: 'Consumo de Carboidratos Próximo ao Limite Diário',
        metricBadge: `${currentIntakeStats.currentCarbs}g / ${targets.carbs}g (${currentIntakeStats.carbsCompliance}%)`,
        content: `Seu consumo de carboidratos atingiu ${currentIntakeStats.currentCarbs}g. Para manter a energia estável sem letargia pós-refeição, equilibre o restante do dia com vegetais fibrosos e folhas verdes.`,
        recommendedAction: 'Substitua farináceos por brócolis, abobrinha ou salada rica em fibras no jantar.'
      });
    } else if (currentIntakeStats.carbsRemaining > 35) {
      tips.push({
        id: 'tip-carb-glycogen',
        category: 'Energia & Estoque de Glicogênio',
        icon: TrendingUp,
        color: 'from-amber-500 to-yellow-500',
        textColor: 'text-amber-400',
        title: 'Espaço Estratégico para Carboidratos',
        metricBadge: `Restam ${currentIntakeStats.carbsRemaining}g (${currentIntakeStats.currentCarbs}g consumidos)`,
        content: `Ainda restam ${currentIntakeStats.carbsRemaining}g de carboidratos para atingir sua meta. Se for treinar hoje, aproveite essa janela energética com carboidratos de absorção equilibrada.`,
        recommendedAction: 'Sugestão pré-treino: mingau de aveia com frutas ou batata-doce assada.'
      });
    } else {
      tips.push({
        id: 'tip-carb-balanced',
        category: 'Energia Estável',
        icon: TrendingUp,
        color: 'from-amber-500 to-yellow-500',
        textColor: 'text-amber-400',
        title: 'Carboidratos na Faixa Ideal',
        metricBadge: `${currentIntakeStats.currentCarbs}g / ${targets.carbs}g`,
        content: `Sua proporção de carboidratos está fornecendo fluxo constante de glicose para cérebro e músculos sem picos insulínicos bruscos.`,
        recommendedAction: 'Mantenha essa consistência em grãos integrais e tubérculos.'
      });
    }

    // 3. Healthy Fats Tip
    if (currentIntakeStats.fatCompliance < 80) {
      tips.push({
        id: 'tip-fat-low',
        category: 'Gorduras Boas & Hormônios',
        icon: Droplet,
        color: 'from-rose-500 to-pink-600',
        textColor: 'text-rose-400',
        title: 'Incorpore Lipídios Essenciais (Ômega-3 & 9)',
        metricBadge: `${currentIntakeStats.currentFat}g / ${targets.fat}g (Faltam ${currentIntakeStats.fatRemaining}g)`,
        content: `Suas gorduras saudáveis estão em ${currentIntakeStats.currentFat}g (meta: ${targets.fat}g). As gorduras boas são cruciais para equilíbrio hormonal e absorção de vitaminas lipossolúveis (A, D, E, K).`,
        recommendedAction: 'Adicione 1 colher de sopa de azeite extravirgem ou 4 castanhas-do-pará às refeições.'
      });
    } else if (currentIntakeStats.fatCompliance > 115) {
      tips.push({
        id: 'tip-fat-high',
        category: 'Equilíbrio Lipídico',
        icon: Droplet,
        color: 'from-rose-500 to-red-500',
        textColor: 'text-rose-400',
        title: 'Modere Gorduras nas Próximas Refeições',
        metricBadge: `${currentIntakeStats.currentFat}g / ${targets.fat}g (${currentIntakeStats.fatCompliance}%)`,
        content: `O consumo de gorduras atingiu ${currentIntakeStats.currentFat}g. Para manter o balanço calórico sob controle, prefira carnes magras e preparos grelhados ou cozidos a vapor.`,
        recommendedAction: 'Evite frituras, molhos cremosos e queijos amarelos no restante do dia.'
      });
    } else {
      tips.push({
        id: 'tip-fat-balanced',
        category: 'Saúde Celular & Lipídios',
        icon: Droplet,
        color: 'from-rose-500 to-pink-500',
        textColor: 'text-rose-400',
        title: 'Aporte de Gorduras Saudáveis Adequado',
        metricBadge: `${currentIntakeStats.currentFat}g de ${targets.fat}g consumidos`,
        content: `Excelente aporte lipídico (${currentIntakeStats.currentFat}g). Garante saciedade prolongada e síntese adequada de hormônios anabólicos e neurotransmissores.`,
        recommendedAction: 'Mantenha fontes de gordura mono e poli-insaturadas.'
      });
    }

    // 4. Daily Calorie Balance Tip
    if (currentIntakeStats.caloriesRemaining > 200) {
      tips.push({
        id: 'tip-calories-budget',
        category: 'Balanço Energético Diário',
        icon: Flame,
        color: 'from-violet-500 to-purple-600',
        textColor: 'text-violet-400',
        title: `Saldo Calórico Disponível: ${currentIntakeStats.caloriesRemaining} kcal`,
        metricBadge: `${currentIntakeStats.currentCalories} / ${targets.calories} kcal`,
        content: `Você registrou ${currentIntakeStats.currentCalories} kcal hoje. Ainda restam ${currentIntakeStats.caloriesRemaining} kcal disponíveis para distribuir de forma saudável até a ceia.`,
        recommendedAction: 'Planeje sua próxima refeição com base no saldo de macronutrientes restantes.'
      });
    } else {
      tips.push({
        id: 'tip-calories-target',
        category: 'Balanço Calórico & Meta',
        icon: Flame,
        color: 'from-violet-600 to-indigo-600',
        textColor: 'text-violet-400',
        title: 'Meta Calórica Atingida com Sucesso',
        metricBadge: `${currentIntakeStats.currentCalories} kcal (${currentIntakeStats.caloriesCompliance}%)`,
        content: `Seu consumo calórico de ${currentIntakeStats.currentCalories} kcal está perfeitamente ajustado com sua meta diária de ${targets.calories} kcal para ${goalName}.`,
        recommendedAction: 'Concentre o restante do dia em hidratação pura e chás digestivos sem açúcar.'
      });
    }

    // 5. Hydration Optimization Tip
    const waterRecommended = Math.round((profile?.weight || 70) * 35);
    tips.push({
      id: 'tip-hydration',
      category: 'Hidratação & Metabolismo',
      icon: Droplet,
      color: 'from-sky-500 to-blue-600',
      textColor: 'text-sky-400',
      title: 'Otimize a Hidratação Celular',
      metricBadge: `Meta Hídrica: ~${waterRecommended}ml/dia`,
      content: `Para metabolizar os ${currentIntakeStats.currentProtein}g de proteína e as calorias consumidas, seu corpo necessita de aproximadamente ${waterRecommended}ml de água. Uma hidratação adequada potencializa a digestão e o transporte de nutrientes.`,
      recommendedAction: 'Mantenha uma garrafa de água por perto e fracione copos a cada 60-90 minutos.'
    });

    // 6. Food Logging & Habits Tip
    if (currentIntakeStats.hasTodayLogs) {
      tips.push({
        id: 'tip-logging-active',
        category: 'Consistência Nutricional',
        icon: Activity,
        color: 'from-teal-500 to-emerald-600',
        textColor: 'text-teal-400',
        title: `${currentIntakeStats.todayLogsCount} Refeição(ões) Contabilizadas Hoje`,
        metricBadge: 'Diário Atualizado 🟢',
        content: `Parabéns pela disciplina em registrar suas refeições! O registro contínuo eleva em 80% a taxa de sucesso nas metas nutricionais a médio e longo prazo.`,
        recommendedAction: 'Continue registrando seus lanches para que a Malu ajuste as próximas refeições.'
      });
    } else {
      tips.push({
        id: 'tip-logging-reminder',
        category: 'Diário Alimentar Ativo',
        icon: Activity,
        color: 'from-emerald-500 to-teal-500',
        textColor: 'text-emerald-400',
        title: 'Registre suas Refeições de Hoje',
        metricBadge: 'Aguardando Registros 📝',
        content: `Ainda não identificamos refeições registradas para hoje. Registrar o café da manhã ou almoço leva menos de 15 segundos e afina as previsões de macros em tempo real!`,
        recommendedAction: 'Toque em Registrar Refeição ou utilize a câmera inteligente para análise automática.'
      });
    }

    return tips;
  }, [currentIntakeStats, targets, profile?.goals, profile?.weight]);

  const handleNextTip = () => {
    playSfx('pop');
    vibrate(10);
    setActiveTipIndex(prev => (prev + 1) % dynamicAiTips.length);
  };

  const handlePrevTip = () => {
    playSfx('pop');
    vibrate(10);
    setActiveTipIndex(prev => (prev - 1 + dynamicAiTips.length) % dynamicAiTips.length);
  };

  const handleRefreshData = () => {
    playSfx('crystal');
    vibrate([20, 40]);
    setIsRefreshingAnimation(true);
    setAnimationKey(prev => prev + 1);
    setTimeout(() => setIsRefreshingAnimation(false), 900);
  };

  const handleOpenGoalsModal = () => {
    playSfx('tap');
    vibrate(15);
    setEditProtein(targets.protein);
    setEditCarbs(targets.carbs);
    setEditFat(targets.fat);
    setEditCalories(targets.calories);
    setSmartNotificationsEnabled((profile as any)?.smartNotificationsEnabled ?? true);
    setIsGoalsModalOpen(true);
  };

  const handleSaveGoals = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingGoals(true);
    playSfx('success');
    vibrate([30, 50]);

    const newMacroTargets = {
      protein: Number(editProtein) || 140,
      carbs: Number(editCarbs) || 210,
      fat: Number(editFat) || 65,
      calories: Number(editCalories) || 2000
    };

    const updatedProfile: UserProfile = {
      ...(profile || {
        name: 'Usuário NutriAI',
        age: 30,
        weight: 70,
        height: 170,
        gender: 'Masculino',
        activityLevel: 'Moderado',
        goals: 'Hipertrofia',
        restrictions: [],
        allergies: [],
        equipment: [],
        intakeLogs: [],
        waterLog: { current: 0, goal: 2500 }
      }),
      macroTargets: newMacroTargets,
      smartNotificationsEnabled: smartNotificationsEnabled
    } as any;

    try {
      const user = auth.currentUser || (profile?.id ? { uid: profile.id } : null);
      if (user?.uid) {
        await setDoc(doc(db, 'users', user.uid), { 
          macroTargets: newMacroTargets,
          smartNotificationsEnabled: smartNotificationsEnabled
        }, { merge: true });
      }
    } catch (err) {
      console.warn("Aviso ao salvar metas e notificações no Firestore:", err);
    }

    if (onUpdateProfile) {
      onUpdateProfile(updatedProfile);
    }

    setIsSavingGoals(false);
    setIsGoalsModalOpen(false);

    window.dispatchEvent(new CustomEvent('app:notification', {
      detail: {
        title: 'Metas & Alertas Salvos! 🔔',
        message: smartNotificationsEnabled 
          ? 'Notificações inteligentes ativadas: você receberá alertas push ao atingir ou exceder seus limites.' 
          : 'Metas atualizadas com sucesso.',
        type: 'success'
      }
    }));
  };

  const currentTip = dynamicAiTips[activeTipIndex] || dynamicAiTips[0];
  const TipIcon = currentTip.icon;

  // Calculate SVG circular stroke values for the Large Visual Indicator (Ring)
  const ringRadius = 58;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringProgress = Math.min(100, Math.max(0, criticalNutrient.compliance));
  const strokeDashoffset = ringCircumference - (ringProgress / 100) * ringCircumference;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6 text-slate-100"
    >
      {/* Header Banner */}
      <div className="p-6 md:p-8 rounded-3xl bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 border border-emerald-800/40 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Target className="w-64 h-64 text-emerald-400" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="p-3 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <PieIcon className="w-6 h-6 animate-pulse" />
            </span>
            <div>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2">
                Dashboard Nutricional & Metas
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono">
                  Layout Inteligente
                </span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
                O layout prioriza automaticamente o macronutriente mais crítico em relação à sua meta de saúde ({profile?.goals || 'Hipertrofia'}).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={handleOpenGoalsModal}
              className="px-4 py-2.5 rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition-all active:scale-95 cursor-pointer"
              title="Configurar Metas e Alertas de Macros"
            >
              <Settings className="w-4 h-4 animate-spin-slow" />
              <span>Configurar Metas & Alertas ⚙️</span>
            </button>
            <button
              onClick={handleRefreshData}
              disabled={isRefreshingAnimation}
              className="px-4 py-2.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-black text-xs flex items-center gap-2 border border-slate-700 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
              title="Atualizar dados e gráficos"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshingAnimation ? 'animate-spin' : ''}`} />
              <span>Atualizar</span>
            </button>
          </div>
        </div>

        {/* Filter Chips & Layout Priority Controls */}
        <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-2">Filtrar Macronutriente:</span>
            {[
              { key: 'all', label: 'Todos os Macros' },
              { key: 'protein', label: 'Proteínas 🥩' },
              { key: 'carbs', label: 'Carboidratos 🍞' },
              { key: 'fat', label: 'Gorduras 🥑' }
            ].map(m => (
              <button
                key={m.key}
                onClick={() => {
                  playSfx('pop');
                  vibrate(10);
                  setSelectedMetric(m.key as any);
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedMetric === m.key
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 scale-105'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 border border-slate-700'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* Chart View Mode Toggle Selector (Bar vs Donut) */}
          <div className="flex items-center bg-slate-900 rounded-xl p-1 border border-slate-800 shadow-sm">
            <button
              onClick={() => {
                playSfx('pop');
                setChartViewMode('bar');
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                chartViewMode === 'bar'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Visualizar gráfico de barras"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Barras</span>
            </button>
            <button
              onClick={() => {
                playSfx('pop');
                setChartViewMode('donut');
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                chartViewMode === 'donut'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Visualizar gráfico de rosca (Donut)"
            >
              <PieIcon className="w-3.5 h-3.5" />
              <span>Rosca (Donut)</span>
            </button>
          </div>
        </div>
      </div>

      {/* CONDITIONAL RENDERING: EXPANDED PRIORITY HERO CARD (LARGER VISUAL INDICATOR) */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`critical-hero-${criticalNutrient.type}-${animationKey}`}
          initial={{ opacity: 0, scale: 0.98, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: -15 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className={`p-6 md:p-8 rounded-3xl bg-gradient-to-br ${criticalNutrient.cardBg} border-2 border-emerald-500/40 shadow-2xl relative overflow-hidden`}
        >
          {/* Subtle Background Glow */}
          <div 
            className="absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl pointer-events-none opacity-20 -mr-20 -mt-20"
            style={{ backgroundColor: criticalNutrient.color }}
          />

          <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8">
            {/* Left Column: Context, Goal & Recommendations */}
            <div className="space-y-4 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`px-3 py-1 rounded-full text-xs font-black tracking-wider uppercase border flex items-center gap-1.5 ${criticalNutrient.badgeBg}`}>
                  {criticalNutrient.isCritical ? <AlertTriangle className="w-3.5 h-3.5 animate-bounce" /> : <Award className="w-3.5 h-3.5" />}
                  <span>{criticalNutrient.statusLabel}</span>
                </span>
                <span className="text-xs text-slate-400">
                  Meta Primária: <strong className="text-white">{profile?.goals || 'Hipertrofia Muscular'}</strong>
                </span>
              </div>

              <div>
                <h3 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
                  <span>{criticalNutrient.emoji}</span>
                  <span>{criticalNutrient.headline}</span>
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed max-w-2xl">
                  {criticalNutrient.explanation}
                </p>
              </div>

              {/* Quick food adjustment recommendations pill bar */}
              <div className="pt-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                  Sugestões Rápidas para Equilibrar Hoje:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {criticalNutrient.suggestedFoods.map((item, idx) => (
                    <div 
                      key={idx}
                      className="px-3.5 py-2.5 rounded-2xl bg-slate-900/80 border border-slate-700/60 flex items-center justify-between gap-2 shadow-sm"
                    >
                      <div className="min-w-0">
                        <span className="font-bold text-white text-xs block truncate">{item.name}</span>
                        <span className="text-[10px] text-slate-400">{item.portion}</span>
                      </div>
                      <span className="text-xs font-black text-emerald-400 whitespace-nowrap bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">
                        {item.gain}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column: LARGER CIRCULAR VISUAL INDICATOR (GAUGE) */}
            <div className="flex flex-col items-center justify-center p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl shrink-0 w-full sm:w-auto min-w-[280px]">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-emerald-400" />
                Indicador Visual de Destaque
              </span>

              {/* Large Circular Gauge SVG */}
              <div className="relative w-44 h-44 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 140 140">
                  {/* Background Track */}
                  <circle
                    cx="70"
                    cy="70"
                    r={ringRadius}
                    className="text-slate-800"
                    strokeWidth="12"
                    stroke="currentColor"
                    fill="transparent"
                  />
                  {/* Dynamic Animated Progress Track */}
                  <motion.circle
                    cx="70"
                    cy="70"
                    r={ringRadius}
                    stroke={criticalNutrient.color}
                    strokeWidth="12"
                    strokeDasharray={ringCircumference}
                    initial={{ strokeDashoffset: ringCircumference }}
                    animate={{ strokeDashoffset }}
                    transition={{ duration: 1.2, ease: "easeOut" }}
                    strokeLinecap="round"
                    fill="transparent"
                  />
                </svg>

                {/* Center Content of Ring */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                  <span className="text-3xl font-black text-white">
                    <AnimatedCounter value={criticalNutrient.compliance} suffix="%" />
                  </span>
                  <span className="text-[11px] font-bold text-slate-400 mt-0.5">
                    {criticalNutrient.label}
                  </span>
                </div>
              </div>

              {/* Metrics Under Ring */}
              <div className="mt-4 pt-3 border-t border-slate-800 w-full flex items-center justify-between text-xs px-2">
                <div className="text-left">
                  <span className="text-[10px] text-slate-400 block">Consumo Médio</span>
                  <span className="font-black text-white text-sm">
                    <AnimatedCounter value={criticalNutrient.consumed} suffix={criticalNutrient.unit} />
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block">Meta Diária</span>
                  <span className="font-black text-emerald-400 text-sm">
                    {criticalNutrient.target}{criticalNutrient.unit}
                  </span>
                </div>
              </div>

              {/* Gap Badge */}
              <div className={`mt-3 w-full py-1.5 px-3 rounded-xl text-center text-[11px] font-bold ${
                criticalNutrient.isDeficit 
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' 
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              }`}>
                {criticalNutrient.isDeficit 
                  ? `Déficit diário: -${criticalNutrient.gap}${criticalNutrient.unit}` 
                  : `Meta atingida: +${criticalNutrient.gap}${criticalNutrient.unit}`}
              </div>

              {/* Action Button: Filter Macro in Charts */}
              <button
                onClick={() => {
                  playSfx('tap');
                  vibrate(10);
                  setSelectedMetric(criticalNutrient.type);
                }}
                className="mt-3.5 w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-slate-700"
              >
                <span>Ver no Gráfico Semanal</span>
                <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
              </button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Target Comparison Cards Grid: Conditional Highlight on Prioritized Macro */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {/* Protein Card */}
        <motion.div 
          key={`protein-${animationKey}`}
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className={`p-6 rounded-3xl bg-emerald-950/40 border shadow-xl relative overflow-hidden transition-all ${
            criticalNutrient.type === 'protein'
              ? 'border-2 border-emerald-400 ring-4 ring-emerald-500/20 shadow-emerald-500/10'
              : 'border-emerald-500/30'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Proteínas</span>
              {criticalNutrient.type === 'protein' && (
                <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950 animate-pulse">
                  FOCO PRINCIPAL 🔥
                </span>
              )}
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-mono">
              Meta: <AnimatedCounter key={`tprot-${animationKey}`} value={targets.protein} suffix="g" />
            </span>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <div>
              <span className="text-3xl font-black text-white">
                <AnimatedCounter key={`prot-${animationKey}`} value={weeklySummary.avgProtein} suffix="g" />
              </span>
              <span className="block text-xs text-emerald-300/80 font-medium mt-1">Média diária consumida</span>
            </div>
            <div className={`text-right font-black text-lg ${weeklySummary.proteinCompliance >= 95 ? 'text-emerald-400' : 'text-amber-400'}`}>
              <AnimatedCounter key={`pcmp-${animationKey}`} value={weeklySummary.proteinCompliance} suffix="%" />
            </div>
          </div>
          <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden mt-4 p-0.5">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, weeklySummary.proteinCompliance)}%` }}
              transition={{ duration: 0.9, ease: "easeOut" }}
              className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full"
            />
          </div>
        </motion.div>

        {/* Carbs Card */}
        <motion.div 
          key={`carbs-${animationKey}`}
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25, delay: 0.1 }}
          className={`p-6 rounded-3xl bg-amber-950/40 border shadow-xl relative overflow-hidden transition-all ${
            criticalNutrient.type === 'carbs'
              ? 'border-2 border-amber-400 ring-4 ring-amber-500/20 shadow-amber-500/10'
              : 'border-amber-500/30'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Carboidratos</span>
              {criticalNutrient.type === 'carbs' && (
                <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 animate-pulse">
                  FOCO PRINCIPAL 🍞
                </span>
              )}
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 font-mono">
              Meta: <AnimatedCounter key={`tcarb-${animationKey}`} value={targets.carbs} suffix="g" />
            </span>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <div>
              <span className="text-3xl font-black text-white">
                <AnimatedCounter key={`carb-${animationKey}`} value={weeklySummary.avgCarbs} suffix="g" />
              </span>
              <span className="block text-xs text-amber-300/80 font-medium mt-1">Média diária consumida</span>
            </div>
            <div className={`text-right font-black text-lg ${weeklySummary.carbsCompliance >= 90 && weeklySummary.carbsCompliance <= 110 ? 'text-emerald-400' : 'text-amber-400'}`}>
              <AnimatedCounter key={`ccmp-${animationKey}`} value={weeklySummary.carbsCompliance} suffix="%" />
            </div>
          </div>
          <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden mt-4 p-0.5">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, weeklySummary.carbsCompliance)}%` }}
              transition={{ duration: 0.9, ease: "easeOut", delay: 0.1 }}
              className="bg-gradient-to-r from-amber-500 to-yellow-400 h-full rounded-full"
            />
          </div>
        </motion.div>

        {/* Fat Card */}
        <motion.div 
          key={`fat-${animationKey}`}
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25, delay: 0.2 }}
          className={`p-6 rounded-3xl bg-rose-950/40 border shadow-xl relative overflow-hidden transition-all ${
            criticalNutrient.type === 'fat'
              ? 'border-2 border-rose-400 ring-4 ring-rose-500/20 shadow-rose-500/10'
              : 'border-rose-500/30'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-rose-400 uppercase tracking-wider">Gorduras</span>
              {criticalNutrient.type === 'fat' && (
                <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-rose-500 text-slate-950 animate-pulse">
                  FOCO PRINCIPAL 🥑
                </span>
              )}
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-300 font-mono">
              Meta: <AnimatedCounter key={`tfat-${animationKey}`} value={targets.fat} suffix="g" />
            </span>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <div>
              <span className="text-3xl font-black text-white">
                <AnimatedCounter key={`fatval-${animationKey}`} value={weeklySummary.avgFat} suffix="g" />
              </span>
              <span className="block text-xs text-rose-300/80 font-medium mt-1">Média diária consumida</span>
            </div>
            <div className={`text-right font-black text-lg ${weeklySummary.fatCompliance >= 90 && weeklySummary.fatCompliance <= 110 ? 'text-emerald-400' : 'text-amber-400'}`}>
              <AnimatedCounter key={`fcmp-${animationKey}`} value={weeklySummary.fatCompliance} suffix="%" />
            </div>
          </div>
          <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden mt-4 p-0.5">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, weeklySummary.fatCompliance)}%` }}
              transition={{ duration: 0.9, ease: "easeOut", delay: 0.2 }}
              className="bg-gradient-to-r from-rose-500 to-pink-400 h-full rounded-full"
            />
          </div>
        </motion.div>
      </div>

      {/* Main Recharts Section (Bar Chart vs Donut Chart Toggle) */}
      <motion.div 
        key={`chart-container-${chartViewMode}-${selectedMetric}-${animationKey}`}
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="p-6 md:p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
              {chartViewMode === 'bar' ? 'Ingestão Semanal vs. Metas do Perfil (Barras)' : 'Proporção Média de Macronutrientes (Rosca / Donut)'}
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              {chartViewMode === 'bar' 
                ? 'Comparativo dia a dia dos macronutrientes consumidos em relação às metas' 
                : 'Comparativo proporcional da ingestão média diária com as metas do perfil'}
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-bold">
            {chartViewMode === 'bar' ? (
              <>
                {(selectedMetric === 'all' || selectedMetric === 'protein') && (
                  <span className="flex items-center gap-1.5 text-emerald-400">
                    <span className="w-3 h-3 rounded-md bg-emerald-500"></span> Proteína
                  </span>
                )}
                {(selectedMetric === 'all' || selectedMetric === 'carbs') && (
                  <span className="flex items-center gap-1.5 text-amber-400">
                    <span className="w-3 h-3 rounded-md bg-amber-500"></span> Carbos
                  </span>
                )}
                {(selectedMetric === 'all' || selectedMetric === 'fat') && (
                  <span className="flex items-center gap-1.5 text-rose-400">
                    <span className="w-3 h-3 rounded-md bg-rose-500"></span> Gorduras
                  </span>
                )}
              </>
            ) : (
              <span className="text-xs text-slate-400">Meta vs. Consumido (g)</span>
            )}
          </div>
        </div>

        <div className="h-80 w-full flex items-center justify-center">
          {chartViewMode === 'bar' ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData} margin={{ top: 15, right: 15, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
                <XAxis dataKey="dayLabel" stroke="#94a3b8" tick={{ fontSize: 12 }} />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} unit="g" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#0f172a', 
                    borderColor: '#334155', 
                    borderRadius: '16px',
                    color: '#f8fafc',
                    fontSize: '12px',
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.7)'
                  }}
                  formatter={(val: number, name: string) => {
                    const labelMap: Record<string, string> = {
                      protein: `Proteína Consumida (${targets.protein}g meta)`,
                      carbs: `Carboidratos Consumidos (${targets.carbs}g meta)`,
                      fat: `Gorduras Consumidas (${targets.fat}g meta)`
                    };
                    return [`${val}g`, labelMap[name] || name];
                  }}
                />
                <Legend 
                  wrapperStyle={{ paddingTop: '15px', fontSize: '12px' }}
                  formatter={(value) => {
                    const map: Record<string, string> = {
                      protein: 'Proteína (g)',
                      carbs: 'Carboidratos (g)',
                      fat: 'Gorduras (g)'
                    };
                    return <span className="text-slate-200 font-semibold">{map[value] || value}</span>;
                  }}
                />

                {(selectedMetric === 'all' || selectedMetric === 'protein') && (
                  <Bar dataKey="protein" name="protein" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={45} animationDuration={1000} />
                )}
                {(selectedMetric === 'all' || selectedMetric === 'carbs') && (
                  <Bar dataKey="carbs" name="carbs" fill="#f59e0b" radius={[6, 6, 0, 0]} maxBarSize={45} animationDuration={1000} />
                )}
                {(selectedMetric === 'all' || selectedMetric === 'fat') && (
                  <Bar dataKey="fat" name="fat" fill="#ec4899" radius={[6, 6, 0, 0]} maxBarSize={45} animationDuration={1000} />
                )}
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="w-full h-full flex flex-col md:flex-row items-center justify-center gap-6">
              <div className="w-full md:w-1/2 h-full relative flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={donutChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={75}
                      outerRadius={110}
                      paddingAngle={6}
                      dataKey="value"
                      animationDuration={1000}
                    >
                      {donutChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} stroke="#0f172a" strokeWidth={3} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#0f172a', 
                        borderColor: '#334155', 
                        borderRadius: '16px',
                        color: '#f8fafc',
                        fontSize: '12px'
                      }}
                      formatter={(val: number, name: string, item: any) => [`${val}g (Meta: ${item.payload.target}g)`, name]}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute text-center pointer-events-none">
                  <span className="text-2xl font-black text-white block">
                    <AnimatedCounter value={weeklySummary.avgCalories} />
                  </span>
                  <span className="text-[11px] uppercase font-bold text-slate-400">kcal/dia</span>
                </div>
              </div>

              <div className="w-full md:w-1/2 space-y-3 px-4">
                <h4 className="font-bold text-white text-sm">Resumo da Rosca Nutricional</h4>
                {donutChartData.map(item => {
                  const compliance = Math.round((item.value / item.target) * 100);
                  return (
                    <div key={item.name} className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="w-4 h-4 rounded-lg shadow-sm" style={{ backgroundColor: item.color }} />
                        <div>
                          <span className="font-bold text-white text-xs block">{item.name}</span>
                          <span className="text-[10px] text-slate-400">Meta: {item.target}g</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-black text-white text-sm">{item.value}g</span>
                        <span className={`block text-[10px] font-bold ${compliance >= 95 ? 'text-emerald-400' : 'text-amber-400'}`}>
                          {compliance}% atingido
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* CARROSSEL DE DICAS NUTRICIONAIS INTELIGENTES (LOGO ABAIXO DO GRÁFICO DE MACRONUTRIENTES) */}
      <motion.div 
        key={`ai-tips-carousel-section-${animationKey}`}
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="p-6 md:p-8 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900/95 to-emerald-950/40 border border-emerald-500/30 shadow-2xl relative overflow-hidden"
      >
        {/* Subtle decorative glow */}
        <div 
          className="absolute -top-24 -right-24 w-72 h-72 rounded-full blur-3xl pointer-events-none opacity-20"
          style={{ backgroundColor: currentTip.color.includes('emerald') ? '#10b981' : currentTip.color.includes('amber') ? '#f59e0b' : '#06b6d4' }}
        />

        {/* Carousel Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-lg shadow-emerald-600/20 shrink-0">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-bold text-white tracking-tight">
                  Carrossel de Dicas Nutricionais da IA
                </h3>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono font-bold">
                  {activeTipIndex + 1} de {dynamicAiTips.length}
                </span>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1.5 font-medium">
                  <Activity className="w-3 h-3 text-emerald-400" />
                  {currentIntakeStats.hasTodayLogs ? `${currentIntakeStats.todayLogsCount} refeições registradas hoje` : 'Consumo Recente Calibrado'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Recomendações em tempo real geradas a partir do seu histórico de consumo de macronutrientes e calorias.
              </p>
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <button
              onClick={handlePrevTip}
              className="w-10 h-10 rounded-full bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-all border border-slate-700/80 cursor-pointer shadow-md hover:scale-105 active:scale-95"
              title="Dica anterior"
              aria-label="Dica anterior"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={handleNextTip}
              className="w-10 h-10 rounded-full bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-all border border-slate-700/80 cursor-pointer shadow-md hover:scale-105 active:scale-95"
              title="Próxima dica"
              aria-label="Próxima dica"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Carousel Active Slide Card */}
        <div className="relative min-h-[140px] flex items-center z-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentTip.id}
              initial={{ opacity: 0, x: 25, scale: 0.98 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -25, scale: 0.98 }}
              transition={{ duration: 0.35, ease: "easeInOut" }}
              className="w-full bg-slate-800/80 rounded-2xl p-5 sm:p-6 border border-slate-700/80 shadow-inner flex flex-col sm:flex-row items-start sm:items-center gap-5"
            >
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${currentTip.color} flex items-center justify-center text-white shadow-xl shrink-0`}>
                <TipIcon className="w-7 h-7" />
              </div>
              <div className="space-y-2 flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-slate-900/90 ${currentTip.textColor} border border-slate-700`}>
                    {currentTip.category}
                  </span>
                  {currentTip.metricBadge && (
                    <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-900/90 text-slate-300 border border-slate-700 font-mono">
                      {currentTip.metricBadge}
                    </span>
                  )}
                </div>
                <h4 className="font-bold text-white text-base sm:text-lg">
                  {currentTip.title}
                </h4>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  {currentTip.content}
                </p>
                {currentTip.recommendedAction && (
                  <div className="pt-1.5 flex items-start sm:items-center gap-2 text-xs font-semibold text-emerald-300 bg-emerald-950/40 p-2.5 rounded-xl border border-emerald-500/20">
                    <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5 sm:mt-0" />
                    <span>{currentTip.recommendedAction}</span>
                  </div>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Carousel Pagination Dots */}
        <div className="flex justify-center items-center gap-2 mt-5 relative z-10">
          {dynamicAiTips.map((tip, idx) => (
            <button
              key={tip.id || idx}
              onClick={() => {
                playSfx('pop');
                vibrate(10);
                setActiveTipIndex(idx);
              }}
              className={`h-2.5 rounded-full transition-all cursor-pointer ${
                activeTipIndex === idx 
                  ? 'w-9 bg-emerald-500 shadow-md shadow-emerald-500/50' 
                  : 'w-2.5 bg-slate-700 hover:bg-slate-600'
              }`}
              title={`Ir para dica ${idx + 1}: ${tip.category}`}
              aria-label={`Ir para dica ${idx + 1}`}
            />
          ))}
        </div>
      </motion.div>

      {/* GOAL CONFIGURATION & SMART NOTIFICATIONS MODAL */}
      <AnimatePresence>
        {isGoalsModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-slate-900 border border-emerald-500/40 rounded-3xl max-w-lg w-full p-6 md:p-8 shadow-2xl relative space-y-6 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <Settings className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Configurar Metas & Alertas</h3>
                    <p className="text-xs text-slate-400">Defina limites de macros e notificações inteligentes</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsGoalsModalOpen(false)}
                  className="w-9 h-9 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveGoals} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                    <span>Proteínas (g)</span>
                    <span className="text-emerald-400 font-mono">{editProtein}g</span>
                  </label>
                  <input
                    type="number"
                    min="30"
                    max="400"
                    value={editProtein}
                    onChange={(e) => setEditProtein(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                    <span>Carboidratos (g)</span>
                    <span className="text-amber-400 font-mono">{editCarbs}g</span>
                  </label>
                  <input
                    type="number"
                    min="30"
                    max="600"
                    value={editCarbs}
                    onChange={(e) => setEditCarbs(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                    <span>Gorduras (g)</span>
                    <span className="text-rose-400 font-mono">{editFat}g</span>
                  </label>
                  <input
                    type="number"
                    min="20"
                    max="200"
                    value={editFat}
                    onChange={(e) => setEditFat(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                    <span>Calorias Totais (kcal)</span>
                    <span className="text-violet-400 font-mono">{editCalories} kcal</span>
                  </label>
                  <input
                    type="number"
                    min="1000"
                    max="5000"
                    value={editCalories}
                    onChange={(e) => setEditCalories(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>

                {/* Smart Notifications Toggle Selector */}
                <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700/80 flex items-center justify-between gap-4 mt-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0">
                      <BellRing className="w-5 h-5 animate-bounce" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-xs">Notificações Inteligentes 🔔</h4>
                      <p className="text-[11px] text-slate-400">
                        Alertas push quando estiver prestes a atingir ou exceder os limites diários de macronutrientes.
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input 
                      type="checkbox" 
                      checked={smartNotificationsEnabled} 
                      onChange={(e) => {
                        playSfx('pop');
                        setSmartNotificationsEnabled(e.target.checked);
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>

                <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsGoalsModalOpen(false)}
                    className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingGoals}
                    className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
                  >
                    {isSavingGoals ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    <span>Salvar Metas & Alertas</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
