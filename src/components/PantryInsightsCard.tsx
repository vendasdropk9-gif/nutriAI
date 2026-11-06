import React, { useState, useEffect } from 'react';
import { Sparkles, ChefHat, AlertTriangle, ChevronRight } from 'lucide-react';
import { UserProfile, PantryItem } from '../types';
import { checkPantrySpoilage } from '../hooks/usePantrySpoilageChecker';
import { playSfx, vibrate } from '../lib/sensory';

export const PantryInsightsCard = ({ profile, onCookRecipe }: { profile: UserProfile | null, onCookRecipe: (recipe: any) => void }) => {
  const [expiringItems, setExpiringItems] = useState<PantryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchExpiring = async () => {
      setLoading(true);
      try {
        const items = await checkPantrySpoilage(profile);
        setExpiringItems(items);
      } catch (e) {
        console.error("Error fetching expiring items:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchExpiring();
  }, [profile]);

  if (loading || expiringItems.length === 0) return null;

  const handleSuggestion = () => {
    playSfx('tap');
    vibrate(20);
    // In a real scenario, we'd suggest a recipe based on expiringItems
    // For now, navigate to recipes and let them know we found stuff.
    console.log("Suggesting recipe for:", expiringItems);
    onCookRecipe({ name: 'Receita com ' + expiringItems[0].name }); 
  };

  return (
    <div className="w-full card-premium p-5 sm:p-6 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-[32px] mx-auto overflow-hidden">
      <div className="flex items-start gap-4">
        <div className="p-3.5 rounded-2xl bg-indigo-500/20 text-indigo-500 shrink-0">
          <ChefHat className="w-6 h-6" />
        </div>
        <div className="space-y-1 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Insights da Despensa</h3>
            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 text-[10px] font-bold uppercase tracking-wider">
              {expiringItems.length} item(s) expirando
            </span>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {expiringItems[0].name} e outros itens precisam de atenção. Gere uma receita agora para evitar desperdícios!
          </p>
        </div>
      </div>
      
      <button
        onClick={handleSuggestion}
        className="w-full mt-4 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
      >
        <Sparkles className="w-4 h-4" />
        Gerar Receita do Dia
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
};
