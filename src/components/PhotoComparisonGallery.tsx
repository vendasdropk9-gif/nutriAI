import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Layers, X } from 'lucide-react';
import { PhotoEntry } from './PhotoEvolution';

interface PhotoComparisonGalleryProps {
  entries: PhotoEntry[];
  onClose: () => void;
}

export const PhotoComparisonGallery: React.FC<PhotoComparisonGalleryProps> = ({ entries, onClose }) => {
  const [photoA, setPhotoA] = useState<PhotoEntry | null>(entries[entries.length - 1] || null);
  const [photoB, setPhotoB] = useState<PhotoEntry | null>(entries[0] || null);
  const [sliderPosition, setSliderPosition] = useState(50);

  if (entries.length < 2) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl relative">
        <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500 hover:text-slate-900 dark:hover:text-white">
          <X className="w-6 h-6" />
        </button>
        
        <h3 className="text-2xl font-serif font-black text-slate-800 dark:text-white mb-6">Comparação de Evolução</h3>

        <div className="relative w-full aspect-[3/4] md:aspect-[4/3] rounded-2xl overflow-hidden shadow-lg bg-slate-100 dark:bg-slate-800">
          {photoA && photoB && (
            <>
              <img src={photoB.imageBase64} alt="Antes" className="absolute inset-0 w-full h-full object-cover" />
              <div 
                className="absolute inset-0 w-full h-full"
                style={{ clipPath: `inset(0 0 0 ${sliderPosition}%)` }}
              >
                <img src={photoA.imageBase64} alt="Depois" className="w-full h-full object-cover" />
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={sliderPosition}
                onChange={(e) => setSliderPosition(Number(e.target.value))}
                className="absolute inset-y-0 w-full z-20 opacity-0 cursor-ew-resize"
              />
              <div className="absolute inset-y-0 z-10" style={{ left: `${sliderPosition}%` }}>
                <div className="w-1 h-full bg-white shadow-lg shadow-black/50" />
                <div className="absolute top-1/2 -translate-y-1/2 -left-3 w-6 h-6 bg-white rounded-full shadow-lg flex items-center justify-center">
                  <Layers className="w-4 h-4 text-slate-800" />
                </div>
              </div>
            </>
          )}
        </div>

        <div className="mt-6 flex gap-4">
           <select className="flex-1 p-3 bg-slate-100 dark:bg-slate-800 rounded-xl" value={photoB?.id} onChange={(e) => setPhotoB(entries.find(en => en.id === e.target.value) || null)}>
             {entries.map(e => <option key={e.id} value={e.id}>Antes: {new Date(e.date).toLocaleDateString()}</option>)}
           </select>
           <select className="flex-1 p-3 bg-slate-100 dark:bg-slate-800 rounded-xl" value={photoA?.id} onChange={(e) => setPhotoA(entries.find(en => en.id === e.target.value) || null)}>
             {entries.map(e => <option key={e.id} value={e.id}>Depois: {new Date(e.date).toLocaleDateString()}</option>)}
           </select>
        </div>
      </div>
    </div>
  );
};
