import { playAudioUrl } from '../lib/speech';
import React, { useState } from 'react';
import { Calendar, TrendingUp, Sparkles, Volume2, Play, ArrowRight, Target, Clock, ShieldCheck, Loader2 } from 'lucide-react';
import { UserProfile, GoalPrediction } from '../types';
import { generateGoalPrediction, textToSpeech } from '../lib/gemini';
import { Skeleton } from './Skeleton';

interface ResultPredictionProps {
  profile: UserProfile | null;
  onUpdatePrediction: (prediction: GoalPrediction) => void;
}

export function ResultPrediction({ profile, onUpdatePrediction }: ResultPredictionProps) {
  const [isCalculating, setIsCalculating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const prediction = profile?.prediction;

  const handleCalculate = async () => {
    if (!profile) return;
    
    setIsCalculating(true);
    setAudioUrl(null);

    try {
      const result = await generateGoalPrediction(profile);
      if (result) {
        onUpdatePrediction(result);
      }
    } catch (error) {
      console.warn(error);
    } finally {
      setIsCalculating(false);
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
      console.warn(error);
      setIsPlaying(false);
    }
  };

  if (!profile) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      <div className="text-center space-y-4">
        <h2 className="font-serif text-4xl md:text-5xl font-medium tracking-tight text-emerald-700 dark:text-emerald-400">
          Previsão de Resultados
        </h2>
        <p className="font-sans text-slate-500 dark:text-slate-400 max-w-xl mx-auto text-lg leading-relaxed">
          Baseado no seu perfil e hábitos, nossa IA calcula quando você deve atingir seu objetivo principal.
        </p>
      </div>

      {isCalculating && !prediction ? (
        <Skeleton type="card" />
      ) : !prediction ? (
        <div className="clay-card p-8 text-center space-y-8">
            <div className="w-24 h-24 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto text-emerald-600">
               <TrendingUp className="w-12 h-12" />
            </div>
            <div className="space-y-4">
               <h3 className="font-serif text-3xl font-medium text-slate-800 dark:text-slate-100">Pronta para ver o futuro?</h3>
               <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                 Vou analisar seus dados e te dar uma data estimada para sua transformação.
               </p>
            </div>
            <button
               onClick={handleCalculate}
               disabled={isCalculating}
               className="px-12 py-5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-2xl font-bold text-lg shadow-xl shadow-emerald-500/20 transition-all flex items-center justify-center gap-3 mx-auto disabled:opacity-50"
            >
               <Sparkles className="w-6 h-6" />
               Gerar Previsão Inteligente
            </button>
        </div>
      ) : (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="grid md:grid-cols-2 gap-8">
             {/* Big Date Card */}
             <div className="bg-slate-900 text-white p-10 rounded-[40px] clay-card shadow-2xl relative overflow-hidden flex flex-col justify-between min-h-[350px]">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                   <Calendar className="w-48 h-48" />
                </div>
                
                <div className="space-y-2 relative z-10">
                   <p className="text-emerald-400 font-bold uppercase tracking-widest text-sm">Data Estimada</p>
                   <h3 className="font-serif text-5xl font-bold">
                      {new Date(prediction.estimatedDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                   </h3>
                </div>

                <div className="space-y-6 relative z-10">
                   <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center">
                         <Clock className="w-6 h-6 text-emerald-400" />
                      </div>
                      <div>
                         <p className="text-2xl font-bold">Em {prediction.estimatedDays} dias</p>
                         <p className="text-xs text-slate-400 font-bold uppercase">Contagem Regressiva</p>
                      </div>
                   </div>

                   <button
                      onClick={handleCalculate}
                      disabled={isCalculating}
                      className="flex items-center gap-2 text-emerald-400 text-sm font-bold hover:text-emerald-300 transition-colors"
                   >
                      {isCalculating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Recalcular Previsão'}
                      <ArrowRight className="w-4 h-4" />
                   </button>
                </div>
             </div>

             {/* Motivation & Confidence Card */}
             <div className="space-y-8">
                <div className="clay-card p-6 shadow-sm relative overflow-hidden">
                    <button
                        onClick={() => playTTS(prediction.motivationalMessage)}
                        className={`w-14 h-14 rounded-full flex items-center justify-center text-white bg-emerald-500 transition-all mb-6 ${isPlaying ? 'animate-pulse ring-4 ring-emerald-500/30' : 'hover:scale-105 shadow-md shadow-emerald-500/20'}`}
                    >
                        {isPlaying ? <Volume2 className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
                    </button>
                    <div className="space-y-2">
                        <h4 className="font-serif text-2xl text-emerald-800 dark:text-emerald-400 font-medium italic italic">Mensagem da Nutri IA:</h4>
                        <p className="font-sans text-slate-700 dark:text-slate-300 text-xl leading-relaxed italic">
                            "{prediction.motivationalMessage}"
                        </p>
                    </div>
                </div>

                <div className="clay-card p-6 flex items-center gap-6">
                    <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
                       <ShieldCheck className="w-8 h-8 text-emerald-600" />
                    </div>
                    <div className="space-y-2 flex-1">
                        <div className="flex justify-between items-center">
                           <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Confiança no Resultado</p>
                           <span className="text-emerald-500 font-bold">{(prediction.confidenceScore * 100).toFixed(0)}%</span>
                        </div>
                        <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                           <div 
                             className="h-full bg-emerald-500 transition-all duration-1000"
                             style={{ width: `${prediction.confidenceScore * 100}%` }}
                           />
                        </div>
                    </div>
                </div>
             </div>
          </div>

          {/* Goal Visualizer */}
          <div className="clay-card p-6 shadow-xl space-y-10">
              <div className="flex items-center gap-3">
                 <Target className="w-6 h-6 text-emerald-500" />
                 <h3 className="font-serif text-2xl font-medium text-slate-800 dark:text-slate-100">Trajeto Final</h3>
              </div>

              <div className="space-y-6">
                {/* Labels of Today and Goal placed above and offset */}
                <div className="flex justify-between items-end border-b border-slate-100 dark:border-slate-800/60 pb-3 font-sans">
                   <div>
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1 font-sans">Hoje</p>
                      <p className="text-3xl font-serif font-extrabold text-emerald-600 dark:text-emerald-400">{profile.weight} <span className="text-sm font-sans font-medium text-slate-500 dark:text-slate-400 font-sans">kg</span></p>
                   </div>
                   <div className="text-right">
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1 font-sans">Objetivo</p>
                      <p className="text-3xl font-serif font-extrabold text-purple-600 dark:text-purple-400">{profile.targetWeight} <span className="text-sm font-sans font-medium text-slate-500 dark:text-slate-400 font-sans">kg</span></p>
                   </div>
                </div>

                {/* Progress Visual Track container */}
                <div className="relative pt-8 pb-4 px-2">
                  {/* Track line connector background */}
                  <div className="absolute top-[44px] left-0 right-0 h-3 bg-slate-100 dark:bg-slate-800/80 rounded-full border border-slate-200/40 dark:border-slate-700/40 shadow-inner overflow-hidden">
                     {/* Safe progress fill indicator */}
                     <div 
                       className="h-full bg-gradient-to-r from-emerald-500 via-teal-500 to-purple-500 rounded-full"
                       style={{ width: `${Math.min(Math.max((Math.abs(profile.weight - profile.targetWeight) / 10) * 10, 10), 90)}%` }}
                     />
                  </div>

                  {/* Left node (Start point circle) */}
                  <div className="absolute left-0 top-[40px] w-5 h-5 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20 shadow-md flex items-center justify-center z-10">
                     <div className="w-1.5 h-1.5 rounded-full bg-white" />
                  </div>

                  {/* Right node (End point circle) */}
                  <div className="absolute right-0 top-[40px] w-5 h-5 rounded-full bg-purple-500 ring-4 ring-purple-500/20 shadow-md flex items-center justify-center z-10">
                     <div className="w-1.5 h-1.5 rounded-full bg-white" />
                  </div>

                  {/* Moving Pin Indicator sliding without any text collisions */}
                  <div 
                    className="absolute top-0 transition-all duration-1000 ease-out z-20"
                    style={{ left: `calc(${Math.min(Math.max((Math.abs(profile.weight - profile.targetWeight) / 10) * 10, 10), 90)}% - 20px)` }}
                  >
                     <div className="flex flex-col items-center">
                        <div className="bg-emerald-500 dark:bg-emerald-600 text-[10px] font-bold text-white px-2 py-0.5 rounded-md shadow-md animate-bounce mb-1 tracking-wider whitespace-nowrap font-sans">
                           Rumo ao foco!
                        </div>
                        <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center shadow-lg border-2 border-white ring-4 ring-emerald-500/10 text-white">
                           <Sparkles className="w-4 h-4" />
                        </div>
                     </div>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-amber-50 dark:bg-amber-900/10 rounded-2xl border border-amber-100 dark:border-amber-800/30 flex items-start gap-4">
                 <Info className="w-6 h-6 text-amber-500 shrink-0 mt-0.5" />
                 <p className="text-sm text-amber-800 dark:text-amber-200 leading-relaxed font-sans">
                    <strong>Importante:</strong> Esta previsão é baseada em modelos matemáticos de perda/ganho de peso saudável. Resultados reais podem variar dependendo da sua consistência e metabolismo. Mantenha seus registros atualizados para maior precisão!
                 </p>
              </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Info({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
    );
}
