import { UserProfile, IntakeLog } from '../types';

export interface DashboardQuickTip {
  id: string;
  category: 'refeicao' | 'calorias' | 'hidratacao' | 'habito';
  tag: string;
  title: string;
  suggestion: string;
  details: string;
  actionLabel?: string;
  actionTab?: string;
  actionType?: 'navigate' | 'quick_log' | 'speak';
  iconType: 'utensils' | 'flame' | 'droplet' | 'sparkles' | 'scale' | 'moon';
  badgeColor: string; // Tailwind class
  isPrimary?: boolean;
  contextData?: {
    mealLogged?: 'lunch' | 'dinner' | 'breakfast' | 'none';
    mealName?: string;
    calories?: number;
    goalName?: string;
  };
}

/**
 * Normaliza e identifica o tipo de refeição com base no log
 */
export function identifyMealType(log: IntakeLog): 'breakfast' | 'lunch' | 'snack' | 'dinner' {
  if (log.mealType) {
    const t = log.mealType.toLowerCase();
    if (t.includes('lunch') || t.includes('almo')) return 'lunch';
    if (t.includes('dinner') || t.includes('jant')) return 'dinner';
    if (t.includes('breakfast') || t.includes('caf')) return 'breakfast';
    if (t.includes('snack') || t.includes('lanche')) return 'snack';
  }

  const name = (log.recipeName || '').toLowerCase();
  const mealId = (log.mealId || '').toLowerCase();
  if (name.includes('almoço') || name.includes('almoco') || mealId.includes('lunch')) return 'lunch';
  if (name.includes('jantar') || mealId.includes('dinner')) return 'dinner';
  if (name.includes('café') || name.includes('cafe') || mealId.includes('breakfast')) return 'breakfast';
  if (name.includes('lanche') || mealId.includes('snack')) return 'snack';

  // Fallback baseado no horário do log
  if (log.date) {
    try {
      const hours = new Date(log.date).getHours();
      if (hours >= 5 && hours < 11) return 'breakfast';
      if (hours >= 11 && hours < 16) return 'lunch';
      if (hours >= 16 && hours < 18) return 'snack';
      if (hours >= 18 && hours <= 23) return 'dinner';
    } catch {
      // Ignora erro de parse
    }
  }

  return 'lunch';
}

/**
 * Normaliza o objetivo do usuário
 */
export function getGoalType(profile: UserProfile | null): {
  type: 'weight_loss' | 'muscle_gain' | 'wellness';
  label: string;
} {
  const rawGoals = (profile?.goals || '').toLowerCase();
  const targetWeight = profile?.targetWeight;
  const currentWeight = profile?.weight;

  if (
    rawGoals.includes('perda') ||
    rawGoals.includes('emagrec') ||
    rawGoals.includes('secar') ||
    rawGoals.includes('peso') ||
    rawGoals.includes('deficit') ||
    (targetWeight && currentWeight && targetWeight < currentWeight)
  ) {
    return { type: 'weight_loss', label: 'perda de peso' };
  }

  if (
    rawGoals.includes('ganho') ||
    rawGoals.includes('massa') ||
    rawGoals.includes('hipertrofia') ||
    rawGoals.includes('muscul') ||
    (targetWeight && currentWeight && targetWeight > currentWeight)
  ) {
    return { type: 'muscle_gain', label: 'ganho de massa' };
  }

  return { type: 'wellness', label: 'saúde e longevidade' };
}

/**
 * Gera dicas rápidas com base no histórico real do usuário
 */
