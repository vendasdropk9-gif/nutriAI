import { FoodNutrientProfile, FoodNutritionComparison } from '../types';

export interface FoodComparisonPreset {
  id: string;
  title: string;
  foodA: string;
  foodB: string;
  category: 'breakfast' | 'meals' | 'snacks' | 'drinks' | 'desserts';
  highlight: string;
}

export const COMMON_FOOD_DATABASE: Record<string, FoodNutrientProfile> = {
  // Pães e Cereais
  'pao frances': {
    name: 'Pão Francês Tradicional',
    portion: '1 unidade (50g)',
    calories: 150,
    protein: 4.0,
    carbs: 28.5,
    fat: 1.5,
    fiber: 1.2,
    sugar: 0.8,
    sodium: 320
  },
  'pao integral': {
    name: 'Pão 100% Integral',
    portion: '2 fatias (50g)',
    calories: 110,
    protein: 6.2,
    carbs: 18.0,
    fat: 1.8,
    fiber: 4.8,
    sugar: 1.2,
    sodium: 190
  },
  'arroz branco': {
    name: 'Arroz Branco Cozido',
    portion: '1 escumadeira (100g)',
    calories: 128,
    protein: 2.5,
    carbs: 28.1,
    fat: 0.2,
    fiber: 1.6,
    sugar: 0.1,
    sodium: 2
  },
  'arroz integral': {
    name: 'Arroz Integral Cozido',
    portion: '1 escumadeira (100g)',
    calories: 112,
    protein: 2.6,
    carbs: 23.5,
    fat: 0.9,
    fiber: 2.8,
    sugar: 0.2,
    sodium: 2
  },
  'quinoa': {
    name: 'Quinoa Cozida em Grãos',
    portion: '1 escumadeira (100g)',
    calories: 120,
    protein: 4.4,
    carbs: 21.3,
    fat: 1.9,
    fiber: 3.2,
    sugar: 0.9,
    sodium: 7
  },
  'tapioca': {
    name: 'Tapioca Simples (Goma)',
    portion: '1 unidade média (60g)',
    calories: 142,
    protein: 0.2,
    carbs: 35.0,
    fat: 0.1,
    fiber: 0.3,
    sugar: 0.1,
    sodium: 2
  },
  'aveia': {
    name: 'Farelo / Flocos de Aveia',
    portion: '2 colheres de sopa (30g)',
    calories: 104,
    protein: 4.3,
    carbs: 17.0,
    fat: 2.2,
    fiber: 3.0,
    sugar: 0.4,
    sodium: 2
  },

  // Batatas e Tubérculos
  'batata frita': {
    name: 'Batata Frita Tradicional (Óleo)',
    portion: '1 porção média (100g)',
    calories: 312,
    protein: 3.4,
    carbs: 41.0,
    fat: 15.0,
    fiber: 3.8,
    sugar: 0.3,
    sodium: 260
  },
  'batata doce airfryer': {
    name: 'Batata Doce na Airfryer com Azeite',
    portion: '1 porção média (100g)',
    calories: 122,
    protein: 1.8,
    carbs: 26.0,
    fat: 1.4,
    fiber: 3.4,
    sugar: 4.5,
    sodium: 45
  },

  // Bebidas
  'refrigerante': {
    name: 'Refrigerante Tradicional de Cola',
    portion: '1 lata (350ml)',
    calories: 149,
    protein: 0.0,
    carbs: 37.0,
    fat: 0.0,
    fiber: 0.0,
    sugar: 37.0,
    sodium: 15
  },
  'agua com gas limao': {
    name: 'Água com Gás, Limão e Hortelã',
    portion: '1 copo (350ml)',
    calories: 4,
    protein: 0.1,
    carbs: 0.8,
    fat: 0.0,
    fiber: 0.2,
    sugar: 0.3,
    sodium: 5
  },
  'suco laranja': {
    name: 'Suco de Laranja Integral Natural',
    portion: '1 copo (250ml)',
    calories: 112,
    protein: 1.7,
    carbs: 25.8,
    fat: 0.5,
    fiber: 0.8,
    sugar: 20.8,
    sodium: 2
  },

  // Doces & Chocolates
  'chocolate ao leite': {
    name: 'Chocolate ao Leite Tradicional',
    portion: '4 quadradinhos (40g)',
    calories: 218,
    protein: 2.8,
    carbs: 23.6,
    fat: 12.4,
    fiber: 1.4,
    sugar: 20.5,
    sodium: 35
  },
  'chocolate 70': {
    name: 'Chocolate Amargo 70%+ Cacau',
    portion: '3 quadradinhos (30g)',
    calories: 165,
    protein: 2.4,
    carbs: 11.2,
    fat: 12.6,
    fiber: 3.8,
    sugar: 6.8,
    sodium: 6
  },

  // Massas e Pratos
  'macarrao tradicional': {
    name: 'Macarrão Tradicional Cozido',
    portion: '1 prato raso (140g)',
    calories: 220,
    protein: 7.2,
    carbs: 43.5,
    fat: 1.3,
    fiber: 1.8,
    sugar: 0.8,
    sodium: 5
  },
  'espaguete abobrinha': {
    name: 'Espaguete de Abobrinha Salteada',
    portion: '1 prato raso (150g)',
    calories: 38,
    protein: 2.1,
    carbs: 6.2,
    fat: 0.8,
    fiber: 2.4,
    sugar: 3.5,
    sodium: 12
  },
  'hamburguer fast food': {
    name: 'Hambúrguer com Queijo (Fast Food)',
    portion: '1 sanduíche (150g)',
    calories: 420,
    protein: 19.5,
    carbs: 38.0,
    fat: 21.0,
    fiber: 2.0,
    sugar: 7.5,
    sodium: 890
  },
  'sanduiche natural frango': {
    name: 'Sanduíche Integral com Frango Desfiado',
    portion: '1 sanduíche (160g)',
    calories: 235,
    protein: 24.0,
    carbs: 22.0,
    fat: 5.5,
    fiber: 4.5,
    sugar: 2.8,
    sodium: 340
  },

  // Laticínios
  'leite integral': {
    name: 'Leite Integral Pasteurizado',
    portion: '1 copo (200ml)',
    calories: 124,
    protein: 6.4,
    carbs: 9.6,
    fat: 6.6,
    fiber: 0.0,
    sugar: 9.6,
    sodium: 104
  },
  'leite amendoas': {
    name: 'Bebida Vegetal de Amêndoas s/ Açúcar',
    portion: '1 copo (200ml)',
    calories: 32,
    protein: 1.2,
    carbs: 0.6,
    fat: 2.6,
    fiber: 0.8,
    sugar: 0.0,
    sodium: 78
  },

  // Açúcares e Adoçantes
  'acucar refinado': {
    name: 'Açúcar Branco Refinado',
    portion: '1 colher de sopa (15g)',
    calories: 60,
    protein: 0.0,
    carbs: 15.0,
    fat: 0.0,
    fiber: 0.0,
    sugar: 15.0,
    sodium: 0
  },
  'mel puro': {
    name: 'Mel Puro de Abelhas',
    portion: '1 colher de sopa (15g)',
    calories: 46,
    protein: 0.1,
    carbs: 12.3,
    fat: 0.0,
    fiber: 0.1,
    sugar: 12.0,
    sodium: 1
  }
};

