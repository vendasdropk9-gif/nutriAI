import React, { useState, useRef, useEffect } from 'react';
import { Camera, Image as ImageIcon, Loader2, Sparkles, AlertCircle, RefreshCw, Activity, Volume2, Play, CheckCircle2, ShieldCheck, Heart, User, Droplet, Dumbbell, Upload, Target, X, HeartPulse } from 'lucide-react';
import { analyzeBodyImage, getGeneralBodyTips, textToSpeech } from '../lib/gemini';
import { playAudioUrl } from '../lib/speech';
import { UserProfile } from '../types';
import { BodySensorsMonitor } from './BodySensorsMonitor';

interface BodyAnalyzerProps {
  profile: UserProfile | null;
  onUpdateProfile?: (updated: Partial<UserProfile>) => void;
  onAwardPoints?: (amount: number, reason: string) => void;
}

export function BodyAnalyzer({ profile, onUpdateProfile, onAwardPoints }: BodyAnalyzerProps) {
  const [bodySubTab, setBodySubTab] = useState<'biometrics' | 'shape'>('biometrics');
  const [isScanning, setIsScanning] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<any | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

  const stopAudio = () => {
    setIsPlaying(false);
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

  const startCamera = async () => {
    setCameraError(null);
    setIsCameraActive(true);
    setPreviewImage(null);
    setAnalysisResult(null);
    stopAudio();

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
      setCameraStream(stream);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 100);
    } catch (err: any) {
      console.error("Accessing camera failed:", err);
      setCameraError("Não foi possível acessar a câmera frontal do dispositivo. Verifique se deu permissão.");
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setIsCameraActive(false);
    setCameraError(null);
  };

  const captureCameraPhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    
    try {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg');
        const base64Data = dataUrl.split(',')[1];
        
        setPreviewImage(dataUrl);
        stopCamera();
        analyzeCapturedBase64(base64Data, 'image/jpeg');
      }
    } catch (err) {
      console.error("Failed to capture picture from stream:", err);
      alert("Erro ao capturar imagem da câmera.");
    }
  };

  const analyzeCapturedBase64 = async (base64Data: string, mimeType: string) => {
    try {
      setIsScanning(true);
      setAnalysisResult(null);

      const data = await analyzeBodyImage(base64Data, mimeType, profile);
      if (data) {
        setAnalysisResult(data);
        if (onAwardPoints) onAwardPoints(100, 'Análise de evolução corporal concluída');
      } else {
        alert('Não foi possível realizar a análise. Tente novamente.');
      }
      setIsScanning(false);
    } catch (error) {
      console.error(error);
      alert('Erro ao processar a imagem do corpo.');
      setIsScanning(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      stopAudio();
      setAudioUrl(null);
      setIsScanning(true);
      setAnalysisResult(null);
      setIsCameraActive(false);
      
      const previewUrl = URL.createObjectURL(file);
      setPreviewImage(previewUrl);

      const reader = new FileReader();
      reader.onloadend = async () => {
        const result = reader.result as string;
        const base64Data = result.split(',')[1];
        const mimeType = file.type;

        analyzeCapturedBase64(base64Data, mimeType);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error(error);
      alert('Erro ao carregar imagem.');
      setIsScanning(false);
    }
  };

  const handleGeneralTips = async () => {
    stopAudio();
    stopCamera();
    setAudioUrl(null);
    setIsScanning(true);
    setAnalysisResult(null);
    setPreviewImage(null);

    const data = await getGeneralBodyTips(profile);
    if (data) {
      setAnalysisResult(data);
      if (onAwardPoints) onAwardPoints(50, 'Dicas gerais de bem-estar consultadas');
    } else {
      alert('Não foi possível gerar dicas. Tente novamente.');
    }
    setIsScanning(false);
  };

  const resetAnalyzer = () => {
    stopAudio();
    stopCamera();
    setPreviewImage(null);
    setAnalysisResult(null);
    setAudioUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700 pb-16 px-2 sm:px-4">
      
      {/* Premium sub-tab top navigation controls */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center mb-8 pb-6 border-b border-slate-150 dark:border-slate-800">
        <div className="text-center sm:text-left">
          <span className="font-mono text-[10px] text-emerald-500 font-bold uppercase tracking-widest block">Portal Clínico Corporal</span>
          <h3 className="font-sans font-bold text-slate-800 dark:text-slate-100 text-sm">Selecione a abordagem corporal por sensoriamento eletrônico</h3>
        </div>
        <div className="flex p-1 bg-slate-100 dark:bg-slate-800/60 rounded-2xl border border-slate-200/50 dark:border-slate-700/30 w-full sm:w-auto">
          <button
            onClick={() => setBodySubTab('biometrics')}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all ${
              bodySubTab === 'biometrics'
                ? 'bg-white dark:bg-slate-800 shadow-sm text-emerald-600 dark:text-emerald-400'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            🩺 Biometria e Sensores
          </button>
          <button
            onClick={() => setBodySubTab('shape')}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all ${
              bodySubTab === 'shape'
                ? 'bg-white dark:bg-slate-800 shadow-sm text-emerald-600 dark:text-emerald-400'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            📐 Evolução do Shape (Fotos)
          </button>
        </div>
      </div>

      {bodySubTab === 'biometrics' ? (
        <BodySensorsMonitor 
          profile={profile} 
          onUpdateProfile={onUpdateProfile || (() => {})} 
          onAwardPoints={onAwardPoints} 
        />
      ) : (
        <>
          <div className="text-center space-y-4 mb-12">
            <h2 className="font-serif text-4xl md:text-5xl font-medium tracking-tight text-emerald-700 dark:text-emerald-400">
              Clínica Corporal e Evolução
            </h2>
            <p className="font-sans text-slate-500 dark:text-slate-400 max-w-xl mx-auto text-lg leading-relaxed">
              Nossa IA avalia sua forma de maneira neutra e confidencial para sugerir ajustes na sua jornada. 100% privado e opcional.
            </p>
          </div>

          <div className="clay-card p-6 md:p-8 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 rounded-[32px]">
            
            {/* State 1: Selection - Live Camera, Photo Upload or Recommendations only */}
            {!previewImage && !isScanning && !analysisResult && !isCameraActive && (
          <div className="space-y-8 animate-in fade-in duration-300">
            <div className="bg-emerald-50 dark:bg-emerald-900/10 rounded-[24px] p-6 border border-emerald-100 dark:border-emerald-800/30 flex items-start gap-4">
              <ShieldCheck className="w-8 h-8 text-emerald-600 mt-1 shrink-0" />
              <div>
                <h4 className="font-bold text-emerald-800 dark:text-emerald-400 text-lg mb-1">Privacidade Garantida</h4>
                <p className="text-emerald-700/80 dark:text-emerald-400/80 text-sm">
                  Sua foto não é salva ou compartilhada. O processamento é feito em tempo real para gerar dicas e depois a imagem é descartada. Você também pode receber dicas sem enviar foto.
                </p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div 
                className="flex flex-col items-center justify-center p-8 md:p-12 border-2 border-dashed border-emerald-300 dark:border-emerald-700/50 bg-white/50 dark:bg-slate-800/50 rounded-[24px] hover:bg-emerald-50 dark:hover:bg-slate-800 transition-all group"
              >
                <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                  <Camera className="w-8 h-8" />
                </div>
                <h4 className="text-slate-800 dark:text-white font-bold text-lg mb-3">Análise por Foto</h4>
                <p className="text-slate-500 dark:text-slate-400 text-center text-xs sm:text-sm mb-6 max-w-xs leading-relaxed">
                  Tire uma foto frontal com roupas de treino ou envie da galeria para receber recomendações de evolução.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-3 w-full justify-center">
                  <button
                    onClick={startCamera}
                    className="flex-1 py-2.5 px-4 bg-emerald-500 hover:bg-emerald-600 text-white font-sans font-medium text-xs rounded-full transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-95 hover:-translate-y-0.5 duration-200"
                  >
                    <Camera className="w-4 h-4" />
                    Tirar Foto
                  </button>

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-705 text-slate-750 dark:text-slate-200 font-sans font-medium text-xs rounded-full transition-all flex items-center justify-center gap-1.5 active:scale-95 hover:-translate-y-0.5 duration-200"
                  >
                    <Upload className="w-4 h-4" />
                    Enviar Foto
                  </button>
                </div>
              </div>

              <div 
                className="flex flex-col items-center justify-center p-8 md:p-12 border-2 border-slate-200 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/50 rounded-[24px] hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer group animate-in fade-in duration-300"
                onClick={handleGeneralTips}
              >
                <div className="w-16 h-16 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                  <Sparkles className="w-8 h-8" />
                </div>
                <h4 className="text-slate-800 dark:text-white font-bold text-lg mb-3">Dicas Gerais</h4>
                <p className="text-slate-500 dark:text-slate-400 text-center text-xs sm:text-sm leading-relaxed max-w-xs">
                  Prefiro não utilizar foto neste momento, mas quero orientações inteligentes da NutriAI com base no meu objetivo atual.
                </p>
              </div>
            </div>

            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              ref={fileInputRef}
              className="hidden"
            />
          </div>
        )}

        {/* State 1.5: Front-facing/Webcam Live Stream Preview */}
        {isCameraActive && !previewImage && (
          <div className="flex flex-col items-center justify-center space-y-6 w-full animate-in fade-in duration-350">
            <div className="relative w-full aspect-[4/3] md:aspect-video rounded-[24px] overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center shadow-inner">
              
              {!cameraError && (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover scale-x-[-1]" /* Mirrored for intuitive selfie view */
                />
              )}

              {!cameraStream && !cameraError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 space-y-3 bg-slate-900">
                  <Loader2 className="w-10 h-10 animate-spin text-emerald-500" />
                  <p className="text-sm">Iniciando câmera frontal...</p>
                </div>
              )}

              {cameraStream && !cameraError && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="w-48 h-48 sm:w-64 sm:h-64 border border-dashed border-white/40 rounded-full flex items-center justify-center animate-pulse">
                    <Target className="w-8 h-8 text-white/30" />
                  </div>
                </div>
              )}

              {cameraError && (
                <div className="absolute inset-0 bg-slate-900 flex flex-col items-center justify-center p-6 text-center animate-in fade-in">
                  <p className="text-red-400 font-semibold mb-6 px-4 text-sm max-w-md leading-relaxed">
                    {cameraError}
                  </p>
                  <button
                    onClick={stopCamera}
                    className="bg-slate-800 hover:bg-slate-705 text-white font-medium px-6 py-2.5 rounded-full text-xs transition-all active:scale-95 shadow-md"
                  >
                    Voltar para Seleção
                  </button>
                </div>
              )}
            </div>

            {cameraStream && !cameraError && (
              <div className="relative flex items-center justify-center w-full px-4 h-20">
                <button
                  type="button"
                  onClick={stopCamera}
                  className="absolute left-0 sm:left-4 bg-slate-100 hover:bg-slate-205 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium px-4 py-2 sm:px-5 sm:py-2.5 rounded-full transition-colors flex items-center gap-1.5 text-xs sm:text-sm shadow-sm active:scale-95"
                >
                  Cancelar
                </button>
                
                <button
                  type="button"
                  onClick={captureCameraPhoto}
                  className="w-16 h-16 rounded-full bg-white border-4 border-slate-200 dark:border-slate-800 flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all duration-150"
                  title="Capturar Foto"
                >
                  <div className="w-12 h-12 rounded-full bg-emerald-500 hover:bg-emerald-600 transition-colors flex items-center justify-center">
                    <Camera className="w-5 h-5 text-white" />
                  </div>
                </button>
              </div>
            )}
          </div>
        )}

        {/* State 2: Scanning / Processing Model */}
        {isScanning && (
          <div className="relative w-full aspect-[4/3] md:aspect-video rounded-[24px] overflow-hidden bg-emerald-100 flex items-center justify-center border border-white/60 animate-in fade-in duration-300">
            {previewImage && <img src={previewImage} alt="Análise Corporal" className="absolute inset-0 w-full h-full object-cover blur-[4px] opacity-70" />}
            <div className={`absolute inset-0 flex flex-col items-center justify-center z-10 ${previewImage ? 'bg-emerald-900/60 backdrop-blur-sm text-white' : 'bg-slate-50 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400'}`}>
              <Loader2 className="w-12 h-12 animate-spin mb-4" />
              <p className="text-lg font-medium">{previewImage ? 'Analisando forma e evolução...' : 'Buscando recomendações personalizadas...'}</p>
            </div>
            
            {previewImage && (
              <div className="absolute top-0 left-0 right-0 h-2 bg-emerald-400 shadow-[0_0_20px_#34d399] z-20 animate-[scan_2s_ease-in-out_infinite]"></div>
            )}
          </div>
        )}

        {/* State 3: Analysis Done & Results Layout */}
        {analysisResult && !isScanning && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
            
            <div className="flex flex-col md:flex-row gap-6 items-start clay-card p-6 bg-white dark:bg-slate-800 border-none shadow-xl rounded-[24px]">
              {previewImage ? (
                 <div className="w-32 h-32 md:w-48 md:h-48 shrink-0 rounded-[20px] overflow-hidden shadow-lg border-4 border-white dark:border-slate-700 relative mx-auto md:mx-0">
                    <img src={previewImage} alt="Sua Análise" className="w-full h-full object-cover opacity-90" />
                 </div>
              ) : (
                 <div className="w-24 h-24 shrink-0 rounded-full bg-emerald-100 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-500 shadow-inner mx-auto md:mx-0">
                    <User className="w-12 h-12" />
                 </div>
              )}
              
              <div className="flex-1 space-y-4 w-full">
                <div className="flex items-start gap-4">
                  <button
                    onClick={() => playTTS(analysisResult.assistantMessage)}
                    className={`w-12 h-12 rounded-full shrink-0 flex items-center justify-center text-white bg-emerald-500 hover:scale-105 transition-all shadow-md mt-1 ${isPlaying ? 'animate-pulse ring-4 ring-emerald-500/30' : ''}`}
                    title="Ouvir análise"
                  >
                    {isPlaying ? <Volume2 className="w-5 h-5" /> : <Play className="w-5 h-5 ml-1" />}
                  </button>
                  <div className="pt-1 flex-1">
                    <h4 className="font-serif text-xl text-slate-800 dark:text-slate-100 font-medium mb-2">Mensagem do Treinador:</h4>
                    <p className="font-sans text-slate-600 dark:text-slate-300 text-base md:text-lg leading-relaxed italic border-l-4 border-emerald-500 pl-4 bg-slate-50 dark:bg-slate-850/40 py-2 rounded-r-lg">
                      "{analysisResult.assistantMessage}"
                    </p>
                  </div>
                </div>
              </div>
              <div className="shrink-0 w-full md:w-auto pt-2 flex justify-end">
                 <button
                  onClick={resetAnalyzer}
                  className="bg-slate-100 dark:bg-slate-700 hover:bg-slate-205 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 px-6 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 w-full md:w-auto shadow-sm"
                >
                  <RefreshCw className="w-4 h-4" />
                  Reiniciar
                </button>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-orange-50/50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-850 rounded-[24px] p-6 shadow-sm">
                 <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-xl flex items-center justify-center">
                       <Heart className="w-5 h-5" />
                    </div>
                    <h5 className="font-bold text-orange-800 dark:text-orange-400">Nutrição</h5>
                 </div>
                 <ul className="space-y-3">
                    {analysisResult.recommendations?.food?.map((tip: string, idx: number) => (
                      <li key={idx} className="flex gap-2 text-slate-600 dark:text-slate-300 text-sm">
                         <span className="text-orange-400 mt-1 shrink-0">•</span>
                         <span className="leading-relaxed">{tip}</span>
                      </li>
                    ))}
                 </ul>
              </div>

              <div className="bg-blue-50/50 dark:bg-blue-900/10 border border-blue-105 dark:border-blue-850 rounded-[24px] p-6 shadow-sm">
                 <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center">
                       <Droplet className="w-5 h-5" />
                    </div>
                    <h5 className="font-bold text-blue-800 dark:text-blue-400">Rotina & Hidratação</h5>
                 </div>
                 <ul className="space-y-3">
                    {analysisResult.recommendations?.hydration?.map((tip: string, idx: number) => (
                      <li key={idx} className="flex gap-2 text-slate-600 dark:text-slate-300 text-sm">
                         <span className="text-blue-400 mt-1 shrink-0">•</span>
                         <span className="leading-relaxed">{tip}</span>
                      </li>
                    ))}
                 </ul>
              </div>

              <div className="bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-850 rounded-[24px] p-6 shadow-sm">
                 <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center">
                       <Dumbbell className="w-5 h-5" />
                    </div>
                    <h5 className="font-bold text-indigo-800 dark:text-indigo-400">Exercícios</h5>
                 </div>
                 <ul className="space-y-3">
                    {analysisResult.recommendations?.exercise?.map((tip: string, idx: number) => (
                      <li key={idx} className="flex gap-2 text-slate-600 dark:text-slate-300 text-sm">
                         <span className="text-indigo-400 mt-1 shrink-0">•</span>
                         <span className="leading-relaxed">{tip}</span>
                      </li>
                    ))}
                 </ul>
              </div>
            </div>

            {analysisResult.manipulationDetected && (
               <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 p-4 rounded-xl flex items-start gap-4 animate-in slide-in-from-bottom-2">
                  <AlertCircle className="w-6 h-6 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-amber-800 dark:text-amber-300 text-sm leading-relaxed">
                    Notei alguns detalhes na imagem que parecem sugerir filtros ou manipulação de imagem. Para a saúde real das emoções e do corpo, evite se comparar com padrões irreais, seja de redes sociais, ou da própria foto. Caso sinta que a percepção do seu corpo está te prejudicando emocionalmente, uma avaliação com um profissional psicólogo pode ser uma excelente e cuidadosa escolha nesse momento!
                  </p>
               </div>
            )}
            
          </div>
        )}
          </div>
        </>
      )}
    </div>
  );
}
