import React, { useState, useRef, useEffect } from 'react';
import { generateRecipe } from '../lib/gemini';
import { Recipe, UserProfile } from '../types';
import { Loader2, ChefHat, PiggyBank, Star, Mic, MicOff } from 'lucide-react';
import { RecipeCard } from './RecipeCard';
import { Scanner } from './Scanner';
import { Skeleton } from './Skeleton';
import { motion } from 'motion/react';
import { playSfx, vibrate } from '../lib/sensory';

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
  
  const [rating, setRating] = useState<number>(0);
  const [isRated, setIsRated] = useState(false);

  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSpeechSupported(true);
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'pt-BR';

      rec.onstart = () => {
        setIsListening(true);
        playSfx('pop');
        vibrate(30);
      };

      rec.onresult = (event: any) => {
        const transcript = event.results[event.results.length - 1][0].transcript;
        if (transcript) {
          setIngredients(prev => {
            const trimmed = prev.trim();
            if (!trimmed) return transcript;
            if (trimmed.endsWith(',') || trimmed.endsWith(';') || trimmed.endsWith('.')) {
              return `${trimmed} ${transcript}`;
            }
            return `${trimmed}, ${transcript}`;
          });
          playSfx('success');
          vibrate([40, 40]);
        }
      };

      rec.onerror = (event: any) => {
        console.error('Speech recognition error in Generator:', event.error);
        setIsListening(false);
        if (event.error !== 'aborted') {
          playSfx('scratch');
        }
      };

      rec.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = rec;
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {}
      }
    };
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
      playSfx('tap');
      vibrate(20);
    } else {
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.error('Failed to start speech recognition:', err);
      }
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
      console.error(err);
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
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1">
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
                  {speechSupported && (
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={toggleListening}
                      className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all shadow-md cursor-pointer ${
                        isListening
                          ? 'bg-rose-500 text-white animate-pulse shadow-rose-500/25'
                          : 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 hover:bg-emerald-500/20 shadow-emerald-500/5 dark:bg-emerald-500/10 dark:text-emerald-400'
                      }`}
                      id="speech-recognition-toggle-btn"
                    >
                      {isListening ? (
                        <>
                          <MicOff className="w-3.5 h-3.5 animate-[bounce_1s_infinite]" />
                          Ouvindo... (Parar)
                        </>
                      ) : (
                        <>
                          <Mic className="w-3.5 h-3.5" />
                          Falar Ingredientes
                        </>
                      )}
                    </motion.button>
                  )}
                </div>
                <div className="relative">
                  <textarea
                    id="ingredients"
                    value={ingredients}
                    onChange={(e) => setIngredients(e.target.value)}
                    placeholder={
                      isListening
                        ? "Diga os ingredientes (ex: arroz, feijão, frango grelhado)..."
                        : "Ex: frango, brócolis, arroz... ou use a câmera 👈"
                    }
                    className={`w-full h-32 p-4 bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500/30 font-sans text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all resize-none shadow-sm pb-10 ${
                      isListening ? 'border-rose-500/40 ring-2 ring-rose-500/10' : 'border-white/40 dark:border-slate-600/50'
                    }`}
                  />
                  {speechSupported && (
                    <div className="absolute bottom-3 right-3 flex items-center gap-1.5 pointer-events-none select-none">
                      {isListening ? (
                        <div className="flex gap-1 items-center justify-center bg-rose-500/10 px-2.5 py-1 rounded-full border border-rose-500/20">
                          <span className="w-1 h-2.5 bg-rose-500 rounded-full animate-[pulse_0.4s_infinite_alternate]" />
                          <span className="w-1 h-3.5 bg-rose-500 rounded-full animate-[pulse_0.3s_infinite_alternate_0.1s]" />
                          <span className="w-1 h-2.5 bg-rose-500 rounded-full animate-[pulse_0.4s_infinite_alternate_0.2s]" />
                          <span className="text-[9px] text-rose-500 font-mono font-bold uppercase ml-1 tracking-wider">Gravando...</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 opacity-60">
                          <Mic className="w-3 h-3 text-emerald-500" />
                          <span className="text-[9px] text-slate-400 font-mono">Voz Ativa</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
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
    </div>
  );
}
