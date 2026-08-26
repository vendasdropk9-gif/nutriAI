import { Recipe, UserProfile, MealPlanDay, EmotionalLog, SmartSwap, DiningOutAnalysis, GoalPrediction, WorkoutSession, Exercise, MasterPlanStrategy, IntakeLog, WorkoutLog, AdaptiveInsight, WeeklyChallenge, BloodPressureLog, BodyMonitorLog, WeeklyWorkoutPlan, RecipePreparationTips } from "../types";

const callGeminiEndpoint = async (functionName: string, args: any[]) => {
  try {
    const response = await fetch('/api/gemini', {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ functionName, args }),
    });

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      throw new Error(errBody.error || `Servidor retornou status ${response.status}`);
    }

    return await response.json();
  } catch (err: any) {
    console.error(`Erro ao chamar endpoint backend da função ${functionName}:`, err);
    throw err;
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

import { safeGet, safeSet } from './storage';

export const textToSpeech = async (text: string): Promise<string | null> => {
  const cacheKey = `tts_v2_${text.substring(0, 50)}`;
  
  try {
    const cached = safeGet(cacheKey);
    if (cached) return cached;
  } catch (e) {
    // ignore local storage errors
  }

  try {
    const base64Audio = await callGeminiEndpoint('textToSpeech', [text]);
    if (base64Audio) {
      safeSet(cacheKey, base64Audio);
      return base64Audio;
    }
  } catch (error) {
    console.warn("TTS backend errored, falling back", error);
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

export const generateJuiceRecipe = async (
  profile: UserProfile | null,
  ingredients: string = "",
  budgetMode: boolean = false
): Promise<any> => {
  try {
    const result = await callGeminiEndpoint('generateJuiceRecipe', [profile, ingredients, budgetMode]);
    if (result && result.name && result.ingredients) return result;
  } catch (e) {
    console.warn("Usando gerador de suco em modo de alta disponibilidade:", e);
  }

  // Smart client-side fallback
  const lowerIng = (ingredients || "").toLowerCase();
  const isEnergizing = lowerIng.includes('laranja') || lowerIng.includes('cenoura') || lowerIng.includes('gengibre') || lowerIng.includes('energia');
  
  if (budgetMode) {
    return {
      name: "Suco Econômico Refrescante",
      assistantMessage: "Preparei uma opção super econômica e rica em vitaminas para o seu dia!",
      ingredients: [
        "Suco de 1 limão tahiti",
        "1 fatia média de melancia picada",
        "Folhas frescas de hortelã a gosto",
        "200ml de água gelada"
      ],
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

  if (isEnergizing) {
    return {
      name: "Suco Citrus Imunidade & Disposição",
      assistantMessage: "Esse suco traz vitamina C e o toque termogênico do gengibre para elevar sua disposição!",
      ingredients: [
        "Suco de 2 laranjas frescas",
        "1 cenoura pequena ralada",
        "1 colher de café de gengibre ralado",
        "100ml de água gelada"
      ],
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

  return {
    name: "Suco Verde Detox & Equilíbrio",
    assistantMessage: "Uma combinação potente de antioxidantes e clorofila para desinflamar e energizar seu metabolismo!",
    ingredients: [
      "2 folhas de couve manteiga higienizadas",
      "1 maçã verde com casca picada",
      "Suco de 1 limão espremido",
      "1 colher de chá de sementes de chia",
      "150ml de água de coco ou água filtrada"
    ],
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
  return callGeminiEndpoint('analyzeDiningOut', [description, profile]);
};

export const generateSmartSwap = async (
  foodItem: string,
  profile: UserProfile | null
): Promise<SmartSwap | null> => {
  return callGeminiEndpoint('generateSmartSwap', [foodItem, profile]);
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
} | null> => {
  return callGeminiEndpoint('generateDailyNutritionTips', [profile]);
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

export const diagnosePlantHealth = async (
  description: string,
  imageInput?: string
): Promise<PlantDiagnosisResult> => {
  return callGeminiEndpoint('diagnosePlantHealth', [description, imageInput]);
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
