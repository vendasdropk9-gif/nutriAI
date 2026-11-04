import React, { useState, useRef, useEffect } from 'react';
import { generateRecipe, generateDishImage } from '../lib/gemini';
import { Recipe, UserProfile } from '../types';
import { Loader2, ChefHat, PiggyBank, Star, Mic, MicOff, Flame, Sparkles, Lightbulb, X, Check, Leaf, ShieldAlert, Info, ArrowRight, Sliders, BarChart2, Camera, RefreshCw, Image as ImageIcon, CheckCircle2, Maximize2, Minimize2, Eye, BookOpen, Volume2, VolumeX, Clock, Printer, Share2, Copy, Utensils, CheckSquare, Plus, Minus, Heart } from 'lucide-react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import { RecipeCard } from './RecipeCard';
import { Scanner } from './Scanner';
import { Skeleton } from './Skeleton';
import { ExpertTips } from './ExpertTips';
import { KitchenModeModal } from './KitchenModeModal';
import { motion, AnimatePresence } from 'motion/react';
import { playSfx, vibrate } from '../lib/sensory';
import { speak, stopSpeech } from '../lib/speech';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useLanguage } from '../contexts/LanguageContext';
import { PrintRecipe } from './PrintRecipe';

interface GeneratorProps {
  onSaveRecipe: (recipe: Recipe) => void;
  profile: UserProfile | null;
  onAwardPoints?: (amount: number, reason: string) => void;
  onGeneratingChange?: (generating: boolean) => void;
  initialIngredients?: string;
}

