import React, { useState } from 'react';
import { Search, Sparkles, Loader2, Utensils } from 'lucide-react';
import { Recipe, UserProfile } from '../types';
import { generateRecipe } from '../lib/gemini';
import { motion } from 'motion/react';

interface RecipeSearchPanelProps {
  profile: UserProfile | null;
  savedRecipes: Recipe[];
  onFoundRecipes: (recipes: Recipe[]) => void;
}

export function RecipeSearchPanel({ profile, savedRecipes, onFoundRecipes }: RecipeSearchPanelProps) {
  const [query, setQuery] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleSearch = () => {
    if (!query) {
      onFoundRecipes(savedRecipes);
      return;
    }
    const lowerQuery = query.toLowerCase();
    const filtered = savedRecipes.filter(
      r => r.name.toLowerCase().includes(lowerQuery) || 
           r.ingredients.some(i => i.toLowerCase().includes(lowerQuery))
    );
    onFoundRecipes(filtered);
  };

  const handleGenerate = async () => {
    if (!query) return;
    setIsGenerating(true);
    try {
      const newRecipe = await generateRecipe(query, profile);
      if (newRecipe) {
        onFoundRecipes([{ id: crypto.randomUUID(), ...newRecipe } as Recipe]);
      }
    } catch (e) {
      console.error("Erro ao gerar receita:", e);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-[24px] p-6 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
      <h4 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
        <Utensils className="w-5 h-5 text-indigo-500" />
        Busca e IA de Receitas
      </h4>
      <div className="relative">
        <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Buscar ou digitar ingredientes..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 font-sans text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>
      <div className="flex gap-2">
        <button
          onClick={handleSearch}
          className="flex-1 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
        >
          Pesquisar Salvas
        </button>
        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="flex-1 bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2"
        >
          {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          Gerar com IA
        </button>
      </div>
    </div>
  );
}
