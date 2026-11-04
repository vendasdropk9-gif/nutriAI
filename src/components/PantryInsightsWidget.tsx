import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, ShoppingBag, TrendingDown, Tag, ArrowRight, Check, Package, AlertTriangle, RefreshCw, Flame } from 'lucide-react';
import { playSfx, vibrate } from '../lib/sensory';
import { useTranslation } from '../contexts/LanguageContext';

interface PantryInsightsWidgetProps {
  onNavigateToMarket?: () => void;
  addNotification?: (notif: any) => void;
}

interface SeasonalPromoItem {
  id: string;
  name: string;
  category: string;
  originalPrice: number;
  promoPrice: number;
  discountPercentage: number;
  image: string;
  seasonTag: string;
  reason: string;
}

const SEASONAL_PROMO_CATALOG: SeasonalPromoItem[] = [
  {
    id: 'promo-1',
    name: 'Abacate Hass Orgânico (1kg)',
    category: 'Vegetais & Frutas',
    originalPrice: 16.90,
    promoPrice: 11.90,
    discountPercentage: 30,
    image: 'https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?auto=format&fit=crop&q=80&w=400',
    seasonTag: 'Safra da Região 🥑',
    reason: 'Excelente fonte de gorduras boas para complementar suas saladas e ovos.'
  },
  {
    id: 'promo-2',
    name: 'Mirtilos / Blueberries Frescos (200g)',
    category: 'Vegetais & Frutas',
    originalPrice: 22.00,
    promoPrice: 15.50,
    discountPercentage: 29,
    image: 'https://images.unsplash.com/photo-1498557850523-fd3d118b962e?auto=format&fit=crop&q=80&w=400',
    seasonTag: 'Superfruta em Promoção 🫐',
    reason: 'Rico em antioxidantes para o seu café da manhã e iogurtes.'
  },
  {
    id: 'promo-3',
    name: 'Filé de Salmão Fresco Premium (500g)',
    category: 'Proteínas & Carnes',
    originalPrice: 59.90,
    promoPrice: 44.90,
    discountPercentage: 25,
    image: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&q=80&w=400',
    seasonTag: 'Oferta Especial 🐟',
    reason: 'Omega 3 essencial para o seu plano semanal de hipertrofia/saúde.'
  },
  {
    id: 'promo-4',
    name: 'Ovos Caipiras Selecionados (2 Dúzias)',
    category: 'Laticínios & Ovos',
    originalPrice: 28.00,
    promoPrice: 20.90,
    discountPercentage: 25,
    image: 'https://images.unsplash.com/photo-1516448336239-16a7f0524451?auto=format&fit=crop&q=80&w=400',
    seasonTag: 'Reposição Necessária 🥚',
    reason: 'Seus ovos estão acabando na despensa. Aproveite o frete grátis!'
  }
];

