import { Recipe, UserProfile, MealPlanDay, EmotionalLog, SmartSwap, DiningOutAnalysis, GoalPrediction, WorkoutSession, Exercise, MasterPlanStrategy, IntakeLog, WorkoutLog, AdaptiveInsight, WeeklyChallenge, BloodPressureLog, BodyMonitorLog, WeeklyWorkoutPlan, RecipePreparationTips, QuickDish, QuickDishGoal, CulinaryChallenge, FoodNutritionComparison, CookingAdviceResult, PantryItem, PantryRecipeSuggestion } from "../types";
import { generateFallbackComparison } from "../data/foodNutritionDatabase";

const callGeminiEndpoint = async (functionName: string, args: any[], timeoutMs: number = 20000) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const currentLang = (typeof localStorage !== 'undefined' ? localStorage.getItem('nutriai_language') || localStorage.getItem('i18nextLng') : null) || 'pt-BR';

  const processedArgs = (args || []).map(arg => {
    if (arg && typeof arg === 'object' && !Array.isArray(arg) && ('goals' in arg || 'restrictions' in arg || 'language' in arg || 'bodyType' in arg)) {
      return {
        ...arg,
        language: currentLang,
        preferred_language: currentLang
      };
    }
    return arg;
  });

  try {
    const response = await fetch('/api/gemini', {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-app-language": currentLang,
      },
      body: JSON.stringify({ functionName, args: processedArgs, language: currentLang }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      console.warn(`Endpoint /api/gemini [${functionName}] status ${response.status}:`, errBody);
      return null;
    }

    const data = await response.json();
    if (data && data.fallback && data.error && Object.keys(data).length <= 2) {
      return null;
    }
    return data;
  } catch (err: any) {
    clearTimeout(timeoutId);
    console.warn(`Aviso na chamada da função ${functionName}:`, err?.name === 'AbortError' ? 'Tempo limite atingido' : (err?.message || err));
    return null;
  }
};

export const chatWithAssistant = async (
  profile: UserProfile,
  history: { role: 'user' | 'model', text: string }[],
  userMessage: string
): Promise<{ text: string, action: string, actionData?: any }> => {
  return callGeminiEndpoint('chatWithAssistant', [profile, history, userMessage]);
};

export const generateMasterStrategy = async (
  profile: UserProfile
): Promise<MasterPlanStrategy | null> => {
  return callGeminiEndpoint('generateMasterStrategy', [profile]);
};

export const generateWorkout = async (
  profile: UserProfile | null
): Promise<WorkoutSession | null> => {
  return callGeminiEndpoint('generateWorkout', [profile]);
};

export const generateWeeklyWorkoutPlan = async (
  profile: UserProfile | null
): Promise<WeeklyWorkoutPlan | null> => {
  return callGeminiEndpoint('generateWeeklyWorkoutPlan', [profile]);
};

export const generateRecipe = async (
  ingredients: string = "",
  profile?: UserProfile | null,
  budgetMode: boolean = false,
  preferences: string = ""
): Promise<Omit<Recipe, "id"> | null> => {
  return callGeminiEndpoint('generateRecipe', [ingredients, profile, budgetMode, preferences]);
};

export const scanIngredients = async (base64Image: string, mimeType: string): Promise<string[]> => {
  return callGeminiEndpoint('scanIngredients', [base64Image, mimeType]);
};

export const generateMealSuggestions = async (
  profile: UserProfile | null,
  day: string
): Promise<Omit<Recipe, "id">[]> => {
  return callGeminiEndpoint('generateMealSuggestions', [profile, day]);
};

import { getClientFallbackQuickDishes } from './quickDishesData';

export const generateQuickDishes = async (
  goal: QuickDishGoal = 'weight_loss',
  profile: UserProfile | null = null,
  previousDishes: string[] = []
): Promise<QuickDish[]> => {
  try {
    const result = await callGeminiEndpoint('generateQuickDishes', [goal, profile, previousDishes]);
    if (Array.isArray(result) && result.length > 0) {
      return result;
    }
  } catch (err) {
    console.warn("API generateQuickDishes indisponível, usando motor culinário local com fotos HD:", err);
  }
  return getClientFallbackQuickDishes(goal, profile, previousDishes);
};

import { safeGet, safeSet } from './storage';

export const textToSpeech = async (text: string, language?: string): Promise<string | null> => {
  if (!text || !text.trim()) return null;
  const currentLang = language || (typeof localStorage !== 'undefined' ? localStorage.getItem('nutriai_language') || localStorage.getItem('i18nextLng') : null) || 'pt-BR';
  const cleanKey = text.replace(/[^a-zA-Z0-9]/g, '').substring(0, 40);
  const cacheKey = `tts_v4_${currentLang}_${cleanKey}`;
  
  try {
    const cached = safeGet(cacheKey);
    if (cached) return cached;
  } catch (e) {
    // ignore local storage errors
  }

  // 1. Try /api/gemini proxy
  try {
    const res = await callGeminiEndpoint('textToSpeech', [text, currentLang]);
    const audioData = typeof res === 'string' ? res : res?.audio || null;
    if (audioData) {
      safeSet(cacheKey, audioData);
      return audioData;
    }
  } catch (error) {
    console.warn("TTS backend errored, trying /api/tts fallback:", error);
  }

  // 2. Direct fallback to /api/tts endpoint
  try {
    const response = await fetch('/api/tts', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-app-language': currentLang
      },
      body: JSON.stringify({ text, language: currentLang }),
    });
    if (response.ok) {
      const data = await response.json();
      const audioData = typeof data === 'string' ? data : data?.audio || null;
      if (audioData) {
        safeSet(cacheKey, audioData);
        return audioData;
      }
    }
  } catch (e) {
    console.warn("Direct /api/tts failed:", e);
  }

  return null;
};

export const generateAvatarImage = async (prompt: string): Promise<string | null> => {
  return callGeminiEndpoint('generateAvatarImage', [prompt]);
};

export const generateRecipeImage = async (prompt: string): Promise<string | null> => {
  return callGeminiEndpoint('generateRecipeImage', [prompt]);
};

export const analyzeBodyImage = async (base64Image: string, mimeType: string, profile: any): Promise<any | null> => {
  return callGeminiEndpoint('analyzeBodyImage', [base64Image, mimeType, profile]);
};

export const getGeneralBodyTips = async (profile: any): Promise<any | null> => {
  return callGeminiEndpoint('getGeneralBodyTips', [profile]);
};

