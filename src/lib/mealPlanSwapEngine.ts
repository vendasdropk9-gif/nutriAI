import { MealPlan, Recipe, UserProfile } from '../types';

export interface MealPlanSwapSuggestion {
  id: string;
  day: string;
  mealType: 'breakfast' | 'lunch' | 'snack' | 'dinner' | string;
  mealLabel: string;
  originalFood: string;
  substituteFood: string;
  caloriesOriginal: number;
  caloriesSubstitute: number;
  calorieSavings: number;
  reason: string;
  benefits: string[];
  culinaryTip: string;
  assistantMessage: string;
  applied?: boolean;
}

export interface DayCalorieAnalysis {
  day: string;
  totalCalories: number;
  calorieLimit: number;
  difference: number; // positive = over limit, negative = under limit
  percentageOfLimit: number;
  isOverLimit: boolean;
  isNearLimit: boolean;
  status: 'over' | 'near' | 'balanced' | 'empty';
  mealBreakdown: {
    mealType: 'breakfast' | 'lunch' | 'snack' | 'dinner' | string;
    label: string;
    recipeName?: string;
    calories: number;
    percentageOfDay: number;
  }[];
  suggestions: MealPlanSwapSuggestion[];
}

/**
 * Curated catalog of high-impact healthy micro-swaps formulated for Brazilian & global dietary habits.
 * Small effortless swaps that drop caloric density while preserving satiety and macro balance.
 */