export function PantryInsightsWidget({ onNavigateToMarket, addNotification }: PantryInsightsWidgetProps) {
  const { t } = useTranslation();
  const [pantryCount, setPantryCount] = useState<number>(0);
  const [expiringCount, setExpiringCount] = useState<number>(0);
  const [addedItems, setAddedItems] = useState<Record<string, boolean>>({});
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(true);

  useEffect(() => {
    const analyzePantryStock = () => {
      try {
        const raw = localStorage.getItem('nutri_pantry_items');
        if (raw) {
          const items = JSON.parse(raw);
          if (Array.isArray(items)) {
            setPantryCount(items.length);
            const today = new Date().getTime();
            const expiring = items.filter((it: any) => {
              if (!it.expirationDate) return false;
              const exp = new Date(it.expirationDate).getTime();
              const diffDays = Math.ceil((exp - today) / (1000 * 60 * 60 * 24));
              return diffDays <= 3;
            }).length;
            setExpiringCount(expiring);
          }
        }
      } catch (e) {
        console.warn(e);
      } finally {
        setTimeout(() => setIsAnalyzing(false), 600);
      }
    };

    analyzePantryStock();
    window.addEventListener('storage', analyzePantryStock);
    return () => window.removeEventListener('storage', analyzePantryStock);
  }, []);

  const handleAddToCart = (promo: SeasonalPromoItem) => {
    playSfx('success');
    vibrate([30, 50]);
    setAddedItems(prev => ({ ...prev, [promo.id]: true }));

    // Add to cart in localStorage
    try {
      const existingCartRaw = localStorage.getItem('nutriai_cart_items');
      let cart = existingCartRaw ? JSON.parse(existingCartRaw) : [];
      if (!Array.isArray(cart)) cart = [];

      const existingIndex = cart.findIndex((ci: any) => ci.id === promo.id);
      if (existingIndex >= 0) {
        cart[existingIndex].quantity = (cart[existingIndex].quantity || 1) + 1;
      } else {
        cart.push({
          id: promo.id,
          name: promo.name,
          price: promo.promoPrice,
          quantity: 1,
          image: promo.image,
          category: promo.category
        });
      }
      localStorage.setItem('nutriai_cart_items', JSON.stringify(cart));
    } catch (e) {
      console.warn("Cart save error:", e);
    }

    if (addNotification) {
      addNotification({
        title: "Adicionado ao Carrinho! 🛍️",
        message: `${promo.name} foi incluído no seu carrinho do Marketplace com ${promo.discountPercentage}% de desconto.`,
        type: "success"
      });
    } else {
      window.dispatchEvent(new CustomEvent('app:notification', {
        detail: {
          title: "Adicionado ao Carrinho! 🛍️",
          message: `${promo.name} foi incluído no seu carrinho do Marketplace com ${promo.discountPercentage}% de desconto.`,
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

  return (
    <div className="w-full rounded-3xl bg-gradient-to-br from-emerald-950/40 via-slate-900 to-teal-950/40 border border-emerald-500/30 p-6 sm:p-7 shadow-2xl space-y-6 relative overflow-hidden">
      {/* Background Ambient Glow */}
      <div className="absolute -top-24 -right-24 w-52 h-52 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-52 h-52 bg-teal-500/15 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 shadow-sm">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                IA Pantry Insights 🧠
              </span>
              {isAnalyzing && (
                <span className="text-[10px] text-amber-400 animate-pulse flex items-center gap-1">
                  <RefreshCw className="w-3 h-3 animate-spin" /> Analisando despensa...
                </span>
              )}
            </div>
            <h3 className="text-xl sm:text-2xl font-serif font-bold text-white mt-0.5">
              Sugestões Sazonais & Promoções Inteligentes
            </h3>
          </div>
        </div>

        <button
          type="button"
          onClick={handleOpenMarket}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-lg shadow-emerald-600/30 transition-all cursor-pointer active:scale-95 shrink-0"
        >
          <ShoppingBag className="w-4 h-4" />
          <span>Abrir Marketplace 🛒</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Summary Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 relative z-10">
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">Itens na Despensa</span>
            <span className="text-lg font-mono font-bold text-white">{pantryCount} cadastrados</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">Vencimento Próximo</span>
            <span className="text-lg font-mono font-bold text-amber-300">{expiringCount} itens (<= 3 dias)</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <TrendingDown className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">Economia Estimada</span>
            <span className="text-lg font-mono font-bold text-purple-300">Até 30% OFF hoje</span>
          </div>
        </div>
      </div>

      {/* Promotional Seasonal Items Grid */}
      <div className="space-y-3 relative z-10">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <Tag className="w-4 h-4 text-emerald-400" />
            Promoções Recomendadas pela IA para Reposição Inteligente:
          </h4>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {SEASONAL_PROMO_CATALOG.map((promo) => {
            const isAdded = !!addedItems[promo.id];
            return (
              <motion.div
                key={promo.id}
                whileHover={{ translateY: -3 }}
                className="rounded-2xl bg-slate-900/90 border border-slate-800 overflow-hidden flex flex-col justify-between shadow-lg group"
              >
                <div>
                  <div className="relative h-36 w-full overflow-hidden bg-slate-950">
                    <img
                      src={promo.image}
                      alt={promo.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-2 left-2 px-2.5 py-1 rounded-full bg-emerald-500 text-slate-950 text-[10px] font-black uppercase tracking-wider shadow-md">
                      {promo.discountPercentage}% OFF
                    </div>
                    <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-slate-950/80 backdrop-blur-md text-[10px] font-bold text-emerald-300 border border-white/10">
                      {promo.seasonTag}
                    </div>
                  </div>

                  <div className="p-4 space-y-2">
                    <h5 className="font-bold text-sm text-white line-clamp-1">{promo.name}</h5>
                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{promo.reason}</p>

                    <div className="flex items-baseline gap-2 pt-1">
                      <span className="text-xs text-slate-500 line-through font-mono">
                        R$ {promo.originalPrice.toFixed(2).replace('.', ',')}
                      </span>
                      <span className="text-base font-black text-emerald-400 font-mono">
                        R$ {promo.promoPrice.toFixed(2).replace('.', ',')}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-4 pt-0">
                  <button
                    type="button"
                    onClick={() => handleAddToCart(promo)}
                    className={`w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95 ${
                      isAdded
                        ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20'
                    }`}
                  >
                    {isAdded ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-400" />
                        <span>Adicionado 🛒</span>
                      </>
                    ) : (
                      <>
                        <ShoppingBag className="w-4 h-4" />
                        <span>Comprar na Promoção</span>
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
