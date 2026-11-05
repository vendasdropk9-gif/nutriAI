/**
 * Gamification & Points Utility Functions for NutriAI
 * Handles robust points aggregation, level calculation, progress percentage,
 * and history ledger creation for user profiles and auth sessions.
 */

export interface PointsHistoryEntry {
  id: string;
  date: string;
  amount: number;
  reason: string;
}

export interface LevelDetails {
  currentLevel: number;
  title: string;
  badgeColor: string;
  pointsInCurrentLevel: number;
  currentLevelBasePoints: number;
  nextLevelThreshold: number;
  progressPercent: number;
  pointsToNextLevel: number;
}

const POINTS_PER_LEVEL = 500;

/**
 * Calculates new total points safely, handling undefined/null/negative inputs.
 */
export function calculateTotalPoints(
  currentPoints: number | null | undefined,
  pointsToAdd: number
): number {
  const safeCurrent = typeof currentPoints === 'number' && !isNaN(currentPoints) ? currentPoints : 0;
  const safeAdd = typeof pointsToAdd === 'number' && !isNaN(pointsToAdd) ? Math.round(pointsToAdd) : 0;
  return Math.max(0, safeCurrent + safeAdd);
}

/**
 * Computes user level from accumulated points (1-indexed).
 * 0 - 499 pts => Level 1
 * 500 - 999 pts => Level 2
 * 1000 - 1499 pts => Level 3
 * etc.
 */
export function calculateLevelFromPoints(points: number | null | undefined): number {
  const safePoints = typeof points === 'number' && !isNaN(points) ? Math.max(0, points) : 0;
  return Math.floor(safePoints / POINTS_PER_LEVEL) + 1;
}

/**
 * Retrieves full level information, title, badge styling, and progress towards next level.
 */
export function calculateLevelProgress(points: number | null | undefined): LevelDetails {
  const safePoints = typeof points === 'number' && !isNaN(points) ? Math.max(0, points) : 0;
  const currentLevel = calculateLevelFromPoints(safePoints);
  
  const currentLevelBasePoints = (currentLevel - 1) * POINTS_PER_LEVEL;
  const nextLevelThreshold = currentLevel * POINTS_PER_LEVEL;
  const pointsInCurrentLevel = Math.max(0, safePoints - currentLevelBasePoints);
  const progressPercent = Math.min(100, Math.round((pointsInCurrentLevel / POINTS_PER_LEVEL) * 100));
  const pointsToNextLevel = Math.max(0, nextLevelThreshold - safePoints);

  let title = 'Iniciante';
  let badgeColor = 'text-slate-400 bg-slate-400/10';

  if (currentLevel === 2) {
    title = 'Intermediário';
    badgeColor = 'text-emerald-500 bg-emerald-500/10';
  } else if (currentLevel === 3) {
    title = 'Avançado';
    badgeColor = 'text-blue-500 bg-blue-500/10';
  } else if (currentLevel === 4) {
    title = 'Elite Fitness';
    badgeColor = 'text-purple-500 bg-purple-500/10';
  } else if (currentLevel >= 5) {
    title = 'Mestre NutriAI';
    badgeColor = 'text-amber-500 bg-amber-500/10';
  }

  return {
    currentLevel,
    title,
    badgeColor,
    pointsInCurrentLevel,
    currentLevelBasePoints,
    nextLevelThreshold,
    progressPercent,
    pointsToNextLevel,
  };
}

/**
 * Creates an immutable history entry for awarded points.
 */
export function createPointsHistoryEntry(
  amount: number,
  reason: string,
  timestamp?: string
): PointsHistoryEntry {
  return {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `pt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    date: timestamp || new Date().toISOString(),
    amount: Math.round(amount),
    reason: reason.trim() || 'Atividade Nutricional',
  };
}

/**
 * Calculates milestone bonuses (e.g. streaks, workout completions).
 */
export function calculateActivityBonus(
  activityType: 'meal_logged' | 'water_goal' | 'workout_done' | 'streak_7_days' | 'streak_30_days'
): number {
  switch (activityType) {
    case 'meal_logged':
      return 50;
    case 'water_goal':
      return 30;
    case 'workout_done':
      return 100;
    case 'streak_7_days':
      return 250;
    case 'streak_30_days':
      return 1000;
    default:
      return 10;
  }
}