export const CURATED_MICRO_SWAPS: {
  keywords: string[];
  mealTypes: string[];
  original: string;
  substitute: string;
  origCal: number;
  subCal: number;
  reason: string;
  benefits: string[];
  culinaryTip: string;
  voiceMessage: string;
}[] = [
  {
    keywords: ['arroz branco', 'arroz', 'polenta', 'mandioca frita'],
    mealTypes: ['lunch', 'dinner'],
    original: 'Arroz Branco Refogado (150g)',
    substitute: 'Arroz de Couve-Flor ou 50% Integral com Lentilha (150g)',
    origCal: 195,
    subCal: 45,
    reason: 'O arroz refinado concentra alta carga glicêmica e calorias rápidas sem elevar a saciedade por muito tempo.',
    benefits: ['Economiza 150 kcal na refeição', 'Adiciona 3.5g de fibras vegetais', 'Evita picos de insulina pós-prandial'],
    culinaryTip: 'Refogue o arroz de couve-flor com bastante alho dourado, azeite extravirgem em spray e cúrcuma para sabor reconfortante.',
    voiceMessage: 'Uma excelente pequena troca é substituir o arroz branco por arroz de couve-flor refogado com alho ou uma mistura de grãos integrais. Você economiza 150 calorias e ganha saciedade prolongada!'
  },
  {
    keywords: ['maionese', 'molho branco', 'creme de leite', 'molho tártaro', 'molho 4 queijos'],
    mealTypes: ['lunch', 'dinner', 'snack'],
    original: 'Molho Cremoso Tradicional / Maionese (2 colheres)',
    substitute: 'Molho de Iogurte Grego Natural com Ervas e Limão',
    origCal: 180,
    subCal: 42,
    reason: 'Molhos cremosos à base de óleos vegetais ou gordura animal são as maiores fontes ocultas de calorias em pratos saudáveis.',
    benefits: ['Corta 138 kcal de gorduras saturadas', 'Adiciona 4g de proteína limpa', 'Probióticos benéficos para a microbiota'],
    culinaryTip: 'Misture 2 colheres de iogurte natural desnatado ou grego sem açúcar com limão espremido, orégano, salsinha e pitada de sal marinho.',
    voiceMessage: 'Molhos pesados acumulam calorias silenciosas. Trocando por um molho de iogurte grego temperado com ervas e limão, você corta mais de 130 calorias sem abrir mão do sabor cremoso!'
  },
  {
    keywords: ['pão francês', 'pão branco', 'torrada comum', 'croissant'],
    mealTypes: ['breakfast', 'snack'],
    original: 'Pão Francês Tradicional (50g)',
    substitute: 'Pão 100% Grãos Integrais ou Tapioca Fina com Chia',
    origCal: 150,
    subCal: 75,
    reason: 'A farinha de trigo refinada é digerida rapidamente, gerando fome logo após o café da manhã.',
    benefits: ['Reduz 75 kcal de carboidratos simples', 'Fibras insolúveis de digestão lenta', 'Maior estabilidade de glicemia'],
    culinaryTip: 'Aqueça na frigideira com uma camada fininha de ricota temperada ou cottage para uma crocância perfeita.',
    voiceMessage: 'No café da manhã, troque o pão francês por pão 100% integral ou adicione sementes de chia à sua massa. Você economiza 75 calorias e mantém a saciedade até o almoço!'
  },
  {
    keywords: ['carne moída', 'picanha', 'costela', 'hambúrguer', 'linguiça'],
    mealTypes: ['lunch', 'dinner'],
    original: 'Corte de Carne Vermelha com Gordura (150g)',
    substitute: 'Patinho Moído Magro ou Filé de Frango Grelhado com Páprica (150g)',
    origCal: 360,
    subCal: 195,
    reason: 'Carnes gordurosas concentram calorias em gorduras saturadas sem acrescentar mais proteína utilizável.',
    benefits: ['Redução direta de 165 kcal', 'Mesmo teor de ferro e zinco', 'Digestão muito mais leve'],
    culinaryTip: 'Tempere o patinho moído com alho-poró picado, páprica defumada e chimichurri para um sabor gourmet irresistível.',
    voiceMessage: 'Optar por patinho moído bem magro ou peito de frango temperado no lugar de carnes com gordura visível poupa 165 calorias de uma só vez, preservando toda a proteína que seus músculos precisam.'
  },
  {
    keywords: ['queijo prato', 'cheddar', 'mussarela', 'provolone'],
    mealTypes: ['breakfast', 'snack', 'dinner'],
    original: 'Queijo Amarelo Curado (40g)',
    substitute: 'Queijo Minas Frescal Light ou Creme de Ricota Fresca (40g)',
    origCal: 145,
    subCal: 60,
    reason: 'Queijos amarelos têm concentração elevada de gordura láctea e sódio.',
    benefits: ['Economiza 85 kcal', '70% menos gorduras saturadas', 'Sabor fresco e textura cremosa'],
    culinaryTip: 'Use o creme de ricota temperado com azeite extravirgem e manjericão fresco picado.',
    voiceMessage: 'Trocando o queijo amarelo por minas frescal ou ricota temperada, você economiza cerca de 85 calorias por porção e diminui a retenção de líquidos.'
  },
  {
    keywords: ['fritura', 'frito', 'batata frita', 'óleo', 'empanado'],
    mealTypes: ['lunch', 'dinner'],
    original: 'Preparo Frito em Óleo de Soja (1 porção)',
    substitute: 'Preparo na Airfryer ou Forno com Fio de Azeite em Spray',
    origCal: 220,
    subCal: 85,
    reason: 'O óleo de imersão é totalmente absorvido pelo alimento, multiplicando a densidade calórica sem valor biológico.',
    benefits: ['Economia de 135 kcal', 'Redução drástica de compostos inflamatórios', 'Crocância limpa e natural'],
    culinaryTip: 'Pincele um toque de azeite extravirgem e empane levemente com farinha de amêndoas ou farelo de aveia temperado antes de assar.',
    voiceMessage: 'Fazer o mesmo prato na airfryer com spray de azeite em vez de fritar no óleo retira mais de 130 calorias instantaneamente, deixando a casquinha crocante e sequinha.'
  },
  {
    keywords: ['suco de laranja', 'refrigerante', 'suco', 'achocolatado'],
    mealTypes: ['breakfast', 'lunch', 'snack', 'dinner'],
    original: 'Bebida Açucarada ou Suco Coado (copo 300ml)',
    substitute: 'Água Aromatizada com Limão Siciliano, Hortelã e Gengibre',
    origCal: 140,
    subCal: 8,
    reason: 'Calorias líquidas não ativam os centros cerebrais de saciedade e elevam a ingestão calórica total do dia.',
    benefits: ['Economia impressionante de 132 kcal', 'Zero açúcar livre adicionado', 'Ação diurética e hidratante'],
    culinaryTip: 'Deixe uma jarra na geladeira com rodelas de limão, folhas frescas de hortelã e pedras de gelo.',
    voiceMessage: 'Calorias líquidas de sucos e refrigerantes entram sem saciedade. Uma água aromatizada bem gelada com limão e hortelã corta 130 calorias e hidrata o corpo de verdade.'
  },
  {
    keywords: ['doce', 'sobremesa', 'chocolate ao leite', 'bolo'],
    mealTypes: ['snack', 'dinner', 'lunch'],
    original: 'Sobremesa Tradicional Açucarada (1 unidade)',
    substitute: 'Morangos Frescos com Canela e 1 Quadrado de Cacau 70%',
    origCal: 260,
    subCal: 75,
    reason: 'Doces convencionais combinam açúcar refinado e gordura hidrogenada, sabotando o controle calórico.',
    benefits: ['Economiza 185 kcal', 'Rico em antioxidantes polifenóis', 'Mata a vontade de doce sem rebote de fome'],
    culinaryTip: 'Aqueça os morangos por 20 segundos no micro-ondas para soltar uma calda natural e polvilhe canela em pó.',
    voiceMessage: 'Ao invés de sobremesas pesadas, uma taça de morangos com canela e um quadradinho de chocolate amargo 70% acalma a vontade de doce economizando quase 200 calorias!'
  }
];