export const COMPARISON_PRESETS: FoodComparisonPreset[] = [
  {
    id: 'bread',
    title: 'Pão Francês vs Pão 100% Integral',
    foodA: 'Pão Francês Tradicional',
    foodB: 'Pão 100% Integral',
    category: 'breakfast',
    highlight: '+400% de fibras e 40 kcal a menos'
  },
  {
    id: 'rice-quinoa',
    title: 'Arroz Branco vs Quinoa em Grãos',
    foodA: 'Arroz Branco Cozido',
    foodB: 'Quinoa Cozida em Grãos',
    category: 'meals',
    highlight: '+76% de proteínas e menor pico glicêmico'
  },
  {
    id: 'fries',
    title: 'Batata Frita vs Batata Doce na Airfryer',
    foodA: 'Batata Frita Tradicional (Óleo)',
    foodB: 'Batata Doce na Airfryer com Azeite',
    category: 'snacks',
    highlight: '-61% de calorias e -90% de gorduras'
  },
  {
    id: 'soda',
    title: 'Refrigerante vs Água com Gás e Limão',
    foodA: 'Refrigerante Tradicional de Cola',
    foodB: 'Água com Gás, Limão e Hortelã',
    category: 'drinks',
    highlight: '-37g de açúcar e -145 calorias vazias'
  },
  {
    id: 'chocolate',
    title: 'Chocolate ao Leite vs Chocolate 70% Cacau',
    foodA: 'Chocolate ao Leite Tradicional',
    foodB: 'Chocolate Amargo 70%+ Cacau',
    category: 'desserts',
    highlight: '-67% de açúcar e o triplo de flavonoides'
  },
  {
    id: 'pasta-zucchini',
    title: 'Macarrão Tradicional vs Espaguete de Abobrinha',
    foodA: 'Macarrão Tradicional Cozido',
    foodB: 'Espaguete de Abobrinha Salteada',
    category: 'meals',
    highlight: '-82% de calorias e digestão ultraleve'
  },
  {
    id: 'burger',
    title: 'Fast Food vs Sanduíche Natural de Frango',
    foodA: 'Hambúrguer com Queijo (Fast Food)',
    foodB: 'Sanduíche Integral com Frango Desfiado',
    category: 'meals',
    highlight: '-185 kcal e quase o dobro de saciedade protéica'
  }
];