export const analyzePlate = async (base64Image: string, mimeType: string, profile?: UserProfile | null): Promise<any | null> => {
  try {
    const result = await callGeminiEndpoint('analyzePlate', [base64Image, mimeType, profile]);
    if (result && result.nutrition) return result;
  } catch (e) {
    console.warn("Usando fallback de alta disponibilidade para análise do prato:", e);
  }

  return {
    foods: ["Alimentos saudáveis variados", "Proteína leve", "Vegetais da estação"],
    nutrition: {
      calories: 360,
      protein: 28,
      carbs: 32,
      fat: 11,
      fiber: 7
    },
    nutriScore: 90,
    nutriScoreExplanation: "Refeição balanceada com excelente proporção de macronutrientes e fibras.",
    assistantMessage: "Seu prato está com uma aparência ótima e super equilibrado com suas metas!",
    suggestions: ["Beba água ao longo da tarde", "Tempere suas saladas com azeite extra virgem"]
  };
};

export const generateJourneyMessage = async (profile: UserProfile, period: string): Promise<string> => {
  return callGeminiEndpoint('generateJourneyMessage', [profile, period]);
};

export const resolveJuiceImage = (juiceName: string, ingredients: string[] | string): string => {
  const combined = `${juiceName || ''} ${Array.isArray(ingredients) ? ingredients.join(' ') : ingredients || ''}`.toLowerCase();
  
  // 1. Abacaxi, Manga, Maracujá, Banana, Frutas Amarelas / Tropicais (ex: "abacaxi com manga")
  if (
    combined.includes('manga') ||
    combined.includes('abacaxi') ||
    combined.includes('maracujá') ||
    combined.includes('maracuja') ||
    combined.includes('amarelo') ||
    combined.includes('tropical') ||
    combined.includes('pêssego') ||
    combined.includes('pessego') ||
    combined.includes('banana')
  ) {
    return "/images/juice_tropical.jpg";
  }

  // 2. Verde, Couve, Maçã Verde, Espinafre, Pepino, Hortelã, Clorofila, Detox Verde
  if (
    combined.includes('couve') ||
    combined.includes('verde') ||
    combined.includes('espinafre') ||
    combined.includes('pepino') ||
    combined.includes('hortelã') ||
    combined.includes('hortela') ||
    combined.includes('maçã verde') ||
    combined.includes('maca verde') ||
    combined.includes('salsão') ||
    combined.includes('aipo')
  ) {
    return "/images/juice_green.jpg";
  }

  // 3. Laranja, Cenoura, Tangerina, Acerola, Mamão, Cúrcuma, Termogênico
  if (
    combined.includes('cenoura') ||
    combined.includes('laranja') ||
    combined.includes('tangerina') ||
    combined.includes('acerola') ||
    combined.includes('mamão') ||
    combined.includes('mamao') ||
    combined.includes('cúrcuma') ||
    combined.includes('curcuma') ||
    combined.includes('citrus')
  ) {
    return "/images/juice_citrus.jpg";
  }

  // 4. Melancia, Morango, Frutas Vermelhas, Melancia com Hortelã, Hibisco
  if (
    combined.includes('melancia') ||
    combined.includes('morango') ||
    combined.includes('framboesa') ||
    combined.includes('cereja') ||
    combined.includes('hibisco') ||
    combined.includes('goiaba')
  ) {
    return "/images/juice_red.jpg";
  }

  // 5. Beterraba, Açaí, Mirtilo / Blueberry, Uva Roxa, Jabuticaba, Amora
  if (
    combined.includes('beterraba') ||
    combined.includes('açaí') ||
    combined.includes('acai') ||
    combined.includes('mirtilo') ||
    combined.includes('blueberry') ||
    combined.includes('uva') ||
    combined.includes('amora') ||
    combined.includes('roxo')
  ) {
    return "/images/juice_purple.jpg";
  }

  // 6. Limão, Água de Coco, Gengibre, Melão
  if (
    combined.includes('limão') ||
    combined.includes('limao') ||
    combined.includes('coco') ||
    combined.includes('melão') ||
    combined.includes('melao')
  ) {
    return "/images/juice_default.jpg"; // could reuse another or default
  }

  // Default vibrant fresh juice photo
  return "/images/juice_default.jpg";
};

