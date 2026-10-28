import React, { useState } from 'react';
import { FridgeItem } from './SmartFridge';
import { generateRecipe } from '../lib/gemini';
import { AlertTriangle, ChefHat, Loader2, Calendar, Clock, Sparkles } from 'lucide-react';
import { useTranslation } from '../contexts/LanguageContext';
import { playSfx, vibrate } from '../lib/sensory';
import { motion } from 'motion/react';

interface ExpirationTrackerProps {
  items: FridgeItem[];
}

export function ExpirationTracker({ items }: ExpirationTrackerProps) {
  const { t } = useTranslation();
  const [isGenerating, setIsGenerating] = useState(false);
  const [recipe, setRecipe] = useState<any | null>(null);

  const expiringItems = items.filter(
    item => item.status === 'perto_vencimento' || item.status === 'vencido'
  );

  const handleGenerateRecipe = async () => {
    if (expiringItems.length === 0) return;
    
    setIsGenerating(true);
    playSfx('tap');
    vibrate(20);
    
    try {
      const ingredientNames = expiringItems.map(item => item.name).join(', ');
      const generatedRecipe = await generateRecipe(ingredientNames, null, false, "Prioritize expiring ingredients");
      setRecipe(generatedRecipe);
      playSfx('success');
      vibrate([30, 50]);
    } catch (err) {
      console.warn("Recipe generation failed:", err);
      alert(t('recipe_gen_failed', 'Não foi possível gerar a receita.'));
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border border-amber-200 dark:border-amber-900 rounded-[28px] p-6 shadow-sm">
        <h3 className="font-serif text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-3">
          <AlertTriangle className="w-6 h-6 text-amber-500" />
          {t('expiration_tracker', 'Rastreador de Validade')}
        </h3>
        <p className="text-slate-600 dark:text-slate-400 mt-2">
          {t('expiration_tracker_desc', 'Ingredientes que precisam de atenção para evitar desperdício.')}
        </p>
      </div>

      {expiringItems.length === 0 ? (
        <div className="text-center py-12 text-slate-500 dark:text-slate-400">
          {t('no_expiring_items', 'Nenhum item vencendo em breve. Tudo sob controle!')}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {expiringItems.map(item => (
              <div key={item.id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${item.status === 'vencido' ? 'bg-rose-500' : 'bg-amber-500'}`} />
                  <div>
                    <p className="font-bold text-slate-800 dark:text-slate-200">{item.name}</p>
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {t('added_at', 'Adicionado em:')} {new Date(item.addedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-rose-600 dark:text-rose-400">{item.status === 'vencido' ? 'Vencido' : 'Perto de vencer'}</p>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={handleGenerateRecipe}
            disabled={isGenerating}
            className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-2xl font-bold transition-all disabled:opacity-50 cursor-pointer shadow-lg shadow-emerald-500/20"
          >
            {isGenerating ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <ChefHat className="w-5 h-5" />
            )}
            {isGenerating ? t('generating_recipe', 'Gerando...') : t('suggest_recipe_ai', 'Sugestão de Receita com IA')}
          </button>
        </div>
      )}

      {recipe && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-900 rounded-[24px] p-6 shadow-md"
        >
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold mb-4">
            <Sparkles className="w-5 h-5" />
            {t('recipe_suggestion', 'Sugestão de Receita')}
          </div>
          <h4 className="text-xl font-bold text-slate-800 dark:text-slate-100">{recipe.name || recipe.title}</h4>
          <p className="text-slate-600 dark:text-slate-400 mt-2">{recipe.description}</p>
          <div className="mt-4">
            <h5 className="font-bold text-slate-800 dark:text-slate-200">{t('ingredients', 'Ingredientes')}</h5>
            <ul className="list-disc list-inside text-sm text-slate-600 dark:text-slate-400 mt-1">
              {(recipe.ingredients || []).map((ing: string, i: number) => <li key={i}>{ing}</li>)}
            </ul>
          </div>
        </motion.div>
      )}
    </div>
  );
}
