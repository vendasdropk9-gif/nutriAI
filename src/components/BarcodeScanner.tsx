import React, { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { analyzeBarcodeProduct } from '../lib/gemini';
import { speak } from '../lib/speech';
import { UserProfile } from '../types';
import { Barcode, Loader2, Play, Volume2, Info, AlertTriangle, CheckCircle2, RefreshCw, X, ShieldAlert } from 'lucide-react';

interface BarcodeScannerProps {
  profile: UserProfile | null;
}

export function BarcodeScanner({ profile }: BarcodeScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [productData, setProductData] = useState<any | null>(null);
  const [analysis, setAnalysis] = useState<any | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(e => console.error(e));
      }
    };
  }, []);

  const startScanner = () => {
    setProductData(null);
    setAnalysis(null);
    setError(null);
    setIsScanning(true);

    // Initialize scanner after a short delay to ensure div is present
    setTimeout(() => {
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
        // Ignored as it scans continuously
      });
      
      scannerRef.current = scanner;
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
        setError("Produto não encontrado no banco de dados.");
      }
    } catch (err) {
      console.error(err);
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
    setAudioUrl(null);
    setError(null);
    setIsScanning(false);
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
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      <div className="text-center space-y-4">
        <h2 className="font-serif text-4xl md:text-5xl font-medium tracking-tight text-emerald-700 dark:text-emerald-400">
          Scanner de Produtos
        </h2>
        <p className="font-sans text-slate-500 dark:text-slate-400 max-w-xl mx-auto text-lg leading-relaxed">
          Escaneie o código de barras de produtos industrializados para ver se eles ajudam ou atrapalham o seu objetivo.
        </p>
      </div>

      <div className="clay-card p-8">
        {!isScanning && !productData && !isAnalyzing && (
          <div className="flex flex-col items-center justify-center py-12 space-y-6">
            <div className="w-24 h-24 bg-emerald-100 dark:bg-emerald-900/40 rounded-full flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Barcode className="w-12 h-12" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="font-serif text-2xl font-medium text-slate-800 dark:text-slate-100">Pronto para escanear?</h3>
              <p className="text-slate-500 dark:text-slate-400 max-w-xs">Aponte a câmera para o código de barras do produto.</p>
            </div>
            <button
              onClick={startScanner}
              className="bg-emerald-500 hover:bg-emerald-600 text-white px-10 py-4 rounded-2xl font-medium shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-3"
            >
              <Barcode className="w-5 h-5" />
              Abrir Câmera do Scanner
            </button>
          </div>
        )}

        {isScanning && (
          <div className="space-y-6">
            <div id="barcode-reader" className="overflow-hidden rounded-2xl border-2 border-emerald-500/30"></div>
            <button
              onClick={() => {
                if (scannerRef.current) scannerRef.current.clear();
                setIsScanning(false);
              }}
              className="w-full py-4 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl font-medium flex items-center justify-center gap-2"
            >
              <X className="w-5 h-5" />
              Cancelar Scanner
            </button>
          </div>
        )}

        {isAnalyzing && (
          <div className="flex flex-col items-center justify-center py-20 space-y-6">
            <Loader2 className="w-16 h-16 text-emerald-500 animate-spin" />
            <p className="text-slate-600 dark:text-slate-300 font-medium text-xl">Analisando produto...</p>
          </div>
        )}

        {error && (
          <div className="p-6 bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800/30 rounded-2xl flex items-center gap-4 text-rose-700 dark:text-rose-400">
            <AlertTriangle className="w-6 h-6 shrink-0" />
            <div className="flex-1">
              <p className="font-medium">{error}</p>
            </div>
            <button onClick={reset} className="p-2 hover:bg-rose-100 dark:hover:bg-rose-800/40 rounded-full transition-colors">
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
        )}

        {analysis && productData && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="flex flex-col md:flex-row gap-8 items-start">
              {productData.image_url && (
                <div className="w-full md:w-48 aspect-square rounded-2xl overflow-hidden shadow-md shrink-0 bg-white p-2">
                  <img src={productData.image_url} alt={productData.product_name} className="w-full h-full object-contain" />
                </div>
              )}
              <div className="space-y-4 flex-1">
                <div className="space-y-1">
                  <p className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{productData.brands || 'Marca Desconhecida'}</p>
                  <h3 className="font-serif text-3xl font-medium text-slate-800 dark:text-slate-100">{productData.product_name}</h3>
                </div>

                <div className="flex flex-wrap gap-4">
                  <div className="bg-slate-100 dark:bg-slate-700/50 px-4 py-2 rounded-full text-slate-600 dark:text-slate-300 text-sm font-medium flex items-center gap-2">
                    <Info className="w-4 h-4" />
                    {productData.quantity || 'Tamanho não informado'}
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
                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                      {analysis.warning}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="clay-card p-6 flex items-start gap-4">
               <button
                  onClick={() => playTTS(analysis.assistantMessage)}
                  className={`w-12 h-12 rounded-full shrink-0 flex items-center justify-center text-white bg-emerald-500 transition-all ${isPlaying ? 'animate-pulse ring-4 ring-emerald-500/30' : 'hover:scale-105 shadow-md'}`}
                >
                  {isPlaying ? <Volume2 className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                </button>
                <div>
                  <h4 className="font-serif text-xl text-emerald-800 dark:text-emerald-400 font-medium mb-1">O que a assistente diz:</h4>
                  <p className="font-sans text-slate-700 dark:text-slate-300 text-lg leading-relaxed italic">
                    "{analysis.assistantMessage}"
                  </p>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
               {[
                 { label: 'Calorias', value: `${analysis.nutrition.calories} kcal`, color: 'text-orange-500' },
                 { label: 'Proteínas', value: `${analysis.nutrition.protein}g`, color: 'text-emerald-500' },
                 { label: 'Carbos', value: `${analysis.nutrition.carbs}g`, color: 'text-sky-500' },
                 { label: 'Gorduras', value: `${analysis.nutrition.fat}g`, color: 'text-rose-500' }
               ].map((stat, i) => (
                 <div key={i} className="clay-card p-6 text-center space-y-1">
                   <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{stat.label}</p>
                   <p className={`text-2xl font-serif font-medium ${stat.color}`}>{stat.value}</p>
                 </div>
               ))}
            </div>

            <button
              onClick={reset}
              className="w-full py-4 text-slate-500 hover:text-emerald-600 font-medium flex items-center justify-center gap-2 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Escanear outro produto
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
