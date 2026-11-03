import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Dumbbell, Sparkles, Volume2, ArrowUpRight, Trophy } from 'lucide-react';
import { UserProfile } from '../types';
import { playSfx, vibrate } from '../lib/sensory';
import { speak, stopSpeech } from '../lib/speech';
import { useLanguage } from '../contexts/LanguageContext';

interface DailyWorkoutTipCardProps {
  profile: UserProfile | null;
  onNavigate: (tabId: string) => void;
}

export function DailyWorkoutTipCard({ profile, onNavigate }: DailyWorkoutTipCardProps) {
  const { language } = useLanguage();
  const [isSpeaking, setIsSpeaking] = useState(false);

  const fitnessLevel = (profile?.fitnessLevel || profile?.experienceLevel || 'intermediario').toLowerCase();
  
  // Tailor tip based on fitness level
  const getTipContent = () => {
    if (fitnessLevel.includes('iniciante') || fitnessLevel.includes('beginner')) {
      return {
        title: 'Dica de Treino para Iniciantes • Foco em Execução',
        tip: 'Como iniciante, priorize a amplitude completa dos movimentos e o controle excêntrico (descida lenta). Não tenha pressa em aumentar a carga; a estabilidade articular é a base para evitar lesões e acelerar o ganho de massa magra.',
        category: 'Fundamentos & Postura',
        recs: '3 séries de 12 repetições • Descanso de 60s'
      };
    } else if (fitnessLevel.includes('avancado') || fitnessLevel.includes('advanced')) {
      return {
        title: 'Dica de Treino Avançado • Sobrecarga & Intensidade',
        tip: 'Para atletas avançados, incorpore técnicas de alta intensidade como drop-sets ou pausa-descanso nas últimas séries. Monitore o seu volume semanal de recuperação no EmotionalTracker para evitar overtraining.',
        category: 'Intensidade Máxima',
        recs: '4-5 séries pesadas • RPE 8-9'
      };
    } else {
      return {
        title: 'Dica de Treino Intermediário • Progressão Contínua',
        tip: 'Mantenha um registro rigoroso das cargas e tempos de descanso. O princípio da sobrecarga progressiva é fundamental: tente adicionar 1 a 2 repetições ou um pequeno incremento de carga quando completar todas as séries com facilidade.',
        category: 'Progressão de Carga',
        recs: '3-4 séries de 8-10 repetições'
      };
    }
  };

  const tipData = getTipContent();

  const handleSpeak = () => {
    if (isSpeaking) {
      stopSpeech();
      setIsSpeaking(false);
      return;
    }
    playSfx('tap');
    vibrate(20);
    setIsSpeaking(true);

    const speechText = `${tipData.title}. ${tipData.tip}. Recomendação: ${tipData.recs}.`;
    speak(speechText, {
      voice: 'Aoede',
      lang: language || 'pt-BR',
      onEnded: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false),
    });
  };

  return (
    <div className="card-premium p-6 sm:p-7 rounded-[32px] w-full border border-emerald-500/30 bg-gradient-to-br from-[#151B23] via-[#1A232F] to-[#0F141A] shadow-xl relative overflow-hidden space-y-4">
      {/* Background glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 text-emerald-400 border border-emerald-500/30 shrink-0">
            <Dumbbell className="w-6 h-6 animate-bounce" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold uppercase tracking-wider border border-emerald-500/30 flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> {tipData.category}
              </span>
              <span className="text-xs text-slate-400 font-semibold">
                Perfil: <strong className="text-white capitalize">{fitnessLevel}</strong>
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-display font-bold text-white tracking-tight">
              {tipData.title}
            </h3>
          </div>
        </div>

        {/* Voice button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleSpeak}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 border shadow-md transition-all cursor-pointer shrink-0 ${
            isSpeaking
              ? 'bg-red-500 text-white border-red-500 animate-pulse'
              : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border-emerald-500/40'
          }`}
          title="Ouvir com Malu (Aoede)"
        >
          <Volume2 className="w-4 h-4" />
          <span>{isSpeaking ? 'Parar Voz' : 'Ouvir com Malu'}</span>
        </motion.button>
      </div>

      <p className="text-sm text-[#B5BDC9] leading-relaxed relative z-10">
        "{tipData.tip}"
      </p>

      <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 relative z-10">
        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
          <Trophy className="w-4 h-4 text-emerald-400" />
          <span>{tipData.recs}</span>
        </div>

        <motion.button
          whileHover={{ x: 3 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => {
            playSfx('tap');
            vibrate(10);
            onNavigate('trainer');
          }}
          className="text-xs font-bold text-teal-300 hover:text-white flex items-center gap-1.5 cursor-pointer bg-teal-500/10 hover:bg-teal-500/20 px-3.5 py-2 rounded-xl transition-all border border-teal-500/30"
        >
          <span>Abrir Personal Trainer</span>
          <ArrowUpRight className="w-4 h-4" />
        </motion.button>
      </div>
    </div>
  );
}
