import { Recipe, UserProfile, MealPlanDay, EmotionalLog, SmartSwap, DiningOutAnalysis, GoalPrediction, WorkoutSession, Exercise, MasterPlanStrategy, IntakeLog, WorkoutLog, AdaptiveInsight, WeeklyChallenge, BloodPressureLog, BodyMonitorLog } from "../types";

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

export const textToSpeech = async (text: string): Promise<string | null> => {
  const cacheKey = `tts_v2_${text.substring(0, 50)}`;
  
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) return cached;
  } catch (e) {
    // ignore local storage errors
  }

  try {
    const base64Audio = await callGeminiEndpoint('textToSpeech', [text]);
    if (base64Audio) {
      try {
        localStorage.setItem(cacheKey, base64Audio);
      } catch (e) {
        // storage might be full
      }
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
  return callGeminiEndpoint('analyzePlate', [base64Image, mimeType, profile]);
};

export const generateJourneyMessage = async (profile: UserProfile, period: string): Promise<string> => {
  return callGeminiEndpoint('generateJourneyMessage', [profile, period]);
};

export const generateJuiceRecipe = async (
  profile: UserProfile | null,
  ingredients: string = "",
  budgetMode: boolean = false
): Promise<any> => {
  return callGeminiEndpoint('generateJuiceRecipe', [profile, ingredients, budgetMode]);
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


