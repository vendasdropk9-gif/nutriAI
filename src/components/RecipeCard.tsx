import { safeGet, safeSet, safeRemove } from "../lib/storage";
import React, { useState, useEffect, useRef } from 'react';
import { Recipe, RecipePreparationTips } from '../types';
import { RecipeStepTimer } from './RecipeStepTimer';
import { Clock, Flame, Info, ChevronDown, ChevronUp, LeafyGreen, Activity, Volume2, Square, Star, MessageSquare, Send, Sparkles, Mic, MicOff, HelpCircle, Check, X, ChevronLeft, ChevronRight, Beef, Wheat, Droplet, ChefHat, Utensils, Calendar, Trash2, Bell, Share2, Copy, Download } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { speak, stopSpeech } from '../lib/speech';
import { collection, query, where, getDocs, setDoc, doc, serverTimestamp } from '../lib/firebase';
import { db, auth } from '../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';

function parsePrepTime(prepTime: string): number {
  if (!prepTime) return 30;
  const hourMatch = prepTime.match(/(\d+)\s*(?:hora|horas|h)/i);
  const minMatch = prepTime.match(/(\d+)\s*(?:min|minutos|m)/i);
  
  let totalMinutes = 0;
  if (hourMatch) {
    totalMinutes += parseInt(hourMatch[1], 10) * 60;
  }
  if (minMatch) {
    totalMinutes += parseInt(minMatch[1], 10);
  } else if (!hourMatch) {
    const justNum = prepTime.match(/(\d+)/);
    if (justNum) {
      totalMinutes = parseInt(justNum[1], 10);
    }
  }
  return totalMinutes || 30;
}

function calculateStartTime(targetTimeStr: string, prepMinutes: number): string {
  if (!targetTimeStr) return "";
  const [hour, min] = targetTimeStr.split(":").map(Number);
  let totalMin = hour * 60 + min;
  totalMin -= prepMinutes;
  
  if (totalMin < 0) {
    totalMin += 24 * 60;
  }
  
  const targetHour = Math.floor(totalMin / 60) % 24;
  const targetMin = totalMin % 60;
  
  const paddedHour = String(targetHour).padStart(2, '0');
  const paddedMin = String(targetMin).padStart(2, '0');
  
  return `${paddedHour}:${paddedMin}`;
}

interface RecipeCardProps {
  recipe: Recipe;
}