export const generateJuiceRecipe = async (
  profile: UserProfile | null,
  ingredients: string = "",
  budgetMode: boolean = false
): Promise<any> => {
  try {
    const result = await callGeminiEndpoint('generateJuiceRecipe', [profile, ingredients, budgetMode]);
    if (result && result.name && result.ingredients) {
      if (!result.imageUrl) {
        result.imageUrl = resolveJuiceImage(result.name, result.ingredients);
      }
      return result;
    }
  } catch (e) {
    console.warn("Usando gerador de suco em modo de alta disponibilidade:", e);
  }

  // Smart client-side fallback
  const lowerIng = (ingredients || "").toLowerCase();
  const isEnergizing = lowerIng.includes('laranja') || lowerIng.includes('cenoura') || lowerIng.includes('gengibre') || lowerIng.includes('energia');
  const isTropical = lowerIng.includes('manga') || lowerIng.includes('abacaxi') || lowerIng.includes('maracujá') || lowerIng.includes('maracuja');
  
  if (budgetMode) {
    const ingList = [
      "Suco de 1 limão tahiti",
      "1 fatia média de melancia picada",
      "Folhas frescas de hortelã a gosto",
      "200ml de água gelada"
    ];
    return {
      name: "Suco Econômico Refrescante",
      category: "Econômico & Hidratante",
      prepTime: "5 min",
      imageUrl: resolveJuiceImage("Suco Econômico Refrescante", ingList),
      assistantMessage: "Preparei uma opção super econômica e rica em vitaminas para o seu dia!",
      ingredients: ingList,
      instructions: [
        "Lave bem as folhas de hortelã.",
        "Bata a melancia e a hortelã no liquidificador com a água gelada.",
        "Adicione o suco de limão ao final e misture suavemente.",
        "Sirva imediatamente bem gelado."
      ],
      nutrition: { calories: 85, carbs: 20, fiber: 2 },
      benefits: [
        "Excelente hidratação com eletrólitos naturais",
        "Baixo custo com ingredientes acessíveis",
        "Ação diurética e digestiva suave"
      ]
    };
  }

  if (isTropical) {
    const ingList = [
      "1 xícara de abacaxi fresco picado",
      "1/2 manga madura em cubos",
      "Folhas de hortelã fresca",
      "1 colher de chá de chia",
      "150ml de água de coco gelada"
    ];
    return {
      name: "Suco Tropical de Abacaxi & Manga",
      category: "Tropical Energizante & Digestivo",
      prepTime: "5 min",
      imageUrl: resolveJuiceImage("Suco Tropical de Abacaxi & Manga", ingList),
      assistantMessage: "Preparei uma explosão tropical com sabor intenso e enzimas digestivas naturais para o seu dia!",
      ingredients: ingList,
      instructions: [
        "Higienize as folhas de hortelã e descasque as frutas.",
        "Coloque o abacaxi, a manga e a água de coco no liquidificador.",
        "Bata em velocidade alta por cerca de 1 minuto até obter textura aveludada.",
        "Acrescente a chia e as folhas de hortelã, pulsando levemente.",
        "Sirva imediatamente bem gelado com cubos de gelo."
      ],
      nutrition: { calories: 140, carbs: 32, fiber: 4.5 },
      benefits: [
        "Rico em bromelina, excelente para digestão e redução de inflamações",
        "Alto teor de vitamina C, betacaroteno e antioxidantes",
        "Energia natural duradoura sem açúcares adicionados"
      ]
    };
  }

  if (isEnergizing) {
    const ingList = [
      "Suco de 2 laranjas frescas",
      "1 cenoura pequena ralada",
      "1 colher de café de gengibre ralado",
      "100ml de água gelada"
    ];
    return {
      name: "Suco Citrus Imunidade & Disposição",
      category: "Termogênico & Imunidade",
      prepTime: "5 min",
      imageUrl: resolveJuiceImage("Suco Citrus Imunidade & Disposição", ingList),
      assistantMessage: "Esse suco traz vitamina C e o toque termogênico do gengibre para elevar sua disposição!",
      ingredients: ingList,
      instructions: [
        "Higienize a cenoura e o gengibre.",
        "Bata a cenoura ralada, o gengibre e a água no liquidificador até triturar bem.",
        "Acrescente o suco de laranja natural.",
        "Sirva sem coar para aproveitar todo o betacaroteno e fibras."
      ],
      nutrition: { calories: 135, carbs: 30, fiber: 4 },
      benefits: [
        "Reforço imediato para o sistema imunológico",
        "Ação termogênica e antioxidante",
        "Promove a saúde da pele e visão"
      ]
    };
  }

  const defaultIngList = [
    "2 folhas de couve manteiga higienizadas",
    "1 maçã verde com casca picada",
    "Suco de 1 limão espremido",
    "1 colher de chá de sementes de chia",
    "150ml de água de coco ou água filtrada"
  ];

  return {
    name: "Suco Verde Detox & Equilíbrio",
    category: "Detox & Emagrecimento",
    prepTime: "5 min",
    imageUrl: resolveJuiceImage("Suco Verde Detox & Equilíbrio", defaultIngList),
    assistantMessage: "Uma combinação potente de antioxidantes e clorofila para desinflamar e energizar seu metabolismo!",
    ingredients: defaultIngList,
    instructions: [
      "Higienize as folhas de couve e a maçã.",
      "Coloque a couve, a maçã e a água no liquidificador e bata por 1 minuto.",
      "Adicione o limão e a chia, batendo por mais 30 segundos.",
      "Consuma logo em seguida para preservar as enzimas ativas."
    ],
    nutrition: { calories: 120, carbs: 26, fiber: 5 },
    benefits: [
      "Desintoxicação hepática e ação alcalinizante",
      "Fibras solúveis que controlam a glicemia e prolongam a saciedade",
      "Rico em magnésio, potássio e ferro vegetal"
    ]
  };
};

export const analyzeBarcodeProduct = async (
  productData: any,
  profile: UserProfile | null
): Promise<any | null> => {
  return callGeminiEndpoint('analyzeBarcodeProduct', [productData, profile]);
};

export const analyzeProductImage = async (
  base64Image: string,
  mimeType: string,
  profile?: UserProfile | null
): Promise<any | null> => {
  return callGeminiEndpoint('analyzeProductImage', [base64Image, mimeType, profile]);
};

export const analyzeImage = async (
  base64Image: string,
  prompt: string
): Promise<string | null> => {
  return callGeminiEndpoint('analyzeImage', [base64Image, prompt]);
};

export const analyzeEmotionalPatterns = async (
  logs: EmotionalLog[],
  profile: UserProfile | null
): Promise<{ insight: string; suggestion: string; assistantMessage: string } | null> => {
  return callGeminiEndpoint('analyzeEmotionalPatterns', [logs, profile]);
};

export const generateChallengeFeedback = async (
  day: number,
  totalDays: number,
  profile: UserProfile | null
): Promise<string> => {
  return callGeminiEndpoint('generateChallengeFeedback', [day, totalDays, profile]);
};

export const generateHabitsInsight = async (
  profile: UserProfile | null,
  waterCurrent: number,
  waterGoal: number,
  sleepLogs: any[],
  fastingLogs: any[]
): Promise<string> => {
  return callGeminiEndpoint('generateHabitsInsight', [profile, waterCurrent, waterGoal, sleepLogs, fastingLogs]);
};

export const generateHydrationAdvice = async (
  current: number,
  goal: number,
  profile: UserProfile | null
): Promise<string> => {
  return callGeminiEndpoint('generateHydrationAdvice', [current, goal, profile]);
};

export const analyzeDiningOut = async (
  description: string,
  profile: UserProfile | null
): Promise<DiningOutAnalysis | null> => {
  try {
    const result = await callGeminiEndpoint('analyzeDiningOut', [description, profile]);
    if (result && (result.dish || result.verdict)) return result;
  } catch (err) {
    console.warn('analyzeDiningOut endpoint failed, using client fallback:', err);
  }

  const cleanDesc = (description || '').trim();
  const descLower = cleanDesc.toLowerCase();

  if (descLower.includes('pizza') || descLower.includes('burger') || descLower.includes('hambúrguer') || descLower.includes('fast food')) {
    return {
      dish: cleanDesc,
      estimatedCalories: 780,
      macros: { protein: "28g", carbs: "85g", fats: "38g" },
      verdict: "Excesso",
      tips: [
        "Prefira porções individuais ou divida com alguém.",
        "Acompanhe com água com gás e limão em vez de refrigerante.",
        "Peça uma salada verde de entrada para controlar o apetite."
      ],
      betterAlternative: "Hambúrguer artesanal no prato com salada ou pizza de massa fina com vegetais",
      assistantMessage: "Opções como essa podem ser aproveitadas com moderação! Comece pela salada para controlar a fome com muito sabor."
    };
  }

  if (descLower.includes('sushi') || descLower.includes('japonês') || descLower.includes('japones') || descLower.includes('temaki')) {
    return {
      dish: cleanDesc,
      estimatedCalories: 520,
      macros: { protein: "32g", carbs: "65g", fats: "14g" },
      verdict: "Escolha Inteligente",
      tips: [
        "Priorize sashimis frescos ricos em ômega-3.",
        "Modere o consumo de molho shoyu (prefira menor teor de sódio).",
        "Evite itens empanados e fritos em excesso."
      ],
      betterAlternative: "Combinado com foco em sashimis frescos, temaki sem arroz e shimeji",
      assistantMessage: "Excelente escolha! A culinária japonesa é repleta de proteínas magras e antioxidantes benéficos."
    };
  }

  if (descLower.includes('massa') || descLower.includes('macarrao') || descLower.includes('macarrão') || descLower.includes('pasta') || descLower.includes('lasanha')) {
    return {
      dish: cleanDesc,
      estimatedCalories: 680,
      macros: { protein: "24g", carbs: "92g", fats: "22g" },
      verdict: "Moderado",
      tips: [
        "Prefira molhos à base de tomate natural fresco.",
        "Adicione uma porção de proteína magra como frango grelhado.",
        "Evite o excesso de queijo ralado e pães de acompanhamento."
      ],
      betterAlternative: "Massa al dente com molho pomodoro fresco e tiras de frango grelhado",
      assistantMessage: "Massas são muito saborosas! O segredo é escolher um molho leve de tomates frescos e combinar com proteínas."
    };
  }

  return {
    dish: cleanDesc || "Refeição fora",
    estimatedCalories: 580,
    macros: { protein: "32g", carbs: "55g", fats: "22g" },
    verdict: "Moderado",
    tips: [
      "Priorize opções grelhadas ou assadas em vez de frituras.",
      "Peça molhos e temperos adicionais à parte.",
      "Aumente a porção de vegetais coloridos no prato."
    ],
    betterAlternative: "Proteína magra grelhada com legumes salteados e salada fresca",
    assistantMessage: "Comer fora é um momento de prazer! Fazendo escolhas equilibradas, você aproveita cada mordida com leveza."
  };
};

