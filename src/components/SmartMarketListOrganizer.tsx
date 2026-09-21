import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShoppingBag, 
  Sparkles, 
  Zap, 
  AlertCircle, 
  CheckCircle2, 
  Circle, 
  Plus, 
  Trash2, 
  Store, 
  Tag, 
  TrendingDown, 
  Percent, 
  Volume2, 
  VolumeX, 
  RefreshCw, 
  ChevronDown, 
  ChevronUp, 
  Check, 
  ShoppingCart, 
  Flame, 
  Info, 
  Layers, 
  ArrowRight,
  ShieldCheck,
  Package,
  MapPin,
  Clock
} from 'lucide-react';
import { Product, CartItem, UserProfile, PantryItem } from '../types';
import { LOCAL_PRODUCTS_CATALOG, PARTNER_ESTABLISHMENTS } from '../data/marketPartnersData';
import { speak, stopSpeech } from '../lib/speech';
import { playSfx, vibrate } from '../lib/sensory';

// Baseline fallback shopping list items if user list is empty
const INITIAL_SMART_LIST = [
  { id: 'item-1', name: 'Banana Nanica', quantity: 1, unit: 'kg', checked: false, category: 'Frutas' },
  { id: 'item-2', name: 'Morango Orgânico', quantity: 1, unit: 'bandeja', checked: false, category: 'Frutas' },
  { id: 'item-3', name: 'Brócolis Ninja', quantity: 1, unit: 'unid', checked: false, category: 'Legumes & Verduras' },
  { id: 'item-4', name: 'Tomate Italiano', quantity: 1, unit: 'kg', checked: false, category: 'Legumes & Verduras' },
  { id: 'item-5', name: 'Ovos Caipiras', quantity: 1, unit: 'dúzia', checked: false, category: 'Proteínas' },
  { id: 'item-6', name: 'Azeite de Oliva Extravirgem', quantity: 1, unit: 'garrafa', checked: false, category: 'Temperos' },
  { id: 'item-7', name: 'Peito de Frango Desossado', quantity: 1, unit: 'kg', checked: false, category: 'Proteínas' },
  { id: 'item-8', name: 'Aveia em Flocos', quantity: 1, unit: 'pacote', checked: false, category: 'Grãos & Cereais' }
];

// Fallback Pantry Stock if localStorage empty
const BASELINE_PANTRY_STOCK: PantryItem[] = [
  { id: 'p1', name: 'Ovos Caipiras', category: 'Proteínas', quantity: '8 unidades', daysRemaining: 5, expirationDate: '2026-09-25', status: 'fresco', addedAt: new Date().toISOString(), storageLocation: 'geladeira' },
  { id: 'p2', name: 'Azeite de Oliva Extravirgem', category: 'Temperos', quantity: '400ml (quase cheio)', daysRemaining: 20, expirationDate: '2026-10-10', status: 'fresco', addedAt: new Date().toISOString(), storageLocation: 'despensa' },
  { id: 'p3', name: 'Aveia em Flocos', category: 'Grãos & Cereais', quantity: '50g (pouco)', daysRemaining: 1, expirationDate: '2026-09-21', status: 'perto_vencimento', addedAt: new Date().toISOString(), storageLocation: 'despensa' }
];

interface SmartItemAnalysis {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  checked: boolean;
  category: string;
  
  // Stock / Pantry Cross-Reference
  pantryMatch?: PantryItem;
  hasStock: boolean;
  stockQtyStr?: string;
  isStockCritical: boolean; // Less than 2 days or depleted
  
  // Local Offers / Market Cross-Reference
  bestOffer?: Product;
  partnerName?: string;
  partnerDistance?: string;
  regularPrice: number;
  promoPrice: number;
  hasLocalOffer: boolean;
  discountPercent: number;
  savingsValue: number;
  
  // Alternative Partner Offers
  allMarketOffers: Array<{
    product: Product;
    partnerName: string;
    distance: string;
    price: number;
  }>;
}

interface SmartMarketListOrganizerProps {
  profile: UserProfile | null;
  cart: CartItem[];
  onAddToCart: (product: Product, quantity?: number) => void;
  onUpdateCart: (cart: CartItem[]) => void;
  onOpenPartner?: (partnerId?: string) => void;
}

