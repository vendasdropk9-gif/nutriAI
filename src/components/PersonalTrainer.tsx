import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, SkipForward, PlayCircle, Trophy, Sparkles, Volume2, Clock, Zap, Activity, Info, ChevronRight, RefreshCw, Music, VolumeX } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile, WorkoutSession, Exercise } from '../types';
import { generateWorkout, textToSpeech } from '../lib/gemini';
import { Avatar3D } from './Avatar3D';

interface PersonalTrainerProps {
  profile: UserProfile | null;
  onAwardPoints?: (amount: number, reason: string) => void;
}

export function PersonalTrainer({ profile, onAwardPoints }: PersonalTrainerProps) {
  const [workout, setWorkout] = useState<WorkoutSession | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(-1);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeMode, setActiveMode] = useState<'training' | 'tutorial'>('training');
  const [tutorialStep, setTutorialStep] = useState(0);
  const [cameraView, setCameraView] = useState<'front' | 'side' | 'detail'>('front');
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showWrongMode, setShowWrongMode] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [completedExercises, setCompletedExercises] = useState<string[]>([]);
  
  // Background Music State
  const [isBgMusicPlaying, setIsBgMusicPlaying] = useState(false);
  const [bgMusicVolume, setBgMusicVolume] = useState(0.3);
  const bgAudioRef = useRef<HTMLAudioElement | null>(null);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Initialize background music
    const audio = new Audio('https://cdn.pixabay.com/audio/2022/01/18/audio_d0a13f69d2.mp3');
    audio.loop = true;
    audio.volume = bgMusicVolume;
    bgAudioRef.current = audio;

    return () => {
      audio.pause();
      bgAudioRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (bgAudioRef.current) {
      bgAudioRef.current.volume = bgMusicVolume;
    }
  }, [bgMusicVolume]);

  const toggleBgMusic = () => {
    if (!bgAudioRef.current) return;
    if (isBgMusicPlaying) {
      bgAudioRef.current.pause();
    } else {
      bgAudioRef.current.play().catch(console.error);
    }
    setIsBgMusicPlaying(!isBgMusicPlaying);
  };

  const currentExercise = currentExerciseIndex >= 0 ? workout?.exercises[currentExerciseIndex] : null;

  useEffect(() => {
    if (isTimerActive && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isTimerActive) {
      setIsTimerActive(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isTimerActive, timeLeft]);

  const handleStartWorkout = async () => {
    setIsGenerating(true);
    try {
      const result = await generateWorkout(profile);
      if (result) {
        setWorkout(result);
        setCurrentExerciseIndex(0);
        setCompletedExercises([]);
        playMotivationalMessage(`Olá! Vamos começar seu treino "${result.title}". Prepare-se para o primeiro exercício.`);
        
        // Auto-play background music if not already playing
        if (!isBgMusicPlaying && bgAudioRef.current) {
          bgAudioRef.current.play().catch(console.error);
          setIsBgMusicPlaying(true);
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  };

  const playMotivationalMessage = async (text: string) => {
    if (isPlaying) return;
    setIsPlaying(true);
    try {
      const base64Audio = await textToSpeech(text);
      if (base64Audio) {
        const url = `data:audio/wav;base64,${base64Audio}`;
        setAudioUrl(url);
        const audio = new Audio(url);
        audio.onended = () => setIsPlaying(false);
        audio.play();
      } else {
        setIsPlaying(false);
      }
    } catch (error) {
      console.error(error);
      setIsPlaying(false);
    }
  };

  const startExercise = () => {
    if (!currentExercise) return;
    setActiveMode('training');
    setIsTimerActive(true);
    setPlaybackSpeed(1);
    setTutorialStep(0);
    setShowWrongMode(false);
    setTimeLeft(currentExercise.duration || 45);
    playMotivationalMessage(`Vamos lá! Execute com calma e mantenha a postura.`);
  };

  const startTutorial = () => {
    if (!currentExercise || !currentExercise.tutorialSteps) return;
    setActiveMode('tutorial');
    setIsTimerActive(false);
    setTutorialStep(0);
    setShowWrongMode(false);
    const firstStep = currentExercise.tutorialSteps[0];
    setCameraView(firstStep.cameraView);
    playMotivationalMessage(`Vou te mostrar como fazer corretamente. Passo um: ${firstStep.title}. ${firstStep.description}`);
  };

  const nextTutorialStep = () => {
    if (!currentExercise?.tutorialSteps) return;
    const nextStep = tutorialStep + 1;
    if (nextStep < currentExercise.tutorialSteps.length) {
      setTutorialStep(nextStep);
      const step = currentExercise.tutorialSteps[nextStep];
      setCameraView(step.cameraView);
      playMotivationalMessage(`Passo ${nextStep + 1}: ${step.title}. ${step.description}`);
    } else {
      playMotivationalMessage("Tutorial concluído! Pronto para começar o treino?");
    }
  };

  const nextExercise = () => {
    if (!workout || !currentExercise) return;
    
    const nextIndex = currentExerciseIndex + 1;
    setCompletedExercises(prev => [...prev, currentExercise.id]);
    
    if (nextIndex < workout.exercises.length) {
      setCurrentExerciseIndex(nextIndex);
      setIsTimerActive(false);
      setTimeLeft(0);
      playMotivationalMessage(`Muito bom! Agora vamos para o próximo: ${workout.exercises[nextIndex].name}.`);
    } else {
      finishWorkout();
    }
  };

  const finishWorkout = () => {
    setCurrentExerciseIndex(-2); // Special state for finished
    setIsTimerActive(false);
    if (onAwardPoints) onAwardPoints(150, `Treino Completo: ${workout?.title}`);
    playMotivationalMessage("Parabéns! Você completou o treino de hoje. Sinta essa energia fluir pelo seu corpo!");
    
    // Smoothly lower background music volume
    const interval = setInterval(() => {
      if (bgAudioRef.current && bgAudioRef.current.volume > 0.1) {
        bgAudioRef.current.volume -= 0.05;
      } else {
        clearInterval(interval);
      }
    }, 200);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      <div className="text-center space-y-4">
        <h2 className="font-serif text-4xl md:text-5xl font-medium tracking-tight text-emerald-700 dark:text-emerald-400">
          Personal Trainer 3D
        </h2>
        <p className="font-sans text-slate-500 dark:text-slate-400 max-w-xl mx-auto text-lg leading-relaxed">
          Treine em casa com precisão. Veja exatamente quais músculos estão trabalhando e receba orientações em tempo real.
        </p>
      </div>

      {!workout ? (
        <div className="bg-white/40 dark:bg-slate-800/40 backdrop-blur-xl p-8 md:p-12 rounded-[32px] md:rounded-[40px] shadow-2xl border border-white/60 dark:border-slate-700/50 text-center space-y-6 md:space-y-8 max-w-2xl mx-auto">
            <div className="w-20 h-20 md:w-24 md:h-24 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto text-emerald-600">
               <Activity className="w-10 h-10 md:w-12 md:h-12" />
            </div>
            <div className="space-y-3 md:space-y-4">
               <h3 className="font-serif text-2xl md:text-3xl font-medium text-slate-800 dark:text-slate-100">Treino Customizado IA</h3>
               <p className="text-slate-500 dark:text-slate-400 text-sm md:text-base">
                 Vou gerar uma série de calistenia baseada nos seus objetivos de {profile?.goals || 'saúde'}.
               </p>
            </div>
            <button
               onClick={handleStartWorkout}
               disabled={isGenerating}
               className="w-full sm:w-auto px-8 md:px-12 py-4 md:py-5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-bold text-base md:text-lg shadow-xl transition-all flex items-center justify-center gap-3 mx-auto disabled:opacity-50 active:scale-95"
            >
               {isGenerating ? <RefreshCw className="w-5 h-5 md:w-6 md:h-6 animate-spin" /> : <PlayCircle className="w-5 h-5 md:w-6 md:h-6" />}
               Iniciar Treino Inteligente
            </button>
        </div>
      ) : currentExerciseIndex === -2 ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-emerald-500 text-white p-8 md:p-16 rounded-[32px] md:rounded-[48px] text-center space-y-8 md:space-y-10 shadow-2xl shadow-emerald-500/20 max-w-2xl mx-auto"
        >
            <Trophy className="w-20 h-20 md:w-32 md:h-32 mx-auto animate-bounce" />
            <div className="space-y-3 md:space-y-4">
               <h3 className="text-3xl md:text-4xl font-serif font-bold">Vença a si mesma!</h3>
               <p className="text-emerald-50 text-base md:text-xl font-medium">Você completou o treino de hoje com sucesso.</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
               <div className="bg-white/10 p-4 md:p-6 rounded-2xl md:rounded-3xl backdrop-blur-md">
                  <p className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-emerald-100">Calorias</p>
                  <p className="text-2xl md:text-3xl font-bold font-serif">~{workout.totalCalories}</p>
               </div>
               <div className="bg-white/10 p-4 md:p-6 rounded-2xl md:rounded-3xl backdrop-blur-md">
                  <p className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-emerald-100">Pontos</p>
                  <p className="text-2xl md:text-3xl font-bold font-serif">+150</p>
               </div>
            </div>
            <button
               onClick={() => setWorkout(null)}
               className="w-full py-4 md:py-5 bg-white text-emerald-600 rounded-2xl font-bold text-base md:text-lg shadow-xl active:scale-95"
            >
               Voltar ao Menu
            </button>
        </motion.div>
      ) : (
        <div className="grid lg:grid-cols-12 gap-8 items-start">
           {/* Left Column: Avatar and Visuals */}
           <div className="lg:col-span-12 xl:col-span-7 space-y-6 relative">
              <Avatar3D 
                activeMuscles={currentExercise?.primaryMuscles || []} 
                animation={
                  showWrongMode ? 'wrong' : 
                  (activeMode === 'tutorial' ? currentExercise?.tutorialSteps?.[tutorialStep]?.animationState || 'tutorial' : 
                  (isTimerActive ? 'executing' : 'idle'))
                }
                view={cameraView}
                playbackSpeed={playbackSpeed}
              />

              {/* Viewpoint Controls */}
              <div className="absolute top-4 left-4 md:top-6 md:left-6 flex flex-col gap-2 z-10">
                {(['front', 'side', 'detail'] as const).map(v => (
                  <button
                    key={v}
                    onClick={() => setCameraView(v)}
                    className={`px-3 py-1.5 md:px-4 md:py-2 rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-widest backdrop-blur-md border transition-all ${
                      cameraView === v 
                      ? 'bg-emerald-500 text-white border-emerald-400 shadow-lg shadow-emerald-500/30' 
                      : 'bg-white/10 text-white border-white/20 active:bg-white/30'
                    }`}
                  >
                    {v === 'front' ? 'Frente' : v === 'side' ? 'Lateral' : 'Detalhe'}
                  </button>
                ))}
              </div>

              {/* Ambient Music Controls Overlay */}
              <div className="absolute top-4 right-4 md:top-6 md:right-6 z-10">
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-1.5 md:p-2 rounded-xl md:rounded-2xl border border-white/60 dark:border-slate-800 shadow-xl flex items-center gap-2 md:gap-3 group"
                >
                   <button 
                     onClick={toggleBgMusic}
                     title={isBgMusicPlaying ? "Pausar música" : "Tocar música"}
                     className={`w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl flex items-center justify-center transition-all ${isBgMusicPlaying ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}
                   >
                     {isBgMusicPlaying ? <Music className="w-4 h-4 md:w-5 md:h-5 animate-pulse" /> : <VolumeX className="w-4 h-4 md:w-5 md:h-5" />}
                   </button>
                   
                   <div className="w-0 group-hover:w-32 md:group-hover:w-36 overflow-hidden transition-all duration-300 flex items-center gap-2 md:gap-3">
                      <div className="h-1 bg-slate-100 dark:bg-slate-800 rounded-full flex-1 relative">
                        <input 
                          type="range" 
                          min="0" 
                          max="1" 
                          step="0.01" 
                          value={bgMusicVolume} 
                          onChange={(e) => setBgMusicVolume(parseFloat(e.target.value))}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                        <div 
                          className="h-full bg-emerald-500 rounded-full relative"
                          style={{ width: `${bgMusicVolume * 100}%` }}
                        >
                          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 md:w-3 md:h-3 bg-white border-2 border-emerald-500 rounded-full shadow-md" />
                        </div>
                      </div>
                      <span className="text-[9px] md:text-[10px] font-mono font-bold text-slate-500 shrink-0">
                         {Math.round(bgMusicVolume * 100)}%
                       </span>
                   </div>
                </motion.div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                 <div className="bg-white/40 dark:bg-slate-800/40 p-4 md:p-6 rounded-2xl md:rounded-[28px] border border-white/60 dark:border-slate-700/50 flex items-center justify-between">
                    <div>
                        <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest">Progressos</p>
                        <p className="text-xl md:text-2xl font-serif font-bold text-slate-800 dark:text-slate-100">
                           {currentExerciseIndex + 1} de {workout.exercises.length}
                        </p>
                    </div>
                    <div className="w-12 md:w-16 h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden shrink-0">
                       <div 
                         className="h-full bg-emerald-500" 
                         style={{ width: `${((currentExerciseIndex + 1) / workout.exercises.length) * 100}%` }} 
                       />
                    </div>
                 </div>

                 <div className="bg-white/40 dark:bg-slate-800/40 p-4 md:p-6 rounded-2xl md:rounded-[28px] border border-white/60 dark:border-slate-700/50 flex items-center gap-3 md:gap-4">
                    <button
                        onClick={() => currentExercise && playMotivationalMessage(currentExercise.description)}
                        className={`w-10 h-10 md:w-12 md:h-12 rounded-full shrink-0 flex items-center justify-center text-white bg-emerald-500 transition-all ${isPlaying ? 'animate-pulse' : 'hover:scale-105 active:scale-95'}`}
                    >
                        {isPlaying ? <Volume2 className="w-4 h-4 md:w-5 md:h-5" /> : <Info className="w-4 h-4 md:w-5 md:h-5" />}
                    </button>
                    <div className="overflow-hidden">
                        <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest">Assistente</p>
                        <p className="text-xs italic text-slate-600 dark:text-slate-300 truncate md:whitespace-normal">"Mantenha sempre a postura..."</p>
                    </div>
                 </div>
              </div>
           </div>

           {/* Right Column: Exercise Details & Controls */}
           <div className="lg:col-span-12 xl:col-span-5 space-y-6">
              <motion.div 
                key={currentExercise?.id + activeMode}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white/40 dark:bg-slate-800/40 p-6 md:p-8 rounded-[24px] md:rounded-[32px] border border-white/60 dark:border-slate-700/50 shadow-xl space-y-6 md:space-y-8"
              >
                 <div className="flex items-center justify-between">
                    <div className="space-y-1 md:space-y-2">
                        <div className="flex items-center gap-2 text-emerald-500 font-bold uppercase text-[9px] md:text-[10px] tracking-widest">
                          <Zap className="w-3.5 h-3.5" />
                          {activeMode === 'tutorial' ? 'Modo Tutorial' : 'Treino Ativo'}
                        </div>
                        <h3 className="text-2xl sm:text-3xl md:text-4xl font-serif font-bold text-slate-800 dark:text-slate-100">{currentExercise?.name}</h3>
                    </div>
                    
                    {activeMode === 'training' && (
                      <div className="text-right">
                         <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tempo</p>
                         <p className="text-2xl md:text-3xl font-mono font-bold text-emerald-500">
                            {timeLeft}s
                         </p>
                      </div>
                    )}
                 </div>

                 {activeMode === 'tutorial' ? (
                   <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                      <div className="flex items-center gap-2 mb-4">
                        {currentExercise?.tutorialSteps?.map((_, i) => (
                          <div 
                            key={i} 
                            className={`h-1 flex-1 rounded-full transition-all ${i <= tutorialStep ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'}`} 
                          />
                        ))}
                      </div>

                      <div className="space-y-3 md:space-y-4">
                        <h4 className="text-xl md:text-2xl font-serif font-bold text-slate-800 dark:text-slate-100">
                           {currentExercise?.tutorialSteps?.[tutorialStep]?.title}
                        </h4>
                        <p className="text-sm md:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
                           {currentExercise?.tutorialSteps?.[tutorialStep]?.description}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-3 md:gap-4">
                         <button
                           onClick={() => setPlaybackSpeed(playbackSpeed === 1 ? 0.5 : 1)}
                           className={`p-3 md:p-4 rounded-xl md:rounded-2xl border font-bold text-xs md:text-sm flex items-center justify-center gap-2 transition-all ${
                             playbackSpeed === 0.5 ? 'bg-amber-500/10 border-amber-500 text-amber-600' : 'bg-white/50 border-slate-200 text-slate-600'
                           }`}
                         >
                           <Clock className="w-3.5 h-3.5 md:w-4 md:h-4" />
                           {playbackSpeed === 0.5 ? '0.5x' : '1x'}
                         </button>
                         <button
                           onClick={() => setShowWrongMode(!showWrongMode)}
                           className={`p-3 md:p-4 rounded-xl md:rounded-2xl border font-bold text-xs md:text-sm flex items-center justify-center gap-2 transition-all ${
                              showWrongMode ? 'bg-red-500/10 border-red-500 text-red-600' : 'bg-white/50 border-slate-200 text-slate-600'
                           }`}
                         >
                           <Info className="w-3.5 h-3.5 md:w-4 md:h-4" />
                           Ajustes
                         </button>
                      </div>

                      {showWrongMode && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="p-4 bg-red-50 dark:bg-red-900/10 rounded-xl md:rounded-2xl border border-red-100 dark:border-red-900/30"
                        >
                           <p className="text-[10px] font-bold text-red-600 uppercase mb-2">❌ Evite:</p>
                           {currentExercise?.commonErrors?.map((err, i) => (
                             <div key={i} className="mb-2 last:mb-0">
                               <p className="text-xs md:text-sm font-medium text-slate-700 dark:text-slate-300">"{err.error}"</p>
                               <p className="text-[10px] md:text-xs text-emerald-600 font-bold mt-1">✅ Correção: {err.fix}</p>
                             </div>
                           ))}
                        </motion.div>
                      )}

                      <div className="flex gap-3 md:gap-4 pt-2 md:pt-4">
                         {tutorialStep < (currentExercise?.tutorialSteps?.length || 0) - 1 ? (
                           <button
                             onClick={nextTutorialStep}
                             className="flex-1 py-4 md:py-5 bg-emerald-500 text-white rounded-xl md:rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg active:scale-95 text-sm md:text-base"
                           >
                              Próximo
                              <ChevronRight className="w-4 h-4 md:w-5 md:h-5" />
                           </button>
                         ) : (
                           <button
                             onClick={startExercise}
                             className="flex-1 py-4 md:py-5 bg-slate-900 text-white rounded-xl md:rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg active:scale-95 text-sm md:text-base"
                           >
                              Treinar Agora
                              <Play className="w-4 h-4 md:w-5 md:h-5 fill-current" />
                           </button>
                         )}
                         <button
                           onClick={() => setTutorialStep(0)}
                           className="p-4 md:p-5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-200 rounded-xl md:rounded-2xl active:scale-95"
                         >
                            <RefreshCw className="w-5 h-5 md:w-6 md:h-6" />
                         </button>
                      </div>
                   </div>
                 ) : (
                   <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                     <div className="flex gap-3 md:gap-4">
                        <div className="px-3 py-1.5 md:px-4 md:py-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-lg md:rounded-xl text-[10px] md:text-xs font-bold">
                           {currentExercise?.difficulty}
                        </div>
                        <div className="px-3 py-1.5 md:px-4 md:py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-lg md:rounded-xl text-[10px] md:text-xs font-bold">
                           {currentExercise?.reps ? `${currentExercise.reps} Reps` : `${currentExercise?.duration}s`}
                        </div>
                     </div>

                     <div className="space-y-3 md:space-y-4">
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Músculos Ativados:</h4>
                        <div className="flex flex-wrap gap-2">
                           {currentExercise?.muscleGroups.map(m => (
                             <span key={m} className="px-2.5 py-1 md:px-3 md:py-1 bg-white/60 dark:bg-slate-700 rounded-full text-[10px] md:text-xs text-slate-600 dark:text-slate-300 border border-slate-200/50 dark:border-slate-600/50">
                                {m}
                             </span>
                           ))}
                        </div>
                     </div>

                     <div className="pt-4 md:pt-8 space-y-4">
                        <div className="flex gap-3 md:gap-4">
                           {!isTimerActive ? (
                             <button
                               onClick={startExercise}
                               className="flex-1 py-4 md:py-5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl md:rounded-2xl font-bold text-base md:text-lg shadow-xl shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 md:gap-3 active:scale-95"
                             >
                               <Play className="w-5 h-5 md:w-6 md:h-6 fill-current" />
                               Começar
                             </button>
                           ) : (
                             <button
                               onClick={() => setIsTimerActive(false)}
                               className="flex-1 py-4 md:py-5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl md:rounded-2xl font-bold text-base md:text-lg shadow-xl shadow-amber-500/20 transition-all flex items-center justify-center gap-2 md:gap-3 active:scale-95"
                             >
                               <Pause className="w-5 h-5 md:w-6 md:h-6 fill-current" />
                               Pausar
                             </button>
                           )}
                           
                           <button
                             onClick={startTutorial}
                             className="px-4 md:px-6 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-200 rounded-xl md:rounded-2xl font-bold active:bg-slate-200 transition-all flex items-center gap-2"
                             title="Ver Tutorial"
                           >
                              <Info className="w-5 h-5 md:w-6 md:h-6" />
                              <span className="hidden sm:inline text-sm md:text-base">Tutorial</span>
                           </button>

                           <button
                             onClick={nextExercise}
                             className="px-4 md:px-6 bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-white rounded-xl md:rounded-2xl font-bold active:bg-slate-300 transition-all"
                             title="Pular"
                           >
                              <SkipForward className="w-5 h-5 md:w-6 md:h-6" />
                           </button>
                        </div>
                     </div>
                   </div>
                 )}
              </motion.div>

              <div className="bg-emerald-50 dark:bg-emerald-900/10 p-5 md:p-6 rounded-[24px] md:rounded-[28px] border border-emerald-100 dark:border-emerald-800/30 space-y-2 md:space-y-3">
                 <div className="flex items-center gap-2 font-serif text-base md:text-lg text-emerald-800 dark:text-emerald-400">
                    <Sparkles className="w-4 h-4 md:w-5 md:h-5" />
                    Benefício IA
                 </div>
                 <p className="text-xs md:text-sm text-slate-600 dark:text-slate-300 leading-relaxed italic">
                    "{currentExercise?.benefits}"
                 </p>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
