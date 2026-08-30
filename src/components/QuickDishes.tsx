import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Flame, 
  Dumbbell, 
  Zap, 
  Sparkles, 
  Clock, 
  Heart, 
  Share2, 
  ShoppingCart, 
  RotateCw, 
  Check, 
  ChevronRight, 
  Utensils, 
  AlertCircle, 
  X, 
  Info, 
  Leaf, 
  ChefHat,
  BookmarkCheck,
  CheckCircle2,
  ListPlus,
  Scale
} from 'lucide-react';
import { QuickDish, QuickDishGoal, UserProfile, Recipe } from '../types';
import { generateQuickDishes } from '../lib/gemini';
import { getClientFallbackQuickDishes, DEFAULT_FALLBACK_IMAGE } from '../lib/quickDishesData';
import { playSfx, vibrate } from '../lib/sensory';
import { useLocalStorage } from '../hooks/useLocalStorage';

interface QuickDishesProps {
  profile: UserProfile | null;
  onSaveRecipe?: (recipe: Recipe) => void;
  onAwardPoints?: (amount: number, reason: string) => void;
  initialGoal?: QuickDishGoal;
  isOpenAsModal?: boolean;
  onCloseModal?: () => void;
}

export function QuickDishes({
  profile,
  onSaveRecipe,
  onAwardPoints,
  initialGoal = 'weight_loss',
  isOpenAsModal = false,
  onCloseModal
}: QuickDishesProps) {
  const [selectedGoal, setSelectedGoal] = useState<QuickDishGoal>(initialGoal);
  const [dishes, setDishes] = useState<QuickDish[]>(() => getClientFallbackQuickDishes(initialGoal, profile));
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDishForModal, setSelectedDishForModal] = useState<QuickDish | null>(null);
  const [favoriteIds, setFavoriteIds] = useState<Record<string, boolean>>({});
  const [checkedIngredients, setCheckedIngredients] = useState<Record<string, boolean>>({});
  const [copySuccessToast, setCopySuccessToast] = useState<string | null>(null);
  const [addedToCartToast, setAddedToCartToast] = useState<string | null>(null);
  const [previousDishesHistory, setPreviousDishesHistory] = useState<string[]>([]);
  const [hasGeneratedOnce, setHasGeneratedOnce] = useState(false);

  // Sync custom items to shopping list
  const [customShoppingItems, setCustomShoppingItems] = useLocalStorage<{ name: string; checked: boolean }[]>(
    'nutri-shopping-custom-items',
    []
  );

  // Load existing favorites on mount
  useEffect(() => {
    if (profile?.savedRecipes) {
      const favMap: Record<string, boolean> = {};
      profile.savedRecipes.forEach(r => {
        favMap[r.name] = true;
        favMap[r.id] = true;
      });
      setFavoriteIds(favMap);
    }
  }, [profile?.savedRecipes]);

  // Trigger initial generation once opened
  useEffect(() => {
    if (!hasGeneratedOnce) {
      handleGenerate(selectedGoal);
    }
  }, []);

  const handleGenerate = async (goalToUse: QuickDishGoal) => {
    setIsLoading(true);
    playSfx('tap');
    vibrate(20);

    try {
      const generated = await generateQuickDishes(goalToUse, profile, previousDishesHistory);
      if (generated && generated.length > 0) {
        setDishes(generated);
        setHasGeneratedOnce(true);
        setPreviousDishesHistory(prev => [...prev, ...generated.map(d => d.name)].slice(-12));
        playSfx('success');
        vibrate([40, 60]);
        if (onAwardPoints) {
          onAwardPoints(15, 'Pratos rápidos gerados com IA');
        }
      } else {
        const fallback = getClientFallbackQuickDishes(goalToUse, profile, previousDishesHistory);
        setDishes(fallback);
        setHasGeneratedOnce(true);
      }
    } catch (err) {
      console.warn("Erro ao gerar pratos rápidos, aplicando seleção culinária inteligente:", err);
      const fallback = getClientFallbackQuickDishes(goalToUse, profile, previousDishesHistory);
      setDishes(fallback);
      setHasGeneratedOnce(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectGoal = (goal: QuickDishGoal) => {
    setSelectedGoal(goal);
    handleGenerate(goal);
  };

  const handleToggleFavorite = (dish: QuickDish) => {
    const isCurrentlyFav = favoriteIds[dish.id] || favoriteIds[dish.name];
    const newStatus = !isCurrentlyFav;

    setFavoriteIds(prev => ({
      ...prev,
      [dish.id]: newStatus,
      [dish.name]: newStatus
    }));

    if (newStatus) {
      playSfx('success');
      vibrate(40);
      
      // Convert QuickDish to standard Recipe format
      const convertedRecipe: Recipe = {
        id: dish.id,
        name: dish.name,
        description: dish.description,
        prepTime: dish.prepTime,
        ingredients: dish.ingredients.map(i => `${i.amount} de ${i.name}`.trim()),
        instructions: dish.instructions,
        nutrition: {
          calories: dish.nutrition.calories,
          protein: dish.nutrition.protein,
          carbs: dish.nutrition.carbs,
          fat: dish.nutrition.fat,
          fiber: dish.nutrition.fiber
        },
        image: dish.image
      };

      if (onSaveRecipe) {
        onSaveRecipe(convertedRecipe);
      }
      showToastMessage(`"${dish.name}" foi salvo nas suas receitas favoritas! ❤️`);
    } else {
      playSfx('pop');
    }
  };

  const showToastMessage = (msg: string) => {
    setCopySuccessToast(msg);
    setTimeout(() => {
      setCopySuccessToast(null);
    }, 3000);
  };

  const handleAddAllToShoppingList = (dish: QuickDish) => {
    playSfx('tap');
    vibrate(30);

    const newItemsToAdd = dish.ingredients.map(ing => ({
      name: `${ing.amount} de ${ing.name} (${dish.name})`,
      checked: false
    }));

    setCustomShoppingItems(prev => {
      const existingNames = new Set(prev.map(i => i.name.toLowerCase()));
      const filtered = newItemsToAdd.filter(i => !existingNames.has(i.name.toLowerCase()));
      return [...prev, ...filtered];
    });

    setAddedToCartToast(`${dish.ingredients.length} ingredientes adicionados à sua Lista de Compras!`);
    playSfx('success');
    vibrate([30, 50]);

    setTimeout(() => {
      setAddedToCartToast(null);
    }, 3500);
  };

  const handleShareDish = async (dish: QuickDish) => {
    playSfx('tap');
    vibrate(20);

    const shareText = `🍽️ *${dish.name}* (NutriAI - Pratos Rápidos)\n\n` +
      `⏱️ Tempo: ${dish.prepTime}\n` +
      `🔥 Calorias: ${dish.nutrition.calories} kcal | 🥩 Proteínas: ${dish.nutrition.protein}g | 🌾 Carbos: ${dish.nutrition.carbs}g | 🥑 Gorduras: ${dish.nutrition.fat}g | 🥦 Fibras: ${dish.nutrition.fiber}g\n` +
      `🥣 Porção: ${dish.portionSuggestion}\n\n` +
      `📝 *Ingredientes:*\n${dish.ingredients.map(i => `• ${i.amount} de ${i.name}`).join('\n')}\n\n` +
      `👨‍🍳 *Preparo:*\n${dish.instructions.map((step, idx) => `${idx + 1}. ${step}`).join('\n')}\n\n` +
      `💡 *Substituições:* ${dish.possibleSwaps.join('; ')}\n\n` +
      `Gerado pelo NutriAI Inteligente 💚`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: dish.name,
          text: shareText
        });
        return;
      } catch (e) {
        // Fallback to clipboard if share was cancelled or unsupported
      }
    }

    try {
      await navigator.clipboard.writeText(shareText);
      showToastMessage('Receita completa copiada para a área de transferência! 📋');
    } catch (e) {
      showToastMessage('Receita pronta para compartilhar!');
    }
  };

  const content = (
    <div className="w-full space-y-6 animate-in fade-in duration-500">
      
      {/* 1. Header & Title Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent p-6 sm:p-8 rounded-[32px] border border-emerald-500/20 backdrop-blur-md relative overflow-hidden">
        <div className="space-y-2 z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Inteligência Culinária Instantânea</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <span>🍽️ Pratos Rápidos com IA</span>
          </h2>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
            Selecione seu objetivo para receber instantaneamente <strong>3 sugestões deliciosas</strong>, balanceadas e com fotos reais de alta definição gastronômica.
          </p>
        </div>

        {isOpenAsModal && onCloseModal && (
          <button
            onClick={onCloseModal}
            className="self-start md:self-center p-2.5 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
            title="Fechar painel"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* 2. Objective Selection Pills / Compact Panel */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        
        {/* Option 1: Weight Loss */}
        <button
          id="btn-goal-weight-loss"
          onClick={() => handleSelectGoal('weight_loss')}
          disabled={isLoading}
          className={`relative flex items-center sm:flex-col sm:items-start p-4 sm:p-5 rounded-[24px] border text-left transition-all duration-300 ${
            selectedGoal === 'weight_loss'
              ? 'bg-gradient-to-br from-amber-500/15 via-orange-500/10 to-amber-500/5 border-orange-500 shadow-[0_8px_24px_rgba(249,115,22,0.15)] ring-2 ring-orange-500/30'
              : 'bg-white/80 dark:bg-[#131920] border-slate-200 dark:border-slate-800 hover:border-orange-500/40 hover:bg-orange-500/5'
          }`}
        >
          <div className="flex items-center justify-between w-full mb-1">
            <div className="flex items-center gap-2.5">
              <span className="p-2.5 rounded-xl bg-orange-500/10 text-orange-500">
                <Flame className="w-5 h-5" />
              </span>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">🔥 Quero Emagrecer</h3>
                <span className="text-xs text-orange-600 dark:text-orange-400 font-medium">Saciedade & Fibras</span>
              </div>
            </div>
            {selectedGoal === 'weight_loss' && (
              <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse hidden sm:block" />
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 hidden sm:block">
            Opções leves (250-400 kcal) com alto volume e controle de calorias.
          </p>
        </button>

        {/* Option 2: Muscle Gain */}
        <button
          id="btn-goal-muscle-gain"
          onClick={() => handleSelectGoal('muscle_gain')}
          disabled={isLoading}
          className={`relative flex items-center sm:flex-col sm:items-start p-4 sm:p-5 rounded-[24px] border text-left transition-all duration-300 ${
            selectedGoal === 'muscle_gain'
              ? 'bg-gradient-to-br from-emerald-500/15 via-teal-500/10 to-emerald-500/5 border-emerald-500 shadow-[0_8px_24px_rgba(16,185,129,0.15)] ring-2 ring-emerald-500/30'
              : 'bg-white/80 dark:bg-[#131920] border-slate-200 dark:border-slate-800 hover:border-emerald-500/40 hover:bg-emerald-500/5'
          }`}
        >
          <div className="flex items-center justify-between w-full mb-1">
            <div className="flex items-center gap-2.5">
              <span className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500">
                <Dumbbell className="w-5 h-5" />
              </span>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">💪 Ganhar Massa</h3>
                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Alta Proteína (35g+)</span>
              </div>
            </div>
            {selectedGoal === 'muscle_gain' && (
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse hidden sm:block" />
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 hidden sm:block">
            Densidade proteica e energia para recuperação e hipertrofia.
          </p>
        </button>

        {/* Option 3: Quick Fit Snacks */}
        <button
          id="btn-goal-quick-snack"
          onClick={() => handleSelectGoal('quick_fit_snack')}
          disabled={isLoading}
          className={`relative flex items-center sm:flex-col sm:items-start p-4 sm:p-5 rounded-[24px] border text-left transition-all duration-300 ${
            selectedGoal === 'quick_fit_snack'
              ? 'bg-gradient-to-br from-cyan-500/15 via-blue-500/10 to-cyan-500/5 border-cyan-500 shadow-[0_8px_24px_rgba(6,182,212,0.15)] ring-2 ring-cyan-500/30'
              : 'bg-white/80 dark:bg-[#131920] border-slate-200 dark:border-slate-800 hover:border-cyan-500/40 hover:bg-cyan-500/5'
          }`}
        >
          <div className="flex items-center justify-between w-full mb-1">
            <div className="flex items-center gap-2.5">
              <span className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-500">
                <Zap className="w-5 h-5" />
              </span>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">⚡ Lanches Rápidos</h3>
                <span className="text-xs text-cyan-600 dark:text-cyan-400 font-medium">Preparo em 5-15 min</span>
              </div>
            </div>
            {selectedGoal === 'quick_fit_snack' && (
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 animate-pulse hidden sm:block" />
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 hidden sm:block">
            Praticidade expressa com ingredientes simples e montagem rápida.
          </p>
        </button>

      </div>

      {/* 3. Loading Indicator State */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center p-12 sm:p-16 rounded-[32px] bg-white/70 dark:bg-[#121820]/90 border border-slate-200/80 dark:border-slate-800 backdrop-blur-md text-center space-y-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 animate-spin" />
            <ChefHat className="w-7 h-7 text-emerald-500 absolute inset-0 m-auto animate-pulse" />
          </div>
          <div className="space-y-1">
            <h4 className="text-lg font-bold text-slate-900 dark:text-white">
              Preparando suas 3 opções ideais...
            </h4>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md">
              A IA está calibrando calorias, proteínas, fibras e selecionando fotografias gastronômicas de alta definição.
            </p>
          </div>
        </div>
      )}

      {/* 4. The 3 Dishes Cards Grid */}
      {!isLoading && dishes.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                3 Opções Geradas Sob Medida
              </span>
            </div>
            
            {/* Quick Regenerate Button */}
            <button
              id="btn-regenerate-quick-dishes-top"
              onClick={() => handleGenerate(selectedGoal)}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-emerald-500 hover:text-white dark:hover:bg-emerald-600 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-all shadow-sm group"
            >
              <RotateCw className="w-3.5 h-3.5 group-hover:rotate-180 transition-transform duration-500" />
              <span>Gerar Outras 3</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {dishes.map((dish, idx) => {
              const isFav = favoriteIds[dish.id] || favoriteIds[dish.name];

              return (
                <motion.div
                  key={dish.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: idx * 0.1 }}
                  className="flex flex-col bg-white dark:bg-[#131920] rounded-[28px] border border-slate-200/80 dark:border-slate-800/80 shadow-md hover:shadow-xl hover:border-emerald-500/40 transition-all duration-300 overflow-hidden group"
                >
                  {/* Photo Header */}
                  <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                    <img 
                      src={dish.image || DEFAULT_FALLBACK_IMAGE} 
                      alt={dish.name}
                      referrerPolicy="no-referrer"
                      loading="lazy"
                      onError={(e) => {
                        const target = e.currentTarget;
                        if (target.src !== DEFAULT_FALLBACK_IMAGE) {
                          target.src = DEFAULT_FALLBACK_IMAGE;
                        }
                      }}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent pointer-events-none" />

                    {/* Option Tag Badge */}
                    <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-xs font-bold text-white border border-white/20 shadow-sm flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span>OPÇÃO {idx + 1}</span>
                    </div>

                    {/* Favorite Button on Image */}
                    <button
                      onClick={() => handleToggleFavorite(dish)}
                      className={`absolute top-3 right-3 p-2.5 rounded-full backdrop-blur-md transition-all ${
                        isFav 
                          ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30 scale-110' 
                          : 'bg-black/50 text-white hover:bg-rose-500 hover:text-white border border-white/20'
                      }`}
                      title={isFav ? "Remover dos favoritos" : "Salvar receita nos favoritos"}
                    >
                      <Heart className={`w-4 h-4 ${isFav ? 'fill-current' : ''}`} />
                    </button>

                    {/* Bottom overlay: Prep time and Calories */}
                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs text-white font-semibold">
                      <span className="flex items-center gap-1 bg-black/40 px-2.5 py-1 rounded-lg backdrop-blur-md">
                        <Clock className="w-3.5 h-3.5 text-emerald-400" />
                        {dish.prepTime}
                      </span>
                      <span className="flex items-center gap-1 bg-black/40 px-2.5 py-1 rounded-lg backdrop-blur-md">
                        <Flame className="w-3.5 h-3.5 text-orange-400" />
                        {dish.nutrition.calories} kcal
                      </span>
                    </div>
                  </div>

                  {/* Card Content Body */}
                  <div className="flex-1 p-5 flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <h3 className="font-extrabold text-slate-900 dark:text-white text-lg line-clamp-2 leading-tight group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                        {dish.name}
                      </h3>
                      <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                        {dish.description}
                      </p>
                    </div>

                    {/* Macro Nutrition Badges */}
                    <div className="grid grid-cols-4 gap-1.5 text-center bg-slate-50 dark:bg-[#1A222C] p-2.5 rounded-2xl border border-slate-100 dark:border-slate-800/60 text-xs">
                      <div className="flex flex-col">
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">Prot</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">{dish.nutrition.protein}g</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">Carb</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{dish.nutrition.carbs}g</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">Gord</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{dish.nutrition.fat}g</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">Fibra</span>
                        <span className="font-bold text-teal-600 dark:text-teal-400">{dish.nutrition.fiber}g</span>
                      </div>
                    </div>

                    {/* Portion Suggestion tag */}
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 bg-emerald-500/5 dark:bg-emerald-500/10 px-2.5 py-1 rounded-xl border border-emerald-500/10">
                      <Scale className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                      <span className="truncate"><strong>Porção:</strong> {dish.portionSuggestion}</span>
                    </div>

                    {/* Card Actions Footer */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <button
                        onClick={() => {
                          setSelectedDishForModal(dish);
                          playSfx('tap');
                        }}
                        className="w-full py-2.5 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all"
                      >
                        <Utensils className="w-3.5 h-3.5" />
                        <span>Ver Receita</span>
                      </button>

                      <button
                        onClick={() => handleToggleFavorite(dish)}
                        className={`w-full py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 border transition-all ${
                          isFav
                            ? 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400'
                            : 'bg-slate-100 dark:bg-slate-800 border-transparent hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <Heart className={`w-3.5 h-3.5 ${isFav ? 'fill-rose-500 text-rose-500' : ''}`} />
                        <span>{isFav ? 'Salvo' : 'Favoritar'}</span>
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* 5. Bottom "GERAR OUTRAS 3" Big CTA */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
            <button
              id="btn-regenerate-quick-dishes-bottom"
              onClick={() => handleGenerate(selectedGoal)}
              disabled={isLoading}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-sm sm:text-base shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <RotateCw className="w-5 h-5 animate-spin-slow" />
              <span>GERAR OUTRAS 3 OPÇÕES</span>
            </button>
          </div>
        </div>
      )}

      {/* 6. Medical / Nutritional Safety Note */}
      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#11171E] border border-slate-200/60 dark:border-slate-800/80 text-slate-500 dark:text-slate-400 text-xs flex items-start gap-2.5">
        <Info className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong>Segurança & Precisão NutriAI:</strong> Os valores nutricionais exibidos são estimativas baseadas nos ingredientes cadastrados. Alergias e restrições informadas no seu perfil são respeitadas rigorosamente pela IA culinária. Sempre consulte seu nutricionista ou médico.
        </p>
      </div>

      {/* 7. Detailed Recipe Modal ("VER RECEITA") */}
      <AnimatePresence>
        {selectedDishForModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-300">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-white dark:bg-[#131920] rounded-[32px] border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-8 space-y-6"
            >
              {/* Close Button */}
              <button
                onClick={() => {
                  setSelectedDishForModal(null);
                  playSfx('tap');
                }}
                className="absolute top-5 right-5 z-20 p-2.5 rounded-full bg-black/60 hover:bg-black/80 text-white transition-all shadow-md"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Photo Banner Header */}
              <div className="relative aspect-[16/9] w-full rounded-2xl overflow-hidden shadow-inner">
                <img 
                  src={selectedDishForModal.image || DEFAULT_FALLBACK_IMAGE} 
                  alt={selectedDishForModal.name}
                  referrerPolicy="no-referrer"
                  loading="lazy"
                  onError={(e) => {
                    const target = e.currentTarget;
                    if (target.src !== DEFAULT_FALLBACK_IMAGE) {
                      target.src = DEFAULT_FALLBACK_IMAGE;
                    }
                  }}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4 text-white space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/80 backdrop-blur-md text-xs font-bold">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{selectedDishForModal.categoryLabel}</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black">{selectedDishForModal.name}</h2>
                </div>
              </div>

              {/* Macro Bar Overview */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 bg-slate-50 dark:bg-[#1A222C] p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
                <div>
                  <span className="text-xs text-slate-400 uppercase font-semibold">Calorias</span>
                  <p className="text-lg font-black text-orange-500">{selectedDishForModal.nutrition.calories} kcal</p>
                </div>
                <div>
                  <span className="text-xs text-slate-400 uppercase font-semibold">Proteínas</span>
                  <p className="text-lg font-black text-emerald-500">{selectedDishForModal.nutrition.protein}g</p>
                </div>
                <div>
                  <span className="text-xs text-slate-400 uppercase font-semibold">Carboidratos</span>
                  <p className="text-lg font-black text-slate-800 dark:text-slate-100">{selectedDishForModal.nutrition.carbs}g</p>
                </div>
                <div>
                  <span className="text-xs text-slate-400 uppercase font-semibold">Gorduras</span>
                  <p className="text-lg font-black text-slate-800 dark:text-slate-100">{selectedDishForModal.nutrition.fat}g</p>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <span className="text-xs text-slate-400 uppercase font-semibold">Fibras</span>
                  <p className="text-lg font-black text-teal-500">{selectedDishForModal.nutrition.fiber}g</p>
                </div>
              </div>

              {/* Time and Portion details */}
              <div className="flex flex-wrap gap-4 text-xs font-medium text-slate-600 dark:text-slate-300">
                <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl">
                  <Clock className="w-4 h-4 text-emerald-500" />
                  <span><strong>Tempo de Preparo:</strong> {selectedDishForModal.prepTime}</span>
                </div>
                <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl">
                  <Scale className="w-4 h-4 text-emerald-500" />
                  <span><strong>Porção recomendada:</strong> {selectedDishForModal.portionSuggestion}</span>
                </div>
              </div>

              {/* Ingredients List */}
              <div className="space-y-3">
                <h4 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Utensils className="w-4 h-4 text-emerald-500" />
                  <span>Ingredientes (com quantidades)</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {selectedDishForModal.ingredients.map((ing, idx) => {
                    const ingKey = `${selectedDishForModal.id}-ing-${idx}`;
                    const isChecked = !!checkedIngredients[ingKey];

                    return (
                      <button
                        key={idx}
                        onClick={() => {
                          setCheckedIngredients(prev => ({
                            ...prev,
                            [ingKey]: !isChecked
                          }));
                          playSfx('tap');
                        }}
                        className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                          isChecked
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-slate-400 line-through'
                            : 'bg-slate-50 dark:bg-[#1A222C] border-slate-100 dark:border-slate-800/80 text-slate-800 dark:text-slate-200'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                          isChecked ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 dark:border-slate-600'
                        }`}>
                          {isChecked && <Check className="w-3.5 h-3.5" />}
                        </div>
                        <div className="text-xs">
                          <strong className="text-emerald-600 dark:text-emerald-400">{ing.amount}</strong> {ing.name}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Preparation Steps */}
              <div className="space-y-3">
                <h4 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <ChefHat className="w-4 h-4 text-emerald-500" />
                  <span>Modo de Preparo Passo a Passo</span>
                </h4>
                <div className="space-y-2.5">
                  {selectedDishForModal.instructions.map((step, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-[#1A222C] border border-slate-100 dark:border-slate-800 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-500 text-white font-black text-xs flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <p className="leading-relaxed pt-0.5">{step}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Possible Smart Swaps */}
              {selectedDishForModal.possibleSwaps && selectedDishForModal.possibleSwaps.length > 0 && (
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs space-y-1.5">
                  <span className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                    <Leaf className="w-4 h-4" />
                    <span>Substituições Possíveis & Dicas do Chef</span>
                  </span>
                  <ul className="list-disc list-inside text-slate-700 dark:text-slate-300 space-y-1">
                    {selectedDishForModal.possibleSwaps.map((swap, idx) => (
                      <li key={idx}>{swap}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Three Mandatory Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                {/* 1. Add to Shopping List */}
                <button
                  onClick={() => handleAddAllToShoppingList(selectedDishForModal)}
                  className="py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 transition-all active:scale-95"
                >
                  <ShoppingCart className="w-4 h-4" />
                  <span>Lista de Compras</span>
                </button>

                {/* 2. Toggle Favorite */}
                <button
                  onClick={() => handleToggleFavorite(selectedDishForModal)}
                  className={`py-3 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 border transition-all active:scale-95 ${
                    favoriteIds[selectedDishForModal.id] || favoriteIds[selectedDishForModal.name]
                      ? 'bg-rose-500 text-white border-rose-500 shadow-md shadow-rose-500/20'
                      : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <Heart className={`w-4 h-4 ${favoriteIds[selectedDishForModal.id] || favoriteIds[selectedDishForModal.name] ? 'fill-current' : ''}`} />
                  <span>{favoriteIds[selectedDishForModal.id] || favoriteIds[selectedDishForModal.name] ? 'Favoritado ❤️' : 'Favoritar'}</span>
                </button>

                {/* 3. Share Dish */}
                <button
                  onClick={() => handleShareDish(selectedDishForModal)}
                  className="py-3 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-700 transition-all active:scale-95"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Compartilhar</span>
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating Toast Notifications */}
      <AnimatePresence>
        {copySuccessToast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl bg-slate-900 text-white text-xs font-semibold shadow-2xl border border-slate-700 flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{copySuccessToast}</span>
          </motion.div>
        )}
        {addedToCartToast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 left-6 z-50 px-4 py-3 rounded-2xl bg-emerald-600 text-white text-xs font-semibold shadow-2xl border border-emerald-500 flex items-center gap-2"
          >
            <ShoppingCart className="w-4 h-4 text-white" />
            <span>{addedToCartToast}</span>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );

  if (isOpenAsModal) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-md overflow-y-auto">
        <div className="relative w-full max-w-5xl bg-[#0F141A] rounded-[36px] border border-emerald-500/30 p-4 sm:p-8 shadow-[0_20px_60px_rgba(0,0,0,0.6)] my-auto max-h-[95vh] overflow-y-auto">
          {content}
        </div>
      </div>
    );
  }

  return content;
}
