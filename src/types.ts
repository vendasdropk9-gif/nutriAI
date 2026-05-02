export interface UserProfile {
  name: string;
  restrictions: string[];
  allergies: string[];
  goals: string;
  equipment: string[];
  weight?: number;
  height?: number;
  age?: number;
  activityLevel?: string;
  gender?: string;
  skinTone?: string;
  hairColor?: string;
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
