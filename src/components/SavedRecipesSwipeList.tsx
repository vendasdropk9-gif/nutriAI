import React, { useState, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'motion/react';
import { 
  BookmarkCheck, Trash2, Eye, ChefHat, Clock, Flame, 
  RotateCcw, X, Search, Sparkles, Utensils, MoveHorizontal, ArrowLeftRight
} from 'lucide-react';
import { Recipe, UserProfile } from '../types';
import { RecipeCard } from './RecipeCard';
import { playSfx, vibrate } from '../lib/sensory';
import { useTranslation } from '../contexts/LanguageContext';

interface SavedRecipesSwipeListProps {
  profile: UserProfile | null;
  onSaveProfile: (profile: UserProfile) => void;
}

interface SwipeableRecipeItemProps {
  recipe: Recipe;
  onDismiss: (recipe: Recipe) => void;
  onOpen: (recipe: Recipe) => void;
}

function SwipeableRecipeItem({ recipe, onDismiss, onOpen }: SwipeableRecipeItemProps) {
  const { t } = useTranslation();
  const x = useMotionValue(0);
  const isDraggingRef = useRef(false);

  // Background action reveal transforms
  const bgLeftOpacity = useTransform(x, [-110, -30, 0], [1, 0.7, 0]);
  const bgRightOpacity = useTransform(x, [0, 30, 110], [0, 0.7, 1]);
  const deleteScale = useTransform(x, [-130, -50, 0], [1.15, 1, 0.75]);
  const openScale = useTransform(x, [0, 50, 130], [0.75, 1, 1.15]);

  const calories = recipe.nutrition?.calories || recipe.calories || 0;
  const prepTime = recipe.prepTime || '25 min';
  const recipeImage = recipe.image || recipe.imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=300&h=300';

  const handleDragEnd = (_: any, info: { offset: { x: number }; velocity: { x: number } }) => {
    // Small threshold check to avoid treating tiny drags as gestures
    if (info.offset.x < -95 || info.velocity.x < -320) {
      playSfx('pop');
      vibrate(22);
      onDismiss(recipe);
    } else if (info.offset.x > 95 || info.velocity.x > 320) {
      playSfx('tap');
      vibrate(12);
      onOpen(recipe);
    }
    setTimeout(() => {
      isDraggingRef.current = false;
    }, 50);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{
        opacity: 0,
        x: -300,
        height: 0,
        marginBottom: 0,
        paddingTop: 0,
        paddingBottom: 0,
        overflow: 'hidden',
        transition: {
          opacity: { duration: 0.2 },
          x: { duration: 0.25 },
          height: { duration: 0.25, delay: 0.08 },
          marginBottom: { duration: 0.25, delay: 0.08 }
        }
      }}
      className="relative mb-3.5 select-none"
    >
      {/* Background Actions Reveal Layer */}
      <div className="absolute inset-0 rounded-2xl overflow-hidden flex items-center justify-between pointer-events-none shadow-inner">
        {/* Right Swipe: Open / View Recipe */}
        <motion.div
          style={{ opacity: bgRightOpacity }}
          className="w-full h-full bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 flex items-center justify-start pl-5 text-white"
        >
          <motion.div style={{ scale: openScale }} className="flex items-center gap-2 font-bold text-xs">
            <div className="p-2 bg-white/20 rounded-full backdrop-blur-sm">
              <Eye className="w-4 h-4 text-white" />
            </div>
            <span>{t('open_recipe', 'Visualizar Receita')}</span>
          </motion.div>
        </motion.div>

        {/* Left Swipe: Dismiss / Remove Recipe */}
        <motion.div
          style={{ opacity: bgLeftOpacity }}
          className="absolute inset-0 bg-gradient-to-l from-rose-600 via-red-600 to-rose-500 flex items-center justify-end pr-5 text-white"
        >
          <motion.div style={{ scale: deleteScale }} className="flex items-center gap-2 font-bold text-xs">
            <span>{t('remove_recipe', 'Remover')}</span>
            <div className="p-2 bg-white/20 rounded-full backdrop-blur-sm">
              <Trash2 className="w-4 h-4 text-white" />
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* Swipeable Card Foreground */}
      <motion.div
        style={{ x }}
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.65}
        onDragStart={() => {
          isDraggingRef.current = true;
        }}
        onDragEnd={handleDragEnd}
        onClick={() => {
          if (!isDraggingRef.current) {
            playSfx('tap');
            vibrate(10);
            onOpen(recipe);
          }
        }}
        className="relative z-10 w-full p-4 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200/90 dark:border-slate-700/80 shadow-sm hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing flex items-center gap-4 group"
      >
        {/* Recipe Thumbnail */}
        <div className="relative w-16 h-16 sm:w-18 sm:h-18 rounded-xl overflow-hidden shrink-0 border border-slate-100 dark:border-slate-700 shadow-inner">
          <img 
            src={recipeImage} 
            alt={recipe.name || recipe.title || 'Receita'} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
          {calories > 0 && (
            <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded-md bg-slate-900/80 backdrop-blur-xs text-[10px] font-bold text-emerald-400">
              {calories} kcal
            </div>
          )}
        </div>

        {/* Recipe Details */}
        <div className="flex-1 min-w-0">
          <h4 className="font-serif font-bold text-sm sm:text-base text-slate-800 dark:text-slate-100 truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
            {recipe.name || recipe.title || 'Receita Nutritiva'}
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
            {recipe.description || (recipe.ingredients && recipe.ingredients.slice(0, 3).join(', ')) || 'Receita personalizada da NutriAI'}
          </p>

          <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-emerald-500" />
              {prepTime}
            </span>
            {recipe.difficulty && (
              <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                {recipe.difficulty}
              </span>
            )}
            <span className="hidden sm:inline-flex items-center gap-1 text-slate-400">
              <ChefHat className="w-3.5 h-3.5" />
              {recipe.ingredients?.length || 0} ing.
            </span>
          </div>
        </div>

        {/* Swipe Indicators Hint */}
        <div className="flex flex-col items-center justify-center shrink-0 pl-1 text-slate-300 dark:text-slate-600 group-hover:text-emerald-500 transition-colors">
          <ArrowLeftRight className="w-4 h-4" />
          <span className="text-[9px] uppercase tracking-wider font-bold mt-0.5 hidden sm:block">
            Swipe
          </span>
        </div>
      </motion.div>
    </motion.div>
  );
}

