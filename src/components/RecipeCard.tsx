import React, { useState, useEffect, useRef } from 'react';
import { Recipe } from '../types';
import { Clock, Flame, Info, ChevronDown, ChevronUp, LeafyGreen, Activity, Volume2, Square } from 'lucide-react';
import { speak, stopSpeech } from '../lib/speech';

interface RecipeCardProps {
  recipe: Recipe;
}

export function RecipeCard({ recipe }: RecipeCardProps) {
  const [isNutritionExpanded, setIsNutritionExpanded] = useState(false);
  const [activeStep, setActiveStep] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const isPlayingRef = useRef(false);
  const currentStepIndexRef = useRef(0);
  const { nutrition } = recipe;

  useEffect(() => {
    return () => {
      stopSpeech();
    };
  }, []);

  const playStep = async (index: number) => {
    if (!isPlayingRef.current) return;
    
    if (index >= recipe.instructions.length) {
      setIsPlaying(false);
      isPlayingRef.current = false;
      setActiveStep(null);
      return;
    }
    
    setActiveStep(index);
    currentStepIndexRef.current = index;
    
    const stepText = `Passo ${index + 1}: ${recipe.instructions[index]}`;
    await speak(stepText, {
      onEnded: () => {
        if (isPlayingRef.current && currentStepIndexRef.current === index) {
          setTimeout(() => {
            playStep(index + 1);
          }, 800);
        }
      },
      onError: () => {
        setIsPlaying(false);
        isPlayingRef.current = false;
        setActiveStep(null);
      }
    });
  };

  const handleToggleSpeak = () => {
    if (isPlaying) {
      stopSpeech();
      setIsPlaying(false);
      isPlayingRef.current = false;
      setActiveStep(null);
    } else {
      stopSpeech();
      setIsPlaying(true);
      isPlayingRef.current = true;
      playStep(0);
    }
  };

  const handlePlaySingleStep = (index: number) => {
    if (isPlaying && activeStep === index) {
      stopSpeech();
      setIsPlaying(false);
      isPlayingRef.current = false;
      setActiveStep(null);
    } else {
      stopSpeech();
      setIsPlaying(true);
      isPlayingRef.current = true;
      playStep(index);
    }
  };

  return (
    <div className="bg-white/40 dark:bg-slate-800/40 backdrop-blur-xl rounded-[32px] clay-card overflow-hidden shadow-xl border border-white/60 dark:border-slate-700/50">
      <div className="bg-white/30 dark:bg-slate-800/30 p-8 md:p-12 border-b border-white/60 dark:border-slate-700/50">
        <h3 className="font-serif text-3xl md:text-4xl leading-tight mb-4 text-slate-800 dark:text-slate-100">
          {recipe.name}
        </h3>
        <p className="font-sans text-slate-500 dark:text-slate-400 text-lg max-w-2xl">
          {recipe.description}
        </p>
        
        <div className="flex flex-wrap gap-4 mt-8">
          <div className="flex items-center gap-2 bg-white/60 dark:bg-slate-800/60 px-4 py-2 rounded-full border border-white/60 dark:border-slate-600/50 shadow-sm text-sm font-medium text-slate-600 dark:text-slate-300">
            <Clock className="w-4 h-4 text-emerald-500" />
            {recipe.prepTime}
          </div>
          <div className="flex items-center gap-2 bg-white/60 dark:bg-slate-800/60 px-4 py-2 rounded-full border border-white/60 dark:border-slate-600/50 shadow-sm text-sm font-medium text-slate-600 dark:text-slate-300">
            <Flame className="w-4 h-4 text-orange-500" />
            {recipe.nutrition.calories} kcal
          </div>
          <div className="flex items-center gap-2 bg-white/60 dark:bg-slate-800/60 px-4 py-2 rounded-full border border-white/60 dark:border-slate-600/50 shadow-sm text-sm font-medium text-slate-600 dark:text-slate-300 lg:ml-auto">
            <Info className="w-4 h-4 text-sky-500" />
            P: {recipe.nutrition.protein}g • C: {recipe.nutrition.carbs}g • G: {recipe.nutrition.fat}g
          </div>
        </div>
      </div>

      <div className="p-8 md:p-12 grid grid-cols-1 md:grid-cols-3 gap-12 bg-white/20 dark:bg-slate-900/20">
        <div className="md:col-span-1 space-y-6">
          <h4 className="font-sans text-xs font-bold tracking-widest uppercase text-slate-400 dark:text-slate-500 border-b border-white/40 dark:border-slate-700/50 pb-4">
            Ingredientes
          </h4>
          <ul className="space-y-4">
            {recipe.ingredients.map((ing, idx) => (
              <li key={idx} className="flex gap-3 text-slate-600 dark:text-slate-300 font-medium">
                <span className="text-emerald-500">▹</span>
                <span className="leading-relaxed">{ing}</span>
              </li>
            ))}
          </ul>
        </div>
        
        <div className="md:col-span-2 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/40 dark:border-slate-700/50 pb-4">
            <h4 className="font-sans text-xs font-bold tracking-widest uppercase text-slate-400 dark:text-slate-500">
              Modo de Preparo
            </h4>
            <button
              onClick={handleToggleSpeak}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold tracking-wide transition-all duration-300 border ${
                isPlaying
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20'
              }`}
            >
              {isPlaying ? (
                <>
                  <Square className="w-3.5 h-3.5 fill-current" />
                  Parar Áudio
                </>
              ) : (
                <>
                  <Volume2 className="w-3.5 h-3.5" />
                  Ouvir Passo a Passo
                </>
              )}
            </button>
          </div>
          
          <div className="space-y-4">
            {recipe.instructions.map((step, idx) => {
              const isActive = activeStep === idx;
              return (
                <div 
                  key={idx} 
                  className={`flex gap-4 group p-3 rounded-2xl transition-all duration-300 border border-transparent ${
                    isActive 
                      ? 'bg-emerald-500/10 dark:bg-emerald-500/20 shadow-md border-emerald-500/20 scale-[1.01]' 
                      : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/20'
                  }`}
                >
                  <button
                    onClick={() => handlePlaySingleStep(idx)}
                    title="Ouvir este passo"
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-serif text-sm flex-shrink-0 transition-all ${
                      isActive
                        ? 'bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-500/20'
                        : 'bg-white/60 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border border-white/60 dark:border-slate-600/50 group-hover:bg-emerald-500 group-hover:text-white group-hover:border-emerald-500'
                    }`}
                  >
                    {isActive ? <Volume2 className="w-4 h-4 text-white animate-pulse" /> : idx + 1}
                  </button>
                  <p className={`text-slate-600 dark:text-slate-300 leading-relaxed pt-1 flex-1 transition-all ${
                    isActive ? 'text-slate-800 dark:text-slate-100 font-medium' : ''
                  }`}>
                    {step}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="mt-8 border-t border-white/40 dark:border-slate-700/50 pt-6">
            <button
              onClick={() => setIsNutritionExpanded(!isNutritionExpanded)}
              className="flex items-center gap-2 text-slate-500 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400 font-medium text-sm uppercase tracking-wide transition-colors"
            >
              <Activity className="w-4 h-4" />
              Detalhes Nutricionais
              {isNutritionExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
                  {isNutritionExpanded && (
              <div className="mt-6 bg-white/40 dark:bg-slate-800/40 border border-white/60 dark:border-slate-700/50 rounded-2xl p-6 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300 space-y-6">
                <div>
                  <h5 className="text-xs uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold mb-3">Macronutrientes (Distribuição Energética)</h5>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Protein */}
                    <div className="bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/10 rounded-xl p-3 flex flex-col justify-between">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-semibold text-emerald-800 dark:text-emerald-400">Proteínas</span>
                        <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {Math.round((nutrition.protein * 4) / ((nutrition.protein * 4) + (nutrition.carbs * 4) + (nutrition.fat * 9) || 1) * 100)}%
                        </span>
                      </div>
                      <div className="text-2xl font-bold font-serif text-emerald-900 dark:text-emerald-100 mb-2">
                        {nutrition.protein}g <span className="text-xs text-slate-400 dark:text-slate-500 font-sans font-normal">({nutrition.protein * 4} kcal)</span>
                      </div>
                      <div className="w-full bg-emerald-500/20 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className="bg-emerald-500 h-full rounded-full" 
                          style={{ width: `${Math.min(100, Math.round(((nutrition.protein * 4) / ((nutrition.protein * 4) + (nutrition.carbs * 4) + (nutrition.fat * 9) || 1)) * 100))}%` }}
                        />
                      </div>
                    </div>

                    {/* Carbs */}
                    <div className="bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/10 rounded-xl p-3 flex flex-col justify-between">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-semibold text-amber-800 dark:text-amber-400">Carboidratos</span>
                        <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400">
                          {Math.round((nutrition.carbs * 4) / ((nutrition.protein * 4) + (nutrition.carbs * 4) + (nutrition.fat * 9) || 1) * 100)}%
                        </span>
                      </div>
                      <div className="text-2xl font-bold font-serif text-amber-900 dark:text-amber-100 mb-2">
                        {nutrition.carbs}g <span className="text-xs text-slate-400 dark:text-slate-500 font-sans font-normal">({nutrition.carbs * 4} kcal)</span>
                      </div>
                      <div className="w-full bg-amber-500/20 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className="bg-amber-500 h-full rounded-full" 
                          style={{ width: `${Math.min(100, Math.round(((nutrition.carbs * 4) / ((nutrition.protein * 4) + (nutrition.carbs * 4) + (nutrition.fat * 9) || 1)) * 100))}%` }}
                        />
                      </div>
                    </div>

                    {/* Fats */}
                    <div className="bg-rose-500/5 dark:bg-rose-500/10 border border-rose-500/10 rounded-xl p-3 flex flex-col justify-between">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-semibold text-rose-800 dark:text-rose-400">Gorduras</span>
                        <span className="text-xs font-mono font-bold text-rose-600 dark:text-rose-400">
                          {Math.round((nutrition.fat * 9) / ((nutrition.protein * 4) + (nutrition.carbs * 4) + (nutrition.fat * 9) || 1) * 100)}%
                        </span>
                      </div>
                      <div className="text-2xl font-bold font-serif text-rose-900 dark:text-rose-100 mb-2">
                        {nutrition.fat}g <span className="text-xs text-slate-400 dark:text-slate-500 font-sans font-normal">({nutrition.fat * 9} kcal)</span>
                      </div>
                      <div className="w-full bg-rose-500/20 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className="bg-rose-500 h-full rounded-full" 
                          style={{ width: `${Math.min(100, Math.round(((nutrition.fat * 9) / ((nutrition.protein * 4) + (nutrition.carbs * 4) + (nutrition.fat * 9) || 1)) * 100))}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t border-white/40 dark:border-slate-700/50 pt-4">
                  <h5 className="text-xs uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold mb-3">Fibras e Açúcares</h5>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    {nutrition.fiber !== undefined && (
                      <div className="flex flex-col">
                        <span className="text-xs uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold mb-1">Fibras</span>
                        <span className="text-slate-700 dark:text-slate-200 font-medium text-lg">{nutrition.fiber}g</span>
                      </div>
                    )}
                    {nutrition.sugar !== undefined && (
                      <div className="flex flex-col">
                        <span className="text-xs uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold mb-1">Açúcares</span>
                        <span className="text-slate-700 dark:text-slate-200 font-medium text-lg">{nutrition.sugar}g</span>
                      </div>
                    )}
                  </div>
                </div>

                {(nutrition.vitamins || nutrition.minerals) && (
                  <div className="mt-6 flex flex-col md:flex-row gap-8 border-t border-white/40 dark:border-slate-700/50 pt-4">
                    {nutrition.vitamins && nutrition.vitamins.length > 0 && (
                      <div className="flex-1">
                         <span className="flex items-center gap-2 text-xs uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-bold mb-3">
                           <LeafyGreen className="w-3 h-3" />
                           Vitaminas Principais
                         </span>
                         <ul className="text-slate-600 dark:text-slate-300 space-y-1 text-sm font-medium">
                           {nutrition.vitamins.map((v, i) => <li key={i}>• {v}</li>)}
                         </ul>
                      </div>
                    )}
                    {nutrition.minerals && nutrition.minerals.length > 0 && (
                      <div className="flex-1">
                         <span className="flex items-center gap-2 text-xs uppercase tracking-wider text-sky-600 dark:text-sky-400 font-bold mb-3">
                           <Activity className="w-3 h-3" />
                           Minerais Principais
                         </span>
                         <ul className="text-slate-600 dark:text-slate-300 space-y-1 text-sm font-medium">
                           {nutrition.minerals.map((m, i) => <li key={i}>• {m}</li>)}
                         </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
