import React from 'react';
import { Recipe } from '../types';

export type RecipeCategoryTag = 'all' | 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'low_carb' | 'high_protein' | 'vegetarian' | 'quick';

interface CategoryFilterProps {
  selectedCategory: RecipeCategoryTag;
  onSelectCategory: (cat: RecipeCategoryTag) => void;
  recipes?: Recipe[];
  recipeCounts?: Record<string, number>;
  variant?: string;
  size?: string;
}

export function getRecipeCategoryCounts(recipes: Recipe[]) {
  const counts: Record<string, number> = { all: recipes.length };
  recipes.forEach(r => {
    const tags = (r as any).tags || [];
    tags.forEach((t: string) => {
      counts[t] = (counts[t] || 0) + 1;
    });
  });
  return counts;
}

export function filterRecipesByCategory(recipes: Recipe[], category: RecipeCategoryTag): Recipe[] {
  if (category === 'all') return recipes;
  return recipes.filter(r => {
    const tags = (r as any).tags || [];
    if (tags.includes(category)) return true;
    if (category === 'low_carb' && (r.carbs || 0) < 20) return true;
    if (category === 'high_protein' && (r.protein || 0) > 25) return true;
    return false;
  });
}

export function CategoryFilter({ selectedCategory, onSelectCategory, recipes }: CategoryFilterProps) {
  const categories: Array<{ id: RecipeCategoryTag; label: string }> = [
    { id: 'all', label: 'Todas' },
    { id: 'breakfast', label: 'Café da Manhã' },
    { id: 'lunch', label: 'Almoço' },
    { id: 'dinner', label: 'Jantar' },
    { id: 'snack', label: 'Lanches' },
    { id: 'low_carb', label: 'Low Carb' },
    { id: 'high_protein', label: 'Alto Proteína' },
    { id: 'quick', label: 'Rápidas' }
  ];

  return (
    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-2 px-1">
      {categories.map(cat => {
        const isSelected = selectedCategory === cat.id;
        return (
          <button
            key={cat.id}
            onClick={() => onSelectCategory(cat.id)}
            className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer ${
              isSelected
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 ring-2 ring-emerald-400/50'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
            }`}
          >
            {cat.label}
          </button>
        );
      })}
    </div>
  );
}
