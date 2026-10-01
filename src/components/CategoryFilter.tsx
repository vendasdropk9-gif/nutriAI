import React from 'react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { Sparkles, Leaf, Dumbbell, Zap, Flame, Check } from 'lucide-react';
import { Recipe } from '../types';
import { playSfx, vibrate } from '../lib/sensory';

export type RecipeCategoryTag = 'all' | 'vegan' | 'high_protein' | 'quick_prep' | 'low_carb';

export interface CategoryOption {
  id: RecipeCategoryTag;
  labelKey: string;
  defaultLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  activeBg: string;
  borderColor: string;
  description: string;
}

export const CATEGORY_OPTIONS: CategoryOption[] = [
  {
    id: 'all',
    labelKey: 'category_all',
    defaultLabel: 'Todas',
    icon: Sparkles,
    color: 'text-slate-600 dark:text-slate-300',
    activeBg: 'bg-emerald-500 text-white shadow-emerald-500/25',
    borderColor: 'border-emerald-500/30',
    description: 'Todas as receitas salvas'
  },
  {
    id: 'vegan',
    labelKey: 'category_vegan',
    defaultLabel: 'Vegano',
    icon: Leaf,
    color: 'text-emerald-600 dark:text-emerald-400',
    activeBg: 'bg-emerald-600 text-white shadow-emerald-600/25',
    borderColor: 'border-emerald-500/40',
    description: '100% à base de plantas'
  },
  {
    id: 'high_protein',
    labelKey: 'category_high_protein',
    defaultLabel: 'Hiperproteico',
    icon: Dumbbell,
    color: 'text-blue-600 dark:text-blue-400',
    activeBg: 'bg-blue-600 text-white shadow-blue-600/25',
    borderColor: 'border-blue-500/40',
    description: 'Foco em ganho de massa muscular (25g+ proteico)'
  },
  {
    id: 'quick_prep',
    labelKey: 'category_quick_prep',
    defaultLabel: 'Preparo Rápido',
    icon: Zap,
    color: 'text-amber-600 dark:text-amber-400',
    activeBg: 'bg-amber-500 text-white shadow-amber-500/25',
    borderColor: 'border-amber-500/40',
    description: 'Pronto em até 20 minutos'
  },
  {
    id: 'low_carb',
    labelKey: 'category_low_carb',
    defaultLabel: 'Low-Carb',
    icon: Flame,
    color: 'text-orange-600 dark:text-orange-400',
    activeBg: 'bg-orange-500 text-white shadow-orange-500/25',
    borderColor: 'border-orange-500/40',
    description: 'Baixo índice glicêmico e controle de carboidratos'
  }
];

export interface CategoryFilterProps {
  selectedCategory: RecipeCategoryTag;
  onSelectCategory: (category: RecipeCategoryTag) => void;
  recipeCounts?: Record<RecipeCategoryTag, number>;
  className?: string;
  size?: 'sm' | 'md';
  variant?: 'pills' | 'compact' | 'segmented';
}

/**
 * Filter recipes based on category tag
 */
export function filterRecipesByCategory(recipes: Recipe[], category: RecipeCategoryTag): Recipe[] {
  if (!recipes || !Array.isArray(recipes)) return [];
  if (category === 'all') return recipes;

  return recipes.filter((recipe) => {
    const nameLower = (recipe.name || recipe.title || '').toLowerCase();
    const descLower = (recipe.description || '').toLowerCase();
    const ingredientsLower = (recipe.ingredients || []).map(i => (typeof i === 'string' ? i.toLowerCase() : '')).join(' ');
    
    // Macro numbers
    const protein = recipe.nutrition?.protein ?? recipe.protein ?? 0;
    const carbs = recipe.nutrition?.carbs ?? recipe.carbs ?? 0;
    const calories = recipe.nutrition?.calories ?? recipe.calories ?? 0;

    // Prep time parse
    const prepStr = (recipe.prepTime || '').toLowerCase();
    const minutesMatch = prepStr.match(/(\d+)/);
    const minutes = minutesMatch ? parseInt(minutesMatch[1], 10) : 30;

    switch (category) {
      case 'vegan': {
        const nonVeganKeywords = [
          'frango', 'carne', 'peixe', 'atum', 'salmão', 'bife', 'porco', 'bacon',
          'camarão', 'ovo', 'ovos', 'leite', 'queijo', 'presunto', 'whey', 'iogurte',
          'manteiga', 'mel', 'beef', 'chicken', 'pork', 'fish', 'egg', 'cheese', 'milk'
        ];
        const isExplicitlyVegan = nameLower.includes('vegano') || nameLower.includes('vegana') || 
                                  descLower.includes('vegano') || descLower.includes('vegana') ||
                                  descLower.includes('vegan') || nameLower.includes('plant-based');
        if (isExplicitlyVegan) return true;

        const hasNonVegan = nonVeganKeywords.some(keyword => 
          nameLower.includes(keyword) || ingredientsLower.includes(keyword)
        );
        return !hasNonVegan;
      }

      case 'high_protein': {
        const isExplicitHighProtein = nameLower.includes('proteico') || nameLower.includes('proteica') ||
                                      nameLower.includes('hiperproteico') || descLower.includes('proteína') ||
                                      nameLower.includes('protein') || nameLower.includes('whey');
        if (isExplicitHighProtein) return true;
        if (protein >= 25) return true;
        if (calories > 0 && (protein * 4) / calories >= 0.25) return true;
        return false;
      }

      case 'quick_prep': {
        const isExplicitQuick = nameLower.includes('rápido') || nameLower.includes('rápida') ||
                                descLower.includes('rápido') || descLower.includes('express') ||
                                prepStr.includes('rápido') || prepStr.includes('5 min') ||
                                prepStr.includes('10 min') || prepStr.includes('15 min') || prepStr.includes('20 min');
        if (isExplicitQuick) return true;
        return minutes <= 20;
      }

      case 'low_carb': {
        const isExplicitLowCarb = nameLower.includes('low carb') || nameLower.includes('low-carb') ||
                                  nameLower.includes('baixo carbo') || descLower.includes('low carb') ||
                                  descLower.includes('cetogênica') || descLower.includes('keto');
        if (isExplicitLowCarb) return true;
        if (carbs > 0 && carbs <= 20) return true;
        if (calories > 0 && (carbs * 4) / calories <= 0.25) return true;
        return false;
      }

      default:
        return true;
    }
  });
}

