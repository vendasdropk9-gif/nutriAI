import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Avatar3D } from './Avatar3D';
import { EXERCISE_DATABASE, ExerciseReference } from '../data/exerciseDatabase';
import { Play, Pause, RefreshCw, Layers, ZoomIn, Info, CheckCircle2, ChevronRight, Video, Camera, Dumbbell, BrainCircuit, ScanSearch } from 'lucide-react';
import { getAvatarById } from '../data/avatarCatalog';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { UserProfile } from '../types';

export function ExerciseVisualizer() {
  const [profile] = useLocalStorage<UserProfile | null>('nutri-profile', null);
  const [selectedExerciseId, setSelectedExerciseId] = useState<string>(EXERCISE_DATABASE[0].id);
  const [mode, setMode] = useState<'tutorial' | 'training'>('tutorial');
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [reps, setReps] = useState(10);
  const [currentRep, setCurrentRep] = useState(0);
  const [tutorialPhase, setTutorialPhase] = useState<'initial' | 'movement' | 'final' | 'return'>('initial');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const activeExercise = useMemo(() => 
    EXERCISE_DATABASE.find(e => e.id === selectedExerciseId) || EXERCISE_DATABASE[0], 
  [selectedExerciseId]);

  // Use the globally selected avatar from profile or default
  const activeAvatarId = profile?.avatarId || 'athena-fit-pro';
  
  // Custom configuration based on user profile
  const avatarConfig = useMemo(() => {
    return {
      skinColor: profile?.skinTone,
      accentColor: profile?.avatarAccentColor
    };
  }, [profile]);

  const viewAngle = useMemo(() => {
    switch (activeExercise.cameraAngle) {
      case 'front': return 'front';
      case 'side': return 'side';
      case 'diagonal': return 'detail';
      default: return 'front';
    }
  }, [activeExercise]);

  const activeMuscles = activeExercise.muscles;

  // Cache-ahead strategy: Preload models for exercises in the same category or muscle group
  useEffect(() => {
    let active = true;
    import('../lib/dracoLoader').then(({ preloadExerciseModels }) => {
      if (!active) return;
      const relatedUrls = EXERCISE_DATABASE
        .filter(e => 
          e.id !== activeExercise.id && 
          e.gltfUrl && 
          (e.category === activeExercise.category || e.muscles.some(m => activeMuscles.includes(m)))
        )
        .map(e => e.gltfUrl as string);
      
      if (relatedUrls.length > 0) {
        preloadExerciseModels(relatedUrls);
      }
    });
    return () => { active = false; };
  }, [activeExercise, activeMuscles]);

  // Handle mock AI image analysis
  const handleSimulateImageAnalysis = () => {
    setIsAnalyzing(true);
    setTimeout(() => {
      setIsAnalyzing(false);
      // Randomly select next exercise
      const nextIdx = (EXERCISE_DATABASE.findIndex(e => e.id === selectedExerciseId) + 1) % EXERCISE_DATABASE.length;
      setSelectedExerciseId(EXERCISE_DATABASE[nextIdx].id);
      setTutorialPhase('initial');
      setIsPlaying(false);
      setCurrentRep(0);
    }, 2500);
  };

  // Training mode simulation loop
  useEffect(() => {
    if (mode === 'training' && isPlaying) {
      const interval = setInterval(() => {
        setCurrentRep(prev => {
          if (prev >= reps - 1) {
            setIsPlaying(false);
            return reps;
          }
          return prev + 1;
        });
      }, 3000 / playbackSpeed);
      return () => clearInterval(interval);
    }
  }, [mode, isPlaying, playbackSpeed, reps]);

  // Tutorial mode simulation loop
  useEffect(() => {
    if (mode === 'tutorial' && isPlaying) {
      const phases: typeof tutorialPhase[] = ['initial', 'movement', 'final', 'return'];
      let idx = phases.indexOf(tutorialPhase);
      const interval = setInterval(() => {
        idx = (idx + 1) % phases.length;
        setTutorialPhase(phases[idx]);
        if (idx === 0) { // completed a cycle
           setIsPlaying(false);
        }
      }, 2500);
      return () => clearInterval(interval);
    }
  }, [mode, isPlaying, tutorialPhase]);

  const getAnimationState = () => {
    if (mode === 'training') return isPlaying ? 'executing' : 'idle';
    if (mode === 'tutorial') {
      if (tutorialPhase === 'initial' || tutorialPhase === 'final') return 'idle';
      return 'tutorial';
    }
    return 'idle';
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 text-slate-100 p-4">
      
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-2xl flex flex-col md:flex-row gap-6 items-center justify-between">
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="space-y-2 z-10 w-full md:w-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-bold uppercase tracking-wider">
            <Video className="w-3.5 h-3.5" />
            <span>AI Motion Synthesis</span>
          </div>
          <h2 className="text-2xl font-serif font-bold text-white tracking-tight">
            Visualizador 3D Hiper-Realista
          </h2>
          <p className="text-sm text-slate-400">
            Tradução biomecânica de imagens para execução perfeita com o seu Avatar.
          </p>
        </div>

        <div className="w-full md:w-auto flex flex-col sm:flex-row gap-3 z-10">
          <button 
            onClick={handleSimulateImageAnalysis}
            disabled={isAnalyzing}
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold border border-slate-700 transition-all flex items-center justify-center gap-2"
          >
            {isAnalyzing ? <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" /> : <Camera className="w-4 h-4 text-cyan-400" />}
            <span>Analisar Nova Imagem</span>
          </button>
        </div>
      </div>

      {isAnalyzing && (
        <motion.div 
          initial={{ opacity: 0, height: 0 }} 
          animate={{ opacity: 1, height: 'auto' }}
          className="rounded-2xl bg-cyan-950/30 border border-cyan-500/30 p-8 flex flex-col items-center justify-center space-y-4"
        >
          <div className="relative">
            <ScanSearch className="w-12 h-12 text-cyan-400 animate-pulse" />
            <div className="absolute inset-0 border-t-2 border-cyan-400 rounded-full animate-spin" />
          </div>
          <p className="font-mono text-cyan-300 text-sm">Analisando imagem de referência...</p>
          <div className="flex gap-4 text-xs text-slate-400">
            <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-500" /> Postura detectada</span>
            <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-500" /> Equipamento</span>
            <span className="flex items-center gap-1"><RefreshCw className="w-3 h-3 text-cyan-500 animate-spin" /> Biomecânica</span>
          </div>
        </motion.div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column - 3D Visualizer */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          
          <div className="relative rounded-3xl bg-slate-950 border border-slate-800 overflow-hidden shadow-2xl h-[500px]">
            {/* Viewport Toolbar */}
            <div className="absolute top-4 left-4 right-4 flex items-start justify-between z-10 pointer-events-none">
              <div className="flex flex-col gap-2">
                <div className="px-3 py-1.5 rounded-lg bg-slate-900/80 backdrop-blur border border-slate-700/50 text-white font-bold text-sm pointer-events-auto">
                  {activeExercise.name}
                </div>
                <div className="px-3 py-1 rounded-lg bg-slate-900/60 backdrop-blur text-emerald-400 font-mono text-xs w-max pointer-events-auto flex items-center gap-1.5">
                  <Dumbbell className="w-3 h-3" />
                  {activeExercise.equipment}
                </div>
              </div>
              
              {/* Reference Image Thumbnail */}
              <div className="w-24 h-24 rounded-xl overflow-hidden border-2 border-cyan-500/30 shadow-lg pointer-events-auto group relative">
                <img 
                  src={activeExercise.referenceImage} 
                  alt="Reference"
                  className="w-full h-full object-cover transition-transform group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-slate-950/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-[10px] font-bold text-white bg-slate-900/80 px-2 py-1 rounded">Ref. Original</span>
                </div>
              </div>
            </div>

            {/* 3D Canvas */}
            <Avatar3D 
              avatarId={activeAvatarId}
              avatarConfig={avatarConfig}
              activeMuscles={activeMuscles}
              animation={getAnimationState()}
              view={viewAngle as 'front' | 'side' | 'detail'}
              playbackSpeed={playbackSpeed}
              lowMemoryMode={profile?.avatarLowMemoryMode}
              showDracoBadge={true}
              gltfUrl={activeExercise.gltfUrl} // Integrates dynamic DRACO GLTF loading
            />

            {/* Controls Overlay */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex items-center gap-4 bg-slate-900/90 backdrop-blur-md px-6 py-3 rounded-full border border-slate-700/50 shadow-2xl">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="w-12 h-12 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center justify-center transition-transform hover:scale-105"
              >
                {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-1" />}
              </button>
              
              <div className="h-8 w-px bg-slate-700 mx-2" />
              
              <div className="flex bg-slate-800 rounded-xl p-1">
                {(['tutorial', 'training'] as const).map(m => (
                  <button
                    key={m}
                    onClick={() => { setMode(m); setIsPlaying(false); setTutorialPhase('initial'); setCurrentRep(0); }}
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${
                      mode === m ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Modo {m === 'tutorial' ? 'Aprender' : 'Treino'}
                  </button>
                ))}
              </div>
            </div>
          </div>
          
          {/* Timeline / Progress Indicator */}
          {mode === 'tutorial' ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between gap-2 overflow-x-auto">
              {(['initial', 'movement', 'final', 'return'] as const).map((phase, idx, arr) => (
                <React.Fragment key={phase}>
                  <div className={`flex flex-col items-center gap-2 min-w-[80px] transition-all ${tutorialPhase === phase ? 'scale-110 opacity-100' : 'opacity-40'}`}>
                    <div className={`w-3 h-3 rounded-full ${tutorialPhase === phase ? 'bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.6)]' : 'bg-slate-700'}`} />
                    <span className="text-[10px] font-bold text-slate-300 uppercase">{phase === 'initial' ? 'Início' : phase === 'movement' ? 'Movimento' : phase === 'final' ? 'Fim' : 'Retorno'}</span>
                  </div>
                  {idx < arr.length - 1 && <div className={`flex-1 h-px ${tutorialPhase === phase ? 'bg-gradient-to-r from-cyan-500 to-slate-700' : 'bg-slate-800'}`} />}
                </React.Fragment>
              ))}
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-sm font-bold text-slate-400">Repetições</span>
                <select 
                  value={reps} 
                  onChange={(e) => setReps(Number(e.target.value))}
                  className="bg-slate-800 border-none rounded-lg text-white font-mono text-sm px-3 py-1"
                >
                  {[1, 3, 5, 10, 15, 20].map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div className="flex-1 mx-6 h-3 bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 transition-all duration-300"
                  style={{ width: `${(currentRep / reps) * 100}%` }}
                />
              </div>
              <span className="font-mono text-emerald-400 font-bold">
                {currentRep} / {reps}
              </span>
            </div>
          )}
        </div>

        {/* Right Column - Data & Explanations */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl">
            <h3 className="font-bold text-white flex items-center gap-2 mb-4">
              <BrainCircuit className="w-5 h-5 text-cyan-400" />
              <span>Análise Biomecânica</span>
            </h3>
            
            <div className="space-y-4">
              <div className="p-3 bg-slate-950/50 rounded-xl border border-slate-800/50">
                <span className="text-[10px] uppercase font-bold text-cyan-500 tracking-wider">Músculos Alvo</span>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {activeExercise.muscles.map(m => (
                    <span key={m} className="px-2 py-1 bg-cyan-950/30 text-cyan-300 border border-cyan-500/20 rounded-md text-xs">
                      {m}
                    </span>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-slate-950/50 rounded-xl border border-slate-800/50">
                <span className="text-[10px] uppercase font-bold text-emerald-500 tracking-wider mb-2 block">Dificuldade</span>
                <div className="flex gap-1">
                  {[1,2,3].map(level => (
                    <div 
                      key={level} 
                      className={`h-1.5 flex-1 rounded-full ${
                        (activeExercise.difficulty === 'beginner' && level === 1) ||
                        (activeExercise.difficulty === 'intermediate' && level <= 2) ||
                        (activeExercise.difficulty === 'advanced')
                        ? 'bg-emerald-500' : 'bg-slate-800'
                      }`}
                    />
                  ))}
                </div>
                <div className="text-right mt-1 text-[10px] text-slate-500 uppercase">
                  {activeExercise.difficulty === 'beginner' ? 'Iniciante' : activeExercise.difficulty === 'intermediate' ? 'Intermediário' : 'Avançado'}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl">
             <h3 className="font-bold text-white flex items-center gap-2 mb-4">
              <Info className="w-5 h-5 text-emerald-400" />
              <span>Instruções Execução</span>
            </h3>
            
            <div className="space-y-3">
              {mode === 'tutorial' ? (
                <>
                  <div className={`p-3 rounded-xl transition-all ${tutorialPhase === 'initial' ? 'bg-slate-800 border-l-2 border-cyan-400' : 'opacity-60'}`}>
                    <span className="text-[10px] font-bold text-slate-400 block mb-1">POSIÇÃO INICIAL</span>
                    <p className="text-sm text-slate-200 leading-relaxed">{activeExercise.initialPosition}</p>
                  </div>
                  <div className={`p-3 rounded-xl transition-all ${tutorialPhase === 'movement' ? 'bg-slate-800 border-l-2 border-cyan-400' : 'opacity-60'}`}>
                    <span className="text-[10px] font-bold text-slate-400 block mb-1">MOVIMENTO</span>
                    <p className="text-sm text-slate-200 leading-relaxed">{activeExercise.movementDescription}</p>
                  </div>
                  <div className={`p-3 rounded-xl transition-all ${tutorialPhase === 'final' ? 'bg-slate-800 border-l-2 border-cyan-400' : 'opacity-60'}`}>
                    <span className="text-[10px] font-bold text-slate-400 block mb-1">POSIÇÃO FINAL</span>
                    <p className="text-sm text-slate-200 leading-relaxed">{activeExercise.finalPosition}</p>
                  </div>
                </>
              ) : (
                <ul className="space-y-2">
                  {activeExercise.instructions.map((inst, i) => (
                    <li key={i} className="flex gap-2 text-sm text-slate-300">
                      <span className="text-emerald-500 font-bold">•</span>
                      <span>{inst}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          
          <div className="flex gap-2">
             {EXERCISE_DATABASE.map(e => (
               <button
                 key={e.id}
                 onClick={() => { setSelectedExerciseId(e.id); setIsPlaying(false); }}
                 className={`flex-1 p-2 rounded-xl text-xs font-bold transition-all line-clamp-1 ${
                   selectedExerciseId === e.id 
                   ? 'bg-emerald-500 text-slate-950 shadow-md' 
                   : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                 }`}
               >
                 {e.name}
               </button>
             ))}
          </div>

        </div>
      </div>
    </div>
  );
}
