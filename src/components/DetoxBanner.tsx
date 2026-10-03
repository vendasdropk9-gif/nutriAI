import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Leaf, Droplets, Sparkles, ChevronRight, Zap, X, Clock, Check, Utensils, Flame, Share2 } from 'lucide-react';
import { useTranslation } from '../contexts/LanguageContext';
import { playSfx, vibrate } from '../lib/sensory';

const DETOX_SLIDES = [
  {
    id: 'd1',
    name: 'Detox Verde Energizante',
    benefit: 'Acelera o metabolismo e purifica',
    calories: '120 kcal',
    image: 'https://images.unsplash.com/photo-1610970881699-44a5587cabec?auto=format&fit=crop&q=80&w=1200',
    tip: 'Que tal começar o dia com esse detox leve? 💚',
    prepTime: '5 min',
    ingredients: [
      { name: '1 folha de couve manteiga', amount: '1 unidade' },
      { name: 'Maçã verde picada', amount: '1 unidade' },
      { name: 'Gengibre fresco ralado', amount: '1 colher de chá' },
      { name: 'Suco de limão fresco', amount: '30ml' },
      { name: 'Água gelada', amount: '300ml' }
    ],
    instructions: [
      'Lave bem os ingredientes em água corrente.',
      'Retire o miolo da maçã verde e pique em cubos.',
      'Bata todos os ingredientes no liquidificador por 2 minutos até obter uma mistura homogênea.',
      'Sirva imediatamente sem coar para preservar as fibras.'
    ]
  },
  {
    id: 'd2',
    name: 'Poder Laranja Imunidade',
    benefit: 'Rico em Vitamina C e Antioxidantes',
    calories: '145 kcal',
    image: 'https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?auto=format&fit=crop&q=80&w=1200',
    tip: 'Esse suco ajuda seu corpo a desinchar e fortalece sua defesa.',
    prepTime: '6 min',
    ingredients: [
      { name: 'Suco de laranjas pera', amount: '250ml' },
      { name: 'Cenoura média ralada', amount: '1 unidade' },
      { name: 'Cúrcuma em pó', amount: '1 pitada' },
      { name: 'Água de coco', amount: '200ml' }
    ],
    instructions: [
      'Esprema o suco das laranjas frescos.',
      'No liquidificador, adicione a cenoura, o suco de laranja, a cúrcuma e a água de coco.',
      'Bata na potência máxima por 90 segundos.',
      'Coe se preferir uma textura mais leve ou beba direto.'
    ]
  },
  {
    id: 'd3',
    name: 'Red Glow Revitalizante',
    benefit: 'Pele radiante e circulação ativa',
    calories: '130 kcal',
    image: 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?auto=format&fit=crop&q=80&w=1200',
    tip: 'Refrescante, saudável e super fácil de preparar!',
    prepTime: '5 min',
    ingredients: [
      { name: 'Frutas vermelhas (morango, framboesa, mirtilo)', amount: '1 xícara' },
      { name: 'Beterraba pequena', amount: '1/2 unidade' },
      { name: 'Chá de hibisco gelado', amount: '200ml' },
      { name: 'Mel ou xilitol (opcional)', amount: '1 colher de chá' }
    ],
    instructions: [
      'Prepare o chá de hibisco previamente e deixe gelar.',
      'Adicione as frutas vermelhas, a beterraba e o chá no liquidificador.',
      'Bata vigorosamente até formar um creme uniforme e vibrante.',
      'Despeje em um copo alto e decore com hortelã.'
    ]
  },
  {
    id: 'd4',
    name: 'Yellow Zen Anti-inflamatório',
    benefit: 'Gengibre e cúrcuma para bem-estar',
    calories: '95 kcal',
    image: 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&q=80&w=1200',
    tip: 'Quer ver como preparar essa dose extra de saúde?',
    prepTime: '4 min',
    ingredients: [
      { name: 'Rodela grossa de abacaxi', amount: '1 fatia' },
      { name: 'Gengibre ralado', amount: '1 colher de chá' },
      { name: 'Pimenta-do-reino preta', amount: '1 pitada' },
      { name: 'Água mineral bem gelada', amount: '300ml' }
    ],
    instructions: [
      'Descasque e pique o abacaxi.',
      'Bata o abacaxi com o gengibre e a água no liquidificador.',
      'Adicione a pitada de pimenta-do-reino (potencializa os ativos) e misture.',
      'Sirva com gelo.'
    ]
  },
  {
    id: 'd5',
    name: 'Deep Green Clorofila',
    benefit: 'Limpeza profunda e oxigenação',
    calories: '80 kcal',
    image: 'https://images.unsplash.com/photo-1543257580-7269da773bf5?auto=format&fit=crop&q=80&w=1200',
    tip: 'Sinta a energia da natureza em cada gole. Você merece.',
    prepTime: '5 min',
    ingredients: [
      { name: 'Folhas de couve', amount: '2 unidades' },
      { name: 'Pepino japonês', amount: '1/2 unidade' },
      { name: 'Hortelã fresca', amount: '5 folhas' },
      { name: 'Suco de limão', amount: '30ml' },
      { name: 'Água de coco', amount: '250ml' }
    ],
    instructions: [
      'Higienize a couve, o pepino e a hortelã.',
      'Corte o pepino em rodelas.',
      'Bata todos os ingredientes com a água de coco e o limão até liquefazer.',
      'Sirva fresco.'
    ]
  },
  {
    id: 'd6',
    name: 'Sweet Pure Berries',
    benefit: 'Foco mental e combate ao estresse',
    calories: '160 kcal',
    image: 'https://images.unsplash.com/photo-1600718374662-0483d2b9da44?auto=format&fit=crop&q=80&w=1200',
    tip: 'Uma explosão de antioxidantes para o seu cérebro.',
    prepTime: '4 min',
    ingredients: [
      { name: 'Morangos congelados', amount: '1 xícara' },
      { name: 'Mirtilos (blueberry)', amount: '1/2 xícara' },
      { name: 'Leite de amêndoas', amount: '200ml' },
      { name: 'Sementes de chia', amount: '1 colher de sopa' }
    ],
    instructions: [
      'Coloque o leite de amêndoas no liquidificador.',
      'Adicione as frutas vermelhas congeladas.',
      'Bata até obter consistência cremosa de smoothie.',
      'Polvilhe chia por cima ao servir.'
    ]
  },
  {
    id: 'd7',
    name: 'Cucumber Crisp Refresh',
    benefit: 'Hidratação extrema e diurético',
    calories: '65 kcal',
    image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&q=80&w=1200',
    tip: 'O equilíbrio perfeito para dias mais intensos.',
    prepTime: '3 min',
    ingredients: [
      { name: 'Pepino japonês picado', amount: '1 unidade' },
      { name: 'Suco de limões', amount: '50ml' },
      { name: 'Hortelã fresca', amount: '1 ramo' },
      { name: 'Água mineral', amount: '300ml' }
    ],
    instructions: [
      'Bata o pepino com o suco de limão e a água no liquidificador.',
      'Coe levemente se desejar.',
      'Adicione folhas de hortelã e cubos de gelo.'
    ]
  },
  {
    id: 'd8',
    name: 'Kiwi Power Clean',
    benefit: 'Digestão leve e fibras solúveis',
    calories: '110 kcal',
    image: 'https://images.unsplash.com/photo-1589733593635-856ca5e0766d?auto=format&fit=crop&q=80&w=1200',
    tip: 'Combine com seu plano alimentar para resultados incríveis.',
    prepTime: '4 min',
    ingredients: [
      { name: 'Kiwis maduros descascados', amount: '2 unidades' },
      { name: 'Maçã verde', amount: '1 unidade' },
      { name: 'Água de coco', amount: '250ml' }
    ],
    instructions: [
      'Descasque os kiwis e pique a maçã verde.',
      'Bata tudo no liquidificador até liquefazer.',
      'Sirva imediatamente.'
    ]
  }
];

