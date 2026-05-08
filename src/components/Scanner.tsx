import React, { useState, useRef } from 'react';
import { Camera, Upload, Loader2, X } from 'lucide-react';
import { scanIngredients } from '../lib/gemini';

interface ScannerProps {
  onIngredientsDetected: (ingredients: string[]) => void;
}

export function Scanner({ onIngredientsDetected }: ScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [previewLine, setPreviewLine] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsScanning(true);
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

        const ingredients = await scanIngredients(base64Data, mimeType);
        if (ingredients && ingredients.length > 0) {
          onIngredientsDetected(ingredients);
        } else {
          alert('Nenhum ingrediente identificado na imagem.');
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

  const cancelScan = () => {
    setPreviewLine(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="clay-card p-6 flex flex-col items-center justify-center gap-4 relative overflow-hidden group">
      {previewLine && (
        <div className="absolute inset-0 z-10 w-full h-full bg-cover bg-center" style={{ backgroundImage: `url(${previewLine})` }}>
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-sm">
            {isScanning ? (
              <div className="flex flex-col items-center gap-2 text-white">
                <Loader2 className="w-8 h-8 animate-spin" />
                <span className="font-medium">Identificando alimentos...</span>
              </div>
            ) : (
              <button onClick={cancelScan} className="absolute top-4 right-4 p-2 bg-white/20 dark:bg-slate-800/40 rounded-full hover:bg-white/40 dark:hover:bg-slate-700/60 backdrop-blur-md text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      )}
      
      <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform duration-300">
        <Camera className="w-8 h-8" />
      </div>
      <div className="text-center">
        <h4 className="font-sans font-bold text-slate-700 dark:text-slate-200">Escanear Ingredientes</h4>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-xs">Tire uma foto da sua geladeira ou despensa para a IA identificar o que você tem.</p>
      </div>

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
        className="mt-2 py-2 px-6 bg-white/60 dark:bg-slate-800/60 hover:bg-white/80 dark:hover:bg-slate-700/80 border border-white/60 dark:border-slate-600/50 rounded-full font-medium text-slate-700 dark:text-slate-200 transition-colors flex items-center gap-2"
      >
        <Upload className="w-4 h-4" />
        Selecionar Imagem
      </button>
    </div>
  );
}