export function SavedRecipesSwipeList({ profile, onSaveProfile }: SavedRecipesSwipeListProps) {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [lastDismissed, setLastDismissed] = useState<{ recipe: Recipe; index: number } | null>(null);

  const savedRecipes = profile?.savedRecipes || [];

  const handleDismissRecipe = (recipeToDismiss: Recipe) => {
    const currentIndex = savedRecipes.findIndex(r => r.id === recipeToDismiss.id);
    const updatedRecipes = savedRecipes.filter(r => r.id !== recipeToDismiss.id);

    setLastDismissed({ recipe: recipeToDismiss, index: currentIndex >= 0 ? currentIndex : 0 });
    onSaveProfile({
      ...profile!,
      savedRecipes: updatedRecipes
    });
  };

  const handleUndoDismiss = () => {
    if (!lastDismissed) return;
    playSfx('success');
    vibrate(15);
    const restored = [...savedRecipes];
    restored.splice(lastDismissed.index, 0, lastDismissed.recipe);
    onSaveProfile({
      ...profile!,
      savedRecipes: restored
    });
    setLastDismissed(null);
  };

  const handleAddSampleRecipe = () => {
    playSfx('pop');
    vibrate(12);
    const sampleRecipe: Recipe = {
      id: 'sample-' + Date.now(),
      name: 'Salmão Grelhado com Quinoa e Legumes ao Vapor',
      description: 'Prato rico em ômega-3, fibras e gorduras boas com preparo prático e alta densidade nutritiva.',
      prepTime: '20 min',
      difficulty: 'Fácil',
      calories: 420,
      protein: 38,
      carbs: 28,
      fat: 16,
      ingredients: [
        '1 filé de salmão fresco (180g)',
        '1/2 xícara de quinoa cozida',
        '1 xícara de brócolis ao vapor',
        '1 colher de sopa de azeite extravirgem',
        'Suco de 1/2 limão e ervas finas'
      ],
      instructions: [
        'Tempere o salmão com limão, sal marinho e ervas finas.',
        'Grelhe o salmão em frigideira quente com um fio de azeite por 4 minutos de cada lado.',
        'Sirva com a quinoa aquecida e os brócolis cozidos no vapor.'
      ],
      nutrition: {
        calories: 420,
        protein: 38,
        carbs: 28,
        fat: 16,
        fiber: 5
      },
      imageUrl: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&q=80&w=400&h=400'
    };

    onSaveProfile({
      ...profile!,
      savedRecipes: [sampleRecipe, ...savedRecipes]
    });
  };

  const filteredRecipes = savedRecipes.filter(r => {
    if (!searchQuery.trim()) return true;
    const term = searchQuery.toLowerCase();
    const nameMatch = (r.name || r.title || '').toLowerCase().includes(term);
    const descMatch = (r.description || '').toLowerCase().includes(term);
    return nameMatch || descMatch;
  });

  return (
    <div className="w-full p-6 sm:p-8 rounded-3xl bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 shadow-xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/20">
            <BookmarkCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-serif text-xl sm:text-2xl font-bold text-slate-800 dark:text-slate-100">
                {t('saved_recipes_title', 'Minhas Receitas Salvas')}
              </h3>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
                {savedRecipes.length}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {t('saved_recipes_subtitle', 'Navegação por gestos: deslize para a esquerda para excluir ou para a direita para abrir.')}
            </p>
          </div>
        </div>

        {/* Gestures hint badge */}
        <div className="flex items-center gap-2 self-start sm:self-auto px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 text-[11px] font-semibold text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60">
          <MoveHorizontal className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
          <span>← {t('swipe_to_dismiss', 'Deslize para remover')} • {t('swipe_to_view', 'Deslize para ver')} →</span>
        </div>
      </div>

      {/* Undo Alert Toast */}
      <AnimatePresence>
        {lastDismissed && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            className="p-3.5 rounded-2xl bg-slate-900 text-white dark:bg-slate-800 flex items-center justify-between gap-3 shadow-lg"
          >
            <div className="flex items-center gap-2 text-xs">
              <Trash2 className="w-4 h-4 text-rose-400" />
              <span>Receita <strong>"{lastDismissed.recipe.name || 'Prato'}"</strong> removida.</span>
            </div>
            <button
              type="button"
              onClick={handleUndoDismiss}
              className="px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Desfazer
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search Filter if has items */}
      {savedRecipes.length > 2 && (
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('search_saved_recipes_placeholder', 'Buscar nas receitas salvas...')}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-emerald-500/30 text-xs text-slate-700 dark:text-slate-200 transition-all"
          />
        </div>
      )}

      {/* Recipe List with Swipe Animation */}
      {savedRecipes.length === 0 ? (
        <div className="py-10 px-6 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 text-center flex flex-col items-center justify-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500 flex items-center justify-center">
            <Utensils className="w-7 h-7" />
          </div>
          <div className="max-w-md space-y-1">
            <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">
              {t('no_saved_recipes_yet', 'Nenhuma receita salva ainda')}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t('no_saved_recipes_desc', 'Ao gerar receitas personalizadas ou planejar seus cardápios, salve-as para consultá-las com gestos fluidos de deslize.')}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleAddSampleRecipe}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Adicionar Receita Demonstrativa</span>
            </button>
            <button
              type="button"
              onClick={() => {
                window.dispatchEvent(new CustomEvent('app:switchTab', { detail: 'generator' }));
              }}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition-colors cursor-pointer"
            >
              Ir ao Gerador de Receitas
            </button>
          </div>
        </div>
      ) : filteredRecipes.length === 0 ? (
        <div className="py-8 text-center text-xs text-slate-500">
          Nenhuma receita encontrada para "{searchQuery}".
        </div>
      ) : (
        <div className="space-y-1">
          <AnimatePresence mode="popLayout">
            {filteredRecipes.map((recipe) => (
              <SwipeableRecipeItem
                key={recipe.id}
                recipe={recipe}
                onDismiss={handleDismissRecipe}
                onOpen={(r) => setSelectedRecipe(r)}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Recipe Modal Viewer */}
      {selectedRecipe && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-[99999] flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            className="w-full max-w-4xl max-h-[92vh] overflow-y-auto bg-transparent relative shadow-2xl rounded-3xl"
          >
            <button
              type="button"
              onClick={() => setSelectedRecipe(null)}
              className="fixed top-5 right-5 sm:top-8 sm:right-8 p-2.5 rounded-full bg-slate-900/80 hover:bg-slate-900 text-white backdrop-blur-md shadow-lg border border-white/20 transition-transform active:scale-95 z-50 cursor-pointer"
              aria-label="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
            <RecipeCard recipe={selectedRecipe} />
          </motion.div>
        </div>
      )}
    </div>
  );
}
