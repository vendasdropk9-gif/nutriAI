import React, { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { analyzeBarcodeProduct, analyzeProductImage } from '../lib/gemini';
import { speak } from '../lib/speech';
import { UserProfile } from '../types';
import { Barcode, Loader2, Play, Volume2, Info, AlertTriangle, CheckCircle2, RefreshCw, X, ShieldAlert, Camera, Upload, Target, Lock } from 'lucide-react';

interface BarcodeScannerProps {
  profile: UserProfile | null;
}

export function BarcodeScanner({ profile }: BarcodeScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [productData, setProductData] = useState<any | null>(null);
  const [analysis, setAnalysis] = useState<any | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manualBarcode, setManualBarcode] = useState("");
  
  // Custom camera elements for raw image analysis fallback
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(e => console.warn(e));
      }
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

  // Starts live camera feed for photo scanning
  const startCamera = async () => {
    setProductData(null);
    setAnalysis(null);
    setError(null);
    setIsCameraActive(true);
    setPreviewImage(null);
    setIsScanning(false);
    
    if (scannerRef.current) {
      try {
        await scannerRef.current.clear();
      } catch (e) {
        // ignore clear errors
      }
      scannerRef.current = null;
    }

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
        userFriendlyMsg = "Câmera de vídeo física não encontrada ou não instalada neste dispositivo. Por favor, digite o código de barras manualmente ou faça upload de uma foto nítida do código do produto abaixo.";
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
      console.warn("Failed to capture picture from stream:", err);
      alert("Erro ao capturar imagem da câmera.");
    }
  };

  const analyzeCapturedBase64 = async (base64Data: string, mimeType: string) => {
    setIsAnalyzing(true);
    setError(null);
    try {
      const result = await analyzeProductImage(base64Data, mimeType, profile);
      if (result) {
        setProductData({
          product_name: result.productName || "Produto Identificado",
          brands: result.brand || "Marca Reconhecida",
          quantity: result.quantity || "Análise visual",
          image_url: null
        });
        setAnalysis({
          verdict: result.verdict,
          warning: result.warning,
          assistantMessage: result.assistantMessage,
          nutrition: result.nutrition
        });
      } else {
        setError("Não foi possível analisar o produto. Tente tirar uma foto mais nítida.");
      }
    } catch (err: any) {
      console.warn(err);
      setError("Erro ao analisar imagem: " + (err.message || err));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsAnalyzing(true);
      setError(null);
      setIsCameraActive(false);
      setIsScanning(false);
      
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
      console.warn(error);
      setError("Erro ao carregar imagem selecionada.");
      setIsAnalyzing(false);
    }
  };

  // Starts standard barcode scanner
  const startScanner = async () => {
    setProductData(null);
    setAnalysis(null);
    setError(null);
    setPreviewImage(null);
    setIsCameraActive(false);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
        throw new Error("Dispositivo não possui suporte a câmeras.");
      }
      const devices = await navigator.mediaDevices.enumerateDevices();
      const hasVideo = devices.some(device => device.kind === 'videoinput');
      if (!hasVideo) {
        throw new Error("Nenhuma câmera física de vídeo foi encontrada");
      }
    } catch (checkErr: any) {
      setError("Nenhuma câmera encontrada neste dispositivo. Digite o código de barras abaixo ou use a simulação de produtos.");
      setIsScanning(false);
      return;
    }

    setIsScanning(true);

    // Initialize scanner after a short delay to ensure div is present
    setTimeout(() => {
      try {
        const scanner = new Html5QrcodeScanner(
          "barcode-reader",
          { fps: 10, qrbox: { width: 250, height: 150 } },
          /* verbose= */ false
        );
        
        scanner.render((decodedText) => {
          scanner.clear();
          setIsScanning(false);
          handleBarcodeDetected(decodedText);
        }, (err) => {
          if (typeof err === 'string' && (err.includes('Requested device not found') || err.includes('not found') || err.includes('Camera'))) {
            setError("Nenhuma câmera encontrada neste dispositivo. Use a opção de tirar foto ou carregar arquivo.");
            setIsScanning(false);
            if (scannerRef.current) scannerRef.current.clear();
          }
        });
        
        scannerRef.current = scanner;
      } catch (err: any) {
        setError("Erro ao iniciar a câmera do scanner de código de barras: " + (err.message || err));
        setIsScanning(false);
      }
    }, 100);
  };

  const handleBarcodeDetected = async (barcode: string) => {
    setIsAnalyzing(true);
    try {
      // Fetch from Open Food Facts API
      const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
      const data = await response.json();

      if (data.status === 1) {
        setProductData(data.product);
        const result = await analyzeBarcodeProduct(data.product, profile);
        setAnalysis(result);
      } else {
        setError("Produto não encontrado no banco de dados OFF. Tente tirar uma foto direta dele.");
      }
    } catch (err) {
      console.warn(err);
      setError("Erro ao buscar informações do produto.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const playTTS = async (text: string) => {
    if (isPlaying) return;
    setIsPlaying(true);
    
    await speak(text, {
      onEnded: () => setIsPlaying(false),
      onError: () => setIsPlaying(false)
    });
  };

  const reset = () => {
    setProductData(null);
    setAnalysis(null);
    setError(null);
    setIsScanning(false);
    setIsCameraActive(false);
    setPreviewImage(null);
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
  };

  const getVerdictStyles = (verdict: string) => {
    switch (verdict) {
      case 'bom':
        return {
          bg: 'bg-emerald-50 dark:bg-emerald-900/20',
          border: 'border-emerald-100 dark:border-emerald-800/30',
          text: 'text-emerald-700 dark:text-emerald-400',
          icon: <CheckCircle2 className="w-6 h-6 text-emerald-500" />
        };
      case 'ruim':
        return {
          bg: 'bg-rose-50 dark:bg-rose-900/20',
          border: 'border-rose-100 dark:border-rose-800/30',
          text: 'text-rose-700 dark:text-rose-400',
          icon: <ShieldAlert className="w-6 h-6 text-rose-500" />
        };
      default:
        return {
          bg: 'bg-amber-50 dark:bg-amber-900/20',
          border: 'border-amber-100 dark:border-amber-800/30',
          text: 'text-amber-700 dark:text-amber-400',
          icon: <AlertTriangle className="w-6 h-6 text-amber-500" />
        };
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 px-2 sm:px-4 overflow-x-hidden">
      <div className="text-center space-y-2 sm:space-y-4 px-2">
        <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-medium tracking-tight text-emerald-700 dark:text-emerald-400">
          Scanner de Produtos
        </h2>
        <p className="font-sans text-slate-500 dark:text-slate-400 max-w-xl mx-auto text-sm sm:text-base md:text-lg leading-relaxed">
          Escaneie o código de barras ou tire uma foto direta de qualquer lata ou produto para ver se ajuda ou atrapalha seu objetivo.
        </p>
      </div>

      <div className="clay-card p-3 sm:p-6 md:p-8 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 w-full overflow-hidden">
        
        {/* State 1: Selection Dashboard */}
        {!isScanning && !productData && !isAnalyzing && !isCameraActive && !previewImage && (
          <div className="flex flex-col items-center justify-center py-6 sm:py-12 border-2 border-dashed border-emerald-300 dark:border-emerald-700/50 bg-emerald-50/50 dark:bg-slate-800/40 rounded-[24px] p-4 sm:p-6 text-center w-full max-w-3xl mx-auto overflow-hidden">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mb-4 sm:mb-6 shrink-0">
              <Camera className="w-8 h-8 sm:w-10 sm:h-10 animate-pulse" />
            </div>
            
            <div className="space-y-2 mb-6 sm:mb-8 px-2">
              <h3 className="font-serif text-xl sm:text-2xl font-medium text-slate-800 dark:text-slate-100">Pronto para escanear?</h3>
              <p className="text-slate-500 dark:text-slate-400 max-w-sm text-xs sm:text-sm md:text-base mx-auto leading-relaxed">
                Tire uma foto simples da lata/embalagem, carregue da galeria para analisar a tabela ou use o código de barras.
              </p>
            </div>

            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              ref={fileInputRef}
              className="hidden"
            />

            <div className="flex flex-col sm:flex-row gap-3 w-full justify-center max-w-md px-2 sm:px-4">
              <button
                onClick={startCamera}
                className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-600 text-white font-sans font-medium px-4 sm:px-6 py-3 rounded-full transition-all duration-300 flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 hover:-translate-y-0.5 text-xs sm:text-sm active:scale-95 whitespace-normal break-words"
              >
                <Camera className="w-4 h-4 shrink-0" />
                <span>Tirar Foto (Lata/Pote)</span>
              </button>
              
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full sm:w-auto bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-sans font-medium px-4 sm:px-6 py-3 rounded-full transition-all duration-300 flex items-center justify-center gap-2 hover:-translate-y-0.5 text-xs sm:text-sm border border-slate-200 dark:border-slate-700 active:scale-95 whitespace-normal break-words"
              >
                <Upload className="w-4 h-4 shrink-0" />
                <span>Obter Foto da Galeria</span>
              </button>
            </div>

            <div className="w-full flex items-center justify-center gap-2 my-5 max-w-xs px-4">
              <div className="h-px bg-slate-200 dark:bg-slate-800 flex-1"></div>
              <span className="text-[10px] sm:text-xs text-slate-400 font-semibold uppercase tracking-wider shrink-0">Ou use o leitor</span>
              <div className="h-px bg-slate-200 dark:bg-slate-800 flex-1"></div>
            </div>

            <button
              onClick={startScanner}
              className="w-full sm:w-auto justify-center px-5 sm:px-6 py-3 bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 rounded-full font-medium transition-all text-xs sm:text-sm flex items-center gap-2 border border-emerald-200 dark:border-emerald-800/60 active:scale-95"
            >
              <Barcode className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>Escanear Código de Barras</span>
            </button>

            {/* Manual entry fallback */}
            <div className="w-full max-w-sm mt-6 border-t border-slate-200/50 dark:border-slate-800/60 pt-5 space-y-4 px-2 sm:px-0">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Inserir manualmente:</p>
              
              <form onSubmit={(e) => {
                e.preventDefault();
                if (manualBarcode.trim()) {
                  handleBarcodeDetected(manualBarcode.trim());
                }
              }} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ex: 7891000077008"
                  value={manualBarcode}
                  onChange={(e) => setManualBarcode(e.target.value)}
                  className="flex-1 min-w-0 px-3 sm:px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-medium transition-colors shrink-0"
                >
                  Analisar
                </button>
              </form>

              {/* Simulation Quick Buttons */}
              <div className="space-y-2">
                <p className="text-[9px] sm:text-[10px] uppercase font-bold tracking-widest text-slate-400 dark:text-slate-500">Simulador de Códigos de Barra:</p>
                <div className="flex flex-wrap gap-1.5 justify-center">
                  {[
                    { name: "Pepsi Cola Zero", barcode: "7891149105319" },
                    { name: "Aveia em Flocos", barcode: "7891000185901" },
                    { name: "Chocolate KitKat", barcode: "7613034626844" },
                    { name: "Leite Ninho", barcode: "7891000077008" }
                  ].map((sim, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        setManualBarcode(sim.barcode);
                        handleBarcodeDetected(sim.barcode);
                      }}
                      className="text-[10px] sm:text-xs bg-slate-50 hover:bg-emerald-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors"
                    >
                      {sim.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Security Banner */}
            <div className="w-full max-w-sm mt-6 p-3 sm:p-4 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100/50 dark:border-emerald-900/30 rounded-2xl flex items-center gap-3 text-left">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <Lock className="w-5 h-5" />
              </div>
              <div className="space-y-0.5 min-w-0">
                <h4 className="font-sans font-semibold text-slate-800 dark:text-slate-200 text-xs sm:text-sm truncate">Seus dados estão protegidos</h4>
                <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 leading-snug">
                  Nenhuma imagem é salva sem sua permissão. Tudo é 100% seguro e privado.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* State 2: Live Camera View */}
        {isCameraActive && !previewImage && (
          <div className="flex flex-col items-center justify-center space-y-4 sm:space-y-6 w-full animate-in fade-in duration-300">
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
                  <p className="text-sm">Iniciando câmera para tirar foto...</p>
                </div>
              )}

              {cameraStream && !cameraError && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="w-36 h-36 sm:w-64 sm:h-64 border-2 border-dashed border-white/50 rounded-2xl flex items-center justify-center">
                    <Target className="w-8 h-8 text-white/40 animate-pulse" />
                  </div>
                </div>
              )}

              {cameraError && (
                <div className="absolute inset-0 bg-slate-900 flex flex-col items-center justify-center p-6 text-center">
                  <p className="text-red-400 font-medium max-w-sm mx-auto mb-6 text-sm">
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
              <div className="flex flex-row items-center justify-between gap-4 w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={stopCamera}
                  className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium px-4 py-2 sm:px-5 sm:py-2.5 rounded-full transition-colors flex items-center gap-1.5 text-xs sm:text-sm shadow-sm"
                >
                  Cancelar
                </button>
                
                <button
                  type="button"
                  onClick={captureCameraPhoto}
                  className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white border-4 border-slate-200 dark:border-slate-800 flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all duration-150 shrink-0"
                  title="Capturar Foto"
                >
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-emerald-500 hover:bg-emerald-600 transition-colors flex items-center justify-center">
                    <Camera className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  </div>
                </button>

                <div className="w-16 sm:w-20 shrink-0 pointer-events-none opacity-0">Spacer</div>
              </div>
            )}
          </div>
        )}

        {/* State 3: Code Scanner Live Reader */}
        {isScanning && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div id="barcode-reader" className="overflow-hidden rounded-2xl border-2 border-emerald-500/30"></div>
            <button
              onClick={() => {
                if (scannerRef.current) scannerRef.current.clear().catch(e => console.warn(e));
                setIsScanning(false);
              }}
              className="w-full py-4 bg-slate-100 dark:bg-slate-700 hover:bg-slate-250 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 rounded-2xl font-medium flex items-center justify-center gap-2 transition-colors active:scale-95"
            >
              <X className="w-5 h-5" />
              Cancelar Leitura de Código
            </button>
          </div>
        )}

        {/* State 4: Analyzing Status (Scanning Scan Line Animation) */}
        {isAnalyzing && (
          <div className="flex flex-col items-center justify-center py-20 space-y-6">
            <Loader2 className="w-16 h-16 text-emerald-500 animate-spin" />
            <p className="text-slate-600 dark:text-slate-300 font-medium text-xl">Lendo embalagem e tabela nutricional...</p>
          </div>
        )}

        {/* State 5: Error Banner */}
        {error && (
          <div className="p-6 bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800/30 rounded-2xl flex items-center gap-4 text-rose-700 dark:text-rose-400">
            <AlertTriangle className="w-6 h-6 shrink-0" />
            <div className="flex-1">
              <p className="font-medium text-sm sm:text-base">{error}</p>
            </div>
            <button onClick={reset} className="p-2 hover:bg-rose-100 dark:hover:bg-rose-800/40 rounded-full transition-colors">
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* State 6: Product Analysis Result Screen */}
        {analysis && productData && !isAnalyzing && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="flex flex-col md:flex-row gap-8 items-start">
              
              {/* Product preview from image/camera or product standard image_url */}
              {(previewImage || productData.image_url) ? (
                <div className="w-full md:w-48 aspect-square rounded-2xl overflow-hidden shadow-md shrink-0 bg-white p-2 flex items-center justify-center border border-slate-100 dark:border-slate-800">
                  <img src={previewImage || productData.image_url} alt={productData.product_name} className="w-full h-full object-contain rounded-xl" />
                </div>
              ) : (
                <div className="w-full md:w-48 aspect-square rounded-2xl overflow-hidden shadow-md shrink-0 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center text-slate-400 gap-2">
                  <Barcode className="w-10 h-10 text-slate-300" />
                  <span className="text-xs">Código de barras</span>
                </div>
              )}

              <div className="space-y-4 flex-1 w-full">
                <div className="space-y-1">
                  <p className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{productData.brands || 'Marca Identificada'}</p>
                  <h3 className="font-serif text-3xl font-medium text-slate-800 dark:text-slate-100 leading-tight">{productData.product_name}</h3>
                </div>

                <div className="flex flex-wrap gap-4">
                  <div className="bg-slate-100 dark:bg-slate-700/50 px-4 py-2 rounded-full text-slate-600 dark:text-slate-300 text-sm font-medium flex items-center gap-2">
                    <Info className="w-4 h-4" />
                    {productData.quantity || 'Tamanho não fornecido'}
                  </div>
                </div>

                <div className={`p-5 rounded-2xl border ${getVerdictStyles(analysis.verdict).bg} ${getVerdictStyles(analysis.verdict).border} flex items-start gap-4`}>
                  <div className="shrink-0 mt-1">
                    {getVerdictStyles(analysis.verdict).icon}
                  </div>
                  <div>
                    <h4 className={`font-serif text-xl font-medium mb-1 ${getVerdictStyles(analysis.verdict).text}`}>
                      Veredito: {analysis.verdict.charAt(0).toUpperCase() + analysis.verdict.slice(1)}
                    </h4>
                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-sm sm:text-base">
                      {analysis.warning}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Smart Assistant Message / Voice Play */}
            <div className="clay-card p-6 flex items-start gap-4 bg-emerald-50/50 dark:bg-emerald-990/20 border border-emerald-100/50 dark:border-emerald-900/30 rounded-3xl">
              <button
                onClick={() => playTTS(analysis.assistantMessage)}
                className={`w-12 h-12 rounded-full shrink-0 flex items-center justify-center text-white bg-emerald-500 transition-all ${isPlaying ? 'animate-pulse ring-4 ring-emerald-500/30' : 'hover:scale-105 shadow-md'}`}
              >
                {isPlaying ? <Volume2 className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
              </button>
              <div>
                <h4 className="font-serif text-xl text-emerald-800 dark:text-emerald-400 font-medium mb-1">O que a assistente diz:</h4>
                <p className="font-sans text-slate-700 dark:text-slate-300 text-base sm:text-lg leading-relaxed italic">
                  "{analysis.assistantMessage}"
                </p>
              </div>
            </div>

            {/* Nutrition facts stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Calorias', value: `${analysis.nutrition?.calories ?? 0} kcal`, color: 'text-orange-500' },
                { label: 'Proteínas', value: `${analysis.nutrition?.protein ?? 0}g`, color: 'text-emerald-500' },
                { label: 'Carbos', value: `${analysis.nutrition?.carbs ?? 0}g`, color: 'text-sky-500' },
                { label: 'Gorduras', value: `${analysis.nutrition?.fat ?? 0}g`, color: 'text-rose-500' }
              ].map((stat, i) => (
                <div key={i} className="clay-card p-6 text-center space-y-1 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 rounded-2xl shadow-sm">
                  <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{stat.label}</p>
                  <p className={`text-2xl font-serif font-medium ${stat.color}`}>{stat.value}</p>
                </div>
              ))}
            </div>

            <button
              onClick={reset}
              className="w-full py-4 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/10 dark:hover:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 font-medium rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <RefreshCw className="w-4 h-4" />
              Escanear outro produto ou lata
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
