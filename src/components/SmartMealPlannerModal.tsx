import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Calendar, Wand2, Sparkles, Search, Trash2, Copy, Check, 
  GripVertical, Plus, Utensils, Flame, Clock, Filter, CheckCircle2,
  RefreshCw, Info, ChevronRight, Zap
} from 'lucide-react';
import { Recipe, MealPlan, UserProfile } from '../types';
import { useTranslation } from '../contexts/LanguageContext';
import { playSfx, vibrate } from '../lib/sensory';

export const DAYS_OF_WEEK = [
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
  'Domingo'
];

export const MEAL_TYPES = [
  { id: 'breakfast', label: 'Café da Manhã', icon: '🌅', color: 'from-amber-500/20 to-orange-500/20 border-amber-500/30' },
  { id: 'lunch', label: 'Almoço', icon: '☀️', color: 'from-emerald-500/20 to-teal-500/20 border-emerald-500/30' },
  { id: 'snack', label: 'Lanche', icon: '🍎', color: 'from-purple-500/20 to-pink-500/20 border-purple-500/30' },
  { id: 'dinner', label: 'Jantar', icon: '🌙', color: 'from-indigo-500/20 to-blue-500/20 border-indigo-500/30' }
];

interface SmartMealPlannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedRecipes: Recipe[];
  mealPlan: MealPlan;
  onUpdatePlan: (day: string, mealType: string, recipeId: string | null, recipeObj?: Recipe) => void;
  profile?: UserProfile | null;
}

