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
    if (t.includes('breakfast') || t.includes('caf') || t.includes('desay')) return 'breakfast';
    if (t.includes('snack') || t.includes('lanche') || t.includes('merien')) return 'snack';
  }

  const name = (log.recipeName || '').toLowerCase();
  const mealId = (log.mealId || '').toLowerCase();
  if (name.includes('almoço') || name.includes('almoco') || name.includes('lunch') || name.includes('almuerzo') || mealId.includes('lunch')) return 'lunch';
  if (name.includes('jantar') || name.includes('dinner') || name.includes('cena') || mealId.includes('dinner')) return 'dinner';
  if (name.includes('café') || name.includes('cafe') || name.includes('breakfast') || name.includes('desayuno') || mealId.includes('breakfast')) return 'breakfast';
  if (name.includes('lanche') || name.includes('snack') || name.includes('merienda') || mealId.includes('snack')) return 'snack';

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
 * Normaliza o objetivo do usuário com suporte a múltiplos idiomas
 */
export function getGoalType(profile: UserProfile | null, lang: string = 'pt-BR'): {
  type: 'weight_loss' | 'muscle_gain' | 'wellness';
  label: string;
} {
  const rawGoals = (profile?.goals || '').toLowerCase();
  const targetWeight = profile?.targetWeight;
  const currentWeight = profile?.weight;

  const isEn = lang.startsWith('en');
  const isEs = lang.startsWith('es');

  if (
    rawGoals.includes('perda') ||
    rawGoals.includes('emagrec') ||
    rawGoals.includes('secar') ||
    rawGoals.includes('peso') ||
    rawGoals.includes('loss') ||
    rawGoals.includes('lose') ||
    rawGoals.includes('fat') ||
    rawGoals.includes('pérdida') ||
    rawGoals.includes('adelgazar') ||
    rawGoals.includes('deficit') ||
    (targetWeight && currentWeight && targetWeight < currentWeight)
  ) {
    const label = isEn ? 'weight loss' : isEs ? 'pérdida de peso' : 'perda de peso';
    return { type: 'weight_loss', label };
  }

  if (
    rawGoals.includes('ganho') ||
    rawGoals.includes('massa') ||
    rawGoals.includes('hipertrofia') ||
    rawGoals.includes('muscul') ||
    rawGoals.includes('muscle') ||
    rawGoals.includes('gain') ||
    rawGoals.includes('bulk') ||
    rawGoals.includes('ganancia') ||
    (targetWeight && currentWeight && targetWeight > currentWeight)
  ) {
    const label = isEn ? 'muscle gain' : isEs ? 'ganancia muscular' : 'ganho de massa';
    return { type: 'muscle_gain', label };
  }

  const label = isEn ? 'health and wellness' : isEs ? 'salud y bienestar' : 'saúde e longevidade';
  return { type: 'wellness', label };
}

/**
 * Gera dicas rápidas com base no histórico real do usuário no idioma selecionado
 */
