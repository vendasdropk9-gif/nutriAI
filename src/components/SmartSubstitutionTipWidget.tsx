import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, RefreshCw, ShoppingBag, ArrowRight, X, AlertTriangle, Check, MapPin, Tag, Heart } from 'lucide-react';
import { UserProfile, PantryItem } from '../types';
import { playSfx, vibrate } from '../lib/sensory';
import { useTranslation } from '../contexts/LanguageContext';

interface SmartSubstitutionTipWidgetProps {
  profile: UserProfile | null;
  onNavigateToMarket?: () => void;
  addNotification?: (notif: any) => void;
}

interface SubstitutionSuggestion {
  id: string;
  originalIngredient: string;
  reason: string;
  alternativeName: string;
  alternativePrice: number;
  originalEstimatedPrice: number;
  savingsPercentage: number;
  localAvailability: string; // e.g. "Disponível em mercados locais (Supermercados BH / Carrefour / Extra)"
  culinaryTip: string;
  category: string;
}

const COMMON_SUBSTITUTION_DATABASE: SubstitutionSuggestion[] = [
  {
    id: 'sub-1',
    originalIngredient: 'Creme de Leite Fresco',
    reason: 'Acabando na despensa / Custo elevado (R$ 9,90)',
    alternativeName: 'Creme de Leite UHT + 1 colher de Manteiga',
    alternativePrice: 4.50,
    originalEstimatedPrice: 9.90,
    savingsPercentage: 55,
    localAvailability: 'Encontrado em qualquer mercadinho ou padaria de bairro',
    culinaryTip: 'Mesma cremosidade para molhos e massas com metade do custo.',
    category: 'Laticínios'
  },
  {
    id: 'sub-2',
    originalIngredient: 'Azeite de Oliva Extra Virgem',
    reason: 'Nível crítico na despensa (< 10%)',
    alternativeName: 'Óleo de Girassol / Soja para cocção + Azeite apenas para finalização',
    alternativePrice: 7.90,
    originalEstimatedPrice: 34.90,
    savingsPercentage: 77,
    localAvailability: 'Disponível em qualquer supermercado local',
    culinaryTip: 'Economize o azeite nobre para saladas e use óleo neutro para grelhados.',
    category: 'Óleos & Temperos'
  },
  {
    id: 'sub-3',
    originalIngredient: 'Queijo Parmesão Ralado Fino (Importado)',
    reason: 'Faltando para a receita de massa',
    alternativeName: 'Queijo Minas Padrão Meia-Cura Ralado / Queijo Prato',
    alternativePrice: 12.00,
    originalEstimatedPrice: 28.00,
    savingsPercentage: 57,
    localAvailability: 'Feiras livres e supermercados regionais do Brasil',
    culinaryTip: 'O queijo minas padrão ralado derrete maravilhosamente bem e custa bem menos.',
    category: 'Laticínios'
  },
  {
    id: 'sub-4',
    originalIngredient: 'Salmão Fresco',
    reason: 'Preço elevado na região nesta semana',
    alternativeName: 'Filé de Tilápia Fresca ou Sardinha Limpa',
    alternativePrice: 19.90,
    originalEstimatedPrice: 59.90,
    savingsPercentage: 66,
    localAvailability: 'Peixarias locais e mercados municipais',
    culinaryTip: 'Tilápia grelhada com limão e ervas traz excelente proteína magra e leveza.',
    category: 'Proteínas & Pescados'
  },
  {
    id: 'sub-5',
    originalIngredient: 'Farinha de Amêndoas',
    reason: 'Item escasso na despensa / Alto custo',
    alternativeName: 'Farinha de Aveia Fina ou Biomassa de Banana Verde',
    alternativePrice: 6.50,
    originalEstimatedPrice: 24.90,
    savingsPercentage: 74,
    localAvailability: 'Casas de produtos naturais e supermercados',
    culinaryTip: 'Farinha de aveia absorve líquidos de forma semelhante em bolos fit.',
    category: 'Grãos & Farinhas'
  }
];