const MEAL_LABELS: Record<string, string> = {
  breakfast: 'Café da Manhã',
  lunch: 'Almoço',
  snack: 'Lanche',
  dinner: 'Jantar'
};

/**
 * Analyzes a day's mealPlan against a given calorie limit and generates tailored micro-swaps.
 */
export function analyzeDayMealPlan(
  dayName: string,
  mealPlanDay: any,
  calorieLimit: number,
  profile?: UserProfile | null
): DayCalorieAnalysis {
  const meals = mealPlanDay?.meals || {};
  const mealKeys: ('breakfast' | 'lunch' | 'snack' | 'dinner')[] = ['breakfast', 'lunch', 'snack', 'dinner'];

  let totalCalories = 0;
  const mealBreakdown: DayCalorieAnalysis['mealBreakdown'] = [];

  mealKeys.forEach((key) => {
    const meal = meals[key];
    const cals = meal?.nutrition?.calories || meal?.calories || 0;
    totalCalories += cals;
    mealBreakdown.push({
      mealType: key,
      label: MEAL_LABELS[key] || key,
      recipeName: meal?.name || meal?.title || undefined,
      calories: cals,
      percentageOfDay: 0
    });
  });

  // Calculate percentage of day
  mealBreakdown.forEach((item) => {
    item.percentageOfDay = totalCalories > 0 ? Math.round((item.calories / totalCalories) * 100) : 0;
  });

  const difference = totalCalories - calorieLimit;
  const percentageOfLimit = calorieLimit > 0 ? Math.round((totalCalories / calorieLimit) * 100) : 0;
  const isOverLimit = totalCalories >= calorieLimit && totalCalories > 0;
  const isNearLimit = totalCalories >= calorieLimit * 0.9 && !isOverLimit && totalCalories > 0;

  let status: DayCalorieAnalysis['status'] = 'balanced';
  if (totalCalories === 0) status = 'empty';
  else if (isOverLimit) status = 'over';
  else if (isNearLimit) status = 'near';
  else status = 'balanced';

  // Generate intelligent suggestions
  const suggestions: MealPlanSwapSuggestion[] = [];

  mealKeys.forEach((key) => {
    const meal = meals[key];
    if (!meal) return;

    const dishName = (meal.name || meal.title || '').toLowerCase();
    const ingredients = Array.isArray(meal.ingredients) ? meal.ingredients.join(' ').toLowerCase() : '';
    const searchableText = `${dishName} ${ingredients}`;
    const mealCalories = meal.nutrition?.calories || meal.calories || 0;

    // Check against curated micro-swaps
    for (const swap of CURATED_MICRO_SWAPS) {
      const matchKeyword = swap.keywords.some((kw) => searchableText.includes(kw));
      const matchMealType = swap.mealTypes.includes(key);

      if (matchKeyword || (mealCalories > 550 && matchMealType && suggestions.length < 3)) {
        // Avoid duplicate suggestions for the same swap original
        const alreadySuggested = suggestions.some((s) => s.originalFood === swap.original);
        if (!alreadySuggested) {
          suggestions.push({
            id: `swap-${dayName}-${key}-${suggestions.length + 1}`,
            day: dayName,
            mealType: key,
            mealLabel: MEAL_LABELS[key] || key,
            originalFood: swap.original,
            substituteFood: swap.substitute,
            caloriesOriginal: swap.origCal,
            caloriesSubstitute: swap.subCal,
            calorieSavings: swap.origCal - swap.subCal,
            reason: swap.reason,
            benefits: swap.benefits,
            culinaryTip: swap.culinaryTip,
            assistantMessage: swap.voiceMessage,
            applied: false
          });
        }
      }
    }
  });

  // If no specific keyword matched but day is over limit, offer top high-impact fallback micro-swaps
  if (suggestions.length === 0 && (isOverLimit || isNearLimit || totalCalories > 1600)) {
    const primaryFallback = CURATED_MICRO_SWAPS[0];
    const secondaryFallback = CURATED_MICRO_SWAPS[1];

    suggestions.push({
      id: `swap-${dayName}-lunch-auto-1`,
      day: dayName,
      mealType: 'lunch',
      mealLabel: 'Almoço',
      originalFood: primaryFallback.original,
      substituteFood: primaryFallback.substitute,
      caloriesOriginal: primaryFallback.origCal,
      caloriesSubstitute: primaryFallback.subCal,
      calorieSavings: primaryFallback.origCal - primaryFallback.subCal,
      reason: primaryFallback.reason,
      benefits: primaryFallback.benefits,
      culinaryTip: primaryFallback.culinaryTip,
      assistantMessage: primaryFallback.voiceMessage,
      applied: false
    });

    suggestions.push({
      id: `swap-${dayName}-dinner-auto-2`,
      day: dayName,
      mealType: 'dinner',
      mealLabel: 'Jantar',
      originalFood: secondaryFallback.original,
      substituteFood: secondaryFallback.substitute,
      caloriesOriginal: secondaryFallback.origCal,
      caloriesSubstitute: secondaryFallback.subCal,
      calorieSavings: secondaryFallback.origCal - secondaryFallback.subCal,
      reason: secondaryFallback.reason,
      benefits: secondaryFallback.benefits,
      culinaryTip: secondaryFallback.culinaryTip,
      assistantMessage: secondaryFallback.voiceMessage,
      applied: false
    });
  }

  return {
    day: dayName,
    totalCalories,
    calorieLimit,
    difference,
    percentageOfLimit,
    isOverLimit,
    isNearLimit,
    status,
    mealBreakdown,
    suggestions
  };
}

