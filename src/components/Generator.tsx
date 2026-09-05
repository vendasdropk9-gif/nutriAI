import React, { useState, useRef, useEffect } from 'react';
import { generateRecipe } from '../lib/gemini';
import { Recipe, UserProfile } from '../types';
import { Loader2, ChefHat, PiggyBank, Star, Mic, MicOff, Flame, Sparkles, Lightbulb, X, Check, Leaf, ShieldAlert, Info, ArrowRight } from 'lucide-react';
import { RecipeCard } from './RecipeCard';
import { Scanner } from './Scanner';
import { Skeleton } from './Skeleton';
import { motion, AnimatePresence } from 'motion/react';
import { playSfx, vibrate } from '../lib/sensory';
import { useLocalStorage } from '../hooks/useLocalStorage';

interface GeneratorProps {
  onSaveRecipe: (recipe: Recipe) => void;
  profile: UserProfile | null;
  onAwardPoints?: (amount: number, reason: string) => void;
  onGeneratingChange?: (generating: boolean) => void;
}

export function Generator({ onSaveRecipe, profile, onAwardPoints, onGeneratingChange }: GeneratorProps) {
  const [ingredients, setIngredients] = useState('');
  const [preferences, setPreferences] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedRecipe, setGeneratedRecipe] = useState<Recipe | null>(null);
  const [budgetMode, setBudgetMode] = useState(false);
  
  // Smart Tip Pop-up State
  const [hasSeenDietTip, setHasSeenDietTip] = useLocalStorage<boolean>('nutri-generator-diet-tip-seen', false);
  const [showTipModal, setShowTipModal] = useState(false);

  useEffect(() => {
    if (!hasSeenDietTip) {
      const timer = setTimeout(() => {
        setShowTipModal(true);
        playSfx('crystal');
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [hasSeenDietTip]);

  const handleDismissTip = (permanent = true) => {
    playSfx('tap');
    vibrate(15);
    setShowTipModal(false);
    if (permanent) {
      setHasSeenDietTip(true);
    }
  };

  const handleToggleTipTag = (tag: string) => {
    playSfx('pop');
    vibrate(20);
    setPreferences(prev => {
      if (prev.includes(tag)) {
        return prev.replace(tag, '').replace(/,\s*,/g, ',').replace(/^,|,$/g, '').trim();
      }
      return prev ? `${prev}, ${tag}` : tag;
    });
  };
  
  const [rating, setRating] = useState<number>(0);
  const [isRated, setIsRated] = useState(false);

  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const recognitionRef = useRef<any>(null);

  // Clean up speech recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {}
        recognitionRef.current = null;
      }
    };
  }, []);

  // Listen to global search recipe selection or ingredient search
  useEffect(() => {
    const handleSearchRecipe = (e: any) => {
      const { ingredients: searchIngredients, preferences: searchPref } = e.detail || {};
      if (searchIngredients) {
        setIngredients(searchIngredients);
      }
      if (searchPref) {
        setPreferences(searchPref);
      }
    };
    window.addEventListener('app:searchRecipeOrIngredient', handleSearchRecipe);
    return () => window.removeEventListener('app:searchRecipeOrIngredient', handleSearchRecipe);
  }, []);

  const toggleListening = async () => {
    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
      setIsListening(false);
      setInterimTranscript('');
      playSfx('tap');
      vibrate(20);
      return;
    }

    const SpeechRecognitionAPI =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      alert(
        'Seu navegador atual não possui suporte nativo ao microfone via Web Speech. Recomendamos utilizar o Google Chrome, Microsoft Edge ou Safari para ditar ingredientes.'
      );
      return;
    }

    // Warmup audio permissions if needed
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true }).catch(() => null);
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
        }
      }
    } catch (e) {
      console.warn('Microphone permission check:', e);
    }

    try {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {}
      }

      const rec = new SpeechRecognitionAPI();
      rec.continuous = false;
      rec.interimResults = true;
      rec.lang = 'pt-BR';
      rec.maxAlternatives = 1;

      rec.onstart = () => {
        setIsListening(true);
        setInterimTranscript('');
        playSfx('pop');
        vibrate(30);
      };

      rec.onresult = (event: any) => {
        let interim = '';
        let final = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const trans = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            final += trans;
          } else {
            interim += trans;
          }
        }

        if (interim) {
          setInterimTranscript(interim);
        }

        if (final) {
          setInterimTranscript('');
          setIngredients(prev => {
            const trimmed = prev.trim();
            if (!trimmed) return final.trim();
            if (trimmed.endsWith(',') || trimmed.endsWith(';') || trimmed.endsWith('.')) {
              return `${trimmed} ${final.trim()}`;
            }
            return `${trimmed}, ${final.trim()}`;
          });
          playSfx('success');
          vibrate([40, 40]);
        }
      };

      rec.onerror = (event: any) => {
        console.warn('Speech recognition error in Generator:', event.error);
        setIsListening(false);
        setInterimTranscript('');
        if (event.error === 'not-allowed' || event.error === 'permission-denied') {
          alert('Acesso ao microfone bloqueado. Por favor, permita o acesso ao microfone nas configurações do seu navegador para ditar ingredientes.');
          playSfx('scratch');
        } else if (event.error !== 'aborted' && event.error !== 'no-speech') {
          playSfx('scratch');
        }
      };

      rec.onend = () => {
        setIsListening(false);
        setInterimTranscript('');
      };

      recognitionRef.current = rec;
      rec.start();
    } catch (err) {
      console.warn('Failed to start speech recognition:', err);
      setIsListening(false);
      setInterimTranscript('');
      alert('Não foi possível iniciar o microfone neste momento. Verifique as permissões de áudio do seu navegador.');
    }
  };

  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsGenerating(true);
    if (onGeneratingChange) onGeneratingChange(true);
    setGeneratedRecipe(null);
    setRating(0);
    setIsRated(false);
    
    try {
      const data = await generateRecipe(ingredients, profile, budgetMode, preferences);
      if (data) {
        setGeneratedRecipe({ ...data, id: crypto.randomUUID() });
        if (onAwardPoints) onAwardPoints(20, 'Receita personalizada gerada');
      } else {
        alert("Não foi possível gerar a receita. Tente novamente.");
      }
    } catch (err) {
      console.warn(err);
      alert("Erro ao gerar a receita.");
    } finally {
      setIsGenerating(false);
      if (onGeneratingChange) onGeneratingChange(false);
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
        <h2 className="font-serif text-4xl md:text-5xl font-medium tracking-tight text-emerald-700 dark:text-emerald-400">
          Descubra Novas Refeições
        </h2>
        <p className="font-sans text-slate-500 dark:text-slate-400 max-w-xl mx-auto text-lg leading-relaxed">
          Informe o que você tem na geladeira ou tire uma foto. A Inteligência Artificial criará uma receita exclusiva respeitando seu perfil.
        </p>

        {/* 1-Tap Quick Dishes Button */}
        <div className="pt-2 flex justify-center">
          <button
            type="button"
            onClick={() => {
              playSfx('tap');
              vibrate(20);
              window.dispatchEvent(new CustomEvent('app:changeTab', { detail: 'quickdishes' }));
            }}
            className="inline-flex items-center gap-2.5 px-6 py-3 rounded-full bg-gradient-to-r from-orange-500 via-amber-500 to-emerald-500 hover:from-orange-600 hover:to-emerald-600 text-white font-extrabold text-xs sm:text-sm shadow-md hover:shadow-lg transition-all transform hover:scale-105"
          >
            <Flame className="w-4 h-4 text-white animate-pulse" />
            <span>🍽️ GERAR PRATOS RÁPIDOS (1 TOQUE)</span>
            <Sparkles className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1 space-y-6">
          <Scanner onIngredientsDetected={handleIngredientsDetected} />
        </div>

        <div className="md:col-span-2 clay-card p-8">
          <form onSubmit={handleGenerate} className="space-y-8">
            <div className="grid grid-cols-1 gap-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <label htmlFor="ingredients" className="block font-sans text-sm font-semibold tracking-wide uppercase text-slate-400">
                    Ingredientes Disponíveis
                  </label>
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={toggleListening}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all shadow-md cursor-pointer ${
                      isListening
                        ? 'bg-rose-500 text-white animate-pulse shadow-rose-500/30 ring-2 ring-rose-300'
                        : 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 hover:bg-emerald-500/20 shadow-emerald-500/5 dark:bg-emerald-500/10 dark:text-emerald-400'
                    }`}
                    id="speech-recognition-toggle-btn"
                  >
                    {isListening ? (
                      <>
                        <MicOff className="w-3.5 h-3.5 animate-bounce" />
                        <span>Ouvindo... (Clique p/ Concluir)</span>
                      </>
                    ) : (
                      <>
                        <Mic className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>Falar Ingredientes</span>
                      </>
                    )}
                  </motion.button>
                </div>
                <div className="relative">
                  <textarea
                    id="ingredients"
                    value={ingredients}
                    onChange={(e) => setIngredients(e.target.value)}
                    placeholder={
                      isListening
                        ? "Ouvindo você... Fale seus ingredientes (ex: ovos, tomate, queijo, aveia)..."
                        : "Ex: frango, brócolis, arroz... ou use a câmera 👈 ou microfone 🎤"
                    }
                    className={`w-full h-32 p-4 bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500/30 font-sans text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all resize-none shadow-sm pb-10 ${
                      isListening ? 'border-rose-500/50 ring-2 ring-rose-500/20 bg-rose-50/10 dark:bg-rose-950/10' : 'border-white/40 dark:border-slate-600/50'
                    }`}
                  />
                  <div className="absolute bottom-3 right-3 flex items-center gap-1.5 pointer-events-none select-none max-w-[80%]">
                    {isListening ? (
                      <div className="flex gap-1.5 items-center justify-center bg-rose-500/10 dark:bg-rose-950/60 px-3 py-1 rounded-full border border-rose-500/30 shadow-xs">
                        <span className="w-1.5 h-3 bg-rose-500 rounded-full animate-[pulse_0.4s_infinite_alternate]" />
                        <span className="w-1.5 h-4 bg-rose-500 rounded-full animate-[pulse_0.3s_infinite_alternate_0.1s]" />
                        <span className="w-1.5 h-3 bg-rose-500 rounded-full animate-[pulse_0.4s_infinite_alternate_0.2s]" />
                        <span className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold tracking-tight truncate">
                          {interimTranscript ? `"${interimTranscript}"` : 'Gravando voz...'}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 opacity-60">
                        <Mic className="w-3 h-3 text-emerald-500" />
                        <span className="text-[9px] text-slate-400 font-mono">Microfone Ativo</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <label className="block font-sans text-xs sm:text-sm font-bold tracking-wider uppercase text-slate-500 dark:text-slate-400">
                      Objetivo & Dieta
                    </label>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      playSfx('pop');
                      setShowTipModal(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/25 transition-all cursor-pointer whitespace-nowrap active:scale-95 shadow-xs"
                    title="Ver dica de restrições alimentares"
                    id="btn-reopen-diet-smart-tip"
                  >
                    <Lightbulb className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span className="whitespace-nowrap">Dica de Restrições (Vegano, Sem Glúten...)</span>
                  </button>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-2.5 p-3.5 sm:p-4 rounded-2xl bg-white/40 dark:bg-slate-800/40 border border-white/50 dark:border-slate-700/50 shadow-xs">
                  {[
                    { label: 'Emagrecimento', icon: '🔥' },
                    { label: 'Ganho de massa', icon: '💪' },
                    { label: 'Diabetes', icon: '🩸' },
                    { label: 'Hipertensão', icon: '❤️' },
                    { label: 'Vegetariano', icon: '🥦' },
                    { label: 'Vegano', icon: '🌿' },
                    { label: 'Sem glúten', icon: '🌾' },
                    { label: 'Sem lactose', icon: '🥛' },
                  ].map(item => {
                    const isSelected = preferences.includes(item.label);
                    return (
                      <button
                        key={item.label}
                        type="button"
                        onClick={() => {
                          playSfx('pop');
                          vibrate(15);
                          if (isSelected) {
                            setPreferences(prev => prev.replace(item.label, '').replace(/,\s*,/g, ',').replace(/^,|,$/g, '').trim());
                          } else {
                            setPreferences(prev => prev ? `${prev}, ${item.label}` : item.label);
                          }
                        }}
                        className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer select-none active:scale-95 border ${
                          isSelected
                            ? 'bg-emerald-600 dark:bg-emerald-500 text-white border-emerald-600 dark:border-emerald-500 shadow-md shadow-emerald-500/20 scale-[1.02]'
                            : 'bg-white/80 dark:bg-slate-700/60 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-slate-700 dark:text-slate-200 border-slate-200/80 dark:border-slate-600/60 hover:border-emerald-500/40'
                        }`}
                      >
                        <span className="text-xs">{item.icon}</span>
                        <span className="whitespace-nowrap">{item.label}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 ml-0.5 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-4">
                <label htmlFor="preferences" className="block font-sans text-sm font-semibold tracking-wide uppercase text-slate-400">
                  Outras Restrições ou Preferências Extras
                </label>
                <input
                  id="preferences"
                  type="text"
                  value={preferences}
                  onChange={(e) => setPreferences(e.target.value)}
                  placeholder="Ex: sem amendoim, refeição rápida..."
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

              <motion.button
                type="submit"
                disabled={isGenerating}
                whileHover={!isGenerating ? { scale: 1.02, translateY: -2 } : {}}
                whileTap={!isGenerating ? { scale: 0.98 } : {}}
                className="relative overflow-hidden bg-emerald-500 hover:bg-emerald-600 text-white font-sans font-medium px-8 py-4 rounded-full transition-all duration-300 flex items-center gap-3 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 w-full md:w-auto justify-center disabled:bg-emerald-600/90"
              >
                {/* Shimmer sweep effect during loading */}
                {isGenerating && (
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/35 to-transparent"
                    initial={{ x: '-100%' }}
                    animate={{ x: '100%' }}
                    transition={{
                      repeat: Infinity,
                      duration: 1.2,
                      ease: "linear",
                    }}
                  />
                )}
                
                {isGenerating ? (
                  <>
                    <div className="relative flex items-center justify-center w-5 h-5">
                      <span className="absolute inset-0 rounded-full border-2 border-white/20" />
                      <span className="absolute inset-0 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    </div>
                    <span className="relative z-10 animate-pulse font-semibold">Criando receita...</span>
                  </>
                ) : (
                  <>
                    <ChefHat className="w-5 h-5 transition-transform group-hover:rotate-6" />
                    <span>Gerar Receita Mágica</span>
                  </>
                )}
              </motion.button>
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
          
          <div className="mt-8 clay-card p-6 flex flex-col items-center justify-center space-y-4">
            <h4 className="font-serif text-xl text-slate-800 dark:text-slate-100">O que achou dessa sugestão?</h4>
            {!isRated ? (
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onMouseEnter={() => setRating(star)}
                    onMouseLeave={() => setRating(0)}
                    onClick={() => {
                      setRating(star);
                      setIsRated(true);
                      if (onAwardPoints && star >= 4) {
                        onAwardPoints(5, 'Feedback Positivo da Receita');
                      }
                    }}
                    className={`transition-colors p-2 ${
                      rating >= star ? 'text-amber-400' : 'text-slate-300 dark:text-slate-600 hover:text-amber-300'
                    }`}
                  >
                    <Star className="w-8 h-8 fill-current" />
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-emerald-600 dark:text-emerald-400 font-medium bg-emerald-50 dark:bg-emerald-900/30 px-6 py-3 rounded-full animate-in fade-in zoom-in duration-500">
                Obrigado pelo seu feedback! Isso ajuda a IA a melhorar.
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* Pop-up de Dica Inteligente (Primeiro Acesso / Restrições) */}
      <AnimatePresence>
        {showTipModal && (
          <div 
            id="generator-smart-tip-overlay"
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto select-none"
          >
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => handleDismissTip(true)}
              className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm cursor-pointer"
            />

            {/* Modal Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 15 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 shadow-2xl border border-emerald-500/30 dark:border-emerald-500/20 z-10 overflow-hidden my-auto"
            >
              {/* Top ambient glow */}
              <div className="absolute -top-20 -right-20 w-44 h-44 bg-gradient-to-br from-emerald-500/20 via-teal-500/10 to-transparent rounded-full blur-2xl pointer-events-none" />
              <div className="absolute -bottom-20 -left-20 w-44 h-44 bg-gradient-to-tr from-amber-500/15 via-emerald-500/10 to-transparent rounded-full blur-2xl pointer-events-none" />

              {/* Header */}
              <div className="flex items-center justify-between gap-4 mb-4 shrink-0">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold tracking-wide uppercase bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800/60 shadow-xs">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Dica Inteligente do Chef IA</span>
                </div>

                <button
                  type="button"
                  onClick={() => handleDismissTip(true)}
                  className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Fechar Dica"
                  id="btn-close-generator-diet-tip"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Title & Icon */}
              <div className="flex items-start gap-3.5 mb-3">
                <div className="p-3 rounded-2xl bg-gradient-to-br from-emerald-500/15 to-teal-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 shadow-sm shrink-0">
                  <Leaf className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-xl sm:text-2xl font-bold font-serif text-slate-900 dark:text-white leading-snug">
                    Personalize com Restrições!
                  </h3>
                  <p className="text-xs sm:text-sm font-medium text-emerald-600 dark:text-emerald-400 mt-0.5">
                    Vegano, Sem Glúten, Sem Lactose, Low Carb e mais.
                  </p>
                </div>
              </div>

              {/* Body explanation */}
              <div className="space-y-3.5 text-slate-600 dark:text-slate-300 text-xs sm:text-sm leading-relaxed">
                <p>
                  Você pode incluir qualquer <strong className="text-slate-900 dark:text-white font-bold">intolerância ou restrição alimentar</strong> diretamente na sua solicitação. O Chef IA calcula os macronutrientes ideais e substitui automaticamente ingredientes que você não pode ou não quer consumir.
                </p>

                {/* Quick Selection Tags */}
                <div className="pt-1">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
                    Toque para adicionar às suas preferências agora:
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { label: 'Vegano', icon: '🌿' },
                      { label: 'Sem glúten', icon: '🌾' },
                      { label: 'Sem lactose', icon: '🥛' },
                      { label: 'Vegetariano', icon: '🥦' },
                      { label: 'Diabetes', icon: '🩸' },
                      { label: 'Hipertensão', icon: '❤️' }
                    ].map(item => {
                      const isSelected = preferences.includes(item.label);
                      return (
                        <button
                          key={item.label}
                          type="button"
                          onClick={() => handleToggleTipTag(item.label)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                            isSelected
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm scale-105'
                              : 'bg-slate-50 dark:bg-slate-800/80 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          <span>{item.icon}</span>
                          <span>{item.label}</span>
                          {isSelected && <Check className="w-3.5 h-3.5" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Info Callout */}
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-300">
                  <Info className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span className="leading-snug">
                    Você também pode digitar restrições personalizadas no campo de texto ou pedir por voz (ex: <em>"sem cebola"</em>, <em>"rico em ferro"</em>).
                  </span>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="flex items-center justify-end gap-2.5 pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 shrink-0">
                <button
                  type="button"
                  onClick={() => handleDismissTip(false)}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors cursor-pointer"
                >
                  Lembrar depois
                </button>

                <button
                  type="button"
                  onClick={() => handleDismissTip(true)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer"
                  id="btn-confirm-generator-diet-tip"
                >
                  <Check className="w-4 h-4" />
                  <span>Entendi, Começar!</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
