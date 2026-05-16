export type BodyType = 'Ectomorfo' | 'Mesomorfo' | 'Endomorfo';
export type MetabolismSpeed = 'Lento' | 'Moderado' | 'Acelerado';

export interface IntakeLog {
  id: string;
  date: string; // ISO
  mealId: string;
  recipeName: string;
  planned: NutritionInfo;
  actual: NutritionInfo;
  adjusted: boolean; // If IA adjusted later meals based on this
}

export interface ProgressLog {
  id: string;
  date: string;
  weight: number;
  bodyFat?: number;
  notes?: string;
}

export interface MasterPlanStrategy {
  dailyCalories: number;
  macros: {
    protein: number;
    carbs: number;
    fat: number;
  };
  workoutFocus: string;
  nutritionFocus: string;
  adaptiveNotes: string;
}

export interface AdaptiveInsight {
  id: string;
  date: string;
  type: 'macro_adjustment' | 'workout_adaptation' | 'habit_nudge';
  recommendation: string;
  reasoning: string;
  changes?: Partial<MasterPlanStrategy>;
  status: 'pending' | 'applied' | 'dismissed';
}

export interface WorkoutLog {
  id: string;
  date: string; // ISO
  completed: boolean;
  durationMinutes: number;
  intensity: 'Leve' | 'Moderado' | 'Intenso';
}

export interface BehavioralProfile {
  preferredMealComplexity?: 'Baixa' | 'Média' | 'Alta';
  workoutConsistency?: number; // 0-100%
  dietConsistency?: number; // 0-100%
  motivationStyle?: 'Firme' | 'Acolhedor' | 'Descontraído';
}

export interface WeeklyChallenge {
  id: string;
  title: string;
  description: string;
  target: number;
  current: number;
  type: 'water' | 'protein' | 'workout' | 'steps';
  rewardPoints: number;
  completed: boolean;
  expiresAt: string;
}

export interface UserProfile {
  name: string;
  email?: string;
  createdAt?: string;
  updatedAt?: string;
  photoURL?: string;
  preferences?: string;
  restrictions: string[];
  allergies: string[];
  goals: string;
  equipment: string[];
  weight?: number;
  height?: number;
  age?: number;
  activityLevel?: string;
  gender?: string;
  targetWeight?: number;
  skinTone?: string;
  hairColor?: string;
  bodyType?: BodyType;
  metabolism?: MetabolismSpeed;
  routine?: string;
  emotionalLogs?: EmotionalLog[];
  currentChallenge?: Challenge;
  weeklyChallenges?: WeeklyChallenge[];
  waterGoal?: number; // in ml
  hydrationLogs?: HydrationLog[];
  points?: number;
  pointsHistory?: PointsEntry[];
  streak?: number;
  lastActiveDate?: string;
  badges?: string[];
  prediction?: GoalPrediction;
  currentWorkout?: WorkoutSession;
  cart?: CartItem[];
  favorites?: string[]; // Array of product IDs
  intakeLogs?: IntakeLog[];
  progressLogs?: ProgressLog[];
  masterPlan?: MasterPlanStrategy;
  workoutLogs?: WorkoutLog[];
  behavioralProfile?: BehavioralProfile;
  mealPlan?: MealPlan;
  savedRecipes?: Recipe[];
  sleepLogs?: SleepLog[];
  fastingLogs?: FastingLog[];
}

export interface StoreTag {
  label: string;
  type: 'frescor' | 'preco' | 'proximidade' | 'promocao';
  color: string;
}

export interface FreshnessStore extends MarketPartner {
  coordinates: { lat: number; lng: number }; 
  freshnessScore: number; // 0-10
  priceLevel: 1 | 2 | 3; // 1 = $, 2 = $$, 3 = $$$
  tags: StoreTag[];
  aiAnalysis: string;
  assistantMessage: string;
  openingHours: string;
  phone: string;
  address: string;
}

export interface MarketPartner {
  id: string;
  name: string;
  rating: number;
  deliveryTime: string;
  minOrder: number;
  image: string;
  distance: string;
}

export interface ProductReview {
  id: string;
  userName: string;
  rating: number;
  comment: string;
  date: string;
}

export interface Product {
  id: string;
  name: string;
  category: 'Frutas' | 'Verduras' | 'Legumes' | 'Kits';
  price: number;
  unit: string;
  image: string;
  isOrganic?: boolean;
  isSeasonal?: boolean;
  description: string;
  rating?: number;
  reviewCount?: number;
  reviews?: ProductReview[];
}

export interface CartItem extends Product {
  quantity: number;
}

export interface TutorialStep {
  title: string;
  description: string;
  animationState: 'idle' | 'executing' | 'tutorial';
  cameraView: 'front' | 'side' | 'detail';
}

export interface CommonError {
  error: string;
  fix: string;
}

export interface Exercise {
  id: string;
  name: string;
  description: string;
  muscleGroups: string[];
  primaryMuscles: string[]; // For highlighting
  difficulty: 'Iniciante' | 'Intermediário' | 'Avançado';
  reps?: number;
  duration?: number; // seconds
  instructions: string[];
  benefits: string;
  tutorialSteps?: TutorialStep[];
  commonErrors?: CommonError[];
}

export interface WorkoutSession {
  id: string;
  title: string;
  exercises: Exercise[];
  totalCalories: number;
  estimatedDuration: number; // minutes
}

export interface GoalPrediction {
  estimatedDays: number;
  estimatedDate: string;
  confidenceScore: number;
  motivationalMessage: string;
}

export interface PointsEntry {
  id: string;
  date: string;
  amount: number;
  reason: string;
}

export interface HydrationLog {
  id: string;
  date: string; // ISO
  amount: number; // in ml
}

export interface SleepLog {
  id: string;
  date: string; // ISO
  durationHours: number;
  quality: 'Péssimo' | 'Ruim' | 'Regular' | 'Bom' | 'Excelente';
}

export interface FastingLog {
  id: string;
  date: string; // ISO
  durationHours: number;
}

export interface Challenge {
  type: 7 | 15 | 30;
  startDate: string;
  completedDays: number;
  dailyGoal: string;
  history: {
    day: number;
    date: string;
    completed: boolean;
    feedback?: string;
  }[];
}

export interface SmartSwap {
  original: string;
  substitute: string;
  reason: string;
  benefits: string[];
  assistantMessage: string;
}

export interface DiningOutAnalysis {
  dish: string;
  estimatedCalories: number;
  macros: { protein: string; carbs: string; fats: string };
  verdict: string; // "Escolha Inteligente", "Moderado", "Excesso"
  tips: string[];
  betterAlternative?: string;
  assistantMessage: string;
}

export interface EmotionalLog {
  id: string;
  date: string; // ISO
  mood: string;
  trigger?: string;
  mealType?: string;
}

export interface Ingredient {
  id: string;
  name: string;
  amount?: string;
  checked?: boolean;
}

export interface NutritionInfo {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  vitamins?: string[];
  minerals?: string[];
}

export interface Recipe {
  id: string;
  name: string;
  description: string;
  prepTime: string;
  ingredients: string[];
  instructions: string[];
  nutrition: NutritionInfo;
}

export interface MealPlanDay {
  date: string; // ISO date string or Day Name
  meals: {
    breakfast?: Recipe;
    lunch?: Recipe;
    dinner?: Recipe;
    snack?: Recipe;
  };
}

export interface MealPlan {
  [date: string]: MealPlanDay;
}

export interface PlateAnalysisResult {
  foods: string[];
  nutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
  };
  assistantMessage: string;
  suggestions: string[];
}