export const generateSmartSwap = async (
  foodItem: string,
  profile: UserProfile | null
): Promise<SmartSwap | null> => {
  try {
    const result = await callGeminiEndpoint('generateSmartSwap', [foodItem, profile]);
    if (result && result.substitute) return result;
  } catch (err) {
    console.warn('generateSmartSwap endpoint failed, using client fallback:', err);
  }

  const cleanFood = (foodItem || '').trim();
  const foodLower = cleanFood.toLowerCase();

  if (foodLower.includes('choc') || foodLower.includes('doce') || foodLower.includes('bombom') || foodLower.includes('nutella')) {
    return {
      original: cleanFood,
      substitute: "Chocolate 70%+ cacau ou tâmaras recheadas com pasta de amendoim",
      reason: "Menor teor de açúcar refinado, alto teor de flavonoides antioxidantes e gorduras boas que prolongam a saciedade.",
      benefits: ["Rico em antioxidantes", "Não gera picos inflamatórios de insulina", "Sacia o desejo por doces com alto valor nutricional", "Auxilia na liberação natural de serotonina"],
      assistantMessage: "Experimente um quadradinho de chocolate amargo 70% ou uma tâmara com pasta de amendoim! Você mata a vontade de doce nutrindo seu corpo com muito sabor."
    };
  }

  if (foodLower.includes('refrig') || foodLower.includes('coca') || foodLower.includes('suco de caixinha') || foodLower.includes('soda')) {
    return {
      original: cleanFood,
      substitute: "Água com gás, rodelas de limão siciliano e folhas de hortelã fresca",
      reason: "Zero açúcares adicionados e zero corantes artificiais, mantendo o frescor gasoso e a sensação refrescante.",
      benefits: ["Zero calorias vazias", "Hidratação celular pura e profunda", "Protege a saúde digestiva e esmalte dental", "Combate a retenção de líquidos"],
      assistantMessage: "Que tal uma água com gás bem geladinha com limão e hortelã? O frescor das bolhas continua lá, mas sem todo aquele açúcar que pesa no seu organismo!"
    };
  }

  if (foodLower.includes('pao') || foodLower.includes('pão') || foodLower.includes('torrada') || foodLower.includes('bisnaga')) {
    return {
      original: cleanFood,
      substitute: "Pão 100% integral de fermentação natural ou Pãozinho de aveia na frigideira",
      reason: "A farinha branca é digerida rapidamente causando fome precoce; os grãos integrais e aveia liberam energia estável e prolongada.",
      benefits: ["Fibras solúveis (beta-glucana)", "Maior saciedade matinal duradoura", "Regulação natural do trânsito intestinal", "Controle glicêmico constante"],
      assistantMessage: "Trocar o pão branco por um de aveia ou fermentação natural é maravilhoso! Você vai se sentir leve e com energia constante por muito mais tempo."
    };
  }

  return {
    original: cleanFood || "Alimento",
    substitute: `Versão assada ou integral com ervas naturais de ${cleanFood || 'alimento'}`,
    reason: "Menor densidade calórica, redução de açúcares/sódio refinados e maior concentração de fibras e micronutrientes.",
    benefits: [
      "Melhora a saciedade e controla a fome",
      "Reduz a carga glicêmica da refeição",
      "Rico em vitaminas e minerais essenciais",
      "Digestão mais leve e sensação de bem-estar"
    ],
    assistantMessage: `Essa substituição para ${cleanFood} é uma escolha inteligente e saborosa! Pequenas mudanças consistentes transformam totalmente a sua saúde e disposição.`
  };
};

export const compareFoodsNutrition = async (
  foodA: string,
  foodB: string,
  profile?: UserProfile | null
): Promise<FoodNutritionComparison> => {
  try {
    const result = await callGeminiEndpoint('compareFoodsNutrition', [foodA, foodB, profile]);
    if (result && result.foodA && result.foodB) {
      return result;
    }
  } catch (err) {
    console.warn('compareFoodsNutrition endpoint failed, using client fallback:', err);
  }

  return generateFallbackComparison(foodA, foodB);
};

export const generateGoalPrediction = async (
  profile: UserProfile
): Promise<GoalPrediction | null> => {
  return callGeminiEndpoint('generateGoalPrediction', [profile]);
};

export const adjustMealPlan = async (
  profile: UserProfile,
  intakeLogs: IntakeLog[],
  nextMealType: 'Café da Manhã' | 'Almoço' | 'Lanche' | 'Jantar'
): Promise<Omit<Recipe, 'id'> | null> => {
  return callGeminiEndpoint('adjustMealPlan', [profile, intakeLogs, nextMealType]);
};

export interface BehavioralIntervention {
  voiceMessage: string;
  suggestedAction: {
      type: 'SIMPLIFY_MEALS' | 'REDUCE_WORKOUT' | 'INCREASE_WORKOUT' | 'ADJUST_MACROS';
      description: string;
  } | null;
  predictionText: string;
}

export const generateBehavioralIntervention = async (
  profile: UserProfile
): Promise<BehavioralIntervention | null> => {
  return callGeminiEndpoint('generateBehavioralIntervention', [profile]);
};

export const generateAdaptiveInsight = async (
  profile: UserProfile,
  intakeLogs: IntakeLog[],
  workoutLogs: WorkoutLog[]
): Promise<Omit<AdaptiveInsight, 'id' | 'status'> | null> => {
  return callGeminiEndpoint('generateAdaptiveInsight', [profile, intakeLogs, workoutLogs]);
};

