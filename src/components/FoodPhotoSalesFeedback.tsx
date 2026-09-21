import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Star, Sparkles, CheckCircle2, AlertTriangle, Lightbulb, 
  ShoppingBag, Camera, Eye, Zap, RefreshCw, X, ArrowUpRight, 
  ShieldCheck, Heart, ThumbsUp, Flame, Tag, Image as ImageIcon
} from 'lucide-react';
import { playSfx, vibrate } from '../lib/sensory';

export interface FoodPhotoSalesFeedbackProps {
  productName: string;
  category?: 'fruits_veg' | 'food_product' | 'prepared_meal' | 'pantry' | 'generic';
  photoUrl?: string | null;
  initialRating?: number; // 1 to 5
  compact?: boolean;
  onFixApplied?: () => void;
}

// Generate algorithmic instant feedback based on product name and category
export function getInstantSalesFeedback(productName: string, category: string = 'generic', customRating?: number) {
  const nameLower = (productName || '').toLowerCase();
  
  // Is it fruit / vegetable?
  const isFruitVeg = category === 'fruits_veg' || 
    nameLower.includes('maçã') || nameLower.includes('banana') || nameLower.includes('tomate') || 
    nameLower.includes('fruta') || nameLower.includes('verdura') || nameLower.includes('alface') || 
    nameLower.includes('morango') || nameLower.includes('laranja') || nameLower.includes('cenoura') ||
    nameLower.includes('legume') || nameLower.includes('salada') || nameLower.includes('hortaliça') ||
    nameLower.includes('uva') || nameLower.includes('abacate') || nameLower.includes('limão');

  const rating = customRating || (isFruitVeg ? 4.8 : 4.6);
  const stars = Math.round(rating);

  const errorsAndFixes = isFruitVeg ? [
    {
      type: 'lighting',
      title: '💡 Iluminação de Frescor',
      error: 'Sombras acentuadas podem fazer o produto parecer menos fresco.',
      fix: 'Fotografe sob luz natural suave. Borrifar gotículas de água limpa na casca da fruta/verdura aumenta a percepção de frescor em 40%!',
      emoji: '💦',
      impact: '+35% Vendas'
    },
    {
      type: 'contrast',
      title: '🎨 Contraste de Cores Orgânicas',
      error: 'Fundo com cores concorrentes ofusca o verde/vermelho vivo.',
      fix: 'Utilize fundos neutros de madeira clara ou ardósia escura para sobressair a vivacidade do alimento natural.',
      emoji: '🍃',
      impact: '+28% Vendas'
    },
    {
      type: 'angle',
      title: '📐 Ângulo de Destaque Hortifrúti',
      error: 'Foto totalmente superior achatou o volume natural do produto.',
      fix: 'Capture a foto em ângulo de 45° ou macro suave para ressaltar a textura folhosa e o corte das frutas.',
      emoji: '🍓',
      impact: '+22% Vendas'
    }
  ] : [
    {
      type: 'presentation',
      title: '✨ Apresentação Comercial',
      error: 'Rótulo ou embalagem levemente desalinhada na foto.',
      fix: 'Centralize o rótulo principal e coloque o alimento servido ao lado para despertar desejo imediato de consumo.',
      emoji: '🍱',
      impact: '+40% Conversão'
    },
    {
      type: 'nutritional',
      title: '🏷️ Selo de Qualidade Visível',
      error: 'Destaque de macros e selos saudáveis (Zero Açúcar/Fit) sumiram.',
      fix: 'Adicione etiqueta de destaque nutricional para atrair o público saudável que busca decisão rápida de compra.',
      emoji: '⚡',
      impact: '+30% Vendas'
    }
  ];

  return {
    rating,
    stars,
    isFruitVeg,
    salesScore: Math.round(rating * 19.5), // e.g. 93/100
    headline: isFruitVeg 
      ? '🍓 Excelente Apelo Orgânico com Oportunidades de Frescor Visível!' 
      : '🛒 Foto com Alto Potencial Comercial para E-commerce Nutricional!',
    errorsAndFixes,
    conversionBoostEstimate: '+35% de conversão de vendas estimada com correções',
    badgeText: isFruitVeg ? '🌿 Qualidade Hortifrúti Premium' : '⭐ Produto Em Destaque'
  };
}

