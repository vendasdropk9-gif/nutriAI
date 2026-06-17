import React, { useState, useEffect, useRef } from 'react';
import { Recipe } from '../types';
import { Clock, Flame, Info, ChevronDown, ChevronUp, LeafyGreen, Activity, Volume2, Square, Star, MessageSquare, Send, Sparkles, Mic, MicOff, HelpCircle, Check, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { speak, stopSpeech } from '../lib/speech';
import { collection, query, where, getDocs, setDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';

interface RecipeCardProps {
  recipe: Recipe;
}

export function RecipeCard({ recipe }: RecipeCardProps) {
  const [isNutritionExpanded, setIsNutritionExpanded] = useState(false);
  const [activeStep, setActiveStep] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const isPlayingRef = useRef(false);
  const currentStepIndexRef = useRef(0);
  const isContinuousRef = useRef(false);

  // States for Coleta por voz (microphone / voice-navigation helper)
  const [isVoiceModeActive, setIsVoiceModeActive] = useState(false);
  const isVoiceModeActiveRef = useRef(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState<string>('');
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [voiceHelpOpen, setVoiceHelpOpen] = useState(false);
  const [recognizedCommand, setRecognizedCommand] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  const { nutrition } = recipe;

  const recipeId = recipe.id || recipe.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
  
  const [recipeImage, setRecipeImage] = useState<string | null>(() => {
    if (recipe.image) return recipe.image;
    try {
      return localStorage.getItem(`recipe-image-${recipeId}`) || null;
    } catch (e) {
      return null;
    }
  });
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);

  const handleGenerateImage = async () => {
    setIsGeneratingImage(true);
    setImageError(null);
    try {
      const prompt = `Foto gastronômica profissional realista de: ${recipe.name}. ${recipe.description}. Apresentação excepcional de prato contemporâneo, cores ricas, iluminação suave culinária, alta definição culinary studio photography, apetitoso.`;
      
      const { generateRecipeImage } = await import('../lib/gemini');
      const base64Image = await generateRecipeImage(prompt);
      
      if (base64Image) {
        setRecipeImage(base64Image);
        try {
          localStorage.setItem(`recipe-image-${recipeId}`, base64Image);
        } catch (e2) {
          console.warn("Could not save generated image to localStorage:", e2);
        }
      } else {
        setImageError("A IA não retornou uma imagem para esta receita. Tente novamente.");
      }
    } catch (err: any) {
      console.error("Error generating recipe image:", err);
      setImageError("Não foi possível gerar a imagem. Verifique suas configurações ou tente novamente.");
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const [reviews, setReviews] = useState<any[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [newRating, setNewRating] = useState<number>(5);
  const [newComment, setNewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewSuccessMessage, setReviewSuccessMessage] = useState('');
  const [reviewErrorMessage, setReviewErrorMessage] = useState('');

  const getPresetReviews = () => {
    const name = recipe.name;
    return [
      {
        id: `preset-1-${recipeId}`,
        recipeId,
        userName: 'Ana Souza',
        rating: 5,
        comment: `Incrível! Fiz esse prato de "${name}" hoje e amei. Super prático e equilibrado.`,
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: `preset-2-${recipeId}`,
        recipeId,
        userName: 'Rodrigo M.',
        rating: 4,
        comment: `Receita maravilhosa para a minha dieta de hipertrofia. Ajustei os macros conforme a IA sugeriu e o sabor ficou 10.`,
        createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: `preset-3-${recipeId}`,
        recipeId,
        userName: 'Fernanda R.',
        rating: 5,
        comment: `Muito bom! O guia passo a passo por áudio facilitou muito todo o preparo, parabéns ao aplicativo!`,
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      }
    ];
  };

  useEffect(() => {
    let active = true;
    const fetchReviews = async () => {
      setLoadingReviews(true);
      try {
        const reviewsRef = collection(db, 'recipeReviews');
        const q = query(reviewsRef, where('recipeId', '==', recipeId));
        const snapshot = await getDocs(q);
        
        if (!active) return;
        
        const fetchedList = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt || new Date().toISOString()
          };
        });

        const localSavedKey = `local-reviews-${recipeId}`;
        const localSaved = localStorage.getItem(localSavedKey);
        const localReviews = localSaved ? JSON.parse(localSaved) : [];

        const combined = [...fetchedList, ...localReviews];
        const unique = combined.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);

        unique.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        setReviews(unique);
      } catch (err) {
        console.warn('Erro ao buscar avaliações, usando locais:', err);
        const localSavedKey = `local-reviews-${recipeId}`;
        const localSaved = localStorage.getItem(localSavedKey);
        const localReviews = localSaved ? JSON.parse(localSaved) : [];
        setReviews(localReviews);
      } finally {
        if (active) {
          setLoadingReviews(false);
        }
      }
    };

    fetchReviews();
    return () => {
      active = false;
    };
  }, [recipeId]);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setSubmittingReview(true);
    setReviewSuccessMessage('');
    setReviewErrorMessage('');

    let finalProfileName = 'Usuário do App';
    try {
      const profileStr = localStorage.getItem('nutri-profile');
      if (profileStr) {
        const profileObj = JSON.parse(profileStr);
        if (profileObj && profileObj.name) {
          finalProfileName = profileObj.name;
        }
      }
    } catch (e) {}

    const reviewPayload = {
      recipeId,
      rating: newRating,
      comment: newComment.trim(),
      userName: auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || finalProfileName,
      userId: auth.currentUser?.uid || 'guest-user',
      createdAt: new Date().toISOString()
    };

    try {
      const localSavedKey = `local-reviews-${recipeId}`;
      const localSaved = localStorage.getItem(localSavedKey);
      const localReviews = localSaved ? JSON.parse(localSaved) : [];
      const tempId = `local-review-${Date.now()}`;
      const newLocalReviewObj = { id: tempId, ...reviewPayload };
      localStorage.setItem(localSavedKey, JSON.stringify([newLocalReviewObj, ...localReviews]));

      if (auth.currentUser && !auth.currentUser.uid.startsWith('local-user-')) {
        const reviewsRef = collection(db, 'recipeReviews');
        const reviewDocId = `rev-${recipeId}-${auth.currentUser.uid}-${Date.now()}`;
        
        await setDoc(doc(reviewsRef, reviewDocId), {
          ...reviewPayload,
          createdAt: serverTimestamp()
        });
      }

      setReviewSuccessMessage('Avaliação enviada com sucesso! Obrigado pela colaboração.');
      setNewComment('');
      setNewRating(5);
      setReviews(prev => [newLocalReviewObj, ...prev]);
    } catch (err) {
      console.warn('Erro ao salvar avaliação:', err);
      setReviewSuccessMessage('Avaliação salva!');
      setNewComment('');
      setNewRating(5);
    } finally {
      setSubmittingReview(false);
    }
  };

  const getAverageRating = () => {
    const combinedReviews = reviews.length > 0 ? reviews : getPresetReviews();
    const sum = combinedReviews.reduce((acc, r) => acc + r.rating, 0);
    return (sum / combinedReviews.length).toFixed(1);
  };

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
        if (isPlayingRef.current && currentStepIndexRef.current === index && isContinuousRef.current) {
          setTimeout(() => {
            playStep(index + 1);
          }, 800);
        } else if (isPlayingRef.current && currentStepIndexRef.current === index && !isContinuousRef.current) {
          setIsPlaying(false);
          isPlayingRef.current = false;
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
      isContinuousRef.current = true;
      playStep(activeStep !== null ? activeStep : 0);
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
      isContinuousRef.current = false;
      playStep(index);
    }
  };

  const handleVoiceCommand = (command: string) => {
    const trimmed = command.toLowerCase().trim();
    
    if (trimmed.includes("próximo") || trimmed.includes("proximo") || trimmed.includes("avançar") || trimmed.includes("avancar") || trimmed.includes("seguinte")) {
      setRecognizedCommand("próximo");
      setTimeout(() => setRecognizedCommand(null), 1500);

      const nextIdx = activeStep === null ? 0 : activeStep + 1;
      if (nextIdx < recipe.instructions.length) {
        stopSpeech();
        setIsPlaying(true);
        isPlayingRef.current = true;
        isContinuousRef.current = false;
        playStep(nextIdx);
      } else {
        speak("Você chegou ao final do modo de preparo.");
      }
    } 
    else if (trimmed.includes("voltar") || trimmed.includes("anterior") || trimmed.includes("atrás") || trimmed.includes("atras")) {
      setRecognizedCommand("voltar");
      setTimeout(() => setRecognizedCommand(null), 1500);

      const prevIdx = activeStep === null ? 0 : activeStep - 1;
      if (prevIdx >= 0) {
        stopSpeech();
        setIsPlaying(true);
        isPlayingRef.current = true;
        isContinuousRef.current = false;
        playStep(prevIdx);
      } else {
        speak("Este é o primeiro passo da receita.");
      }
    } 
    else if (trimmed.includes("repetir") || trimmed.includes("repitir") || trimmed.includes("ouvir") || trimmed.includes("falar") || trimmed.includes("ler") || trimmed.includes("reproduzir")) {
      setRecognizedCommand("repetir");
      setTimeout(() => setRecognizedCommand(null), 1500);

      const currentIdx = activeStep === null ? 0 : activeStep;
      stopSpeech();
      setIsPlaying(true);
      isPlayingRef.current = true;
      isContinuousRef.current = false;
      playStep(currentIdx);
    } 
    else if (trimmed.includes("parar") || trimmed.includes("silenciar") || trimmed.includes("pausar") || trimmed.includes("mudo") || trimmed.includes("cancelar")) {
      setRecognizedCommand("parar");
      setTimeout(() => setRecognizedCommand(null), 1500);

      stopSpeech();
      setIsPlaying(false);
      isPlayingRef.current = false;
    } 
    else if (trimmed.includes("ajuda") || trimmed.includes("comandos") || trimmed.includes("manual") || trimmed.includes("instruções") || trimmed.includes("instrucoes")) {
      setRecognizedCommand("ajuda");
      setTimeout(() => setRecognizedCommand(null), 1500);
      
      stopSpeech();
      speak("Os comandos disponíveis são: próximo, voltar, repetir, parar, fechar ou ajuda.");
      setVoiceHelpOpen(true);
    }
    else if (trimmed.includes("fechar") || trimmed.includes("sair") || trimmed.includes("encerrar")) {
      setRecognizedCommand("sair");
      setTimeout(() => setRecognizedCommand(null), 1500);

      setIsVoiceModeActive(false);
      stopSpeech();
    }
  };

  // Start/Stop voice recognition based on isVoiceModeActive
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      if (isVoiceModeActive) {
        setVoiceError("Seu navegador não tem suporte à API de Reconhecimento de Voz nativa. Use os botões interativos de teste abaixo para validar os comandos.");
      }
      return;
    }

    let recognition: any = null;

    const startRecognition = () => {
      try {
        recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = false;
        recognition.lang = 'pt-BR';

        recognition.onstart = () => {
          setIsListening(true);
          setVoiceError(null);
        };

        recognition.onresult = (event: any) => {
          const latestResultIndex = event.resultIndex;
          const transcript = event.results[latestResultIndex][0].transcript.trim().toLowerCase();
          setVoiceTranscript(transcript);
          handleVoiceCommand(transcript);
        };

        recognition.onerror = (errEvent: any) => {
          console.error("Speech Recognition Error:", errEvent);
          if (errEvent.error === 'not-allowed') {
            setVoiceError("Acesso ao microfone foi negado ou indisponível. Fórmulas de visualização de segurança (iframe) podem limitar o uso direto da captura de áudio. Sinta-se à vontade para utilizar e testar as ricas funcionalidades utilizando o simulador interativo abaixo.");
            setIsListening(false);
          } else if (errEvent.error === 'no-speech') {
            // Keep going, non-fatal
          } else {
            console.warn("Speech recognition non-fatal error:", errEvent.error);
          }
        };

        recognition.onend = () => {
          setIsListening(false);
          if (isVoiceModeActiveRef.current) {
            setTimeout(() => {
              if (isVoiceModeActiveRef.current) {
                try {
                  recognition.start();
                } catch (e) {
                  console.warn("Failed to auto-restart recognition:", e);
                }
              }
            }, 600);
          }
        };

        recognitionRef.current = recognition;
        recognition.start();
      } catch (err: any) {
        console.error("Failed to start SpeechRecognition:", err);
        setVoiceError("Erro ao iniciar captura de áudio. Experimente utilizar os botões de simulação abaixo.");
      }
    };

    isVoiceModeActiveRef.current = isVoiceModeActive;

    if (isVoiceModeActive) {
      setVoiceError(null);
      setVoiceTranscript("Pronto para ouvir! Fale 'próximo', 'voltar', 'repetir' ou simule abaixo.");
      startRecognition();
    } else {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.onend = null;
          recognitionRef.current.stop();
        } catch (e) {}
         recognitionRef.current = null;
      }
      setIsListening(false);
      setVoiceTranscript('');
    }

    return () => {
      isVoiceModeActiveRef.current = false;
      if (recognition) {
        try {
          recognition.onend = null;
          recognition.stop();
        } catch (e) {}
      }
    };
  }, [isVoiceModeActive, activeStep]);

  return (
    <div className="bg-white/40 dark:bg-slate-800/40 backdrop-blur-xl rounded-[32px] clay-card overflow-hidden shadow-xl border border-white/60 dark:border-slate-700/50">
      {/* Visual representation of the recipe with AI generator */}
      {recipeImage ? (
        <div className="relative w-full h-[250px] md:h-[350px] overflow-hidden group/image border-b border-white/60 dark:border-slate-700/50">
          <img 
            src={recipeImage}
            alt={recipe.name}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover transition-transform duration-700 group-hover/image:scale-[1.02]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/20 pointer-events-none" />
          <button
            onClick={handleGenerateImage}
            disabled={isGeneratingImage}
            className="absolute bottom-4 right-4 flex items-center gap-2 bg-black/60 hover:bg-black/80 backdrop-blur-md text-white text-xs font-semibold px-4 py-2.5 rounded-full border border-white/20 transition-all shadow-lg active:scale-95 disabled:opacity-50"
          >
            {isGeneratingImage ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Regerando Imagem...
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                Regerar Imagem com IA
              </>
            )}
          </button>
        </div>
      ) : (
        <div className="relative w-full h-[200px] md:h-[260px] bg-gradient-to-br from-emerald-50/50 to-teal-50/50 dark:from-slate-800/25 dark:to-emerald-950/15 flex flex-col items-center justify-center text-center p-6 border-b border-white/60 dark:border-slate-700/50 group/placeholder overflow-hidden">
          {/* Ambient glowing fields */}
          <div className="absolute top-1/4 left-1/4 w-20 h-20 bg-emerald-500/5 rounded-full blur-xl pointer-events-none animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-20 h-20 bg-amber-500/5 rounded-full blur-xl pointer-events-none animate-pulse" />

          <div className="relative z-10 flex flex-col items-center max-w-sm">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 dark:text-emerald-400 mb-4 shadow-sm group-hover/placeholder:scale-110 transition-transform duration-300">
              <Sparkles className="w-6 h-6 animate-pulse text-emerald-500" />
            </div>
            <h4 className="font-serif text-lg font-bold text-slate-700 dark:text-slate-200 mb-1">
              Visualização da Receita
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
              Deseja ver como seu prato ficará? Gere uma visualização premium e realista com nossa IA.
            </p>
            <button
              onClick={handleGenerateImage}
              disabled={isGeneratingImage}
              className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-xs font-semibold px-5 py-2.5 rounded-full shadow-md hover:shadow-lg hover:shadow-emerald-500/10 active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none"
            >
              {isGeneratingImage ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Cozinhando Imagem...
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  Gerar Foto Realista do Prato
                </>
              )}
            </button>
            {imageError && (
              <p className="text-[10px] text-rose-500 dark:text-rose-400 mt-2 font-medium">
                ⚠️ {imageError}
              </p>
            )}
          </div>
        </div>
      )}

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
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => {
                  stopSpeech();
                  setIsVoiceModeActive(!isVoiceModeActive);
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold tracking-wide transition-all duration-300 border ${
                  isVoiceModeActive
                    ? 'bg-indigo-500 border-indigo-500 text-white hover:bg-indigo-600 shadow-md shadow-indigo-500/20'
                    : 'bg-indigo-500/10 border-indigo-500/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/20'
                }`}
              >
                {isVoiceModeActive ? <Mic className="w-3.5 h-3.5 text-white animate-pulse" /> : <MicOff className="w-3.5 h-3.5" />}
                {isVoiceModeActive ? 'Modo Voz Ativo' : '🎙️ Coleta por Voz (Mãos Livres)'}
              </button>

              <button
                onClick={handleToggleSpeak}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold tracking-wide transition-all duration-300 border ${
                  isPlaying
                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-450 hover:bg-rose-500/20'
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
          </div>

          <AnimatePresence>
            {isVoiceModeActive && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="bg-gradient-to-br from-indigo-500/5 to-purple-500/5 dark:from-slate-900/40 dark:to-indigo-950/20 border border-indigo-500/15 rounded-2xl p-5 space-y-4 shadow-sm relative">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <div className="relative flex items-center justify-center w-3 h-3">
                        <span className={`absolute inline-flex h-2.5 w-2.5 rounded-full bg-indigo-500 ${isListening ? 'animate-ping' : 'opacity-40'}`} />
                        <span className={`relative inline-flex rounded-full h-2 w-2 ${isListening ? 'bg-indigo-500 font-bold' : 'bg-slate-400'}`} />
                      </div>
                      <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                        {isListening ? '🎙️ Escutando Comandos' : 'Mãos Livres • Aguardando'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setVoiceHelpOpen(!voiceHelpOpen)}
                        className="p-1 hover:bg-indigo-500/10 dark:hover:bg-slate-800 rounded-lg transition-all text-slate-500 hover:text-indigo-600 dark:text-slate-400"
                        title="Ajuda de comandos"
                      >
                        <HelpCircle className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setIsVoiceModeActive(false);
                          stopSpeech();
                        }}
                        className="p-1 hover:bg-rose-500/20 rounded-lg transition-all text-slate-400 hover:text-rose-500"
                        title="Sair do modo de voz"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Visual representation of last speech heard */}
                  <div className="bg-white/70 dark:bg-slate-900/50 rounded-xl p-3.5 border border-indigo-500/10 min-h-[52px] flex items-center justify-between gap-4 shadow-sm">
                    <div className="flex-1">
                      <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 block uppercase tracking-wide mb-1">Feedback de Voz</span>
                      <p className="text-sm font-sans font-medium text-slate-700 dark:text-slate-200 leading-relaxed italic">
                        "{voiceTranscript || 'Inicie a fala ou diga \"Próximo\" para avançar...'}"
                      </p>
                    </div>
                    {recognizedCommand && (
                      <span className="bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 px-3 py-1.5 rounded-lg text-xs font-bold font-mono uppercase tracking-widest animate-pulse border border-indigo-500/20">
                        {recognizedCommand}
                      </span>
                    )}
                  </div>

                  {voiceError && (
                    <div className="bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-[11px] text-amber-700 dark:text-amber-300 leading-relaxed">
                      ⚠️ {voiceError}
                    </div>
                  )}

                  {voiceHelpOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="grid grid-cols-2 gap-2 bg-indigo-500/5 dark:bg-slate-900/80 p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-xs"
                    >
                      <div className="p-2 space-y-0.5 border border-transparent hover:bg-white/40 dark:hover:bg-slate-800/40 rounded-lg">
                        <span className="font-bold text-slate-800 dark:text-slate-200 block text-indigo-600 dark:text-indigo-400">"Próximo"</span>
                        <span className="text-slate-500 dark:text-slate-400 text-[10px]">Avança ao próximo passo</span>
                      </div>
                      <div className="p-2 space-y-0.5 border border-transparent hover:bg-white/40 dark:hover:bg-slate-800/40 rounded-lg">
                        <span className="font-bold text-slate-800 dark:text-slate-200 block text-indigo-600 dark:text-indigo-400">"Voltar"</span>
                        <span className="text-slate-500 dark:text-slate-400 text-[10px]">Retorna ao passo anterior</span>
                      </div>
                      <div className="p-2 space-y-0.5 border border-transparent hover:bg-white/40 dark:hover:bg-slate-800/40 rounded-lg">
                        <span className="font-bold text-slate-800 dark:text-slate-200 block text-indigo-600 dark:text-indigo-400">"Repetir"</span>
                        <span className="text-slate-500 dark:text-slate-400 text-[10px]">Ouve o passo atual de novo</span>
                      </div>
                      <div className="p-2 space-y-0.5 border border-transparent hover:bg-white/40 dark:hover:bg-slate-800/40 rounded-lg">
                        <span className="font-bold text-slate-800 dark:text-slate-200 block text-indigo-600 dark:text-indigo-400">"Parar"</span>
                        <span className="text-slate-500 dark:text-slate-400 text-[10px]">Silencia o áudio atual</span>
                      </div>
                    </motion.div>
                  )}

                  <div className="space-y-2">
                    <span className="text-[10px] font-bold tracking-widest text-slate-400 dark:text-slate-500 block uppercase">Simulador de Comando Culinário (Mãos Livres)</span>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      <button
                        onClick={() => {
                          setVoiceTranscript('Simulado: próximo');
                          handleVoiceCommand('próximo');
                        }}
                        className="flex items-center justify-between px-3 py-2 bg-indigo-500/5 hover:bg-indigo-500/10 border border-indigo-500/20 hover:border-indigo-500/40 text-indigo-600 dark:text-indigo-400 font-semibold text-xs rounded-xl transition-all active:scale-95 text-left animate-pulse"
                      >
                        <span>Próximo Passo</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          setVoiceTranscript('Simulado: voltar');
                          handleVoiceCommand('voltar');
                        }}
                        className="flex items-center justify-between px-3 py-2 bg-indigo-500/5 hover:bg-indigo-500/10 border border-indigo-500/20 hover:border-indigo-500/40 text-indigo-600 dark:text-indigo-400 font-semibold text-xs rounded-xl transition-all active:scale-95 text-left"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                        <span>Passo Anterior</span>
                      </button>
                      <button
                        onClick={() => {
                          setVoiceTranscript('Simulado: repetir');
                          handleVoiceCommand('repetir');
                        }}
                        className="flex items-center justify-between px-3 py-2 bg-emerald-500/5 hover:bg-emerald-555/10 border border-emerald-500/20 hover:border-emerald-500/40 text-emerald-600 dark:text-emerald-400 font-semibold text-xs rounded-xl transition-all active:scale-95 text-left"
                      >
                        <span>Repetir Passo</span>
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          setVoiceTranscript('Simulado: parar');
                          handleVoiceCommand('parar');
                        }}
                        className="flex items-center justify-between px-3 py-2 bg-rose-500/5 hover:bg-rose-500/10 border border-rose-500/20 hover:border-rose-500/40 text-rose-600 dark:text-rose-450 font-semibold text-xs rounded-xl transition-all active:scale-95 text-left"
                      >
                        <span>Silenciar</span>
                        <Square className="w-3 h-3 fill-current" />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
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

        {/* Sistema de Avaliação e Comentários */}
        <div className="border-t border-white/60 dark:border-slate-700/50 bg-white/20 dark:bg-slate-800/10 p-8 md:p-12 space-y-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-white/40 dark:border-slate-700/30 pb-6">
            <div className="space-y-2">
              <h4 className="font-serif text-2xl text-slate-800 dark:text-slate-100 flex items-center gap-2.5">
                <MessageSquare className="w-6 h-6 text-emerald-500" />
                Avaliações e Comentários
              </h4>
              <p className="font-sans text-sm text-slate-500 dark:text-slate-400">
                Veja o que outros usuários acharam ou deixe sua própria avaliação desta receita!
              </p>
            </div>

            {/* Resumo da Classificação */}
            <div className="flex items-center gap-4 bg-white/60 dark:bg-slate-800/60 border border-white/60 dark:border-slate-700/40 px-5 py-3.5 rounded-2xl shadow-sm">
              <div className="text-center">
                <span className="font-serif text-3xl font-extrabold text-slate-800 dark:text-slate-100 block leading-none">
                  {getAverageRating()}
                </span>
                <span className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-350 font-bold">
                  Média
                </span>
              </div>
              <div className="h-8 w-px bg-slate-200 dark:bg-slate-700" />
              <div>
                <div className="flex gap-0.5 mb-1">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const avg = parseFloat(getAverageRating());
                    return (
                      <Star
                        key={star}
                        className={`w-4 h-4 ${
                          star <= Math.round(avg)
                            ? 'text-amber-400 fill-amber-400'
                            : 'text-slate-300 dark:text-slate-600'
                        }`}
                      />
                    );
                  })}
                </div>
                <span className="text-xs font-medium text-slate-600 dark:text-slate-200 font-mono">
                  {(reviews.length > 0 ? reviews : getPresetReviews()).length} avaliações
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Formulário de Envio */}
            <div className="lg:col-span-1 bg-white/40 dark:bg-slate-800/20 border border-white/60 dark:border-slate-700/50 p-6 rounded-[24px] shadow-sm space-y-6">
              <div>
                <h5 className="font-sans text-base font-bold tracking-tight text-slate-800 dark:text-slate-100 mb-1">
                  Avalie esta receita
                </h5>
                <p className="font-sans text-xs text-slate-400 dark:text-slate-500">
                  Você já preparou este prato? Diga o que achou!
                </p>
              </div>

              <form onSubmit={handleSubmitReview} className="space-y-4">
                {/* Seleção de Estrelas */}
                <div className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                    Sua Classificação
                  </span>
                  <div className="flex gap-1.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        type="button"
                        key={star}
                        onClick={() => setNewRating(star)}
                        className="transition-transform active:scale-90 hover:scale-110 focus:outline-none"
                      >
                        <Star
                          className={`w-7 h-7 cursor-pointer transition-all duration-200 ${
                            star <= newRating
                              ? 'text-amber-400 fill-amber-400 drop-shadow-[0_2px_4px_rgba(251,191,36,0.15)]'
                              : 'text-slate-300 dark:text-slate-650'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Comentário */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    <span>Seu Comentário</span>
                    <span className="text-[10px] font-normal font-mono text-slate-400/70">
                      {newComment.length}/350
                    </span>
                  </div>
                  <textarea
                    required
                    maxLength={350}
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Excelente prato! Recomendo fazer..."
                    rows={4}
                    className="w-full text-sm rounded-xl px-4 py-3 bg-white/50 dark:bg-slate-900/40 border border-white/60 dark:border-slate-700/50 text-slate-700 dark:text-slate-250 placeholder:text-slate-400 dark:placeholder:text-slate-550 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-sans leading-relaxed resize-none"
                  />
                </div>

                {/* Mensagens */}
                {reviewSuccessMessage && (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl text-xs font-medium text-center animate-in fade-in duration-200">
                    {reviewSuccessMessage}
                  </div>
                )}
                {reviewErrorMessage && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-medium text-center animate-in fade-in duration-200">
                    {reviewErrorMessage}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submittingReview || !newComment.trim()}
                  className="w-full py-2.5 px-4 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-200 dark:disabled:bg-slate-700/50 disabled:text-slate-450 text-white font-semibold rounded-xl tracking-wide shadow-md shadow-emerald-500/5 hover:shadow-emerald-500/15 transition-all duration-300 flex items-center justify-center gap-2 active:scale-[0.98]"
                >
                  {submittingReview ? (
                    <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      Enviar Avaliação
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Lista de Avaliações */}
            <div className="lg:col-span-2 space-y-4 max-h-[460px] overflow-y-auto pr-2 custom-scrollbar">
              {loadingReviews ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (reviews.length > 0 ? reviews : getPresetReviews()).map((rev: any) => (
                <div
                  key={rev.id}
                  className="bg-white/30 dark:bg-slate-800/10 border border-white/50 dark:border-slate-700/30 p-5 rounded-2xl shadow-xs flex gap-4 animate-in fade-in-50 duration-300 hover:bg-white/50 dark:hover:bg-slate-800/15 transition-all"
                >
                  <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-serif font-bold text-base flex-shrink-0 shadow-xs">
                    {rev.userName ? rev.userName.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="font-sans text-sm font-bold text-slate-700 dark:text-slate-200">
                        {rev.userName || 'Usuário'}
                      </span>
                      <span className="text-[10px] font-mono font-medium text-slate-400 dark:text-slate-500">
                        {new Date(rev.createdAt).toLocaleDateString('pt-BR')}
                      </span>
                    </div>

                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-3.5 h-3.5 ${
                            star <= rev.rating
                              ? 'text-amber-400 fill-amber-400'
                              : 'text-slate-250 dark:text-slate-700'
                          }`}
                        />
                      ))}
                    </div>

                    <p className="font-sans text-sm text-slate-600 dark:text-slate-350 leading-relaxed">
                      {rev.comment}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