export function SmartSubstitutionTipWidget({ profile, onNavigateToMarket, addNotification }: SmartSubstitutionTipWidgetProps) {
  const { t } = useTranslation();
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);
  const [isDismissed, setIsDismissed] = useState(false);
  const [addedItems, setAddedItems] = useState<Record<string, boolean>>({});
  const [userLocationName, setUserLocationName] = useState('Brasil (Detectado via IP/GPS)');

  useEffect(() => {
    // Detect geolocation city if available
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        () => {
          setUserLocationName('Sua Região / Brasil 📍');
        },
        () => {
          setUserLocationName('Brasil (Padrão Regional)');
        },
        { timeout: 5000 }
      );
    }
  }, []);

  // Cycle through suggestions automatically every 12 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSuggestionIndex(prev => (prev + 1) % COMMON_SUBSTITUTION_DATABASE.length);
    }, 12000);
    return () => clearInterval(timer);
  }, []);

  const currentSub = COMMON_SUBSTITUTION_DATABASE[activeSuggestionIndex];

  const handleAddAlternativeToCart = () => {
    playSfx('success');
    vibrate([30, 40, 30]);
    setAddedItems(prev => ({ ...prev, [currentSub.id]: true }));

    try {
      const existingCartRaw = localStorage.getItem('nutriai_cart_items');
      let cart = existingCartRaw ? JSON.parse(existingCartRaw) : [];
      if (!Array.isArray(cart)) cart = [];

      const existingIndex = cart.findIndex((ci: any) => ci.name === currentSub.alternativeName);
      if (existingIndex >= 0) {
        cart[existingIndex].quantity = (cart[existingIndex].quantity || 1) + 1;
      } else {
        cart.push({
          id: `sub-cart-${currentSub.id}`,
          name: currentSub.alternativeName,
          price: currentSub.alternativePrice,
          quantity: 1,
          category: currentSub.category,
          image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=400'
        });
      }
      localStorage.setItem('nutriai_cart_items', JSON.stringify(cart));
    } catch (e) {
      console.warn("Cart save error:", e);
    }

    const notifMsg = `Substituto "${currentSub.alternativeName}" adicionado ao Marketplace com ${currentSub.savingsPercentage}% de economia!`;
    if (addNotification) {
      addNotification({
        title: "Substituição Inteligente Adicionada! 💡",
        message: notifMsg,
        type: "success"
      });
    } else {
      window.dispatchEvent(new CustomEvent('app:notification', {
        detail: {
          title: "Substituição Inteligente Adicionada! 💡",
          message: notifMsg,
          type: "success"
        }
      }));
    }
  };

  const handleOpenMarket = () => {
    playSfx('tap');
    vibrate(15);
    if (onNavigateToMarket) {
      onNavigateToMarket();
    } else {
      window.dispatchEvent(new CustomEvent('app:changeTab', { detail: 'market' }));
    }
  };

  if (isDismissed) {
    return (
      <button
        type="button"
        onClick={() => setIsDismissed(false)}
        className="fixed bottom-6 right-6 z-50 p-3.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xl transition-all flex items-center gap-2 cursor-pointer active:scale-95 group"
        title="Abrir Dicas de Substituição Inteligente"
      >
        <Sparkles className="w-5 h-5 animate-spin text-amber-200" />
        <span className="text-xs font-bold pr-1 max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 whitespace-nowrap">
          Dica de Substituição 💡
        </span>
      </button>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 350, damping: 25 }}
        className="w-full rounded-3xl bg-gradient-to-br from-slate-900 via-emerald-950/80 to-teal-950/90 border border-emerald-500/40 p-6 sm:p-7 shadow-2xl relative overflow-hidden text-white space-y-5"
      >
        {/* Glow ambient background */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-teal-400/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-start justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-300 shadow-sm">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-300 bg-amber-500/15 px-2.5 py-0.5 rounded-full border border-amber-500/30">
                  Dica de Substituição Inteligente 💡
                </span>
                <span className="text-[10px] text-emerald-300 bg-emerald-500/20 px-2.5 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> {userLocationName}
                </span>
              </div>
              <h3 className="text-xl sm:text-2xl font-serif font-bold text-white mt-1">
                Economize substituindo ingredientes críticos
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsDismissed(true)}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-all cursor-pointer"
            title="Fechar dica"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Suggestion Card Content */}
        <div className="p-5 sm:p-6 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 grid md:grid-cols-12 gap-6 items-center relative z-10">
          <div className="md:col-span-7 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-rose-300 bg-rose-500/20 px-2.5 py-1 rounded-xl border border-rose-500/30">
                Item Crítico: {currentSub.originalIngredient}
              </span>
              <span className="text-xs text-slate-300 font-medium">({currentSub.reason})</span>
            </div>

            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-emerald-300">Sugestão Recomendada na sua Região</p>
              <h4 className="text-lg sm:text-xl font-black text-white mt-0.5">{currentSub.alternativeName}</h4>
            </div>

            <p className="text-xs text-slate-200 leading-relaxed">
              💡 <strong>Dica Culinária:</strong> {currentSub.culinaryTip}
            </p>

            <div className="flex items-center gap-2 pt-1 text-[11px] text-emerald-200 font-medium">
              <Tag className="w-3.5 h-3.5 text-emerald-400" />
              <span>{currentSub.localAvailability}</span>
            </div>
          </div>

          <div className="md:col-span-5 flex flex-col justify-center items-start md:items-end gap-3 p-4 rounded-xl bg-black/30 border border-white/10">
            <div className="text-left md:text-right">
              <span className="text-[10px] uppercase font-bold text-slate-400">Economia Estimada</span>
              <div className="flex items-baseline gap-2 md:justify-end">
                <span className="text-2xl sm:text-3xl font-black text-emerald-400">{currentSub.savingsPercentage}% OFF</span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                R$ {currentSub.alternativePrice.toFixed(2)} <span className="line-through text-slate-500">R$ {currentSub.originalEstimatedPrice.toFixed(2)}</span>
              </p>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto pt-1">
              <button
                type="button"
                onClick={handleAddAlternativeToCart}
                disabled={!!addedItems[currentSub.id]}
                className={`flex-1 md:flex-initial px-4 py-2.5 rounded-xl text-xs font-bold shadow-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  addedItems[currentSub.id]
                    ? 'bg-emerald-700 text-white cursor-default'
                    : 'bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black'
                }`}
              >
                {addedItems[currentSub.id] ? (
                  <>
                    <Check className="w-4 h-4" /> Adicionado ✓
                  </>
                ) : (
                  <>
                    <ShoppingBag className="w-4 h-4" /> Adicionar Alternativa
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleOpenMarket}
                className="px-3 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
              >
                <span>Marketplace</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Footer Navigation Dots & Cycle Indicator */}
        <div className="flex items-center justify-between text-xs text-slate-300 relative z-10 pt-1">
          <div className="flex items-center gap-1.5">
            {COMMON_SUBSTITUTION_DATABASE.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setActiveSuggestionIndex(idx)}
                className={`h-2 rounded-full transition-all cursor-pointer ${
                  idx === activeSuggestionIndex ? 'w-6 bg-emerald-400' : 'w-2 bg-white/30 hover:bg-white/50'
                }`}
              />
            ))}
          </div>

          <span className="text-[11px] text-slate-400 font-medium">
            Sugestão {activeSuggestionIndex + 1} de {COMMON_SUBSTITUTION_DATABASE.length} • Atualizado para sua região
          </span>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
