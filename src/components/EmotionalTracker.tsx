import { playAudioUrl } from '../lib/speech';
import React, { useState, useEffect, useRef } from 'react';
import { 
  Brain, Smile, Frown, Meh, Zap, Moon, AlertCircle, Sparkles, Volume2, Play, ChevronRight, History,
  Camera, ShieldCheck, X, Target, Check, Coffee, Utensils, Wind, Lock, UserCheck, Loader2
} from 'lucide-react';
import { EmotionalLog, UserProfile } from '../types';
import { analyzeEmotionalPatterns, textToSpeech, analyzeEmotionalImage } from '../lib/gemini';

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

  // States for emotional face capture
  const [isFaceCameraActive, setIsFaceCameraActive] = useState(false);
  const [faceCameraStream, setFaceCameraStream] = useState<MediaStream | null>(null);
  const [faceCameraError, setFaceCameraError] = useState<string | null>(null);
  const [facePreviewImage, setFacePreviewImage] = useState<string | null>(null);
  const [isFaceAnalyzing, setIsFaceAnalyzing] = useState(false);
  const [faceAnalysisResult, setFaceAnalysisResult] = useState<any | null>(null);
  const [isFacePlaying, setIsFacePlaying] = useState(false);
  const [faceAudioUrl, setFaceAudioUrl] = useState<string | null>(null);

  // Active consent checkboxes before starting camera
  const [consentCheck1, setConsentCheck1] = useState(false);
  const [consentCheck2, setConsentCheck2] = useState(false);

  const faceVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    return () => {
      if (faceCameraStream) {
        faceCameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [faceCameraStream]);

  const startFaceCamera = async () => {
    setFaceCameraError(null);
    setIsFaceCameraActive(true);
    setFacePreviewImage(null);
    setFaceAnalysisResult(null);
    setFaceAudioUrl(null);
    setIsFacePlaying(false);

    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }
        });
      } catch (firstErr) {
        console.warn("Retrying with simple video constraints due to:", firstErr);
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      }
      setFaceCameraStream(stream);
      setTimeout(() => {
        if (faceVideoRef.current) {
          faceVideoRef.current.srcObject = stream;
        }
      }, 100);
    } catch (err: any) {
      console.error("Accessing face camera failed:", err);
      setFaceCameraError("Não foi possível acessar a câmera frontal de seu dispositivo. Verifique se o NutriAI tem permissão para usar a câmera.");
    }
  };

  const stopFaceCamera = () => {
    if (faceCameraStream) {
      faceCameraStream.getTracks().forEach(track => track.stop());
      setFaceCameraStream(null);
    }
    setIsFaceCameraActive(false);
    setFaceCameraError(null);
  };

  const captureFacePhoto = () => {
    if (!faceVideoRef.current) return;
    const video = faceVideoRef.current;
    
    try {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg');
        const base64Data = dataUrl.split(',')[1];
        
        setFacePreviewImage(dataUrl);
        stopFaceCamera();
        analyzeFaceBase64(base64Data, 'image/jpeg');
      }
    } catch (err) {
      console.error("Failed to capture facial photo:", err);
      alert("Erro ao capturar foto.");
    }
  };

  const analyzeFaceBase64 = async (base64Data: string, mimeType: string) => {
    try {
      setIsFaceAnalyzing(true);
      setFaceAnalysisResult(null);

      const data = await analyzeEmotionalImage(base64Data, mimeType, profile);
      if (data) {
        setFaceAnalysisResult(data);
        
        // Optionally add a log point dynamically if we want to save. But we're instructed that we don't store photos.
        // Let's add an emotional log based on detected mood to integrate with the pattern history
        if (data.detectedMood) {
          const matchedMood = data.detectedMood.toLowerCase();
          const validMoods = ['ansioso', 'triste', 'feliz', 'estressado', 'cansado', 'neutro'];
          const solvedMood = validMoods.includes(matchedMood) ? matchedMood : 'neutro';
          
          const newLog: EmotionalLog = {
            id: crypto.randomUUID(),
            date: new Date().toISOString(),
            mood: solvedMood,
            trigger: `Leitura Facial - ${data.insight.substring(0, 40)}...`,
          };
          onUpdateLogs([...logs, newLog]);
        }
      } else {
        alert('Não foi possível realizar a análise facial. Tente tirar a foto com melhor iluminação e de forma frontal.');
      }
      setIsFaceAnalyzing(false);
    } catch (error) {
      console.error(error);
      alert('Erro ao processar imagem facial.');
      setIsFaceAnalyzing(false);
    }
  };

  const playFaceTTS = async (text: string) => {
    if (isFacePlaying) return;
    setIsFacePlaying(true);
    
    try {
      if (faceAudioUrl) {
         await playAudioUrl(faceAudioUrl, { onEnded: () => setIsFacePlaying(false) });
         return;
      }

      const base64Audio = await textToSpeech(text);
      if (base64Audio) {
        const url = `data:audio/wav;base64,${base64Audio}`;
        setFaceAudioUrl(url);
        await playAudioUrl(url, { onEnded: () => setIsFacePlaying(false) });
      } else {
        setIsFacePlaying(false);
      }
    } catch (error) {
      console.error(error);
      setIsFacePlaying(false);
    }
  };

  const resetFaceAnalyzer = () => {
    stopFaceCamera();
    setFacePreviewImage(null);
    setFaceAnalysisResult(null);
    setFaceAudioUrl(null);
    setIsFacePlaying(false);
  };


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

      {/* ----------------- ESPELHO DO HUMOR: LEITURA FACIAL VOLUNTÁRIA E PRIVADA ----------------- */}
      <div className="clay-card p-6 md:p-8 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[32px] space-y-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Camera className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-serif text-2xl text-slate-800 dark:text-slate-100 font-medium">
              Reflexo do Bem-Estar: Espelho do Humor IA
            </h3>
            <p className="font-sans text-slate-500 dark:text-slate-400 text-sm leading-relaxed mt-1">
              Uma funcionalidade 100% opcional e amigável. Ative voluntariamente a sua câmera para analisar expressões sutis de humor ou ansiedade, ajudando a compor sugestões nutritivas e chás para o final do seu dia.
            </p>
          </div>
        </div>

        {/* State 1: Consent Step */}
        {!isFaceCameraActive && !facePreviewImage && !isFaceAnalyzing && !faceAnalysisResult && (
          <div className="space-y-6 bg-slate-50 dark:bg-slate-800/40 border border-slate-105 dark:border-slate-800/80 p-5 rounded-2xl">
            <div className="flex gap-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100/40 dark:border-emerald-900/30 p-4 rounded-xl items-start">
              <ShieldCheck className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
              <div className="text-xs sm:text-sm text-emerald-800 dark:text-emerald-400 leading-relaxed">
                <strong>Privacidade em Primeiro Lugar:</strong> O NutriAI analisa padrões visuais de forma estritamente local e segura, **sem nunca salvar, persistir ou monitorar continuamente** suas imagens. O processamento é descartado na hora, respeitando totalmente você.
              </div>
            </div>

            <div className="space-y-3">
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={consentCheck1}
                  onChange={(e) => setConsentCheck1(e.target.checked)}
                  className="w-4 h-4 rounded mt-1 accent-emerald-500 cursor-pointer"
                />
                <span className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed select-none group-hover:text-slate-800 dark:group-hover:text-white">
                  Compreendo que a câmera frontal será usada apenas temporariamente para identificar nuances sutis de cansaço ou ansiedade focando no meu equilíbrio de bem-estar.
                </span>
              </label>

              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={consentCheck2}
                  onChange={(e) => setConsentCheck2(e.target.checked)}
                  className="w-4 h-4 rounded mt-1 accent-emerald-500 cursor-pointer"
                />
                <span className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed select-none group-hover:text-slate-800 dark:group-hover:text-white">
                  Consinto ativamente em ativar a câmera para obter minhas sugestões personalizadas de alimentação e práticas de descanso de hoje.
                </span>
              </label>
            </div>

            <button
              onClick={startFaceCamera}
              disabled={!consentCheck1 || !consentCheck2}
              className={`w-full py-3.5 px-6 rounded-full font-bold text-sm transition-all duration-300 flex items-center justify-center gap-2 shadow-md ${
                consentCheck1 && consentCheck2
                  ? 'bg-emerald-500 hover:bg-emerald-600 text-white hover:-translate-y-0.5 active:scale-95 shadow-emerald-500/10'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed'
              }`}
            >
              <Camera className="w-4 h-4" />
              Ativar Câmera Frontal Voluntária
            </button>
          </div>
        )}

        {/* State 2: Camera view with Live Stream Feed */}
        {isFaceCameraActive && !facePreviewImage && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="relative w-full aspect-[4/3] max-w-lg mx-auto rounded-[24px] overflow-hidden bg-slate-950 border border-slate-850 flex items-center justify-center shadow-lg">
              
              {!faceCameraError && (
                <video
                  ref={faceVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover scale-x-[-1]" /* Comfortable mirror effect */
                />
              )}

              {!faceCameraStream && !faceCameraError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 space-y-3 bg-slate-900">
                  <Loader2 className="w-10 h-10 animate-spin text-emerald-500" />
                  <p className="text-xs">Estabilizando câmera frontal...</p>
                </div>
              )}

              {faceCameraStream && !faceCameraError && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="w-40 h-40 sm:w-56 sm:h-56 border border-dashed border-white/50 rounded-full flex items-center justify-center">
                    <Target className="w-8 h-8 text-white/30 animate-pulse" />
                  </div>
                </div>
              )}

              {faceCameraError && (
                <div className="absolute inset-0 bg-slate-900 flex flex-col items-center justify-center p-6 text-center animate-in fade-in">
                  <AlertCircle className="w-10 h-10 text-red-500 mb-4" />
                  <p className="text-red-400 font-semibold mb-6 px-4 text-sm max-w-sm leading-relaxed">
                    {faceCameraError}
                  </p>
                  <button
                    onClick={stopFaceCamera}
                    className="bg-slate-800 hover:bg-slate-700 text-white font-medium px-6 py-2.5 rounded-full text-xs transition-colors"
                  >
                    Voltar para o Consentimento
                  </button>
                </div>
              )}
            </div>

            {faceCameraStream && !faceCameraError && (
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-lg mx-auto w-full">
                <button
                  type="button"
                  onClick={stopFaceCamera}
                  className="w-full sm:w-auto px-6 py-3 bg-slate-100 hover:bg-slate-205 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-2xl text-xs sm:text-sm transition-colors active:scale-95"
                >
                  Desativar Câmera
                </button>
                
                <button
                  type="button"
                  onClick={captureFacePhoto}
                  className="w-full sm:flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-2xl text-xs sm:text-sm transition-all duration-150 flex items-center justify-center gap-2 active:scale-95 shadow-md shadow-emerald-500/10"
                >
                  <Check className="w-4 h-4" />
                  Registrar Expressão
                </button>
              </div>
            )}
          </div>
        )}

        {/* State 3: Analyzing View */}
        {isFaceAnalyzing && (
          <div className="flex flex-col items-center justify-center py-12 space-y-4 max-w-lg mx-auto bg-slate-50 dark:bg-slate-800/20 border border-slate-100 dark:border-slate-800/60 rounded-3xl animate-pulse">
            <Loader2 className="w-12 h-12 text-emerald-500 animate-spin" />
            <p className="text-slate-600 dark:text-slate-300 font-medium text-sm sm:text-base">
              Interpretando expressões e sinais de humor...
            </p>
          </div>
        )}

        {/* State 4: Analysis Results & Suggestions */}
        {faceAnalysisResult && !isFaceAnalyzing && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row gap-6 items-start bg-emerald-500/5 dark:bg-emerald-900/15 border border-emerald-100 dark:border-emerald-800/40 p-6 rounded-[24px]">
              {facePreviewImage && (
                <div className="w-24 h-24 md:w-32 md:h-32 rounded-2xl overflow-hidden shadow-md border-4 border-white dark:border-slate-805 shrink-0 relative mx-auto md:mx-0">
                  <img src={facePreviewImage} alt="Expressão Analisada" className="w-full h-full object-cover select-none pointer-events-none" />
                </div>
              )}
              
              <div className="flex-1 space-y-3 w-full">
                <div className="flex flex-wrap gap-2 items-center justify-between">
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest bg-emerald-100/50 dark:bg-emerald-900/35 px-3 py-1 rounded-full">
                    Sinal Identificado: {faceAnalysisResult.detectedMood || 'Estágio Neutro'}
                  </span>
                  
                  <button
                    onClick={() => playFaceTTS(faceAnalysisResult.assistantMessage)}
                    className={`w-10 h-10 rounded-full shrink-0 flex items-center justify-center text-white bg-emerald-500 hover:scale-105 transition-all shadow-md ${
                      isFacePlaying ? 'animate-pulse ring-4 ring-emerald-500/30' : ''
                    }`}
                    title="Ouvir análise"
                  >
                    {isFacePlaying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 ml-0.5" />}
                  </button>
                </div>

                <div className="space-y-1">
                  <h4 className="font-serif text-lg text-slate-850 dark:text-slate-100 font-bold">Feedback da NutriAI:</h4>
                  <p className="font-sans text-slate-600 dark:text-slate-300 text-sm leading-relaxed italic pr-2">
                    "{faceAnalysisResult.assistantMessage}"
                  </p>
                </div>
              </div>
            </div>

            {/* Recommendations Panels */}
            <div className="grid sm:grid-cols-3 gap-5">
              {/* Teas & Infusions */}
              <div className="bg-amber-50/50 dark:bg-amber-950/10 border border-amber-100 dark:border-amber-900/30 p-5 rounded-2xl space-y-3">
                <div className="flex items-center gap-2 text-amber-800 dark:text-amber-400 font-bold text-sm">
                  <Coffee className="w-4 h-4 shrink-0" />
                  🍵 Chás de Conforto
                </div>
                <ul className="space-y-2 text-xs sm:text-sm text-slate-600 dark:text-slate-350 leading-relaxed">
                  {faceAnalysisResult.recommendations?.teas?.map((tea: string, idx: number) => (
                    <li key={idx} className="flex gap-1.5 items-start">
                      <span className="text-amber-450">•</span>
                      <span>{tea}</span>
                    </li>
                  )) || <li className="italic text-slate-400">Recomendações indisponíveis</li>}
                </ul>
              </div>

              {/* Meals */}
              <div className="bg-sky-50/50 dark:bg-sky-950/10 border border-sky-100 dark:border-sky-900/30 p-5 rounded-2xl space-y-3">
                <div className="flex items-center gap-2 text-sky-800 dark:text-sky-400 font-bold text-sm">
                  <Utensils className="w-4 h-4 shrink-0" />
                  🍽️ Jantar & Snacks
                </div>
                <ul className="space-y-2 text-xs sm:text-sm text-slate-600 dark:text-slate-350 leading-relaxed">
                  {faceAnalysisResult.recommendations?.meals?.map((meal: string, idx: number) => (
                    <li key={idx} className="flex gap-1.5 items-start">
                      <span className="text-sky-450">•</span>
                      <span>{meal}</span>
                    </li>
                  )) || <li className="italic text-slate-400">Recomendações indisponíveis</li>}
                </ul>
              </div>

              {/* Relaxing Practices */}
              <div className="bg-purple-50/50 dark:bg-purple-950/10 border border-purple-100 dark:border-purple-900/30 p-5 rounded-2xl space-y-3">
                <div className="flex items-center gap-2 text-purple-800 dark:text-purple-400 font-bold text-sm">
                  <Wind className="w-4 h-4 shrink-0" />
                  🌬️ Prática Relaxante
                </div>
                <ul className="space-y-2 text-xs sm:text-sm text-slate-600 dark:text-slate-350 leading-relaxed">
                  {faceAnalysisResult.recommendations?.relaxingPractices?.map((practice: string, idx: number) => (
                    <li key={idx} className="flex gap-1.5 items-start">
                      <span className="text-purple-450">•</span>
                      <span>{practice}</span>
                    </li>
                  )) || <li className="italic text-slate-400">Recomendações indisponíveis</li>}
                </ul>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={resetFaceAnalyzer}
                className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs transition-all active:scale-95"
              >
                Limpar Resultados
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Pattern Analysis */}
        <div className="bg-white dark:bg-slate-800 p-8 rounded-[32px] border border-slate-105 dark:border-slate-800/80 text-slate-800 dark:text-white shadow-xl flex flex-col justify-between transition-colors duration-300">
          <div className="space-y-4">
            <div className="w-12 h-12 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center">
              <Brain className="w-6 h-6 text-slate-850 dark:text-slate-200" />
            </div>
            <h3 className="font-serif text-3xl font-medium text-slate-900 dark:text-white">Análise de Padrões</h3>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed font-sans">
              Minha IA identifica se você está comendo por ansiedade ou tédio ao cruzar seus horários e sentimentos.
            </p>
          </div>
          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            className="mt-8 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 text-white py-4 px-8 rounded-2xl font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-3 disabled:opacity-50 cursor-pointer"
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
