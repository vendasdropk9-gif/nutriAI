import { playAudioUrl } from '../lib/speech';
import React, { useState, useEffect, useRef } from 'react';
import { Utensils, Search, Loader2, Sparkles, Volume2, Play, AlertCircle, CheckCircle2, ArrowRight, Info, Mic, MicOff, RefreshCw, Trash2 } from 'lucide-react';
import { UserProfile, DiningOutAnalysis } from '../types';
import { analyzeDiningOut, textToSpeech } from '../lib/gemini';

interface DiningOutProps {
  profile: UserProfile | null;
  onAwardPoints?: (amount: number, reason: string) => void;
}

export function DiningOut({ profile, onAwardPoints }: DiningOutProps) {
  const [description, setDescription] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<DiningOutAnalysis | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  // Voice Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      setIsSupported(false);
      return;
    }

    try {
      const rec = new SpeechRecognitionAPI();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'pt-BR';

      rec.onstart = () => {
        setIsRecording(true);
        setRecordingError(null);
      };

      rec.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        const currentText = finalTranscript || interimTranscript;
        if (currentText.trim()) {
          setDescription(currentText);
        }
      };

      rec.onerror = (event: any) => {
        console.error('Speech recognition error', event);
        if (event.error === 'not-allowed') {
          setRecordingError('Permissão do microfone negada. Dê acesso no navegador (tente abrir em nova aba).');
        } else if (event.error === 'no-speech') {
          // Ignore silence errors to keep the UX clean
        } else {
          setRecordingError('Não foi possível reconhecer o áudio. Tente novamente.');
        }
        setIsRecording(false);
      };

      rec.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = rec;
    } catch (err) {
      console.error('Failed to initialize speech recognition:', err);
      setIsSupported(false);
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const toggleRecording = async (e: React.MouseEvent | React.TouchEvent | React.KeyboardEvent) => {
    e.preventDefault();
    if (!recognitionRef.current) return;
    
    if (isRecording) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        console.error('Failed to stop recognition:', err);
      }
      return;
    }

    // Start recording
    setDescription('');
    setRecordingError(null);
    try {
      // Em iframes (AI Studio), precisamos pedir a mídia antes para forçar o prompt do microfone
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Podemos fechar a stream já que só precisamos engatilhar a permissão
      stream.getTracks().forEach(track => track.stop());
      
      recognitionRef.current.start();
    } catch (err: any) {
      console.error('Failed to start recognition or get media devices:', err);
      if (err.name === 'NotAllowedError' || err.name === 'SecurityError') {
        setRecordingError('Permissão do microfone negada. Dê acesso no navegador (pode ser necessário abrir em nova aba).');
      }
    }
  };

  const handleAnalyze = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!description.trim()) return;

    setIsAnalyzing(true);
    setAnalysis(null);
    setAudioUrl(null);

    try {
      const result = await analyzeDiningOut(description, profile);
      setAnalysis(result);
      if (onAwardPoints) onAwardPoints(40, 'Consulta de prato de restaurante');
    } catch (error) {
      console.error(error);
    } finally {
      setIsAnalyzing(false);
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

  const getVerdictStyles = (verdict: string) => {
    switch (verdict) {
      case 'Escolha Inteligente': return 'bg-emerald-500 text-white';
      case 'Moderado': return 'bg-amber-500 text-white';
      case 'Excesso': return 'bg-rose-500 text-white';
      default: return 'bg-slate-500 text-white';
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 px-2 sm:px-4">
      <div className="text-center space-y-4">
        <h2 className="font-serif text-3xl md:text-5xl font-medium tracking-tight text-emerald-700 dark:text-emerald-400">
          Modo Comi Fora
        </h2>
        <p className="font-sans text-slate-500 dark:text-slate-400 max-w-xl mx-auto text-base md:text-lg leading-relaxed">
          Sem culpa! Toque e pergunte sobre o prato ou cardápio usando áudio, e eu te ajudo a fazer a escolha mais inteligente.
        </p>
      </div>

      <div className="clay-card p-6 sm:p-8 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
        <form onSubmit={handleAnalyze} className="space-y-6 flex flex-col items-center">
          
          {/* Welcome guide */}
          <div className="text-center mb-2">
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md">
              {isRecording ? "Transcrevendo em tempo real... Toque para parar." : "Toque no botão abaixo para falar o que tem no seu cardápio de hoje."}
            </p>
          </div>

          {/* Large Audio Recording Node */}
          <div className="flex flex-col items-center justify-center py-4 w-full relative">
            
            {/* Ambient Background Glow Loops */}
            {isRecording && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-48 h-48 sm:w-56 sm:h-56 bg-emerald-500/10 dark:bg-emerald-400/5 rounded-full animate-ping absolute duration-1000"></div>
                <div className="w-36 h-36 sm:w-44 sm:h-44 bg-emerald-500/15 dark:bg-emerald-400/10 rounded-full animate-pulse absolute"></div>
              </div>
            )}

            {/* Microfone Trigger Button */}
            <button
              type="button"
              onClick={toggleRecording}
              className={`w-24 h-24 sm:w-28 sm:h-28 rounded-full flex flex-col items-center justify-center relative cursor-pointer select-none transition-all duration-300 ${
                isRecording 
                  ? 'bg-red-500 text-white scale-110 shadow-xl shadow-red-500/30' 
                  : 'bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 hover:scale-105 shadow-md shadow-emerald-500/10'
              }`}
              title="Toque para falar"
            >
              <Mic className={`w-10 h-10 sm:w-12 sm:h-12 ${isRecording ? 'animate-bounce' : ''}`} />
              
              {/* Tap Indicator label inside or below the node */}
              <span className="text-[10px] sm:text-xs font-medium uppercase mt-2 select-none">
                {isRecording ? 'Parar' : 'Falar'}
              </span>
            </button>

            {/* Error notifications */}
            {recordingError && (
              <div className="mt-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-100/35 dark:border-red-900/30 text-red-600 dark:text-red-400 text-xs flex items-center gap-2 max-w-sm text-center">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{recordingError}</span>
              </div>
            )}

            {/* Falling back message */}
            {!isSupported && (
              <div className="mt-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-100/30 dark:border-amber-900/20 text-amber-600 dark:text-amber-400 text-xs flex items-center gap-2 max-w-sm text-center">
                <Info className="w-4 h-4 shrink-0" />
                <span>Reconhecimento de voz não suportado pelo navegador. Digite abaixo.</span>
              </div>
            )}
          </div>

          {/* Live transcript textarea, behaving as typing */}
          <div className="relative w-full max-w-2xl mt-4">
            <div className="absolute left-6 top-5 text-slate-400">
               <Utensils className="w-5 h-5" />
            </div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Sua fala transcrita aparecerá aqui..."
              rows={3}
              className="w-full pl-14 pr-12 py-5 bg-slate-50/70 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/50 rounded-3xl outline-none focus:ring-2 focus:ring-emerald-500/30 font-sans text-base sm:text-lg text-slate-700 dark:text-slate-200 resize-none shadow-inner"
            />
            {description.trim() && (
              <button
                type="button"
                onClick={() => setDescription('')}
                className="absolute right-4 bottom-4 p-2 text-slate-400 hover:text-red-500 transition-colors"
                title="Limpar transcrição"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
          </div>

          <button
            type="submit"
            disabled={isAnalyzing || !description.trim()}
            className="w-full max-w-lg py-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-full font-bold text-base sm:text-lg shadow-xl shadow-emerald-500/20 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {isAnalyzing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
            Analisar Opção do Restaurante
          </button>
        </form>
      </div>

      {analysis && (
        <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 space-y-8">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="md:col-span-1 clay-card p-6 flex flex-col items-center justify-center text-center space-y-4">
               <div className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${getVerdictStyles(analysis.verdict)}`}>
                  {analysis.verdict}
               </div>
               <div className="space-y-1">
                 <p className="text-4xl font-serif font-bold text-slate-800 dark:text-slate-100">~{analysis.estimatedCalories}</p>
                 <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Calorias Estimadas</p>
               </div>
               <div className="w-full grid grid-cols-3 gap-2 pt-4 border-t border-slate-100 dark:border-slate-700">
                  <div className="text-center">
                    <p className="text-[10px] text-slate-400 uppercase">Prot</p>
                    <p className="text-sm font-bold">{analysis.macros.protein}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-slate-400 uppercase">Carb</p>
                    <p className="text-sm font-bold">{analysis.macros.carbs}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-slate-400 uppercase">Gord</p>
                    <p className="text-sm font-bold">{analysis.macros.fats}</p>
                  </div>
               </div>
            </div>

            <div className="md:col-span-2 clay-card p-6 flex flex-col justify-center space-y-6">
                <div className="flex items-start gap-4">
                    <button
                        onClick={() => playTTS(analysis.assistantMessage)}
                        className={`w-12 h-12 rounded-full shrink-0 flex items-center justify-center text-white bg-emerald-500 transition-all ${isPlaying ? 'animate-pulse ring-4 ring-emerald-500/30' : 'hover:scale-105 shadow-md shadow-emerald-500/20'}`}
                    >
                        {isPlaying ? <Volume2 className="w-5 h-5" /> : <Play className="w-5 h-5 ml-1" />}
                    </button>
                    <div>
                        <h4 className="font-serif text-xl text-emerald-800 dark:text-emerald-400 font-medium mb-1">Dica de quem entende:</h4>
                        <p className="font-sans text-slate-700 dark:text-slate-300 text-lg italic">
                            "{analysis.assistantMessage}"
                        </p>
                    </div>
                </div>

                {analysis.betterAlternative && (
                  <div className="bg-emerald-50/50 dark:bg-emerald-900/10 p-5 rounded-2xl border border-emerald-100 dark:border-emerald-800/30 flex items-center gap-4">
                     <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 shrink-0">
                        <CheckCircle2 className="w-6 h-6" />
                     </div>
                     <div>
                        <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase">Troca Inteligente:</p>
                        <p className="text-slate-700 dark:text-slate-200 font-medium">{analysis.betterAlternative}</p>
                     </div>
                  </div>
                )}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="clay-card p-6 space-y-6">
                <div className="flex items-center gap-3 text-slate-400">
                    <Info className="w-5 h-5" />
                    <h4 className="text-xs font-bold uppercase tracking-widest">3 Dicas para este prato:</h4>
                </div>
                <div className="space-y-4">
                    {analysis.tips.map((tip, i) => (
                        <div key={i} className="flex items-start gap-3">
                            <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 shrink-0 mt-0.5">
                                <span className="text-xs font-bold">{i+1}</span>
                            </div>
                            <p className="text-slate-700 dark:text-slate-300 font-sans leading-relaxed">{tip}</p>
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-slate-900 text-white p-8 rounded-[32px] clay-card shadow-xl flex flex-col justify-center space-y-4">
                <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
                    <AlertCircle className="w-6 h-6 text-amber-400" />
                </div>
                <h4 className="font-serif text-2xl font-medium">Lembre-se:</h4>
                <p className="text-slate-400 leading-relaxed font-sans">
                    Refeições fora de casa tendem a ter mais sódio e gorduras ocultas. Use a IA para estimar, mas priorize sempre vegetais e proteínas grelhadas quando possível.
                </p>
                <div className="pt-4 flex items-center gap-2 text-emerald-400 font-bold text-sm">
                   Vamos continuar no foco?
                   <ArrowRight className="w-4 h-4" />
                </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

