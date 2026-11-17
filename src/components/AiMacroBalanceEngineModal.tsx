import React, { useState, useEffect } from 'react';
import { UserProfile, IntakeLog, MealPlan, Recipe } from '../types';
import { analyzeNutritionDeficitsAndSuggestMacros, MacroBalanceAnalysisResult } from '../lib/gemini';
import { Sparkles, X, Plus, CheckCircle2, TrendingUp, AlertCircle, ArrowRight, RefreshCw, Flame } from 'lucide-react';

interface AiMacroBalanceEngineModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile | null;
  intakeLogs: IntakeLog[];
  mealPlan: MealPlan;
  onAddRecipeToPlan: (day: string, mealType: string, recipe: Omit<Recipe, "id">) => void;
}

export const AiMacroBalanceEngineModal: React.FC<AiMacroBalanceEngineModalProps> = ({
  isOpen,
  onClose,
  profile,
  intakeLogs,
  mealPlan,
  onAddRecipeToPlan,
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [analysis, setAnalysis] = useState<MacroBalanceAnalysisResult | null>(null);
  const [addedItems, setAddedItems] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (isOpen) {
      runAnalysis();
    }
  }, [isOpen]);

  const runAnalysis = async () => {
    setLoading(true);
    try {
      const res = await analyzeNutritionDeficitsAndSuggestMacros(profile, intakeLogs, mealPlan);
      setAnalysis(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-zinc-900 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-emerald-100 dark:border-zinc-800 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                Motor de Sugestão de IA (Macros)
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                  IA Avançada
                </span>
              </h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Análise semanal de deficiências nutricionais e balanceamento automático
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 flex-1">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center space-y-4">
              <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-zinc-600 dark:text-zinc-400 font-medium animate-pulse">
                Analisando histórico de consumo e calculando desequilíbrios de macronutrientes...
              </p>
            </div>
          ) : analysis ? (
            <>
              {/* Summary Card */}
              <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl p-5 border border-emerald-100 dark:border-emerald-900/50">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-emerald-500 text-white mt-0.5">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-emerald-900 dark:text-emerald-200 mb-1">
                      Diagnóstico Nutricional Semanal
                    </h3>
                    <p className="text-sm text-emerald-800 dark:text-emerald-300/90 leading-relaxed">
                      {analysis.deficitSummary}
                    </p>
                    <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-2 italic">
                      💡 {analysis.aiCoachMessage}
                    </p>
                  </div>
                </div>
              </div>

              {/* Deficit Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 text-center">
                  <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Déficit de Proteína</span>
                  <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                    {analysis.proteinDeficitGrams}g
                  </div>
                </div>
                <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 text-center">
                  <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Déficit de Carboidratos</span>
                  <div className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-1">
                    {analysis.carbsDeficitGrams}g
                  </div>
                </div>
                <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 text-center">
                  <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Déficit de Gorduras</span>
                  <div className="text-xl font-bold text-teal-600 dark:text-teal-400 mt-1">
                    {analysis.fatsDeficitGrams}g
                  </div>
                </div>
                <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 text-center">
                  <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Balanço Calórico</span>
                  <div className="text-xl font-bold text-indigo-600 dark:text-indigo-400 mt-1 flex items-center justify-center gap-1">
                    <Flame className="w-4 h-4" />
                    {analysis.calorieGap} kcal
                  </div>
                </div>
              </div>

              {/* Recommendations list */}
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <span>Receitas Recomendadas para Ajuste</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-normal">
                    {analysis.recommendations?.length || 0} sugestões
                  </span>
                </h4>

                {analysis.recommendations?.map((rec, idx) => {
                  const isAdded = addedItems[idx];
                  return (
                    <div
                      key={idx}
                      className="bg-white dark:bg-zinc-800/80 rounded-2xl p-4 border border-zinc-200 dark:border-zinc-700/60 shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                            {rec.targetDay} • {rec.mealType}
                          </span>
                          <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                            {rec.reason}
                          </span>
                        </div>
                        <h5 className="font-bold text-zinc-900 dark:text-white text-base">
                          {rec.suggestedRecipe.name}
                        </h5>
                        <p className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-2">
                          {rec.suggestedRecipe.description}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-zinc-500 pt-1">
                          <span>🔥 {rec.suggestedRecipe.nutrition.calories} kcal</span>
                          <span>🥩 {rec.suggestedRecipe.nutrition.protein}g P</span>
                          <span>🍞 {rec.suggestedRecipe.nutrition.carbs}g C</span>
                          <span>🥑 {rec.suggestedRecipe.nutrition.fat}g G</span>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          onAddRecipeToPlan(rec.targetDay, rec.mealType, rec.suggestedRecipe);
                          setAddedItems(prev => ({ ...prev, [idx]: true }));
                        }}
                        disabled={isAdded}
                        className={`w-full sm:w-auto px-4 py-2.5 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-all shadow-sm ${
                          isAdded
                            ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 cursor-default'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20'
                        }`}
                      >
                        {isAdded ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            <span>Adicionado ao Plano</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-4 h-4" />
                            <span>Adicionar ao Plano</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="py-12 text-center text-zinc-500">
              Não foi possível carregar a análise no momento.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-900/50 rounded-b-3xl">
          <button
            onClick={runAnalysis}
            className="text-xs text-zinc-600 dark:text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-400 flex items-center gap-1.5 font-medium transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Atualizar Análise</span>
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-medium text-sm hover:opacity-90 transition-opacity"
          >
            Concluir
          </button>
        </div>
      </div>
    </div>
  );
};