/**
 * Calculate recipe counts per category
 */
export function getRecipeCategoryCounts(recipes: Recipe[]): Record<RecipeCategoryTag, number> {
  const counts: Record<RecipeCategoryTag, number> = {
    all: recipes?.length || 0,
    vegan: 0,
    high_protein: 0,
    quick_prep: 0,
    low_carb: 0
  };

  if (!recipes || !Array.isArray(recipes)) return counts;

  for (const tag of ['vegan', 'high_protein', 'quick_prep', 'low_carb'] as const) {
    counts[tag] = filterRecipesByCategory(recipes, tag).length;
  }

  return counts;
}

export function CategoryFilter({
  selectedCategory,
  onSelectCategory,
  recipeCounts,
  className = '',
  size = 'md',
  variant = 'pills'
}: CategoryFilterProps) {
  const { t } = useTranslation();

  const handleSelect = (category: RecipeCategoryTag) => {
    if (category !== selectedCategory) {
      playSfx('tap');
      vibrate(10);
      onSelectCategory(category);
    }
  };

  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 ${className}`}>
        {CATEGORY_OPTIONS.map((opt) => {
          const isSelected = selectedCategory === opt.id;
          const Icon = opt.icon;
          const count = recipeCounts ? recipeCounts[opt.id] : undefined;

          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => handleSelect(opt.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 shrink-0 border cursor-pointer ${
                isSelected
                  ? `${opt.activeBg} border-transparent shadow-sm scale-[1.02]`
                  : 'bg-white/70 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 border-slate-200/80 dark:border-slate-700/60 hover:bg-slate-100 dark:hover:bg-slate-700/60'
              }`}
              title={opt.description}
            >
              <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : opt.color}`} />
              <span>{t(opt.labelKey, opt.defaultLabel)}</span>
              {count !== undefined && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                  isSelected ? 'bg-white/25 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className={`w-full overflow-x-auto no-scrollbar py-1 ${className}`}>
      <div className="flex items-center gap-2 min-w-max p-1 bg-slate-100/80 dark:bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-200/60 dark:border-slate-800/60">
        {CATEGORY_OPTIONS.map((opt) => {
          const isSelected = selectedCategory === opt.id;
          const Icon = opt.icon;
          const count = recipeCounts ? recipeCounts[opt.id] : undefined;

          return (
            <motion.button
              whileTap={{ scale: 0.96 }}
              key={opt.id}
              type="button"
              onClick={() => handleSelect(opt.id)}
              className={`relative flex items-center gap-2 rounded-xl font-medium transition-all duration-200 cursor-pointer select-none ${
                size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-xs sm:text-sm'
              } ${
                isSelected
                  ? `${opt.activeBg} shadow-md border border-transparent font-bold`
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-800/60 border border-transparent'
              }`}
              title={opt.description}
            >
              <Icon className={`w-4 h-4 shrink-0 transition-transform ${isSelected ? 'text-white scale-110' : opt.color}`} />
              <span>{t(opt.labelKey, opt.defaultLabel)}</span>
              
              {count !== undefined && (
                <span className={`text-[10px] sm:text-xs font-mono font-bold px-1.5 py-0.5 rounded-full transition-colors ${
                  isSelected 
                    ? 'bg-white/25 text-white' 
                    : 'bg-slate-200/80 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                }`}>
                  {count}
                </span>
              )}

              {isSelected && (
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse hidden sm:inline-block ml-0.5" />
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
