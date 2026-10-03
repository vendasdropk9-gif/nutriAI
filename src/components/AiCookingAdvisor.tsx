import React, { useState, useEffect, useRef } from 'react';
import { 
  ChefHat, Sparkles, Clock, Thermometer, ArrowRightLeft, 
  HeartPulse, Lightbulb, AlertTriangle, Volume2, Mic, MicOff, 
  Loader2, Send, CheckCircle2, RotateCcw, Flame, ChevronRight, ChevronLeft, Hand, Square, Settings
} from 'lucide-react';
import { askCookingAssistant } from '../lib/gemini';
import { speak, stopSpeech } from '../lib/speech';
import { CookingAdviceResult, UserProfile } from '../types';
import { useTranslation } from '../contexts/LanguageContext';

interface AiCookingAdvisorProps {
  profile?: UserProfile | null;
  recipeContext?: {
    recipeTitle?: string;
    ingredients?: string[];
    currentStep?: string;
    targetDish?: string;
    instructions?: string[];
    currentStepIndex?: number;
  };
  onClose?: () => void;
  onNextStep?: () => void;
  onPrevStep?: () => void;
  onRepeatStep?: () => void;
  onSelectStep?: (index: number) => void;
}

const QUICK_QUESTIONS = [
  {
    icon: '🍗',
    label: 'Quanto tempo devo assar este frango?',
    query: 'Quanto tempo devo assar este frango?'
  },
  {
    icon: '🥣',
    label: 'Posso substituir creme de leite por iogurte grego?',
    query: 'Posso substituir o creme de leite por iogurte grego nesta receita?'
  },
  {
    icon: '🥩',
    label: 'Como selar carne e manter suculência?',
    query: 'Qual a técnica correta para selar a carne na panela sem perder o suco e sem ressecar?'
  },
  {
    icon: '🧂',
    label: 'O molho salgou, como corrigir?',
    query: 'Meu molho ou ensopado ficou com excesso de sal, como posso corrigir sem estragar a receita?'
  },
  {
    icon: '🥑',
    label: 'Como trocar manteiga por azeite?',
    query: 'Qual a proporção para substituir manteiga por azeite de oliva e o que muda na textura?'
  },
  {
    icon: '🥕',
    label: 'Legumes no vapor sem perder nutrientes?',
    query: 'Quanto tempo cozinhar legumes no vapor para ficarem crocantes e manterem as vitaminas?'
  }
];

