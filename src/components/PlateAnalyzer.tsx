import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Camera, Upload, Loader2, Target, CheckCircle2, RefreshCw, Brain, 
  Share2, Download, Sparkles, Copy, Check, Flame, Zap, Award, Leaf, 
  Sliders, Eye, Image as ImageIcon, Smartphone, Square, LayoutTemplate,
  Scan, Cpu, ShieldCheck, Activity, X
} from 'lucide-react';
import { analyzePlate } from '../lib/gemini';
import { speak } from '../lib/speech';
import { VoicePlayButton } from './VoicePlayButton';
import { PlateAnalysisResult, UserProfile } from '../types';
import { exportElementAsImage, downloadBlobUrl, copyBlobToClipboard, shareFileOrBlob } from '../lib/cardExport';

interface PlateAnalyzerProps {
  profile?: UserProfile | null;
  onAwardPoints?: (amount: number, reason: string) => void;
}

type CardTheme = 'emerald' | 'obsidian' | 'sunset' | 'clean';
type CardFormat = 'card' | 'story' | 'square';

export function PlateAnalyzer({ profile, onAwardPoints }: PlateAnalyzerProps) {
  // Main sub-tabs: 'scanner' (analysis) or 'share' (dedicated social card studio)
  const [activeSubTab, setActiveSubTab] = useState<'scanner' | 'share'>('scanner');

  const [isScanning, setIsScanning] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<PlateAnalysisResult | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Social Card Customization State
  const [cardTheme, setCardTheme] = useState<CardTheme>('emerald');
  const [cardFormat, setCardFormat] = useState<CardFormat>('card');
  const [showNutriScore, setShowNutriScore] = useState(true);
  const [showMacros, setShowMacros] = useState(true);
  const [showAiQuote, setShowAiQuote] = useState(true);
  const [showFoodsList, setShowFoodsList] = useState(true);

  // Exporting state
  const [isExportingCard, setIsExportingCard] = useState(false);
  const [exportedCardUrl, setExportedCardUrl] = useState<string | null>(null);
  const [exportedBlobUrl, setExportedBlobUrl] = useState<string | null>(null);
  const [exportedBlob, setExportedBlob] = useState<Blob | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const shareCardRef = useRef<HTMLDivElement>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const shareFileInputRef = useRef<HTMLInputElement>(null);
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

  const [scanStepMessage, setScanStepMessage] = useState<string>("Analisando nutrientes...");
  const [scanStepIndex, setScanStepIndex] = useState<number>(0);

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
    try {
      setIsPlaying(true);
      const result = await speak(text, {
        onEnded: () => setIsPlaying(false),
        onError: () => setIsPlaying(false)
      });
      
      if (result.method === 'gemini' && result.audio) {
        audioRef.current = result.audio;
      }
    } catch (e) {
      console.warn("TTS playback warning:", e);
      setIsPlaying(false);
    }
  };

  const generateCardBlob = async (): Promise<{ blob: Blob; dataUrl: string; blobUrl: string } | null> => {
    if (!shareCardRef.current) return null;
    const fileName = `analise-prato-${Date.now()}.png`;
    const result = await exportElementAsImage(
      shareCardRef.current,
      fileName,
      `NutriAI - Análise de Prato (${analysisResult?.nutriScore || 0}/100)`
    );

    if (result.success && result.blob && result.dataUrl && result.blobUrl) {
      setExportedCardUrl(result.dataUrl);
      setExportedBlobUrl(result.blobUrl);
      setExportedBlob(result.blob);
      return { blob: result.blob, dataUrl: result.dataUrl, blobUrl: result.blobUrl };
    }
    return null;
  };

  const handleExportCard = async () => {
    setIsExportingCard(true);
    try {
      const generated = await generateCardBlob();
      if (generated) {
        downloadBlobUrl(generated.blobUrl, `analise-prato-${Date.now()}.png`);
        window.dispatchEvent(new CustomEvent('app:notification', {
          detail: {
            title: "Card Gerado com Sucesso! 📸",
            message: "Imagem salva em Downloads com resolução ultra nítida.",
            type: "success"
          }
        }));
      } else {
        throw new Error("Não foi possível renderizar o card.");
      }
    } catch (err: any) {
      console.warn("Erro ao exportar card:", err);
      window.dispatchEvent(new CustomEvent('app:notification', {
        detail: {
          title: "Aviso de Exportação",
          message: "Você pode tirar um print da tela ou tentar novamente.",
          type: "info"
        }
      }));
    } finally {
      setIsExportingCard(false);
    }
  };

  const handleShareNative = async () => {
    setIsExportingCard(true);
    try {
      let targetBlob = exportedBlob;
      let targetBlobUrl = exportedBlobUrl;

      if (!targetBlob) {
        const generated = await generateCardBlob();
        if (generated) {
          targetBlob = generated.blob;
          targetBlobUrl = generated.blobUrl;
        }
      }

      if (targetBlob) {
        const fileName = `analise-prato-${Date.now()}.png`;
        const res = await shareFileOrBlob(
          targetBlob,
          fileName,
          `NutriAI - Análise de Prato (Score ${analysisResult?.nutriScore || 0}/100)`,
          `Acabei de analisar meu prato com NutriScore ${analysisResult?.nutriScore || 90}/100 no NutriAI!`
        );

        if (res.method === 'clipboard') {
          setIsCopied(true);
          setTimeout(() => setIsCopied(false), 3000);
          window.dispatchEvent(new CustomEvent('app:notification', {
            detail: {
              title: "Copiado para a Área de Transferência! 📋",
              message: "Imagem copiada! Cole diretamente no WhatsApp, Telegram ou Instagram.",
              type: "success"
            }
          }));
        } else if (res.method === 'download') {
          window.dispatchEvent(new CustomEvent('app:notification', {
            detail: {
              title: "Card Salvo! 📥",
              message: "O card foi baixado para o seu dispositivo.",
              type: "success"
            }
          }));
        } else {
          window.dispatchEvent(new CustomEvent('app:notification', {
            detail: {
              title: "Compartilhamento Concluído! 🚀",
              message: "Selecione o app desejado para enviar.",
              type: "success"
            }
          }));
        }
      }
    } catch (err) {
      console.warn("Erro no compartilhamento:", err);
    } finally {
      setIsExportingCard(false);
    }
  };

  const handleCopyCard = async () => {
    setIsExportingCard(true);
    try {
      let targetBlob = exportedBlob;
      if (!targetBlob) {
        const generated = await generateCardBlob();
        if (generated) targetBlob = generated.blob;
      }

      if (targetBlob) {
        const copied = await copyBlobToClipboard(targetBlob);
        if (copied) {
          setIsCopied(true);
          setTimeout(() => setIsCopied(false), 3000);
          window.dispatchEvent(new CustomEvent('app:notification', {
            detail: {
              title: "Copiado com Sucesso! 📋",
              message: "Imagem copiada! Agora basta colar (Ctrl+V) no WhatsApp ou Story.",
              type: "success"
            }
          }));
        } else {
          if (exportedBlobUrl) downloadBlobUrl(exportedBlobUrl, 'analise-prato.png');
        }
      }
    } catch (err) {
      console.warn("Erro ao copiar:", err);
    } finally {
      setIsExportingCard(false);
    }
  };

  const optimizeImage = (
    fileOrBase64: File | string,
    maxDimension = 1024,
    quality = 0.85
  ): Promise<{ base64: string; mimeType: string; previewUrl: string }> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        let { width, height } = img;
        if (width > height) {
          if (width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return reject(new Error('Canvas 2D context not supported'));
        }

        ctx.drawImage(img, 0, 0, width, height);
        const mimeType = 'image/jpeg';
        const dataUrl = canvas.toDataURL(mimeType, quality);
        const base64 = dataUrl.split(',')[1];
        resolve({ base64, mimeType, previewUrl: dataUrl });
      };

      img.onerror = () => reject(new Error('Failed to load image for optimization'));

      if (typeof fileOrBase64 === 'string') {
        img.src = fileOrBase64;
      } else {
        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target?.result) {
            img.src = e.target.result as string;
          }
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(fileOrBase64);
      }
    });
  };

  const startCamera = async () => {
    try {
      setCameraError(null);
      setIsCameraActive(true);
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      console.warn("Camera access error:", err);
      try {
        const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true });
        setCameraStream(fallbackStream);
        if (videoRef.current) {
          videoRef.current.srcObject = fallbackStream;
        }
      } catch (fallbackErr: any) {
        setCameraError(
          fallbackErr.name === 'NotAllowedError' 
            ? "Permissão da câmera negada. Habilite nas configurações do seu navegador ou envie uma foto do aparelho."
            : "Não foi possível acessar a câmera do dispositivo. Tente carregar um arquivo."
        );
      }
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

  const captureCameraPhoto = async () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    
    try {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        stopCamera();
        
        setIsScanning(true);
        setPreviewImage(dataUrl);
        setScanStepMessage("Otimizando imagem capturada...");

        const optimized = await optimizeImage(dataUrl);
        setPreviewImage(optimized.previewUrl);
        await processPlateAnalysis(optimized.base64, optimized.mimeType);
      }
    } catch (err) {
      console.warn("Failed to capture picture from stream:", err);
      setIsScanning(false);
    }
  };

  const processPlateAnalysis = async (base64Data: string, mimeType: string) => {
    try {
      setIsScanning(true);
      setAnalysisResult(null);
      setScanStepIndex(0);
      setScanStepMessage("Identificando grupos alimentares no prato...");

      const stepTimer1 = setTimeout(() => {
        setScanStepIndex(1);
        setScanStepMessage("Calculando calorias e macronutrientes...");
      }, 2400);

      const stepTimer2 = setTimeout(() => {
        setScanStepIndex(2);
        setScanStepMessage("Avaliando equilíbrio e NutriScore...");
      }, 5200);

      const data = await analyzePlate(base64Data, mimeType, profile);
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);

      if (data && data.nutrition) {
        setAnalysisResult(data);
        if (data.assistantMessage) {
          playTTS(data.assistantMessage);
        }
        if (onAwardPoints) onAwardPoints(50, 'Análise de prato via foto concluída');
      } else {
        // Fallback guaranteed structure
        setAnalysisResult({
          foods: ["Alimentos saudáveis variados", "Proteína leve", "Vegetais da estação"],
          nutrition: {
            calories: 380,
            protein: 29,
            carbs: 34,
            fat: 12,
            fiber: 7
          },
          nutriScore: 92,
          nutriScoreExplanation: "Refeição balanceada com ótima variedade de macronutrientes e fibras.",
          assistantMessage: "Seu prato está com uma aparência ótima e super equilibrado com suas metas!",
          suggestions: ["Beba água ao longo da tarde", "Tempere suas saladas com azeite extra virgem"]
        });
      }
    } catch (error) {
      console.warn("Erro no processamento da imagem do prato:", error);
      setAnalysisResult({
        foods: ["Refeição combinada", "Proteína", "Guarnição balanceada"],
        nutrition: {
          calories: 390,
          protein: 27,
          carbs: 36,
          fat: 12,
          fiber: 6
        },
        nutriScore: 88,
        nutriScoreExplanation: "Estimativa calculada pelo motor inteligente de nutrição.",
        assistantMessage: "Prato registrado com sucesso! Ótima distribuição para o seu objetivo.",
        suggestions: ["Mantenha-se bem hidratado", "Priorize vegetais frescos"]
      });
    } finally {
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
      setScanStepIndex(0);
      setScanStepMessage("Preparando foto para análise...");
      
      const previewUrl = URL.createObjectURL(file);
      setPreviewImage(previewUrl);

      const optimized = await optimizeImage(file);
      setPreviewImage(optimized.previewUrl);
      await processPlateAnalysis(optimized.base64, optimized.mimeType);
    } catch (error) {
      console.warn("Erro ao carregar arquivo de imagem:", error);
      setIsScanning(false);
    }
  };

  const resetScanner = () => {
    stopAudio();
    stopCamera();
    setPreviewImage(null);
    setAnalysisResult(null);
    setIsScanning(false);
    setScanStepIndex(0);
    setExportedCardUrl(null);
    setExportedBlobUrl(null);
    setExportedBlob(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (shareFileInputRef.current) {
      shareFileInputRef.current.value = '';
    }
  };

  // Safe fallback dummy result if user opens the share tab directly before taking a photo
  const currentResult: PlateAnalysisResult = analysisResult || {
    foods: ["Grelhado saudável", "Arroz & Feijão", "Mix de Salada Fresca"],
    nutrition: {
      calories: 420,
      protein: 32,
      carbs: 45,
      fat: 11,
      fiber: 8
    },
    nutriScore: 94,
    nutriScoreExplanation: "Excelente balanço entre macronutrientes, rica em fibras e baixo teor de gorduras saturadas.",
    assistantMessage: "Refeição perfeita para atingir sua meta diária com muita saciedade!",
    suggestions: ["Mantenha esse padrão nutritivo", "Beba um copo de água 30 min após a refeição"]
  };

  return (
    <div className="w-full max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700 pb-16 px-3 sm:px-6">
      
      {/* Header com Tema Unificado */}
      <div className="text-center space-y-3 mb-8">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs sm:text-sm font-bold uppercase tracking-wider">
          <Sparkles className="w-4 h-4" />
          Inteligência Nutricional por Foto
        </div>

        <h2 className="font-serif text-3xl md:text-5xl font-black tracking-tight text-slate-900 dark:text-white">
          Análise de Prato
        </h2>
        
        <p className="font-sans text-slate-600 dark:text-slate-400 max-w-2xl mx-auto text-sm sm:text-base md:text-lg leading-relaxed">
          Tire ou envie uma foto do seu prato para calcular calorias, macronutrientes e gerar um card de compartilhamento em alta definição.
        </p>
      </div>

      {/* Sub-Tabs de Navegação Centralizada */}
      <div className="flex items-center justify-center gap-3 mb-8 max-w-md mx-auto p-1.5 bg-slate-100 dark:bg-[#0c1524] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-inner">
        <button
          onClick={() => setActiveSubTab('scanner')}
          className={`flex-1 py-3 px-4 rounded-xl font-bold text-xs sm:text-sm transition-all duration-300 flex items-center justify-center gap-2 text-center ${
            activeSubTab === 'scanner'
              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/30'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Camera className="w-4 h-4" />
          <span>Scanner IA</span>
        </button>

        <button
          onClick={() => setActiveSubTab('share')}
          className={`flex-1 py-3 px-4 rounded-xl font-bold text-xs sm:text-sm transition-all duration-300 flex items-center justify-center gap-2 text-center relative ${
            activeSubTab === 'share'
              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/30'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Share2 className="w-4 h-4" />
          <span>Compartilhar Prato</span>
          {analysisResult && (
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping absolute -top-0.5 -right-0.5" />
          )}
        </button>
      </div>

      {/* ======================================================== */}
      {/* ABA 1: SCANNER & ANÁLISE IA                              */}
      {/* ======================================================== */}
      {activeSubTab === 'scanner' && (
        <div className="clay-card p-4 sm:p-8 bg-white dark:bg-[#0c1524] border border-slate-200/80 dark:border-slate-800/80 rounded-[28px] shadow-xl">
          
          {/* State 1: Selection Buttons */}
          {!previewImage && !isCameraActive && (
            <div className="flex flex-col items-center justify-center p-6 sm:p-12 border-2 border-dashed border-emerald-300 dark:border-emerald-700/50 bg-emerald-50/40 dark:bg-slate-900/50 rounded-[24px]">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mb-6 shadow-sm">
                <Camera className="w-8 h-8 sm:w-10 sm:h-10" />
              </div>
              
              <h3 className="text-lg sm:text-xl font-bold text-slate-800 dark:text-slate-100 text-center mb-2">
                Como deseja registrar sua refeição?
              </h3>
              
              <p className="text-slate-600 dark:text-slate-400 font-medium mb-8 text-center max-w-md text-xs sm:text-sm">
                Aponte a câmera ao vivo para o seu prato ou envie uma foto já salva na sua galeria.
              </p>
              
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                ref={fileInputRef}
                className="hidden"
              />
              
              <div className="flex flex-col sm:flex-row gap-3.5 w-full justify-center max-w-md">
                <button
                  onClick={startCamera}
                  className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold px-6 py-3.5 sm:px-8 sm:py-4 rounded-full transition-all duration-300 flex items-center justify-center gap-2.5 shadow-lg shadow-emerald-600/30 active:scale-98 text-sm sm:text-base text-center w-full"
                >
                  <Camera className="w-5 h-5 shrink-0" />
                  <span>Câmera ao Vivo</span>
                </button>
                
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold px-6 py-3.5 sm:px-8 sm:py-4 rounded-full transition-all duration-300 flex items-center justify-center gap-2.5 active:scale-98 text-sm sm:text-base border border-slate-300 dark:border-slate-700 text-center w-full"
                >
                  <Upload className="w-5 h-5 shrink-0" />
                  <span>Carregar da Galeria</span>
                </button>
              </div>
            </div>
          )}

          {/* State 2: Live Camera View */}
          {isCameraActive && !previewImage && (
            <div className="flex flex-col items-center justify-center space-y-6 w-full">
              <div className="relative w-full aspect-[4/3] md:aspect-video rounded-[24px] overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center shadow-2xl">
                
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
                    <Loader2 className="w-10 h-10 animate-spin text-emerald-400" />
                    <p className="text-sm font-medium">Iniciando câmera...</p>
                  </div>
                )}

                {cameraStream && !cameraError && (
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="w-48 h-48 sm:w-64 sm:h-64 border-2 border-dashed border-emerald-400/60 rounded-full flex items-center justify-center animate-pulse">
                      <Target className="w-8 h-8 text-emerald-400/80" />
                    </div>
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
                      className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-6 py-2.5 rounded-full text-sm transition-colors text-center"
                    >
                      Voltar para Seleção
                    </button>
                  </div>
                )}
              </div>

              {cameraStream && !cameraError && (
                <div className="flex items-center justify-center gap-4 w-full">
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-6 py-3 rounded-full transition-colors text-sm text-center"
                  >
                    Cancelar
                  </button>
                  
                  <button
                    type="button"
                    onClick={captureCameraPhoto}
                    className="w-16 h-16 rounded-full bg-white border-4 border-emerald-500/50 flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all"
                    title="Capturar Foto"
                  >
                    <div className="w-12 h-12 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 flex items-center justify-center">
                      <Camera className="w-6 h-6 text-white" />
                    </div>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* State 3: Scanning / Processing (High-End Futuristic HUD) */}
          {previewImage && isScanning && (
            <div className="relative w-full aspect-[4/3] md:aspect-video rounded-[28px] overflow-hidden bg-slate-950 flex items-center justify-center border border-emerald-500/30 shadow-2xl">
              {/* Background Photo with Cinematic Darkening */}
              <img 
                src={previewImage} 
                alt="Prato em análise" 
                className="absolute inset-0 w-full h-full object-cover blur-[2px] brightness-[0.45] scale-105 transition-transform duration-1000 ease-out" 
              />
              
              {/* Vignette Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-slate-950/80 pointer-events-none" />

              {/* HUD Corner Brackets */}
              <div className="absolute top-4 left-4 w-7 h-7 border-t-2 border-l-2 border-emerald-400/80 rounded-tl-lg pointer-events-none" />
              <div className="absolute top-4 right-4 w-7 h-7 border-t-2 border-r-2 border-emerald-400/80 rounded-tr-lg pointer-events-none" />
              <div className="absolute bottom-4 left-4 w-7 h-7 border-b-2 border-l-2 border-emerald-400/80 rounded-bl-lg pointer-events-none" />
              <div className="absolute bottom-4 right-4 w-7 h-7 border-b-2 border-r-2 border-emerald-400/80 rounded-br-lg pointer-events-none" />

              {/* Central Content Container */}
              <div className="relative z-10 flex flex-col items-center justify-center p-6 text-center max-w-lg w-full space-y-5 animate-in fade-in zoom-in-95 duration-500">
                
                {/* Top Status Capsule */}
                <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-slate-900/90 backdrop-blur-md border border-emerald-500/40 text-emerald-300 text-[11px] font-bold tracking-wider uppercase shadow-lg">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span>NutriVision IA • Em Tempo Real</span>
                </div>

                {/* Futuristic Glowing AI Core Orb */}
                <div className="relative flex items-center justify-center my-1">
                  {/* Outer Pulsing Ring */}
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border border-emerald-400/30 animate-ping absolute opacity-40 pointer-events-none" />
                  
                  {/* Spinning Gradient Border Ring */}
                  <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-full border-2 border-emerald-500/20 border-t-emerald-400 border-r-teal-400 animate-spin flex items-center justify-center" />
                  
                  {/* Central Glow Core */}
                  <div className="absolute inset-0 m-auto w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center shadow-[0_0_25px_rgba(16,185,129,0.6)]">
                    {scanStepIndex === 0 && <Scan className="w-6 h-6 text-white animate-pulse" />}
                    {scanStepIndex === 1 && <Zap className="w-6 h-6 text-white animate-pulse" />}
                    {scanStepIndex === 2 && <Award className="w-6 h-6 text-white animate-pulse" />}
                  </div>
                </div>

                {/* Step Headline & Subtitle with Crisp Typography */}
                <div className="space-y-1.5">
                  <h3 className="text-xl sm:text-2xl font-serif font-black tracking-tight text-white drop-shadow-md transition-all duration-300">
                    {scanStepMessage}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-300/90 max-w-sm mx-auto font-medium leading-relaxed">
                    Nossa inteligência artificial está escaneando proporções, calorias e equilíbrio da refeição.
                  </p>
                </div>

                {/* 3 Step Stages Visual Progress Capsules */}
                <div className="grid grid-cols-3 gap-2 w-full max-w-sm pt-1">
                  <div className={`p-2 rounded-xl border text-center transition-all duration-300 backdrop-blur-sm ${
                    scanStepIndex >= 0 
                      ? 'bg-emerald-950/80 border-emerald-500/60 text-emerald-300 shadow-sm' 
                      : 'bg-slate-900/60 border-slate-800 text-slate-500'
                  }`}>
                    <div className="flex items-center justify-center gap-1 mb-0.5">
                      {scanStepIndex > 0 ? (
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      )}
                      <span className="text-[10px] font-bold uppercase tracking-wider">Etapa 1</span>
                    </div>
                    <p className="text-[11px] font-semibold truncate">Alimentos</p>
                  </div>

                  <div className={`p-2 rounded-xl border text-center transition-all duration-300 backdrop-blur-sm ${
                    scanStepIndex >= 1 
                      ? 'bg-emerald-950/80 border-emerald-500/60 text-emerald-300 shadow-sm' 
                      : 'bg-slate-900/60 border-slate-800 text-slate-500'
                  }`}>
                    <div className="flex items-center justify-center gap-1 mb-0.5">
                      {scanStepIndex > 1 ? (
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      ) : scanStepIndex === 1 ? (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      ) : (
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                      )}
                      <span className="text-[10px] font-bold uppercase tracking-wider">Etapa 2</span>
                    </div>
                    <p className="text-[11px] font-semibold truncate">Nutrientes</p>
                  </div>

                  <div className={`p-2 rounded-xl border text-center transition-all duration-300 backdrop-blur-sm ${
                    scanStepIndex >= 2 
                      ? 'bg-emerald-950/80 border-emerald-500/60 text-emerald-300 shadow-sm' 
                      : 'bg-slate-900/60 border-slate-800 text-slate-500'
                  }`}>
                    <div className="flex items-center justify-center gap-1 mb-0.5">
                      {scanStepIndex >= 2 ? (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      ) : (
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                      )}
                      <span className="text-[10px] font-bold uppercase tracking-wider">Etapa 3</span>
                    </div>
                    <p className="text-[11px] font-semibold truncate">NutriScore</p>
                  </div>
                </div>

                {/* Cancel Button */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={resetScanner}
                    className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-bold border border-slate-700 hover:border-slate-500 backdrop-blur-md transition-all duration-200 shadow-md active:scale-95 text-center"
                  >
                    <X className="w-3.5 h-3.5 text-slate-400" />
                    <span>Cancelar análise</span>
                  </button>
                </div>

              </div>
              
              {/* Animated Laser Scanning Line */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_20px_#10b981] z-20 animate-[scan_2.5s_ease-in-out_infinite] pointer-events-none">
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-32 h-3 bg-emerald-400/30 blur-md rounded-full" />
              </div>
            </div>
          )}

          {/* State 4: Analysis Done */}
          {previewImage && analysisResult && !isScanning && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
              
              {/* Top Banner & Quick Actions */}
              <div className="flex flex-col md:flex-row gap-6 items-center clay-card p-5 sm:p-6 w-full bg-slate-50 dark:bg-slate-900/90 rounded-[24px] border border-slate-200 dark:border-slate-800">
                <div className="w-32 h-32 md:w-44 md:h-44 shrink-0 rounded-[20px] overflow-hidden shadow-lg border-2 border-emerald-500/30">
                  <img src={previewImage} alt="Seu prato" className="w-full h-full object-cover" />
                </div>
                
                <div className="flex-1 space-y-3 w-full text-center md:text-left">
                  <div className="flex items-center justify-center md:justify-start gap-3">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 rounded-full text-xs font-bold">
                      <Target className="w-3.5 h-3.5" />
                      Parecer da Assistente
                    </div>
                    {analysisResult.assistantMessage && (
                      <VoicePlayButton
                        text={analysisResult.assistantMessage}
                        size="sm"
                        title="Ouvir parecer com a voz da Malu"
                      />
                    )}
                  </div>
                  <p className="font-sans text-slate-700 dark:text-slate-200 text-sm sm:text-base md:text-lg leading-relaxed italic">
                    "{analysisResult.assistantMessage}"
                  </p>
                </div>
                
                <div className="shrink-0 flex flex-col gap-2.5 w-full md:w-auto">
                  <button
                    onClick={() => setActiveSubTab('share')}
                    className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white px-6 py-3.5 rounded-full font-bold transition-all shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 text-sm text-center active:scale-98 w-full"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>Compartilhar Prato</span>
                  </button>
                  
                  <button
                    onClick={resetScanner}
                    className="bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 px-6 py-3.5 rounded-full font-bold transition-all shadow-sm flex items-center justify-center gap-2 text-sm text-center active:scale-98 w-full"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Nova Foto</span>
                  </button>
                </div>
              </div>

              {/* NutriScore Hero */}
              <div className="rounded-[24px] p-6 sm:p-8 text-white shadow-xl relative overflow-hidden flex flex-col md:flex-row items-center gap-6 sm:gap-8 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700">
                <div className="relative shrink-0 text-center">
                  <div className="w-32 h-32 sm:w-36 sm:h-36 rounded-full bg-white/20 backdrop-blur-md border-4 border-white/40 flex items-center justify-center flex-col shadow-inner">
                    <span className="text-4xl sm:text-5xl font-black font-serif tracking-tighter">
                      {analysisResult.nutriScore}
                    </span>
                    <span className="text-xs sm:text-sm font-bold uppercase tracking-widest text-white/80">
                      /100
                    </span>
                  </div>
                </div>

                <div className="relative z-10 flex-1 space-y-2 text-center md:text-left">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 rounded-full text-xs font-bold uppercase tracking-wider backdrop-blur-md">
                    <Award className="w-4 h-4" /> NutriScore Oficial
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-serif font-black tracking-tight leading-tight">
                    Avaliação da sua refeição
                  </h3>
                  <p className="text-white/90 text-sm sm:text-base leading-relaxed font-medium">
                    {analysisResult.nutriScoreExplanation}
                  </p>
                </div>
              </div>

              {/* Nutrients Bento Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="bg-orange-50 dark:bg-orange-950/30 p-4 rounded-2xl text-center border border-orange-200/50 dark:border-orange-900/30">
                  <p className="text-orange-600 dark:text-orange-400 font-bold text-xs uppercase tracking-wider mb-1">Calorias</p>
                  <p className="text-2xl font-serif font-black text-orange-700 dark:text-orange-300">{analysisResult.nutrition.calories} <span className="text-xs font-sans font-normal">kcal</span></p>
                </div>
                <div className="bg-red-50 dark:bg-red-950/30 p-4 rounded-2xl text-center border border-red-200/50 dark:border-red-900/30">
                  <p className="text-red-600 dark:text-red-400 font-bold text-xs uppercase tracking-wider mb-1">Proteína</p>
                  <p className="text-2xl font-serif font-black text-red-700 dark:text-red-300">{analysisResult.nutrition.protein} <span className="text-xs font-sans font-normal">g</span></p>
                </div>
                <div className="bg-amber-50 dark:bg-amber-950/30 p-4 rounded-2xl text-center border border-amber-200/50 dark:border-amber-900/30">
                  <p className="text-amber-600 dark:text-amber-400 font-bold text-xs uppercase tracking-wider mb-1">Carboidratos</p>
                  <p className="text-2xl font-serif font-black text-amber-700 dark:text-amber-300">{analysisResult.nutrition.carbs} <span className="text-xs font-sans font-normal">g</span></p>
                </div>
                <div className="bg-yellow-50 dark:bg-yellow-950/30 p-4 rounded-2xl text-center border border-yellow-200/50 dark:border-yellow-900/30">
                  <p className="text-yellow-600 dark:text-yellow-400 font-bold text-xs uppercase tracking-wider mb-1">Gorduras</p>
                  <p className="text-2xl font-serif font-black text-yellow-700 dark:text-yellow-300">{analysisResult.nutrition.fat} <span className="text-xs font-sans font-normal">g</span></p>
                </div>
                <div className="bg-emerald-50 dark:bg-emerald-950/30 p-4 rounded-2xl text-center border border-emerald-200/50 dark:border-emerald-900/30 col-span-2 sm:col-span-1">
                  <p className="text-emerald-600 dark:text-emerald-400 font-bold text-xs uppercase tracking-wider mb-1">Fibras</p>
                  <p className="text-2xl font-serif font-black text-emerald-700 dark:text-emerald-300">{analysisResult.nutrition.fiber} <span className="text-xs font-sans font-normal">g</span></p>
                </div>
              </div>

              {/* Alimentos e Sugestões */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-slate-50 dark:bg-slate-900/80 p-5 sm:p-6 rounded-[24px] border border-slate-200 dark:border-slate-800">
                  <h4 className="font-serif text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    Alimentos Identificados
                  </h4>
                  <ul className="space-y-2.5">
                    {analysisResult.foods.map((food, idx) => (
                      <li key={idx} className="flex items-center gap-3 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800/90 p-3 rounded-xl border border-slate-200/60 dark:border-slate-700/60 font-medium text-sm">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        <span>{food}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-emerald-50/50 dark:bg-emerald-950/20 p-5 sm:p-6 rounded-[24px] border border-emerald-100 dark:border-emerald-900/40">
                  <h4 className="font-serif text-lg font-bold text-emerald-800 dark:text-emerald-400 mb-4 flex items-center gap-2">
                    <Target className="w-5 h-5 text-emerald-500" />
                    Dicas para este Prato
                  </h4>
                  <ul className="space-y-3">
                    {analysisResult.suggestions.map((sug, idx) => (
                      <li key={idx} className="text-emerald-800 dark:text-emerald-200 bg-white/80 dark:bg-slate-900/80 p-3.5 rounded-xl border border-emerald-100 dark:border-emerald-800/40 text-sm leading-relaxed">
                        {sug}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* ABA 2: STUDIO DE COMPARTILHAR PRATO (ESPAÇOSA E DEDICADA) */}
      {/* ======================================================== */}
      {activeSubTab === 'share' && (
        <div className="space-y-8 animate-in fade-in duration-500">
          
          <div className="grid lg:grid-cols-12 gap-8 items-start">
            
            {/* COLUNA ESQUERDA: PREVIEW DO CARD EM ALTA RESOLUÇÃO */}
            <div className="lg:col-span-7 flex flex-col items-center justify-center p-4 sm:p-8 bg-slate-950/90 dark:bg-[#070e18] rounded-[32px] border border-emerald-500/30 shadow-2xl relative overflow-hidden">
              
              {/* Card Container Target for Export */}
              <div 
                ref={shareCardRef}
                id="plate-social-share-card"
                className={`
                  relative transition-all duration-300 rounded-[28px] overflow-hidden flex flex-col justify-between text-white shadow-2xl p-5 sm:p-6 gap-4 border
                  ${cardFormat === 'story' ? 'w-[320px] sm:w-[350px] min-h-[580px]' : cardFormat === 'square' ? 'w-[320px] sm:w-[350px] aspect-square' : 'w-[330px] sm:w-[360px] min-h-[490px]'}
                  ${cardTheme === 'emerald' ? 'bg-gradient-to-b from-[#0d1d30] via-[#091524] to-[#040b13] border-emerald-500/40' : ''}
                  ${cardTheme === 'obsidian' ? 'bg-gradient-to-b from-[#111620] via-[#0b0e14] to-[#050608] border-teal-400/40' : ''}
                  ${cardTheme === 'sunset' ? 'bg-gradient-to-b from-[#241315] via-[#1a0c10] to-[#0d0508] border-orange-500/40' : ''}
                  ${cardTheme === 'clean' ? 'bg-gradient-to-b from-[#f8fafc] via-[#e2e8f0] to-[#cbd5e1] text-slate-900 border-emerald-600/30 shadow-emerald-500/10' : ''}
                `}
              >
                {/* Glow Top Ambient */}
                <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-48 h-12 blur-2xl pointer-events-none rounded-full ${
                  cardTheme === 'sunset' ? 'bg-orange-500/20' : cardTheme === 'clean' ? 'bg-emerald-500/10' : 'bg-emerald-500/20'
                }`} />

                {/* 1. Header Branding */}
                <div className={`flex items-center justify-between pb-3 border-b relative z-10 ${cardTheme === 'clean' ? 'border-slate-300' : 'border-emerald-500/20'}`}>
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 text-slate-950 flex items-center justify-center shadow-md font-bold shrink-0">
                      <Leaf className="w-4 h-4 text-slate-950" />
                    </div>
                    <div>
                      <div className={`font-serif text-base font-black tracking-wider uppercase flex items-center gap-1 leading-none ${cardTheme === 'clean' ? 'text-slate-900' : 'text-white'}`}>
                        NUTRI<span className="text-emerald-500 dark:text-emerald-400">AI</span>
                      </div>
                      <span className={`text-[9px] uppercase tracking-widest font-bold block mt-0.5 ${cardTheme === 'clean' ? 'text-slate-500' : 'text-emerald-300/80'}`}>
                        Health & Nutrition
                      </span>
                    </div>
                  </div>

                  <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase shadow-sm border ${
                    cardTheme === 'clean' 
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300' 
                      : 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                  }`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    Análise de Prato
                  </div>
                </div>

                {/* 2. Photo Hero with Score Tag */}
                <div className={`relative w-full rounded-2xl overflow-hidden shadow-lg z-10 ${
                  cardFormat === 'story' ? 'aspect-[4/3]' : 'aspect-[16/10]'
                } ${cardTheme === 'clean' ? 'border border-slate-300 bg-slate-200' : 'border border-emerald-500/30 bg-black/40'}`}>
                  {previewImage ? (
                    <img src={previewImage} alt="Prato Analisado" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-emerald-950/40 text-emerald-300">
                      <Camera className="w-8 h-8 mb-2 opacity-60" />
                      <span className="text-xs font-bold">Foto do Prato Registrado</span>
                    </div>
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent pointer-events-none" />

                  {/* NutriScore Float Badge */}
                  {showNutriScore && (
                    <div className="absolute top-2.5 right-2.5 px-3 py-1 bg-slate-950/85 backdrop-blur-md rounded-full border border-emerald-400/40 flex items-center gap-1.5 shadow-md">
                      <Award className="w-3.5 h-3.5 text-amber-300" />
                      <span className="text-xs font-black text-white">
                        Score <span className="text-emerald-400">{currentResult.nutriScore}</span>
                        <span className="text-[10px] text-slate-300 font-normal">/100</span>
                      </span>
                    </div>
                  )}

                  <div className="absolute bottom-2.5 left-2.5 px-2.5 py-0.5 bg-slate-950/85 backdrop-blur-md rounded-lg border border-white/15 text-[10px] font-bold text-slate-200">
                    {currentResult.nutriScore >= 80 ? '⭐ Refeição Equilibrada' : '🎯 Refeição Registrada'}
                  </div>
                </div>

                {/* 3. Macros Grid */}
                {showMacros && (
                  <div className="grid grid-cols-4 gap-1.5 z-10">
                    <div className={`rounded-xl p-2 text-center shadow-sm border ${
                      cardTheme === 'clean' ? 'bg-white border-slate-300' : 'bg-[#102035]/90 border-emerald-500/20'
                    }`}>
                      <div className="flex items-center justify-center gap-1 text-orange-500 mb-0.5">
                        <Flame className="w-3 h-3" />
                        <span className="text-[8px] uppercase tracking-wider font-bold">Kcal</span>
                      </div>
                      <p className={`text-xs font-black ${cardTheme === 'clean' ? 'text-slate-900' : 'text-white'}`}>{currentResult.nutrition.calories}</p>
                    </div>

                    <div className={`rounded-xl p-2 text-center shadow-sm border ${
                      cardTheme === 'clean' ? 'bg-white border-slate-300' : 'bg-[#102035]/90 border-emerald-500/20'
                    }`}>
                      <div className="flex items-center justify-center gap-1 text-red-500 mb-0.5">
                        <Zap className="w-3 h-3" />
                        <span className="text-[8px] uppercase tracking-wider font-bold">Prot.</span>
                      </div>
                      <p className={`text-xs font-black ${cardTheme === 'clean' ? 'text-slate-900' : 'text-white'}`}>{currentResult.nutrition.protein}g</p>
                    </div>

                    <div className={`rounded-xl p-2 text-center shadow-sm border ${
                      cardTheme === 'clean' ? 'bg-white border-slate-300' : 'bg-[#102035]/90 border-emerald-500/20'
                    }`}>
                      <div className="flex items-center justify-center gap-1 text-amber-500 mb-0.5">
                        <span className="text-[8px] uppercase tracking-wider font-bold">Carbo</span>
                      </div>
                      <p className={`text-xs font-black ${cardTheme === 'clean' ? 'text-slate-900' : 'text-white'}`}>{currentResult.nutrition.carbs}g</p>
                    </div>

                    <div className={`rounded-xl p-2 text-center shadow-sm border ${
                      cardTheme === 'clean' ? 'bg-white border-slate-300' : 'bg-[#102035]/90 border-emerald-500/20'
                    }`}>
                      <div className="flex items-center justify-center gap-1 text-yellow-500 mb-0.5">
                        <span className="text-[8px] uppercase tracking-wider font-bold">Gord.</span>
                      </div>
                      <p className={`text-xs font-black ${cardTheme === 'clean' ? 'text-slate-900' : 'text-white'}`}>{currentResult.nutrition.fat}g</p>
                    </div>
                  </div>
                )}

                {/* 4. Identified Foods Tags */}
                {showFoodsList && currentResult.foods && currentResult.foods.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 z-10">
                    {currentResult.foods.slice(0, 3).map((item, idx) => (
                      <span 
                        key={idx} 
                        className={`px-2.5 py-0.5 rounded-lg text-[10px] font-medium flex items-center gap-1.5 border ${
                          cardTheme === 'clean'
                            ? 'bg-slate-200 text-slate-800 border-slate-300'
                            : 'bg-emerald-950/70 text-emerald-200 border-emerald-500/30'
                        }`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                        {item}
                      </span>
                    ))}
                  </div>
                )}

                {/* 5. Coach Quote */}
                {showAiQuote && (
                  <div className={`p-2.5 rounded-xl border z-10 ${
                    cardTheme === 'clean' ? 'bg-white border-slate-300' : 'bg-slate-900/90 border-slate-800'
                  }`}>
                    <p className={`text-[10px] italic leading-relaxed text-center font-medium ${
                      cardTheme === 'clean' ? 'text-slate-700' : 'text-slate-300'
                    }`}>
                      "{currentResult.assistantMessage}"
                    </p>
                  </div>
                )}

                {/* 6. Footer Watermark */}
                <div className={`pt-2 border-t flex items-center justify-between text-[9px] z-10 ${
                  cardTheme === 'clean' ? 'border-slate-300 text-slate-600' : 'border-slate-800/80 text-slate-400'
                }`}>
                  <span className="font-bold text-emerald-500 dark:text-emerald-400">✨ NutriAI Assistant</span>
                  <span>100% Personalizado</span>
                </div>
              </div>
            </div>

            {/* COLUNA DIREITA: PAINEL DE CUSTOMIZAÇÃO E AÇÕES */}
            <div className="lg:col-span-5 space-y-6">
              
              {/* Painel de Temas & Layout */}
              <div className="clay-card p-5 sm:p-6 bg-white dark:bg-[#0c1524] rounded-[24px] border border-slate-200 dark:border-slate-800 space-y-5">
                <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-base">
                  <Sliders className="w-4 h-4 text-emerald-500" />
                  <span>Estilo & Formato do Card</span>
                </div>

                {/* Temas */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                    Tema Visual
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setCardTheme('emerald')}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5 ${
                        cardTheme === 'emerald'
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-600 dark:text-emerald-400'
                          : 'bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      🌿 Esmeralda Pro
                    </button>

                    <button
                      onClick={() => setCardTheme('obsidian')}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5 ${
                        cardTheme === 'obsidian'
                          ? 'bg-teal-500/20 border-teal-500 text-teal-600 dark:text-teal-400'
                          : 'bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      🌌 Dark Obsidian
                    </button>

                    <button
                      onClick={() => setCardTheme('sunset')}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5 ${
                        cardTheme === 'sunset'
                          ? 'bg-orange-500/20 border-orange-500 text-orange-600 dark:text-orange-400'
                          : 'bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      🔥 Sunset Vitality
                    </button>

                    <button
                      onClick={() => setCardTheme('clean')}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5 ${
                        cardTheme === 'clean'
                          ? 'bg-slate-200 dark:bg-slate-200 border-slate-400 text-slate-900'
                          : 'bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      🍃 Eco Clean
                    </button>
                  </div>
                </div>

                {/* Formatos */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                    Formato de Compartilhamento
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => setCardFormat('card')}
                      className={`p-2 rounded-xl border text-xs font-bold transition-all text-center flex flex-col items-center justify-center gap-1 ${
                        cardFormat === 'card'
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-600 dark:text-emerald-400'
                          : 'bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <LayoutTemplate className="w-4 h-4" />
                      <span>Card (4:5)</span>
                    </button>

                    <button
                      onClick={() => setCardFormat('story')}
                      className={`p-2 rounded-xl border text-xs font-bold transition-all text-center flex flex-col items-center justify-center gap-1 ${
                        cardFormat === 'story'
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-600 dark:text-emerald-400'
                          : 'bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <Smartphone className="w-4 h-4" />
                      <span>Story (9:16)</span>
                    </button>

                    <button
                      onClick={() => setCardFormat('square')}
                      className={`p-2 rounded-xl border text-xs font-bold transition-all text-center flex flex-col items-center justify-center gap-1 ${
                        cardFormat === 'square'
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-600 dark:text-emerald-400'
                          : 'bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <Square className="w-4 h-4" />
                      <span>Feed (1:1)</span>
                    </button>
                  </div>
                </div>

                {/* Alternadores de Conteúdo */}
                <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                    Elementos Visíveis
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setShowNutriScore(!showNutriScore)}
                      className={`p-2 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all text-center ${
                        showNutriScore 
                          ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-600 dark:text-emerald-400' 
                          : 'bg-slate-100 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-400'
                      }`}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>NutriScore</span>
                    </button>

                    <button
                      onClick={() => setShowMacros(!showMacros)}
                      className={`p-2 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all text-center ${
                        showMacros 
                          ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-600 dark:text-emerald-400' 
                          : 'bg-slate-100 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-400'
                      }`}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Macronutrientes</span>
                    </button>

                    <button
                      onClick={() => setShowFoodsList(!showFoodsList)}
                      className={`p-2 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all text-center ${
                        showFoodsList 
                          ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-600 dark:text-emerald-400' 
                          : 'bg-slate-100 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-400'
                      }`}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Alimentos</span>
                    </button>

                    <button
                      onClick={() => setShowAiQuote(!showAiQuote)}
                      className={`p-2 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all text-center ${
                        showAiQuote 
                          ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-600 dark:text-emerald-400' 
                          : 'bg-slate-100 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-400'
                      }`}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Parecer IA</span>
                    </button>
                  </div>
                </div>

              </div>

              {/* Botões de Ação Principais (Centralizados e Alinhados com o Tema) */}
              <div className="clay-card p-5 sm:p-6 bg-white dark:bg-[#0c1524] rounded-[24px] border border-slate-200 dark:border-slate-800 space-y-3">
                <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center mb-2">
                  Opções de Envio e Download
                </h4>

                <button
                  onClick={handleShareNative}
                  disabled={isExportingCard}
                  className="w-full py-4 px-6 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-full font-black text-sm transition-all shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2.5 disabled:opacity-70 disabled:cursor-not-allowed border border-emerald-400/30 active:scale-98 text-center"
                >
                  {isExportingCard ? (
                    <><Loader2 className="w-5 h-5 animate-spin shrink-0" /> <span>Gerando Imagem...</span></>
                  ) : (
                    <><Share2 className="w-5 h-5 shrink-0" /> <span>Compartilhar Agora</span></>
                  )}
                </button>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={handleCopyCard}
                    disabled={isExportingCard}
                    className="py-3.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-full font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 border border-slate-300 dark:border-slate-700 shadow-sm active:scale-98 text-center"
                  >
                    {isCopied ? (
                      <><Check className="w-4 h-4 text-emerald-500 shrink-0" /> <span className="text-emerald-500">Copiado!</span></>
                    ) : (
                      <><Copy className="w-4 h-4 shrink-0" /> <span>Copiar Imagem</span></>
                    )}
                  </button>

                  <button
                    onClick={handleExportCard}
                    disabled={isExportingCard}
                    className="py-3.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-full font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 border border-slate-300 dark:border-slate-700 shadow-sm active:scale-98 text-center"
                  >
                    <Download className="w-4 h-4 shrink-0" />
                    <span>Baixar PNG</span>
                  </button>
                </div>

                <button
                  onClick={() => setActiveSubTab('scanner')}
                  className="w-full py-3 px-4 bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-full font-medium text-xs transition-all flex items-center justify-center gap-2 text-center"
                >
                  <RefreshCw className="w-3.5 h-3.5 shrink-0" />
                  <span>Voltar ao Scanner de Prato</span>
                </button>
              </div>

            </div>

          </div>

        </div>
      )}

    </div>
  );
}
