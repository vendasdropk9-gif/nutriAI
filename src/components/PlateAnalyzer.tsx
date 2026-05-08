import React, { useState, useRef } from 'react';
import { Camera, Upload, Loader2, Target, CheckCircle2, RefreshCw, Brain } from 'lucide-react';
import { analyzePlate } from '../lib/gemini';
import { speak } from '../lib/speech';
import { PlateAnalysisResult } from '../types';

interface PlateAnalyzerProps {
  onAwardPoints?: (amount: number, reason: string) => void;
}

export function PlateAnalyzer({ onAwardPoints }: PlateAnalyzerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<PlateAnalysisResult | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      stopAudio();
      setIsScanning(true);
      setAnalysisResult(null);
      
      // Create preview
      const previewUrl = URL.createObjectURL(file);
      setPreviewImage(previewUrl);

      // Convert to Base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        const result = reader.result as string;
        const base64Data = result.split(',')[1];
        const mimeType = file.type;

        const data = await analyzePlate(base64Data, mimeType);
        if (data) {
          setAnalysisResult(data);
          if (onAwardPoints) onAwardPoints(50, 'Análise de prato via foto concluída');
        } else {
          alert('Não foi possível analisar a imagem.');
        }
        setIsScanning(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error(error);
      alert('Erro ao escanear a imagem.');
      setIsScanning(false);
    }
  };

  const resetScanner = () => {
    stopAudio();
    setPreviewImage(null);
    setAnalysisResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700 pb-16">
      <div className="text-center space-y-4 mb-12">
        <h2 className="font-serif text-4xl md:text-5xl font-medium tracking-tight text-emerald-700 dark:text-emerald-400">
          Análise de Prato
        </h2>
        <p className="font-sans text-slate-500 dark:text-slate-400 max-w-xl mx-auto text-lg leading-relaxed">
          Tire uma foto do seu prato e a Inteligência Artificial fará a leitura nutricional para você na hora.
        </p>
      </div>

      <div className="clay-card p-8">
        
        {/* State 1: Upload / Wait */}
        {!previewImage && (
          <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-emerald-300 dark:border-emerald-700/50 bg-emerald-50/50 dark:bg-slate-800/50 rounded-[24px]">
            <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mb-6">
              <Camera className="w-10 h-10" />
            </div>
            <p className="text-slate-600 dark:text-slate-300 font-medium mb-6 text-center max-w-sm">
              Use a câmera para capturar seu prato ou envie uma foto.
            </p>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              ref={fileInputRef}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="bg-emerald-500 hover:bg-emerald-600 text-white font-sans font-medium px-8 py-4 rounded-full transition-all duration-300 flex items-center gap-2 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 hover:-translate-y-0.5"
            >
              <Camera className="w-5 h-5" />
              Tirar Foto do Prato
            </button>
          </div>
        )}

        {/* State 2: Scanning / Processing */}
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

        {/* State 3: Analysis Done */}
        {previewImage && analysisResult && !isScanning && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
            {/* Top section: small image + assistant message */}
            <div className="flex flex-col md:flex-row gap-6 items-center clay-card p-6">
              <div className="w-32 h-32 md:w-48 md:h-48 shrink-0 rounded-[16px] overflow-hidden shadow-md">
                <img src={previewImage} alt="Seu prato" className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 space-y-4">
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-full shrink-0 flex items-center justify-center bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 ${isPlaying ? 'animate-pulse ring-4 ring-emerald-200 dark:ring-emerald-700/50' : ''}`}>
                    <Target className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-serif text-xl text-slate-800 dark:text-slate-100 font-medium mb-1">Assistente diz:</h4>
                    <p className="font-sans text-slate-600 dark:text-slate-300 text-lg leading-relaxed italic">
                      "{analysisResult.assistantMessage}"
                    </p>
                    <div className="mt-4 flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 font-medium animate-pulse">
                       <Brain className="w-4 h-4" />
                       <span>Como você se sente após essa refeição? Registre na aba "Mente".</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="shrink-0 flex flex-col md:flex-row gap-3">
                 <button
                  onClick={resetScanner}
                  className="bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600/50 px-6 py-3 rounded-full font-medium transition-all shadow-sm flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Nova Foto
                </button>
              </div>
            </div>

            {/* Nutrients Grid */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-orange-50 p-6 rounded-[20px] text-center border border-orange-100/50 hover:-translate-y-1 transition-transform">
                <p className="text-orange-500 font-medium text-sm mb-1 uppercase tracking-wider">Calorias</p>
                <p className="text-3xl font-serif text-orange-700">{analysisResult.nutrition.calories} <span className="text-lg text-orange-400 font-sans">kcal</span></p>
              </div>
              <div className="bg-red-50 p-6 rounded-[20px] text-center border border-red-100/50 hover:-translate-y-1 transition-transform">
                <p className="text-red-500 font-medium text-sm mb-1 uppercase tracking-wider">Proteína</p>
                <p className="text-3xl font-serif text-red-700">{analysisResult.nutrition.protein} <span className="text-lg text-red-400 font-sans">g</span></p>
              </div>
              <div className="bg-amber-50 p-6 rounded-[20px] text-center border border-amber-100/50 hover:-translate-y-1 transition-transform">
                <p className="text-amber-500 font-medium text-sm mb-1 uppercase tracking-wider">Carbo.</p>
                <p className="text-3xl font-serif text-amber-700">{analysisResult.nutrition.carbs} <span className="text-lg text-amber-400 font-sans">g</span></p>
              </div>
              <div className="bg-yellow-50 p-6 rounded-[20px] text-center border border-yellow-100/50 hover:-translate-y-1 transition-transform">
                <p className="text-yellow-600 font-medium text-sm mb-1 uppercase tracking-wider">Gorduras</p>
                <p className="text-3xl font-serif text-yellow-800">{analysisResult.nutrition.fat} <span className="text-lg text-yellow-500 font-sans">g</span></p>
              </div>
              <div className="bg-green-50 p-6 rounded-[20px] text-center border border-green-100/50 hover:-translate-y-1 transition-transform">
                <p className="text-green-500 font-medium text-sm mb-1 uppercase tracking-wider">Fibras</p>
                <p className="text-3xl font-serif text-green-700">{analysisResult.nutrition.fiber} <span className="text-lg text-green-400 font-sans">g</span></p>
              </div>
            </div>

            {/* Details Section */}
            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-white/60 dark:bg-slate-800/60 p-6 rounded-[24px] border border-white dark:border-slate-700/50">
                <h4 className="font-serif text-xl text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
                  Alimentos Identificados
                </h4>
                <ul className="space-y-3">
                  {analysisResult.foods.map((food, idx) => (
                    <li key={idx} className="flex items-center gap-3 text-slate-600 dark:text-slate-300 bg-white/40 dark:bg-slate-700/40 p-3 rounded-xl border border-slate-100 dark:border-slate-600/50">
                      <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                      <span className="font-medium">{food}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-emerald-50/50 dark:bg-emerald-900/20 p-6 rounded-[24px] border border-emerald-100/50 dark:border-emerald-800/30">
                <h4 className="font-serif text-xl text-emerald-800 dark:text-emerald-400 mb-4 flex items-center gap-2">
                  <Target className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
                  Sugestões da Assistente
                </h4>
                <ul className="space-y-4">
                  {analysisResult.suggestions.map((sug, idx) => (
                    <li key={idx} className="text-emerald-700 dark:text-emerald-300 bg-white/60 dark:bg-slate-800/60 p-4 rounded-2xl border border-emerald-100/40 dark:border-emerald-800/30 leading-relaxed shadow-sm">
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
