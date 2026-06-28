import React, { useState, useRef } from 'react';
import { Camera, Upload, Loader2, Target, CheckCircle2, RefreshCw, Brain } from 'lucide-react';
import { analyzePlate } from '../lib/gemini';
import { speak } from '../lib/speech';
import { PlateAnalysisResult, UserProfile } from '../types';

interface PlateAnalyzerProps {
  profile?: UserProfile | null;
  onAwardPoints?: (amount: number, reason: string) => void;
}

export function PlateAnalyzer({ profile, onAwardPoints }: PlateAnalyzerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<PlateAnalysisResult | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  React.useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
      stopAudio();
    };
  }, [cameraStream]);

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    window.speechSynthesis?.cancel();
    setIsPlaying(false);
  };

  const playTTS = async (text: string) => {
    setIsPlaying(true);
    const result = await speak(text, {
      onEnded: () => setIsPlaying(false),
      onError: () => setIsPlaying(false)
    });
    
    if (result.method === 'gemini' && result.audio) {
      audioRef.current = result.audio;
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
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
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
      let userFriendlyMsg = "Não foi possível acessar a câmera do dispositivo. Verifique se deu permissão de acesso.";
      if (err.name === 'NotFoundError' || err.message?.toLowerCase().includes('device not found') || err.message?.toLowerCase().includes('requested device')) {
        userFriendlyMsg = "Câmera de vídeo física não encontrada ou indisponível neste dispositivo. Por favor, faça upload de uma foto do seu prato utilizando a opção manual abaixo.";
      }
      setCameraError(userFriendlyMsg);
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

      const data = await analyzePlate(base64Data, mimeType, profile);
      if (data) {
        setAnalysisResult(data);
        if (data.assistantMessage) {
          playTTS(data.assistantMessage);
        }
        if (onAwardPoints) onAwardPoints(50, 'Análise de prato via foto concluída');
      } else {
        alert('Não foi possível analisar a imagem.');
      }
      setIsScanning(false);
    } catch (error) {
      console.error(error);
      alert('Erro ao analisar a imagem.');
      setIsScanning(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      stopAudio();
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

  const resetScanner = () => {
    stopAudio();
    stopCamera();
    setPreviewImage(null);
    setAnalysisResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700 pb-16 px-2 sm:px-4">
      <div className="text-center space-y-4 mb-10">
        <h2 className="font-serif text-3xl md:text-5xl font-medium tracking-tight text-emerald-700 dark:text-emerald-400">
          Análise de Prato
        </h2>
        <p className="font-sans text-slate-500 dark:text-slate-400 max-w-xl mx-auto text-base md:text-lg leading-relaxed">
          Tire uma foto do seu prato e a Inteligência Artificial fará a leitura nutricional para você na hora.
        </p>
      </div>

      <div className="clay-card p-4 sm:p-8 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
        
        {/* State 1: Selection Buttons */}
        {!previewImage && !isCameraActive && (
          <div className="flex flex-col items-center justify-center p-6 sm:p-12 border-2 border-dashed border-emerald-300 dark:border-emerald-700/50 bg-emerald-50/50 dark:bg-slate-800/50 rounded-[24px]">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mb-6">
              <Camera className="w-8 h-8 sm:w-10 sm:h-10" />
            </div>
            <p className="text-slate-600 dark:text-slate-300 font-medium mb-6 text-center max-w-md text-sm sm:text-base">
              Deseja escanear seu prato usando a câmera ao vivo agora ou enviando um arquivo?
            </p>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              ref={fileInputRef}
              className="hidden"
            />
            
            <div className="flex flex-col sm:flex-row gap-4 w-full justify-center max-w-md">
              <button
                onClick={startCamera}
                className="bg-emerald-500 hover:bg-emerald-600 text-white font-sans font-medium px-6 py-3.5 sm:px-8 sm:py-4 rounded-full transition-all duration-300 flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 hover:-translate-y-0.5 text-sm sm:text-base"
              >
                <Camera className="w-5 h-5" />
                Ativar Câmera ao Vivo
              </button>
              
              <button
                onClick={() => fileInputRef.current?.click()}
                className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-sans font-medium px-6 py-3.5 sm:px-8 sm:py-4 rounded-full transition-all duration-300 flex items-center justify-center gap-2 hover:-translate-y-0.5 text-sm sm:text-base"
              >
                <Upload className="w-5 h-5" />
                Carregar Arquivo
              </button>
            </div>
          </div>
        )}

        {/* State 2: Live Camera View */}
        {isCameraActive && !previewImage && (
          <div className="flex flex-col items-center justify-center space-y-6 w-full">
            <div className="relative w-full aspect-[4/3] md:aspect-video rounded-[24px] overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center shadow-inner">
              
              {!cameraError && (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
              )}

              {!cameraStream && !cameraError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 space-y-3 bg-slate-900">
                  <Loader2 className="w-10 h-10 animate-spin text-emerald-500" />
                  <p className="text-sm">Iniciando câmera...</p>
                </div>
              )}

              {cameraStream && !cameraError && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="w-48 h-48 sm:w-64 sm:h-64 border-2 border-dashed border-white/50 rounded-full flex items-center justify-center">
                    <div className="w-24 h-24 sm:w-32 sm:h-32 border border-dashed border-white/30 rounded-full flex items-center justify-center">
                      <Target className="w-8 h-8 text-white/40 animate-pulse" />
                    </div>
                  </div>
                  <div className="absolute top-6 left-6 w-6 h-6 border-t-2 border-l-2 border-white/70 rounded-tl-lg"></div>
                  <div className="absolute top-6 right-6 w-6 h-6 border-t-2 border-r-2 border-white/70 rounded-tr-lg"></div>
                  <div className="absolute bottom-6 left-6 w-6 h-6 border-b-2 border-l-2 border-white/70 rounded-bl-lg"></div>
                  <div className="absolute bottom-6 right-6 w-6 h-6 border-b-2 border-r-2 border-white/70 rounded-br-lg"></div>
                </div>
              )}

              {cameraError && (
                <div className="absolute inset-0 bg-slate-900 flex flex-col items-center justify-center p-6 text-center">
                  <div className="w-14 h-14 rounded-full bg-red-950 flex items-center justify-center text-red-400 mb-4 animate-bounce">
                    <Camera className="w-7 h-7" />
                  </div>
                  <p className="text-slate-200 font-medium max-w-sm mx-auto mb-6 text-sm">
                    {cameraError}
                  </p>
                  <button
                    onClick={stopCamera}
                    className="bg-slate-800 hover:bg-slate-700 text-white font-medium px-6 py-2.5 rounded-full text-sm transition-colors"
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
                  className="absolute left-0 sm:left-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium px-4 py-2 sm:px-5 sm:py-2.5 rounded-full transition-colors flex items-center gap-1.5 text-xs sm:text-sm shadow-sm"
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

        {/* State 3: Scanning / Processing */}
        {previewImage && isScanning && (
          <div className="relative w-full aspect-[4/3] md:aspect-video rounded-[24px] overflow-hidden bg-emerald-100 flex items-center justify-center border border-white/60">
            <img src={previewImage} alt="Prato" className="absolute inset-0 w-full h-full object-cover blur-[2px]" />
            <div className="absolute inset-0 bg-emerald-900/40 backdrop-blur-sm flex flex-col items-center justify-center text-white z-10">
              <Loader2 className="w-12 h-12 animate-spin mb-4 text-emerald-300" />
              <p className="text-lg font-medium">Analisando nutrientes...</p>
            </div>
            
            {/* Animated Scanner Line */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-400 shadow-[0_0_15px_#34d399] z-20 animate-[scan_2s_ease-in-out_infinite]"></div>
          </div>
        )}

        {previewImage && !analysisResult && !isScanning && (
          <div className="flex flex-col items-center justify-center p-6 sm:p-12 border-2 border-dashed border-red-300 dark:border-red-800/50 bg-red-50/50 dark:bg-red-900/10 rounded-[24px]">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mb-6">
              <RefreshCw className="w-8 h-8 sm:w-10 sm:h-10" />
            </div>
            <p className="text-slate-600 dark:text-slate-300 font-medium mb-6 text-center max-w-md text-sm sm:text-base">
              Houve um problema ao processar a imagem do prato.
            </p>
            <button
              onClick={resetScanner}
              className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-sans font-medium px-6 py-3.5 sm:px-8 sm:py-4 rounded-full transition-all duration-300 flex items-center justify-center gap-2 hover:-translate-y-0.5 text-sm sm:text-base"
            >
              <RefreshCw className="w-5 h-5" />
              Tentar Novamente
            </button>
          </div>
        )}

        {/* State 4: Analysis Done */}
        {previewImage && analysisResult && !isScanning && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
            {/* Top section: small image + assistant message */}
            <div className="flex flex-col md:flex-row gap-6 items-center clay-card p-4 sm:p-6 w-full">
              <div className="w-32 h-32 md:w-48 md:h-48 shrink-0 rounded-[16px] overflow-hidden shadow-md">
                <img src={previewImage} alt="Seu prato" className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 space-y-4 w-full">
                <div className="flex items-start gap-3 sm:gap-4 w-full">
                  <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full shrink-0 flex items-center justify-center bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 ${isPlaying ? 'animate-pulse ring-4 ring-emerald-200 dark:ring-emerald-700/50' : ''}`}>
                    <Target className="w-5 h-5 sm:w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-serif text-lg sm:text-xl text-slate-800 dark:text-slate-100 font-medium mb-1">Assistente diz:</h4>
                    <p className="font-sans text-slate-600 dark:text-slate-300 text-sm sm:text-base md:text-lg leading-relaxed italic break-words">
                      "{analysisResult.assistantMessage}"
                    </p>
                    <div className="mt-4 flex items-center gap-2 text-xs sm:text-sm text-emerald-600 dark:text-emerald-400 font-medium animate-pulse">
                       <Brain className="w-4 h-4" />
                       <span>Como você se sente após essa refeição? Registre na aba "Mente".</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="shrink-0 flex flex-col md:flex-row gap-3 w-full md:w-auto">
                 <button
                  onClick={resetScanner}
                  className="bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600/50 px-6 py-3 rounded-full font-medium transition-all shadow-sm flex items-center justify-center gap-2 text-sm w-full md:w-auto"
                >
                  <RefreshCw className="w-4 h-4" />
                  Nova Foto
                </button>
              </div>
            </div>

            {/* NutriScore Section */}
            <div className={`rounded-[24px] p-6 sm:p-8 text-white shadow-xl relative overflow-hidden flex flex-col md:flex-row items-center gap-6 sm:gap-8 ${
               analysisResult.nutriScore >= 80 
                 ? 'bg-gradient-to-r from-emerald-500 to-teal-600'
                 : analysisResult.nutriScore >= 50
                   ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                   : 'bg-gradient-to-r from-rose-500 to-red-600'
            }`}>
               <div className="absolute top-0 right-0 opacity-10 translate-x-4 -translate-y-4 pointer-events-none">
                  <Target className="w-48 h-48" />
               </div>
               
               <div className="relative shrink-0 text-center">
                  <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full bg-white/20 backdrop-blur-md border-4 border-white/40 flex items-center justify-center flex-col shadow-inner">
                     <span className="text-4xl sm:text-5xl font-black font-serif tracking-tighter">
                        {analysisResult.nutriScore}
                     </span>
                     <span className="text-sm sm:text-base font-bold uppercase tracking-widest text-white/80">
                        /100
                     </span>
                  </div>
               </div>

               <div className="relative z-10 flex-1 space-y-3 text-center md:text-left">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 rounded-full text-xs font-bold uppercase tracking-wider backdrop-blur-md mb-2">
                     <Target className="w-4 h-4" /> NutriScore
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-serif font-black tracking-tight leading-tight">
                    Avaliação da sua refeição
                  </h3>
                  <p className="text-white/90 text-sm sm:text-base md:text-lg leading-relaxed font-medium">
                    {analysisResult.nutriScoreExplanation}
                  </p>
               </div>
            </div>

            {/* Nutrients Grid */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4">
              <div className="bg-orange-50 dark:bg-orange-950/20 p-4 sm:p-6 rounded-[20px] text-center border border-orange-100/50 dark:border-orange-950/30 hover:-translate-y-1 transition-transform">
                <p className="text-orange-500 font-medium text-xs sm:text-sm mb-1 uppercase tracking-wider">Calorias</p>
                <p className="text-2xl sm:text-3xl font-serif text-orange-700 dark:text-orange-400">{analysisResult.nutrition.calories} <span className="text-base sm:text-lg text-orange-400 font-sans">kcal</span></p>
              </div>
              <div className="bg-red-50 dark:bg-red-950/20 p-4 sm:p-6 rounded-[20px] text-center border border-red-100/50 dark:border-red-950/30 hover:-translate-y-1 transition-transform">
                <p className="text-red-500 font-medium text-xs sm:text-sm mb-1 uppercase tracking-wider">Proteína</p>
                <p className="text-2xl sm:text-3xl font-serif text-red-700 dark:text-red-400">{analysisResult.nutrition.protein} <span className="text-base sm:text-lg text-red-400 font-sans">g</span></p>
              </div>
              <div className="bg-amber-50 dark:bg-amber-950/20 p-4 sm:p-6 rounded-[20px] text-center border border-amber-100/50 dark:border-amber-950/30 hover:-translate-y-1 transition-transform">
                <p className="text-amber-500 font-medium text-xs sm:text-sm mb-1 uppercase tracking-wider">Carbo.</p>
                <p className="text-2xl sm:text-3xl font-serif text-amber-700 dark:text-amber-400">{analysisResult.nutrition.carbs} <span className="text-base sm:text-lg text-amber-400 font-sans">g</span></p>
              </div>
              <div className="bg-yellow-50 dark:bg-yellow-950/10 p-4 sm:p-6 rounded-[20px] text-center border border-yellow-105-0/50 dark:border-yellow-950/30 hover:-translate-y-1 transition-transform">
                <p className="text-yellow-600 dark:text-yellow-500 font-medium text-xs sm:text-sm mb-1 uppercase tracking-wider">Gorduras</p>
                <p className="text-2xl sm:text-3xl font-serif text-yellow-800 dark:text-yellow-400">{analysisResult.nutrition.fat} <span className="text-base sm:text-lg text-yellow-500 font-sans">g</span></p>
              </div>
              <div className="bg-green-50 dark:bg-green-950/20 p-4 sm:p-6 rounded-[20px] text-center border border-green-100/50 dark:border-green-950/30 hover:-translate-y-1 transition-transform col-span-2 md:col-span-1">
                <p className="text-green-500 font-medium text-xs sm:text-sm mb-1 uppercase tracking-wider">Fibras</p>
                <p className="text-2xl sm:text-3xl font-serif text-green-700 dark:text-green-400">{analysisResult.nutrition.fiber} <span className="text-base sm:text-lg text-green-400 font-sans">g</span></p>
              </div>
            </div>

            {/* Details Section */}
            <div className="grid md:grid-cols-2 gap-6 sm:gap-8">
              <div className="bg-white/60 dark:bg-slate-800/60 p-4 sm:p-6 rounded-[24px] border border-white dark:border-slate-700/50">
                <h4 className="font-serif text-lg sm:text-xl text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
                  Alimentos Identificados
                </h4>
                <ul className="space-y-3">
                  {analysisResult.foods.map((food, idx) => (
                    <li key={idx} className="flex items-center gap-3 text-slate-600 dark:text-slate-300 bg-white/40 dark:bg-slate-700/40 p-3 rounded-xl border border-slate-100 dark:border-slate-600/50">
                      <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                      <span className="font-medium text-sm sm:text-base">{food}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-emerald-50/50 dark:bg-emerald-900/20 p-4 sm:p-6 rounded-[24px] border border-emerald-100/50 dark:border-emerald-800/30">
                <h4 className="font-serif text-lg sm:text-xl text-emerald-800 dark:text-emerald-400 mb-4 flex items-center gap-2">
                  <Target className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
                  Sugestões da Assistente
                </h4>
                <ul className="space-y-4">
                  {analysisResult.suggestions.map((sug, idx) => (
                    <li key={idx} className="text-emerald-700 dark:text-emerald-300 bg-white/60 dark:bg-slate-800/60 p-4 rounded-2xl border border-emerald-100/40 dark:border-emerald-800/30 text-sm sm:text-base leading-relaxed shadow-sm">
                      {sug}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            
          </div>
        )}
      </div>

    </div>
  );
}
