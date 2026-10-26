import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Camera, Sparkles, Video, Image as ImageIcon, Zap, Upload, Loader2, CheckCircle2 } from 'lucide-react';
import { playSfx, vibrate } from '../lib/sensory';
import { getFirestore, collection, addDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

export function AdsManager({ onAwardPoints }: { onAwardPoints: (amount: number, reason: string) => void }) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedAds, setGeneratedAds] = useState<{ type: 'photo' | 'video', url: string, status: 'ready' }[]>([]);

  const db = getFirestore();
  const auth = getAuth();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedFile(event.target.files[0]);
    }
  };

  const generateAd = async (type: 'photo' | 'video') => {
    if (!selectedFile || !auth.currentUser) return;
    
    setIsGenerating(true);
    vibrate(20);
    playSfx('tap');

    // Simulate API call to Nano Banana / Google Veo
    await new Promise(resolve => setTimeout(resolve, 3000));

    const newAd = {
      type,
      url: URL.createObjectURL(selectedFile), // Mock URL
      status: 'ready' as const
    };

    // Save to Firestore
    try {
      await addDoc(collection(db, `users/${auth.currentUser.uid}/advertisements`), {
        productId: 'mock-product-id', // Placeholder
        type,
        url: newAd.url,
        createdAt: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error saving ad:", error);
    }

    setGeneratedAds([...generatedAds, newAd]);
    setIsGenerating(false);
    onAwardPoints(50, `Anúncio gerado com sucesso via ${type === 'photo' ? 'Nano Banana' : 'Google Veo'}`);
    playSfx('success');
  };

  return (
    <div className="space-y-8 animate-fade">
      <div className="clay-card p-8 space-y-6">
        <h3 className="text-2xl font-serif font-bold text-slate-900 dark:text-white flex items-center gap-3">
          <Sparkles className="text-emerald-500" /> Gerador de Anúncios AI
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Faça upload de uma foto do produto e utilize nossa IA avançada para criar anúncios profissionais.
        </p>

        <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-8 flex flex-col items-center justify-center gap-4 text-center hover:border-emerald-500/50 transition-all">
          <input type="file" onChange={handleFileChange} className="hidden" id="product-photo" accept="image/*" />
          <label htmlFor="product-photo" className="cursor-pointer flex flex-col items-center gap-3">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center">
              <Upload className="w-8 h-8 text-slate-400" />
            </div>
            <span className="font-bold text-sm text-slate-600 dark:text-slate-300">
              {selectedFile ? selectedFile.name : 'Selecione a foto do produto'}
            </span>
          </label>
        </div>

        {selectedFile && (
          <div className="w-full h-48 rounded-xl overflow-hidden mb-4 border border-slate-200 dark:border-slate-700 bg-slate-100 flex items-center justify-center">
            <img src={URL.createObjectURL(selectedFile)} alt="Preview" className="w-full h-full object-contain" />
          </div>
        )}
        {selectedFile && (
          <div className="flex gap-4">
            <button 
              onClick={() => generateAd('photo')}
              disabled={isGenerating}
              className="flex-1 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isGenerating ? <><Loader2 className="w-5 h-5 animate-spin" /> Processando...</> : <><ImageIcon className="w-5 h-5" /> Gerar (Foto - Nano Banana)</>}
            </button>
            <button 
              onClick={() => generateAd('video')}
              disabled={isGenerating}
              className="flex-1 px-6 py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isGenerating ? <><Loader2 className="w-5 h-5 animate-spin" /> Processando...</> : <><Video className="w-5 h-5" /> Gerar (Vídeo - Google Veo)</>}
            </button>
          </div>
        )}
      </div>

      {generatedAds.length > 0 && (
        <div className="grid sm:grid-cols-2 gap-6">
          {generatedAds.map((ad, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="clay-card p-4 space-y-4 shadow-sm"
            >
              <div className="relative aspect-video bg-slate-100 dark:bg-slate-800 rounded-xl overflow-hidden flex items-center justify-center">
                {ad.type === 'photo' ? <ImageIcon className="w-12 h-12 text-slate-400" /> : <Video className="w-12 h-12 text-slate-400" />}
                <div className="absolute top-3 left-3 bg-white/90 dark:bg-slate-900/90 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest text-slate-900 dark:text-white">
                  {ad.type}
                </div>
              </div>
              <div className="flex items-center justify-between text-xs font-bold text-emerald-600 dark:text-emerald-400">
                <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" /> Pronto para uso</span>
                <button className="text-slate-400 hover:text-slate-600 cursor-pointer">Baixar</button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
