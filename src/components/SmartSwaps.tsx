import { playAudioUrl } from '../lib/speech';
import React, { useState } from 'react';
import { RefreshCw, ArrowRight, CheckCircle2, AlertCircle, Sparkles, Volume2, Play, Search, Lightbulb } from 'lucide-react';
import { UserProfile, SmartSwap } from '../types';
import { generateSmartSwap, textToSpeech } from '../lib/gemini';

interface SmartSwapsProps {
  profile: UserProfile | null;
  onAwardPoints?: (amount: number, reason: string) => void;
}

export function SmartSwaps({ profile, onAwardPoints }: SmartSwapsProps) {
  const [foodItem, setFoodItem] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [swap, setSwap] = useState<SmartSwap | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!foodItem.trim()) return;

    setIsGenerating(true);
    setSwap(null);
    setAudioUrl(null);

    try {
      const result = await generateSmartSwap(foodItem, profile);
      setSwap(result);
      if (onAwardPoints) onAwardPoints(30, `Troca inteligente para: ${foodItem}`);
    } catch (error) {
      console.error(error);
    } finally {
      setIsGenerating(false);
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

  return (
    <div className="max-w-4xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      <div className="text-center space-y-4">
        <h2 className="font-serif text-4xl md:text-5xl font-medium tracking-tight text-emerald-700 dark:text-emerald-400">
          Trocas Inteligentes
        </h2>
        <p className="font-sans text-slate-500 dark:text-slate-400 max-w-xl mx-auto text-lg leading-relaxed">
          Quer uma mudança simples que já melhora sua dieta? Digite um alimento e eu te dou uma alternativa deliciosa e saudável.
        </p>
      </div>

      <div className="clay-card p-8">
        <form onSubmit={handleGenerate} className="space-y-6">
          <div className="relative">
            <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400">
              <Search className="w-6 h-6" />
            </div>
            <input
              type="text"
              value={foodItem}
              onChange={(e) => setFoodItem(e.target.value)}
              placeholder="Ex: Chocolate, Refrigerante, Pão Branco..."
              className="w-full pl-16 pr-6 py-6 bg-white/60 dark:bg-slate-800/60 border border-white/40 dark:border-slate-600/50 rounded-3xl outline-none focus:ring-2 focus:ring-emerald-500/30 font-serif text-xl md:text-2xl text-slate-700 dark:text-slate-200"
            />
          </div>

          <button
            type="submit"
            disabled={isGenerating || !foodItem.trim()}
            className="w-full py-5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-2xl font-bold text-lg shadow-xl shadow-emerald-500/20 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {isGenerating ? <RefreshCw className="w-6 h-6 animate-spin" /> : <Lightbulb className="w-6 h-6" />}
            Descobrir Substituição
          </button>
        </form>
      </div>

      {swap && (
        <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 space-y-8">
          <div className="grid md:grid-cols-2 gap-8 items-center clay-card p-6 shadow-xl">
            <div className="flex flex-col items-center justify-center space-y-4 p-8 bg-rose-50/50 dark:bg-rose-900/10 rounded-3xl border border-rose-100/50 dark:border-rose-800/30">
               <AlertCircle className="w-10 h-10 text-rose-500 opacity-60" />
               <p className="text-sm font-bold text-rose-400 uppercase tracking-widest">Original</p>
               <h3 className="text-3xl font-serif font-bold text-rose-700 dark:text-rose-400 text-center">{swap.original}</h3>
            </div>

            <div className="hidden md:flex justify-center">
               <div className="w-16 h-16 bg-white dark:bg-slate-700 rounded-full flex items-center justify-center shadow-lg">
                  <ArrowRight className="w-8 h-8 text-emerald-500" />
               </div>
            </div>

            <div className="flex flex-col items-center justify-center space-y-4 p-8 bg-emerald-50/50 dark:bg-emerald-900/10 rounded-3xl border border-emerald-100/50 dark:border-emerald-800/30">
               <CheckCircle2 className="w-10 h-10 text-emerald-500" />
               <p className="text-sm font-bold text-emerald-400 uppercase tracking-widest">Troca Saudável</p>
               <h3 className="text-3xl font-serif font-bold text-emerald-700 dark:text-emerald-300 text-center">{swap.substitute}</h3>
            </div>
          </div>

          <div className="flex items-start gap-6 clay-card p-6 shadow-sm relative overflow-hidden">
             {/* Decorative element */}
             <div className="absolute top-0 right-0 p-4 opacity-5">
                <Sparkles className="w-24 h-24" />
             </div>

             <button
                onClick={() => playTTS(swap.assistantMessage)}
                className={`w-14 h-14 rounded-full shrink-0 flex items-center justify-center text-white bg-emerald-500 transition-all ${isPlaying ? 'animate-pulse ring-4 ring-emerald-500/30' : 'hover:scale-105 shadow-md shadow-emerald-500/20'}`}
              >
                {isPlaying ? <Volume2 className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
              </button>
              <div className="space-y-2">
                <h4 className="font-serif text-2xl text-emerald-800 dark:text-emerald-400 font-medium italic">Minha sugestão:</h4>
                <p className="font-sans text-slate-700 dark:text-slate-300 text-xl leading-relaxed italic">
                  "{swap.assistantMessage}"
                </p>
              </div>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="clay-card p-6 space-y-4">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Por que trocar?</h4>
              <p className="text-lg text-slate-700 dark:text-slate-200 font-sans leading-relaxed">{swap.reason}</p>
            </div>
            
            <div className="clay-card p-6 space-y-4">
              <h4 className="text-xs font-bold text-emerald-500 uppercase tracking-widest">Principais Benefícios:</h4>
              <ul className="space-y-3">
                {swap.benefits.map((benefit, i) => (
                  <li key={i} className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                    <span className="font-medium">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
