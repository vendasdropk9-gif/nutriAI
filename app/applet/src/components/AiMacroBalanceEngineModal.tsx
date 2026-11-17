import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, X, Loader2, Dumbbell, Flame, TrendingUp, CheckCircle2, ArrowRight, Utensils, AlertCircle } from 'lucide-react';
import { UserProfile, IntakeLog, MealPlan, Recipe } from '../types';
import { analyzeNutritionDeficitsAndSuggestMacros, MacroBalanceAnalysisResult } from '../lib/gemini';
import { playSfx, vibrate } from '../lib/sensory';

interface AiMacroBalanceEngineModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile?: UserProfile | null;
  mealPlan: MealPlan;
  onUpdatePlan: (day: string, mealType: string, recipeId: string | null, recipeObj?: Recipe) => void;
  addNotification?: (notification: { title: string; message: string; type?: string }) => void;
}

export function AiMacroBalanceEngineModal({
  isOpen,
  onClose,
  profile,
  mealPlan,
  onUpdatePlan,
  addNotification
}: AiMacroBalanceEngineModalProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<MacroBalanceAnalysisResult | null>(null);
  const [appliedRecommendations, setAppliedRecommendations] = useState<Record<string, boolean>>({});

  if (!isOpen) return null;

  const handleRunAnalysis = async () => {
    setIsAnalyzing(true);
    playSfx('crystal');
    vibrate([30, 50]);

    try {
      const result = await analyzeNutritionDeficitsAndSuggestMacros(
        profile || null,
        profile?.intakeLogs || [],
        mealPlan
      );
      setAnalysisResult(result);
      playSfx('success');
      vibrate(40);
    } catch (err: any) {
      console.error("Erro na análise de deficiências nutricionais:", err);
      if (addNotification) {
        addNotification({
          title: "Erro na Análise da IA",
          message: "Não foi possível concluir a análise no momento. Tente novamente.",
          type: "error"
        });
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleApplyRecommendation = (rec: MacroBalanceAnalysisResult['recommendations'][0], idx: number) => {
    const recipeId = `macro_fix_${Date.now()}_${idx}`;
    const recipeToSave: Recipe = {
      id: recipeId,
      name: rec.suggestedRecipe.name,
      title: rec.suggestedRecipe.name,
      description: rec.suggestedRecipe.description,
      prepTime: rec.suggestedRecipe.prepTime || '10 min',
      ingredients: rec.suggestedRecipe.ingredients || [],
      instructions: rec.suggestedRecipe.instructions || [],
      nutrition: rec.suggestedRecipe.nutrition || { calories: 300, protein: 25, carbs: 30, fat: 10, fiber: 5 },
      tags: ['IA Macro Balance', 'Equilíbrio Nutricional']
    };

    const targetDay = rec.targetDay || 'Quarta-feira';
    const targetMeal = rec.mealType?.toLowerCase().includes('almo') ? 'lunch'
      : rec.mealType?.toLowerCase().includes('jant') ? 'dinner'
      : rec.mealType?.toLowerCase().includes('caf') ? 'breakfast'
      : 'snack';

    onUpdatePlan(targetDay, targetMeal, recipeId, recipeToSave);
    setAppliedRecommendations(prev => ({ ...prev, [idx]: true }));
    playSfx('success');
    vibrate(30);

    if (addNotification) {
      addNotification({
        title: "Receita Aplicada com Sucesso! 🍳",
        message: `"${recipeToSave.name}" adicionada em ${targetDay} (${targetMeal}) para equilibrar seus macros.`,
        type: "success"
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-300">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-4xl max-h-[92vh] bg-slate-900 border border-emerald-500/30 rounded-[32px] shadow-2xl flex flex-col overflow-hidden text-slate-100"
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-emerald-950/60 via-slate-900 to-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shadow-lg">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-serif text-2xl font-bold tracking-tight text-white">
                  Mecanismo de Sugestão de IA (Macro Balance Engine)
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30">
                  Automático 🧠
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Analisa suas deficiências nutricionais anteriores e sugere receitas para equilibrar sua ingestão semanal.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl border border-slate-700 transition-all cursor-pointer"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {!analysisResult && !isAnalyzing && (
            <div className="py-12 px-4 text-center space-y-4 bg-slate-850/50 rounded-3xl border border-dashed border-slate-800">
              <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/20">
                <TrendingUp className="w-8 h-8" />
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h3 className="text-lg font-bold text-white">Pronto para otimizar sua nutrição semanal?</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  A IA escaneará seu histórico recente de refeições consumidas e seu plano atual para detectar desequilíbrios em proteínas, carboidratos e calorias, gerando ajustes precisos.
                </p>
              </div>
              <button
                onClick={handleRunAnalysis}
                className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm rounded-2xl shadow-xl transition-all cursor-pointer hover:scale-105 active:scale-95 flex items-center gap-2 mx-auto border border-emerald-400/30"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>Iniciar Análise de Deficiências & Macros</span>
              </button>
            </div>
          )}

          {isAnalyzing && (
            <div className="py-20 flex flex-col items-center justify-center space-y-4">
              <Loader2 className="w-10 h-10 text-emerald-400 animate-spin" />
              <div className="text-center space-y-1">
                <p className="text-sm font-bold text-white">Analisando histórico e balanço de macronutrientes...</p>
                <p className="text-xs text-slate-400">Calculando desvios e formulando receitas compensatórias ideais.</p>
              </div>
            </div>
          )}

          {analysisResult && !isAnalyzing && (
            <div className="space-y-6 animate-in fade-in duration-500">
              {/* Summary Card */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/30 space-y-3 shadow-lg">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Diagnóstico Nutricional da IA</span>
                </div>
                <p className="text-sm text-slate-200 leading-relaxed font-medium">
                  {analysisResult.deficitSummary}
                </p>
                {analysisResult.aiCoachMessage && (
                  <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-xs text-emerald-300 flex items-start gap-2.5">
                    <span className="text-base">💡</span>
                    <span>{analysisResult.aiCoachMessage}</span>
                  </div>
                )}
              </div>

              {/* Macro Gap Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/80 space-y-1 text-center">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Déficit Proteico</span>
                  <p className="text-lg font-mono font-bold text-blue-400">
                    {analysisResult.proteinDeficitGrams > 0 ? `-${analysisResult.proteinDeficitGrams}g` : 'Equilibrado'}
                  </p>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/80 space-y-1 text-center">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Carboidratos</span>
                  <p className="text-lg font-mono font-bold text-amber-400">
                    {analysisResult.carbsDeficitGrams !== 0 ? `${analysisResult.carbsDeficitGrams > 0 ? '-' : '+'}${Math.abs(analysisResult.carbsDeficitGrams)}g` : 'Ideal'}
                  </p>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/80 space-y-1 text-center">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Gorduras</span>
                  <p className="text-lg font-mono font-bold text-rose-400">
                    {analysisResult.fatsDeficitGrams !== 0 ? `${analysisResult.fatsDeficitGrams > 0 ? '-' : '+'}${Math.abs(analysisResult.fatsDeficitGrams)}g` : 'Ideal'}
                  </p>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/80 space-y-1 text-center">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Balanço Calórico</span>
                  <p className="text-lg font-mono font-bold text-emerald-400">
                    {analysisResult.calorieGap} kcal
                  </p>
                </div>
              </div>

              {/* Recommendations List */}
              <div className="space-y-3">
                <h4 className="font-serif text-lg font-bold text-white flex items-center gap-2">
                  <Utensils className="w-5 h-5 text-emerald-400" />
                  <span>Receitas Sugeridas para Reequilibrar a Semana</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {analysisResult.recommendations?.map((rec, idx) => {
                    const isApplied = appliedRecommendations[idx];
                    const recipe = rec.suggestedRecipe;
                    const nut = recipe.nutrition || { calories: 300, protein: 25, carbs: 30, fat: 10 };

                    return (
                      <div
                        key={idx}
                        className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-4 space-y-3 flex flex-col justify-between shadow-md"
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-[10px] border border-emerald-500/30">
                              📅 {rec.targetDay} • {rec.mealType}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400">
                              ⏱️ {recipe.prepTime || '10 min'}
                            </span>
                          </div>

                          <h5 className="font-bold text-sm text-white">{recipe.name}</h5>
                          <p className="text-xs text-slate-400 leading-relaxed">{rec.reason}</p>

                          <div className="flex items-center gap-3 pt-1 text-[11px] font-mono text-slate-300">
                            <span className="text-amber-400">🔥 {nut.calories} kcal</span>
                            <span className="text-blue-400">💪 {nut.protein}g prot</span>
                            <span className="text-amber-300">🌾 {nut.carbs}g carbo</span>
                          </div>
                        </div>

                        <div className="pt-3 border-t border-slate-700/60 flex items-center justify-between">
                          <span className="text-[10px] text-slate-500 italic">Preparo rápido & equilibrado</span>
                          <button
                            onClick={() => handleApplyRecommendation(rec, idx)}
                            disabled={isApplied}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                              isApplied
                                ? 'bg-emerald-600 text-white cursor-default'
                                : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                            }`}
                          >
                            {isApplied ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Adicionado ao Plano</span>
                              </>
                            ) : (
                              <>
                                <span>Aplicar ao Plano</span>
                                <ArrowRight className="w-3.5 h-3.5" />
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>O motor de IA ajusta as sugestões com base no seu perfil e metas registradas.</span>
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-all cursor-pointer"
          >
            Concluir
          </button>
        </div>
      </motion.div>
    </div>
  );
}
