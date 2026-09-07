import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Mic, 
  Loader2, 
  Waves,
  Sparkles,
  Volume2,
  VolumeX,
  Compass,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { UserProfile } from '../types';
import { chatWithAssistant } from '../lib/gemini';
import { speak, stopSpeech } from '../lib/speech';
import { playSfx, vibrate } from '../lib/sensory';

export interface LiveAssistantProps {
  profile: UserProfile | null;
  activeTab?: string;
  onNavigate?: (tab: string, payload?: any) => void;
  onOpenLanguage?: () => void;
  onOpenFeedback?: () => void;
  onAwardPoints?: (points: number, reason: string) => void;
  onUpdateProfile?: (updater: React.SetStateAction<UserProfile | null>) => void;
}

// Inactivity timeout in milliseconds (8 seconds of silence closes the session)
const INACTIVITY_TIMEOUT_MS = 8000;

// Compute time-appropriate greeting in Brazilian Portuguese:
// "Bom dia! ☀️ Como posso ajudar você hoje?" / "Boa tarde! 🌤️ Como posso ajudar você hoje?" / "Boa noite! 🌙 Como posso ajudar você hoje?"
function getTimeGreeting(profile?: UserProfile | null): { spoken: string; display: string } {
  const currentHour = new Date().getHours();
  let timeGreeting = "Boa noite";
  let icon = "🌙";

  if (currentHour >= 5 && currentHour < 12) {
    timeGreeting = "Bom dia";
    icon = "☀️";
  } else if (currentHour >= 12 && currentHour < 18) {
    timeGreeting = "Boa tarde";
    icon = "🌤️";
  }

  const rawName = profile?.name?.trim();
  const firstName = rawName && !['usuário', 'usuario', 'amigo', 'amiga', 'amigo(a)', ''].includes(rawName.toLowerCase())
    ? rawName.split(' ')[0]
    : null;

  const nameGreeting = firstName ? `, ${firstName}` : '';
  const spoken = `${timeGreeting}${nameGreeting}! Como posso ajudar você hoje?`;
  const display = `${timeGreeting}${nameGreeting}! ${icon} Como posso ajudar você hoje?`;

  return { spoken, display };
}

