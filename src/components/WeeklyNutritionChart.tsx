/* eslint-disable i18next/no-literal-string */
import React from 'react';
import { UserProfile } from '../types';
import { NutritionalDashboard } from './NutritionalDashboard';
import { WeeklyReport } from './WeeklyReport';

export { WeeklyReport, NutritionalDashboard };

interface WeeklyNutritionChartProps {
  profile?: UserProfile | null;
  onNavigate?: (tabId: string) => void;
}

export function WeeklyNutritionChart({ profile, onNavigate }: WeeklyNutritionChartProps = {}) {
  return <NutritionalDashboard profile={profile || null} />;
}