export const AiCookingAdvisor: React.FC<AiCookingAdvisorProps> = ({
  profile,
  recipeContext,
  onClose,
  onNextStep,
  onPrevStep,
  onRepeatStep,
  onSelectStep
}) => {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CookingAdviceResult | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Voice speed & Verbosity configuration state
  const [voiceSpeed, setVoiceSpeed] = useState<number>(() => {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('nutri_ai_cooking_voice_speed');
      return saved ? parseFloat(saved) : 1.0;
    }
    return 1.0;
  });

  const [verbosityLevel, setVerbosityLevel] = useState<string>(() => {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem('nutri_ai_cooking_verbosity') || 'standard';
    }
    return 'standard';
  });

  const [showSettings, setShowSettings] = useState<boolean>(false);

  useEffect(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('nutri_ai_cooking_voice_speed', voiceSpeed.toString());
    }
  }, [voiceSpeed]);

  useEffect(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('nutri_ai_cooking_verbosity', verbosityLevel);
    }
  }, [verbosityLevel]);

  // Hands-free voice step navigation state for messy hands in the kitchen
  const instructionsList = recipeContext?.instructions || [];
  const [currentStepIdx, setCurrentStepIdx] = useState<number>(recipeContext?.currentStepIndex || 0);
  const [isHandsFreeActive, setIsHandsFreeActive] = useState<boolean>(false);
  const isHandsFreeActiveRef = useRef<boolean>(false);
  const [voiceCommandStatus, setVoiceCommandStatus] = useState<string>('');
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (recipeContext?.currentStepIndex !== undefined) {
      setCurrentStepIdx(recipeContext.currentStepIndex);
    }
  }, [recipeContext?.currentStepIndex]);

  const speakStep = (idx: number, instructions: string[]) => {
    if (idx < 0 || idx >= instructions.length) return;
    let stepText = `Passo ${idx + 1}: ${instructions[idx]}`;
    if (verbosityLevel === 'minimal') {
      stepText = `Passo ${idx + 1}`;
    }
    speak(stepText, { lang: 'pt-BR', rate: voiceSpeed });
  };

  const handleNextStepVoice = () => {
    const total = instructionsList.length;
    if (total === 0) {
      onNextStep?.();
      return;
    }
    const next = Math.min(currentStepIdx + 1, total - 1);
    setCurrentStepIdx(next);
    onSelectStep?.(next);
    onNextStep?.();
    speakStep(next, instructionsList);
    setVoiceCommandStatus(`Passo ${next + 1} avançado por voz! ⏭️`);
    setTimeout(() => setVoiceCommandStatus(''), 2500);
  };

  const handlePrevStepVoice = () => {
    const total = instructionsList.length;
    if (total === 0) {
      onPrevStep?.();
      return;
    }
    const prev = Math.max(currentStepIdx - 1, 0);
    setCurrentStepIdx(prev);
    onSelectStep?.(prev);
    onPrevStep?.();
    speakStep(prev, instructionsList);
    setVoiceCommandStatus(`Passo ${prev + 1} retornado por voz! ⏮️`);
    setTimeout(() => setVoiceCommandStatus(''), 2500);
  };

  const handleRepeatStepVoice = () => {
    const total = instructionsList.length;
    if (total === 0) {
      onRepeatStep?.();
      return;
    }
    onRepeatStep?.();
    speakStep(currentStepIdx, instructionsList);
    setVoiceCommandStatus(`Repetindo passo ${currentStepIdx + 1}! 🔁`);
    setTimeout(() => setVoiceCommandStatus(''), 2500);
  };

  const processStepVoiceCommand = (transcript: string) => {
    const t = transcript.toLowerCase().trim();
    if (t.includes('próximo') || t.includes('proximo') || t.includes('avançar') || t.includes('avancar') || t.includes('seguinte')) {
      handleNextStepVoice();
    } else if (t.includes('voltar') || t.includes('anterior') || t.includes('atrás') || t.includes('atras')) {
      handlePrevStepVoice();
    } else if (t.includes('repetir') || t.includes('ouvir') || t.includes('falar')) {
      handleRepeatStepVoice();
    } else if (t.includes('parar') || t.includes('silenciar') || t.includes('pausar') || t.includes('mudo')) {
      stopSpeech();
      setVoiceCommandStatus('Áudio pausado.');
      setTimeout(() => setVoiceCommandStatus(''), 2000);
    } else {
      setQuery(transcript);
      handleAsk(transcript);
    }
  };

  // Continuous hands-free speech recognition effect
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      if (isHandsFreeActive) {
        alert("Reconhecimento de voz não suportado pelo navegador.");
        setIsHandsFreeActive(false);
      }
      return;
    }

    let recognition: any = null;

    const startHandsFree = () => {
      try {
        recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = false;
        recognition.lang = 'pt-BR';

        recognition.onstart = () => {
          setIsListening(true);
          setVoiceCommandStatus('Ouvindo comandos (Mãos Sujas)... Diga "próximo", "voltar" ou "repetir".');
        };

        recognition.onresult = (event: any) => {
          const latest = event.results.length - 1;
          const transcript = event.results[latest][0].transcript;
          if (transcript) {
            processStepVoiceCommand(transcript);
          }
        };

        recognition.onerror = (err: any) => {
          console.warn("Speech error:", err);
          if (err.error === 'not-allowed') {
            setIsHandsFreeActive(false);
            setIsListening(false);
            setVoiceCommandStatus('Permissão de microfone negada. Use os botões de simulação abaixo.');
          }
        };

        recognition.onend = () => {
          setIsListening(false);
          if (isHandsFreeActiveRef.current) {
            setTimeout(() => {
              if (isHandsFreeActiveRef.current) {
                try {
                  recognition.start();
                } catch (e) {}
              }
            }, 500);
          }
        };

        recognitionRef.current = recognition;
        recognition.start();
      } catch (e) {
        console.warn("Hands free start failed:", e);
        setIsHandsFreeActive(false);
      }
    };

    isHandsFreeActiveRef.current = isHandsFreeActive;

    if (isHandsFreeActive) {
      startHandsFree();
    } else {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.onend = null;
          recognitionRef.current.stop();
        } catch (e) {}
        recognitionRef.current = null;
      }
      setIsListening(false);
    }

    return () => {
      isHandsFreeActiveRef.current = false;
      if (recognition) {
        try {
          recognition.onend = null;
          recognition.stop();
        } catch (e) {}
      }
    };
  }, [isHandsFreeActive, currentStepIdx, instructionsList]);

  const handleAsk = async (questionText: string) => {
    const q = questionText.trim();
    if (!q) return;
    setLoading(true);
    setQuery(q);

    try {
      const augmentedQuery = verbosityLevel === 'minimal' 
        ? `${q} (Responda de forma extremamente concisa e direta)`
        : verbosityLevel === 'detailed'
        ? `${q} (Forneça instruções detalhadas, dicas científicas e explicações completas)`
        : q;

      const advice = await askCookingAssistant(augmentedQuery, recipeContext, profile || undefined);
      setResult(advice);
      if (advice?.directAnswer) {
        const textToSpeak = verbosityLevel === 'minimal' 
          ? advice.directAnswer 
          : `${advice.directAnswer}. ${advice.answer}`;
        speak(textToSpeak, { lang: 'pt-BR', rate: voiceSpeed });
      }
    } catch (err) {
      console.warn("Erro ao consultar Chef Malu:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleVoiceInput = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Reconhecimento de voz não suportado pelo navegador atual.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'pt-BR';
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      if (transcript) {
        processStepVoiceCommand(transcript);
      }
    };

    recognition.start();
  };

  const playVoiceResponse = () => {
    if (!result) return;
    setIsSpeaking(true);
    let speechText = `${result.directAnswer}. ${result.answer}`;
    if (verbosityLevel === 'minimal') {
      speechText = result.directAnswer;
    }
    speak(speechText, { lang: 'pt-BR', rate: voiceSpeed });
    setTimeout(() => setIsSpeaking(false), 4000);
  };

  return (
    <div id="ai-cooking-advisor-container" className="bg-white dark:bg-zinc-900 rounded-2xl border border-emerald-100 dark:border-zinc-800 shadow-xl overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-5 text-white flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center shadow-inner">
            <ChefHat className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold tracking-tight">Chef Malu IA • Cozinha Orientada</h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-400/20 text-emerald-100 border border-emerald-300/30">
                Modo Mãos Sujas 🤲🎙️
              </span>
            </div>
            <p className="text-xs text-emerald-100/90">
              {recipeContext?.recipeTitle 
                ? `Avance passos por voz em: "${recipeContext.recipeTitle}"` 
                : "Tire dúvidas culinárias e navegue pelos passos da receita sem tocar na tela"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="cooking-advisor-settings-toggle"
            type="button"
            onClick={() => setShowSettings(!showSettings)}
            title="Configurações de Voz e Verbosidade"
            className="p-2 rounded-lg bg-white/15 hover:bg-white/25 text-white transition flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
          >
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">Ajustes</span>
          </button>

          {onClose && (
            <button 
              id="close-cooking-advisor-btn"
              onClick={onClose}
              className="text-white/80 hover:text-white p-2 rounded-lg hover:bg-white/10 transition"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Settings Control Panel */}
      {showSettings && (
        <div className="bg-emerald-50/95 dark:bg-emerald-950/60 border-b border-emerald-200 dark:border-emerald-800/40 p-4 sm:p-5 space-y-4 animate-in fade-in duration-200 shadow-inner">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-2 uppercase tracking-wider">
              <Settings className="w-4 h-4 text-emerald-600 animate-spin-slow" />
              <span>Painel de Controle • Velocidade da Voz & Verbosidade da IA</span>
            </h4>
            <button
              onClick={() => setShowSettings(false)}
              className="text-xs font-bold text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 px-2 py-1 rounded-lg hover:bg-emerald-100/50 transition cursor-pointer"
            >
              ✕ Fechar
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* Voice Speed Control */}
            <div className="bg-white dark:bg-zinc-800 p-4 rounded-xl border border-emerald-200/60 dark:border-zinc-700 space-y-2.5 shadow-sm">
              <label className="font-semibold text-zinc-800 dark:text-zinc-200 flex items-center justify-between">
                <span>Velocidade da Voz (Aoede)</span>
                <span className="font-mono bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-md font-bold">
                  {voiceSpeed}x
                </span>
              </label>
              <div className="flex items-center gap-1.5">
                {[0.75, 1.0, 1.25, 1.5].map((speed) => (
                  <button
                    key={speed}
                    type="button"
                    onClick={() => setVoiceSpeed(speed)}
                    className={`flex-1 py-2 rounded-lg font-bold transition text-xs cursor-pointer ${
                      voiceSpeed === speed
                        ? 'bg-emerald-600 text-white shadow-md'
                        : 'bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-emerald-100 dark:hover:bg-zinc-600'
                    }`}
                  >
                    {speed}x
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-zinc-400">
                Ajuste a velocidade de fala da Chef Malu para acompanhar seu ritmo na cozinha.
              </p>
            </div>

            {/* Verbosity Level Control */}
            <div className="bg-white dark:bg-zinc-800 p-4 rounded-xl border border-emerald-200/60 dark:border-zinc-700 space-y-2.5 shadow-sm">
              <label className="font-semibold text-zinc-800 dark:text-zinc-200 block">
                Nível de Verbosidade do Assistente
              </label>
              <div className="grid grid-cols-1 gap-1.5">
                {[
                  { id: 'minimal', label: '🫙 Apenas Ingredientes & Resumo Rápido' },
                  { id: 'standard', label: '⚖️ Equilibrado (Padrão)' },
                  { id: 'detailed', label: '🔬 Instruções Detalhadas & Ciência Culinária' }
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setVerbosityLevel(item.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg font-medium transition text-xs flex items-center justify-between cursor-pointer ${
                      verbosityLevel === item.id
                        ? 'bg-emerald-600 text-white shadow-md font-semibold'
                        : 'bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-emerald-100 dark:hover:bg-zinc-600'
                    }`}
                  >
                    <span>{item.label}</span>
                    {verbosityLevel === item.id && <span className="font-bold">✓</span>}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-zinc-400">
                Escolha o nível de detalhamento das respostas da IA.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="p-5 space-y-6">
        {/* Hands-Free Voice Recipe Step Navigation Banner (for dirty hands in the kitchen) */}
        <div className="bg-gradient-to-br from-emerald-500/10 via-teal-500/10 to-emerald-600/10 dark:from-emerald-950/40 dark:to-teal-950/30 border-2 border-emerald-500/30 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3.5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md animate-pulse">
                <Hand className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <span>Modo Cozinha com Mãos Sujas 🤲🎙️</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500 text-white uppercase tracking-wider">
                    Voz Ativa
                  </span>
                </h3>
                <p className="text-xs text-zinc-600 dark:text-zinc-300">
                  Fale <strong className="text-emerald-700 dark:text-emerald-400">"Próximo"</strong>, <strong className="text-emerald-700 dark:text-emerald-400">"Voltar"</strong> ou <strong className="text-emerald-700 dark:text-emerald-400">"Repetir"</strong> para avançar os passos sem sujar o celular.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsHandsFreeActive(!isHandsFreeActive)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer ${
                isHandsFreeActive
                  ? 'bg-rose-600 hover:bg-rose-700 text-white animate-pulse'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              {isHandsFreeActive ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              <span>{isHandsFreeActive ? 'Pausar Escuta Contínua' : 'Ativar Mãos Sujas por Voz 🎙️'}</span>
            </button>
          </div>

          {voiceCommandStatus && (
            <div className="p-2.5 bg-emerald-600/10 border border-emerald-500/30 rounded-xl text-xs font-bold text-emerald-800 dark:text-emerald-300 text-center animate-in fade-in duration-200">
              {voiceCommandStatus}
            </div>
          )}

          {instructionsList.length > 0 && (
            <div className="bg-white/80 dark:bg-zinc-800/80 rounded-xl p-4 border border-emerald-500/20 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-zinc-700 dark:text-zinc-300">
                <span className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                  <ChefHat className="w-4 h-4" />
                  Passo {currentStepIdx + 1} de {instructionsList.length}
                </span>
                <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full">
                  {Math.round(((currentStepIdx + 1) / instructionsList.length) * 100)}% concluído
                </span>
              </div>

              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 leading-relaxed font-sans">
                {instructionsList[currentStepIdx]}
              </p>

              {/* Simulation / Manual Backup Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-700">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handlePrevStepVoice}
                    disabled={currentStepIdx === 0}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 hover:bg-emerald-100 dark:hover:bg-zinc-600 disabled:opacity-40 transition flex items-center gap-1 cursor-pointer"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Voltar</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleRepeatStepVoice}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-200 transition flex items-center gap-1 cursor-pointer"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>Ouvir</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleNextStepVoice}
                    disabled={currentStepIdx >= instructionsList.length - 1}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40 transition flex items-center gap-1 cursor-pointer shadow-sm"
                  >
                    <span>Próximo</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <span className="text-[10px] text-zinc-400 italic">
                  💡 Ou diga "Próximo passo" no microfone
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="space-y-2">
          <form 
            onSubmit={(e) => { e.preventDefault(); handleAsk(query); }}
            className="flex items-center gap-2 relative"
          >
            <input
              id="cooking-advisor-query-input"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ex: Quanto tempo devo assar este frango? ou Posso trocar creme de leite por iogurte grego?"
              disabled={loading}
              className="w-full px-4 py-3.5 pr-24 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/80 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
            />
            <div className="absolute right-2 flex items-center gap-1">
              <button
                type="button"
                id="voice-dictation-btn"
                onClick={handleVoiceInput}
                disabled={loading}
                title="Falar com a Chef Malu"
                className={`p-2 rounded-lg text-xs font-medium transition ${
                  isListening 
                    ? 'bg-rose-500 text-white animate-pulse' 
                    : 'text-zinc-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-zinc-700'
                }`}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
              <button
                type="submit"
                id="submit-cooking-advisor-btn"
                disabled={loading || !query.trim()}
                className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white p-2.5 rounded-lg text-xs font-semibold flex items-center justify-center transition shadow-sm"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
          </form>

          {/* Quick Suggestions Chips */}
          <div>
            <p className="text-xs text-zinc-400 font-medium mb-1.5 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" /> {t('frequent_questions_test', 'Perguntas frequentes para testar agora:')}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_QUESTIONS.map((item, i) => (
                <button
                  key={i}
                  id={`quick-cooking-query-${i}`}
                  type="button"
                  onClick={() => handleAsk(item.query)}
                  disabled={loading}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-100 hover:bg-emerald-50 dark:bg-zinc-800 dark:hover:bg-emerald-950/40 text-zinc-700 dark:text-zinc-300 hover:text-emerald-700 dark:hover:text-emerald-300 border border-zinc-200/80 dark:border-zinc-700/60 transition flex items-center gap-1.5 text-left"
                >
                  <span>{item.icon}</span>
                  <span>{t(item.label)}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="p-8 text-center space-y-3 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-xl border border-emerald-100 dark:border-emerald-900/30">
            <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mx-auto" />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Chef Malu analisando técnicas e nutrição...</p>
              <p className="text-xs text-zinc-500">Calculando tempos térmicos, proporções e matriz nutricional.</p>
            </div>
          </div>
        )}

        {/* Advice Results */}
        {result && !loading && (
          <div className="space-y-4 animate-in fade-in duration-300">
            {/* Direct Answer Banner */}
            <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 rounded-xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                        Resposta Direta do Chef
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mt-0.5 leading-relaxed">
                      {result.directAnswer}
                    </p>
                  </div>
                </div>

                <button
                  id="play-malu-voice-btn"
                  onClick={playVoiceResponse}
                  title="Ouvir a voz da Chef Malu (Aoede)"
                  className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-zinc-800 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100/50 transition shadow-sm cursor-pointer"
                >
                  <Volume2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{isSpeaking ? 'Falando...' : 'Ouvir'}</span>
                </button>
              </div>

              {verbosityLevel !== 'minimal' && (
                <div className="mt-3 pt-3 border-t border-emerald-200/60 dark:border-emerald-800/30 text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
                  {result.answer}
                </div>
              )}
            </div>

            {/* Grid of Specialized Cards (Hidden in minimal verbosity mode) */}
            {verbosityLevel !== 'minimal' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Cooking Time & Temp Card (if applicable) */}
                {result.cookingTimeAndTemp && (
                  <div className="bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/70 dark:border-amber-900/40 rounded-xl p-4 space-y-2.5">
                    <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-semibold text-xs">
                      <Flame className="w-4 h-4 text-amber-600" />
                      <span>Controle de Tempo e Temperatura</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {result.cookingTimeAndTemp.temperature && (
                        <div className="bg-white/80 dark:bg-zinc-800/80 p-2.5 rounded-lg border border-amber-200/40 dark:border-amber-900/30">
                          <span className="text-zinc-400 block text-[10px]">Temperatura do Forno/Panela</span>
                          <span className="font-bold text-amber-900 dark:text-amber-200">
                            {result.cookingTimeAndTemp.temperature}
                          </span>
                        </div>
                      )}
                      {result.cookingTimeAndTemp.time && (
                        <div className="bg-white/80 dark:bg-zinc-800/80 p-2.5 rounded-lg border border-amber-200/40 dark:border-amber-900/30">
                          <span className="text-zinc-400 block text-[10px]">Tempo Estimado</span>
                          <span className="font-bold text-amber-900 dark:text-amber-200">
                            {result.cookingTimeAndTemp.time}
                          </span>
                        </div>
                      )}
                    </div>

                    {result.cookingTimeAndTemp.internalTemp && (
                      <div className="flex items-center gap-2 text-xs bg-white/90 dark:bg-zinc-800/90 p-2 rounded-lg text-zinc-700 dark:text-zinc-300 border border-amber-200/40">
                        <Thermometer className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span><strong>Ponto seguro interno:</strong> {result.cookingTimeAndTemp.internalTemp}</span>
                      </div>
                    )}

                    {result.cookingTimeAndTemp.technique && (
                      <p className="text-xs text-amber-900/90 dark:text-amber-200/90 italic">
                        💡 {result.cookingTimeAndTemp.technique}
                      </p>
                    )}
                  </div>
                )}

                {/* Substitution Advice Card (if applicable) */}
                {result.substitutionAdvice && (
                  <div className="bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-200/70 dark:border-indigo-900/40 rounded-xl p-4 space-y-2.5">
                    <div className="flex items-center gap-2 text-indigo-800 dark:text-indigo-300 font-semibold text-xs">
                      <ArrowRightLeft className="w-4 h-4 text-indigo-600" />
                      <span>Substituição Funcional de Ingredientes</span>
                    </div>

                    <div className="bg-white/80 dark:bg-zinc-800/80 p-2.5 rounded-lg border border-indigo-200/40 dark:border-indigo-900/30 text-xs flex items-center justify-between">
                      <div>
                        <span className="text-zinc-400 text-[10px] block">De (Original)</span>
                        <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                          {result.substitutionAdvice.originalItem || 'Receita original'}
                        </span>
                      </div>
                      <span className="text-indigo-500 font-bold px-2">➔</span>
                      <div>
                        <span className="text-zinc-400 text-[10px] block">Para (Substituto)</span>
                        <span className="font-semibold text-indigo-700 dark:text-indigo-300">
                          {result.substitutionAdvice.substituteItem || 'Ingrediente proposto'}
                        </span>
                      </div>
                    </div>

                    {result.substitutionAdvice.ratio && (
                      <div className="text-xs text-zinc-700 dark:text-zinc-300">
                        <strong>Proporção recomendada:</strong> {result.substitutionAdvice.ratio}
                      </div>
                    )}

                    {result.substitutionAdvice.culinaryImpact && (
                      <p className="text-xs text-zinc-600 dark:text-zinc-300">
                        <strong>Textura & Sabor:</strong> {result.substitutionAdvice.culinaryImpact}
                      </p>
                    )}

                    {result.substitutionAdvice.precaution && (
                      <div className="bg-rose-50 dark:bg-rose-950/30 p-2 rounded-lg text-xs text-rose-800 dark:text-rose-300 border border-rose-200/50 flex items-start gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                        <span>{result.substitutionAdvice.precaution}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Nutritional Comparison Card */}
            {result.nutritionalComparison && verbosityLevel !== 'minimal' && (
              <div className="bg-teal-50/60 dark:bg-teal-950/20 border border-teal-200/70 dark:border-teal-900/40 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-teal-800 dark:text-teal-300 font-semibold text-xs">
                  <HeartPulse className="w-4 h-4 text-teal-600" />
                  <span>Conselho e Impacto Nutricional</span>
                </div>

                <p className="text-xs text-zinc-700 dark:text-zinc-300 font-medium">
                  {result.nutritionalComparison.summary}
                </p>

                {(result.nutritionalComparison.caloriesImpact || result.nutritionalComparison.proteinImpact || result.nutritionalComparison.fatImpact) && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {result.nutritionalComparison.caloriesImpact && (
                      <div className="bg-white/80 dark:bg-zinc-800/80 p-2 rounded-lg border border-teal-200/40 text-xs">
                        <span className="text-zinc-400 block text-[10px]">Calorias</span>
                        <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                          {result.nutritionalComparison.caloriesImpact}
                        </span>
                      </div>
                    )}
                    {result.nutritionalComparison.proteinImpact && (
                      <div className="bg-white/80 dark:bg-zinc-800/80 p-2 rounded-lg border border-teal-200/40 text-xs">
                        <span className="text-zinc-400 block text-[10px]">Proteínas</span>
                        <span className="font-semibold text-blue-700 dark:text-blue-400">
                          {result.nutritionalComparison.proteinImpact}
                        </span>
                      </div>
                    )}
                    {result.nutritionalComparison.fatImpact && (
                      <div className="bg-white/80 dark:bg-zinc-800/80 p-2 rounded-lg border border-teal-200/40 text-xs">
                        <span className="text-zinc-400 block text-[10px]">Gorduras Saturadas</span>
                        <span className="font-semibold text-amber-700 dark:text-amber-400">
                          {result.nutritionalComparison.fatImpact}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {result.nutritionalComparison.healthBenefits && result.nutritionalComparison.healthBenefits.length > 0 && (
                  <ul className="space-y-1 text-xs text-zinc-600 dark:text-zinc-300">
                    {result.nutritionalComparison.healthBenefits.map((b, i) => (
                      <li key={i} className="flex items-center gap-1.5">
                        <span className="text-emerald-500 font-bold">✓</span>
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* Culinary Tips list */}
            {result.culinaryTips && result.culinaryTips.length > 0 && verbosityLevel !== 'minimal' && (
              <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-4 border border-zinc-200 dark:border-zinc-700/60 space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                  <Lightbulb className="w-4 h-4 text-amber-500" />
                  <span>Dicas Culinárias do Chef</span>
                </div>
                <div className="space-y-1.5">
                  {result.culinaryTips.map((tip, i) => (
                    <div key={i} className="text-xs text-zinc-600 dark:text-zinc-300 flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                      <span>{tip}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Follow-up question chips */}
            {result.suggestedFollowUps && result.suggestedFollowUps.length > 0 && (
              <div className="space-y-1.5 pt-2">
                <span className="text-xs text-zinc-400 font-medium">Continue perguntando à Chef Malu:</span>
                <div className="flex flex-wrap gap-1.5">
                  {result.suggestedFollowUps.map((fu, idx) => (
                    <button
                      key={idx}
                      id={`followup-chip-${idx}`}
                      type="button"
                      onClick={() => handleAsk(fu)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40 transition text-left cursor-pointer"
                    >
                      💬 {fu}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
