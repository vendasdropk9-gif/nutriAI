import React, { useMemo } from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { EmotionalLog, IntakeLog } from '../types';

interface CorrelationChartProps {
  logs: EmotionalLog[];
  intakeLogs: IntakeLog[];
}

const moodToValue: Record<string, number> = {
  feliz: 5,
  neutro: 3,
  cansado: 2,
  estressado: 1,
  ansioso: 1,
  triste: 0,
};

export function MoodMacronutrientCorrelationChart({ logs, intakeLogs }: CorrelationChartProps) {
  const data = useMemo(() => {
    const dailyData: Record<string, { mood: number; protein: number; carbs: number; fat: number }> = {};

    logs.forEach((log) => {
      const date = log.date.split('T')[0];
      if (!dailyData[date]) dailyData[date] = { mood: 3, protein: 0, carbs: 0, fat: 0 };
      dailyData[date].mood = moodToValue[log.mood.toLowerCase()] || 3;
    });

    intakeLogs.forEach((log) => {
      const date = log.date.split('T')[0];
      if (!dailyData[date]) dailyData[date] = { mood: 3, protein: 0, carbs: 0, fat: 0 };
      dailyData[date].protein += log.actual.protein;
      dailyData[date].carbs += log.actual.carbs;
      dailyData[date].fat += log.actual.fat;
    });

    return Object.entries(dailyData).map(([date, values]) => ({
      date,
      ...values,
    })).filter(d => d.protein > 0 || d.carbs > 0 || d.fat > 0);
  }, [logs, intakeLogs]);

  return (
    <div className="h-80 w-full">
      <h4 className="font-serif text-lg text-slate-800 dark:text-slate-100 font-medium mb-4">Correlação Humor vs Macronutrientes</h4>
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" dataKey="mood" name="Humor" domain={[0, 6]} tick={{ fontSize: 12 }} label={{ value: 'Humor (Triste -> Feliz)', position: 'bottom', offset: 0 }} />
          <YAxis type="number" dataKey="protein" name="Proteína" tick={{ fontSize: 12 }} label={{ value: 'Macros (g)', angle: -90, position: 'insideLeft' }} />
          <ZAxis type="number" range={[60, 400]} />
          <Tooltip cursor={{ strokeDasharray: '3 3' }} />
          <Legend />
          <Scatter name="Proteína" data={data} fill="#10b981" />
          <Scatter name="Carboidratos" data={data.map(d => ({ ...d, protein: d.carbs }))} fill="#f59e0b" />
          <Scatter name="Gorduras" data={data.map(d => ({ ...d, protein: d.fat }))} fill="#ef4444" />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
