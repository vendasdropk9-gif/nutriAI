import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { UserProfile } from '../types';

interface NutritionalProgressRechartsRingProps {
  profile: UserProfile | null;
}

export const NutritionalProgressRechartsRing: React.FC<NutritionalProgressRechartsRingProps> = ({ profile }) => {
  const today = new Date().toISOString().split('T')[0];
  const todayLogs = profile?.intakeLogs?.filter(l => l.date && l.date.startsWith(today)) || [];

  const currentProtein = Math.round(todayLogs.reduce((acc, l) => acc + (l.actual?.protein || l.planned?.protein || 0), 0));
  const currentCarbs = Math.round(todayLogs.reduce((acc, l) => acc + (l.actual?.carbs || l.planned?.carbs || 0), 0));
  const currentFat = Math.round(todayLogs.reduce((acc, l) => acc + (l.actual?.fat || l.planned?.fat || 0), 0));

  const weight = profile?.weight || 70;
  const targetCalories = profile?.masterPlan?.dailyCalories || 2000;
  const targetProtein = Math.round(profile?.masterPlan?.macros?.protein || (weight * 1.7));
  const targetCarbs = Math.round(profile?.masterPlan?.macros?.carbs || ((targetCalories * 0.45) / 4));
  const targetFat = Math.round(profile?.masterPlan?.macros?.fat || ((targetCalories * 0.25) / 9));

  const data = [
    { name: 'Proteína', value: currentProtein, goal: targetProtein, color: '#10B981' },
    { name: 'Carbos', value: currentCarbs, goal: targetCarbs, color: '#F59E0B' },
    { name: 'Gorduras', value: currentFat, goal: targetFat, color: '#38BDF8' },
  ];

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            paddingAngle={5}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};
