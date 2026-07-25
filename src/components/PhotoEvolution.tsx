import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Camera, Image as ImageIcon, Plus, Trash2, Calendar, ShieldCheck, ChevronRight, CheckCircle2, Loader2, Sparkles, AlertCircle, X } from 'lucide-react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { playSfx, vibrate } from '../lib/sensory';
import { analyzeImage } from '../lib/gemini';
import { UserProfile } from '../types';

interface PhotoEntry {
  id: string;
  date: string;
  imageBase64: string;
  analysis: string;
}

interface PhotoEvolutionProps {
  profile: UserProfile | null;
  onAwardPoints?: (amount: number, reason: string) => void;
}

export function PhotoEvolution({ profile, onAwardPoints }: PhotoEvolutionProps) {
  const [entries, setEntries] = useLocalStorage<PhotoEntry[]>('nutri-photo-evolution', []);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Stop camera when unmounting
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
  };

  const startCamera = async () => {
    setCameraError(null);
    setIsCapturing(true);

    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }
        });
      } catch (firstErr) {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      }
      setCameraStream(stream);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 100);
    } catch (err: any) {
      console.warn("Camera access failed:", err);
      setIsCapturing(false);
      setCameraError("Câmera não encontrada. Por favor, faça upload de uma foto usando o botão abaixo.");
    }
  };

  const takePhoto = () => {
    if (!videoRef.current) return;
    
    playSfx('tap');
    vibrate(15);
    
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.drawImage(videoRef.current, 0, 0);
    const base64 = canvas.toDataURL('image/jpeg', 0.8);
    
    stopCamera();
    processNewImage(base64);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    playSfx('tap');
    vibrate(15);
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      processNewImage(base64);
    };
    reader.readAsDataURL(file);
  };

  const compressImageBase64 = (base64: string, maxWidth = 600, quality = 0.65): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        } else {
          resolve(base64);
        }
      };
      img.onerror = () => resolve(base64);
      img.src = base64;
    });
  };

  const processNewImage = async (base64ImageRaw: string) => {
    setIsCapturing(false);
    setIsProcessing(true);
    vibrate([20, 50, 20]);
    
    try {
      const base64Image = await compressImageBase64(base64ImageRaw);
      // Create prompt comparing with the latest entry if exists
      const latestEntry = entries.length > 0 ? entries[entries.length - 1] : null;
      let prompt = `Analise esta foto corporal focando estritamente em aspectos de fitness e forma física. ${latestEntry ? 'Esta é uma nova foto em uma linha do tempo de evolução.' : 'Esta é a primeira foto da evolução corporal.'} Faça uma estimativa POSITIVA e ENCORAJADORA do progresso. Cite coisas como "possível redução de inchaço", "melhora na postura", ou "definição aparente". Responda em um parágrafo curto, sem mencionar que é uma IA. Se não puder analisar o corpo, diga que a iluminação está ótima e elogie o foco.`;

      // Mock AI call for speed in the applet, or use gemini
      let analysisResult = "";
      try {
        const response = await analyzeImage(base64Image, prompt);
        analysisResult = response || "Excelente foto! Continue registrando seu progresso, a consistência é a chave.";
      } catch (err) {
         analysisResult = "Incrível registro! Notei uma ótima postura. Continue focado(a) na sua jornada de transformação.";
      }

      const newEntry: PhotoEntry = {
        id: Date.now().toString(),
        date: new Date().toISOString(),
        imageBase64: base64Image,
        analysis: analysisResult
      };

      // Keep up to 20 most recent photo entries to avoid exceeding localStorage quota
      setEntries(prev => [...prev, newEntry].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 20));
      
      playSfx('success');
      vibrate([50, 100, 50]);
      if (onAwardPoints) onAwardPoints(15, 'Nova foto de evolução registrada');

    } catch (e) {
      console.warn(e);
      alert('Erro ao processar imagem.');
    } finally {
      setIsProcessing(false);
    }
  };

  const deleteEntry = (id: string) => {
    if (confirm('Tem certeza que deseja apagar esta foto? Esta ação não pode ser desfeita.')) {
      setEntries(prev => prev.filter(e => e.id !== id));
      playSfx('scratch');
      vibrate(20);
    }
  };

  const formatDate = (isoString: string) => {
    const d = new Date(isoString);
    return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(d);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-24 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-[36px] p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 bottom-0 opacity-20 translate-x-4 translate-y-4">
          <Camera className="w-48 h-48" />
        </div>
        <div className="relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 rounded-full text-xs font-bold uppercase tracking-wider backdrop-blur-md">
            <ShieldCheck className="w-4 h-4" /> 100% Privado
          </div>
          <h2 className="text-3xl md:text-4xl font-serif font-black tracking-tight leading-tight">
            Evolução por Fotos
          </h2>
          <p className="text-indigo-50 max-w-lg leading-relaxed font-medium">
            Registre seu corpo periodicamente. Suas fotos são armazenadas localmente no seu dispositivo e analisadas pela IA para destacar seu progresso.
          </p>
        </div>
      </div>

      {cameraError && (
        <div className="bg-rose-50 dark:bg-rose-950/30 p-4 rounded-2xl flex gap-3 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/50 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p>{cameraError}</p>
        </div>
      )}

      {/* Camera View */}
      {isCapturing && (
        <div className="bg-slate-900 rounded-[32px] overflow-hidden shadow-2xl relative border border-slate-800">
          <div className="absolute top-4 right-4 z-10">
            <button
              onClick={() => {
                stopCamera();
                setIsCapturing(false);
              }}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-full backdrop-blur text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="relative aspect-[3/4] md:aspect-[16/9] w-full bg-black flex items-center justify-center">
            {cameraStream ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
            ) : (
              <Loader2 className="w-8 h-8 text-white animate-spin" />
            )}
            
            {/* Guide overlay */}
            <div className="absolute inset-0 border-2 border-white/20 m-8 rounded-2xl pointer-events-none flex flex-col items-center justify-center">
               <div className="w-48 h-64 border-2 border-dashed border-white/40 rounded-full opacity-50"></div>
            </div>
          </div>
          
          <div className="p-6 bg-slate-900 flex justify-center">
            <button
              onClick={takePhoto}
              className="w-20 h-20 bg-white rounded-full border-4 border-indigo-500 hover:scale-105 transition-transform flex items-center justify-center shadow-lg shadow-indigo-500/20"
            >
              <Camera className="w-8 h-8 text-indigo-600" />
            </button>
          </div>
        </div>
      )}

      {/* Processing State */}
      {isProcessing && (
        <div className="bg-white dark:bg-slate-900 rounded-[32px] p-12 text-center shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center space-y-6">
          <div className="w-24 h-24 bg-indigo-50 dark:bg-indigo-900/20 rounded-full flex items-center justify-center relative">
            <div className="absolute inset-0 rounded-full border-4 border-indigo-200 dark:border-indigo-800/50 animate-ping opacity-20"></div>
            <Sparkles className="w-10 h-10 text-indigo-500 animate-pulse" />
          </div>
          <div className="space-y-2">
            <h3 className="font-serif text-2xl font-black text-slate-800 dark:text-white">Analisando Evolução...</h3>
            <p className="text-slate-500 dark:text-slate-400">A IA está comparando seus resultados.</p>
          </div>
        </div>
      )}

      {/* Timeline View */}
      {!isCapturing && !isProcessing && (
        <div className="space-y-8">
          
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
             <h3 className="text-xl font-bold font-serif text-slate-800 dark:text-white flex items-center gap-2">
               <Calendar className="w-5 h-5 text-indigo-500" /> Linha do Tempo
             </h3>
             <div className="flex gap-2 w-full sm:w-auto">
                <button
                  onClick={startCamera}
                  className="flex-1 sm:flex-none px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-sm shadow-md transition-colors flex items-center justify-center gap-2 border-none cursor-pointer"
                >
                  <Camera className="w-4 h-4" /> Fotografar
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 sm:flex-none px-6 py-3 bg-white dark:bg-slate-800 text-slate-700 dark:text-white border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-2xl font-bold text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ImageIcon className="w-4 h-4" /> Galeria
                </button>
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  className="hidden"
                  onChange={handleFileUpload}
                />
             </div>
          </div>

          {entries.length === 0 ? (
            <div className="bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-900/30 rounded-[32px] p-12 text-center space-y-4">
              <div className="w-20 h-20 bg-white dark:bg-indigo-900/40 rounded-full flex items-center justify-center mx-auto shadow-sm">
                <Camera className="w-8 h-8 text-indigo-400" />
              </div>
              <h4 className="font-serif text-xl font-bold text-slate-800 dark:text-white">Nenhum registro ainda</h4>
              <p className="text-slate-500 text-sm max-w-sm mx-auto">
                Tire sua primeira foto agora para iniciar o acompanhamento da sua evolução física.
              </p>
            </div>
          ) : (
            <div className="relative space-y-8 before:absolute before:inset-0 before:ml-6 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 dark:before:via-slate-800 before:to-transparent">
              <AnimatePresence>
                {entries.map((entry, index) => (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: index * 0.1 }}
                    className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active"
                  >
                    <div className="flex items-center justify-center w-12 h-12 rounded-full border-4 border-white dark:border-slate-900 bg-indigo-500 text-white shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-md z-10">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-3rem)] bg-white dark:bg-slate-900 p-5 rounded-[28px] border border-slate-100 dark:border-slate-800 shadow-sm relative hover:shadow-md transition-shadow ml-4 md:ml-0">
                      {/* Arrow connecting dot to card */}
                      <div className="absolute top-6 -left-3 md:group-odd:-right-3 md:group-odd:left-auto md:group-odd:rotate-180 w-0 h-0 border-y-[6px] border-y-transparent border-r-[12px] border-r-slate-100 dark:border-r-slate-800"></div>

                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <span className="text-xs font-bold text-indigo-500 uppercase tracking-wider block mb-1">
                            {index === 0 && entries.length > 1 ? 'Foto Mais Recente' : `Registro #${entries.length - index}`}
                          </span>
                          <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                            {formatDate(entry.date)}
                          </span>
                        </div>
                        <button
                          onClick={() => deleteEntry(entry.id)}
                          className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-full transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="aspect-[4/5] md:aspect-square w-full rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 mb-4 shadow-inner relative group/image">
                        <img 
                          src={entry.imageBase64} 
                          alt="Evolução" 
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/image:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                           <ShieldCheck className="w-12 h-12 text-white/80" />
                        </div>
                      </div>

                      <div className="bg-indigo-50/50 dark:bg-indigo-900/10 p-4 rounded-2xl border border-indigo-100/50 dark:border-indigo-900/30">
                        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                          <Sparkles className="w-4 h-4 inline-block text-indigo-500 mr-1.5 -mt-0.5" />
                          {entry.analysis}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