interface DetoxSlideImageProps {
  src: string;
  alt: string;
  slideId: string;
}

function DetoxSlideImage({ src, alt, slideId }: DetoxSlideImageProps) {
  const [imgSrc, setImgSrc] = useState(src);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setImgSrc(src);
    setHasError(false);
    setIsLoading(true);
  }, [src]);

  const handleImgError = () => {
    setHasError(true);
    setIsLoading(false);
  };

  const handleImgLoad = () => {
    setIsLoading(false);
  };

  if (hasError) {
    let fruitsEmoji = "🥬 🍏 🥝";
    if (slideId === 'd2') fruitsEmoji = "🍊 🍋 🥕";
    else if (slideId === 'd3') fruitsEmoji = "🍓 🍇 🍒";
    else if (slideId === 'd4') fruitsEmoji = "🍍 ✨";
    else if (slideId === 'd6') fruitsEmoji = "🫐 🍓 🍇";

    return (
      <div className="w-full h-full bg-gradient-to-br from-emerald-900 via-emerald-950 to-teal-950 flex flex-col items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.06),transparent_50%)] animate-pulse" />
        <span className="text-4xl sm:text-6xl mb-3 filter drop-shadow-md select-none opacity-80">{fruitsEmoji}</span>
        <div className="text-emerald-400/50 font-mono text-[8px] uppercase tracking-[0.25em] relative z-10 select-none">
          Receita Saudável Ativa
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative">
      {isLoading && (
        <div className="absolute inset-0 bg-slate-100 dark:bg-slate-800 animate-pulse flex items-center justify-center">
          <div className="w-6 h-6 rounded-full border-2 border-emerald-500/20 border-t-emerald-500 animate-spin" />
        </div>
      )}
      <img
        src={imgSrc}
        alt={alt}
        onLoad={handleImgLoad}
        onError={handleImgError}
        className={`w-full h-full object-cover object-center transition-all duration-700 ${isLoading ? 'opacity-0 scale-102' : 'opacity-100 scale-100'}`}
        referrerPolicy="no-referrer"
      />
    </div>
  );
}

