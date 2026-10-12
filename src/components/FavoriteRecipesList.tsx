import React from 'react';
import { Heart, Clock, Utensils } from 'lucide-react';
import { Recipe } from '../types';

interface FavoriteRecipesListProps {
  recipes: Recipe[];
  onRemoveFavorite: (id: string) => void;
}

export function FavoriteRecipesList({ recipes, onRemoveFavorite }: FavoriteRecipesListProps) {
  if (!recipes || recipes.length === 0) {
    return (
      <div className="text-center p-6 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
        <Heart className="w-8 h-8 text-slate-400 mx-auto mb-2" />
        <p className="text-slate-500 text-sm">Nenhuma receita favorita ainda.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {recipes.map((recipe) => (
        <div key={recipe.id} className="flex items-center gap-4 p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
          <img src={recipe.imageUrl || recipe.image} alt={recipe.name} className="w-16 h-16 rounded-lg object-cover" />
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-slate-800 dark:text-slate-100 truncate">{recipe.name}</h4>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Clock className="w-3 h-3" /> {recipe.prepTime}
              <span className="mx-1">•</span>
              <Utensils className="w-3 h-3" /> {recipe.nutrition.calories} kcal
            </div>
          </div>
          <button 
            onClick={() => onRemoveFavorite(recipe.id)}
            className="text-red-500 hover:text-red-600 p-2"
          >
            <Heart className="w-5 h-5 fill-current" />
          </button>
        </div>
      ))}
    </div>
  );
}