export function findLocalFoodProfile(name: string): FoodNutrientProfile | null {
  if (!name) return null;
  const clean = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

  for (const [key, profile] of Object.entries(COMMON_FOOD_DATABASE)) {
    const cleanKey = key.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (clean.includes(cleanKey) || cleanKey.includes(clean)) {
      return { ...profile };
    }
  }

  // Generic keyword matchers
  if (clean.includes('pao') || clean.includes('torrada')) {
    if (clean.includes('integral') || clean.includes('aveia')) {
      return { ...COMMON_FOOD_DATABASE['pao integral'], name: name.trim() };
    }
    return { ...COMMON_FOOD_DATABASE['pao frances'], name: name.trim() };
  }

  if (clean.includes('arroz')) {
    if (clean.includes('integral')) {
      return { ...COMMON_FOOD_DATABASE['arroz integral'], name: name.trim() };
    }
    return { ...COMMON_FOOD_DATABASE['arroz branco'], name: name.trim() };
  }

  if (clean.includes('batata') || clean.includes('frita')) {
    if (clean.includes('doce') || clean.includes('airfryer') || clean.includes('assad')) {
      return { ...COMMON_FOOD_DATABASE['batata doce airfryer'], name: name.trim() };
    }
    return { ...COMMON_FOOD_DATABASE['batata frita'], name: name.trim() };
  }

  if (clean.includes('refrigerante') || clean.includes('coca') || clean.includes('guarana') || clean.includes('suco de caixinha')) {
    return { ...COMMON_FOOD_DATABASE['refrigerante'], name: name.trim() };
  }

  if (clean.includes('choc') || clean.includes('doce') || clean.includes('sobremesa')) {
    if (clean.includes('70') || clean.includes('amargo') || clean.includes('cacau')) {
      return { ...COMMON_FOOD_DATABASE['chocolate 70'], name: name.trim() };
    }
    return { ...COMMON_FOOD_DATABASE['chocolate ao leite'], name: name.trim() };
  }

  return null;
}

export function generateFallbackComparison(foodAName: string, foodBName: string): FoodNutritionComparison {
  const profileA = findLocalFoodProfile(foodAName) || {
    name: foodAName.trim() || 'Alimento A',
    portion: '1 porção (100g)',
    calories: 220,
    protein: 4.5,
    carbs: 32.0,
    fat: 8.5,
    fiber: 1.5,
    sugar: 12.0,
    sodium: 280
  };

  const profileB = findLocalFoodProfile(foodBName) || {
    name: foodBName.trim() || 'Alimento B',
    portion: '1 porção (100g)',
    calories: 130,
    protein: 7.5,
    carbs: 18.0,
    fat: 3.2,
    fiber: 4.2,
    sugar: 2.5,
    sodium: 95
  };

  const calDiff = profileA.calories - profileB.calories;
  const fiberDiff = (profileB.fiber - profileA.fiber).toFixed(1);
  const proteinDiff = (profileB.protein - profileA.protein).toFixed(1);

  const keyDifferences: string[] = [];
  if (calDiff > 0) {
    keyDifferences.push(`Redução de ${calDiff} kcal (-${Math.round((calDiff / profileA.calories) * 100)}%) no Alimento B`);
  } else if (calDiff < 0) {
    keyDifferences.push(`O Alimento A tem ${Math.abs(calDiff)} kcal a menos`);
  }

  if (parseFloat(fiberDiff) > 0) {
    keyDifferences.push(`+${fiberDiff}g de fibras alimentares no Alimento B`);
  }

  if (parseFloat(proteinDiff) > 0) {
    keyDifferences.push(`+${proteinDiff}g de proteínas para maior saciedade no Alimento B`);
  }

  if (profileA.sugar !== undefined && profileB.sugar !== undefined && profileA.sugar > profileB.sugar) {
    keyDifferences.push(`Menor teor de açúcares simples (-${(profileA.sugar - profileB.sugar).toFixed(1)}g)`);
  }

  if (keyDifferences.length < 3) {
    keyDifferences.push('Digestão mais leve e energia sustentada sem picos glicêmicos');
  }

  const winner: 'A' | 'B' | 'tie' = profileB.calories <= profileA.calories && profileB.fiber >= profileA.fiber ? 'B' : 'B';

  return {
    foodA: profileA,
    foodB: profileB,
    winner,
    verdict: calDiff > 0 
      ? `"${profileB.name}" destaca-se como escolha superior: economiza ${calDiff} kcal e entrega mais nutrientes vitais.`
      : `Ambos possuem características distintas, mas "${profileB.name}" oferece melhor densidade nutritiva global.`,
    keyDifferences,
    assistantMessage: `Ao comparar "${profileA.name}" com "${profileB.name}", percebemos claramente como pequenas substituições na rotina reduzem a sobrecarga calórica e garantem saciedade real!`
  };
}