// Local fast-intent classifier for zero-latency instant navigation & actions
function classifyLocalIntent(query: string, profile?: UserProfile | null): {
  text: string;
  action: 'NAVIGATE' | 'OPEN_MODAL' | 'CONFIRM_ACTION' | 'NONE';
  actionData?: { tab?: string; modal?: string; filter?: string };
} | null {
  const q = query.toLowerCase().trim();

  // 1. Emagrecimento / Receita rápida para emagrecer
  if (
    (q.includes('emagrecer') || q.includes('perder peso') || q.includes('secar') || q.includes('emagrecimento')) &&
    (q.includes('receita') || q.includes('prato') || q.includes('rápida') || q.includes('rapida') || q.includes('comer') || q.includes('gerar'))
  ) {
    return {
      text: "Claro! Vou abrir os pratos rápidos para emagrecimento.",
      action: "NAVIGATE",
      actionData: { tab: "quickdishes", filter: "emagrecimento" }
    };
  }

  // 2. Ganho de Massa / Hipertrofia
  if (
    q.includes('ganho de massa') || q.includes('ganhar massa') || q.includes('hipertrofia') || q.includes('mais músculo') || q.includes('musculo')
  ) {
    return {
      text: "Perfeito! Vou abrir os pratos e opções para ganho de massa muscular.",
      action: "NAVIGATE",
      actionData: { tab: "quickdishes", filter: "massa" }
    };
  }

  // 3. Receita Rápida / Pratos Rápidos
  if (
    q.includes('receita rápida') || q.includes('receita rapida') || q.includes('prato rápido') || q.includes('pratos rápidos') || q.includes('15 minutos')
  ) {
    return {
      text: "Com certeza! Abrindo pratos rápidos e práticos para você.",
      action: "NAVIGATE",
      actionData: { tab: "quickdishes" }
    };
  }

  // 4. Receitas / Gerador de Receitas
  if (
    q.includes('receita') || q.includes('receitas') || q.includes('gerador') || q.includes('cozinhar') || q.includes('ideia de almoço') || q.includes('ideia de janta')
  ) {
    return {
      text: "Claro! Abrindo o Gerador de Receitas com Inteligência Artificial.",
      action: "NAVIGATE",
      actionData: { tab: "generator" }
    };
  }

  // 5. Análise de Prato
  if (
    q.includes('analisar prato') || q.includes('análise de prato') || q.includes('analise de prato') || q.includes('foto do prato') || q.includes('avaliar prato') || q.includes('foto da comida')
  ) {
    return {
      text: "Claro! Vou abrir a Análise de Prato para você.",
      action: "NAVIGATE",
      actionData: { tab: "analyzer" }
    };
  }

  // 6. Restaurante / Comer Fora
  if (
    q.includes('restaurante') || q.includes('comer fora') || q.includes('comi fora') || q.includes('cardápio fora') || q.includes('estou no restaurante')
  ) {
    return {
      text: "Vou abrir nosso guia de escolhas saudáveis para restaurantes e comer fora.",
      action: "NAVIGATE",
      actionData: { tab: "dining" }
    };
  }

  // 7. Geladeira Inteligente
  if (
    q.includes('geladeira') || q.includes('minha geladeira') || q.includes('o que tem na geladeira') || q.includes('ingredientes que tenho')
  ) {
    return {
      text: "Abrindo sua Geladeira Inteligente para aproveitar o que você tem em casa.",
      action: "NAVIGATE",
      actionData: { tab: "fridge" }
    };
  }

  // 8. Sucos Funcionais / Detox
  if (
    q.includes('suco') || q.includes('sucos') || q.includes('detox') || q.includes('suco funcional')
  ) {
    return {
      text: "Preparando as melhores receitas de sucos funcionais e detox para você.",
      action: "NAVIGATE",
      actionData: { tab: "juice" }
    };
  }

  // 9. Chás / Ervas Medicinais / Plantas
  if (
    q.includes('chá') || q.includes('chas') || q.includes('erva') || q.includes('ervas') || q.includes('planta') || q.includes('medicinal')
  ) {
    return {
      text: "Abrindo a seção de chás funcionais e ervas medicinais.",
      action: "NAVIGATE",
      actionData: { tab: "herbs" }
    };
  }

  // 10. Treino / Exercícios / Personal
  if (
    q.includes('treino') || q.includes('treinar') || q.includes('exercício') || q.includes('exercicio') || q.includes('personal') || q.includes('academia')
  ) {
    return {
      text: "Excelente iniciativa! Abrindo a sua área de treinos e personal.",
      action: "NAVIGATE",
      actionData: { tab: "trainer" }
    };
  }

  // 11. Água / Hidratação / Hábitos
  if (
    q.includes('água') || q.includes('agua') || q.includes('beber água') || q.includes('hidratação') || q.includes('hidratacao') || q.includes('hábito') || q.includes('habitos')
  ) {
    const waterGoal = profile?.waterGoal || 2000;
    return {
      text: `Sua meta diária é de ${waterGoal} ml de água. Vou abrir seus hábitos para você registrar.`,
      action: "NAVIGATE",
      actionData: { tab: "habits" }
    };
  }

  // 12. Progresso / Evolução Corporal / Fotos / Peso
  if (
    q.includes('progresso') || q.includes('evolução') || q.includes('evolucao') || q.includes('minhas fotos') || q.includes('antes e depois') || q.includes('meu peso')
  ) {
    return {
      text: "Vou abrir o seu histórico e fotos de evolução corporal.",
      action: "NAVIGATE",
      actionData: { tab: "evolution" }
    };
  }

  // 13. Avatar 3D / Análise Corporal
  if (
    q.includes('avatar') || q.includes('meu corpo') || q.includes('composição corporal') || q.includes('bioimpedância')
  ) {
    return {
      text: "Abrindo seu Avatar 3D e análise de composição corporal.",
      action: "NAVIGATE",
      actionData: { tab: "body" }
    };
  }

  // 14. Lista de Compras
  if (
    q.includes('lista de compras') || q.includes('minhas compras') || q.includes('compras') || q.includes('ingredientes para comprar')
  ) {
    return {
      text: "Abrindo sua Lista de Compras Inteligente.",
      action: "NAVIGATE",
      actionData: { tab: "shopping" }
    };
  }

  // 15. Comparador de Preços / Mercado
  if (
    q.includes('comparar preço') || q.includes('comparador') || q.includes('mercado') || q.includes('delivery') || q.includes('pedir marmita')
  ) {
    return {
      text: "Abrindo o Mercado Saudável e comparador de preços.",
      action: "NAVIGATE",
      actionData: { tab: "market" }
    };
  }

  // 16. Horta Inteligente
  if (
    q.includes('horta') || q.includes('cultivo') || q.includes('plantar') || q.includes('temperos em casa')
  ) {
    return {
      text: "Abrindo a sua Horta Inteligente e dicas de cultivo.",
      action: "NAVIGATE",
      actionData: { tab: "garden" }
    };
  }

  // 17. Equilíbrio Emocional / Humor / Ansiedade
  if (
    q.includes('emocional') || q.includes('ansiedade') || q.includes('estresse') || q.includes('humor') || q.includes('vontade de comer doce')
  ) {
    return {
      text: "Cuidar da mente é fundamental. Abrindo o rastreador de Equilíbrio Emocional.",
      action: "NAVIGATE",
      actionData: { tab: "emotional" }
    };
  }

  // 18. Pressão Arterial
  if (
    q.includes('pressão') || q.includes('pressao') || q.includes('hipertensão')
  ) {
    return {
      text: "Abrindo o monitor de Pressão Arterial para você registrar suas medições.",
      action: "NAVIGATE",
      actionData: { tab: "bloodpressure" }
    };
  }

  // 19. Glicose / Glicemia / Diabetes
  if (
    q.includes('glicose') || q.includes('glicemia') || q.includes('diabetes')
  ) {
    return {
      text: "Abrindo o monitor de Glicemia e controle glicêmico.",
      action: "NAVIGATE",
      actionData: { tab: "glucose" }
    };
  }

  // 20. Caderno de Notas / Diário
  if (
    q.includes('notas') || q.includes('anotação') || q.includes('anotacoes') || q.includes('diário') || q.includes('diario')
  ) {
    return {
      text: "Abrindo o seu Caderno de Notas e Diário Alimentar.",
      action: "NAVIGATE",
      actionData: { tab: "notes" }
    };
  }

  // 21. Substituições Inteligentes / Trocas
  if (
    q.includes('troca') || q.includes('trocas') || q.includes('substituição') || q.includes('substituicao') || q.includes('substituir')
  ) {
    return {
      text: "Abrindo a ferramenta de Substituições Inteligentes de Alimentos.",
      action: "NAVIGATE",
      actionData: { tab: "swaps" }
    };
  }

  // 22. Desafios / Roleta Fit
  if (
    q.includes('desafio') || q.includes('desafios') || q.includes('roleta') || q.includes('conquista') || q.includes('selos')
  ) {
    return {
      text: "Abrindo os Desafios Saudáveis e Conquistas da semana!",
      action: "NAVIGATE",
      actionData: { tab: "challenge" }
    };
  }

  // 23. Plano Alimentar / Cardápio Semanal
  if (
    q.includes('plano alimentar') || q.includes('cardápio') || q.includes('cardapio') || q.includes('minha dieta') || q.includes('planejamento')
  ) {
    return {
      text: "Abrindo seu Plano Alimentar e Cardápio da semana.",
      action: "NAVIGATE",
      actionData: { tab: "plan" }
    };
  }

  // 24. Scanner de Código de Barras / Alimentos
  if (
    q.includes('scanner') || q.includes('código de barra') || q.includes('codigo de barras') || q.includes('escanear')
  ) {
    return {
      text: "Abrindo o Scanner de Alimentos para você escanear o rótulo.",
      action: "NAVIGATE",
      actionData: { tab: "barcode" }
    };
  }

  // 25. Alergias e Alérgenos
  if (
    q.includes('alergia') || q.includes('alergias') || q.includes('alérgeno') || q.includes('intolerância')
  ) {
    return {
      text: "Abrindo o Detector de Alergias e Alérgenos Ocultos.",
      action: "NAVIGATE",
      actionData: { tab: "allergy" }
    };
  }

  // 26. Idioma
  if (
    q.includes('mudar idioma') || q.includes('trocar idioma') || q.includes('alterar idioma') || q.includes('idiomas') || q.includes('língua') || q.includes('lingua')
  ) {
    return {
      text: "Vou abrir as configurações de idioma para você.",
      action: "OPEN_MODAL",
      actionData: { modal: "language" }
    };
  }

  // 27. Premium / PRO / Planos / Assinatura
  if (
    q.includes('premium') || q.includes('pro') || q.includes('plano premium') || q.includes('assinar') || q.includes('assinatura') || q.includes('preço')
  ) {
    return {
      text: "Vou te mostrar todos os planos e recursos exclusivos do NutriAI Premium.",
      action: "NAVIGATE",
      actionData: { tab: "pricing" }
    };
  }

  // 28. Perfil / Configurações
  if (
    q.includes('perfil') || q.includes('minha conta') || q.includes('configurações') || q.includes('configuracoes') || q.includes('meus dados')
  ) {
    return {
      text: "Abrindo o seu Perfil e configurações pessoais.",
      action: "NAVIGATE",
      actionData: { tab: "profile" }
    };
  }

  // 29. Suporte / Feedback
  if (
    q.includes('suporte') || q.includes('ajuda') || q.includes('feedback') || q.includes('falar com atendimento') || q.includes('sugestão')
  ) {
    return {
      text: "Abrindo a central de Feedback e Suporte para você enviar sua mensagem.",
      action: "OPEN_MODAL",
      actionData: { modal: "feedback" }
    };
  }

  // 30. Início / Página Inicial / Assistente 360°
  if (
    q.includes('início') || q.includes('inicio') || q.includes('página inicial') || q.includes('pagina inicial') || q.includes('home') || q.includes('360')
  ) {
    return {
      text: "Voltando para a tela inicial do Assistente 360°.",
      action: "NAVIGATE",
      actionData: { tab: "assistant360" }
    };
  }

  // 31. Confirmação de ações críticas
  if (
    q.includes('excluir conta') || q.includes('apagar conta') || q.includes('deletar conta') || q.includes('apagar histórico') || q.includes('limpar tudo')
  ) {
    return {
      text: "Essa ação é permanente. Você realmente deseja excluir sua conta ou limpar todos os seus dados?",
      action: "CONFIRM_ACTION"
    };
  }

  // 32. Piada ou conversa descontraída fora de contexto
  if (
    q.includes('piada') || q.includes('brincadeira') || q.includes('engraçado')
  ) {
    return {
      text: "Posso até brincar um pouco! 😄 Mas vamos voltar ao que pode ajudar você de verdade: seu foco hoje é emagrecer, ganhar massa ou melhorar sua alimentação?",
      action: "NONE"
    };
  }

  return null;
}

