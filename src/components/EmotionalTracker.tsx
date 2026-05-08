import { playAudioUrl } from '../lib/speech';
import React, { useState, useEffect } from 'react';
import { Brain, Smile, Frown, Meh, Zap, Moon, AlertCircle, Sparkles, Volume2, Play, ChevronRight, History } from 'lucide-react';
import { EmotionalLog, UserProfile } from '../types';
import { analyzeEmotionalPatterns, textToSpeech } from '../lib/gemini';

interface EmotionalTrackerProps {
  profile: UserProfile | null;
  onUpdateLogs: (newLogs: EmotionalLog[]) => void;
}

export function EmotionalTracker({ profile, onUpdateLogs }: EmotionalTrackerProps) {
  const [mood, setMood] = useState<string | null>(null);
  const [trigger, setTrigger] = useState('');
  const [analysis, setAnalysis] = useState<any | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const logs = profile?.emotionalLogs || [];

  const handleLogMood = (selectedMood: string) => {
    const newLog: EmotionalLog = {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      mood: selectedMood,
      trigger: trigger.trim() || undefined,
    };
    
    const updatedLogs = [...logs, newLog];
    onUpdateLogs(updatedLogs);
    setMood(null);
    setTrigger('');
  };

  const handleAnalyze = async () => {
    if (logs.length < 2) {
      alert("Registre pelo menos 2 momentos para eu identificar padrões.");
      return;
    }
    
    setIsAnalyzing(true);
    setAnalysis(null);
    setAudioUrl(null);

    try {
      const result = await analyzeEmotionalPatterns(logs, profile);
      setAnalysis(result);
    } catch (e) {
      console.error(e);
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

  const moodIcons: Record<string, any> = {
    'ansioso': { icon: <Zap className="w-6 h-6" />, color: 'bg-amber-100 text-amber-600 border-amber-200' },
    'triste': { icon: <Frown className="w-6 h-6" />, color: 'bg-blue-100 text-blue-600 border-blue-200' },
    'feliz': { icon: <Smile className="w-6 h-6" />, color: 'bg-emerald-100 text-emerald-600 border-emerald-200' },
    'estressado': { icon: <AlertCircle className="w-6 h-6" />, color: 'bg-rose-100 text-rose-600 border-rose-200' },
    'cansado': { icon: <Moon className="w-6 h-6" />, color: 'bg-indigo-100 text-indigo-600 border-indigo-200' },
    'neutro': { icon: <Meh className="w-6 h-6" />, color: 'bg-slate-100 text-slate-600 border-slate-200' },
  };

  return (
    <div className="max-w-4xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      <div className="text-center space-y-4">
        <h2 className="font-serif text-4xl md:text-5xl font-medium tracking-tight text-emerald-700 dark:text-emerald-400">
          Equilíbrio Emocional
        </h2>
        <p className="font-sans text-slate-500 dark:text-slate-400 max-w-xl mx-auto text-lg leading-relaxed">
          Entenda como suas emoções influenciam sua alimentação e descubra padrões de fome emocional com ajuda da IA.
        </p>
      </div>

      <div className="clay-card p-8">
        <div className="space-y-8">
          <div className="text-center">
            <h3 className="font-serif text-2xl text-slate-800 dark:text-slate-100 font-medium">Como você está se sentindo agora?</h3>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
            {Object.entries(moodIcons).map(([key, { icon, color }]) => (
              <button
                key={key}
                onClick={() => setMood(key)}
                className={`flex flex-col items-center justify-center p-4 rounded-2xl border shadow-sm transition-all hover:scale-105 active:scale-95 ${mood === key ? 'bg-emerald-500 text-white border-emerald-500 shadow-emerald-500/20' : color}`}
              >
                {icon}
                <span className="text-xs font-bold uppercase mt-2">{key}</span>
              </button>
            ))}
          </div>

          {mood && (
            <div className="space-y-6 animate-in slide-in-from-top-4 duration-300">
              <div className="space-y-3">
                <label className="block text-sm font-bold text-slate-400 uppercase tracking-widest">Algum gatilho específico? (Opcional)</label>
                <input
                  type="text"
                  value={trigger}
                  onChange={(e) => setTrigger(e.target.value)}
                  placeholder="Ex: Reunião difícil, trânsito, TPM..."
                  className="w-full p-4 bg-white/60 dark:bg-slate-800/60 border border-white/40 dark:border-slate-600/50 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500/30 font-sans text-slate-700 dark:text-slate-200"
                />
              </div>
              <button
                onClick={() => handleLogMood(mood)}
                className="w-full py-4 bg-emerald-500 hover:clay-primary px-6 py-3 font-bold shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
              >
                Registrar Sentimento
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Pattern Analysis */}
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-8 rounded-[32px] clay-card text-white shadow-xl shadow-indigo-500/20 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <Brain className="w-6 h-6" />
            </div>
            <h3 className="font-serif text-3xl font-medium">Análise de Padrões</h3>
            <p className="text-indigo-100 leading-relaxed font-sans">
              Minha IA identifica se você está comendo por ansiedade ou tédio ao cruzar seus horários e sentimentos.
            </p>
          </div>
          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            className="mt-8 bg-white text-indigo-600 py-4 px-8 rounded-2xl font-bold shadow-lg shadow-black/10 hover:bg-indigo-50 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {isAnalyzing ? "Analisando..." : "Gerar Relatório Emocional"}
            <Sparkles className="w-5 h-5" />
          </button>
        </div>

        {/* History */}
        <div className="clay-card p-8">
          <div className="flex items-center gap-3 mb-6">
            <History className="w-6 h-6 text-slate-400" />
            <h3 className="font-serif text-2xl text-slate-800 dark:text-slate-100 font-medium">Últimos Registros</h3>
          </div>
          <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
            {logs.length === 0 ? (
              <p className="text-slate-400 italic text-center py-10">Nenhum registro ainda.</p>
            ) : (
              logs.slice().reverse().map((log) => (
                <div key={log.id} className="flex items-center gap-4 p-4 clay-card p-6 shadow-sm">
                  <div className={`p-2 rounded-lg ${moodIcons[log.mood]?.color || 'bg-slate-100 text-slate-500'}`}>
                    {moodIcons[log.mood]?.icon || <Meh className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-700 dark:text-slate-200 capitalize text-sm">{log.mood}</p>
                    {log.trigger && <p className="text-xs text-slate-400 truncate">Gatilho: {log.trigger}</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">{new Date(log.date).toLocaleDateString('pt-BR')}</p>
                    <p className="text-[10px] text-slate-400">{new Date(log.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {analysis && (
        <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 space-y-8">
           <div className="flex items-start gap-4 clay-card p-6 shadow-sm">
               <button
                  onClick={() => playTTS(analysis.assistantMessage)}
                  className={`w-12 h-12 rounded-full shrink-0 flex items-center justify-center text-white bg-emerald-500 transition-all ${isPlaying ? 'animate-pulse ring-4 ring-emerald-500/30' : 'hover:scale-105 shadow-md'}`}
                >
                  {isPlaying ? <Volume2 className="w-5 h-5" /> : <Play className="w-5 h-5 ml-1" />}
                </button>
                <div>
                  <h4 className="font-serif text-xl text-emerald-800 dark:text-emerald-400 font-medium mb-1">Mente & Nutrição:</h4>
                  <p className="font-sans text-slate-700 dark:text-slate-300 text-lg leading-relaxed italic">
                    "{analysis.assistantMessage}"
                  </p>
                </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <div className="clay-card p-6 space-y-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">O que identifiquei:</h4>
                <p className="text-xl text-slate-700 dark:text-slate-200 font-serif leading-relaxed">{analysis.insight}</p>
              </div>
              <div className="bg-emerald-50/50 dark:bg-emerald-900/20 p-8 rounded-[32px] clay-card border border-emerald-100/50 dark:border-emerald-800/30 space-y-4">
                <h4 className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest text-emerald-500">Sugestão Prática:</h4>
                <p className="text-xl text-emerald-800 dark:text-emerald-300 font-serif leading-relaxed">{analysis.suggestion}</p>
              </div>
            </div>
        </div>
      )}
    </div>
  );
}
