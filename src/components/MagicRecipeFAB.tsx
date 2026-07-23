import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChefHat, X, Send, Mic, Sparkles, Loader2, Play } from 'lucide-react';
import { UserProfile } from '../types';
import { playSfx, vibrate } from '../lib/sensory';
import { playAudioUrl } from '../lib/speech';
import { textToSpeech, generateMagicRecipe } from '../lib/gemini';

interface MagicRecipeFABProps {
  profile: UserProfile | null;
}

export function MagicRecipeFAB({ profile }: MagicRecipeFABProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [recipe, setRecipe] = useState<{ title: string, description: string, ingredients: string[], instructions: string[], calories: number } | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      playSfx('pop');
      vibrate(10);
    }
  }, [isOpen]);

  const handleGenerate = async () => {
    if (!input.trim() || isLoading) return;
    
    setIsLoading(true);
    setRecipe(null);
    playSfx('tap');
    vibrate(15);
    
    try {
      const data = await generateMagicRecipe(input, profile);
      if (data) {
        setRecipe(data);
        playSfx('success');
        vibrate([30, 50, 30]);
      }
    } catch(e) {
      console.error("Erro ao gerar receita mágica", e);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlayAudio = async () => {
    if (!recipe || isPlayingAudio) return;
    setIsPlayingAudio(true);
    playSfx('tap');
    try {
      const textToSpeak = `Receita Mágica: ${recipe.title}. ${recipe.description}. Os ingredientes são: ${recipe.ingredients.join(', ')}. Modo de preparo: ${recipe.instructions.join('. ')}. E tem aproximadamente ${recipe.calories} calorias. Bom apetite!`;
      const base64Audio = await textToSpeech(textToSpeak);
      if (base64Audio) {
        const url = `data:audio/wav;base64,${base64Audio}`;
        await playAudioUrl(url, { onEnded: () => setIsPlayingAudio(false) });
      } else {
        setIsPlayingAudio(false);
      }
    } catch(e) {
      console.warn(e);
      setIsPlayingAudio(false);
    }
  };

  return (
    <>
      <div className="fixed bottom-24 right-[72px] md:bottom-6 md:right-[80px] z-40">
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsOpen(true)}
          className="p-3 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] flex items-center justify-center gap-2 relative overflow-hidden bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-amber-200/50 dark:border-amber-500/20 text-amber-500 hover:text-amber-600 transition-all font-serif"
        >
          <div className="absolute inset-0 bg-amber-500/10 rounded-full" />
          <ChefHat className="w-5 h-5" />
        </motion.button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setIsOpen(false); playSfx('tap'); vibrate(10); }}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed bottom-0 md:bottom-auto md:top-1/2 left-0 right-0 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 z-50 w-full md:w-full md:max-w-md bg-white dark:bg-slate-900 rounded-t-[32px] md:rounded-[32px] p-6 md:p-8 shadow-2xl border-t md:border border-slate-100 dark:border-slate-800 flex flex-col items-center gap-6 max-h-[85vh]"
            >
              <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full mb-2 md:hidden" />
              
              <div className="w-full flex items-center justify-between">
                <div className="flex items-center gap-3 text-amber-500">
                  <div className="p-2 bg-amber-50 dark:bg-amber-500/10 rounded-full">
                    <ChefHat className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold font-serif text-lg text-slate-800 dark:text-white">Chef IA</h3>
                </div>
                <button 
                  onClick={() => { setIsOpen(false); playSfx('tap'); vibrate(10); setRecipe(null); setInput(''); }} 
                  className="text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              {!recipe ? (
                <>
                  <div className="text-center w-full space-y-2 mb-2">
                    <h4 className="font-bold text-xl text-slate-800 dark:text-white font-serif">O que quer comer hoje?</h4>
                    <p className="text-sm text-slate-500 font-medium px-4">
                      Descreva a sobremesa: se é fitness, para ganhar massa, e quais ingredientes você tem em casa.
                    </p>
                  </div>

                  <div className="relative w-full">
                    <input
                      ref={inputRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                      placeholder="Ex: Doce de leite fit com whey..."
                      className="w-full bg-slate-50 dark:bg-slate-800 rounded-2xl py-4 pl-5 pr-14 outline-none text-sm border-2 border-slate-100 dark:border-slate-700 focus:border-amber-500 transition-colors shadow-inner"
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      <button className="p-2 text-slate-400 hover:text-emerald-500 transition-colors">
                         <Mic className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={handleGenerate}
                        disabled={!input.trim() || isLoading}
                        className="p-2 bg-amber-500 text-white rounded-xl shadow-md hover:bg-amber-600 disabled:opacity-50 transition-colors"
                      >
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <motion.div 
                   initial={{ opacity: 0, y: 10 }}
                   animate={{ opacity: 1, y: 0 }}
                   className="w-full flex-1 overflow-y-auto no-scrollbar space-y-6 pb-6"
                >
                    <div className="flex justify-between items-start">
                      <h4 className="font-bold text-2xl text-slate-800 dark:text-white leading-tight font-serif">
                        {recipe.title}
                      </h4>
                      <button
                        onClick={handlePlayAudio}
                        className="p-3 shrink-0 bg-amber-50 dark:bg-amber-900/20 rounded-full text-amber-500 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors shadow-sm"
                      >
                        {isPlayingAudio ? <Sparkles className="w-5 h-5 animate-pulse" /> : <Play className="w-5 h-5 ml-0.5" />}
                      </button>
                    </div>
                    <p className="text-base text-slate-600 dark:text-slate-400 italic">
                      "{recipe.description}"
                    </p>
                    
                    <div className="bg-amber-50/50 dark:bg-amber-500/5 rounded-[24px] p-5 border border-amber-100 dark:border-amber-500/10 shadow-sm">
                       <p className="text-sm font-bold text-amber-600 dark:text-amber-500 uppercase tracking-widest mb-3 font-serif">Ingredientes</p>
                       <ul className="space-y-3">
                         {recipe.ingredients.map((ing, i) => (
                           <li key={i} className="text-sm text-slate-700 dark:text-slate-300 flex items-center gap-3">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> 
                              {ing}
                           </li>
                         ))}
                       </ul>
                    </div>

                    <div className="space-y-4 px-2">
                       <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Modo de Preparo</p>
                       <ol className="space-y-4">
                         {recipe.instructions.map((inst, i) => (
                           <li key={i} className="text-sm text-slate-700 dark:text-slate-300 flex gap-4">
                              <span className="font-bold text-amber-500 mt-0.5 shrink-0 w-5">{i+1}.</span>
                              <span className="leading-relaxed">{inst}</span>
                           </li>
                         ))}
                       </ol>
                    </div>

                    <div className="flex items-center justify-between pt-6 border-t border-slate-100 dark:border-slate-800 font-serif">
                      <span className="text-sm font-bold text-slate-500">Valor Energético</span>
                      <span className="text-lg font-bold text-emerald-500">{recipe.calories} kcal</span>
                    </div>
                </motion.div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}