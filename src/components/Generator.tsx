import React, { useState } from 'react';
import { generateRecipe } from '../lib/gemini';
import { Recipe, UserProfile } from '../types';
import { Loader2, ChefHat, PiggyBank } from 'lucide-react';
import { RecipeCard } from './RecipeCard';
import { Scanner } from './Scanner';
import { Skeleton } from './Skeleton';

interface GeneratorProps {
  onSaveRecipe: (recipe: Recipe) => void;
  profile: UserProfile | null;
  onAwardPoints?: (amount: number, reason: string) => void;
}

export function Generator({ onSaveRecipe, profile, onAwardPoints }: GeneratorProps) {
  const [ingredients, setIngredients] = useState('');
  const [preferences, setPreferences] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedRecipe, setGeneratedRecipe] = useState<Recipe | null>(null);
  const [budgetMode, setBudgetMode] = useState(false);

  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsGenerating(true);
    setGeneratedRecipe(null);
    
    try {
      const data = await generateRecipe(ingredients, profile, budgetMode, preferences);
      if (data) {
        setGeneratedRecipe({ ...data, id: crypto.randomUUID() });
        if (onAwardPoints) onAwardPoints(20, 'Receita personalizada gerada');
      } else {
        alert("Não foi possível gerar a receita. Tente novamente.");
      }
    } catch (err) {
      console.error(err);
      alert("Erro ao gerar a receita.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = () => {
    if (generatedRecipe) {
      onSaveRecipe(generatedRecipe);
      alert('Receita salva com sucesso!');
    }
  };

  const handleIngredientsDetected = (scannedIngredients: string[]) => {
    const currentList = ingredients ? ingredients.split(',').map(s => s.trim()).filter(Boolean) : [];
    const newList = Array.from(new Set([...currentList, ...scannedIngredients]));
    setIngredients(newList.join(', '));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="text-center space-y-4">
        <h2 className="font-serif text-4xl md:text-5xl font-medium tracking-tight text-emerald-700">
          Descubra Novas Refeições
        </h2>
        <p className="font-sans text-slate-500 max-w-xl mx-auto text-lg leading-relaxed">
          Informe o que você tem na geladeira ou tire uma foto. A Inteligência Artificial criará uma receita exclusiva respeitando seu perfil.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1">
          <Scanner onIngredientsDetected={handleIngredientsDetected} />
        </div>

        <div className="md:col-span-2 clay-card p-8">
          <form onSubmit={handleGenerate} className="space-y-8">
            <div className="grid grid-cols-1 gap-6">
              <div className="space-y-4">
                <label htmlFor="ingredients" className="block font-sans text-sm font-semibold tracking-wide uppercase text-slate-400">
                  Ingredientes Disponíveis
                </label>
                <textarea
                  id="ingredients"
                  value={ingredients}
                  onChange={(e) => setIngredients(e.target.value)}
                  placeholder="Ex: frango, brócolis, arroz... ou use a câmera 👈"
                  className="w-full h-32 p-4 bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border border-white/40 dark:border-slate-600/50 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500/30 font-sans text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all resize-none shadow-sm"
                />
              </div>

              <div className="space-y-4">
                <label htmlFor="preferences" className="block font-sans text-sm font-semibold tracking-wide uppercase text-slate-400">
                  Restrições ou Preferências Extras
                </label>
                <input
                  id="preferences"
                  type="text"
                  value={preferences}
                  onChange={(e) => setPreferences(e.target.value)}
                  placeholder="Ex: sem glúten, vegano, refeição rápida..."
                  className="w-full p-4 bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border border-white/40 dark:border-slate-600/50 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500/30 font-sans text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all shadow-sm"
                />
              </div>
            </div>

            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <button
                type="button"
                onClick={() => setBudgetMode(!budgetMode)}
                className={`flex items-center gap-3 px-6 py-3 rounded-2xl border transition-all ${
                  budgetMode 
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400 font-bold' 
                  : 'bg-white/40 dark:bg-slate-700/30 border-white/60 dark:border-slate-600/50 text-slate-400'
                }`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${budgetMode ? 'bg-amber-500 text-white shadow-lg' : 'bg-slate-100 dark:bg-slate-700'}`}>
                  <PiggyBank className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <p className="text-sm">Modo Economia</p>
                  <p className="text-[10px] leading-tight opacity-70">
                    {budgetMode ? 'Focado em baixo custo' : 'Ingredientes padrão'}
                  </p>
                </div>
              </button>

              <button
                type="submit"
                disabled={isGenerating}
                className="bg-emerald-500 hover:bg-emerald-600 text-white font-sans font-medium px-8 py-4 rounded-full transition-all duration-300 flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 hover:-translate-y-0.5 w-full md:w-auto justify-center"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Criando receita...
                  </>
                ) : (
                  <>
                    <ChefHat className="w-5 h-5" />
                    Gerar Receita Mágica
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {isGenerating ? (
        <div className="pt-8">
          <Skeleton type="recipe" />
        </div>
      ) : generatedRecipe ? (
        <div className="pt-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-serif text-3xl font-medium text-emerald-700 dark:text-emerald-400">Sua Nova Receita</h3>
            <button
              onClick={handleSave}
              className="text-emerald-700 dark:text-emerald-300 bg-white/60 dark:bg-slate-800/60 hover:bg-white/80 dark:hover:bg-slate-700/80 border border-white/60 dark:border-slate-600/50 px-6 py-2.5 rounded-full font-medium transition-colors shadow-sm"
            >
              Salvar Receita
            </button>
          </div>
          <RecipeCard recipe={generatedRecipe} />
        </div>
      ) : null}
    </div>
  );
}
