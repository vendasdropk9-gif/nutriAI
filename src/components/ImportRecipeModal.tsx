import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Recipe } from '../types';
import { saveRecipeOffline } from '../lib/offlineRecipes';
import { playSfx, vibrate } from '../lib/sensory';
import confetti from 'canvas-confetti';
import {
  Download,
  X,
  Sparkles,
  Clock,
  Flame,
  Beef,
  Wheat,
  Droplet,
  CheckCircle2,
  ChefHat,
  Share2,
  BookOpen,
  ArrowRight
} from 'lucide-react';

interface ImportRecipeModalProps {
  recipe: Recipe | null;
  isOpen: boolean;
  onClose: () => void;
  onRecipeImported?: (recipe: Recipe) => void;
}

export const ImportRecipeModal: React.FC<ImportRecipeModalProps> = ({
  recipe,
  isOpen,
  onClose,
  onRecipeImported
}) => {
  const [isImporting, setIsImporting] = useState(false);
  const [activeTab, setActiveTab] = useState<'ingredients' | 'instructions'>('ingredients');

  if (!isOpen || !recipe) return null;

  const calories = recipe.nutrition?.calories ?? recipe.calories ?? 0;
  const protein = recipe.nutrition?.protein ?? recipe.protein ?? 0;
  const carbs = recipe.nutrition?.carbs ?? recipe.carbs ?? 0;
  const fat = recipe.nutrition?.fat ?? recipe.fat ?? 0;
  const fiber = recipe.nutrition?.fiber ?? 0;

  const handleImport = () => {
    setIsImporting(true);
    playSfx('success');
    vibrate([40, 60, 40]);

    try {
      // 1. Salvar offline para disponibilidade garantida sem internet
      saveRecipeOffline(recipe);

      // 2. Salvar também na lista geral de receitas salvas do usuário se existir no localStorage
      try {
        const raw = window.localStorage.getItem('nutri_saved_recipes');
        let list: any[] = [];
        if (raw) list = JSON.parse(raw);
        if (!list.some((r: any) => (r.id === recipe.id || r.name === recipe.name))) {
          list.unshift({
            ...recipe,
            savedAt: new Date().toISOString(),
            isImported: true
          });
          window.localStorage.setItem('nutri_saved_recipes', JSON.stringify(list));
        }
      } catch (e) {
        console.warn('Erro ao atualizar nutri_saved_recipes:', e);
      }

      // 3. Efeito festivo de sucesso
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.6 }
        });
      } catch (e) {}

      // 4. Notificar componente pai e fechar
      if (onRecipeImported) {
        onRecipeImported(recipe);
      }
    } finally {
      setIsImporting(false);
      onClose();
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="bg-white dark:bg-slate-900 border border-emerald-500/40 rounded-[32px] shadow-2xl w-full max-w-xl p-6 sm:p-8 space-y-6 text-slate-800 dark:text-slate-100 max-h-[92vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-start justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/30">
                <ChefHat className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-serif text-xl font-bold leading-tight text-slate-900 dark:text-white">
                    Refeição Compartilhada!
                  </h3>
                  <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 rounded-full border border-emerald-500/30">
                    NutriAI
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Você recebeu uma nova receita personalizada via link exclusivo.
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Recipe Highlight Card */}
          <div className="bg-gradient-to-br from-slate-50 to-emerald-50/30 dark:from-slate-800/80 dark:to-emerald-950/20 p-5 rounded-2xl border border-emerald-500/20 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="font-serif text-lg font-bold text-slate-900 dark:text-slate-100">
                  {recipe.name}
                </h4>
                {recipe.description && (
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 line-clamp-2">
                    {recipe.description}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {recipe.prepTime && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <Clock className="w-3.5 h-3.5 text-amber-500" />
                    {recipe.prepTime}
                  </span>
                )}
                {recipe.difficulty && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/40 px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-700 shadow-sm">
                    {recipe.difficulty}
                  </span>
                )}
              </div>
            </div>

            {/* Macros Grid */}
            <div className="grid grid-cols-4 gap-2 pt-1 text-center">
              <div className="bg-white/80 dark:bg-slate-900/80 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700/80 shadow-xs">
                <span className="text-[10px] uppercase font-bold text-orange-500 block flex items-center justify-center gap-1">
                  <Flame className="w-3 h-3" /> Calorias
                </span>
                <span className="text-sm font-black text-slate-800 dark:text-slate-100">{calories} kcal</span>
              </div>
              <div className="bg-white/80 dark:bg-slate-900/80 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700/80 shadow-xs">
                <span className="text-[10px] uppercase font-bold text-blue-500 block flex items-center justify-center gap-1">
                  <Beef className="w-3 h-3" /> Proteína
                </span>
                <span className="text-sm font-black text-blue-600 dark:text-blue-400">{protein}g</span>
              </div>
              <div className="bg-white/80 dark:bg-slate-900/80 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700/80 shadow-xs">
                <span className="text-[10px] uppercase font-bold text-amber-500 block flex items-center justify-center gap-1">
                  <Wheat className="w-3 h-3" /> Carbs
                </span>
                <span className="text-sm font-black text-amber-600 dark:text-amber-400">{carbs}g</span>
              </div>
              <div className="bg-white/80 dark:bg-slate-900/80 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700/80 shadow-xs">
                <span className="text-[10px] uppercase font-bold text-rose-500 block flex items-center justify-center gap-1">
                  <Droplet className="w-3 h-3" /> Gordura
                </span>
                <span className="text-sm font-black text-rose-600 dark:text-rose-400">{fat}g</span>
              </div>
            </div>
          </div>

          {/* Tabs for Ingredients vs Instructions */}
          <div className="space-y-3">
            <div className="flex border-b border-slate-200 dark:border-slate-800 gap-4 text-xs font-bold">
              <button
                onClick={() => setActiveTab('ingredients')}
                className={`pb-2.5 transition-colors border-b-2 cursor-pointer ${
                  activeTab === 'ingredients'
                    ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                    : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                Ingredientes ({recipe.ingredients?.length || 0})
              </button>
              <button
                onClick={() => setActiveTab('instructions')}
                className={`pb-2.5 transition-colors border-b-2 cursor-pointer ${
                  activeTab === 'instructions'
                    ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                    : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                Modo de Preparo ({recipe.instructions?.length || 0} passos)
              </button>
            </div>

            <div className="max-h-48 overflow-y-auto pr-2 space-y-2 text-xs">
              {activeTab === 'ingredients' ? (
                <ul className="space-y-1.5">
                  {(recipe.ingredients || []).map((ing, i) => (
                    <li key={i} className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                      <span>{ing}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <ol className="space-y-2">
                  {(recipe.instructions || []).map((step, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-slate-700 dark:text-slate-300 leading-relaxed">
                      <span className="w-5 h-5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              onClick={onClose}
              className="w-full sm:w-auto px-5 py-3 text-xs font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
            >
              Agora não
            </button>

            <button
              onClick={handleImport}
              disabled={isImporting}
              className="w-full sm:w-auto flex items-center justify-center gap-2 py-3 px-6 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-2xl font-bold text-xs sm:text-sm transition-all shadow-lg shadow-emerald-600/30 active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>{isImporting ? 'Importando...' : 'Importar e Salvar Receita'}</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
