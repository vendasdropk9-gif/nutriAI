import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, Loader2, X, Target } from 'lucide-react';
import { scanIngredients } from '../lib/gemini';

interface ScannerProps {
  onIngredientsDetected: (ingredients: string[]) => void;
}

export function Scanner({ onIngredientsDetected }: ScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [previewLine, setPreviewLine] = useState<string | null>(null);
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

  const startCamera = async () => {
    setCameraError(null);
    setIsCameraActive(true);
    setPreviewLine(null);

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
      console.warn("Accessing camera failed:", err.message);
      let userFriendlyMsg = "Não foi possível acessar a câmera do dispositivo. Verifique se deu permissão de acesso.";
      if (err.name === 'NotFoundError' || err.message?.toLowerCase().includes('device not found') || err.message?.toLowerCase().includes('requested device')) {
        userFriendlyMsg = "Câmera de vídeo física não encontrada ou não está conectada a este dispositivo. Por favor, conecte uma câmera ou utilize a opção de carregar imagem do rolo da câmera / arquivo abaixo.";
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
        
        setPreviewLine(dataUrl);
        stopCamera();
        analyzeCapturedBase64(base64Data, 'image/jpeg');
      }
    } catch (err) {
      console.warn("Failed to capture picture from stream:", err);
      alert("Erro ao capturar imagem da câmera.");
    }
  };

  const analyzeCapturedBase64 = async (base64Data: string, mimeType: string) => {
    try {
      setIsScanning(true);
      const ingredients = await scanIngredients(base64Data, mimeType);
      if (ingredients && ingredients.length > 0) {
        onIngredientsDetected(ingredients);
      } else {
        alert('Nenhum ingrediente identificado na imagem.');
      }
      setIsScanning(false);
    } catch (error) {
      console.warn(error);
      alert('Erro ao escanear a imagem.');
      setIsScanning(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsScanning(true);
      setIsCameraActive(false);
      
      // Create preview
      const previewUrl = URL.createObjectURL(file);
      setPreviewLine(previewUrl);

      // Convert to Base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        const result = reader.result as string;
        // Extract base64 part
        const base64Data = result.split(',')[1];
        const mimeType = file.type;

        analyzeCapturedBase64(base64Data, mimeType);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.warn(error);
      alert('Erro ao carregar imagem.');
      setIsScanning(false);
    }
  };

  const cancelScan = () => {
    setPreviewLine(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="clay-card p-6 flex flex-col items-center justify-center gap-4 relative overflow-hidden group w-full min-h-[300px] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
      
      {/* State 1: Frozen / Scanning Preview */}
      {previewLine && (
        <div className="absolute inset-0 z-20 w-full h-full bg-cover bg-center animate-in fade-in duration-300" style={{ backgroundImage: `url(${previewLine})` }}>
          <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center backdrop-blur-sm p-4 text-center">
            {isScanning ? (
              <div className="flex flex-col items-center gap-3 text-white">
                <Loader2 className="w-10 h-10 animate-spin text-emerald-400" />
                <span className="font-semibold text-base">Identificando alimentos...</span>
                <span className="text-xs text-slate-300">Aguarde a leitura inteligente da geladeira</span>
              </div>
            ) : (
              <button 
                onClick={cancelScan} 
                className="absolute top-4 right-4 p-2 bg-white/20 dark:bg-slate-800/40 rounded-full hover:bg-white/40 dark:hover:bg-slate-700/60 backdrop-blur-md text-white transition-all shadow-md active:scale-95"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* State 2: Live Camera Streaming View */}
      {isCameraActive && !previewLine && (
        <div className="absolute inset-0 z-10 w-full h-full bg-slate-950 flex flex-col justify-between p-4 animate-in fade-in duration-300">
          <div className="relative flex-1 w-full rounded-2xl overflow-hidden bg-slate-900 flex items-center justify-center">
            
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
              <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 gap-2 bg-slate-900">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
                <p className="text-xs">Iniciando câmera...</p>
              </div>
            )}

            {cameraStream && !cameraError && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-32 h-32 border-2 border-dashed border-white/40 rounded-full flex items-center justify-center animate-pulse">
                  <Target className="w-6 h-6 text-white/30" />
                </div>
              </div>
            )}

            {cameraError && (
              <div className="absolute inset-0 bg-slate-900 flex flex-col items-center justify-center p-4 text-center">
                <p className="text-red-400 text-xs font-semibold mb-3 px-2">
                  {cameraError}
                </p>
                <button
                  onClick={stopCamera}
                  className="bg-slate-800 hover:bg-slate-700 text-white font-medium px-4 py-2 rounded-full text-xs transition-colors"
                >
                  Voltar
                </button>
              </div>
            )}
          </div>

          {cameraStream && !cameraError && (
            <div className="flex items-center justify-between w-full mt-3 px-2 shrink-0">
              <button
                type="button"
                onClick={stopCamera}
                className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-full font-medium transition-colors"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={captureCameraPhoto}
                className="w-12 h-12 rounded-full bg-white border-2 border-slate-300 flex items-center justify-center shadow-lg active:scale-95 transition-transform"
                title="Tirar Foto"
              >
                <div className="w-9 h-9 rounded-full bg-emerald-500 hover:bg-emerald-600 transition-colors flex items-center justify-center">
                  <Camera className="w-4 h-4 text-white" />
                </div>
              </button>

              <div className="w-16"></div>
            </div>
          )}
        </div>
      )}

      {/* State 3: Setup Buttons */}
      {!previewLine && !isCameraActive && (
        <>
          <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform duration-300">
            <Camera className="w-8 h-8" />
          </div>
          <div className="text-center">
            <h4 className="font-sans font-bold text-slate-700 dark:text-slate-200">Escanear Ingredientes</h4>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-xs leading-relaxed">
              Tire uma foto ao vivo de sua geladeira ou despensa para a IA identificar o que você tem na hora.
            </p>
          </div>

          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            ref={fileInputRef}
            className="hidden"
          />

          <div className="flex flex-col sm:flex-row gap-3 w-full justify-center mt-2 px-2 max-w-xs">
            <button
              onClick={startCamera}
              className="flex-1 py-2.5 px-4 bg-emerald-500 hover:bg-emerald-600 text-white font-sans font-medium text-xs rounded-full transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
            >
              <Camera className="w-4 h-4" />
              Tirar Foto
            </button>

            <button 
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-sans font-medium text-xs rounded-full transition-all flex items-center justify-center gap-1.5 active:scale-95"
            >
              <Upload className="w-4 h-4" />
              Enviar Foto
            </button>
          </div>
        </>
      )}
    </div>
  );
}

