import React, { useState } from 'react';
import { Recipe } from '../types';
import { Clock, Flame, Info, ChevronDown, ChevronUp, LeafyGreen, Activity } from 'lucide-react';

interface RecipeCardProps {
  recipe: Recipe;
}

export function RecipeCard({ recipe }: RecipeCardProps) {
  const [isNutritionExpanded, setIsNutritionExpanded] = useState(false);
  const { nutrition } = recipe;

  return (
    <div className="bg-white/40 dark:bg-slate-800/40 backdrop-blur-xl rounded-[32px] overflow-hidden shadow-xl border border-white/60 dark:border-slate-700/50">
      <div className="bg-white/30 dark:bg-slate-800/30 p-8 md:p-12 border-b border-white/60 dark:border-slate-700/50">
        <h3 className="font-serif text-3xl md:text-4xl leading-tight mb-4 text-slate-800 dark:text-slate-100">
          {recipe.name}
        </h3>
        <p className="font-sans text-slate-500 dark:text-slate-400 text-lg max-w-2xl">
          {recipe.description}
        </p>
        
        <div className="flex flex-wrap gap-4 mt-8">
          <div className="flex items-center gap-2 bg-white/60 dark:bg-slate-800/60 px-4 py-2 rounded-full border border-white/60 dark:border-slate-600/50 shadow-sm text-sm font-medium text-slate-600 dark:text-slate-300">
            <Clock className="w-4 h-4 text-emerald-500" />
            {recipe.prepTime}
          </div>
          <div className="flex items-center gap-2 bg-white/60 dark:bg-slate-800/60 px-4 py-2 rounded-full border border-white/60 dark:border-slate-600/50 shadow-sm text-sm font-medium text-slate-600 dark:text-slate-300">
            <Flame className="w-4 h-4 text-orange-500" />
            {recipe.nutrition.calories} kcal
          </div>
          <div className="flex items-center gap-2 bg-white/60 dark:bg-slate-800/60 px-4 py-2 rounded-full border border-white/60 dark:border-slate-600/50 shadow-sm text-sm font-medium text-slate-600 dark:text-slate-300 lg:ml-auto">
            <Info className="w-4 h-4 text-sky-500" />
            P: {recipe.nutrition.protein}g • C: {recipe.nutrition.carbs}g • G: {recipe.nutrition.fat}g
          </div>
        </div>
      </div>

      <div className="p-8 md:p-12 grid grid-cols-1 md:grid-cols-3 gap-12 bg-white/20 dark:bg-slate-900/20">
        <div className="md:col-span-1 space-y-6">
          <h4 className="font-sans text-xs font-bold tracking-widest uppercase text-slate-400 dark:text-slate-500 border-b border-white/40 dark:border-slate-700/50 pb-4">
            Ingredientes
          </h4>
          <ul className="space-y-4">
            {recipe.ingredients.map((ing, idx) => (
              <li key={idx} className="flex gap-3 text-slate-600 dark:text-slate-300 font-medium">
                <span className="text-emerald-500">▹</span>
                <span className="leading-relaxed">{ing}</span>
              </li>
            ))}
          </ul>
        </div>
        
        <div className="md:col-span-2 space-y-6">
          <h4 className="font-sans text-xs font-bold tracking-widest uppercase text-slate-400 dark:text-slate-500 border-b border-white/40 dark:border-slate-700/50 pb-4">
            Modo de Preparo
          </h4>
          <div className="space-y-6">
            {recipe.instructions.map((step, idx) => (
              <div key={idx} className="flex gap-4 group">
                <div className="w-8 h-8 rounded-full bg-white/60 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border border-white/60 dark:border-slate-600/50 flex items-center justify-center font-serif text-lg flex-shrink-0 group-hover:bg-emerald-500 group-hover:text-white group-hover:border-emerald-500 transition-all">
                  {idx + 1}
                </div>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed pt-1">
                  {step}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-8 border-t border-white/40 dark:border-slate-700/50 pt-6">
            <button
              onClick={() => setIsNutritionExpanded(!isNutritionExpanded)}
              className="flex items-center gap-2 text-slate-500 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400 font-medium text-sm uppercase tracking-wide transition-colors"
            >
              <Activity className="w-4 h-4" />
              Detalhes Nutricionais
              {isNutritionExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            
            {isNutritionExpanded && (
              <div className="mt-6 bg-white/40 dark:bg-slate-800/40 border border-white/60 dark:border-slate-700/50 rounded-2xl p-6 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  {nutrition.fiber !== undefined && (
                    <div className="flex flex-col">
                      <span className="text-xs uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold mb-1">Fibras</span>
                      <span className="text-slate-700 dark:text-slate-200 font-medium text-lg">{nutrition.fiber}g</span>
                    </div>
                  )}
                  {nutrition.sugar !== undefined && (
                    <div className="flex flex-col">
                      <span className="text-xs uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold mb-1">Açúcares</span>
                      <span className="text-slate-700 dark:text-slate-200 font-medium text-lg">{nutrition.sugar}g</span>
                    </div>
                  )}
                </div>

                {(nutrition.vitamins || nutrition.minerals) && (
                  <div className="mt-6 flex flex-col md:flex-row gap-8 border-t border-white/40 dark:border-slate-700/50 pt-6">
                    {nutrition.vitamins && nutrition.vitamins.length > 0 && (
                      <div className="flex-1">
                         <span className="flex items-center gap-2 text-xs uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-bold mb-3">
                           <LeafyGreen className="w-3 h-3" />
                           Vitaminas Principais
                         </span>
                         <ul className="text-slate-600 dark:text-slate-300 space-y-1 text-sm font-medium">
                           {nutrition.vitamins.map((v, i) => <li key={i}>• {v}</li>)}
                         </ul>
                      </div>
                    )}
                    {nutrition.minerals && nutrition.minerals.length > 0 && (
                      <div className="flex-1">
                         <span className="flex items-center gap-2 text-xs uppercase tracking-wider text-sky-600 dark:text-sky-400 font-bold mb-3">
                           <Activity className="w-3 h-3" />
                           Minerais Principais
                         </span>
                         <ul className="text-slate-600 dark:text-slate-300 space-y-1 text-sm font-medium">
                           {nutrition.minerals.map((m, i) => <li key={i}>• {m}</li>)}
                         </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