export function DetoxBanner() {
  const { t } = useTranslation();
  const [index, setIndex] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % DETOX_SLIDES.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const slide = DETOX_SLIDES[index];

  const handleOpenRecipe = () => {
    playSfx('tap');
    vibrate(40);
    setIsModalOpen(true);
  };

  const handleCopyRecipe = () => {
    playSfx('success');
    vibrate(30);
    const text = `${slide.name}\n\nCalorias: ${slide.calories}\nTempo: ${slide.prepTime}\n\nIngredientes:\n${slide.ingredients.map(i => `- ${i.name} (${i.amount})`).join('\n')}\n\nModo de Preparo:\n${slide.instructions.join('\n')}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <div className="relative -mx-4 sm:mx-0 w-[calc(100%+2rem)] sm:w-full h-[260px] sm:h-[360px] md:h-[460px] rounded-2xl sm:rounded-[32px] md:rounded-[48px] clay-card overflow-hidden shadow-2xl mb-8 md:mb-12 bg-white dark:bg-slate-900 box-border">
        <AnimatePresence mode="wait">
          <motion.div
            key={slide.id}
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            className="absolute inset-0"
          >
            <DetoxSlideImage src={slide.image} alt={slide.name} slideId={slide.id} />
            <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/95 via-emerald-950/40 to-black/20" />
            
            <div className="absolute top-4 left-4 sm:top-6 sm:left-6 md:top-8 md:left-8 flex gap-2 flex-wrap pr-4">
               <div className="bg-white/10 backdrop-blur-md px-3 py-1 sm:px-4 sm:py-2 rounded-full flex items-center gap-1.5 text-white text-[9px] sm:text-xs font-bold uppercase tracking-widest border border-white/20 whitespace-nowrap shadow-sm">
                  <Leaf className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-emerald-400 flex-shrink-0" />
                  Pure Detox Premium
               </div>
            </div>

            <div className="absolute bottom-4 left-4 right-10 sm:bottom-6 sm:left-6 sm:right-12 md:bottom-12 md:left-12 md:right-16 flex flex-col items-start text-left sm:flex-row sm:items-end justify-between gap-3 sm:gap-4 md:gap-8 box-border">
              <div className="space-y-1.5 sm:space-y-3 max-w-full md:max-w-xl flex flex-col items-start pr-0 md:pr-0">
                <motion.div 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className="flex items-center justify-start gap-1.5 sm:gap-2 flex-wrap"
                >
                  <div className="px-2 py-0.5 bg-emerald-500 text-white rounded-md text-[9px] sm:text-[10px] font-bold uppercase whitespace-nowrap shadow-sm">
                    {slide.calories}
                  </div>
                  <div className="flex items-center gap-1 text-emerald-300 text-[10px] sm:text-xs font-medium whitespace-nowrap">
                    <Droplets className="w-3 h-3 flex-shrink-0" />
                    {t('efeito_refrescante', 'Efeito Refrescante')}
                  </div>
                </motion.div>
                
                <motion.h3 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="text-lg sm:text-3xl md:text-5xl font-serif font-bold text-white leading-tight break-words drop-shadow-md"
                >
                  {t(slide.name)}
                </motion.h3>
                
                <motion.p 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="text-emerald-50/90 text-xs sm:text-base md:text-xl font-medium line-clamp-2 break-words drop-shadow-sm"
                >
                  {t(slide.benefit)}
                </motion.p>
              </div>

              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="flex items-center justify-start gap-3 w-auto shrink-0"
              >
                <button 
                  onClick={handleOpenRecipe}
                  className="px-3.5 py-2 sm:px-6 sm:py-3 md:px-8 md:py-5 bg-white text-emerald-950 rounded-xl md:rounded-2xl font-bold flex items-center justify-center gap-1.5 sm:gap-3 active:scale-95 hover:bg-emerald-50 transition-all shadow-xl shadow-emerald-950/20 group cursor-pointer"
                >
                  <span className="text-xs sm:text-sm md:text-base truncate">{t('ver_receita', 'Ver Receita')}</span>
                  <ChevronRight className="w-3.5 sm:w-5 h-3.5 sm:h-5 group-hover:translate-x-1 transition-transform flex-shrink-0" />
                </button>
              </motion.div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Progress Indicators - Vertical on right edge */}
        <div className="absolute right-2 sm:right-4 md:right-8 top-1/2 -translate-y-1/2 flex flex-col gap-1 sm:gap-2 md:gap-3">
          {DETOX_SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              className={`w-1.5 md:w-2 transition-all duration-500 rounded-full ${
                index === i ? 'h-5 sm:h-8 md:h-12 bg-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.7)]' : 'h-1.5 sm:h-2 md:h-3 bg-white/40'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Recipe Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-6">
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-emerald-500 text-white rounded-full text-xs font-bold uppercase tracking-wider">
                  {slide.calories}
                </span>
                <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 font-medium">
                  <Clock className="w-3.5 h-3.5" /> {slide.prepTime}
                </span>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
                {t(slide.name)}
              </h2>
              <p className="text-emerald-600 dark:text-emerald-400 font-medium text-sm sm:text-base">
                {t(slide.benefit)}
              </p>
            </div>

            <div className="relative h-48 sm:h-64 rounded-2xl overflow-hidden shadow-md">
              <DetoxSlideImage src={slide.image} alt={slide.name} slideId={slide.id} />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent flex items-end p-4">
                <p className="text-white text-xs sm:text-sm font-medium italic drop-shadow">
                  "{slide.tip}"
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-serif text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Utensils className="w-5 h-5 text-emerald-500" /> Ingredientes Necessários
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {slide.ingredients.map((ing, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs sm:text-sm">
                    <span className="font-medium text-slate-700 dark:text-slate-200">{ing.name}</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">{ing.amount}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-serif text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Flame className="w-5 h-5 text-emerald-500" /> Modo de Preparo Passo a Passo
              </h3>
              <div className="space-y-3">
                {slide.instructions.map((step, idx) => (
                  <div key={idx} className="flex items-start gap-3.5 p-3.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-500 text-white font-bold text-xs flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 leading-relaxed pt-0.5">
                      {step}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={handleCopyRecipe}
                className="px-5 py-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center gap-2 transition-colors cursor-pointer"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Share2 className="w-4 h-4" />}
                {copied ? 'Receita Copiada!' : 'Copiar Receita'}
              </button>
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors shadow-md shadow-emerald-600/20 cursor-pointer"
              >
                Concluir & Fechar
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
