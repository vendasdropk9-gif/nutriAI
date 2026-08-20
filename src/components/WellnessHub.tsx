import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Wind, 
  Activity, 
  Moon, 
  Sparkles, 
  Play, 
  Pause, 
  StopCircle, 
  Heart,
  Volume2
} from 'lucide-react';
import { playSfx, vibrate } from '../lib/sensory';
import { speak, stopSpeech } from '../lib/speech';
import { SmartWellnessDashboard } from './SmartWellnessDashboard';
import { SleepActivityAdvisor } from './SleepActivityAdvisor';

type ActivityType = 'breathing' | 'stretching' | 'meditation' | 'sleep';

interface WellnessSession {
  id: string;
  title: string;
  description: string;
  durationMinutes: number;
  type: ActivityType;
  steps: { instruction: string; durationSeconds: number }[];
  color: string;
}

const SESSIONS: WellnessSession[] = [
  {
    id: 'breathe-478',
    title: 'Respiração 4-7-8',
    description: 'Reduz a ansiedade e promove relaxamento profundo rapidamente.',
    durationMinutes: 2,
    type: 'breathing',
    color: 'from-sky-400 to-blue-600',
    steps: [
      { instruction: 'Inspire pelo nariz contando até 4', durationSeconds: 4 },
      { instruction: 'Prenda a respiração contando até 7', durationSeconds: 7 },
      { instruction: 'Expire lentamente pela boca contando até 8', durationSeconds: 8 },
      { instruction: 'Inspire pelo nariz contando até 4', durationSeconds: 4 },
      { instruction: 'Prenda a respiração contando até 7', durationSeconds: 7 },
      { instruction: 'Expire lentamente pela boca contando até 8', durationSeconds: 8 },
    ]
  },
  {
    id: 'stretch-desk',
    title: 'Alongamento de Mesa',
    description: 'Libere a tensão no pescoço e ombros sem sair da cadeira.',
    durationMinutes: 3,
    type: 'stretching',
    color: 'from-orange-400 to-rose-500',
    steps: [
      { instruction: 'Gire os ombros para trás suavemente', durationSeconds: 15 },
      { instruction: 'Incline a cabeça para a direita, alongando o pescoço', durationSeconds: 20 },
      { instruction: 'Incline a cabeça para a esquerda', durationSeconds: 20 },
      { instruction: 'Entrelace os dedos e estique os braços para frente', durationSeconds: 15 },
      { instruction: 'Estique os braços para cima, alongando a coluna', durationSeconds: 20 },
    ]
  },
  {
    id: 'meditation-focus',
    title: 'Meditação de Foco',
    description: 'Reconecte-se com o presente em poucos minutos.',
    durationMinutes: 5,
    type: 'meditation',
    color: 'from-emerald-400 to-teal-600',
    steps: [
      { instruction: 'Feche os olhos e traga atenção à sua respiração', durationSeconds: 60 },
      { instruction: 'Observe os pensamentos passando como nuvens, sem se apegar', durationSeconds: 120 },
      { instruction: 'Traga o foco para as sensações físicas do seu corpo', durationSeconds: 60 },
      { instruction: 'Abra os olhos suavemente', durationSeconds: 10 },
    ]
  },
  {
    id: 'sleep-winddown',
    title: 'Descompressão Noturna',
    description: 'Prepare seu corpo e mente para um sono reparador.',
    durationMinutes: 4,
    type: 'sleep',
    color: 'from-indigo-400 to-purple-600',
    steps: [
      { instruction: 'Relaxe os músculos do rosto, especialmente a mandíbula', durationSeconds: 30 },
      { instruction: 'Solte os ombros, deixando-os cair pesadamente', durationSeconds: 30 },
      { instruction: 'Sinta o peso dos braços e das mãos descansando', durationSeconds: 30 },
      { instruction: 'Relaxe as pernas, dos joelhos até a ponta dos pés', durationSeconds: 30 },
      { instruction: 'Respire lenta e profundamente...', durationSeconds: 60 },
    ]
  }
];

