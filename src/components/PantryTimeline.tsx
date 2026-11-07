import React, { useMemo } from 'react';
import { PantryItem } from '../types';
import { calculatePantryDaysRemaining } from '../hooks/usePantrySpoilageChecker';

export const PantryTimeline = ({ items }: { items: PantryItem[] }) => {
  const sortedItems = useMemo(() => {
    return items
      .map(item => ({
        ...item,
        daysRemaining: calculatePantryDaysRemaining(item.expirationDate)
      }))
      .filter(item => item.daysRemaining <= 14) // Focus on items expiring within 2 weeks
      .sort((a, b) => a.daysRemaining - b.daysRemaining);
  }, [items]);

  if (sortedItems.length === 0) return null;

  return (
    <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border border-slate-200 dark:border-slate-700 rounded-[24px] p-6 shadow-sm mb-6">
      <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Linha do Tempo de Validade</h3>
      <div className="relative flex items-center justify-between gap-2 overflow-x-auto pb-4">
        {sortedItems.map((item, index) => {
          const isExpiringSoon = item.daysRemaining <= 2;
          const barColor = isExpiringSoon ? 'bg-rose-500' : 'bg-amber-500';
          return (
            <div key={item.id} className="flex flex-col items-center min-w-[80px]">
              <div className={`w-3 h-3 rounded-full mb-2 ${isExpiringSoon ? 'bg-rose-500' : 'bg-amber-500'}`} />
              <div className="text-[10px] font-bold text-slate-700 dark:text-slate-300 truncate max-w-[70px]">
                {item.name}
              </div>
              <div className={`text-[10px] font-medium ${isExpiringSoon ? 'text-rose-600' : 'text-amber-600'}`}>
                {item.daysRemaining <= 0 ? 'Vence hoje' : `${item.daysRemaining}d`}
              </div>
              {index < sortedItems.length - 1 && (
                <div className="absolute top-[6px] h-0.5 bg-slate-200 dark:bg-slate-700 -z-10" style={{ left: `${(index + 1) * 80 + 20}px`, right: `${(sortedItems.length - index - 2) * 80 + 50}px` }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