export function RecipeCard({ recipe }: RecipeCardProps) {
  const [isNutritionExpanded, setIsNutritionExpanded] = useState(false);
  const [prepTips, setPrepTips] = useState<RecipePreparationTips | null>(null);
  const [loadingPrepTips, setLoadingPrepTips] = useState(false);
  const [prepTipsError, setPrepTipsError] = useState<string | null>(null);
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

  // Pre-calculate default target meal time (1 hour from now + preparation time)
  const [isSchedulingOpen, setIsSchedulingOpen] = useState(false);
  const [targetEatTime, setTargetEatTime] = useState(() => {
    const now = new Date();
    const prepMinutes = parsePrepTime(recipe.prepTime);
    now.setMinutes(now.getMinutes() + 60 + prepMinutes);
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  });
  const [scheduledReminder, setScheduledReminder] = useState<any | null>(null);

  const checkScheduledReminder = () => {
    try {
      const stored = window.localStorage.getItem('nutri-prep-reminders');
      if (stored) {
        const reminders = JSON.parse(stored);
        if (Array.isArray(reminders)) {
          const found = reminders.find((r: any) => r.recipeId === recipe.id && !r.notified);
          setScheduledReminder(found || null);
          return;
        }
      }
      setScheduledReminder(null);
    } catch (e) {
      console.warn(e);
    }
  };

  useEffect(() => {
    checkScheduledReminder();
    window.addEventListener('app:prep-reminders-updated', checkScheduledReminder);
    return () => {
      window.removeEventListener('app:prep-reminders-updated', checkScheduledReminder);
    };
  }, [recipe.id]);

  const handleSchedulePrep = () => {
    try {
      const prepMinutes = parsePrepTime(recipe.prepTime);
      const startTimeStr = calculateStartTime(targetEatTime, prepMinutes);
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];

      const newReminder = {
        id: crypto.randomUUID(),
        recipeId: recipe.id,
        recipeName: recipe.name,
        targetTime: targetEatTime,
        startTime: startTimeStr,
        prepTime: recipe.prepTime,
        dateStr,
        notified: false
      };

      const stored = window.localStorage.getItem('nutri-prep-reminders');
      let reminders = [];
      if (stored) {
        reminders = JSON.parse(stored);
        if (!Array.isArray(reminders)) reminders = [];
      }

      // Remove existing active reminders for this recipe
      reminders = reminders.filter((r: any) => r.recipeId !== recipe.id);
      reminders.push(newReminder);
      
      window.localStorage.setItem('nutri-prep-reminders', JSON.stringify(reminders));
      setScheduledReminder(newReminder);
      
      window.dispatchEvent(new CustomEvent('app:prep-reminders-updated'));
      window.dispatchEvent(new CustomEvent('app:notification', {
        detail: {
          title: "Preparo Agendado! 📅",
          message: `Lembrete definido para iniciar às ${startTimeStr} (servir às ${targetEatTime}).`,
          type: "info"
        }
      }));
      setIsSchedulingOpen(false);
    } catch (err) {
      console.warn("Error scheduling prep:", err);
    }
  };

  const handleCancelReminder = () => {
    try {
      const stored = window.localStorage.getItem('nutri-prep-reminders');
      if (stored) {
        let reminders = JSON.parse(stored);
        if (Array.isArray(reminders)) {
          reminders = reminders.filter((r: any) => r.recipeId !== recipe.id);
          window.localStorage.setItem('nutri-prep-reminders', JSON.stringify(reminders));
        }
      }
      setScheduledReminder(null);
      window.dispatchEvent(new CustomEvent('app:prep-reminders-updated'));
      window.dispatchEvent(new CustomEvent('app:notification', {
        detail: {
          title: "Agendamento Cancelado",
          message: `O lembrete de preparo para "${recipe.name}" foi removido.`,
          type: "info"
        }
      }));
    } catch (err) {
      console.warn("Error cancelling reminder:", err);
    }
  };

  const recipeId = recipe.id || recipe.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
  
  const [recipeImage, setRecipeImage] = useState<string | null>(() => {
    if (recipe.image) return recipe.image;
    try {
      return safeGet(`recipe-image-${recipeId}`) || null;
    } catch (e) {
      return null;
    }
  });
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);

  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isExportingCard, setIsExportingCard] = useState(false);
  const [isTextCopied, setIsTextCopied] = useState(false);
  const shareCardRef = useRef<HTMLDivElement>(null);

  const handleExportCard = async () => {
    if (!shareCardRef.current) return;
    setIsExportingCard(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(shareCardRef.current, {
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
        scale: 2,
      });
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `receita-${recipeId}-card.png`;
      link.href = dataUrl;
      link.click();
      
      window.dispatchEvent(new CustomEvent('app:notification', {
        detail: {
          title: "Card Salvo! 📸",
          message: "O card da sua receita foi exportado como imagem.",
          type: "success"
        }
      }));
    } catch (err) {
      console.warn("Erro ao gerar imagem do card:", err);
      alert("Não foi possível exportar como imagem diretamente. Você pode tirar uma captura de tela!");
    } finally {
      setIsExportingCard(false);
    }
  };

  const handleCopyText = () => {
    const text = `🍽️ *${recipe.name}* no NutriPlate!

📝 *Descrição:* ${recipe.description}
⏱️ *Tempo:* ${recipe.prepTime}
🔥 *Calorias:* ${recipe.nutrition.calories} kcal

*Nutrientes:*
• Proteínas: ${recipe.nutrition.protein}g
• Carboidratos: ${recipe.nutrition.carbs}g
• Gorduras: ${recipe.nutrition.fat}g

*Ingredientes:*
${recipe.ingredients.map(i => `• ${i}`).join('\n')}

_Gerado com NutriPlate App - Seu Guia Saudável_ 💚`;

    navigator.clipboard.writeText(text);
    setIsTextCopied(true);
    setTimeout(() => setIsTextCopied(false), 2000);
    
    window.dispatchEvent(new CustomEvent('app:notification', {
      detail: {
        title: "Texto Copiado! 📋",
        message: "O resumo da receita foi copiado para sua área de transferência.",
        type: "info"
      }
    }));
  };

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
          safeSet(`recipe-image-${recipeId}`, base64Image);
        } catch (e2) {
          console.warn("Could not save generated image to localStorage:", e2);
        }
      } else {
        setImageError("A IA não retornou uma imagem para esta receita. Tente novamente.");
      }
    } catch (err: any) {
      console.warn("Error generating recipe image:", err);
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
        const localSaved = safeGet(localSavedKey);
        const localReviews = localSaved ? JSON.parse(localSaved) : [];

        const combined = [...fetchedList, ...localReviews];
        const unique = combined.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);

        unique.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        setReviews(unique);
      } catch (err) {
        console.warn('Erro ao buscar avaliações, usando locais:', err);
        const localSavedKey = `local-reviews-${recipeId}`;
        const localSaved = safeGet(localSavedKey);
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

  useEffect(() => {
    if (isNutritionExpanded && !prepTips && !loadingPrepTips) {
      const fetchPrepTips = async () => {
        setLoadingPrepTips(true);
        setPrepTipsError(null);
        try {
          const { generateRecipePreparationTips } = await import('../lib/gemini');
          const tips = await generateRecipePreparationTips(recipe.name, recipe.ingredients);
          if (tips) {
            setPrepTips(tips);
          } else {
            setPrepTipsError("Não foi possível carregar as dicas de preparo.");
          }
        } catch (err) {
          console.warn("Error fetching prep tips:", err);
          setPrepTipsError("Erro ao carregar as dicas de preparo com a IA.");
        } finally {
          setLoadingPrepTips(false);
        }
      };
      fetchPrepTips();
    }
  }, [isNutritionExpanded, recipe.name, recipe.ingredients, prepTips, loadingPrepTips]);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setSubmittingReview(true);
    setReviewSuccessMessage('');
    setReviewErrorMessage('');

    let finalProfileName = 'Usuário do App';
    try {
      const profileStr = safeGet('nutri-profile');
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
      const localSaved = safeGet(localSavedKey);
      const localReviews = localSaved ? JSON.parse(localSaved) : [];
      const tempId = `local-review-${Date.now()}`;
      const newLocalReviewObj = { id: tempId, ...reviewPayload };
      safeSet(localSavedKey, JSON.stringify([newLocalReviewObj, ...localReviews]));

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
          console.warn("Speech Recognition Error:", errEvent);
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
        console.warn("Failed to start SpeechRecognition:", err);
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

        {/* Actions Row */}
        <div className="flex flex-wrap items-center gap-3 mt-6">
          {scheduledReminder ? (
            <div className="w-full p-4 bg-emerald-500/5 dark:bg-emerald-400/5 border border-emerald-500/25 rounded-2xl flex flex-wrap gap-4 items-center justify-between shadow-sm">
              <div className="flex items-center gap-3">
                <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <Bell className="w-5 h-5 animate-bounce" />
                </span>
                <div>
                  <h5 className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Preparo Agendado!</h5>
                  <p className="text-xs text-slate-600 dark:text-slate-300 font-medium mt-0.5">
                    Lembrete definido para iniciar às <span className="font-bold text-slate-900 dark:text-white font-mono bg-emerald-500/10 px-1.5 py-0.5 rounded">{scheduledReminder.startTime}</span> (Refeição pronta às {scheduledReminder.targetTime})
                  </p>
                </div>
              </div>
              <button
                onClick={handleCancelReminder}
                className="flex items-center gap-1.5 text-[11px] font-bold text-rose-600 hover:text-rose-700 dark:text-rose-450 dark:hover:text-rose-400 bg-rose-500/5 hover:bg-rose-500/10 px-3 py-1.5 rounded-xl border border-rose-500/20 hover:border-rose-500/30 transition-all active:scale-95 cursor-pointer"
                title="Cancelar lembrete agendado"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Cancelar Lembrete
              </button>
            </div>
          ) : isSchedulingOpen ? (
            <div className="w-full p-4 bg-emerald-50/40 dark:bg-emerald-950/10 border border-emerald-500/20 rounded-2xl space-y-4 shadow-sm animate-fadeIn">
              <div className="flex items-center justify-between border-b border-emerald-500/10 pb-2.5">
                <span className="flex items-center gap-2 text-xs uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-bold">
                  <Calendar className="w-4 h-4 text-emerald-500" />
                  Configurar Lembrete de Preparo
                </span>
                <button
                  onClick={() => setIsSchedulingOpen(false)}
                  className="text-xs font-bold text-slate-400 hover:text-slate-500 dark:hover:text-slate-300 border-none bg-transparent cursor-pointer"
                >
                  Voltar
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                    Que horas deseja que a refeição esteja pronta?
                  </label>
                  <input
                    type="time"
                    value={targetEatTime}
                    onChange={(e) => setTargetEatTime(e.target.value)}
                    className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                
                <div className="flex flex-col justify-center bg-white/40 dark:bg-slate-900/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800/60">
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                    Duração média: <span className="font-bold text-slate-700 dark:text-slate-200">{recipe.prepTime}</span>
                  </div>
                  <div className="text-xs text-emerald-600 dark:text-emerald-400 font-bold mt-1 leading-relaxed">
                    Horário ideal para começar a cozinhar: <span className="text-sm bg-emerald-500/10 px-1.5 py-0.5 rounded ml-1 font-mono">{calculateStartTime(targetEatTime, parsePrepTime(recipe.prepTime))}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end gap-2 border-t border-emerald-500/10 pt-3">
                <button
                  onClick={() => setIsSchedulingOpen(false)}
                  className="px-3.5 py-2 text-xs font-bold text-slate-500 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-350 border-none bg-transparent cursor-pointer"
                >
                  Fechar
                </button>
                <button
                  onClick={handleSchedulePrep}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-md shadow-emerald-500/10 active:scale-95 transition-all border-none cursor-pointer"
                >
                  Confirmar Agendamento
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setIsSchedulingOpen(true)}
              className="flex items-center gap-2 bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-500/20 hover:border-emerald-500/35 text-emerald-600 dark:text-emerald-400 text-xs font-bold px-4 py-2 rounded-xl transition-all duration-300 active:scale-95 cursor-pointer"
            >
              <Calendar className="w-4 h-4 text-emerald-500" />
              Agendar Preparo
            </button>
          )}

          {!isSchedulingOpen && (
            <button
              onClick={() => setIsShareModalOpen(true)}
              className="flex items-center gap-2 bg-indigo-500/10 hover:bg-indigo-500/15 border border-indigo-500/20 hover:border-indigo-500/35 text-indigo-600 dark:text-indigo-400 text-xs font-bold px-4 py-2 rounded-xl transition-all duration-300 active:scale-95 cursor-pointer"
            >
              <Share2 className="w-4 h-4 text-indigo-500" />
              Compartilhar Receita
            </button>
          )}
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
                    ? 'bg-amber-500 border-amber-500 text-white hover:bg-amber-600 shadow-md shadow-amber-500/20'
                    : 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20'
                }`}
              >
                {isVoiceModeActive ? <Mic className="w-3.5 h-3.5 text-white animate-pulse" /> : <ChefHat className="w-3.5 h-3.5" />}
                {isVoiceModeActive ? 'Modo Cozinha Ativo' : 'Modo Cozinha (Voz)'}
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
                        title="Sair do modo cozinha"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Visual representation of last speech heard */}
                  <div className="bg-white/70 dark:bg-slate-900/50 rounded-xl p-3.5 border border-indigo-500/10 min-h-[52px] flex items-center justify-between gap-4 shadow-sm">
                    <div className="flex-1">
                      <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 block uppercase tracking-wide mb-1">Feedback do Modo Cozinha</span>
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
                  <div className="flex-1">
                    <p className={`text-slate-600 dark:text-slate-300 leading-relaxed pt-1 transition-all ${
                      isActive ? 'text-slate-800 dark:text-slate-100 font-medium' : ''
                    }`}>
                      {step}
                    </p>
                    <RecipeStepTimer stepText={step} stepIndex={idx} recipeName={recipe.name} />
                  </div>
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
              <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="relative overflow-hidden mt-6 bg-white/40 dark:bg-slate-800/40 border border-white/60 dark:border-slate-700/50 rounded-2xl p-6 shadow-sm space-y-6"
              >
                {/* Shimmer Ambient Glow Sheen */}
                <motion.div
                  initial={{ x: '-150%' }}
                  animate={{ x: '150%' }}
                  transition={{ 
                    repeat: Infinity, 
                    repeatDelay: 4.5, 
                    duration: 1.8, 
                    ease: "easeInOut" 
                  }}
                  className="absolute top-0 bottom-0 left-0 w-[40%] bg-gradient-to-r from-transparent via-emerald-500/[0.08] dark:via-emerald-400/[0.12] to-transparent -skew-x-12 pointer-events-none z-10"
                />
                <motion.div
                  initial={{ x: '-150%' }}
                  animate={{ x: '150%' }}
                  transition={{ 
                    repeat: Infinity, 
                    repeatDelay: 4.5, 
                    duration: 1.8, 
                    ease: "easeInOut",
                    delay: 0.15
                  }}
                  className="absolute top-0 bottom-0 left-0 w-[20%] bg-gradient-to-r from-transparent via-white/20 dark:via-white/5 to-transparent -skew-x-12 pointer-events-none z-10"
                />
                <div>
                  <h5 className="text-xs uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold mb-4">Macronutrientes (Distribuição Energética)</h5>
                  
                  {(() => {
                    const totalGrams = (nutrition.protein || 0) + (nutrition.carbs || 0) + (nutrition.fat || 0);
                    const macroData = [
                      { name: 'Proteínas', value: nutrition.protein || 0, color: '#10b981', calories: (nutrition.protein || 0) * 4 },
                      { name: 'Carboidratos', value: nutrition.carbs || 0, color: '#f59e0b', calories: (nutrition.carbs || 0) * 4 },
                      { name: 'Gorduras', value: nutrition.fat || 0, color: '#f43f5e', calories: (nutrition.fat || 0) * 9 }
                    ];
                    const hasMacroData = totalGrams > 0;

                    return hasMacroData ? (
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                        {/* Donut Chart (5 columns) */}
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.92, y: 10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                          className="lg:col-span-5 flex flex-col items-center justify-center bg-slate-50/30 dark:bg-slate-900/30 rounded-2xl p-4 border border-slate-150/40 dark:border-slate-800/40 h-[240px] relative"
                        >
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={macroData}
                                cx="50%"
                                cy="50%"
                                innerRadius={65}
                                outerRadius={85}
                                paddingAngle={4}
                                dataKey="value"
                                isAnimationActive={true}
                                animationBegin={200}
                                animationDuration={1200}
                                animationEasing="ease-out"
                              >
                                {macroData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} className="outline-none" />
                                ))}
                              </Pie>
                              <Tooltip
                                formatter={(value: any, name: any, props: any) => [
                                  `${value}g (${props.payload.calories} kcal)`,
                                  name
                                ]}
                                contentStyle={{
                                  backgroundColor: 'rgba(15, 23, 42, 0.95)',
                                  border: '1px solid rgba(255, 255, 255, 0.1)',
                                  borderRadius: '12px',
                                  color: '#fff',
                                  fontSize: '12px',
                                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)'
                                }}
                              />
                            </PieChart>
                          </ResponsiveContainer>
                          
                          {/* Center Absolute Badge */}
                          <motion.div 
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.4, duration: 0.4 }}
                            className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
                          >
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">Energia</span>
                            <span className="text-2xl font-black font-serif text-slate-800 dark:text-slate-100 leading-none my-0.5">{nutrition.calories}</span>
                            <span className="text-[10px] text-emerald-500 dark:text-emerald-400 font-bold font-mono">kcal</span>
                          </motion.div>
                        </motion.div>

                        {/* Detailed Cards (7 columns) */}
                        <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-3 w-full">
                          {/* Protein */}
                          <div className="bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/10 rounded-xl p-3 flex flex-col justify-between">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-sm font-semibold text-emerald-800 dark:text-emerald-400 flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                Proteínas
                              </span>
                              <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                {Math.round(((nutrition.protein || 0) * 4) / (((nutrition.protein || 0) * 4) + ((nutrition.carbs || 0) * 4) + ((nutrition.fat || 0) * 9) || 1) * 100)}%
                              </span>
                            </div>
                            <div className="text-2xl font-bold font-serif text-emerald-900 dark:text-emerald-100 mb-2">
                              {nutrition.protein || 0}g <span className="text-xs text-slate-400 dark:text-slate-500 font-sans font-normal">({(nutrition.protein || 0) * 4} kcal)</span>
                            </div>
                            <div className="w-full bg-emerald-500/10 dark:bg-emerald-500/20 rounded-full h-1.5 overflow-hidden">
                              <div 
                                className="bg-emerald-500 h-full rounded-full transition-all duration-500 bg-gradient-to-r from-emerald-400 to-emerald-500" 
                                style={{ width: `${Math.min(100, Math.round((((nutrition.protein || 0) * 4) / (((nutrition.protein || 0) * 4) + ((nutrition.carbs || 0) * 4) + ((nutrition.fat || 0) * 9) || 1)) * 100))}%` }}
                              />
                            </div>
                          </div>

                          {/* Carbs */}
                          <div className="bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/10 rounded-xl p-3 flex flex-col justify-between">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-sm font-semibold text-amber-800 dark:text-amber-400 flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-amber-500" />
                                Carboidratos
                              </span>
                              <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400">
                                {Math.round(((nutrition.carbs || 0) * 4) / (((nutrition.protein || 0) * 4) + ((nutrition.carbs || 0) * 4) + ((nutrition.fat || 0) * 9) || 1) * 100)}%
                              </span>
                            </div>
                            <div className="text-2xl font-bold font-serif text-amber-900 dark:text-amber-100 mb-2">
                              {nutrition.carbs || 0}g <span className="text-xs text-slate-400 dark:text-slate-500 font-sans font-normal">({(nutrition.carbs || 0) * 4} kcal)</span>
                            </div>
                            <div className="w-full bg-amber-500/10 dark:bg-amber-500/20 rounded-full h-1.5 overflow-hidden">
                              <div 
                                className="bg-amber-500 h-full rounded-full transition-all duration-500 bg-gradient-to-r from-amber-400 to-amber-500" 
                                style={{ width: `${Math.min(100, Math.round((((nutrition.carbs || 0) * 4) / (((nutrition.protein || 0) * 4) + ((nutrition.carbs || 0) * 4) + ((nutrition.fat || 0) * 9) || 1)) * 100))}%` }}
                              />
                            </div>
                          </div>

                          {/* Fats */}
                          <div className="bg-rose-500/5 dark:bg-rose-500/10 border border-rose-500/10 rounded-xl p-3 flex flex-col justify-between">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-sm font-semibold text-rose-800 dark:text-rose-400 flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-rose-500" />
                                Gorduras
                              </span>
                              <span className="text-xs font-mono font-bold text-rose-600 dark:text-rose-400">
                                {Math.round(((nutrition.fat || 0) * 9) / (((nutrition.protein || 0) * 4) + ((nutrition.carbs || 0) * 4) + ((nutrition.fat || 0) * 9) || 1) * 100)}%
                              </span>
                            </div>
                            <div className="text-2xl font-bold font-serif text-rose-900 dark:text-rose-100 mb-2">
                              {nutrition.fat || 0}g <span className="text-xs text-slate-400 dark:text-slate-500 font-sans font-normal">({(nutrition.fat || 0) * 9} kcal)</span>
                            </div>
                            <div className="w-full bg-rose-500/10 dark:bg-rose-500/20 rounded-full h-1.5 overflow-hidden">
                              <div 
                                className="bg-rose-500 h-full rounded-full transition-all duration-500 bg-gradient-to-r from-rose-400 to-rose-500" 
                                style={{ width: `${Math.min(100, Math.round((((nutrition.fat || 0) * 9) / (((nutrition.protein || 0) * 4) + ((nutrition.carbs || 0) * 4) + ((nutrition.fat || 0) * 9) || 1)) * 100))}%` }}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Quick Summary Table */}
                        <div className="lg:col-span-12 mt-2 bg-white/30 dark:bg-slate-900/40 rounded-xl p-4 border border-slate-150/40 dark:border-slate-800/40">
                          <h6 className="text-[11px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold mb-2.5">Consulta Rápida de Nutrientes</h6>
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                              <thead>
                                <tr className="border-b border-slate-200/60 dark:border-slate-800 text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-semibold">
                                  <th className="pb-2 font-semibold">Macro</th>
                                  <th className="pb-2 font-semibold text-center">Proporção</th>
                                  <th className="pb-2 font-semibold text-right">Peso (g)</th>
                                  <th className="pb-2 font-semibold text-right">Energia</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100/60 dark:divide-slate-800/50">
                                <tr className="text-slate-700 dark:text-slate-200 font-sans">
                                  <td className="py-2.5 flex items-center gap-2 font-medium">
                                    <span className="p-1 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                      <Beef className="w-3.5 h-3.5" />
                                    </span>
                                    Proteínas
                                  </td>
                                  <td className="py-2.5 text-center font-bold font-mono text-emerald-600 dark:text-emerald-400">
                                    {Math.round(((nutrition.protein || 0) * 4) / (((nutrition.protein || 0) * 4) + ((nutrition.carbs || 0) * 4) + ((nutrition.fat || 0) * 9) || 1) * 100)}%
                                  </td>
                                  <td className="py-2.5 text-right font-mono font-medium">
                                    {nutrition.protein || 0}g
                                  </td>
                                  <td className="py-2.5 text-right font-mono text-slate-500 dark:text-slate-400">
                                    {(nutrition.protein || 0) * 4} kcal
                                  </td>
                                </tr>
                                <tr className="text-slate-700 dark:text-slate-200 font-sans">
                                  <td className="py-2.5 flex items-center gap-2 font-medium">
                                    <span className="p-1 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                      <Wheat className="w-3.5 h-3.5" />
                                    </span>
                                    Carboidratos
                                  </td>
                                  <td className="py-2.5 text-center font-bold font-mono text-amber-600 dark:text-amber-400">
                                    {Math.round(((nutrition.carbs || 0) * 4) / (((nutrition.protein || 0) * 4) + ((nutrition.carbs || 0) * 4) + ((nutrition.fat || 0) * 9) || 1) * 100)}%
                                  </td>
                                  <td className="py-2.5 text-right font-mono font-medium">
                                    {nutrition.carbs || 0}g
                                  </td>
                                  <td className="py-2.5 text-right font-mono text-slate-500 dark:text-slate-400">
                                    {(nutrition.carbs || 0) * 4} kcal
                                  </td>
                                </tr>
                                <tr className="text-slate-700 dark:text-slate-200 font-sans">
                                  <td className="py-2.5 flex items-center gap-2 font-medium">
                                    <span className="p-1 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400">
                                      <Droplet className="w-3.5 h-3.5" />
                                    </span>
                                    Gorduras
                                  </td>
                                  <td className="py-2.5 text-center font-bold font-mono text-rose-600 dark:text-rose-400">
                                    {Math.round(((nutrition.fat || 0) * 9) / (((nutrition.protein || 0) * 4) + ((nutrition.carbs || 0) * 4) + ((nutrition.fat || 0) * 9) || 1) * 100)}%
                                  </td>
                                  <td className="py-2.5 text-right font-mono font-medium">
                                    {nutrition.fat || 0}g
                                  </td>
                                  <td className="py-2.5 text-right font-mono text-slate-500 dark:text-slate-400">
                                    {(nutrition.fat || 0) * 9} kcal
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* Dicas de Preparo Section */}
                        <div className="lg:col-span-12 mt-4 bg-emerald-50/20 dark:bg-emerald-950/10 border border-emerald-500/15 rounded-xl p-4">
                          <div className="flex items-center justify-between border-b border-emerald-500/10 pb-2.5 mb-3">
                            <span className="flex items-center gap-2 text-xs uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-bold">
                              <ChefHat className="w-4 h-4" />
                              Dicas de Preparo da Chef Malu
                            </span>
                            <span className="flex items-center gap-1 text-[10px] bg-emerald-500/10 dark:bg-emerald-400/10 text-emerald-600 dark:text-emerald-400 font-bold font-sans uppercase tracking-wider px-2 py-0.5 rounded-full border border-emerald-500/20">
                              <Sparkles className="w-2.5 h-2.5" />
                              Inteligência Artificial
                            </span>
                          </div>

                          {loadingPrepTips ? (
                            <div className="space-y-3 py-1">
                              <div className="h-4 bg-slate-200/50 dark:bg-slate-800/50 rounded animate-pulse w-[75%]" />
                              <div className="h-4 bg-slate-200/50 dark:bg-slate-800/50 rounded animate-pulse w-[60%]" />
                              <div className="h-4 bg-slate-200/50 dark:bg-slate-800/50 rounded animate-pulse w-[85%]" />
                            </div>
                          ) : prepTipsError ? (
                            <div className="flex flex-col items-center justify-center py-4 text-center">
                              <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">{prepTipsError}</p>
                              <button
                                onClick={async () => {
                                  setLoadingPrepTips(true);
                                  setPrepTipsError(null);
                                  try {
                                    const { generateRecipePreparationTips } = await import('../lib/gemini');
                                    const tips = await generateRecipePreparationTips(recipe.name, recipe.ingredients);
                                    if (tips) setPrepTips(tips);
                                    else setPrepTipsError("Não foi possível carregar as dicas de preparo.");
                                  } catch (err) {
                                    setPrepTipsError("Erro ao carregar as dicas de preparo com a IA.");
                                  } finally {
                                    setLoadingPrepTips(false);
                                  }
                                }}
                                className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                              >
                                Tentar novamente
                              </button>
                            </div>
                          ) : prepTips ? (
                            <div className="space-y-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                                {/* Texture Tips */}
                                <div className="bg-white/40 dark:bg-slate-900/40 rounded-lg p-3 border border-slate-100 dark:border-slate-800">
                                  <h6 className="text-[11px] uppercase tracking-wider text-emerald-700 dark:text-emerald-400 font-bold mb-2 flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                    Como melhorar a Textura
                                  </h6>
                                  <ul className="text-xs text-slate-600 dark:text-slate-350 space-y-1.5 leading-relaxed font-medium">
                                    {prepTips.textureTips.map((tip, i) => (
                                      <li key={i} className="flex gap-1.5">
                                        <span className="text-emerald-500 flex-shrink-0">•</span>
                                        <span>{tip}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>

                                {/* Flavor Tips */}
                                <div className="bg-white/40 dark:bg-slate-900/40 rounded-lg p-3 border border-slate-100 dark:border-slate-800">
                                  <h6 className="text-[11px] uppercase tracking-wider text-amber-700 dark:text-amber-400 font-bold mb-2 flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                    Como realçar o Sabor
                                  </h6>
                                  <ul className="text-xs text-slate-600 dark:text-slate-350 space-y-1.5 leading-relaxed font-medium">
                                    {prepTips.flavorTips.map((tip, i) => (
                                      <li key={i} className="flex gap-1.5">
                                        <span className="text-amber-500 flex-shrink-0">•</span>
                                        <span>{tip}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              </div>

                              {/* Chef Secret */}
                              <div className="bg-indigo-500/[0.04] dark:bg-indigo-400/[0.03] border border-indigo-500/15 rounded-lg p-3 flex gap-3 items-start">
                                <span className="p-1.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-0.5">
                                  <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                                </span>
                                <div>
                                  <h6 className="text-[11px] uppercase tracking-wider text-indigo-700 dark:text-indigo-400 font-bold mb-0.5">O Segredo do Chef</h6>
                                  <p className="text-xs text-slate-600 dark:text-slate-350 leading-relaxed font-medium">{prepTips.chefSecret}</p>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="py-2 flex items-center justify-center">
                              <button
                                onClick={async () => {
                                  setLoadingPrepTips(true);
                                  setPrepTipsError(null);
                                  try {
                                    const { generateRecipePreparationTips } = await import('../lib/gemini');
                                    const tips = await generateRecipePreparationTips(recipe.name, recipe.ingredients);
                                    if (tips) setPrepTips(tips);
                                    else setPrepTipsError("Não foi possível carregar as dicas de preparo.");
                                  } catch (err) {
                                    setPrepTipsError("Erro ao carregar as dicas de preparo com a IA.");
                                  } finally {
                                    setLoadingPrepTips(false);
                                  }
                                }}
                                className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1.5"
                              >
                                <Sparkles className="w-3.5 h-3.5" />
                                Carregar Dicas de Preparo da Chef Malu
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="bg-slate-500/5 dark:bg-slate-500/10 border border-slate-500/10 rounded-xl p-4 text-center text-sm text-slate-400">
                        Nenhum macronutriente disponível para exibição gráfica.
                      </div>
                    );
                  })()}
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
              </motion.div>
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

      {/* Modal de Compartilhamento de Receita */}
      <AnimatePresence>
        {isShareModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-white dark:bg-slate-900 rounded-[32px] max-w-lg w-full p-6 md:p-8 shadow-2xl relative border border-slate-200 dark:border-slate-800"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-serif text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <Share2 className="w-5 h-5 text-indigo-500" />
                    Compartilhar Receita
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Gere um card elegante pronto para postar no Instagram, WhatsApp ou Facebook.
                  </p>
                </div>
                <button
                  onClick={() => setIsShareModalOpen(false)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 border-none bg-transparent cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Viewport Card wrapper to download */}
              <div className="border border-slate-200/60 dark:border-slate-800 rounded-3xl p-3 bg-slate-50 dark:bg-slate-950/40 flex justify-center overflow-hidden">
                <div 
                  ref={shareCardRef}
                  id="recipe-social-share-card"
                  className="w-[350px] min-h-[480px] bg-gradient-to-br from-emerald-950 via-slate-950 to-teal-950 p-6 rounded-[24px] relative overflow-hidden flex flex-col justify-between text-white shadow-2xl"
                  style={{ fontFamily: 'Inter, sans-serif' }}
                >
                  {/* Glowing background highlights */}
                  <div className="absolute top-0 right-0 w-36 h-36 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
                  <div className="absolute bottom-0 left-0 w-36 h-36 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

                  {/* Header Branding */}
                  <div className="flex items-center justify-between relative z-10 border-b border-white/10 pb-3">
                    <div className="flex items-center gap-1.5">
                      <span className="text-lg">🥗</span>
                      <span className="font-serif text-sm font-black tracking-widest bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent uppercase">
                        NutriPlate
                      </span>
                    </div>
                    <span className="text-[9px] uppercase tracking-widest font-black text-slate-400 bg-white/5 px-2.5 py-1 rounded-full border border-white/5">
                      Receita do Dia
                    </span>
                  </div>

                  {/* Recipe Image & Overlay details */}
                  <div className="my-4 relative h-40 rounded-[18px] overflow-hidden shadow-inner border border-white/5">
                    {recipeImage ? (
                      <img 
                        src={recipeImage} 
                        alt={recipe.name} 
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover" 
                      />
                    ) : (
                      <div className="w-full h-full bg-slate-900 flex flex-col items-center justify-center text-center p-4">
                        <span className="text-3xl mb-1">🍽️</span>
                        <span className="text-xs text-slate-400 font-bold font-mono">Foto do Prato</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/0 to-black/10 pointer-events-none" />
                    <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between">
                      <span className="text-[10px] font-bold text-white bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-md flex items-center gap-1">
                        <Clock className="w-3 h-3 text-emerald-400" />
                        {recipe.prepTime}
                      </span>
                      <span className="text-[10px] font-black text-amber-300 bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-md flex items-center gap-1">
                        <Flame className="w-3 h-3" />
                        {recipe.nutrition.calories} kcal
                      </span>
                    </div>
                  </div>

                  {/* Title & Description */}
                  <div className="relative z-10 space-y-1 text-left">
                    <h4 className="font-serif text-xl font-bold tracking-tight text-white line-clamp-1">
                      {recipe.name}
                    </h4>
                    <p className="text-[11px] text-slate-300 leading-relaxed line-clamp-2 italic">
                      {recipe.description}
                    </p>
                  </div>

                  {/* Macro Nutrients Grid */}
                  <div className="grid grid-cols-3 gap-2 my-4 relative z-10">
                    <div className="bg-blue-500/10 border border-blue-500/20 p-2.5 rounded-xl text-center">
                      <span className="text-[8px] font-bold uppercase text-blue-400 block tracking-widest">Proteínas</span>
                      <span className="text-sm font-black text-blue-300">{recipe.nutrition.protein}g</span>
                    </div>
                    <div className="bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-xl text-center">
                      <span className="text-[8px] font-bold uppercase text-amber-400 block tracking-widest">Carboidratos</span>
                      <span className="text-sm font-black text-amber-300">{recipe.nutrition.carbs}g</span>
                    </div>
                    <div className="bg-pink-500/10 border border-pink-500/20 p-2.5 rounded-xl text-center">
                      <span className="text-[8px] font-bold uppercase text-pink-400 block tracking-widest">Gorduras</span>
                      <span className="text-sm font-black text-pink-300">{recipe.nutrition.fat}g</span>
                    </div>
                  </div>

                  {/* Footer Brand Info */}
                  <div className="flex items-center justify-between border-t border-white/10 pt-3 mt-1 text-[9px] text-slate-400 font-mono relative z-10">
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      @nutriplate_app
                    </span>
                    <span>Alimentação Consciente</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3 mt-6">
                <button
                  onClick={handleCopyText}
                  className="flex items-center justify-center gap-2 px-4 py-3 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-2xl transition-all active:scale-[0.98] cursor-pointer border-none"
                >
                  {isTextCopied ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-500" />
                      Copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copiar Texto
                    </>
                  )}
                </button>
                <button
                  onClick={handleExportCard}
                  disabled={isExportingCard}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-2xl shadow-md hover:shadow-indigo-500/10 transition-all active:scale-[0.98] cursor-pointer border-none"
                >
                  {isExportingCard ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Exportando...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      Salvar Card (PNG)
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