export function WellnessHub() {
  const [activeCategory, setActiveCategory] = useState<ActivityType | 'all'>('all');
  const [activeSession, setActiveSession] = useState<WellnessSession | null>(null);
  
  // Player state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [timeLeftInStep, setTimeLeftInStep] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

  useEffect(() => {
    let timer: any;
    if (isPlaying && activeSession && !isFinished) {
      if (timeLeftInStep > 0) {
        timer = setTimeout(() => {
          setTimeLeftInStep(prev => prev - 1);
        }, 1000);
      } else {
        // Move to next step or finish
        if (currentStepIndex < activeSession.steps.length - 1) {
          const nextIndex = currentStepIndex + 1;
          setCurrentStepIndex(nextIndex);
          setTimeLeftInStep(activeSession.steps[nextIndex].durationSeconds);
          
          // Speak instruction
          speak(activeSession.steps[nextIndex].instruction);
          vibrate(20);
        } else {
          setIsFinished(true);
          setIsPlaying(false);
          speak('Sessão concluída. Bom trabalho!');
          playSfx('success');
          vibrate([30, 50, 30]);
        }
      }
    }
    return () => clearTimeout(timer);
  }, [isPlaying, timeLeftInStep, currentStepIndex, activeSession, isFinished]);

  const handleStart = (session: WellnessSession) => {
    setActiveSession(session);
    setCurrentStepIndex(0);
    setTimeLeftInStep(session.steps[0].durationSeconds);
    setIsPlaying(true);
    setIsFinished(false);
    speak(session.steps[0].instruction);
    playSfx('tap');
    vibrate(15);
  };

  const handlePause = () => {
    setIsPlaying(false);
    stopSpeech();
    playSfx('tap');
    vibrate(10);
  };

  const handleResume = () => {
    setIsPlaying(true);
    if (activeSession) {
      speak(activeSession.steps[currentStepIndex].instruction);
    }
    playSfx('tap');
    vibrate(10);
  };

  const handleStop = () => {
    setActiveSession(null);
    setIsPlaying(false);
    setIsFinished(false);
    stopSpeech();
    playSfx('scratch');
    vibrate(10);
  };

  const filteredSessions = activeCategory === 'all' 
    ? SESSIONS 
    : SESSIONS.filter(s => s.type === activeCategory);

  const getCategoryIcon = (type: string) => {
    switch (type) {
      case 'breathing': return <Wind className="w-5 h-5" />;
      case 'stretching': return <Activity className="w-5 h-5" />;
      case 'meditation': return <Sparkles className="w-5 h-5" />;
      case 'sleep': return <Moon className="w-5 h-5" />;
      default: return <Heart className="w-5 h-5" />;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-24 animate-in fade-in duration-500">
      
      {!activeSession ? (
        <>
          <div className="bg-gradient-to-br from-rose-400 to-rose-600 rounded-[36px] p-8 text-white shadow-xl relative overflow-hidden">
            <div className="absolute right-0 bottom-0 opacity-20 translate-x-4 translate-y-4">
              <Heart className="w-48 h-48" />
            </div>
            <div className="relative z-10 space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 rounded-full text-xs font-bold uppercase tracking-wider backdrop-blur-md">
                <Sparkles className="w-4 h-4" /> Centro de Bem-Estar
              </div>
              <h2 className="text-3xl md:text-4xl font-serif font-black tracking-tight leading-tight">
                Pausa para você
              </h2>
              <p className="text-rose-50 max-w-lg leading-relaxed font-medium">
                Exercícios rápidos de respiração, alongamentos, meditações e relaxamento para equilibrar seu corpo e mente.
              </p>
            </div>
          </div>

          <SmartWellnessDashboard />
          <SleepActivityAdvisor />

          <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-hide">
            {[
              { id: 'all', label: 'Todos', icon: <Heart className="w-4 h-4" /> },
              { id: 'breathing', label: 'Respiração', icon: <Wind className="w-4 h-4" /> },
              { id: 'stretching', label: 'Alongamento', icon: <Activity className="w-4 h-4" /> },
              { id: 'meditation', label: 'Meditação', icon: <Sparkles className="w-4 h-4" /> },
              { id: 'sleep', label: 'Dormir', icon: <Moon className="w-4 h-4" /> },
            ].map(cat => (
              <button
                key={cat.id}
                onClick={() => {
                  setActiveCategory(cat.id as any);
                  playSfx('tap');
                  vibrate(5);
                }}
                className={`flex items-center gap-2 px-5 py-3 rounded-full text-sm font-bold transition-all shrink-0 border-none outline-none cursor-pointer ${
                  activeCategory === cat.id
                    ? 'bg-rose-500 text-white shadow-md'
                    : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                {cat.icon} {cat.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredSessions.map(session => (
              <div 
                key={session.id}
                className="bg-white dark:bg-slate-900/60 p-6 rounded-[28px] border border-slate-100 dark:border-slate-800/80 shadow-sm hover:shadow-md transition-all group flex flex-col justify-between h-full min-h-[220px]"
              >
                <div>
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${session.color} text-white flex items-center justify-center mb-4 shadow-sm`}>
                    {getCategoryIcon(session.type)}
                  </div>
                  <h3 className="text-xl font-bold font-serif text-slate-800 dark:text-white mb-2 group-hover:text-rose-500 transition-colors">
                    {session.title}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                    {session.description}
                  </p>
                </div>
                
                <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/60">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    {session.durationMinutes} min
                  </span>
                  <button
                    onClick={() => handleStart(session)}
                    className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-rose-500 hover:text-white transition-colors border-none outline-none cursor-pointer"
                  >
                    <Play className="w-4 h-4 ml-0.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="min-h-[400px] flex items-center justify-center">
          <div className={`w-full max-w-md bg-gradient-to-br ${activeSession.color} rounded-[40px] p-8 text-white shadow-2xl relative overflow-hidden text-center`}>
            
            {/* Visual breather animation for breathing sessions */}
            {activeSession.type === 'breathing' && isPlaying && !isFinished && (
              <motion.div
                animate={{
                  scale: activeSession.steps[currentStepIndex].instruction.toLowerCase().includes('inspire') ? 1.5 : 
                         activeSession.steps[currentStepIndex].instruction.toLowerCase().includes('expire') ? 0.8 : 1.2,
                  opacity: [0.5, 0.8, 0.5]
                }}
                transition={{
                  duration: activeSession.steps[currentStepIndex].durationSeconds,
                  ease: "easeInOut",
                  repeat: activeSession.steps[currentStepIndex].instruction.toLowerCase().includes('prenda') ? Infinity : 0
                }}
                className="absolute inset-0 m-auto w-48 h-48 bg-white/10 rounded-full blur-xl pointer-events-none"
              />
            )}

            <div className="relative z-10">
              <button 
                onClick={handleStop}
                className="absolute -top-2 -left-2 p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors border-none outline-none cursor-pointer backdrop-blur-md"
              >
                <StopCircle className="w-5 h-5 text-white" />
              </button>

              <div className="w-16 h-16 mx-auto rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center mb-6">
                {getCategoryIcon(activeSession.type)}
              </div>
              
              <h3 className="text-2xl font-serif font-bold mb-8">
                {activeSession.title}
              </h3>

              {!isFinished ? (
                <div className="space-y-8 min-h-[200px] flex flex-col justify-center">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={currentStepIndex}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="text-2xl md:text-3xl font-medium leading-tight px-4"
                    >
                      {activeSession.steps[currentStepIndex].instruction}
                    </motion.div>
                  </AnimatePresence>

                  <div className="text-6xl font-black font-mono tracking-tighter opacity-90">
                    {timeLeftInStep}
                  </div>

                  {/* Progress dots */}
                  <div className="flex justify-center gap-1.5 pt-4">
                    {activeSession.steps.map((_, idx) => (
                      <div 
                        key={idx} 
                        className={`h-2 rounded-full transition-all duration-500 ${
                          idx === currentStepIndex 
                            ? 'w-6 bg-white' 
                            : idx < currentStepIndex
                              ? 'w-2 bg-white/50'
                              : 'w-2 bg-white/20'
                        }`} 
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-6 min-h-[200px] flex flex-col justify-center">
                  <div className="w-20 h-20 mx-auto bg-white rounded-full flex items-center justify-center shadow-lg">
                    <Heart className="w-10 h-10 text-rose-500" />
                  </div>
                  <div>
                    <h4 className="text-3xl font-serif font-bold mb-2">Excelente!</h4>
                    <p className="text-white/80">Você completou esta sessão de bem-estar.</p>
                  </div>
                </div>
              )}

              <div className="mt-8">
                {!isFinished ? (
                  <button
                    onClick={isPlaying ? handlePause : handleResume}
                    className="w-16 h-16 mx-auto bg-white rounded-full flex items-center justify-center text-slate-800 hover:scale-105 transition-all shadow-lg border-none outline-none cursor-pointer"
                  >
                    {isPlaying ? (
                      <Pause className="w-6 h-6 fill-current" />
                    ) : (
                      <Play className="w-6 h-6 fill-current ml-1" />
                    )}
                  </button>
                ) : (
                  <button
                    onClick={handleStop}
                    className="px-8 py-3 bg-white text-slate-800 font-bold rounded-full hover:bg-slate-50 transition-colors shadow-lg border-none outline-none cursor-pointer"
                  >
                    Voltar
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