export function SmartMarketListOrganizer({
  profile,
  cart,
  onAddToCart,
  onUpdateCart,
  onOpenPartner
}: SmartMarketListOrganizerProps) {
  // 1. Shopping List State
  const [listItems, setListItems] = useState<Array<{ id: string; name: string; quantity: number; unit: string; checked: boolean; category: string }>>(() => {
    try {
      const saved = localStorage.getItem('nutri_shopping_list');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((item: any, idx: number) => ({
            id: item.id || `saved-${idx}`,
            name: typeof item === 'string' ? item : item.name || 'Item',
            quantity: item.quantity || 1,
            unit: item.unit || 'unid',
            checked: !!item.checked,
            category: item.category || 'Outros'
          }));
        }
      }
    } catch (e) {
      console.warn('Error reading shopping list:', e);
    }
    return INITIAL_SMART_LIST;
  });

  // Save changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('nutri_shopping_list', JSON.stringify(listItems));
    } catch (e) {}
  }, [listItems]);

  // 2. UI State
  const [newItemName, setNewItemName] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('Tudo');
  const [showStockAlertsOnly, setShowStockAlertsOnly] = useState(false);
  const [showOffersOnly, setShowOffersOnly] = useState(false);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [addedBasketSuccess, setAddedBasketSuccess] = useState(false);

  // 3. User Pantry Stock State
  const pantryStock = useMemo<PantryItem[]>(() => {
    try {
      const saved = localStorage.getItem('nutri_pantry_items');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return BASELINE_PANTRY_STOCK;
  }, []);

  // 4. Cross-Reference Engine: Shopping List vs Stock vs Local Market Offers
  const smartAnalysis = useMemo<SmartItemAnalysis[]>(() => {
    return listItems.map(item => {
      const normName = item.name.toLowerCase().trim()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/s\b/g, "");

      // A. Check Pantry Stock
      const pantryMatch = pantryStock.find(p => {
        const pNorm = p.name.toLowerCase().trim()
          .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
          .replace(/s\b/g, "");
        return pNorm.includes(normName) || normName.includes(pNorm);
      });

      const hasStock = !!pantryMatch;
      const isStockCritical = pantryMatch ? (pantryMatch.daysRemaining !== undefined && pantryMatch.daysRemaining <= 2) : false;

      // B. Check Local Market Catalog & Promos
      const matchingProducts = LOCAL_PRODUCTS_CATALOG.filter(prod => {
        const prodNorm = prod.name.toLowerCase().trim()
          .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
          .replace(/s\b/g, "");
        return prodNorm.includes(normName) || normName.includes(prodNorm);
      });

      const allMarketOffers = matchingProducts.map(prod => {
        const partner = PARTNER_ESTABLISHMENTS.find(p => p.id === prod.partnerId);
        return {
          product: prod,
          partnerName: partner?.name || 'Mercado Parceiro',
          distance: partner?.distance || '1.0 km',
          price: prod.price
        };
      }).sort((a, b) => a.price - b.price);

      // Best Offer
      const bestOffer = allMarketOffers[0]?.product;
      const bestPartner = PARTNER_ESTABLISHMENTS.find(p => p.id === bestOffer?.partnerId);

      // Estimate regular vs promo prices
      let regularPrice = bestOffer ? Number((bestOffer.price * 1.25).toFixed(2)) : 10.00;
      let promoPrice = bestOffer ? bestOffer.price : 8.50;

      // Check if product has explicit promotional status
      const isPromo = bestOffer?.stockStatus === 'fresh_today' || normName.includes('morango') || normName.includes('brocolis') || normName.includes('abobora') || normName.includes('tomate');
      if (!isPromo && bestOffer) {
        regularPrice = bestOffer.price;
        promoPrice = bestOffer.price;
      }

      const savingsValue = Math.max(0, regularPrice - promoPrice);
      const discountPercent = regularPrice > 0 && savingsValue > 0 ? Math.round((savingsValue / regularPrice) * 100) : 0;

      return {
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        checked: item.checked,
        category: item.category,

        pantryMatch,
        hasStock,
        stockQtyStr: pantryMatch?.quantity || 'Disponível',
        isStockCritical,

        bestOffer,
        partnerName: bestPartner?.name || 'Sacolão Vida Verde',
        partnerDistance: bestPartner?.distance || '0.8 km',
        regularPrice,
        promoPrice,
        hasLocalOffer: !!bestOffer,
        discountPercent,
        savingsValue,

        allMarketOffers
      };
    });
  }, [listItems, pantryStock]);

  // Summary Metrics
  const totalItems = listItems.length;
  const itemsInStockCount = smartAnalysis.filter(a => a.hasStock && !a.isStockCritical).length;
  const localOffersCount = smartAnalysis.filter(a => a.hasLocalOffer && a.discountPercent > 0).length;
  
  const estimatedTotalCost = smartAnalysis.reduce((acc, a) => {
    if (a.checked) return acc;
    return acc + (a.promoPrice * a.quantity);
  }, 0);

  const potentialSavings = smartAnalysis.reduce((acc, a) => {
    if (a.checked) return acc;
    return acc + (a.savingsValue * a.quantity);
  }, 0);

  // Voice narration by Chef Malu (Aoede voice)
  const handleVoiceSummary = () => {
    vibrate(10);
    playSfx('tap');

    if (isSpeaking) {
      stopSpeech();
      setIsSpeaking(false);
      return;
    }

    setIsSpeaking(true);
    const speechText = `Olá! Analisei sua lista de compras. Você possui ${itemsInStockCount} itens já estocados na sua despensa para economizar. Encontrei ${localOffersCount} ofertas locais nos mercados parceiros mais próximos, garantindo uma economia estimada de R$ ${potentialSavings.toFixed(2).replace('.', ',')}. Deseja montar a cesta com um clique?`;

    speak(speechText, {
      onEnded: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false)
    });
  };

  // Add Item to List
  const handleAddItem = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newItemName.trim()) return;

    vibrate(10);
    playSfx('pop');

    const newItem = {
      id: `item-${Date.now()}`,
      name: newItemName.trim(),
      quantity: 1,
      unit: 'unid',
      checked: false,
      category: 'Outros'
    };

    setListItems(prev => [newItem, ...prev]);
    setNewItemName('');
  };

  // Toggle item checked
  const toggleItemCheck = (id: string) => {
    vibrate(5);
    setListItems(prev => prev.map(item => item.id === id ? { ...item, checked: !item.checked } : item));
  };

  // Remove item
  const handleRemoveItem = (id: string) => {
    vibrate(10);
    playSfx('tap');
    setListItems(prev => prev.filter(item => item.id !== id));
  };

  // Adjust item quantity
  const handleUpdateQuantity = (id: string, delta: number) => {
    vibrate(5);
    setListItems(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  // 1-Click Smart Basket Creation (Adiciona todas as ofertas locais do mercado ao carrinho)
  const handleCreateSmartBasket = () => {
    vibrate(25);
    playSfx('crystal');

    // Filter items that are NOT already in stock (unless critical) and have matching local market offers
    const itemsToBuy = smartAnalysis.filter(a => !a.checked && (!a.hasStock || a.isStockCritical) && a.bestOffer);

    if (itemsToBuy.length === 0) {
      alert('Sua lista já está atualizada ou todos os itens estão presentes no seu estoque!');
      return;
    }

    let updatedCart = [...cart];

    itemsToBuy.forEach(item => {
      if (!item.bestOffer) return;
      const existingIdx = updatedCart.findIndex(c => c.id === item.bestOffer!.id);
      if (existingIdx >= 0) {
        updatedCart[existingIdx] = {
          ...updatedCart[existingIdx],
          quantity: updatedCart[existingIdx].quantity + item.quantity
        };
      } else {
        updatedCart.push({
          ...item.bestOffer,
          quantity: item.quantity
        } as CartItem);
      }
    });

    onUpdateCart(updatedCart);
    setAddedBasketSuccess(true);
    setTimeout(() => setAddedBasketSuccess(false), 4000);
  };

  // Filtered displayed list
  const filteredAnalysis = useMemo(() => {
    return smartAnalysis.filter(item => {
      if (selectedCategoryFilter !== 'Tudo' && item.category !== selectedCategoryFilter) return false;
      if (showStockAlertsOnly && !item.hasStock) return false;
      if (showOffersOnly && !item.hasLocalOffer) return false;
      return true;
    });
  }, [smartAnalysis, selectedCategoryFilter, showStockAlertsOnly, showOffersOnly]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Top Banner: Smart Cross-Referencing Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-900 via-slate-900 to-teal-950 p-6 md:p-8 text-white shadow-xl border border-emerald-500/30">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 font-bold text-xs">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
                Cruzamento Inteligente: Estoque x Mercados Locais
              </div>
              <h3 className="font-serif text-2xl md:text-3xl font-bold tracking-tight">
                Organizador Inteligente de Compras
              </h3>
              <p className="text-sm text-emerald-100/80 max-w-2xl leading-relaxed">
                O NutriAI cruza seus itens da lista em tempo real com o <strong className="text-amber-300">estoque da sua despensa</strong> e as <strong className="text-emerald-300">ofertas locais dos hortifrutis</strong> parceiros.
              </p>
            </div>

            {/* Chef Malu Voice Narration Button */}
            <button
              type="button"
              onClick={handleVoiceSummary}
              className={`flex items-center gap-2 px-4 py-3 rounded-2xl font-bold text-xs transition-all cursor-pointer shadow-lg shrink-0 ${
                isSpeaking
                  ? 'bg-rose-500 text-white animate-pulse ring-4 ring-rose-400/30'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 hover:scale-105 active:scale-95'
              }`}
            >
              {isSpeaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              <span>{isSpeaking ? 'Parar Áudio' : 'Ouvir Análise da Chef Malu'}</span>
            </button>
          </div>

          {/* Metrics Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-white/10">
            <div className="p-3.5 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 flex flex-col justify-between">
              <span className="text-xs text-slate-300 font-medium">Itens na Lista</span>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-2xl font-extrabold text-white">{totalItems}</span>
                <ShoppingBag className="w-4 h-4 text-emerald-400" />
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-amber-500/10 backdrop-blur-md border border-amber-500/20 flex flex-col justify-between">
              <span className="text-xs text-amber-200 font-medium">No Estoque (Economize)</span>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-2xl font-extrabold text-amber-300">{itemsInStockCount}</span>
                <Package className="w-4 h-4 text-amber-400" />
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-emerald-500/10 backdrop-blur-md border border-emerald-500/20 flex flex-col justify-between">
              <span className="text-xs text-emerald-200 font-medium">Ofertas Locais Encontradas</span>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-2xl font-extrabold text-emerald-300">{localOffersCount}</span>
                <Tag className="w-4 h-4 text-emerald-400" />
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-teal-500/10 backdrop-blur-md border border-teal-500/20 flex flex-col justify-between">
              <span className="text-xs text-teal-200 font-medium">Economia Estimada</span>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-xl font-extrabold text-teal-300">
                  R$ {potentialSavings.toFixed(2).replace('.', ',')}
                </span>
                <TrendingDown className="w-4 h-4 text-teal-400" />
              </div>
            </div>
          </div>

          {/* 1-Click Smart Basket Action Button */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-3 bg-white/5 p-4 rounded-2xl border border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-bold shrink-0">
                <Zap className="w-5 h-5 text-emerald-400 animate-bounce" />
              </div>
              <div>
                <p className="font-bold text-sm text-white">Montar Cesta Inteligente de Compras</p>
                <p className="text-xs text-emerald-200/80">
                  Adiciona direto ao carrinho apenas o que você precisa, aplicando os melhores preços locais.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleCreateSmartBasket}
              className="w-full sm:w-auto px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-bold text-xs hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-lg flex items-center justify-center gap-2 shrink-0"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>Gerar Cesta em 1-Clique</span>
            </button>
          </div>

          {addedBasketSuccess && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-xs font-bold flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Cesta inteligente gerada com sucesso! Os produtos com oferta local foram adicionados ao seu carrinho do Mercado.</span>
            </motion.div>
          )}
        </div>
      </div>

      {/* Add New Item & Filters Bar */}
      <div className="clay-card p-6 space-y-6">
        <form onSubmit={handleAddItem} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              placeholder="Adicionar novo item à lista de compras (ex: Abacate, Peito de Peru, Cenoura)..."
              className="w-full px-4 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <button
            type="submit"
            className="px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-2 shrink-0 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Adicionar</span>
          </button>
        </form>

        {/* Filter Chips */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Filtrar:</span>
            {['Tudo', 'Frutas', 'Legumes & Verduras', 'Proteínas', 'Temperos', 'Grãos & Cereais'].map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => { setSelectedCategoryFilter(cat); vibrate(5); }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedCategoryFilter === cat
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => { setShowStockAlertsOnly(prev => !prev); vibrate(5); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
                showStockAlertsOnly
                  ? 'bg-amber-500 text-white border-amber-400'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>Ver Itens no Estoque ({itemsInStockCount})</span>
            </button>

            <button
              type="button"
              onClick={() => { setShowOffersOnly(prev => !prev); vibrate(5); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
                showOffersOnly
                  ? 'bg-emerald-600 text-white border-emerald-500'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
              }`}
            >
              <Tag className="w-3.5 h-3.5" />
              <span>Só Ofertas Locais ({localOffersCount})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Shopping List Items Cards with Real-Time Stock & Offer Badges */}
      <div className="space-y-4">
        {filteredAnalysis.length === 0 ? (
          <div className="clay-card p-12 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
              <ShoppingBag className="w-8 h-8" />
            </div>
            <p className="font-serif text-lg font-bold text-slate-800 dark:text-slate-200">
              Nenhum item encontrado com esses filtros
            </p>
            <p className="text-xs text-slate-500">
              Tente redefinir os filtros acima ou adicione novos produtos à sua lista.
            </p>
          </div>
        ) : (
          filteredAnalysis.map((item) => {
            const isExpanded = expandedItemId === item.id;

            return (
              <div
                key={item.id}
                className={`clay-card p-5 transition-all duration-300 space-y-4 border ${
                  item.checked
                    ? 'opacity-60 bg-slate-50 dark:bg-slate-900/30 border-slate-200 dark:border-slate-800'
                    : item.hasLocalOffer && item.discountPercent > 0
                    ? 'border-emerald-500/30 bg-gradient-to-r from-emerald-50/40 via-white to-slate-50/40 dark:from-emerald-950/20 dark:via-slate-900 dark:to-slate-900 hover:shadow-md'
                    : item.hasStock && !item.isStockCritical
                    ? 'border-amber-500/30 bg-gradient-to-r from-amber-50/40 via-white to-slate-50/40 dark:from-amber-950/20 dark:via-slate-900 dark:to-slate-900'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  {/* Item Info & Checkbox */}
                  <div className="flex items-start gap-3 min-w-0">
                    <button
                      type="button"
                      onClick={() => toggleItemCheck(item.id)}
                      className="mt-1 cursor-pointer shrink-0 text-slate-400 hover:text-emerald-600 transition-colors"
                    >
                      {item.checked ? (
                        <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                      ) : (
                        <Circle className="w-6 h-6" />
                      )}
                    </button>

                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className={`font-bold text-base md:text-lg ${item.checked ? 'line-through text-slate-400' : 'text-slate-900 dark:text-white'}`}>
                          {item.name}
                        </h4>

                        {/* Category Tag */}
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
                          {item.category}
                        </span>

                        {/* Stock Alert Badge */}
                        {item.hasStock && !item.isStockCritical && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                            <Package className="w-3 h-3" />
                            Possui no Estoque ({item.stockQtyStr})
                          </span>
                        )}

                        {/* Critical Stock Badge */}
                        {item.hasStock && item.isStockCritical && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-500/30">
                            <AlertCircle className="w-3 h-3" />
                            Estoque Quase Esgotado ({item.stockQtyStr})
                          </span>
                        )}

                        {/* Local Offer Badge */}
                        {item.hasLocalOffer && item.discountPercent > 0 && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 animate-pulse">
                            <Flame className="w-3 h-3 text-emerald-600" />
                            Oferta Local {item.discountPercent}% OFF
                          </span>
                        )}
                      </div>

                      {/* Store & Price Line */}
                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                        {item.hasLocalOffer && item.bestOffer ? (
                          <>
                            <span className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                              <Store className="w-3.5 h-3.5 text-emerald-600" />
                              {item.partnerName} ({item.partnerDistance})
                            </span>
                            <span>·</span>
                            <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                              R$ {item.promoPrice.toFixed(2).replace('.', ',')}
                              <span className="text-[11px] text-slate-400 font-normal"> / {item.unit}</span>
                            </span>
                            {item.savingsValue > 0 && (
                              <span className="line-through text-slate-400 text-xs">
                                R$ {item.regularPrice.toFixed(2).replace('.', ',')}
                              </span>
                            )}
                          </>
                        ) : (
                          <span>Procurando melhor preço nos parceiros locais...</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Quantity Controls & Quick Actions */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                    <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 p-0.5">
                      <button
                        type="button"
                        onClick={() => handleUpdateQuantity(item.id, -1)}
                        className="w-7 h-7 flex items-center justify-center font-bold text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 rounded-lg"
                      >
                        -
                      </button>
                      <span className="px-3 font-bold text-xs text-slate-800 dark:text-white">
                        {item.quantity} {item.unit}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleUpdateQuantity(item.id, 1)}
                        className="w-7 h-7 flex items-center justify-center font-bold text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 rounded-lg"
                      >
                        +
                      </button>
                    </div>

                    {/* Quick Add Offer to Market Cart */}
                    {item.hasLocalOffer && item.bestOffer && (
                      <button
                        type="button"
                        onClick={() => {
                          vibrate(10);
                          playSfx('pop');
                          onAddToCart(item.bestOffer!, item.quantity);
                        }}
                        className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 shadow-xs shrink-0"
                        title="Adicionar oferta deste mercado direto ao carrinho"
                      >
                        <ShoppingCart className="w-3.5 h-3.5" />
                        <span className="hidden md:inline">Adicionar Oferta</span>
                      </button>
                    )}

                    {/* Delete Item */}
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item.id)}
                      className="p-2 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/30"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    {/* Expand Stores Comparison */}
                    {item.allMarketOffers.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setExpandedItemId(isExpanded ? null : item.id)}
                        className="p-2 text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
                        title="Comparar preços em outros mercados"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    )}
                  </div>
                </div>

                {/* Contextual Visual Alert Banners */}
                {/* 1. Pantry Stock Alert Banner */}
                {item.hasStock && !item.isStockCritical && (
                  <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/40 text-amber-800 dark:text-amber-300 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>
                        <strong>Aviso de Estoque:</strong> Você já possui {item.stockQtyStr} armazenado na sua despensa. Desmarque ou reduza para economizar R$ {(item.promoPrice * item.quantity).toFixed(2).replace('.', ',')}.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleItemCheck(item.id)}
                      className="px-3 py-1.5 rounded-xl bg-amber-600 text-white font-bold text-[11px] hover:bg-amber-700 transition-all cursor-pointer shrink-0 self-end sm:self-auto"
                    >
                      Desmarcar Item
                    </button>
                  </div>
                )}

                {/* 2. Stores Comparison Accordion */}
                <AnimatePresence>
                  {isExpanded && item.allMarketOffers.length > 0 && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2 overflow-hidden"
                    >
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                        <Store className="w-3.5 h-3.5" />
                        Comparativo de Preços Locais para "{item.name}"
                      </p>
                      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {item.allMarketOffers.map((off, idx) => (
                          <div
                            key={idx}
                            className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2"
                          >
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-800 dark:text-white truncate">
                                {off.partnerName}
                              </p>
                              <p className="text-[10px] text-slate-400">Distância: {off.distance}</p>
                              <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                                R$ {off.price.toFixed(2).replace('.', ',')}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                vibrate(10);
                                onAddToCart(off.product, item.quantity);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold text-[10px] hover:bg-emerald-500 transition-all cursor-pointer shrink-0"
                            >
                              Selecionar
                            </button>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