export function LiveAssistant({ 
  profile,
  activeTab = 'assistant360',
  onNavigate,
  onOpenLanguage,
  onOpenFeedback,
  onAwardPoints,
  onUpdateProfile
}: LiveAssistantProps) {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [statusText, setStatusText] = useState<string | null>(null);
  const [statusType, setStatusType] = useState<'idle' | 'listening' | 'processing' | 'speaking' | 'error' | 'success'>('idle');
  const [audioVolume, setAudioVolume] = useState<number>(0);

  // Conversation history in memory
  const [conversationHistory, setConversationHistory] = useState<{ role: 'user' | 'model', text: string }[]>([]);

  // References
  const recognitionRef = useRef<any>(null);
  const statusTimerRef = useRef<any>(null);
  const inactivityTimerRef = useRef<any>(null);
  const isListeningRef = useRef(false);
  const isSpeakingRef = useRef(false);
  const isProcessingRef = useRef(false);
  const isAssistantActiveRef = useRef(false);

  // Audio Analysis References
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const animFrameIdRef = useRef<number | null>(null);

  // Stop audio visualizer
  const stopAudioVisualizer = useCallback(() => {
    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try {
        audioContextRef.current.close();
      } catch (e) {}
      audioContextRef.current = null;
    }
    setAudioVolume(0);
  }, []);

  // Start real-time audio volume analyzer
  const startAudioVisualizer = useCallback(async () => {
    try {
      stopAudioVisualizer();
      if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) return;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      mediaStreamRef.current = stream;

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.65;
      analyserRef.current = analyser;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const updateMeter = () => {
        if (!analyserRef.current || !isListeningRef.current) {
          setAudioVolume(0);
          return;
        }

        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        const binCount = dataArray.length;
        for (let i = 0; i < binCount; i++) {
          sum += dataArray[i];
        }

        // Calculate average normalized volume (0 to 1) with non-linear boost for speech
        const avg = sum / binCount / 255;
        const boosted = Math.min(1, Math.pow(avg * 2.2, 1.2));
        
        // Smooth transition
        setAudioVolume(prev => prev * 0.4 + boosted * 0.6);
        animFrameIdRef.current = requestAnimationFrame(updateMeter);
      };

      updateMeter();
    } catch (err) {
      console.warn('Microphone audio analyser unavailable, falling back to simulated breathing waves:', err);
    }
  }, [stopAudioVisualizer]);

  // Synchronize audio visualizer with listening state
  useEffect(() => {
    if (isListening) {
      startAudioVisualizer();
    } else {
      stopAudioVisualizer();
    }
    return () => {
      stopAudioVisualizer();
    };
  }, [isListening, startAudioVisualizer, stopAudioVisualizer]);

  // Synchronize ref flags
  useEffect(() => {
    isListeningRef.current = isListening;
    isSpeakingRef.current = isSpeaking;
    isProcessingRef.current = isProcessing;
    isAssistantActiveRef.current = isListening || isSpeaking || isProcessing;
  }, [isListening, isSpeaking, isProcessing]);

  const showStatus = useCallback((text: string, type: 'idle' | 'listening' | 'processing' | 'speaking' | 'error' | 'success' = 'idle', autoHideMs = 4000) => {
    setStatusText(text);
    setStatusType(type);
    if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
    if (autoHideMs > 0) {
      statusTimerRef.current = setTimeout(() => {
        setStatusText(null);
        setStatusType('idle');
      }, autoHideMs);
    }
  }, []);

  // Clear inactivity timer
  const clearInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }
  }, []);

  // Stop everything immediately
  const stopAll = useCallback((options?: { silent?: boolean; goodbye?: boolean }) => {
    clearInactivityTimer();
    stopSpeech();
    setIsSpeaking(false);
    setIsListening(false);
    setIsProcessing(false);

    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch (e) {}
    }

    if (options?.goodbye) {
      const goodbyeMsg = "Vou ficar por aqui. Quando precisar, é só me chamar.";
      showStatus(goodbyeMsg, 'speaking', 4000);
      speak(goodbyeMsg, {
        onEnded: () => {
          showStatus("Malu", 'idle', 2000);
        }
      });
    } else if (!options?.silent) {
      showStatus("Malu", 'idle', 2000);
    }
  }, [clearInactivityTimer, showStatus]);

  // Execute navigation or actions safely
  const executeAppAction = useCallback((action: string, actionData?: any) => {
    if (action === 'NAVIGATE' && actionData?.tab) {
      if (onNavigate) {
        onNavigate(actionData.tab, actionData);
      } else {
        window.dispatchEvent(new CustomEvent('app:navigate', { detail: { tab: actionData.tab, ...actionData } }));
      }
      playSfx('success');
      vibrate(20);
    } else if (action === 'OPEN_MODAL') {
      if (actionData?.modal === 'language') {
        if (onOpenLanguage) onOpenLanguage();
        else window.dispatchEvent(new CustomEvent('app:openLanguageModal'));
      } else if (actionData?.modal === 'feedback') {
        if (onOpenFeedback) onOpenFeedback();
        else window.dispatchEvent(new CustomEvent('app:openFeedbackModal'));
      }
      playSfx('pop');
    }
  }, [onNavigate, onOpenLanguage, onOpenFeedback]);

  // Forward declaration of startListening
  const startListeningRef = useRef<() => void>(() => {});

  // Send user query to Malu (Gemini with zero-latency local shortcut fallback) and speak reply
  const handleUserQuery = useCallback(async (queryText: string) => {
    const cleanQuery = queryText.trim();
    if (!cleanQuery || isProcessingRef.current) return;

    clearInactivityTimer();
    stopSpeech();
    setIsSpeaking(false);
    setIsListening(false);
    setIsProcessing(true);
    showStatus('Pensando...', 'processing', 0);

    // Add user query to conversation history
    const updatedHistory = [...conversationHistory, { role: 'user' as const, text: cleanQuery }];
    setConversationHistory(updatedHistory);

    try {
      // 1. Fast local classification check for instant, flawless app navigation
      const localMatch = classifyLocalIntent(cleanQuery, profile);

      let replyText = "";
      let actionToRun = "NONE";
      let actionDataToRun: any = undefined;

      if (localMatch) {
        replyText = localMatch.text;
        actionToRun = localMatch.action;
        actionDataToRun = localMatch.actionData;
      } else {
        // 2. Call Gemini Assistant backend with full app awareness and context
        const defaultProfile: UserProfile = profile || {
          name: 'Amigo(a)',
          age: 30,
          gender: 'Outro',
          weight: 70,
          height: 170,
          activityLevel: 'Moderado',
          goals: 'Alimentação saudável e energia',
          routine: 'Rotina ativa',
          restrictions: [],
          allergies: [],
          equipment: [],
          waterGoal: 2000,
          targetWeight: 68,
          points: 100,
          badges: []
        };

        const res = await chatWithAssistant(defaultProfile, conversationHistory, cleanQuery);
        replyText = res?.text || "Estou aqui com você! Como posso te ajudar na sua alimentação hoje?";
        actionToRun = res?.action || "NONE";
        actionDataToRun = res?.actionData;
      }

      // Execute action immediately in the app
      if (actionToRun && actionToRun !== 'NONE') {
        executeAppAction(actionToRun, actionDataToRun);
      }

      // Update history with model response
      setConversationHistory([...updatedHistory, { role: 'model', text: replyText }]);

      setIsProcessing(false);
      setIsSpeaking(true);
      showStatus('Respondendo...', 'speaking', 0);

      // Play natural Brazilian Portuguese voice ('Aoede')
      await speak(replyText, {
        onEnded: () => {
          setIsSpeaking(false);
          showStatus('Estou ouvindo...', 'listening', 0);
          startListeningRef.current();
        },
        onError: () => {
          setIsSpeaking(false);
          showStatus('Estou ouvindo...', 'listening', 0);
          startListeningRef.current();
        }
      });

    } catch (err: any) {
      console.warn("Malu voice processing error:", err);
      setIsProcessing(false);
      setIsSpeaking(false);
      showStatus('Tente novamente.', 'error', 3000);
      // Restart listening after brief pause
      setTimeout(() => {
        if (isAssistantActiveRef.current) {
          startListeningRef.current();
        }
      }, 1500);
    }
  }, [clearInactivityTimer, conversationHistory, profile, showStatus, executeAppAction]);

  // Handler for inactivity timeout
  const handleInactivityTimeout = useCallback(() => {
    if (isListeningRef.current) {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
      }
      setIsListening(false);
      showStatus('Vou ficar por aqui. Quando precisar, é só me chamar.', 'speaking', 3500);
      speak("Vou ficar por aqui. Quando precisar, é só me chamar.", {
        onEnded: () => {
          showStatus('Malu', 'idle', 1500);
        }
      });
      playSfx('pop');
    }
  }, [showStatus]);

  // Start or reset the inactivity timer
  const resetInactivityTimer = useCallback(() => {
    clearInactivityTimer();
    inactivityTimerRef.current = setTimeout(() => {
      handleInactivityTimeout();
    }, INACTIVITY_TIMEOUT_MS);
  }, [clearInactivityTimer, handleInactivityTimeout]);

  // Web Speech Recognition setup
  const initSpeechRecognition = useCallback(() => {
    if (typeof window === 'undefined') return null;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return null;

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'pt-BR';
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        showStatus('Estou ouvindo...', 'listening', 0);
        setTranscript('');
        resetInactivityTimer();
      };

      recognition.onresult = (event: any) => {
        // If speaking, user spoke: interrupt speech and prioritize user input
        if (isSpeakingRef.current) {
          stopSpeech();
          setIsSpeaking(false);
        }

        resetInactivityTimer();
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        setTranscript(currentTranscript);
      };

      recognition.onerror = (event: any) => {
        clearInactivityTimer();
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          showStatus('Não consegui acessar seu microfone. Verifique a permissão do navegador.', 'error', 4500);
        } else if (event.error === 'no-speech') {
          // Handled by inactivity or loop
        } else if (event.error !== 'aborted') {
          showStatus('Tente novamente.', 'error', 3000);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        clearInactivityTimer();
        setIsListening(false);
      };

      return recognition;
    } catch (e) {
      console.warn('Speech recognition init error:', e);
      return null;
    }
  }, [clearInactivityTimer, resetInactivityTimer, showStatus]);

  // Start listening
  const startListening = useCallback(() => {
    clearInactivityTimer();
    stopSpeech();
    setIsSpeaking(false);

    if (!recognitionRef.current) {
      recognitionRef.current = initSpeechRecognition();
    }

    if (recognitionRef.current) {
      try {
        setTranscript('');
        recognitionRef.current.start();
        playSfx('pop');
        vibrate(15);
        resetInactivityTimer();
      } catch (err) {
        recognitionRef.current = initSpeechRecognition();
        try {
          recognitionRef.current?.start();
          resetInactivityTimer();
        } catch (e) {
          showStatus('Estou ouvindo...', 'listening', 2000);
        }
      }
    } else {
      showStatus('Reconhecimento de voz indisponível neste navegador.', 'error', 3500);
    }
  }, [clearInactivityTimer, initSpeechRecognition, resetInactivityTimer, showStatus]);

  startListeningRef.current = startListening;

  // Greet user on first tap, speak greeting with Aoede voice, then open mic
  const activateAssistantWithGreeting = useCallback(async () => {
    clearInactivityTimer();
    setIsProcessing(false);
    setIsListening(false);
    setIsSpeaking(true);

    const { spoken, display } = getTimeGreeting(profile);
    showStatus(display, 'speaking', 0);
    playSfx('crystal');
    vibrate([20, 40, 20]);

    await speak(spoken, {
      onEnded: () => {
        setIsSpeaking(false);
        showStatus('Estou ouvindo...', 'listening', 0);
        startListening();
      },
      onError: () => {
        setIsSpeaking(false);
        showStatus('Estou ouvindo...', 'listening', 0);
        startListening();
      }
    });
  }, [clearInactivityTimer, profile, showStatus, startListening]);

  // Toggle button click (1st touch: Activate with greeting, 2nd touch: Deactivate with goodbye)
  const handleToggleClick = () => {
    playSfx('tap');
    vibrate(20);

    const isCurrentlyActive = isListening || isSpeaking || isProcessing;

    if (isCurrentlyActive) {
      // 2nd Tap: Deactivate Malu with warm farewell
      stopAll({ goodbye: true });
    } else {
      // 1st Tap: Activate Malu immediately with time-based greeting
      activateAssistantWithGreeting();
    }
  };

  // Keyboard navigation support
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleToggleClick();
    }
  };

  // Listen for custom app open event
  useEffect(() => {
    const handleOpen = () => {
      activateAssistantWithGreeting();
    };
    window.addEventListener('app:openLiveAssistant', handleOpen);
    return () => {
      window.removeEventListener('app:openLiveAssistant', handleOpen);
      stopAll({ silent: true });
    };
  }, [activateAssistantWithGreeting, stopAll]);

  // Process transcript automatically when user finishes speaking
  useEffect(() => {
    if (!isListening && transcript.trim() && !isProcessing) {
      const timer = setTimeout(() => {
        handleUserQuery(transcript);
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [isListening, transcript, isProcessing, handleUserQuery]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      clearInactivityTimer();
      stopSpeech();
    };
  }, [clearInactivityTimer]);

  const isActive = isListening || isSpeaking || isProcessing;

  return (
    <div 
      className="fixed bottom-5 left-5 z-50 flex items-center gap-3 select-none"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      {/* Central Voice Button with High-Fidelity Circular Neon Halo Ring */}
      <div className="relative group p-1 flex items-center justify-center">
        {/* Ambient Neon Glow behind the button */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 7, repeat: Infinity, ease: "linear" }}
          className={`absolute inset-0 rounded-full blur-[6px] transition-all duration-500 pointer-events-none ${
            isListening
              ? 'bg-[conic-gradient(from_0deg,#00f2fe,#00ffcc,#10b981,#06b6d4,#00f2fe)] opacity-95 blur-[10px]'
              : isSpeaking
              ? 'bg-[conic-gradient(from_0deg,#00ffcc,#00ff66,#00ccff,#00ffcc)] opacity-90 blur-[8px]'
              : isProcessing
              ? 'bg-[conic-gradient(from_0deg,#06b6d4,#38bdf8,#00f2fe,#06b6d4)] opacity-90 blur-[8px]'
              : 'bg-[conic-gradient(from_0deg,#00f2fe,#4facfe,#00ff88,#00f2fe)] opacity-60 group-hover:opacity-90'
          }`}
        />

        {/* Outer Circular Neon Border Ring */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 7, repeat: Infinity, ease: "linear" }}
          className={`absolute inset-0 rounded-full p-[2px] transition-all duration-500 pointer-events-none ${
            isListening
              ? 'bg-[conic-gradient(from_0deg,#00f2fe,#00ffcc,#10b981,#06b6d4,#00f2fe)]'
              : isSpeaking
              ? 'bg-[conic-gradient(from_0deg,#00ffcc,#10b981,#06b6d4,#00ffcc)]'
              : isProcessing
              ? 'bg-[conic-gradient(from_0deg,#06b6d4,#38bdf8,#10b981,#06b6d4)]'
              : 'bg-[conic-gradient(from_0deg,#06b6d4,#10b981,#3b82f6,#06b6d4)]'
          }`}
        >
          <div className="w-full h-full rounded-full bg-transparent" />
        </motion.div>

        {/* Real-time Dynamic Voice Reactive Waves when listening */}
        {isListening && (
          <>
            {/* Outer dynamic voice shockwave */}
            <motion.div
              animate={{
                scale: 1.25 + audioVolume * 1.55,
                opacity: 0.15 + audioVolume * 0.75,
              }}
              transition={{
                type: "spring",
                stiffness: 260,
                damping: 18,
              }}
              className="absolute inset-0 rounded-full pointer-events-none bg-gradient-to-tr from-cyan-500/30 via-teal-400/25 to-emerald-400/20 blur-[6px]"
            />

            {/* Middle dynamic voice harmonic wave */}
            <motion.div
              animate={{
                scale: 1.12 + audioVolume * 1.05,
                opacity: 0.3 + audioVolume * 0.65,
              }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 20,
              }}
              className="absolute inset-0 rounded-full pointer-events-none bg-gradient-to-tr from-emerald-400/35 via-cyan-400/30 to-teal-300/25 blur-[3px]"
            />

            {/* Inner dynamic voice core ring */}
            <motion.div
              animate={{
                scale: 1.04 + audioVolume * 0.6,
                opacity: 0.5 + audioVolume * 0.5,
              }}
              transition={{
                type: "spring",
                stiffness: 350,
                damping: 22,
              }}
              className="absolute inset-0 rounded-full pointer-events-none border border-cyan-300/60 bg-cyan-400/20 blur-[1px]"
            />

            {/* Radial Voice Equalizer Sound Bars on 4 Cardinal Axis */}
            {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, idx) => (
              <motion.div
                key={angle}
                style={{
                  transformOrigin: 'center center',
                  transform: `rotate(${angle}deg) translateY(-${30 + (idx % 2 === 0 ? 4 : 0)}px)`,
                }}
                animate={{
                  height: [6, Math.max(6, 6 + audioVolume * 22 * (idx % 2 === 0 ? 1.2 : 0.8)), 6],
                  opacity: Math.max(0.3, audioVolume * 1.4),
                  scaleY: 1 + audioVolume * 1.8,
                }}
                transition={{
                  duration: 0.12,
                  ease: "easeOut",
                }}
                className="absolute w-1 rounded-full bg-gradient-to-t from-emerald-400 to-cyan-300 pointer-events-none shadow-[0_0_8px_rgba(6,182,212,0.8)]"
              />
            ))}
          </>
        )}

        {/* Pulse Ripple Waves while speaking or processing */}
        {(isSpeaking || isProcessing) && (
          <motion.div
            animate={{
              scale: [1, 1.35, 1],
              opacity: [0.5, 0.15, 0.5]
            }}
            transition={{
              duration: 1.8,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="absolute inset-0 rounded-full pointer-events-none bg-cyan-400/25 blur-[1px]"
          />
        )}

        {/* Main Floating Voice Button with Framer Motion Breathing & Real-Time Voice Volume Reaction */}
        <motion.button
          id="malu-voice-assistant-central-btn"
          role="button"
          tabIndex={0}
          aria-label={isActive ? "Desativar Malu" : "Ativar Malu"}
          aria-pressed={isActive}
          animate={
            isListening
              ? {
                  scale: 1 + audioVolume * 0.18,
                  boxShadow: `0 10px 30px -4px rgba(6, 182, 212, ${0.5 + audioVolume * 0.5}), 0 0 ${15 + audioVolume * 35}px rgba(16, 185, 129, ${0.4 + audioVolume * 0.6})`
                }
              : isSpeaking
              ? {
                  scale: [1, 1.04, 1],
                  boxShadow: [
                    "0 10px 25px -5px rgba(16, 185, 129, 0.5)",
                    "0 14px 30px -3px rgba(16, 185, 129, 0.7)",
                    "0 10px 25px -5px rgba(16, 185, 129, 0.5)"
                  ]
                }
              : {
                  scale: 1,
                  boxShadow: "0 20px 25px -5px rgba(15, 23, 42, 0.6)"
                }
          }
          transition={
            isListening
              ? {
                  type: "spring",
                  stiffness: 350,
                  damping: 24,
                }
              : isSpeaking
              ? {
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeInOut"
                }
              : { duration: 0.3 }
          }
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          onClick={handleToggleClick}
          onKeyDown={handleKeyDown}
          disabled={isProcessing}
          className={`relative z-10 w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center transition-colors duration-300 cursor-pointer outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 ${
            isListening
              ? 'bg-gradient-to-tr from-cyan-600 via-teal-500 to-emerald-400 text-white ring-2 ring-cyan-300/80'
              : isSpeaking
              ? 'bg-gradient-to-tr from-emerald-600 via-teal-600 to-cyan-500 text-white ring-2 ring-emerald-300/80'
              : isProcessing
              ? 'bg-gradient-to-tr from-teal-700 via-cyan-600 to-blue-600 text-white'
              : 'bg-gradient-to-tr from-slate-950 via-teal-950 to-slate-900 text-teal-300 border border-teal-500/40 hover:text-white hover:border-teal-300'
          }`}
          title={
            isActive
              ? "Toque para desativar a Malu"
              : "Toque para falar com a Malu (Assistente de Voz)"
          }
        >
          {isProcessing ? (
            <Loader2 className="w-6 h-6 sm:w-7 sm:h-7 animate-spin text-white" />
          ) : isSpeaking ? (
            <Waves className="w-6 h-6 sm:w-7 sm:h-7 text-white animate-pulse" />
          ) : isListening ? (
            <motion.div
              animate={{
                scale: 1 + audioVolume * 0.25,
                filter: `drop-shadow(0 0 ${4 + audioVolume * 12}px rgba(255,255,255,0.95))`
              }}
              transition={{
                type: "spring",
                stiffness: 400,
                damping: 20
              }}
            >
              <Mic className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
            </motion.div>
          ) : (
            <Mic className="w-6 h-6 sm:w-7 sm:h-7" />
          )}
        </motion.button>
      </div>
    </div>
  );
}