export function SmartMealPlannerModal({
  isOpen,
  onClose,
  savedRecipes,
  mealPlan,
  onUpdatePlan,
  profile
}: SmartMealPlannerModalProps) {
  const { t } = useTranslation();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [draggedRecipe, setDraggedRecipe] = useState<Recipe | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<{ day: string; mealType: string } | null>(null);
  const [assigningRecipe, setAssigningRecipe] = useState<Recipe | null>(null);
  const [copyingFromDay, setCopyingFromDay] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isAutoPlanning, setIsAutoPlanning] = useState(false);

  // Filtered recipes bank
  const filteredRecipes = useMemo(() => {
    return savedRecipes.filter(recipe => {
      const nameMatch = (recipe.name || recipe.title || '').toLowerCase().includes(searchQuery.toLowerCase());
      const descMatch = (recipe.description || '').toLowerCase().includes(searchQuery.toLowerCase());
      const tagMatch = recipe.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!nameMatch && !descMatch && !tagMatch) return false;

      if (selectedCategory === 'all') return true;
      if (selectedCategory === 'high_protein') return (recipe.nutrition?.protein || recipe.protein || 0) >= 20;
      if (selectedCategory === 'low_carb') return (recipe.nutrition?.carbs || recipe.carbs || 0) <= 25;
      if (selectedCategory === 'quick') return parseInt(recipe.prepTime || '0') <= 20;
      
      return true;
    });
  }, [savedRecipes, searchQuery, selectedCategory]);

  if (!isOpen) return null;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Drag Handlers
  const handleDragStart = (e: React.DragEvent, recipe: Recipe) => {
    setDraggedRecipe(recipe);
    try {
      e.dataTransfer.setData('text/plain', JSON.stringify({ recipeId: recipe.id }));
      e.dataTransfer.effectAllowed = 'copy';
    } catch (err) {}
    playSfx('tap');
    vibrate(20);
  };

  const handleDragOver = (e: React.DragEvent, day: string, mealType: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    if (dragOverTarget?.day !== day || dragOverTarget?.mealType !== mealType) {
      setDragOverTarget({ day, mealType });
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverTarget(null);
  };

  const handleDrop = (e: React.DragEvent, day: string, mealType: string) => {
    e.preventDefault();
    setDragOverTarget(null);

    let recipeToAssign = draggedRecipe;
    if (!recipeToAssign) {
      try {
        const data = e.dataTransfer.getData('text/plain');
        if (data) {
          const parsed = JSON.parse(data);
          recipeToAssign = savedRecipes.find(r => r.id === parsed.recipeId) || null;
        }
      } catch (err) {}
    }

    if (recipeToAssign) {
      onUpdatePlan(day, mealType, recipeToAssign.id, recipeToAssign);
      playSfx('success');
      vibrate(50);
      showToast(`✨ ${recipeToAssign.name || recipeToAssign.title} agendado para ${day} (${mealType})!`);
    }
    setDraggedRecipe(null);
  };

  // Touch/Mobile fallback assignment
  const handleAssignMealToSlot = (day: string, mealType: string) => {
    if (assigningRecipe) {
      onUpdatePlan(day, mealType, assigningRecipe.id, assigningRecipe);
      playSfx('success');
      vibrate(50);
      showToast(`✨ ${assigningRecipe.name || assigningRecipe.title} agendado para ${day}!`);
      setAssigningRecipe(null);
    }
  };

  // AI Auto-Fill Plan
  const handleAutoFillPlan = () => {
    if (savedRecipes.length === 0) {
      showToast('⚠️ Salve algumas receitas primeiro para que a IA possa planejar a semana!');
      return;
    }

    setIsAutoPlanning(true);
    playSfx('crystal');
    vibrate([50, 50, 100]);

    setTimeout(() => {
      DAYS_OF_WEEK.forEach((day, dIdx) => {
        MEAL_TYPES.forEach((meal, mIdx) => {
          const recipeIndex = (dIdx * 2 + mIdx) % savedRecipes.length;
          const recipe = savedRecipes[recipeIndex];
          if (recipe) {
            onUpdatePlan(day, meal.id, recipe.id, recipe);
          }
        });
      });
      setIsAutoPlanning(false);
      showToast('🤖 Semana preenchida com IA com base nas suas receitas salvas!');
    }, 600);
  };

  // Copy day plan to another day
  const handleCopyDayPlan = (sourceDay: string, targetDay: string) => {
    const sourceMeals = mealPlan[sourceDay]?.meals;
    if (sourceMeals) {
      Object.entries(sourceMeals).forEach(([mealType, recipe]) => {
        if (recipe) {
          onUpdatePlan(targetDay, mealType, recipe.id, recipe);
        }
      });
      playSfx('success');
      vibrate(40);
      showToast(`📋 Cardápio de ${sourceDay} copiado para ${targetDay}!`);
    }
    setCopyingFromDay(null);
  };

  // Clear entire week
  const handleClearWeek = () => {
    DAYS_OF_WEEK.forEach(day => {
      MEAL_TYPES.forEach(meal => {
        onUpdatePlan(day, meal.id, null);
      });
    });
    playSfx('tap');
    vibrate(60);
    showToast('🗑️ Cardápio semanal limpo.');
  };

  // Calculate daily nutrition summary for a given day
  const getDayNutrition = (day: string) => {
    const meals = mealPlan[day]?.meals || {};
    let calories = 0;
    let protein = 0;
    let carbs = 0;
    let fat = 0;

    Object.values(meals).forEach(recipe => {
      if (recipe) {
        calories += recipe.nutrition?.calories || recipe.calories || 0;
        protein += recipe.nutrition?.protein || recipe.protein || 0;
        carbs += recipe.nutrition?.carbs || recipe.carbs || 0;
        fat += recipe.nutrition?.fat || recipe.fat || 0;
      }
    });

    return { calories, protein, carbs, fat };
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-300">
      <div 
        data-testid="smart-meal-planner-modal"
        className="w-full max-w-7xl max-h-[92vh] bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-100"
      >
        {/* Header */}
        <div className="p-5 md:p-6 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shadow-lg">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-serif text-2xl md:text-3xl font-bold tracking-tight text-white">
                  Smart Meal Planner
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/30">
                  Arraste & Solte 🎯
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Monte seu cardápio semanal arrastando receitas salvas diretamente para a grade de dias.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <button
              onClick={handleAutoFillPlan}
              disabled={isAutoPlanning || savedRecipes.length === 0}
              className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg transition-all disabled:opacity-50 active:scale-95 cursor-pointer"
            >
              {isAutoPlanning ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
              <span>Preencher com IA</span>
            </button>

            <button
              onClick={handleClearWeek}
              className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold border border-slate-700 flex items-center gap-1.5 transition-all cursor-pointer"
              title="Limpar planejamento semanal"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span>Limpar</span>
            </button>

            <button
              onClick={onClose}
              className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl border border-slate-700 transition-all cursor-pointer"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Toast Alert Notification */}
        <AnimatePresence>
          {toastMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-emerald-600 text-white text-xs font-bold py-2 px-4 text-center border-b border-emerald-500 flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{toastMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Body Grid */}
        <div className="flex-1 overflow-hidden grid lg:grid-cols-12 gap-0">
          
          {/* Left Sidebar: Saved Recipes Bank */}
          <div className="lg:col-span-4 xl:col-span-3 border-r border-slate-800 p-4 sm:p-5 flex flex-col space-y-4 bg-slate-900/60 overflow-y-auto max-h-[40vh] lg:max-h-none">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Utensils className="w-4 h-4 text-emerald-400" />
                  <span>Banco de Receitas ({savedRecipes.length})</span>
                </h3>
                <span className="text-[10px] text-slate-500 font-medium">Arraste um card 🤏</span>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar receitas salvas..."
                  className="w-full pl-9 pr-4 py-2 bg-slate-800/80 border border-slate-700/80 rounded-xl text-xs font-medium text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>

              {/* Category Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
                {[
                  { id: 'all', label: 'Todas' },
                  { id: 'high_protein', label: '💪 Hiperproteicas' },
                  { id: 'low_carb', label: '🥗 Low Carb' },
                  { id: 'quick', label: '⚡ Rápidas (<=20m)' }
                ].map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-2.5 py-1 rounded-lg font-bold shrink-0 transition-all cursor-pointer ${
                      selectedCategory === cat.id
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-slate-800/60 text-slate-400 border border-slate-700/50 hover:text-slate-200'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Recipes Cards List */}
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
              {filteredRecipes.length === 0 ? (
                <div className="p-6 text-center text-slate-500 bg-slate-850/50 rounded-2xl border border-dashed border-slate-800 space-y-2">
                  <Utensils className="w-8 h-8 mx-auto text-slate-600 opacity-60" />
                  <p className="text-xs font-medium">Nenhuma receita salva encontrada.</p>
                  <p className="text-[10px] text-slate-600">Explore receitas no app e salve-as com o ícone de coração para usá-las no planejador!</p>
                </div>
              ) : (
                filteredRecipes.map(recipe => {
                  const title = recipe.name || recipe.title || 'Receita sem nome';
                  const cals = recipe.nutrition?.calories || recipe.calories || 0;
                  const prot = recipe.nutrition?.protein || recipe.protein || 0;
                  const image = recipe.imageUrl || recipe.image;

                  return (
                    <div
                      key={recipe.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, recipe)}
                      className="p-3 bg-slate-800/90 hover:bg-slate-800 border border-slate-700/80 hover:border-emerald-500/50 rounded-2xl transition-all cursor-grab active:cursor-grabbing group shadow-sm flex items-center justify-between gap-3 relative"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-12 h-12 rounded-xl bg-slate-700 overflow-hidden shrink-0 relative flex items-center justify-center text-slate-400">
                          {image ? (
                            <img src={image} alt={title} className="w-full h-full object-cover" />
                          ) : (
                            <Utensils className="w-5 h-5 opacity-60" />
                          )}
                          <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors" />
                        </div>

                        <div className="min-w-0 space-y-0.5">
                          <h4 className="text-xs font-bold text-slate-100 truncate group-hover:text-emerald-400 transition-colors">
                            {title}
                          </h4>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium">
                            <span className="flex items-center gap-0.5 text-amber-400">
                              <Flame className="w-3 h-3" /> {cals} kcal
                            </span>
                            <span>•</span>
                            <span className="text-emerald-400 font-bold">{prot}g prot</span>
                          </div>
                        </div>
                      </div>

                      {/* Drag Handle & Mobile Assign Button */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => setAssigningRecipe(assigningRecipe?.id === recipe.id ? null : recipe)}
                          className="px-2 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg text-[10px] font-bold border border-emerald-500/30 transition-all cursor-pointer"
                          title="Atribuir rapidamente a um dia"
                        >
                          + Agendar
                        </button>
                        <GripVertical className="w-4 h-4 text-slate-600 group-hover:text-slate-400" />
                      </div>

                      {/* Touch/Mobile Popover Menu */}
                      <AnimatePresence>
                        {assigningRecipe?.id === recipe.id && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="absolute right-2 top-full mt-1 z-30 w-56 p-2 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl space-y-1.5 text-xs"
                          >
                            <div className="flex justify-between items-center px-2 py-1 text-[10px] font-bold text-slate-400 border-b border-slate-700">
                              <span>Escolha o Dia & Refeição:</span>
                              <button onClick={() => setAssigningRecipe(null)} className="hover:text-white">
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                            <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
                              {DAYS_OF_WEEK.map(day => (
                                <div key={day} className="space-y-0.5">
                                  <span className="text-[10px] font-bold text-slate-400 px-1">{day}</span>
                                  <div className="grid grid-cols-2 gap-1">
                                    {MEAL_TYPES.map(m => (
                                      <button
                                        key={m.id}
                                        onClick={() => handleAssignMealToSlot(day, m.id)}
                                        className="px-1.5 py-1 bg-slate-700/80 hover:bg-emerald-600 text-white rounded text-[10px] truncate text-left font-semibold cursor-pointer"
                                      >
                                        {m.icon} {m.label}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Area: Weekly Calendar Grid (7 Days) */}
          <div className="lg:col-span-8 xl:col-span-9 p-4 sm:p-5 overflow-y-auto space-y-4 max-h-[60vh] lg:max-h-none bg-slate-950/40">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-emerald-400" />
                <h3 className="font-serif text-lg font-bold text-white">
                  Grade Semanal de Planejamento (7 Dias)
                </h3>
              </div>
              <p className="text-xs text-slate-400">
                Arraste qualquer receita da esquerda diretamente para o slot desejado!
              </p>
            </div>

            {/* 7-Day Columns Layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-7 gap-3">
              {DAYS_OF_WEEK.map(day => {
                const nutrition = getDayNutrition(day);
                const isTargetCopySource = copyingFromDay === day;

                return (
                  <div
                    key={day}
                    className={`bg-slate-900/90 border ${
                      isTargetCopySource 
                        ? 'border-emerald-500 ring-2 ring-emerald-500/30' 
                        : 'border-slate-800'
                    } rounded-2xl p-3 flex flex-col space-y-3 min-w-0 transition-all`}
                  >
                    {/* Day Header */}
                    <div className="space-y-1 pb-2 border-b border-slate-800">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-slate-200 truncate">{day}</h4>
                        <button
                          onClick={() => setCopyingFromDay(isTargetCopySource ? null : day)}
                          className={`p-1 rounded text-[10px] transition-colors cursor-pointer ${
                            isTargetCopySource ? 'bg-emerald-500 text-white' : 'text-slate-500 hover:text-slate-300'
                          }`}
                          title="Copiar refeições deste dia para outro"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Copy Action Floating Picker */}
                      {isTargetCopySource && (
                        <div className="p-2 bg-slate-800 border border-slate-700 rounded-xl space-y-1.5 text-[10px]">
                          <span className="font-bold text-emerald-400 block">Copiar {day} para:</span>
                          <div className="grid grid-cols-1 gap-1 max-h-28 overflow-y-auto">
                            {DAYS_OF_WEEK.filter(d => d !== day).map(targetDay => (
                              <button
                                key={targetDay}
                                onClick={() => handleCopyDayPlan(day, targetDay)}
                                className="px-2 py-1 bg-slate-700 hover:bg-emerald-600 text-white rounded text-left font-semibold truncate cursor-pointer"
                              >
                                ➔ {targetDay}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Day Nutrition Counter */}
                      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
                        <span className="font-extrabold text-amber-400 flex items-center gap-0.5">
                          <Flame className="w-3 h-3" /> {nutrition.calories} kcal
                        </span>
                        <span className="font-bold text-emerald-400">
                          {nutrition.protein}g P
                        </span>
                      </div>
                    </div>

                    {/* Meal Slots for this Day */}
                    <div className="space-y-2.5 flex-1">
                      {MEAL_TYPES.map(meal => {
                        const plannedRecipe = mealPlan[day]?.meals?.[meal.id as 'breakfast' | 'lunch' | 'snack' | 'dinner'];
                        const isHoveredSlot = dragOverTarget?.day === day && dragOverTarget?.mealType === meal.id;

                        return (
                          <div
                            key={meal.id}
                            onDragOver={(e) => handleDragOver(e, day, meal.id)}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(e, day, meal.id)}
                            className={`p-2 rounded-xl border transition-all relative flex flex-col justify-between min-h-[78px] ${
                              isHoveredSlot
                                ? 'bg-emerald-500/20 border-emerald-400 ring-2 ring-emerald-400/40 scale-[1.02]'
                                : plannedRecipe
                                  ? 'bg-slate-850/80 border-slate-750'
                                  : 'bg-slate-900/40 border-dashed border-slate-800 hover:border-slate-700'
                            }`}
                          >
                            <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 mb-1">
                              <span className="flex items-center gap-1 truncate">
                                <span>{meal.icon}</span>
                                <span>{meal.label}</span>
                              </span>
                              {plannedRecipe && (
                                <button
                                  onClick={() => {
                                    onUpdatePlan(day, meal.id, null);
                                    playSfx('tap');
                                  }}
                                  className="text-slate-500 hover:text-rose-400 p-0.5 rounded transition-colors"
                                  title="Remover refeição"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              )}
                            </div>

                            {plannedRecipe ? (
                              <div className="space-y-0.5">
                                <p className="text-[11px] font-bold text-slate-100 line-clamp-2 leading-tight">
                                  {plannedRecipe.name || plannedRecipe.title}
                                </p>
                                <div className="flex items-center gap-1.5 text-[9px] text-slate-400 font-medium">
                                  <span className="text-amber-400 font-bold">
                                    {plannedRecipe.nutrition?.calories || plannedRecipe.calories || 0} kcal
                                  </span>
                                  <span>•</span>
                                  <span className="text-emerald-400">
                                    {plannedRecipe.nutrition?.protein || plannedRecipe.protein || 0}g P
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center justify-center py-2 text-slate-600 text-[10px] font-medium text-center">
                                {isHoveredSlot ? (
                                  <span className="text-emerald-400 font-bold animate-bounce">Soltar Aqui 📥</span>
                                ) : (
                                  <>
                                    <Plus className="w-3.5 h-3.5 mb-0.5 opacity-40" />
                                    <span className="opacity-60">Arraste ou clique</span>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              Todas as refeições agendadas são salvas no seu perfil e sincronizadas com os alertas nutricionais diários.
            </span>
          </div>

          <button
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-lg transition-all cursor-pointer shrink-0"
          >
            Concluir & Salvar Plano
          </button>
        </div>
      </div>
    </div>
  );
}