export function Generator({ onSaveRecipe, profile, onAwardPoints, onGeneratingChange, initialIngredients }: GeneratorProps) {
  const { t } = useLanguage();
  interface FlavorProfile {
    sweet: number;
    salty: number;
    umami: number;
    bitter: number;
    sour: number;
  }

  const computeFlavorProfile = (recipe: Recipe | null): FlavorProfile => {
    if (!recipe) return { sweet: 30, salty: 40, umami: 50, bitter: 20, sour: 35 };
    const text = `${recipe.name || ''} ${recipe.title || ''} ${recipe.description || ''} ${recipe.ingredients.join(' ')}`.toLowerCase();
    
    let sweet = 25;
    let salty = 45;
    let umami = 45;
    let bitter = 20;
    let sour = 30;

    if (text.includes('açúcar') || text.includes('mel') || text.includes('fruta') || text.includes('chocolate') || text.includes('doce') || text.includes('banana') || text.includes('açucar')) sweet += 45;
    if (text.includes('sal') || text.includes('queijo') || text.includes('atum') || text.includes('bacon') || text.includes('shoyu') || text.includes('caldo')) salty += 35;
    if (text.includes('carne') || text.includes('cogumelo') || text.includes('tomate') || text.includes('frango') || text.includes('parmesão')) umami += 45;
    if (text.includes('rúcula') || text.includes('cacau') || text.includes('café') || text.includes('berinjela') || text.includes('espinafre')) bitter += 40;
    if (text.includes('limão') || text.includes('vinagre') || text.includes('laranja') || text.includes('iogurte') || text.includes('limao')) sour += 40;

    return {
      sweet: Math.min(100, Math.max(10, sweet)),
      salty: Math.min(100, Math.max(10, salty)),
      umami: Math.min(100, Math.max(10, umami)),
      bitter: Math.min(100, Math.max(10, bitter)),
      sour: Math.min(100, Math.max(10, sour)),
    };
  };

  const { language } = useLanguage();
  const [ingredients, setIngredients] = useState(initialIngredients || '');
  useEffect(() => {
    if (initialIngredients) setIngredients(initialIngredients);
  }, [initialIngredients]);
  const [preferences, setPreferences] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedRecipe, setGeneratedRecipe] = useState<Recipe | null>(null);
  const [budgetMode, setBudgetMode] = useState(false);
  const [showFlavorAnalysis, setShowFlavorAnalysis] = useState(false);
  const [flavorPreferences, setFlavorPreferences] = useState<FlavorProfile>({
    sweet: 50,
    salty: 50,
    umami: 50,
    bitter: 30,
    sour: 50,
  });

  // Immersive Focus View State
  const [isImmersive, setIsImmersive] = useState(false);
  const [immersiveServings, setImmersiveServings] = useState<number>(2);
  const [checkedIngredients, setCheckedIngredients] = useState<Record<number, boolean>>({});
  const [completedSteps, setCompletedSteps] = useState<Record<number, boolean>>({});
  const [isNarrating, setIsNarrating] = useState(false);
  const [isKitchenModeOpen, setIsKitchenModeOpen] = useState(false);

  // Keyboard shortcut listener to exit Immersive View on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isImmersive) {
        setIsImmersive(false);
        stopSpeech();
        playSfx('pop');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isImmersive]);

  function scaleIngredient(ingredient: string, multiplier: number): string {
    if (multiplier === 1) return ingredient;
    const match = ingredient.match(/^([\d\/.,\s-]+)(.*)$/);
    if (!match) return ingredient;
    
    const numPart = match[1].trim();
    const restPart = match[2];

    let parsedVal: number | null = null;
    if (numPart.includes('/')) {
      const parts = numPart.split('/');
      if (parts.length === 2) {
        parsedVal = parseFloat(parts[0]) / parseFloat(parts[1]);
      }
    } else {
      const cleanedNum = parseFloat(numPart.replace(',', '.'));
      if (!isNaN(cleanedNum)) {
        parsedVal = cleanedNum;
      }
    }

    if (parsedVal === null || isNaN(parsedVal)) {
      return ingredient;
    }

    const scaled = parsedVal * multiplier;
    let formattedNum = '';
    if (scaled >= 10) {
      formattedNum = Math.round(scaled).toString();
    } else if (Math.abs(scaled - Math.round(scaled)) < 0.1) {
      formattedNum = Math.round(scaled).toString();
    } else if (Math.abs(scaled - 0.5) < 0.15) {
      formattedNum = '1/2';
    } else if (Math.abs(scaled - 0.25) < 0.1) {
      formattedNum = '1/4';
    } else if (Math.abs(scaled - 0.75) < 0.1) {
      formattedNum = '3/4';
    } else if (Math.abs(scaled - 1.5) < 0.1) {
      formattedNum = '1 1/2';
    } else {
      formattedNum = scaled.toFixed(1).replace('.', ',');
    }

    return `${formattedNum}${restPart}`;
  }

  const handleToggleNarrateRecipe = (recipeToRead: Recipe) => {
    if (isNarrating) {
      stopSpeech();
      setIsNarrating(false);
    } else {
      stopSpeech();
      setIsNarrating(true);
      const textToRead = `Receita: ${recipeToRead.name}. ${recipeToRead.description}. Ingredientes: ${recipeToRead.ingredients.join(', ')}. Modo de preparo: ${recipeToRead.instructions.join('. ')}`;
      speak(textToRead, {
        voice: 'Aoede',
        onEnded: () => setIsNarrating(false),
        onError: () => setIsNarrating(false)
      });
    }
  };
  
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
      rec.lang = language || 'pt-BR';
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
          const transcript = final.trim().toLowerCase();
          const triggers = ['encontre', 'pesquise', 'find', 'buscar', 'procure'];
          const isSearchCommand = triggers.some(t => transcript.startsWith(t));

          if (isSearchCommand) {
            // Very simple parsing: split by common separators or just assume the whole thing is the query
            // for the existing generation pipeline.
            setIngredients(final.trim());
            playSfx('success');
            vibrate([40, 40]);
            
            // Trigger generation
            handleGenerate();
          } else {
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

  const [generationStep, setGenerationStep] = useState<'text' | 'image' | null>(null);
  const [isRegeneratingImage, setIsRegeneratingImage] = useState(false);

  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsGenerating(true);
    setGenerationStep('text');
    if (onGeneratingChange) onGeneratingChange(true);
    setGeneratedRecipe(null);
    setRating(0);
    setIsRated(false);
    
    try {
      const data = await generateRecipe(ingredients, profile, budgetMode, preferences);
      if (data) {
        setGenerationStep('image');
        
        let finalImageUrl = data.imageUrl || data.image;
        if (!finalImageUrl || !finalImageUrl.startsWith('data:image')) {
          try {
            const aiImageUrl = await generateDishImage(data.name, data.description || '');
            if (aiImageUrl) {
              finalImageUrl = aiImageUrl;
            }
          } catch (imgErr) {
            console.warn("Client side image gen fallback:", imgErr);
          }
        }

        const fallbackUrl = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80";

        const recipeWithImage: Recipe = {
          ...data,
          id: crypto.randomUUID(),
          imageUrl: finalImageUrl || fallbackUrl,
          image: finalImageUrl || fallbackUrl
        };

        setGeneratedRecipe(recipeWithImage);
        playSfx('success');
        vibrate([30, 50]);
        if (onAwardPoints) onAwardPoints(20, 'Receita e Imagem geradas por IA');
      } else {
        alert("Não foi possível gerar a receita. Tente novamente.");
      }
    } catch (err) {
      console.warn(err);
      alert("Erro ao gerar a receita.");
    } finally {
      setIsGenerating(false);
      setGenerationStep(null);
      if (onGeneratingChange) onGeneratingChange(false);
    }
  };

  const handleRegenerateImage = async () => {
    if (!generatedRecipe || isRegeneratingImage) return;
    setIsRegeneratingImage(true);
    playSfx('tap');
    vibrate(15);

    try {
      const newAiImageUrl = await generateDishImage(generatedRecipe.name, generatedRecipe.description || '');
      if (newAiImageUrl) {
        setGeneratedRecipe(prev => prev ? {
          ...prev,
          imageUrl: newAiImageUrl,
          image: newAiImageUrl
        } : prev);
        playSfx('success');
        vibrate([20, 40]);
      } else {
        alert("Não foi possível gerar uma nova imagem no momento.");
      }
    } catch (err) {
      console.warn("Error regenerating dish image:", err);
      alert("Erro ao regerar a imagem do prato.");
    } finally {
      setIsRegeneratingImage(false);
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

  const handleApplyExpertSuggestion = (suggestion: { ingredient?: string; preference?: string }) => {
    if (suggestion.ingredient) {
      setIngredients(prev => {
        const trimmed = prev.trim();
        if (!trimmed) return suggestion.ingredient!;
        if (trimmed.toLowerCase().includes(suggestion.ingredient!.toLowerCase())) return prev;
        if (trimmed.endsWith(',') || trimmed.endsWith(';') || trimmed.endsWith('.')) {
          return `${trimmed} ${suggestion.ingredient}`;
        }
        return `${trimmed}, ${suggestion.ingredient}`;
      });
    }

    if (suggestion.preference) {
      setPreferences(prev => {
        const trimmed = prev.trim();
        if (!trimmed) return suggestion.preference!;
        if (trimmed.toLowerCase().includes(suggestion.preference!.toLowerCase())) return prev;
        if (trimmed.endsWith(',') || trimmed.endsWith(';')) {
          return `${trimmed} ${suggestion.preference}`;
        }
        return `${trimmed}, ${suggestion.preference}`;
      });
    }
  };

  return (
    <div className="w-full max-w-full px-2 sm:px-4 space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 flex flex-col items-center">
      <div className="text-center space-y-4 flex flex-col items-center w-full">
        <h2 className="font-serif text-4xl md:text-5xl font-bold tracking-tight text-emerald-700 dark:text-emerald-400 text-center">
          {t('discover_new_meals', 'Discover New Meals')}
        </h2>
        <p className="font-sans text-slate-500 dark:text-slate-400 max-w-2xl mx-auto text-xl leading-relaxed text-center">
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

      {/* Seção 'Dicas de Especialista' */}
      <ExpertTips
        profile={profile}
        activePreferences={preferences}
        onApplySuggestion={handleApplyExpertSuggestion}
      />

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

              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mr-2">Filtros:</span>
                {['High Protein', 'Low Carb', 'Low Calorie'].map(f => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setPreferences(prev => prev.includes(f) ? prev.replace(f, '').trim() : `${prev} ${f}`.trim())}
                    className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
                      preferences.includes(f)
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>

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
        <div className="pt-8 space-y-4 text-center">
          <div className="p-6 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex flex-col items-center gap-3 shadow-lg">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
            <div className="space-y-1">
              <h4 className="font-bold text-base text-slate-900 dark:text-white flex items-center justify-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-500 animate-pulse" />
                <span>
                  {generationStep === 'image' 
                    ? '📸 Gerando foto apetitosa em alta resolução com IA...' 
                    : '🍳 Elaborando receita personalizada e calculando macronutrientes...'}
                </span>
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {generationStep === 'image'
                  ? 'Criando apresentação foto-realista do prato via Gemini Image API...'
                  : 'Combinando seus ingredientes com a meta nutricional do perfil...'}
              </p>
            </div>
          </div>
          <Skeleton type="recipe" />
        </div>
      ) : generatedRecipe ? (
        <div className="pt-8 animate-in fade-in slide-in-from-bottom-8 duration-700 space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider mb-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Receita & Foto Geradas por IA (Gemini Image API)</span>
              </div>
              <h3 className="font-serif text-2xl sm:text-3xl font-medium text-emerald-700 dark:text-emerald-400">
                Sua Nova Receita Exclusiva
              </h3>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  playSfx('crystal');
                  vibrate([30, 50]);
                  setIsImmersive(true);
                }}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-extrabold text-xs sm:text-sm shadow-lg shadow-emerald-600/30 transition-all transform hover:scale-105 active:scale-95 cursor-pointer"
                title="Esconder navegação e widgets para focar 100% no conteúdo culinário"
                id="btn-open-immersive-view"
              >
                <Maximize2 className="w-4 h-4 animate-pulse" />
                <span>Visualização Imersiva 📖</span>
              </button>

              <button
                type="button"
                onClick={handleSave}
                className="text-emerald-700 dark:text-emerald-300 bg-white/60 dark:bg-slate-800/60 hover:bg-white/80 dark:hover:bg-slate-700/80 border border-white/60 dark:border-slate-600/50 px-6 py-2.5 rounded-full font-bold transition-all shadow-sm cursor-pointer active:scale-95"
              >
                Salvar Receita
              </button>

              <PrintRecipe recipe={generatedRecipe} variant="secondary" />
            </div>
          </div>

          {/* AI Generated Image Banner */}
          {(generatedRecipe.imageUrl || generatedRecipe.image) && (
            <div className="relative w-full rounded-3xl overflow-hidden border border-emerald-500/30 shadow-xl group bg-slate-900">
              <img
                src={generatedRecipe.imageUrl || generatedRecipe.image}
                alt={generatedRecipe.name}
                className="w-full h-64 sm:h-80 object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/30 to-transparent flex flex-col justify-end p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/80 backdrop-blur-md border border-white/10 text-white text-xs font-bold shadow-md">
                    <Camera className="w-4 h-4 text-emerald-400" />
                    <span>Imagem Gerada com IA (Gemini API)</span>
                  </div>

                  <button
                    type="button"
                    onClick={handleRegenerateImage}
                    disabled={isRegeneratingImage}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-xs font-bold flex items-center gap-2 shadow-lg transition-all cursor-pointer disabled:opacity-60 active:scale-95"
                    title="Gerar uma nova variação da foto do prato com IA"
                  >
                    {isRegeneratingImage ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Gerando Nova Foto...</span>
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Regerar Foto com IA</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
          {/* Flavor Analysis Toggle & Radar Chart */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <button
                type="button"
                onClick={() => {
                  playSfx('tap');
                  setShowFlavorAnalysis(!showFlavorAnalysis);
                }}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-purple-500/10 to-indigo-500/10 border border-purple-500/30 text-purple-700 dark:text-purple-300 text-xs sm:text-sm font-bold shadow-sm hover:bg-purple-500/20 transition-all cursor-pointer"
              >
                <BarChart2 className="w-4 h-4 text-purple-500" />
                <span>{showFlavorAnalysis ? 'Ocultar Análise de Sabor' : '📊 Análise de Sabor & Perfil (Radar)'}</span>
              </button>
            </div>

            <AnimatePresence>
              {showFlavorAnalysis && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="clay-card p-6 mb-6 overflow-hidden bg-white/80 dark:bg-slate-900/80 border border-purple-500/20"
                >
                  <div className="flex flex-col md:flex-row gap-8 items-center">
                    <div className="w-full md:w-1/2 flex flex-col items-center">
                      <h4 className="font-serif text-lg font-bold text-purple-700 dark:text-purple-300 mb-1">
                        Perfil Sensorial Previsto
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 text-center mb-4">
                        Análise preditiva dos 5 pilares do paladar desta receita.
                      </p>
                      <div className="w-full h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <RadarChart
                            data={[
                              { subject: 'Doce', A: computeFlavorProfile(generatedRecipe).sweet, fullMark: 100 },
                              { subject: 'Salgado', A: computeFlavorProfile(generatedRecipe).salty, fullMark: 100 },
                              { subject: 'Umami', A: computeFlavorProfile(generatedRecipe).umami, fullMark: 100 },
                              { subject: 'Amargo', A: computeFlavorProfile(generatedRecipe).bitter, fullMark: 100 },
                              { subject: 'Ácido', A: computeFlavorProfile(generatedRecipe).sour, fullMark: 100 },
                            ]}
                          >
                            <PolarGrid stroke="#cbd5e1" />
                            <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 12, fontWeight: 'bold' }} />
                            <PolarRadiusAxis angle={30} domain={[0, 100]} />
                            <Radar name="Sabor" dataKey="A" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.6} />
                          </RadarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="w-full md:w-1/2 space-y-4">
                      <div className="flex items-center gap-2">
                        <Sliders className="w-4 h-4 text-purple-500" />
                        <h4 className="font-serif text-base font-bold text-slate-800 dark:text-slate-100">
                          Ajustar Preferências de Sabor
                        </h4>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                        Personalize o equilíbrio sensorial desejado antes de salvar ou refinar sua receita final.
                      </p>

                      <div className="space-y-3 pt-2">
                        {[
                          { key: 'sweet', label: 'Doce (Sweet)', color: 'accent-amber-500' },
                          { key: 'salty', label: 'Salgado (Salty)', color: 'accent-blue-500' },
                          { key: 'umami', label: 'Umami (Savory)', color: 'accent-purple-500' },
                          { key: 'bitter', label: 'Amargo (Bitter)', color: 'accent-emerald-500' },
                          { key: 'sour', label: 'Ácido / Azedo (Sour)', color: 'accent-rose-500' },
                        ].map(item => (
                          <div key={item.key} className="space-y-1">
                            <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                              <span>{item.label}</span>
                              <span className="font-mono text-purple-600 dark:text-purple-400">
                                {(flavorPreferences as any)[item.key]}%
                              </span>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={(flavorPreferences as any)[item.key]}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                setFlavorPreferences(prev => ({ ...prev, [item.key]: val }));
                                setPreferences(p => `${p} [Preferência de Sabor - ${item.label}: ${val}%]`.trim());
                              }}
                              className="w-full accent-purple-600 cursor-pointer"
                            />
                          </div>
                        ))}
                      </div>

                      <div className="pt-2 flex justify-end">
                        <button
                          type="button"
                          onClick={handleGenerate}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md transition-all cursor-pointer"
                        >
                          <span>Regerar com Preferências de Sabor</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
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

      {/* Modo de Visualização Imersiva (Foco Culinário Sem Distrações) */}
      <AnimatePresence>
        {isImmersive && generatedRecipe && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-[120] bg-slate-950 text-slate-100 overflow-y-auto custom-scrollbar flex flex-col font-sans select-none"
            id="generator-immersive-recipe-view"
          >
            {/* Control Bar Topo */}
            <header className="sticky top-0 z-30 flex items-center justify-between px-4 sm:px-8 py-4 bg-slate-900/90 backdrop-blur-xl border-b border-slate-800/80 shadow-2xl">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400">
                  <BookOpen className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                      Visualização Imersiva 📖
                    </span>
                    <span className="hidden md:inline text-[10px] text-slate-400 font-mono">
                      [Pressione ESC para sair]
                    </span>
                  </div>
                  <h2 className="text-sm sm:text-lg font-bold text-white truncate max-w-xs sm:max-w-md mt-0.5">
                    {generatedRecipe.name}
                  </h2>
                </div>
              </div>

              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={() => {
                    playSfx('tap');
                    vibrate(20);
                    setIsKitchenModeOpen(true);
                  }}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 font-black text-xs transition-all shadow-md active:scale-95 cursor-pointer"
                  title="Abrir modo cozinha com comandos de voz e timer"
                >
                  <ChefHat className="w-4 h-4" />
                  <span className="hidden sm:inline">Modo Cozinha (Passo a Passo)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleToggleNarrateRecipe(generatedRecipe)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    isNarrating
                      ? 'bg-rose-500/20 border-rose-500/40 text-rose-300 animate-pulse'
                      : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
                  }`}
                  title="Narrar a receita completa com a voz da Malu Aoede"
                >
                  {isNarrating ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
                  <span className="hidden sm:inline">{isNarrating ? 'Parar Áudio' : 'Ouvir Voz'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleSave}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs transition-all cursor-pointer"
                  title="Salvar esta receita na sua conta"
                >
                  Salvar
                </button>

                <button
                  type="button"
                  onClick={() => {
                    playSfx('pop');
                    setIsImmersive(false);
                    stopSpeech();
                  }}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 font-bold text-xs transition-all cursor-pointer active:scale-95"
                  title="Sair da visualização imersiva"
                >
                  <Minimize2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Sair da Imersão</span>
                </button>
              </div>
            </header>

            {/* Conteúdo Principal da Receita */}
            <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-8 space-y-8 pb-24">
              {/* Dish Hero Card */}
              <div className="relative rounded-3xl overflow-hidden border border-emerald-500/30 bg-slate-900 shadow-2xl group">
                <div className="relative h-72 sm:h-96 w-full overflow-hidden">
                  <img
                    src={generatedRecipe.imageUrl || generatedRecipe.image || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80"}
                    alt={generatedRecipe.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />
                </div>

                <div className="absolute bottom-0 inset-x-0 p-6 sm:p-8 space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-extrabold uppercase tracking-wider">
                      <Sparkles className="w-3.5 h-3.5" />
                      Receita Exclusiva IA
                    </span>
                    {budgetMode && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold">
                        <PiggyBank className="w-3.5 h-3.5" />
                        Modo Economia
                      </span>
                    )}
                  </div>

                  <h1 className="text-3xl sm:text-5xl font-serif font-bold text-white tracking-tight leading-tight">
                    {generatedRecipe.name}
                  </h1>

                  <p className="text-sm sm:text-base text-slate-300 max-w-3xl leading-relaxed">
                    {generatedRecipe.description}
                  </p>

                  {/* Badges de Atributos */}
                  <div className="flex flex-wrap items-center gap-4 pt-2">
                    <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-slate-900/80 backdrop-blur-md border border-slate-800 text-xs font-bold text-slate-200">
                      <Clock className="w-4 h-4 text-emerald-400" />
                      <span>{generatedRecipe.prepTime || '30 min'}</span>
                    </div>

                    <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-slate-900/80 backdrop-blur-md border border-slate-800 text-xs font-bold text-slate-200">
                      <Flame className="w-4 h-4 text-amber-400" />
                      <span>{Math.round((generatedRecipe.nutrition?.calories || 0) * (immersiveServings / 2))} kcal</span>
                    </div>

                    <div className="flex items-center gap-3 px-4 py-2 rounded-2xl bg-slate-900/80 backdrop-blur-md border border-slate-800 text-xs font-bold text-slate-300">
                      <span className="text-emerald-400">🥩 Proteína: {Math.round((generatedRecipe.nutrition?.protein || 0) * (immersiveServings / 2))}g</span>
                      <span className="text-cyan-400">🌾 Carbos: {Math.round((generatedRecipe.nutrition?.carbs || 0) * (immersiveServings / 2))}g</span>
                      <span className="text-purple-400">🥑 Gordura: {Math.round((generatedRecipe.nutrition?.fat || 0) * (immersiveServings / 2))}g</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Seletor Interativo de Porções */}
              <div className="p-4 sm:p-6 rounded-3xl bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <Utensils className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-white">Dimensionar Porções da Receita</h4>
                    <p className="text-xs text-slate-400">Ajusta quantidades de ingredientes e macronutrientes</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
                  {[1, 2, 4, 6].map(num => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => {
                        playSfx('tap');
                        vibrate(15);
                        setImmersiveServings(num);
                      }}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        immersiveServings === num
                          ? 'bg-emerald-500 text-slate-950 font-black shadow-md shadow-emerald-500/30'
                          : 'text-slate-400 hover:text-white hover:bg-slate-900'
                      }`}
                    >
                      {num} {num === 1 ? 'porção' : 'porções'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Grid Culinário (2 Colunas) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Ingredientes (Coluna Esquerda) */}
                <div className="lg:col-span-5 space-y-4">
                  <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-4 shadow-xl">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                      <h3 className="font-serif text-xl font-bold text-emerald-400 flex items-center gap-2">
                        <CheckSquare className="w-5 h-5 text-emerald-400" />
                        Ingredientes ({generatedRecipe.ingredients.length})
                      </h3>

                      <button
                        type="button"
                        onClick={() => {
                          playSfx('pop');
                          const allChecked = generatedRecipe.ingredients.every((_, i) => checkedIngredients[i]);
                          const next: Record<number, boolean> = {};
                          if (!allChecked) {
                            generatedRecipe.ingredients.forEach((_, i) => { next[i] = true; });
                          }
                          setCheckedIngredients(next);
                        }}
                        className="text-xs font-bold text-emerald-400 hover:underline cursor-pointer"
                      >
                        {generatedRecipe.ingredients.every((_, i) => checkedIngredients[i]) ? 'Desmarcar Todos' : 'Marcar Todos'}
                      </button>
                    </div>

                    <ul className="space-y-3">
                      {generatedRecipe.ingredients.map((ing, idx) => {
                        const scaledIng = scaleIngredient(ing, immersiveServings / 2);
                        const isChecked = !!checkedIngredients[idx];
                        return (
                          <li
                            key={idx}
                            onClick={() => {
                              playSfx(isChecked ? 'pop' : 'success');
                              vibrate(15);
                              setCheckedIngredients(prev => ({ ...prev, [idx]: !prev[idx] }));
                            }}
                            className={`flex items-start gap-3 p-3.5 rounded-2xl border transition-all cursor-pointer ${
                              isChecked
                                ? 'bg-emerald-950/30 border-emerald-500/40 text-slate-400 line-through'
                                : 'bg-slate-950/60 border-slate-800 text-slate-100 hover:border-slate-700'
                            }`}
                          >
                            <div className={`mt-0.5 w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 transition-all ${
                              isChecked ? 'bg-emerald-500 border-emerald-400 text-slate-950 font-black' : 'border-slate-700 bg-slate-900'
                            }`}>
                              {isChecked && <Check className="w-3.5 h-3.5" />}
                            </div>
                            <span className="text-sm font-medium leading-relaxed select-none">{scaledIng}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>

                {/* Modo de Preparo (Coluna Direita) */}
                <div className="lg:col-span-7 space-y-4">
                  <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-6 shadow-xl">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                      <h3 className="font-serif text-xl font-bold text-emerald-400 flex items-center gap-2">
                        <ChefHat className="w-5 h-5 text-emerald-400" />
                        Modo de Preparo Passo a Passo
                      </h3>
                      <span className="text-xs font-mono text-slate-400">
                        {Object.keys(completedSteps).length} de {generatedRecipe.instructions.length} concluídos
                      </span>
                    </div>

                    <div className="space-y-4">
                      {generatedRecipe.instructions.map((step, idx) => {
                        const isDone = !!completedSteps[idx];
                        const stepTimeMatch = step.match(/(\d+)\s*(?:minutos|minuto|min)/i);
                        const stepMinutes = stepTimeMatch ? parseInt(stepTimeMatch[1], 10) : null;

                        return (
                          <div
                            key={idx}
                            className={`p-5 rounded-2xl border transition-all space-y-3 ${
                              isDone
                                ? 'bg-emerald-950/20 border-emerald-500/30 text-slate-400'
                                : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 text-slate-100'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2">
                                <span className={`w-7 h-7 rounded-xl font-bold text-xs flex items-center justify-center font-mono ${
                                  isDone ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-emerald-500 text-slate-950 font-black'
                                }`}>
                                  #{idx + 1}
                                </span>
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Passo {idx + 1}</span>
                              </div>

                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    stopSpeech();
                                    playSfx('pop');
                                    speak(`Passo ${idx + 1}: ${step}`, { voice: 'Aoede' });
                                  }}
                                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs font-bold transition-all cursor-pointer"
                                  title="Ouvir este passo com voz da Malu"
                                >
                                  <Volume2 className="w-4 h-4" />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    playSfx(isDone ? 'pop' : 'success');
                                    vibrate(15);
                                    setCompletedSteps(prev => ({ ...prev, [idx]: !prev[idx] }));
                                  }}
                                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                                    isDone
                                      ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                                      : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                                  }`}
                                >
                                  {isDone ? 'Concluído ✓' : 'Marcar Concluído'}
                                </button>
                              </div>
                            </div>

                            <p className={`text-sm sm:text-base leading-relaxed ${isDone ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                              {step}
                            </p>

                            {stepMinutes && (
                              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-semibold">
                                <Clock className="w-3.5 h-3.5 text-amber-400" />
                                <span>Tempo estimado: {stepMinutes} minutos</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Análise Sensorial em Card Imersivo */}
              <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/80 border border-purple-500/30 space-y-4 shadow-xl">
                <div className="flex items-center justify-between">
                  <h3 className="font-serif text-xl font-bold text-purple-400 flex items-center gap-2">
                    <BarChart2 className="w-5 h-5 text-purple-400" />
                    Análise Sensorial de Sabor & Equilíbrio Nutricional
                  </h3>
                </div>

                <div className="flex flex-col md:flex-row gap-6 items-center">
                  <div className="w-full md:w-1/2 h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart
                        data={[
                          { subject: 'Doce', A: computeFlavorProfile(generatedRecipe).sweet, fullMark: 100 },
                          { subject: 'Salgado', A: computeFlavorProfile(generatedRecipe).salty, fullMark: 100 },
                          { subject: 'Umami', A: computeFlavorProfile(generatedRecipe).umami, fullMark: 100 },
                          { subject: 'Amargo', A: computeFlavorProfile(generatedRecipe).bitter, fullMark: 100 },
                          { subject: 'Ácido', A: computeFlavorProfile(generatedRecipe).sour, fullMark: 100 },
                        ]}
                      >
                        <PolarGrid stroke="#334155" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 'bold' }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} />
                        <Radar name="Sabor" dataKey="A" stroke="#a855f7" fill="#a855f7" fillOpacity={0.6} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="w-full md:w-1/2 space-y-3 text-xs sm:text-sm text-slate-300 leading-relaxed">
                    <div className="p-4 rounded-2xl bg-purple-950/30 border border-purple-500/20 space-y-2">
                      <h4 className="font-bold text-purple-300 flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-purple-400" />
                        Harmonização & Dica do Sommelier
                      </h4>
                      <p className="text-slate-300">
                        Esta receita possui ótimo equilíbrio no paladar. Combina perfeitamente com sucos naturais cítricos ou águas aromatizadas com hortelã.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </main>

            {/* Floating Mobile Action Bar */}
            <footer className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 px-4">
              <div className="flex items-center gap-3 p-2.5 sm:p-3 rounded-full bg-slate-900/95 backdrop-blur-xl border border-slate-800 shadow-2xl">
                <button
                  type="button"
                  onClick={() => {
                    playSfx('tap');
                    setIsKitchenModeOpen(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500 text-slate-950 font-black text-xs transition-all shadow-md active:scale-95 cursor-pointer whitespace-nowrap"
                >
                  <ChefHat className="w-4 h-4" />
                  <span>Modo Cozinha 👨‍🍳</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleToggleNarrateRecipe(generatedRecipe)}
                  className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-all cursor-pointer whitespace-nowrap"
                >
                  <Volume2 className="w-4 h-4 text-emerald-400" />
                  <span>Voz 🔊</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    playSfx('pop');
                    setIsImmersive(false);
                    stopSpeech();
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-bold text-xs transition-all cursor-pointer active:scale-95 whitespace-nowrap"
                >
                  <X className="w-4 h-4" />
                  <span>Sair ✖️</span>
                </button>
              </div>
            </footer>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Kitchen Mode Modal */}
      <KitchenModeModal
        isOpen={isKitchenModeOpen}
        onClose={() => setIsKitchenModeOpen(false)}
        recipeTitle={generatedRecipe?.name || 'Receita NutriAI'}
        instructions={generatedRecipe?.instructions || []}
        ingredients={generatedRecipe?.ingredients || []}
        prepTime={generatedRecipe?.prepTime}
        calories={generatedRecipe?.nutrition?.calories}
      />
    </div>
  );
}