/**
 * Creates a sample calorie-heavy meal plan day for immediate demonstration and testing if the user has no plan yet.
 */
export function createDemonstrationMealPlan(): MealPlan {
  return {
    'Segunda-feira': {
      date: 'Segunda-feira',
      meals: {
        breakfast: {
          id: 'demo-bf',
          name: 'Pão Francês com Queijo Prato e Café com Leite Açucarado',
          description: 'Café da manhã tradicional com pão branco e queijo amarelo.',
          prepTime: '10 min',
          ingredients: ['Pão Francês', 'Queijo Prato', 'Manteiga', 'Café', 'Açúcar refinado'],
          instructions: ['Tostar o pão francês', 'Adicionar queijo prato derretido', 'Adoçar café com leite'],
          nutrition: {
            calories: 520,
            protein: 16,
            carbs: 62,
            fat: 22,
            fiber: 2,
            sugar: 24
          }
        },
        lunch: {
          id: 'demo-lunch',
          name: 'Prato Feito: Picanha Fatiada com Arroz Branco e Batata Frita',
          description: 'Corte bovino com gordura, arroz branco refogado e batatas fritas em óleo.',
          prepTime: '30 min',
          ingredients: ['Picanha bovina fatiada', 'Arroz Branco', 'Batata frita em óleo', 'Feijão preto'],
          instructions: ['Grelhar a picanha com a capa de gordura', 'Fritar batatas em óleo de soja', 'Servir com arroz e feijão'],
          nutrition: {
            calories: 940,
            protein: 48,
            carbs: 88,
            fat: 42,
            fiber: 6,
            sugar: 4
          }
        },
        snack: {
          id: 'demo-snack',
          name: 'Biscoito Recheado com Suco de Laranja Industrializado',
          description: 'Lanche rápido da tarde com alto teor calórico.',
          prepTime: '5 min',
          ingredients: ['Biscoito recheado de chocolate', 'Suco de laranja de caixinha'],
          instructions: ['Consumir no lanche da tarde'],
          nutrition: {
            calories: 390,
            protein: 4,
            carbs: 68,
            fat: 12,
            fiber: 1,
            sugar: 44
          }
        },
        dinner: {
          id: 'demo-dinner',
          name: 'Massa ao Molho 4 Queijos Cremoso com Linguiça',
          description: 'Macarrão tradicional com molho branco pesado e embutidos.',
          prepTime: '25 min',
          ingredients: ['Macarrão espaguete', 'Molho branco 4 queijos', 'Linguiça toscana fatiada'],
          instructions: ['Cozinhar a massa', 'Refogar a linguiça', 'Misturar com o molho 4 queijos'],
          nutrition: {
            calories: 820,
            protein: 32,
            carbs: 84,
            fat: 38,
            fiber: 3,
            sugar: 6
          }
        }
      }
    }
  };
}
