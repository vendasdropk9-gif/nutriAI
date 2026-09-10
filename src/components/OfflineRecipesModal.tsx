import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  WifiOff, X, ChefHat, Clock, Flame, Utensils, 
  Trash2, Search, ArrowRight, BookOpen, CheckCircle2, 
  Download, Copy, Sparkles, AlertCircle 
} from 'lucide-react';
import { 
  getOfflineRecipes, 
  removeRecipeOffline, 
  SavedOfflineRecipe, 
  formatRecipeToPlainText 
} from '../lib/offlineRecipes';
import { RecipeCard } from './RecipeCard';
import { playSfx, vibrate } from '../lib/sensory';

interface OfflineRecipesModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialRecipeId?: string | null;
}

export const OfflineRecipesModal: React.FC<OfflineRecipesModalProps> = ({
  isOpen,
  onClose,
  initialRecipeId
}) => {
  const [recipes, setRecipes] = useState<SavedOfflineRecipe[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRecipe, setSelectedRecipe] = useState<SavedOfflineRecipe | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadRecipes = () => {
    const list = getOfflineRecipes();
    setRecipes(list);

    if (initialRecipeId) {
      const found = list.find(r => r.id === initialRecipeId);
      if (found) {
        setSelectedRecipe(found);
      }
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadRecipes();
    }
  }, [isOpen, initialRecipeId]);

  useEffect(() => {
    const handleUpdate = () => {
      loadRecipes();
    };

    window.addEventListener('app:offline-recipes-updated', handleUpdate);
    return () => window.removeEventListener('app:offline-recipes-updated', handleUpdate);
  }, []);

  const handleRemove = (recipe: SavedOfflineRecipe, e: React.MouseEvent) => {
    e.stopPropagation();
    playSfx('tap');
    vibrate(15);
    removeRecipeOffline(recipe.id, recipe.name);
    if (selectedRecipe?.id === recipe.id) {
      setSelectedRecipe(null);
    }
  };

  const handleCopyText = (recipe: SavedOfflineRecipe, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const text = formatRecipeToPlainText(recipe);
      navigator.clipboard.writeText(text);
      setCopiedId(recipe.id);
      playSfx('pop');
      vibrate(10);
      setTimeout(() => setCopiedId(null), 2500);
    } catch (err) {
      console.warn('Erro ao copiar receita:', err);
    }
  };

  const filtered = recipes.filter(r => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      r.name.toLowerCase().includes(term) ||
      (r.description && r.description.toLowerCase().includes(term)) ||
      (r.ingredients && r.ingredients.some(ing => ing.toLowerCase().includes(term)))
    );
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-[32px] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 bg-slate-50/70 dark:bg-slate-900/70 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 dark:bg-emerald-400/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
              <WifiOff className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                  Receitas Salvas para Offline
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                  {recipes.length} {recipes.length === 1 ? 'receita' : 'receitas'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Passo a passo completo e ingredientes acessíveis mesmo sem conexão à internet
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              playSfx('tap');
              onClose();
            }}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Fechar janela"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-6">
          {selectedRecipe ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
                <button
                  onClick={() => setSelectedRecipe(null)}
                  className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                >
                  ← Voltar para a lista de receitas salvas
                </button>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    Armazenada Localmente
                  </span>
                </div>
              </div>

              {/* Render Full Step-by-step RecipeCard */}
              <RecipeCard recipe={selectedRecipe} />
            </div>
          ) : (
            <>
              {/* Search Bar */}
              {recipes.length > 0 && (
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar entre receitas salvas offline por nome ou ingrediente..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      Limpar
                    </button>
                  )}
                </div>
              )}

              {/* Recipes Grid */}
              {filtered.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filtered.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => {
                        playSfx('tap');
                        setSelectedRecipe(item);
                      }}
                      className="group p-5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-emerald-500/40 dark:hover:border-emerald-500/40 bg-white dark:bg-slate-800/60 hover:bg-emerald-50/20 dark:hover:bg-emerald-950/10 transition-all shadow-sm hover:shadow-md cursor-pointer flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <h4 className="font-serif text-base sm:text-lg font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors leading-snug">
                            {item.name}
                          </h4>
                          <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                            <WifiOff className="w-2.5 h-2.5" />
                            Offline
                          </span>
                        </div>

                        {item.description && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-3">
                            {item.description}
                          </p>
                        )}

                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-300 mb-4">
                          <span className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-700/60 px-2.5 py-1 rounded-lg">
                            <Clock className="w-3.5 h-3.5 text-emerald-500" />
                            {item.prepTime || '30 min'}
                          </span>
                          <span className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-700/60 px-2.5 py-1 rounded-lg">
                            <Flame className="w-3.5 h-3.5 text-orange-500" />
                            {item.nutrition?.calories || 0} kcal
                          </span>
                          <span className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-700/60 px-2.5 py-1 rounded-lg">
                            <Utensils className="w-3.5 h-3.5 text-sky-500" />
                            {item.ingredients?.length || 0} ingredientes
                          </span>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => handleCopyText(item, e)}
                            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                            title="Copiar texto da receita"
                          >
                            {copiedId === item.id ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            onClick={(e) => handleRemove(item, e)}
                            className="p-2 rounded-xl text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                            title="Remover do armazenamento offline"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 group-hover:translate-x-0.5 transition-transform">
                          <span>Ver Passo a Passo</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : recipes.length > 0 ? (
                <div className="text-center py-12">
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Nenhuma receita encontrada para a busca "{searchTerm}".
                  </p>
                </div>
              ) : (
                <div className="text-center py-16 px-4 space-y-4 max-w-md mx-auto">
                  <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mx-auto">
                    <WifiOff className="w-8 h-8" />
                  </div>
                  <h4 className="font-serif text-lg font-bold text-slate-900 dark:text-white">
                    Nenhuma Receita Salva para Offline Ainda
                  </h4>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                    Você pode salvar qualquer receita no NutriAI para ter acesso ao modo de preparo completo, cronômetros e ingredientes mesmo quando estiver sem internet ou no modo avião.
                  </p>
                  <div className="p-3.5 bg-emerald-500/5 rounded-2xl border border-emerald-500/20 text-xs text-emerald-700 dark:text-emerald-300 font-medium text-left flex items-start gap-2.5">
                    <Sparkles className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>
                      <strong>Como salvar:</strong> Ao abrir qualquer receita gerada ou planejada, toque no botão <strong>"Salvar para Offline"</strong> no topo da receita.
                    </span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer info */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900/90 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 shrink-0">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            Armazenamento seguro local (PWA Offline)
          </span>
          <button
            onClick={() => {
              playSfx('tap');
              onClose();
            }}
            className="font-bold text-slate-700 dark:text-slate-200 hover:text-emerald-600 dark:hover:text-emerald-400"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
