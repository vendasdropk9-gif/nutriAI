import { useMemo } from 'react';
import { UserProfile } from '../types';

export interface DailyNutritionSummary {
  // Current consumption values
  currentCalories: number;
  currentProtein: number;
  currentCarbs: number;
  currentFat: number;
  currentWater: number;

  // Goal / Target values
  targetCalories: number;
  targetProtein: number;
  targetCarbs: number;
  targetFat: number;
  targetWater: number;

  // Remaining values
  remainingCalories: number;
  remainingProtein: number;
  remainingCarbs: number;
  remainingFat: number;
  remainingWater: number;

  // Progress percentages (0 - 100%)
  caloriesPercent: number;
  proteinPercent: number;
  carbsPercent: number;
  fatPercent: number;
  waterPercent: number;

  // Status flags
  isCaloriesMet: boolean;
  isProteinMet: boolean;
  isWaterMet: boolean;

  // Log counts
  mealCountToday: number;
  hydrationCountToday: number;
  dateStr: string;
}

/**
 * Custom Hook: useNutritionGoals
 *
 * Efficiently computes, aggregates, and memoizes daily nutrition summaries
 * (calories, protein, carbs, fat, and hydration) for a given date string.
 *
 * @param profile - The user profile object containing intakeLogs, hydrationLogs, macroTargets, and masterPlan.
 * @param targetDate - Optional date string YYYY-MM-DD. Defaults to today's local date.
 */
export function useNutritionGoals(
  profile: UserProfile | null,
  targetDate?: string
): DailyNutritionSummary {
  const dateStr = useMemo(() => {
    return targetDate || new Date().toISOString().split('T')[0];
  }, [targetDate]);

  return useMemo(() => {
    // 1. Filter today's intake logs efficiently
    const intakeLogs = profile?.intakeLogs || [];
    const todayIntakeLogs = intakeLogs.filter(log => log.date && log.date.startsWith(dateStr));

    const currentCalories = Math.round(
      todayIntakeLogs.reduce((acc, log) => acc + (log.actual?.calories || log.planned?.calories || 0), 0)
    );
    const currentProtein = Math.round(
      todayIntakeLogs.reduce((acc, log) => acc + (log.actual?.protein || log.planned?.protein || 0), 0)
    );
    const currentCarbs = Math.round(
      todayIntakeLogs.reduce((acc, log) => acc + (log.actual?.carbs || log.planned?.carbs || 0), 0)
    );
    const currentFat = Math.round(
      todayIntakeLogs.reduce((acc, log) => acc + (log.actual?.fat || log.planned?.fat || 0), 0)
    );

    // 2. Filter today's hydration logs efficiently
    const hydrationLogs = profile?.hydrationLogs || [];
    const todayHydrationLogs = hydrationLogs.filter(log => log.date && log.date.startsWith(dateStr));

    const currentWater = todayHydrationLogs.reduce((acc, log) => acc + (log.amount || 0), 0);

    // 3. Resolve targets from profile configuration or calculate adaptive defaults
    const weight = profile?.weight || 70;
    const targetCalories = Math.round(
      profile?.macroTargets?.calories || 
      profile?.masterPlan?.dailyCalories || 
      2000
    );

    const isHypertrophy = (profile?.goals || '').toLowerCase().includes('hipertrofia') || 
                          (profile?.goals || '').toLowerCase().includes('massa');

    const targetProtein = Math.round(
      profile?.macroTargets?.protein || 
      profile?.masterPlan?.macros?.protein || 
      (isHypertrophy ? weight * 2.0 : weight * 1.7)
    );

    const targetCarbs = Math.round(
      profile?.macroTargets?.carbs || 
      profile?.masterPlan?.macros?.carbs || 
      ((targetCalories * 0.45) / 4)
    );

    const targetFat = Math.round(
      profile?.macroTargets?.fat || 
      profile?.masterPlan?.macros?.fat || 
      ((targetCalories * 0.25) / 9)
    );

    const targetWater = profile?.waterGoal || 2500;

    // 4. Calculate progress percentages
    const caloriesPercent = Math.min(100, Math.round((currentCalories / (targetCalories || 1)) * 100));
    const proteinPercent = Math.min(100, Math.round((currentProtein / (targetProtein || 1)) * 100));
    const carbsPercent = Math.min(100, Math.round((currentCarbs / (targetCarbs || 1)) * 100));
    const fatPercent = Math.min(100, Math.round((currentFat / (targetFat || 1)) * 100));
    const waterPercent = Math.min(100, Math.round((currentWater / (targetWater || 1)) * 100));

    // 5. Calculate remaining values
    const remainingCalories = Math.max(0, targetCalories - currentCalories);
    const remainingProtein = Math.max(0, targetProtein - currentProtein);
    const remainingCarbs = Math.max(0, targetCarbs - currentCarbs);
    const remainingFat = Math.max(0, targetFat - currentFat);
    const remainingWater = Math.max(0, targetWater - currentWater);

    return {
      currentCalories,
      currentProtein,
      currentCarbs,
      currentFat,
      currentWater,

      targetCalories,
      targetProtein,
      targetCarbs,
      targetFat,
      targetWater,

      remainingCalories,
      remainingProtein,
      remainingCarbs,
      remainingFat,
      remainingWater,

      caloriesPercent,
      proteinPercent,
      carbsPercent,
      fatPercent,
      waterPercent,

      isCaloriesMet: currentCalories >= targetCalories,
      isProteinMet: currentProtein >= targetProtein,
      isWaterMet: currentWater >= targetWater,

      mealCountToday: todayIntakeLogs.length,
      hydrationCountToday: todayHydrationLogs.length,
      dateStr
    };
  }, [
    profile?.intakeLogs,
    profile?.hydrationLogs,
    profile?.macroTargets,
    profile?.masterPlan,
    profile?.weight,
    profile?.goals,
    profile?.waterGoal,
    dateStr
  ]);
}

export default useNutritionGoals;