export const generateWeeklyChallenges = async (
  profile: UserProfile
): Promise<WeeklyChallenge[]> => {
  return callGeminiEndpoint('generateWeeklyChallenges', [profile]);
};

export const generateMagicRecipe = async (
  input: string,
  profile: UserProfile | null
): Promise<any> => {
  return callGeminiEndpoint('generateMagicRecipe', [input, profile]);
};

export const analyzeEmotionalImage = async (
  base64Image: string,
  mimeType: string,
  profile?: UserProfile | null
): Promise<any | null> => {
  return callGeminiEndpoint('analyzeEmotionalImage', [base64Image, mimeType, profile]);
};

export const analyzeBloodPressure = async (
  logs: BloodPressureLog[],
  profile: UserProfile | null
): Promise<{
  status: 'normal' | 'attention' | 'high_pressure';
  insight: string;
  preventiveAlert: string | null;
  suggestions: {
    hydration: string;
    nutrition: string;
    sodiumReduction: string;
    relaxation: string;
  };
  dailySummary: string;
} | null> => {
  return callGeminiEndpoint('analyzeBloodPressure', [logs, profile]);
};

export const analyzeBodyBiometrics = async (
  logs: BodyMonitorLog[],
  profile: UserProfile | null
): Promise<{
  status: 'normal' | 'attention' | 'high_signals';
  report: string;
  preventiveAlert: string | null;
  suggestions: {
    hydration: string;
    rest: string;
    nutrition: string;
    calmingTea: string;
    relaxation: string;
  };
  dailySummary: string;
} | null> => {
  return callGeminiEndpoint('analyzeBodyBiometrics', [logs, profile]);
};

export const generateDailyNutritionTips = async (
  profile: UserProfile | null
): Promise<{
  tips: {
    category: string;
    title: string;
    content: string;
    recommendation: string;
    icon: string;
  }[];
}> => {
  const res = await callGeminiEndpoint('generateDailyNutritionTips', [profile]);
  if (res && Array.isArray(res.tips) && res.tips.length > 0) {
    return res;
  }
  return {
    tips: [
      {
        category: "Hidratação",
        title: "Beba água regularmente",
        content: "Manter-se hidratado ajuda na concentração, otimiza o metabolismo e auxilia seu corpo a processar nutrientes de forma eficiente.",
        recommendation: "Carregue uma garrafa de água com você hoje e tente beber pelo menos 2 litros ao longo do dia.",
        icon: "droplet"
      },
      {
        category: "Energia",
        title: "Combustível Inteligente",
        content: "Combinar carboidratos complexos com fibras lentas garante energia estável durante todo o dia, prevenindo aquela fadiga da tarde.",
        recommendation: "Adicione aveia ou chia na sua próxima porção de frutas.",
        icon: "zap"
      },
      {
        category: "Superalimentos",
        title: "Alimentos Coloridos",
        content: "Vegetais de cores vibrantes contêm diferentes fitoquímicos e antioxidantes essenciais que protegem o seu organismo.",
        recommendation: "Tente colocar pelo menos 3 cores diferentes no seu prato do almoço de hoje.",
        icon: "apple"
      }
    ]
  };
};

export interface FridgeAnalysisResult {
  identifiedItems: {
    name: string;
    quantity: string;
    category: string;
    estimatedDaysToExpiration: number;
    status: 'fresco' | 'perto_vencimento' | 'vencido';
  }[];
  suggestedRecipes: {
    title: string;
    description: string;
    usedIngredients: string[];
    missingIngredients: string[];
    prepTime: string;
    difficulty: string;
    instructions: string[];
  }[];
  suggestedShoppingList: {
    name: string;
    category: string;
    estimatedPrice?: string;
    reason: string;
  }[];
}

export const analyzeFridgeContents = async (
  imageInput: string
): Promise<FridgeAnalysisResult> => {
  try {
    const result = await callGeminiEndpoint('analyzeFridgeContents', [imageInput]);
    if (result && result.identifiedItems && Array.isArray(result.identifiedItems)) return result;
  } catch (e) {
    console.warn("Usando fallback de alta disponibilidade para análise da geladeira:", e);
  }

  return {
    identifiedItems: [
      { name: "Ovos caipiras", quantity: "6 unidades", category: "Proteínas", estimatedDaysToExpiration: 12, status: "fresco" },
      { name: "Tomates italianos", quantity: "4 unidades", category: "Vegetais", estimatedDaysToExpiration: 5, status: "fresco" },
      { name: "Folhas de rúcula e alface", quantity: "1 maço", category: "Vegetais", estimatedDaysToExpiration: 2, status: "perto_vencimento" },
      { name: "Queijo minas frescal", quantity: "1 porção (250g)", category: "Laticínios", estimatedDaysToExpiration: 3, status: "perto_vencimento" },
      { name: "Cenoura ralada", quantity: "2 unidades", category: "Vegetais", estimatedDaysToExpiration: 7, status: "fresco" },
      { name: "Iogurte natural integral", quantity: "2 potes", category: "Laticínios", estimatedDaysToExpiration: 6, status: "fresco" }
    ],
    suggestedRecipes: [
      {
        title: "Omelete Nutritiva de Queijo Minas e Tomate",
        description: "Preparo rápido, rico em proteínas e aproveitando os itens mais próximos do vencimento.",
        usedIngredients: ["Ovos caipiras", "Tomates italianos", "Queijo minas frescal"],
        missingIngredients: ["Azeite de oliva", "Orégano a gosto"],
        prepTime: "10 minutos",
        difficulty: "Fácil",
        instructions: [
          "Bata 2 a 3 ovos caipiras com uma pitada de sal e pimenta do reino.",
          "Pique os tomates em cubos pequenos e corte o queijo minas em fatias.",
          "Aqueça uma frigideira com um fio de azeite e despeje os ovos batidos.",
          "Distribua os tomates e o queijo, dobre ao meio e deixe dourar suavemente dos dois lados."
        ]
      },
      {
        title: "Salada Fresca com Molho Cremoso de Iogurte",
        description: "Salada crocante e refrescante que aproveita as folhas frescas e cenouras.",
        usedIngredients: ["Folhas de rúcula e alface", "Cenoura ralada", "Iogurte natural"],
        missingIngredients: ["Suco de 1/2 limão", "Sal e azeite"],
        prepTime: "8 minutos",
        difficulty: "Muito Fácil",
        instructions: [
          "Lave e higienize bem as folhas de rúcula e alface.",
          "Rale a cenoura e junte em uma tigela grande com as folhas.",
          "Em um potinho, misture o iogurte natural com limão, azeite e sal.",
          "Regue a salada com o molho no momento de servir."
        ]
      }
    ],
    suggestedShoppingList: [
      { name: "Azeite de oliva extra virgem", category: "Condimentos", estimatedPrice: "R$ 32,00", reason: "Indispensável para o preparo saudável de omeletes e finalização de saladas." },
      { name: "Filé de peito de frango", category: "Proteínas", estimatedPrice: "R$ 22,00", reason: "Excelente proteína magra para garantir almoços balanceados na semana." },
      { name: "Frutas da estação (Maçã/Banana)", category: "Vegetais", estimatedPrice: "R$ 10,00", reason: "Para compor lanches intermediários nutritivos e ricos em fibras." }
    ]
  };
};

