/* eslint-disable i18next/no-literal-string */
import React from 'react';
import { UserProfile } from '../types';
import { WeeklyReport } from './WeeklyReport';

export { WeeklyReport };

interface WeeklyNutritionChartProps {
  profile?: UserProfile | null;
  onNavigate?: (tabId: string) => void;
}

export function WeeklyNutritionChart({ profile, onNavigate }: WeeklyNutritionChartProps = {}) {
  return <WeeklyReport profile={profile || null} onNavigate={onNavigate} />;
}
