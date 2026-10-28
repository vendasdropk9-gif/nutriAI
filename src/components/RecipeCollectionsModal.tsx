import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, X } from 'lucide-react';
import { Recipe } from '../types';
import { Collection } from '../types';

interface RecipeCollectionsModalProps {
  collections: Collection[];
  recipe: Recipe;
  onToggleRecipe: (collectionId: string, recipeId: string) => void;
  onClose: () => void;
}

export function RecipeCollectionsModal({
  collections,
  recipe,
  onToggleRecipe,
  onClose
}: RecipeCollectionsModalProps) {
  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-sm animate-in fade-in">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-white dark:bg-slate-900 rounded-[32px] p-6 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-bold text-slate-900 dark:text-white text-base">
                Organizar em Pastas
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-xs">
                {recipe.name || (recipe as any).title}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {collections.map(col => {
              const isAssigned = col.recipeIds.includes(recipe.id);
              return (
                <button
                  key={col.id}
                  type="button"
                  onClick={() => onToggleRecipe(col.id, recipe.id)}
                  className={`w-full flex items-center justify-between p-3 rounded-2xl text-xs font-bold transition-all border cursor-pointer ${
                    isAssigned
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-300'
                      : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/60 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-lg">{col.icon}</span>
                    <div className="text-left">
                      <p className="font-bold leading-tight">{col.name}</p>
                      {col.description && (
                        <p className="text-[10px] text-slate-400 line-clamp-1">{col.description}</p>
                      )}
                    </div>
                  </div>

                  <div className={`w-5 h-5 rounded-lg flex items-center justify-center border transition-all ${
                    isAssigned 
                      ? 'bg-emerald-600 border-emerald-600 text-white' 
                      : 'border-slate-300 dark:border-slate-600'
                  }`}>
                    {isAssigned && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider shadow-md cursor-pointer"
            >
              Concluir
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