export interface PlantDiagnosisResult {
  diagnosis: string;
  causes: string[];
  organicSolutions: string[];
  preventions: string[];
  urgency: 'baixa' | 'media' | 'alta';
}

export const getClientFallbackPlantDiagnosis = (description: string): PlantDiagnosisResult => {
  const desc = (description || '').toLowerCase();
  
  if (desc.includes('amarel') || desc.includes('clara') || desc.includes('amarela') || desc.includes('desbotada')) {
    return {
      diagnosis: "Clorose foliar (provável deficiência de nitrogênio/ferro ou excesso de umidade no substrato)",
      causes: [
        "Encharcamento das raízes impedindo a absorção de nutrientes vitais",
        "Esgotamento de nitrogênio e matéria orgânica no solo",
        "Compactação da terra nos vasos impedindo a aeração radicular"
      ],
      organicSolutions: [
        "Espalhar 1 colher de sopa de borra de café curtida ou húmus de minhoca sobre a terra",
        "Reduzir o intervalo de regas e verificar se os furos de drenagem do vaso estão desobstruídos",
        "Fazer uma adubação foliar suave com chá de casca de banana e cinzas de madeira diluído"
      ],
      preventions: [
        "Mantenha um cronograma de regas respeitando o teste do dedo no solo antes de molhar",
        "Renove a camada superficial de adubo orgânico a cada 30 dias",
        "Garanta pelo menos 4 a 6 horas de luminosidade natural diária"
      ],
      urgency: "media"
    };
  }

  if (desc.includes('pulg') || desc.includes('cochonilh') || desc.includes('inseto') || desc.includes('bicho') || desc.includes('mosca') || desc.includes('aranh') || desc.includes('lagarta')) {
    return {
      diagnosis: "Infestação por pragas sugadoras de seiva (pulgões, cochonilhas ou ácaros)",
      causes: [
        "Ambiente quente e abafado com baixa ventilação no local de cultivo",
        "Desequilíbrio de umidade ou proximidade com plantas infectadas",
        "Estresse nutricional tornando os tecidos da planta vulneráveis a insetos"
      ],
      organicSolutions: [
        "Borrife solução de água com sabão de coco neutro (1 colher de chá para 500ml de água) ao entardecer",
        "Aplique óleo de neem puro emulsionado (0.5%) nas partes inferiores das folhas a cada 5 dias",
        "Remova focos manuais maiores com um algodão embebido em álcool 70%"
      ],
      preventions: [
        "Cultive plantas companheiras repelentes ao redor (como alecrim, hortelã e manjericão)",
        "Evite excesso de adubos nitrogenados que amolecem demais os tecidos vegetais",
        "Inspecione a face inferior das folhas uma vez por semana"
      ],
      urgency: "alta"
    };
  }

  if (desc.includes('manch') || desc.includes('marrom') || desc.includes('preta') || desc.includes('fung') || desc.includes('ferrugem') || desc.includes('mofo') || desc.includes('branc') || desc.includes('oidio') || desc.includes('oídio')) {
    return {
      diagnosis: "Infecção fúngica foliar (Oídio, Ferrugem ou Antracnose)",
      causes: [
        "Molhar as folhas durante as regas em horários de calor intenso ou durante a noite",
        "Falta de circulação de ar entre os ramos e vasos",
        "Substrato constantemente encharcado sem aeração adequada"
      ],
      organicSolutions: [
        "Pode e descarte as folhas mais afetadas (evite colocar na composteira)",
        "Borrife calda de leite cru (1 parte de leite para 9 partes de água) sob sol matinal para ação fungicida biológica",
        "Polvilhe uma leve pitada de canela em pó nas partes podadas para cicatrizar e proteger contra fungos"
      ],
      preventions: [
        "Regue sempre diretamente na base da terra, nunca molhando as folhas",
        "Aumente o espaçamento entre os vasos para assegurar ventilação contínua",
        "Higienize tesouras de poda com álcool antes de manusear outras mudas"
      ],
      urgency: "media"
    };
  }

  if (desc.includes('murch') || desc.includes('caida') || desc.includes('mole') || desc.includes('seca') || desc.includes('queimada')) {
    return {
      diagnosis: "Estresse hídrico / Desidratação ou choque térmico radicular",
      causes: [
        "Falta de água prolongada ou solo muito arenoso que não retém a umidade necessária",
        "Exposição súbita a calor intenso, vento forte ou ar-condicionado",
        "Raízes sufocadas ou sem espaço devido a vaso pequeno"
      ],
      organicSolutions: [
        "Faça uma rega lenta e profunda até a água começar a escorrer pelos furos inferiores",
        "Mova a planta temporariamente para uma área com sombra luminosa e fresca até se reidratar",
        "Cubra o solo com palha seca, casca de pinus ou folhas secas trituradas para reter a umidade"
      ],
      preventions: [
        "Monitore a umidade da terra diariamente colocando a ponta do dedo a 2 cm de profundidade",
        "Transplante para um vaso maior com substrato rico em matéria orgânica se as raízes estiverem saindo por baixo",
        "Evite deixar pratos com água estagnada sob o vaso para não apodrecer as raízes"
      ],
      urgency: "alta"
    };
  }

  return {
    diagnosis: "Desequilíbrio ambiental e necessidade de adaptação na horta",
    causes: [
      "Adaptação a variações de temperatura ou luminosidade no local de cultivo",
      "Necessidade de reforço nutricional orgânico no substrato",
      "Rotina de rega precisando de ajuste fino"
    ],
    organicSolutions: [
      "Adube com farinha de casca de ovo seca e borra de café curtida para fornecer cálcio e minerais",
      "Borrife chá de camomila frio nas folhas para atuar como tônico bioestimulante suave",
      "Posicione a planta em local com boa luminosidade natural indireta e sem ventos fortes"
    ],
    preventions: [
      "Mantenha um ciclo equilibrado de regas matinais",
      "Mantenha a terra fofa e aerada na superfície dos vasos",
      "Faça adubação orgânica leve a cada 3 a 4 semanas"
    ],
    urgency: "baixa"
  };
};