export function generateHistoryQuickTips(profile: UserProfile | null, lang: string = 'pt-BR'): DashboardQuickTip[] {
  const tips: DashboardQuickTip[] = [];
  const goalInfo = getGoalType(profile, lang);
  const isWeightLoss = goalInfo.type === 'weight_loss';
  const isMuscleGain = goalInfo.type === 'muscle_gain';

  const isEn = lang.startsWith('en');
  const isEs = lang.startsWith('es');

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
        tag: isEn ? 'Dynamic Adaptation' : isEs ? 'Adaptación Dinámica' : 'Adaptação Dinâmica',
        title: isEn ? 'Lunch Logged • Light Dinner Suggested' : isEs ? 'Almuerzo Registrado • Cena Ligera Sugerida' : 'Almoço Registrado • Jantar Leve Sugerido',
        suggestion: isEn
          ? (mealName 
              ? `Since you logged lunch ("${mealName}"), your dinner can be lighter based on your weight loss goal.`
              : `Since you logged lunch, your dinner can be lighter based on your weight loss goal.`)
          : isEs
          ? (mealName
              ? `Como registraste el almuerzo ("${mealName}"), hoy tu cena puede ser más ligera según tu objetivo de pérdida de peso.`
              : `Como registraste el almuerzo, hoy tu cena puede ser más ligera según tu objetivo de pérdida de peso.`)
          : (mealName
              ? `Como você registrou o almoço ("${mealName}"), hoje seu jantar pode ser mais leve baseado no seu objetivo de perda de peso.`
              : `Como você registrou o almoço, hoje seu jantar pode ser mais leve baseado no seu objetivo de perda de peso.`),
        details: isEn
          ? (lunchCal > 0
              ? `Your lunch totaled approximately ${lunchCal} kcal. To keep your calorie deficit comfortable and efficient for fat burning, we suggest a dinner with lean protein (chicken, fish or eggs) and leafy steamed vegetables.`
              : `To keep your calorie deficit on target for weight loss, prioritize a dinner rich in fiber and lean protein, avoiding heavy carbs at night.`)
          : isEs
          ? (lunchCal > 0
              ? `Tu almuerzo sumó aproximadamente ${lunchCal} kcal. Para mantener el déficit calórico eficiente para quemar grasa, sugerimos una cena con proteínas magras y vegetales al vapor.`
              : `Para mantener el déficit calórico en tu objetivo de pérdida de peso, prioriza una cena rica en fibra y proteínas magras, evitando carbohidratos pesados de noche.`)
          : (lunchCal > 0
              ? `Seu almoço somou aproximadamente ${lunchCal} kcal. Para manter o déficit calórico confortável e eficiente para queima de gordura, sugerimos um jantar com proteínas magras (frango, peixe ou ovos) acompanhadas de vegetais folhosos e legumes no vapor.`
              : `Para manter o déficit calórico no alvo de perda de peso, priorize um jantar rico em fibras e proteínas magras, evitando excesso de carboidratos pesados à noite.`),
        actionLabel: isEn ? 'View Light Quick Dishes' : isEs ? 'Ver Platos Rápidos Ligeros' : 'Ver Pratos Rápidos Leves',
        actionTab: 'quickdishes',
        iconType: 'flame',
        badgeColor: 'bg-orange-500/10 text-orange-500 border-orange-500/30',
        isPrimary: true,
        contextData: {
          mealLogged: 'lunch',
          mealName: mealName || (isEn ? 'Healthy Lunch' : isEs ? 'Almuerzo Saludable' : 'Almoço Saudável'),
          calories: lunchCal,
          goalName: goalInfo.label
        }
      });
    } else if (isMuscleGain) {
      tips.push({
        id: 'lunch-to-dinner-muscle-gain',
        category: 'refeicao',
        tag: isEn ? 'Active Hypertrophy' : isEs ? 'Hipertrofia Activa' : 'Hipertrofia Ativa',
        title: isEn ? 'Lunch Logged • Anabolic Dinner' : isEs ? 'Almuerzo Registrado • Cena Anabólica' : 'Almoço Registrado • Jantar Anabólico',
        suggestion: isEn
          ? (mealName
              ? `Since you logged lunch ("${mealName}"), your dinner should prioritize high biological value protein and complex carbs based on your muscle gain goal.`
              : `Since you logged lunch, your dinner should prioritize protein and complex carbs based on your muscle gain goal.`)
          : isEs
          ? (mealName
              ? `Como registraste el almuerzo ("${mealName}"), tu cena debe priorizar proteínas de alto valor biológico y carbohidratos complejos según tu objetivo de ganancia muscular.`
              : `Como registraste el almuerzo, tu cena debe priorizar proteínas y carbohidratos complejos según tu objetivo de ganancia muscular.`)
          : (mealName
              ? `Como você registrou o almoço ("${mealName}"), seu jantar deve priorizar proteínas de alto valor biológico e carboidratos complexos baseado no seu objetivo de ganho de massa.`
              : `Como você registrou o almoço, seu jantar deve priorizar proteínas e carboidratos complexos baseado no seu objetivo de ganho de massa.`),
        details: isEn
          ? `Keep protein synthesis high through the night with chicken breast, eggs or lean beef along with sweet potato or brown rice.`
          : isEs
          ? `Mantén la síntesis proteica elevada durante la noche con pechuga de pollo, huevos o carne magra junto con batata o arroz integral.`
          : `Mantenha a síntese proteica elevada durante a noite com peito de frango, ovos ou carne magra junto com batata-doce, arroz integral ou mandioquinha.`,
        actionLabel: isEn ? 'View High-Protein Recipes' : isEs ? 'Ver Recetas Hipertróficas' : 'Ver Receitas Hipertróficas',
        actionTab: 'generator',
        iconType: 'flame',
        badgeColor: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30',
        isPrimary: true,
        contextData: {
          mealLogged: 'lunch',
          mealName: mealName || (isEn ? 'High-Protein Lunch' : isEs ? 'Almuerzo Proteico' : 'Almoço Anabólico'),
          calories: lunchCal,
          goalName: goalInfo.label
        }
      });
    } else {
      tips.push({
        id: 'lunch-to-dinner-wellness',
        category: 'refeicao',
        tag: isEn ? 'Daily Balance' : isEs ? 'Equilibrio Diario' : 'Equilíbrio Diário',
        title: isEn ? 'Lunch Logged • Digestive Dinner' : isEs ? 'Almuerzo Registrado • Cena Digestiva' : 'Almoço Registrado • Jantar Digestivo',
        suggestion: isEn
          ? `Since you logged lunch, your dinner can be balanced and easy to digest based on your goal of ${goalInfo.label}.`
          : isEs
          ? `Como registraste el almuerzo, hoy tu cena puede ser equilibrada y digestiva según tu meta de ${goalInfo.label}.`
          : `Como você registrou o almoço, hoje seu jantar pode ser equilibrado e de fácil digestão baseado no seu objetivo de ${goalInfo.label}.`,
        details: isEn
          ? `A light meal with functional soups, warm salad or herb omelette supports deep restorative sleep and cellular repair.`
          : isEs
          ? `Una comida ligera con sopas funcionales, ensalada templada o tortilla de hierbas asegura un sueño reparador y recuperación celular.`
          : `Uma refeição leve com sopas funcionais, salada morna ou omelete de ervas garante sono profundo e reparação celular noturna.`,
        actionLabel: isEn ? 'Dinner Ideas' : isEs ? 'Ideas para la Cena' : 'Ideias para o Jantar',
        actionTab: 'quickdishes',
        iconType: 'utensils',
        badgeColor: 'bg-teal-500/10 text-teal-500 border-teal-500/30',
        isPrimary: true,
        contextData: {
          mealLogged: 'lunch',
          mealName: mealName || (isEn ? 'Lunch' : isEs ? 'Almuerzo' : 'Almoço'),
          calories: lunchCal,
          goalName: goalInfo.label
        }
      });
    }
  } else if (!lunchLog && !dinnerLog) {
    // Almoço ainda não registrado hoje (Cenário do print do usuário)
    if (isWeightLoss) {
      tips.push({
        id: 'no-lunch-weight-loss',
        category: 'refeicao',
        tag: isEn ? 'Proactive Tip' : isEs ? 'Consejo Proactivo' : 'Dica Proativa',
        title: isEn ? 'Connect Your Plate History' : isEs ? 'Conecta tu Historial de Platos' : 'Conecte Seu Histórico de Pratos',
        suggestion: isEn
          ? 'Quick tip for your weight loss goal: when you log your lunch, your dinner can be automatically calibrated to be lighter or more filling.'
          : isEs
          ? 'Como consejo rápido para tu objetivo de pérdida de peso: al registrar tu almuerzo, tu cena podrá calibrarse automáticamente para ser más ligera o nutritiva.'
          : 'Como dica rápida para seu objetivo de perda de peso: ao registrar seu almoço, seu jantar poderá ser calibrado automaticamente para ser mais leve ou volumoso.',
        details: isEn
          ? 'Logging your lunch allows NutriAI to accurately calculate remaining macronutrients so you finish the day in the ideal calorie deficit without going hungry.'
          : isEs
          ? 'Registrar el almuerzo le permite a NutriAI calcular con precisión los macronutrientes restantes para terminar el día en el déficit calórico ideal sin pasar hambre.'
          : 'O registro do almoço permite ao NutriAI calcular com exatidão os macronutrientes restantes para você terminar o dia no déficit calórico ideal sem passar fome.',
        actionLabel: isEn ? 'Log Lunch Now' : isEs ? 'Registrar Almuerzo Ahora' : 'Registrar Almoço Agora',
        actionTab: 'quickdishes',
        iconType: 'utensils',
        badgeColor: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30',
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
        tag: isEn ? 'Proactive Tip' : isEs ? 'Consejo Proactivo' : 'Dica Proativa',
        title: isEn ? 'Connect Your Plate History' : isEs ? 'Conecta tu Historial de Platos' : 'Conecte Seu Histórico de Pratos',
        suggestion: isEn
          ? `Quick tip for your ${goalInfo.label} goal: when you log your lunch, your dinner can be automatically calibrated to be balanced and tailored.`
          : isEs
          ? `Como consejo rápido para tu objetivo de ${goalInfo.label}: al registrar tu almuerzo, tu cena podrá calibrarse automáticamente para ser equilibrada.`
          : `Como dica rápida para seu objetivo de ${goalInfo.label}: ao registrar seu almoço, seu jantar poderá ser calibrado automaticamente para ser mais leve e prático.`,
        details: isEn
          ? `Try logging your meal or choosing one of our 1-tap quick options to see the AI calculate your evening balance.`
          : isEs
          ? `Prueba registrar tu comida o elegir una de nuestras opciones rápidas en 1 toque para ver a la IA calcular el balance de tu noche.`
          : `Experimente registrar sua refeição ou escolher uma das nossas opções rápidas em 1 toque para ver a IA calcular o equilíbrio da sua noite.`,
        actionLabel: isEn ? 'Log Quick Lunch' : isEs ? 'Registrar Almuerzo Rápido' : 'Registrar Almoço Rápido',
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
  } else if (lunchLog && dinnerLog) {
    tips.push({
      id: 'day-meals-completed',
      category: 'refeicao',
      tag: isEn ? 'Daily Goal' : isEs ? 'Meta del Día' : 'Meta do Dia',
      title: isEn ? 'Lunch and Dinner Completed' : isEs ? 'Almuerzo y Cena Completados' : 'Almoço e Jantar Concluídos',
      suggestion: isEn
        ? `You already logged lunch and dinner today! Your calorie balance is aligned with your ${goalInfo.label} goal.`
        : isEs
        ? `¡Ya registraste el almuerzo y la cena hoy! Tu balance calórico está alineado con tu objetivo de ${goalInfo.label}.`
        : `Você já registrou almoço e jantar hoje! Seu equilíbrio calórico está alinhado ao seu objetivo de ${goalInfo.label}.`,
      details: isEn
        ? `If you feel like snacking later, choose a chamomile or lemon balm infusion with a few pumpkin seeds to promote satiety without burdening digestion.`
        : isEs
        ? `Si te da hambre más tarde, elige una infusión de manzanilla o toronjil con semillas de calabaza, promoviendo saciedad sin sobrecargar la digestión.`
        : `Caso bata vontade de petiscar mais tarde, opte por uma infusão de camomila ou melissa com algumas sementes de abóbora, promovendo saciedade sem sobrecarregar o fígado.`,
      actionLabel: isEn ? 'View Teas & Herbs' : isEs ? 'Ver Tés y Fitoterapia' : 'Ver Chás & Fitoterapia',
      actionTab: 'herbs',
      iconType: 'sparkles',
      badgeColor: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
      isPrimary: true,
      contextData: {
        mealLogged: 'dinner',
        mealName: dinnerLog.recipeName || (isEn ? 'Dinner' : isEs ? 'Cena' : 'Jantar'),
        calories: (lunchLog.actual?.calories || 0) + (dinnerLog.actual?.calories || 0),
        goalName: goalInfo.label
      }
    });
  } else if (breakfastLog && !lunchLog) {
    tips.push({
      id: 'breakfast-to-lunch',
      category: 'refeicao',
      tag: isEn ? 'Next Step' : isEs ? 'Próximo Paso' : 'Próximo Passo',
      title: isEn ? 'Breakfast Logged • Plan Your Lunch' : isEs ? 'Desayuno Registrado • Prepara el Almuerzo' : 'Café da Manhã Registrado • Prepare o Almoço',
      suggestion: isEn
        ? `Since you already logged breakfast, build your lunch with 50% fresh vegetables based on your ${goalInfo.label} goal.`
        : isEs
        ? `Como ya registraste el desayuno, arma tu almuerzo con 50% de vegetales frescos según tu meta de ${goalInfo.label}.`
        : `Como você já registrou o café da manhã, monte seu almoço com 50% de vegetais frescos baseado no seu objetivo de ${goalInfo.label}.`,
      details: isEn
        ? `Including fiber and protein in the early afternoon reduces glucose spikes, prevents post-meal fatigue, and makes dinner lighter.`
        : isEs
        ? `Incluir fibra y proteínas a primera hora de la tarde reduce picos de glucosa, evita la somnolencia y facilita una cena más ligera después.`
        : `Incluir fibras e proteínas logo no início da tarde reduz picos glicêmicos, evita a sonolência pós-prandial e facilita um jantar mais leve mais tarde.`,
      actionLabel: isEn ? 'Suggest Healthy Lunch' : isEs ? 'Sugerir Almuerzo Saludable' : 'Sugerir Almoço Saudável',
      actionTab: 'quickdishes',
      iconType: 'utensils',
      badgeColor: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30',
      isPrimary: true,
      contextData: {
        mealLogged: 'breakfast',
        mealName: breakfastLog.recipeName || (isEn ? 'Breakfast' : isEs ? 'Desayuno' : 'Café da Manhã'),
        calories: breakfastLog.actual?.calories || 0,
        goalName: goalInfo.label
      }
    });
  }

  // -------------------------------------------------------------
  // DICA 2: Balanço de Calorias e Déficit
  // -------------------------------------------------------------
  if (totalCaloriesToday > 0) {
    tips.push({
      id: 'calories-balance-today',
      category: 'calorias',
      tag: isEn ? 'Calorie Balance' : isEs ? 'Saldo Calórico' : 'Saldo Calórico',
      title: isEn ? 'Nutritional Balance Today' : isEs ? 'Balance Nutricional de Hoy' : 'Balanço Nutricional Hoje',
      suggestion: isEn
        ? (remainingCalories > 0
            ? `You consumed ${totalCaloriesToday} kcal today and still have ~${remainingCalories} kcal to distribute between dinner and evening snack.`
            : `You reached your daily calorie goal today (${totalCaloriesToday} kcal). Keep dinner based on leafy greens and infused water.`)
        : isEs
        ? (remainingCalories > 0
            ? `Consumiste ${totalCaloriesToday} kcal hoy y todavía tienes ~${remainingCalories} kcal para distribuir entre la cena y la merienda.`
            : `Alcanzaste tu meta calórica de hoy (${totalCaloriesToday} kcal). Mantén tu cena a base de vegetales y agua saborizada.`)
        : (remainingCalories > 0
            ? `Você consumiu ${totalCaloriesToday} kcal hoje e ainda possui ~${remainingCalories} kcal para distribuir entre o jantar e ceia sem sair do objetivo.`
            : `Você atingiu sua meta calórica de hoje (${totalCaloriesToday} kcal). Mantenha seu jantar à base de folhas e água saborizada para manter a queima ativa.`),
      details: isEn
        ? (isWeightLoss
            ? `Distributing calories prioritizing lunch while keeping dinner light is scientifically proven to accelerate healthy weight loss.`
            : `Reaching your daily macros ensures muscular consistency and steady energy.`)
        : isEs
        ? (isWeightLoss
            ? `Distribuir calorías priorizando el almuerzo y manteniendo la noche ligera acelera la pérdida de peso saludable.`
            : `Alcanzar tus macros diarios asegura consistencia muscular y energía constante.`)
        : (isWeightLoss
            ? `Distribuir calorias dando prioridade para o almoço e mantendo a noite leve é comprovado cientificamente para acelerar o emagrecimento saudável.`
            : `Atingir seus macros diários garante consistência muscular e energia constante.`),
      actionLabel: isEn ? 'View Plan Details' : isEs ? 'Ver Detalles del Plan' : 'Ver Detalhes do Plano',
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
    tag: isEn ? 'Optimal Digestion' : isEs ? 'Digestión Perfecta' : 'Digestão Perfeita',
    title: isEn ? 'Pre-Dinner Hydration' : isEs ? 'Hidratación Pre-Cena' : 'Hidratação Pré-Jantar',
    suggestion: isEn
      ? (waterCurrent < waterTarget * 0.6
          ? `Your hydration is at ${waterCurrent}ml of ${waterTarget}ml. Drink 2 glasses of water 30 minutes before dinner to improve satiety.`
          : `Great water intake pace today (${waterCurrent}ml)! Avoid drinking large volumes during dinner chewing to keep gastric juices concentrated.`)
      : isEs
      ? (waterCurrent < waterTarget * 0.6
          ? `Tu hidratación está en ${waterCurrent}ml de ${waterTarget}ml. Toma 2 vasos de agua 30 minutos antes de cenar para mejorar la saciedad.`
          : `¡Excelente ritmo de agua hoy (${waterCurrent}ml)! Evita beber grandes volúmenes durante la cena para no diluir los jugos gástricos.`)
      : (waterCurrent < waterTarget * 0.6
          ? `Sua hidratação está em ${waterCurrent}ml de ${waterTarget}ml. Tome 2 copos de água até 30 minutos antes do jantar para melhorar a saciedade.`
          : `Excelente ritmo de água hoje (${waterCurrent}ml)! Evite ingerir grandes volumes de líquidos durante a mastigação do jantar para não diluir os sucos gástricos.`),
    details: isEn
      ? `Drinking warm or room-temperature water half an hour before meals primes stomach enzymes and curbs late-night cravings.`
      : isEs
      ? `Beber agua tibia o a temperatura ambiente media hora antes de comer prepara las enzimas estomacales y reduce la compulsión nocturna.`
      : `Beber água morna ou em temperatura ambiente meia hora antes da refeição prepara as enzimas estomacais e reduz a compulsão alimentar noturna.`,
    actionLabel: isEn ? 'Track Water' : isEs ? 'Seguir Agua' : 'Acompanhar Água',
    actionTab: 'habits',
    iconType: 'droplet',
    badgeColor: 'bg-blue-500/10 text-blue-500 border-blue-500/30'
  });

  return tips;
}
