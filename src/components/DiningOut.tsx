import { playAudioUrl } from '../lib/speech';
import React, { useState } from 'react';
import { Utensils, Search, Loader2, Sparkles, Volume2, Play, AlertCircle, CheckCircle2, ArrowRight, Info } from 'lucide-react';
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
    <div className="max-w-4xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      <div className="text-center space-y-4">
        <h2 className="font-serif text-4xl md:text-5xl font-medium tracking-tight text-emerald-700 dark:text-emerald-400">
          Modo Comi Fora
        </h2>
        <p className="font-sans text-slate-500 dark:text-slate-400 max-w-xl mx-auto text-lg leading-relaxed">
          Sem culpa! Descreva o prato ou as opções do cardápio e eu te ajudo a fazer a escolha mais inteligente.
        </p>
      </div>

      <div className="clay-card p-8">
        <form onSubmit={handleAnalyze} className="space-y-6">
          <div className="relative">
            <div className="absolute left-6 top-8 text-slate-400">
               <Utensils className="w-6 h-6" />
            </div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="O que tem no restaurante hoje? Ex: 'Filé de peixe com purê e legumes' ou 'Hambúrguer com bacon e batata frita'..."
              rows={4}
              className="w-full pl-16 pr-6 py-6 bg-white/60 dark:bg-slate-800/60 border border-white/40 dark:border-slate-600/50 rounded-3xl outline-none focus:ring-2 focus:ring-emerald-500/30 font-sans text-lg text-slate-700 dark:text-slate-200 resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={isAnalyzing || !description.trim()}
            className="w-full py-5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-2xl font-bold text-lg shadow-xl shadow-emerald-500/20 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {isAnalyzing ? <Loader2 className="w-6 h-6 animate-spin" /> : <Sparkles className="w-6 h-6" />}
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
                     <div className="w-10 h-10 clay-primary px-6 py-3 flex items-center justify-center shrink-0">
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