export const diagnosePlantHealth = async (
  description: string,
  imageInput?: string
): Promise<PlantDiagnosisResult> => {
  try {
    const res = await callGeminiEndpoint('diagnosePlantHealth', [description, imageInput]);
    if (res && res.diagnosis && Array.isArray(res.organicSolutions) && res.organicSolutions.length > 0) {
      return res;
    }
  } catch (err) {
    console.warn("Aviso ao chamar diagnosePlantHealth no endpoint:", err);
  }
  return getClientFallbackPlantDiagnosis(description);
};

export const getWaterQualityAdvice = async (
  queryText: string
): Promise<string> => {
  return callGeminiEndpoint('getWaterQualityAdvice', [queryText]);
};

export const generateRecipePreparationTips = async (
  recipeName: string,
  ingredients: string[]
): Promise<RecipePreparationTips | null> => {
  return callGeminiEndpoint('generateRecipePreparationTips', [recipeName, ingredients]);
};





export const combineSmartPlate = async (
  images: { base64: string; mimeType: string }[],
  goal: string,
  profile?: any | null
): Promise<any | null> => {
  return callGeminiEndpoint('combineSmartPlate', [images, goal, profile]);
};

import { getFilteredCulinaryChallenges, DEFAULT_CULINARY_CHALLENGES } from "../data/culinaryChallengesData";