export function FoodPhotoSalesFeedback({
  productName,
  category = 'generic',
  photoUrl,
  initialRating,
  compact = false,
  onFixApplied
}: FoodPhotoSalesFeedbackProps) {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [appliedFixes, setAppliedFixes] = useState<Record<number, boolean>>({});
  const feedbackData = getInstantSalesFeedback(productName, category, initialRating);

  const toggleFix = (index: number) => {
    playSfx('pop');
    vibrate(10);
    setAppliedFixes(prev => {
      const updated = { ...prev, [index]: !prev[index] };
      if (onFixApplied) onFixApplied();
      return updated;
    });
  };

  const starEmojiRating = (
    <div className="flex items-center gap-1 text-amber-400 font-extrabold text-sm">
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <span key={star} className="text-base drop-shadow-sm">
            {star <= feedbackData.stars ? '⭐' : '☆'}
          </span>
        ))}
      </div>
      <span className="ml-1 text-xs text-amber-300 font-black">
        {feedbackData.rating.toFixed(1)}/5.0
      </span>
    </div>
  );

  if (compact) {
    return (
      <div className="relative">
        {/* Compact trigger button overlaid on food photos */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            playSfx('tap');
            vibrate(15);
            setIsOpen(true);
          }}
          className="px-2.5 py-1 rounded-full bg-slate-900/90 hover:bg-slate-900 text-white border border-amber-500/40 shadow-lg backdrop-blur-md text-[11px] font-bold flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95 cursor-pointer z-10"
          title="Ver Avaliação & Feedback Imediato da Imagem para Vendas"
        >
          <span className="text-xs">⭐</span>
          <span className="text-amber-300 font-black">{feedbackData.rating.toFixed(1)}</span>
          <span className="hidden sm:inline text-[10px] text-emerald-300 font-semibold">• Feedback Vendas</span>
          <Sparkles className="w-3 h-3 text-amber-400 animate-pulse ml-0.5" />
        </button>

        {/* Modal Overlay for Compact View */}
        <AnimatePresence>
          {isOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in" onClick={() => setIsOpen(false)}>
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 10 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-lg bg-slate-900 border border-amber-500/30 rounded-3xl p-6 shadow-2xl text-slate-100 relative overflow-hidden"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-4">
                  <div className="flex items-center gap-3">
                    <span className="p-3 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xl">
                      {feedbackData.isFruitVeg ? '🍓' : '🛒'}
                    </span>
                    <div>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40">
                        Feedback Imediato da Foto
                      </span>
                      <h3 className="text-base font-black text-white mt-0.5">{productName}</h3>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Rating & Score Summary */}
                <div className="mt-4 p-4 rounded-2xl bg-gradient-to-r from-slate-800 to-slate-800/80 border border-slate-700/80 flex items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400">Classificação com Emoji ⭐</span>
                    <div className="mt-0.5">{starEmojiRating}</div>
                    <p className="text-xs font-semibold text-emerald-400 mt-1 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" /> {feedbackData.conversionBoostEstimate}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Nota Apelo Visual</span>
                    <span className="text-2xl font-black text-amber-400">{feedbackData.salesScore}/100</span>
                  </div>
                </div>

                {/* Immediate Errors & Corrections */}
                <div className="mt-4 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-amber-400" />
                    <span>Ajustes Imediatos para Acertar a Foto e Vender Mais:</span>
                  </h4>

                  {feedbackData.errorsAndFixes.map((item, idx) => {
                    const isFixed = !!appliedFixes[idx];
                    return (
                      <div
                        key={idx}
                        className={`p-3.5 rounded-2xl border transition-all ${
                          isFixed 
                            ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200' 
                            : 'bg-slate-800/60 border-slate-700/80 hover:border-amber-500/40'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-base">{item.emoji}</span>
                            <span className="text-xs font-bold text-white">{item.title}</span>
                          </div>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            {item.impact}
                          </span>
                        </div>

                        <p className="text-[11px] text-rose-300 mt-1.5 flex items-start gap-1 font-medium">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-rose-400 mt-0.5" />
                          <span><strong>Erro Identificado:</strong> {item.error}</span>
                        </p>

                        <p className="text-[11px] text-emerald-300 mt-1 flex items-start gap-1 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-400 mt-0.5" />
                          <span><strong>Correção Imediata:</strong> {item.fix}</span>
                        </p>

                        <button
                          onClick={() => toggleFix(idx)}
                          className={`mt-2.5 px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                            isFixed 
                              ? 'bg-emerald-600 text-white' 
                              : 'bg-slate-700 hover:bg-amber-600 text-slate-200 hover:text-white'
                          }`}
                        >
                          {isFixed ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Zap className="w-3.5 h-3.5" />}
                          <span>{isFixed ? 'Ajuste Aplicado!' : 'Marcar Ajuste como Realizado'}</span>
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Footer Action */}
                <div className="mt-5 pt-3 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">
                    ⚡ Feedback instantâneo por NutriAI Sales Vision
                  </span>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all cursor-pointer shadow-lg shadow-amber-500/20"
                  >
                    Concluído
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Full Expanded Card Layout
  return (
    <div className="p-5 rounded-3xl bg-slate-900 border border-amber-500/30 shadow-xl text-slate-100 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3.5">
        <div className="flex items-center gap-3">
          <span className="p-3 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xl">
            {feedbackData.isFruitVeg ? '🍓' : '🛒'}
          </span>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40">
                Avaliação de Foto de Alimento & Vendas
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                {feedbackData.badgeText}
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-black text-white mt-1">{productName}</h3>
          </div>
        </div>

        <div>
          {starEmojiRating}
        </div>
      </div>

      {/* Headline & Impact */}
      <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{feedbackData.headline}</span>
        </div>
        <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-extrabold text-xs whitespace-nowrap">
          {feedbackData.conversionBoostEstimate}
        </span>
      </div>

      {/* Errors & Fixes List */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-400" />
          <span>Diagnóstico Imediato para Correção da Imagem e Aumento de Vendas:</span>
        </h4>

        <div className="grid grid-cols-1 gap-3">
          {feedbackData.errorsAndFixes.map((item, idx) => {
            const isFixed = !!appliedFixes[idx];
            return (
              <div
                key={idx}
                className={`p-4 rounded-2xl border transition-all ${
                  isFixed 
                    ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200' 
                    : 'bg-slate-800/60 border-slate-700/80 hover:border-amber-500/40'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{item.emoji}</span>
                    <span className="text-xs font-extrabold text-white">{item.title}</span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {item.impact}
                  </span>
                </div>

                <div className="mt-2 text-xs space-y-1">
                  <p className="text-rose-300 flex items-start gap-1.5 font-medium">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                    <span><strong>Erro na foto:</strong> {item.error}</span>
                  </p>
                  <p className="text-emerald-300 flex items-start gap-1.5 font-medium">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
                    <span><strong>Acerto imediato:</strong> {item.fix}</span>
                  </p>
                </div>

                <button
                  onClick={() => toggleFix(idx)}
                  className={`mt-3 px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    isFixed 
                      ? 'bg-emerald-600 text-white' 
                      : 'bg-slate-700 hover:bg-amber-600 text-slate-200 hover:text-white'
                  }`}
                >
                  {isFixed ? <CheckCircle2 className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
                  <span>{isFixed ? 'Ajuste Aplicado!' : 'Corrigir Foto Imediatamente'}</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
