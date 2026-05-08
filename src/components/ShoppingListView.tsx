import React, { useMemo } from 'react';
import { MealPlan } from '../types';
import { CheckCircle2, Circle, ShoppingBag } from 'lucide-react';
import { useLocalStorage } from '../hooks/useLocalStorage';

interface ShoppingListViewProps {
  mealPlan: MealPlan;
}

export function ShoppingListView({ mealPlan }: ShoppingListViewProps) {
  const [checkedItems, setCheckedItems] = useLocalStorage<Record<string, boolean>>('nutri-shopping-checked', {});

  // Extract all ingredients from the meal plan
  const list = useMemo(() => {
    const items = new Set<string>();
    
    Object.values(mealPlan).forEach(day => {
      Object.values(day.meals).forEach(recipe => {
        if (recipe) {
          recipe.ingredients.forEach(ing => items.add(ing));
        }
      });
    });
    
    return Array.from(items).map(name => ({ 
      name, 
      checked: !!checkedItems[name] 
    }));
  }, [mealPlan, checkedItems]);

  const toggleItem = (name: string) => {
    setCheckedItems(prev => ({
      ...prev,
      [name]: !prev[name]
    }));
  };

  const completedCount = list.filter(i => i.checked).length;
  const totalCount = list.length;
  const progress = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);

  if (list.length === 0) {
    return (
      <div className="text-center py-24 animate-in fade-in slide-in-from-bottom-4">
        <ShoppingBag className="w-16 h-16 mx-auto text-slate-300 dark:text-slate-600 mb-6" />
        <h3 className="font-serif text-3xl font-medium text-slate-600 dark:text-slate-400 mb-4">Lista Vazia</h3>
        <p className="font-sans text-slate-500 dark:text-slate-400 text-lg">
          Adicione refeições ao seu plano para gerar uma lista de compras automaticamente.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="text-center space-y-4 mb-12">
        <h2 className="font-serif text-4xl md:text-5xl font-medium tracking-tight text-emerald-700 dark:text-emerald-400">
          Lista de Compras
        </h2>
        <p className="font-sans text-slate-500 dark:text-slate-400 text-lg leading-relaxed">
          Ingredientes baseados no seu plano de refeições semanal.
        </p>
      </div>

      <div className="bg-white/40 dark:bg-slate-800/40 backdrop-blur-xl rounded-[32px] clay-card p-8 shadow-xl border border-white/60 dark:border-slate-700/50">
        <div className="flex items-center justify-between mb-8 pb-8 border-b border-white/40 dark:border-slate-700/50">
          <div>
            <p className="font-sans font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider text-sm mb-2">Progresso</p>
            <p className="font-serif text-3xl text-emerald-700 dark:text-emerald-400">{completedCount} de {totalCount} itens</p>
          </div>
          <div className="w-24 h-24 rounded-full border-4 border-white/60 dark:border-slate-700/50 flex items-center justify-center relative">
            <svg className="absolute inset-0 w-full h-full -rotate-90">
              <circle
                cx="48"
                cy="48"
                r="46"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
                className="text-emerald-500 dark:text-emerald-400 transition-all duration-1000 ease-out"
                strokeDasharray="289"
                strokeDashoffset={289 - (289 * progress) / 100}
              />
            </svg>
            <span className="font-sans font-bold text-xl text-slate-700 dark:text-slate-200">{progress}%</span>
          </div>
        </div>

        <ul className="space-y-2">
          {list.map((item, idx) => (
            <li key={idx}>
              <button
                onClick={() => toggleItem(item.name)}
                className="w-full flex items-start gap-4 p-4 rounded-2xl hover:bg-white/40 dark:hover:bg-slate-700/40 border border-transparent hover:border-white/60 dark:hover:border-slate-600/50 transition-all text-left group"
              >
                {item.checked ? (
                  <CheckCircle2 className="w-6 h-6 text-emerald-500 dark:text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <Circle className="w-6 h-6 text-slate-400 dark:text-slate-500 group-hover:text-emerald-400 shrink-0 mt-0.5 transition-colors" />
                )}
                <span className={`font-medium leading-relaxed transition-colors ${
                  item.checked ? 'text-slate-400 dark:text-slate-500 line-through' : 'text-slate-700 dark:text-slate-200'
                }`}>
                  {item.name}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