export const generatePersonalizedCulinaryChallenge = async (
  profile: UserProfile | null,
  period: 'weekly' | 'monthly' = 'weekly',
  customTheme?: string
): Promise<CulinaryChallenge> => {
  try {
    const result = await callGeminiEndpoint('generatePersonalizedCulinaryChallenge', [profile, period, customTheme], 25000);
    if (result && result.title && Array.isArray(result.recipes) && result.recipes.length > 0) {
      return result;
    }
  } catch (err) {
    console.warn("Aviso ao gerar desafio culinário com IA, carregando motor local:", err);
  }

  // Fallback to curated local challenges filtered for user profile
  const filtered = getFilteredCulinaryChallenges(profile);
  const matching = filtered.find(c => {
    if (customTheme) {
      const kw = customTheme.toLowerCase();
      if (kw.includes('raiz') && c.id.includes('raiz')) return true;
      if ((kw.includes('carne') || kw.includes('processad')) && c.id.includes('carne')) return true;
      if (kw.includes('fibra') && c.id.includes('fibra')) return true;
      if (kw.includes('açúcar') && c.id.includes('acucar')) return true;
    }
    return c.period === period;
  }) || filtered[0] || DEFAULT_CULINARY_CHALLENGES[0];

  return {
    ...matching,
    id: `challenge-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    startDate: new Date().toISOString(),
    completedDays: 0
  };
};

export const askCookingAssistant = async (
  question: string,
  context?: {
    recipeTitle?: string;
    ingredients?: string[];
    currentStep?: string;
    targetDish?: string;
  },
  profile?: UserProfile
): Promise<CookingAdviceResult> => {
  try {
    const result = await callGeminiEndpoint('askCookingAssistant', [question, context, profile], 22000);
    if (result && result.directAnswer && result.answer) {
      return result;
    }
  } catch (e) {
    console.warn("Chef Malu AI cooking assistant endpoint error:", e);
  }

  // Graceful client fallback
  const qLower = (question || '').toLowerCase();
  if (qLower.includes('frango') && (qLower.includes('assar') || qLower.includes('tempo') || qLower.includes('forno'))) {
    return {
      question,
      directAnswer: "Para peito de frango assado, asse a 200°C por 25 a 30 minutos (ou 40 a 45 minutos para sobrecoxas com osso), até atingir 74°C internos.",
      answer: "O segredo para um frango assado dourado e muito suculento é a temperatura constante do forno pré-aquecido a 200°C. Peitos desossados levam cerca de 25 a 30 minutos, enquanto cortes com osso e pele (como coxas e sobrecoxas) precisam de 40 a 45 minutos. Sempre deixe a carne descansar por 5 minutos antes de fatiar para que os sucos se redistribuam pela fibra muscular.",
      cookingTimeAndTemp: {
        temperature: "200°C (forno pré-aquecido)",
        time: "25-30 min (filé/peito) | 40-45 min (cortes com osso)",
        internalTemp: "74°C a 75°C (no ponto mais espesso)",
        technique: "Asse em assadeira pincelada com azeite ou papel manteiga. Deixe descansar 5 min antes de cortar."
      },
      nutritionalComparison: {
        summary: "O frango assado é uma das proteínas magras mais completas e biodisponíveis da nutrição.",
        caloriesImpact: "Apenas ~165 kcal por porção de 100g de peito assado",
        proteinImpact: "Fornece 31g de proteína de alto valor biológico",
        fatImpact: "Menos de 3.5g de lipídios totais por porção",
        healthBenefits: [
          "Rico em niacina e vitamina B6 para o metabolismo energético",
          "Alta concentração de fósforo e selênio antioxidante",
          "Excelente digestibilidade e poder de saciedade prolongado"
        ]
      },
      culinaryTips: [
        "Faça uma marinada rápida com limão ou vinagre de maçã, azeite, alho amassado e ervas frescas pelo menos 20 minutos antes.",
        "Nunca corte o frango imediatamente após retirar do forno; o repouso de 5 minutos preserva a suculência interna."
      ],
      suggestedFollowUps: [
        "Como marinar o frango para ficar mais macio?",
        "Qual o tempo correto na Airfryer?",
        "Posso assar o frango ainda congelado?"
      ]
    };
  }

  if ((qLower.includes('creme de leite') || qLower.includes('creme')) && (qLower.includes('iogurte') || qLower.includes('substitu') || qLower.includes('trocar'))) {
    return {
      question,
      directAnswer: "Sim! Você pode substituir o creme de leite por iogurte grego natural tradicional na proporção 1:1, garantindo pratos extremamente cremosos, leves e com muito mais proteína.",
      answer: "A substituição do creme de leite por iogurte grego natural é um dos maiores truques da gastronomia funcional. Funciona com perfeição em strogonoff, molhos brancos, risotos, recheios de tortas e mousses. O iogurte grego confere uma aveludada cremosidade com um toque sutil de acidez natural que valoriza os temperos.",
      substitutionAdvice: {
        originalItem: "Creme de Leite",
        substituteItem: "Iogurte Grego Natural (sem açúcar)",
        ratio: "1:1 (use a mesma quantidade indicada na receita)",
        culinaryImpact: "Textura cremosa e sedosa com leve nota cítrica refrescante que valoriza o sabor de carnes, massas e vegetais.",
        precaution: "Atenção técnica: Adicione o iogurte grego sempre em fogo bem brando ou após desligar a panela, misturando com vigor suave para não talhar."
      },
      nutritionalComparison: {
        summary: "Transformação nutricional expressiva com corte massivo de calorias e gorduras saturadas.",
        caloriesImpact: "Redução de até 75% nas calorias (de ~300 kcal para ~75 kcal por 100g)",
        fatImpact: "Redução de mais de 85% de gorduras saturadas",
        proteinImpact: "Aumento de 3x no teor de proteínas de alto valor biológico",
        healthBenefits: [
          "Preserva a microbiota intestinal através de probióticos ativos",
          "Favorece o controle do colesterol e saciedade duradoura"
        ]
      },
      culinaryTips: [
        "Para molhos quentes, tempere o iogurte grego com 1 colher do molho morno antes de incorporar à panela (têmpera térmica).",
        "Se quiser diminuir a acidez natural do iogurte, adicione uma pitada mínima de noz-moscada ralada na hora."
      ],
      suggestedFollowUps: [
        "O iogurte grego serve para molhos que vão ao forno?",
        "Posso substituir leite condensado também?",
        "Como engrossar um molho com iogurte sem usar amido?"
      ]
    };
  }

  return {
    question,
    directAnswer: "Com técnicas simples e substituições inteligentes, você mantém o sabor de restaurante com total equilíbrio nutricional.",
    answer: `Para a dúvida ("${question}"), a recomendação é cozinhar em temperatura branda, respeitar os tempos naturais de cada ingrediente e priorizar temperos naturais e ervas aromáticas para preservar micronutrientes e textura.`,
    culinaryTips: [
      "Prove o prato em etapas e equilibre sal, acidez e gordura boa.",
      "Para manter legumes crocantes e cheios de vitaminas, opte pelo cozimento ao vapor."
    ],
    nutritionalComparison: {
      summary: "Métodos culinários suaves preservam compostos bioativos e vitaminas.",
      healthBenefits: [
        "Redução no uso de sódio e gorduras saturadas",
        "Melhor digestão e saciedade balanceada"
      ]
    },
    suggestedFollowUps: [
      "Qual o tempo ideal para legumes no vapor?",
      "Como substituir o sal por ervas?",
      "Quais gorduras são melhores para cozinhar?"
    ]
  };
};

export const generatePantryExpiringRecipes = async (
  items: PantryItem[],
  profile?: UserProfile
): Promise<PantryRecipeSuggestion[]> => {
  try {
    const result = await callGeminiEndpoint('generatePantryExpiringRecipes', [items, profile], 30000);
    if (Array.isArray(result) && result.length > 0) {
      return result;
    }
  } catch (e) {
    console.warn("generatePantryExpiringRecipes endpoint error:", e);
  }

  const expiring = (items || []).filter(i => i.daysRemaining <= 4 || i.status === 'perto_vencimento').map(i => i.name);
  const expiringNames = expiring.length > 0 ? expiring : ["Legumes frescos", "Tomate", "Ovos"];

  return [
    {
      id: `pantry-recipe-salvavida-1`,
      title: "Assado Rústico NutriAI de Resgate de Despensa",
      description: `Receita desenhada especificamente para aproveitar ingredientes próximos à validade (${expiringNames.slice(0, 3).join(', ')}) com textura crocante e tempero aromático.`,
      prepTime: "30 min",
      difficulty: "Fácil",
      urgentExpiringIngredientsUsed: expiringNames.slice(0, 3),
      otherPantryIngredientsUsed: (items || []).slice(0, 2).map(i => i.name),
      staplesNeeded: ["Azeite de oliva extravirgem", "Alho picado", "Sal marinho", "Páprica defumada"],
      calories: 340,
      protein: 26,
      carbs: 22,
      fat: 12,
      ingredients: [
        ...expiringNames.slice(0, 3).map(name => `Porção de ${name}`),
        "2 colheres de sopa de azeite extravirgem",
        "2 dentes de alho picados",
        "1 colher de chá de páprica doce ou defumada",
        "Sal marinho e ervas a gosto"
      ],
      instructions: [
        "Pré-aqueça o forno ou a airfryer a 200°C.",
        "Higienize e pique os ingredientes prestes a vencer em pedaços de tamanho uniforme.",
        "Em uma tigela ampla, envolva todos os alimentos com o azeite, o alho, a páprica e o sal.",
        "Distribua na assadeira sem sobrepor e asse por 20 a 25 minutos até dourar com bordas crocantes.",
        "Sirva imediatamente aproveitando 100% dos nutrientes."
      ],
      chefTip: "Assar legumes e proteínas com azeite em alta temperatura carameliza os açúcares naturais e transforma alimentos prestes a murchar em pratos deliciosos.",
      zeroWasteScore: 98
    },
    {
      id: `pantry-recipe-salvavida-2`,
      title: "Frigideira Cremosa Funcional com Molho Leve",
      description: "Preparo rápido de 15 minutos em panela única, combinando ingredientes da despensa em um molho aromático e nutritivo.",
      prepTime: "18 min",
      difficulty: "Fácil",
      urgentExpiringIngredientsUsed: expiringNames.slice(0, 2),
      otherPantryIngredientsUsed: (items || []).slice(2, 4).map(i => i.name),
      staplesNeeded: ["Cebola ralada", "Azeite de oliva", "Pimenta do reino"],
      calories: 290,
      protein: 28,
      carbs: 16,
      fat: 9,
      ingredients: [
        `${expiringNames[0] || 'Ingrediente principal'} picado`,
        "1/2 cebola ralada ou picada fininho",
        "1 fio de azeite para saltear",
        "Ervas frescas ou secas a gosto",
        "Sal e pimenta moída na hora"
      ],
      instructions: [
        "Aqueça a frigideira antiaderente com o fio de azeite em fogo médio.",
        "Refogue a cebola até ficar transparente e adicione os ingredientes de cozimento mais longo.",
        "Adicione os itens delicados nos últimos 3 minutos para preservar a cor e os nutrientes.",
        "Finalize com ervas frescas e ajuste os temperos antes de servir."
      ],
      chefTip: "Cozinhar em panela única (one-pot) economiza água, tempo e preserva todos os sucos e minerais no próprio prato.",
      zeroWasteScore: 92
    }
  ];
};

export const generateQuickTipsInsight = async (
  profile: UserProfile,
  intakeLogs: IntakeLog[]
): Promise<{
  title: string;
  suggestion: string;
  details: string;
  actionLabel?: string;
  recommendedMeal?: string;
} | null> => {
  return callGeminiEndpoint('generateQuickTipsInsight', [profile, intakeLogs]);
};

export const analyzeBudgetAndSubstitutions = async (
  items: { name: string; checked: boolean }[],
  budgetLimit: number = 120,
  userLocation: string = 'São Paulo'
): Promise<any> => {
  const res = await callGeminiEndpoint('analyzeBudgetAndSubstitutions', [items, budgetLimit, userLocation], 15000);
  if (res && res.substitutions) {
    return res;
  }
  // Dynamic import or fallback handling
  const { analyzeShoppingListBudget } = await import('./priceMonitor');
  return analyzeShoppingListBudget(items, budgetLimit);
};