export function generateHistoryQuickTips(profile: UserProfile | null): DashboardQuickTip[] {
  const tips: DashboardQuickTip[] = [];
  const goalInfo = getGoalType(profile);
  const isWeightLoss = goalInfo.type === 'weight_loss';
  const isMuscleGain = goalInfo.type === 'muscle_gain';

  // Filtra logs de hoje
  const todayStr = new Date().toISOString().split('T')[0];
  const allLogs = profile?.intakeLogs || [];
  const todayLogs = allLogs.filter(log => {
    if (!log || !log.date) return false;
    return log.date.startsWith(todayStr) || new Date(log.date).toDateString() === new Date().toDateString();
  });

  // Encontra tipos específicos de refeições registradas hoje
  let lunchLog: IntakeLog | undefined;
  let dinnerLog: IntakeLog | undefined;
  let breakfastLog: IntakeLog | undefined;

  for (const log of todayLogs) {
    const type = identifyMealType(log);
    if (type === 'lunch' && !lunchLog) lunchLog = log;
    if (type === 'dinner' && !dinnerLog) dinnerLog = log;
    if (type === 'breakfast' && !breakfastLog) breakfastLog = log;
  }

  // Se o almoço não foi logado hoje, verifica o almoço mais recente no histórico geral
  const pastLunchLog = !lunchLog
    ? allLogs.slice().reverse().find(l => identifyMealType(l) === 'lunch')
    : undefined;

  const totalCaloriesToday = todayLogs.reduce((acc, curr) => acc + (curr.actual?.calories || curr.planned?.calories || 0), 0);
  const targetCalories = profile?.masterPlan?.dailyCalories || 2000;
  const remainingCalories = Math.max(0, targetCalories - totalCaloriesToday);

  // -------------------------------------------------------------
  // DICA 1: Principal - Sugestão de Jantar Baseada no Almoço e Objetivo
  // -------------------------------------------------------------
  if (lunchLog && !dinnerLog) {
    const mealName = lunchLog.recipeName && lunchLog.recipeName !== 'quick-log' ? lunchLog.recipeName : null;
    const lunchCal = lunchLog.actual?.calories || lunchLog.planned?.calories || 0;

    if (isWeightLoss) {
      tips.push({
        id: 'lunch-to-dinner-weight-loss',
        category: 'refeicao',
        tag: 'Adaptação Dinâmica',
        title: 'Almoço Registrado • Jantar Leve Sugerido',
        suggestion: mealName
          ? `Como você registrou o almoço ("${mealName}"), hoje seu jantar pode ser mais leve baseado no seu objetivo de perda de peso.`
          : `Como você registrou o almoço, hoje seu jantar pode ser mais leve baseado no seu objetivo de perda de peso.`,
        details: lunchCal > 0
          ? `Seu almoço somou aproximadamente ${lunchCal} kcal. Para manter o déficit calórico confortável e eficiente para queima de gordura, sugerimos um jantar com proteínas magras (frango, peixe ou ovos) acompanhadas de vegetais folhosos e legumes no vapor.`
          : `Para manter o déficit calórico no alvo de perda de peso, priorize um jantar rico em fibras e proteínas magras, evitando excesso de carboidratos pesados à noite.`,
        actionLabel: 'Ver Pratos Rápidos Leves',
        actionTab: 'quickdishes',
        iconType: 'flame',
        badgeColor: 'bg-orange-500/10 text-orange-500 border-orange-500/30',
        isPrimary: true,
        contextData: {
          mealLogged: 'lunch',
          mealName: mealName || 'Almoço Saudável',
          calories: lunchCal,
          goalName: goalInfo.label
        }
      });
    } else if (isMuscleGain) {
      tips.push({
        id: 'lunch-to-dinner-muscle-gain',
        category: 'refeicao',
        tag: 'Hipertrofia Ativa',
        title: 'Almoço Registrado • Jantar Anabólico',
        suggestion: mealName
          ? `Como você registrou o almoço ("${mealName}"), seu jantar deve priorizar proteínas de alto valor biológico e carboidratos complexos baseado no seu objetivo de ganho de massa.`
          : `Como você registrou o almoço, seu jantar deve priorizar proteínas e carboidratos complexos baseado no seu objetivo de ganho de massa.`,
        details: `Mantenha a síntese proteica elevada durante a noite com peito de frango, ovos ou carne magra junto com batata-doce, arroz integral ou mandioquinha.`,
        actionLabel: 'Ver Receitas Hipertróficas',
        actionTab: 'generator',
        iconType: 'flame',
        badgeColor: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30',
        isPrimary: true,
        contextData: {
          mealLogged: 'lunch',
          mealName: mealName || 'Almoço Anabólico',
          calories: lunchCal,
          goalName: goalInfo.label
        }
      });
    } else {
      tips.push({
        id: 'lunch-to-dinner-wellness',
        category: 'refeicao',
        tag: 'Equilíbrio Diário',
        title: 'Almoço Registrado • Jantar Digestivo',
        suggestion: `Como você registrou o almoço, hoje seu jantar pode ser equilibrado e de fácil digestão baseado no seu objetivo de ${goalInfo.label}.`,
        details: `Uma refeição leve com sopas funcionais, salada morna ou omelete de ervas garante sono profundo e reparação celular noturna.`,
        actionLabel: 'Ideias para o Jantar',
        actionTab: 'quickdishes',
        iconType: 'utensils',
        badgeColor: 'bg-teal-500/10 text-teal-500 border-teal-500/30',
        isPrimary: true,
        contextData: {
          mealLogged: 'lunch',
          mealName: mealName || 'Almoço',
          calories: lunchCal,
          goalName: goalInfo.label
        }
      });
    }
  } else if (lunchLog && dinnerLog) {
    tips.push({
      id: 'day-meals-completed',
      category: 'refeicao',
      tag: 'Meta do Dia',
      title: 'Almoço e Jantar Concluídos',
      suggestion: `Você já registrou almoço e jantar hoje! Seu equilíbrio calórico está alinhado ao seu objetivo de ${goalInfo.label}.`,
      details: `Caso bata vontade de petiscar mais tarde, opte por uma infusão de camomila ou melissa com algumas sementes de abóbora, promovendo saciedade sem sobrecarregar o fígado.`,
      actionLabel: 'Ver Chás & Fitoterapia',
      actionTab: 'herbs',
      iconType: 'sparkles',
      badgeColor: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
      isPrimary: true,
      contextData: {
        mealLogged: 'dinner',
        mealName: dinnerLog.recipeName || 'Jantar',
        calories: (lunchLog.actual?.calories || 0) + (dinnerLog.actual?.calories || 0),
        goalName: goalInfo.label
      }
    });
  } else if (breakfastLog && !lunchLog) {
    tips.push({
      id: 'breakfast-to-lunch',
      category: 'refeicao',
      tag: 'Próximo Passo',
      title: 'Café da Manhã Registrado • Prepare o Almoço',
      suggestion: `Como você já registrou o café da manhã, monte seu almoço com 50% de vegetais frescos baseado no seu objetivo de ${goalInfo.label}.`,
      details: `Incluir fibras e proteínas logo no início da tarde reduz picos glicêmicos, evita a sonolência pós-prandial e facilita um jantar mais leve mais tarde.`,
      actionLabel: 'Sugerir Almoço Saudável',
      actionTab: 'quickdishes',
      iconType: 'utensils',
      badgeColor: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30',
      isPrimary: true,
      contextData: {
        mealLogged: 'breakfast',
        mealName: breakfastLog.recipeName || 'Café da Manhã',
        calories: breakfastLog.actual?.calories || 0,
        goalName: goalInfo.label
      }
    });
  } else {
    // Nenhuma refeição registrada hoje
    if (pastLunchLog) {
      tips.push({
        id: 'no-meals-today-history-based',
        category: 'refeicao',
        tag: 'Ajuste Inteligente',
        title: 'Calibragem de Refeições Ativa',
        suggestion: `Assim que registrar seu almoço hoje, a IA ajustará o seu jantar para ser mais leve baseado no seu objetivo de ${goalInfo.label}.`,
        details: `Pelo seu histórico, registrar o almoço em tempo real garante que a recomendação do jantar se adapte com precisão às calorias e saciedade que você precisa.`,
        actionLabel: 'Registrar Almoço Agora',
        actionTab: 'plan',
        iconType: 'scale',
        badgeColor: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
        isPrimary: true,
        contextData: {
          mealLogged: 'none',
          goalName: goalInfo.label
        }
      });
    } else {
      tips.push({
        id: 'no-meals-today-onboarding',
        category: 'refeicao',
        tag: 'Dica Proativa',
        title: 'Conecte Seu Histórico de Pratos',
        suggestion: `Como dica rápida para seu objetivo de ${goalInfo.label}: ao registrar seu almoço, seu jantar poderá ser calibrado automaticamente para ser mais leve e prático.`,
        details: `Experimente registrar sua refeição ou escolher uma das nossas opções rápidas em 1 toque para ver a IA calcular o equilíbrio da sua noite.`,
        actionLabel: 'Registrar Almoço Rápido',
        actionTab: 'quickdishes',
        iconType: 'utensils',
        badgeColor: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30',
        isPrimary: true,
        contextData: {
          mealLogged: 'none',
          goalName: goalInfo.label
        }
      });
    }
  }

  // -------------------------------------------------------------
  // DICA 2: Balanço de Calorias e Déficit
  // -------------------------------------------------------------
  if (totalCaloriesToday > 0) {
    tips.push({
      id: 'calories-balance-today',
      category: 'calorias',
      tag: 'Saldo Calórico',
      title: 'Balanço Nutricional Hoje',
      suggestion: remainingCalories > 0
        ? `Você consumiu ${totalCaloriesToday} kcal hoje e ainda possui ~${remainingCalories} kcal para distribuir entre o jantar e ceia sem sair do objetivo.`
        : `Você atingiu sua meta calórica de hoje (${totalCaloriesToday} kcal). Mantenha seu jantar à base de folhas e água saborizada para manter a queima ativa.`,
      details: isWeightLoss
        ? `Distribuir calorias dando prioridade para o almoço e mantendo a noite leve é comprovado cientificamente para acelerar o emagrecimento saudável.`
        : `Atingir seus macros diários garante consistência muscular e energia constante.`,
      actionLabel: 'Ver Detalhes do Plano',
      actionTab: 'plan',
      iconType: 'scale',
      badgeColor: 'bg-amber-500/10 text-amber-500 border-amber-500/30'
    });
  }

  // -------------------------------------------------------------
  // DICA 3: Hidratação e Digestão Pré-Jantar
  // -------------------------------------------------------------
  const todayWaterLogs = profile?.hydrationLogs?.filter(l => l.date.startsWith(todayStr)) || [];
  const waterCurrent = todayWaterLogs.reduce((acc, curr) => acc + (curr.amount || 0), 0);
  const waterTarget = profile?.waterGoal || 2500;

  tips.push({
    id: 'hydration-dinner-timing',
    category: 'hidratacao',
    tag: 'Digestão Perfeita',
    title: 'Hidratação Pré-Jantar',
    suggestion: waterCurrent < waterTarget * 0.6
      ? `Sua hidratação está em ${waterCurrent}ml de ${waterTarget}ml. Tome 2 copos de água até 30 minutos antes do jantar para melhorar a saciedade.`
      : `Excelente ritmo de água hoje (${waterCurrent}ml)! Evite ingerir grandes volumes de líquidos durante a mastigação do jantar para não diluir os sucos gástricos.`,
    details: `Beber água morna ou em temperatura ambiente meia hora antes da refeição prepara as enzimas estomacais e reduz a compulsão alimentar noturna.`,
    actionLabel: 'Acompanhar Água',
    actionTab: 'habits',
    iconType: 'droplet',
    badgeColor: 'bg-blue-500/10 text-blue-500 border-blue-500/30'
  });

  return tips;
}
