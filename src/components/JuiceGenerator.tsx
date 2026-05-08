import { playAudioUrl } from '../lib/speech';
import React, { useState } from 'react';
import { generateJuiceRecipe, textToSpeech } from '../lib/gemini';
import { UserProfile } from '../types';
import { GlassWater, Loader2, Play, Volume2, Sparkles, Plus, Leaf, Flame, HeartPulse, PiggyBank } from 'lucide-react';
import { DetoxBanner } from './DetoxBanner';

interface JuiceGeneratorProps {
  profile: UserProfile | null;
  onAwardPoints?: (amount: number, reason: string) => void;
}

export function JuiceGenerator({ profile, onAwardPoints }: JuiceGeneratorProps) {
  const [ingredients, setIngredients] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedJuice, setGeneratedJuice] = useState<any | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [budgetMode, setBudgetMode] = useState(false);

  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsGenerating(true);
    setGeneratedJuice(null);
    setAudioUrl(null);
    
    try {
      const data = await generateJuiceRecipe(profile, ingredients, budgetMode);
      if (data) {
        setGeneratedJuice(data);
        if (onAwardPoints) onAwardPoints(15, 'Suco funcional personalizado gerado');
      } else {
        alert("Não foi possível gerar a receita de suco. Tente novamente.");
      }
    } catch (err) {
      console.error(err);
      alert("Erro ao gerar a receita de suco.");
    } finally {
      setIsGenerating(false);
    }
  };

  const playTTS = async (text: string) => {
    if (isPlaying) return;
    setIsPlaying(true);
    
    try {
      if (audioUrl) {
        await playAudioUrl(audioUrl, { onEnded: () => setIsPlaying(false) });
        return;
      }

      const base64Audio = await textToSpeech(text);
      if (base64Audio) {
        const url = `data:audio/wav;base64,${base64Audio}`;
        setAudioUrl(url);
        await playAudioUrl(url, { onEnded: () => setIsPlaying(false) });
      } else {
        setIsPlaying(false);
      }
    } catch (error) {
      console.error(error);
      setIsPlaying(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <DetoxBanner />

      <div className="text-center space-y-4">
        <h2 className="font-serif text-4xl md:text-5xl font-medium tracking-tight text-emerald-700 dark:text-emerald-400">
          Sucos Funcionais
        </h2>
        <p className="font-sans text-slate-500 dark:text-slate-400 max-w-2xl mx-auto text-lg leading-relaxed">
          Sucos naturais focados em emagrecimento, metabolismo e saúde, totalmente personalizados para o seu perfil e objetivos.
        </p>
      </div>

      <div className="clay-card p-8">
        <form onSubmit={handleGenerate} className="space-y-6">
          <div className="space-y-4">
            <label className="block font-sans text-sm font-semibold tracking-wide uppercase text-slate-400 dark:text-slate-500">
              Tenho esses ingredientes
            </label>
            <input
              type="text"
              value={ingredients}
              onChange={(e) => setIngredients(e.target.value)}
              placeholder="Ex: abacaxi, maçã, couve, hortelã..."
              className="w-full p-4 bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border border-white/40 dark:border-slate-600/50 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500/30 font-sans text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all shadow-sm"
            />
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
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
                  {budgetMode ? 'Sucos de baixo custo' : 'Frutas da estação'}
                </p>
              </div>
            </button>

            <button
              type="submit"
              disabled={isGenerating}
              className="flex items-center justify-center gap-3 w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-2xl font-medium transition-all shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/40 disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-0.5"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Criando receita ideal...
                </>
              ) : (
                <>
                  <GlassWater className="w-5 h-5" />
                  Gerar Suco Detox
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {generatedJuice && (
        <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 space-y-8">
          
          {generatedJuice.assistantMessage && (
            <div className="flex items-start gap-4 clay-card p-6 shadow-sm relative overflow-hidden">
               <button
                  onClick={() => playTTS(generatedJuice.assistantMessage)}
                  className={`w-12 h-12 rounded-full shrink-0 flex items-center justify-center text-white bg-emerald-500 transition-all ${isPlaying ? 'animate-pulse ring-4 ring-emerald-500/30' : 'hover:scale-105 shadow-md'}`}
                  title="Ouvir assistente"
                >
                  {isPlaying ? <Volume2 className="w-5 h-5" /> : <Play className="w-5 h-5 ml-1" />}
                </button>
                <div>
                  <h4 className="font-serif text-xl text-emerald-800 dark:text-emerald-400 font-medium mb-1">Assistente NutriAI diz:</h4>
                  <p className="font-sans text-slate-700 dark:text-slate-300 text-lg leading-relaxed italic">
                    "{generatedJuice.assistantMessage}"
                  </p>
                </div>
            </div>
          )}

          <div className="bg-white/40 dark:bg-slate-800/40 backdrop-blur-xl rounded-[32px] clay-card overflow-hidden shadow-xl border border-white/60 dark:border-slate-700/50">
            <div className="bg-gradient-to-br from-emerald-50/80 to-yellow-50/80 dark:from-emerald-900/30 dark:to-yellow-900/20 p-8 md:p-12 border-b border-white/60 dark:border-slate-700/50">
              <div className="flex items-center gap-3 mb-4">
                <Sparkles className="w-6 h-6 text-emerald-500" />
                <h3 className="font-serif text-3xl md:text-4xl leading-tight text-slate-800 dark:text-slate-100">
                  {generatedJuice.name}
                </h3>
              </div>
              
              <div className="flex flex-wrap items-center gap-3 mt-6">
                <div className="flex items-center gap-2 bg-white/60 dark:bg-slate-800/60 px-4 py-2 rounded-full border border-white/60 dark:border-slate-600/50 shadow-sm text-sm font-medium text-slate-600 dark:text-slate-300">
                  <Flame className="w-4 h-4 text-orange-500" />
                  {generatedJuice.nutrition.calories} kcal
                </div>
                <div className="flex items-center gap-2 bg-white/60 dark:bg-slate-800/60 px-4 py-2 rounded-full border border-white/60 dark:border-slate-600/50 shadow-sm text-sm font-medium text-slate-600 dark:text-slate-300">
                  <Leaf className="w-4 h-4 text-emerald-500" />
                  Fibras: {generatedJuice.nutrition.fiber}g
                </div>
                <div className="flex items-center gap-2 bg-white/60 dark:bg-slate-800/60 px-4 py-2 rounded-full border border-white/60 dark:border-slate-600/50 shadow-sm text-sm font-medium text-slate-600 dark:text-slate-300">
                  <HeartPulse className="w-4 h-4 text-rose-500" />
                  Carboidratos: {generatedJuice.nutrition.carbs}g
                </div>
              </div>
            </div>

            <div className="p-8 md:p-12 grid grid-cols-1 md:grid-cols-2 gap-12 bg-white/20 dark:bg-slate-900/20">
              
              <div className="space-y-8">
                <div className="space-y-4">
                  <h4 className="font-sans text-xs font-bold tracking-widest uppercase text-slate-400 dark:text-slate-500 border-b border-white/40 dark:border-slate-700/50 pb-4">
                    Ingredientes
                  </h4>
                  <ul className="space-y-3">
                    {generatedJuice.ingredients.map((ing: string, idx: number) => (
                      <li key={idx} className="flex gap-3 text-slate-600 dark:text-slate-300 font-medium items-center">
                        <Plus className="w-4 h-4 text-emerald-500 shrink-0" />
                        <span className="leading-relaxed">{ing}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-4">
                  <h4 className="font-sans text-xs font-bold tracking-widest uppercase text-slate-400 dark:text-slate-500 border-b border-white/40 dark:border-slate-700/50 pb-4">
                    Benefícios para o seu objetivo
                  </h4>
                  <ul className="space-y-3">
                    {generatedJuice.benefits.map((ben: string, idx: number) => (
                      <li key={idx} className="flex gap-3 text-slate-600 dark:text-slate-300 items-start">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2 shrink-0"></div>
                        <span className="leading-relaxed">{ben}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="space-y-6">
                <h4 className="font-sans text-xs font-bold tracking-widest uppercase text-slate-400 dark:text-slate-500 border-b border-white/40 dark:border-slate-700/50 pb-4">
                  Modo de Preparo
                </h4>
                <div className="space-y-5">
                  {generatedJuice.instructions.map((step: string, idx: number) => (
                    <div key={idx} className="flex gap-4 group">
                      <div className="w-8 h-8 rounded-full bg-white/60 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border border-white/60 dark:border-slate-600/50 flex items-center justify-center font-serif text-lg flex-shrink-0 group-hover:bg-emerald-500 group-hover:text-white group-hover:border-emerald-500 transition-all">
                        {idx + 1}
                      </div>
                      <p className="text-slate-600 dark:text-slate-300 leading-relaxed pt-1">
                        {step}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
