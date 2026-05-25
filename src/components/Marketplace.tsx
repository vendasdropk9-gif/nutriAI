import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShoppingBag, 
  MapPin, 
  Star, 
  Clock, 
  Leaf, 
  Search, 
  ChevronRight, 
  Plus, 
  Minus, 
  Trash2, 
  Zap, 
  Sparkles,
  Volume2,
  Heart,
  TrendingDown,
  Store,
  ShoppingCart,
  MessageSquare,
  User,
  Send,
  RefreshCw,
  Map as MapIcon,
  Bike,
  Package,
  X
} from 'lucide-react';
import { MarketPartner, Product, CartItem, UserProfile, ProductReview } from '../types';
import bannerImage1 from '../assets/images/regenerated_image_1779725858294.jpg';
import productImage1 from '../assets/images/regenerated_image_1779398315958.jpg';
import storeImage1 from '../assets/images/store_vida_verde_1779398853750.png';
import storeImage2 from '../assets/images/store_premium_hortifruti_1779398868799.png';
import { speak } from '../lib/speech';
import { vibrate } from '../lib/sensory';
import { DeliveryTracking } from './DeliveryTracking';

const MARKET_PARTNERS: MarketPartner[] = [
  {
    id: 'm1',
    name: 'Sacolão Vida Verde',
    rating: 4.8,
    deliveryTime: '30-45 min',
    minOrder: 20,
    image: storeImage1,
    distance: '1.2 km'
  },
  {
    id: 'm2',
    name: 'Hortifruti Premium',
    rating: 4.9,
    deliveryTime: '20-35 min',
    minOrder: 35,
    image: storeImage2,
    distance: '2.5 km'
  }
];

const PRODUCTS: Product[] = [
  { id: 'p1', name: 'Morango Orgânico', category: 'Frutas', price: 12.90, unit: 'bandeja', image: productImage1, isOrganic: true, description: 'Morangos frescos direto do produtor.', rating: 4.8, reviewCount: 24, reviews: [{ id: 'r1', userName: 'Ana Paula', rating: 5, comment: 'Maravilhosos e muito doces!', date: '2024-04-20' }] },
  { id: 'p2', name: 'Kit Salada Prática', category: 'Kits', price: 19.90, unit: 'unid', image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&q=80&w=400', isSeasonal: true, description: 'Mix de folhas limpas e higienizadas.', rating: 4.5, reviewCount: 15, reviews: [{ id: 'r2', userName: 'Carlos M.', rating: 4, comment: 'Muito prático para o dia a dia.', date: '2024-04-18' }] },
  { id: 'p3', name: 'Banana Nanica', category: 'Frutas', price: 5.50, unit: 'kg', image: 'https://images.unsplash.com/photo-1528825871115-3581a5387919?auto=format&fit=crop&q=80&w=400', description: 'Rica em potássio para seu treino.', rating: 4.9, reviewCount: 56, reviews: [{ id: 'r3', userName: 'Marcos R.', rating: 5, comment: 'Sempre fresquinhas.', date: '2024-04-15' }] },
  { id: 'p4', name: 'Brócolis Ninja', category: 'Verduras', price: 8.90, unit: 'unid', image: 'https://images.unsplash.com/photo-1584270354949-c26b0d5b4a0c?auto=format&fit=crop&q=80&w=400', isOrganic: true, description: 'Superalimento rico em ferro.', rating: 4.7, reviewCount: 32 },
  { id: 'p5', name: 'Abóbora Cabotiá', category: 'Legumes', price: 4.20, unit: 'kg', image: 'https://images.unsplash.com/photo-1570586437263-ab629fccc818?auto=format&fit=crop&q=80&w=400', description: 'Perfeita para sopas e purês.', rating: 4.6, reviewCount: 18 },
  { id: 'p6', name: 'Combo Emagrecimento', category: 'Kits', price: 89.00, unit: 'kit', image: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&q=80&w=400', description: 'Seleção especial da nossa IA.', rating: 5.0, reviewCount: 8 },
];

const BANNERS = [
  { id: 'b1', title: 'Cesta Fresh da Semana', subtitle: 'Direto do produtor', price: 'R$ 19,90', image: bannerImage1, tip: "Essas frutas estão fresquinhas hoje 💚" },
  { id: 'b2', title: 'Orgânicos Certificados', subtitle: 'Saúde sem agrotóxicos', price: 'Promoção', image: 'https://images.unsplash.com/photo-1550989460-0adf9ea622e2?auto=format&fit=crop&q=80&w=1200', tip: "Quer que eu monte uma cesta saudável pra sua semana?" },
  { id: 'b3', title: 'Frutas Tropicais Selecionadas', subtitle: 'Doces e suculentas', price: 'Oferta', image: 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?auto=format&fit=crop&q=80&w=1200', tip: "Ricas em vitaminas e minerais essenciais." },
  { id: 'b4', title: 'Saladas Prontas para o Consumo', subtitle: 'Higienizadas e frescas', price: 'A partir de R$ 15', image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&q=80&w=1200', tip: "Praticidade e saúde no seu dia a dia." },
  { id: 'b5', title: 'Proteínas Selecionadas', subtitle: 'Qualidade premium', price: 'R$ 89,90', image: 'https://images.unsplash.com/photo-1607623814075-e51df1bdc822?auto=format&fit=crop&q=80&w=1200', tip: "Proteínas de alta qualidade pra quem não abre mão do sabor. 🥩" },
  { id: 'b6', title: 'Sucos Naturais e Detox', subtitle: 'Energia garantida', price: 'R$ 12,50', image: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?auto=format&fit=crop&q=80&w=1200', tip: "Refresque-se com o melhor da fruta." },
];

interface MarketplaceProps {
  profile: UserProfile | null;
  onUpdateCart: (cart: CartItem[]) => void;
  onUpdateFavorites?: (favorites: string[]) => void;
  onOpenPartner?: () => void;
  onOpenMap?: () => void;
  addNotification?: (notif: any) => void;
}

export function Marketplace({ profile, onUpdateCart, onUpdateFavorites, onOpenPartner, onOpenMap, addNotification }: MarketplaceProps) {
  const [activeCategory, setActiveCategory] = useState<string>('Tudo');
  const [activeMarket, setActiveMarket] = useState(MARKET_PARTNERS[0]);
  const [currentBanner, setCurrentBanner] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [cart, setCart] = useState<CartItem[]>(profile?.cart || []);
  const [favorites, setFavorites] = useState<string[]>(profile?.favorites || []);
  const [showCart, setShowCart] = useState(false);
  const [selectedProductReview, setSelectedProductReview] = useState<Product | null>(null);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [deliveryMethod, setDeliveryMethod] = useState<'moto' | 'bicicleta' | 'retirada'>('bicicleta');
  const [activeDeliveryId, setActiveDeliveryId] = useState<string | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [addingAI, setAddingAI] = useState(false);
  const [showOrders, setShowOrders] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    if (showOrders) {
       const loadOrders = async () => {
          try {
             const { collection, getDocs } = await import('firebase/firestore');
             const { db, auth } = await import('../lib/firebase');
             if (auth.currentUser) {
                const snap = await getDocs(collection(db, 'users', auth.currentUser.uid, 'orders'));
                const list = snap.docs.map(d => d.data());
                // Sort in memory to avoid index requirements in sandbox
                list.sort((a, b) => {
                   const dateA = a.createdAt?.seconds || 0;
                   const dateB = b.createdAt?.seconds || 0;
                   return dateB - dateA;
                });
                setOrders(list);
             }
          } catch(e) { 
             console.error('Erro ao buscar pedidos', e);
          }
       };
       loadOrders();
    }
  }, [showOrders]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentBanner(prev => (prev + 1) % BANNERS.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const addToCart = (product: Product) => {
    vibrate(10);
    const existing = cart.find(item => item.id === product.id);
    let newCart;
    if (existing) {
      newCart = cart.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
    } else {
      newCart = [...cart, { ...product, quantity: 1 }];
    }
    setCart(newCart);
    onUpdateCart(newCart);
  };

  const toggleFavorite = (productId: string) => {
    const isFavorite = favorites.includes(productId);
    const newFavorites = isFavorite 
      ? favorites.filter(id => id !== productId)
      : [...favorites, productId];
    
    setFavorites(newFavorites);
    if (onUpdateFavorites) {
      onUpdateFavorites(newFavorites);
    }
  };

  const removeFromCart = (productId: string) => {
    const newCart = cart.map(item => {
      if (item.id === productId) {
        return { ...item, quantity: Math.max(0, item.quantity - 1) };
      }
      return item;
    }).filter(item => item.quantity > 0);
    setCart(newCart);
    onUpdateCart(newCart);
  };

  const submitReview = () => {
    if (reviewRating === 0 || !selectedProductReview) return;
    
    setIsSubmittingReview(true);
    
    // Simulate API call
    setTimeout(() => {
      const newReview: ProductReview = {
        id: `r-${Date.now()}`,
        userName: profile?.name || 'Usuário NutriAI',
        rating: reviewRating,
        comment: reviewComment,
        date: new Date().toISOString().split('T')[0]
      };

      // In a real app, we would update the DB. 
      // Here we update the local object (mocking persistence)
      if (selectedProductReview.reviews) {
        selectedProductReview.reviews = [newReview, ...selectedProductReview.reviews];
      } else {
        selectedProductReview.reviews = [newReview];
      }
      
      const oldCount = selectedProductReview.reviewCount || 0;
      const oldRating = selectedProductReview.rating || 0;
      selectedProductReview.reviewCount = oldCount + 1;
      selectedProductReview.rating = Number(((oldRating * oldCount + reviewRating) / (oldCount + 1)).toFixed(1));

      setIsSubmittingReview(false);
      setReviewRating(0);
      setReviewComment('');
    }, 1000);
  };

  const handleSpeak = async (text: string) => {
    if (isPlaying) return;
    setIsPlaying(true);
    await speak(text, {
      onEnded: () => setIsPlaying(false),
      onError: () => setIsPlaying(false)
    });
  };

  const cartTotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const deliveryFee = deliveryMethod === 'moto' ? 5.90 : deliveryMethod === 'bicicleta' ? 3.90 : 0;
  const finalTotal = cartTotal + deliveryFee;
  
  const filteredProducts = activeCategory === 'Tudo' ? PRODUCTS : PRODUCTS.filter(p => p.category === activeCategory);

  if (isTracking) {
    return (
      <DeliveryTracking 
        orderTotal={finalTotal} 
        activeDeliveryId={activeDeliveryId} 
        onClose={() => { 
          setIsTracking(false); 
          setActiveDeliveryId(null);
          setCart([]); 
          onUpdateCart([]); 
          setShowCart(false); 
        }} 
      />
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      {/* Header & Market Switcher */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-emerald-600 font-bold uppercase text-xs tracking-widest">
            <Store className="w-4 h-4" />
            NutriMarket Local
          </div>
          <h2 className="font-serif text-3xl md:text-4xl font-medium text-slate-800 dark:text-slate-100">Sacolão & Hortifruti</h2>
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
            <MapPin className="w-4 h-4 text-emerald-500" />
            <span className="text-xs md:text-sm">Entregando em: <strong>Seu Endereço Atual</strong></span>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <button 
              onClick={onOpenMap}
              className="flex items-center gap-2 p-2.5 px-4 bg-emerald-600 text-white rounded-xl border border-emerald-500 font-bold text-xs hover:scale-105 transition-all shadow-sm group"
            >
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-white shadow-lg shrink-0">
                 <MapIcon className="w-4 h-4" />
              </div>
              <span className="hidden sm:inline">Explorar Mapa de Frescor</span>
              <span className="sm:hidden">Mapa</span>
              <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
            </button>
            <button 
              type="button"
              onClick={() => {
                vibrate(10);
                setShowOrders(true);
              }}
              className="flex items-center gap-2 p-2.5 px-4 bg-slate-900 dark:bg-slate-700 text-white rounded-xl border border-slate-800 dark:border-slate-600 font-bold text-xs hover:scale-105 active:scale-95 transition-all shadow-sm group cursor-pointer outline-none"
            >
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-white shadow-lg shrink-0 group-hover:bg-emerald-600 transition-colors">
                 <Package className="w-4 h-4" />
              </div>
              Meus Pedidos
            </button>
          </div>
        </div>

        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
          {MARKET_PARTNERS.map(market => (
            <button
              key={market.id}
              onClick={() => setActiveMarket(market)}
              className={`flex shrink-0 items-center gap-3 p-3 rounded-2xl border transition-all ${
                activeMarket.id === market.id 
                ? 'clay-panel border-emerald-500 shadow-[inset_2px_2px_4px_rgba(255,255,255,0.8),inset_-2px_-2px_4px_rgba(0,0,0,0.05),2px_2px_8px_rgba(16,185,129,0.2)]' 
                : 'clay-btn opacity-80 hover:opacity-100 border-none'
              }`}
            >
              <img src={market.image} className="w-10 h-10 rounded-full object-cover" />
              <div className="text-left">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-100">{market.name}</p>
                <div className="flex items-center gap-1 text-[10px] text-slate-500">
                  <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                  {market.rating} • {market.distance}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Dynamic Banner */}
      <div className="relative w-full max-w-full h-[180px] sm:h-[320px] md:h-[420px] rounded-[24px] md:rounded-[40px] clay-card overflow-hidden bg-slate-200 dark:bg-slate-800 transition-colors box-border mx-auto border-none">
        <AnimatePresence mode="wait">
          <motion.div
            key={BANNERS[currentBanner].id}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.8 }}
            className="absolute inset-0"
          >
            <img src={BANNERS[currentBanner].image} className="w-full h-full object-cover object-center" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-3 sm:p-6 md:p-12 flex flex-col justify-end items-start text-left space-y-1 sm:space-y-2 md:space-y-4 box-border">
               <div className="flex items-center gap-1.5 sm:gap-3">
                  <div className="px-2 py-0.5 sm:px-3 sm:py-1 clay-primary text-[8px] sm:text-[10px] md:text-xs font-bold uppercase tracking-widest whitespace-nowrap">
                     {BANNERS[currentBanner].price}
                  </div>
                  <button 
                    onClick={() => handleSpeak(BANNERS[currentBanner].tip)}
                    className="w-6 h-6 sm:w-10 sm:h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white active:bg-white/40 flex-shrink-0"
                  >
                     <Volume2 className="w-3 h-3 sm:w-5 sm:h-5" />
                  </button>
               </div>
               <h3 className="text-sm sm:text-2xl md:text-5xl font-serif font-bold text-white leading-tight break-words">
                  {BANNERS[currentBanner].title}
               </h3>
               <p className="hidden sm:block text-white/80 text-xs sm:text-base md:text-xl font-medium break-words max-w-lg">{BANNERS[currentBanner].subtitle}</p>
               <button 
                  onClick={() => addToCart(PRODUCTS[0])}
                  className="px-3 py-1 sm:py-3.5 md:px-8 md:py-4 clay-primary md:rounded-2xl font-bold active:scale-95 transition-all flex items-center justify-center gap-1.5 sm:gap-2 w-auto mt-0.5 sm:mt-2 text-white"
               >
                  <ShoppingCart className="w-3 h-3 sm:w-5 sm:h-5 flex-shrink-0" />
                  <span className="text-[10px] sm:text-sm md:text-base truncate text-white">Comprar Agora</span>
               </button>
            </div>
          </motion.div>
        </AnimatePresence>
        
        {/* Indicators - Vertical on very small screens, horizontal otherwise */}
        <div className="absolute top-3 right-3 sm:bottom-4 sm:top-auto sm:right-6 md:bottom-8 md:right-12 flex flex-col sm:flex-row gap-1 sm:gap-2 md:gap-3">
          {BANNERS.map((_, i) => (
            <div 
              key={i}
              className={`rounded-full transition-all duration-500 ${currentBanner === i ? 'h-3 sm:h-1 sm:md:h-1.5 w-1 sm:w-8 md:w-10 bg-emerald-500' : 'h-1 sm:h-1 sm:md:h-1.5 w-1 sm:w-2 md:w-3 bg-white/30'}`}
            />
          ))}
        </div>
      </div>

      {/* AI Recommendation Section */}
      <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-[24px] sm:rounded-[32px] clay-card p-6 sm:p-8 text-white flex flex-col md:flex-row items-center gap-6 sm:gap-8 shadow-xl relative overflow-hidden w-full max-w-full box-border">
        <div className="absolute top-0 right-0 p-6 sm:p-8 opacity-10 pointer-events-none">
          <Sparkles className="w-24 h-24 sm:w-32 sm:h-32" />
        </div>
        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white/20 backdrop-blur-xl rounded-full flex items-center justify-center shrink-0">
          <Zap className="w-8 h-8 sm:w-10 sm:h-10" />
        </div>
        <div className="space-y-2 flex-1 text-center md:text-left z-10 w-full">
          <h4 className="text-xl sm:text-2xl font-serif font-bold break-words">Baseado no seu plano alimentar</h4>
          <p className="text-emerald-50 opacity-90 text-sm sm:text-base break-words">Montei um kit especial com ingredientes fundamentais para seus objetivos de {profile?.goals || 'saúde'}.</p>
        </div>
        <button 
          onClick={() => {
            addToCart(PRODUCTS[5]);
            setAddingAI(true);
            setTimeout(() => {
              setAddingAI(false);
            }, 1500);
          }}
          disabled={addingAI}
          id="ai-sug-btn"
          className={`w-full sm:w-auto px-6 py-3 sm:px-8 sm:py-4 bg-white text-emerald-600 rounded-[16px] sm:rounded-2xl font-bold transition-all shadow-lg z-20 relative border-none ${addingAI ? 'bg-emerald-100 scale-95' : 'hover:bg-emerald-50 active:scale-95'}`}
        >
          {addingAI ? 'Adicionado! 🛒' : 'Adicionar Sugestão IA'}
        </button>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2 sm:gap-4 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
        {['Tudo', 'Frutas', 'Verduras', 'Legumes', 'Kits'].map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-2 sm:px-6 sm:py-3 rounded-xl sm:rounded-2xl font-bold text-sm transition-all whitespace-nowrap shrink-0 ${
              activeCategory === cat 
              ? 'bg-slate-900 text-white shadow-xl' 
              : 'bg-white dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-1 min-[420px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-8 box-border w-full justify-items-stretch">
        {filteredProducts.map(product => (
          <motion.div
            layout
            key={product.id}
            className="bg-white dark:bg-slate-800/60 p-3 sm:p-5 rounded-[24px] sm:rounded-[32px] clay-card border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-xl transition-all group flex flex-col h-full"
          >
            <div className="relative h-32 sm:h-40 rounded-xl sm:rounded-2xl overflow-hidden mb-3 sm:mb-4 shrink-0">
              <img src={product.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
              {product.isOrganic && (
                <div className="absolute top-3 left-3 px-2 py-1 bg-emerald-500 text-white rounded-lg text-[8px] font-bold uppercase tracking-widest">
                  Orgânico
                </div>
              )}
              {product.isSeasonal && (
                <div className="absolute top-3 right-3 px-2 py-1 bg-amber-500 text-white rounded-lg text-[8px] font-bold uppercase tracking-widest">
                  Estação
                </div>
              )}
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFavorite(product.id);
                }}
                className={`absolute bottom-3 right-3 p-2 rounded-xl backdrop-blur-md transition-all ${
                  favorites.includes(product.id)
                  ? 'bg-red-500 text-white shadow-lg'
                  : 'bg-white/40 text-white hover:bg-white/60'
                }`}
              >
                <Heart className={`w-4 h-4 ${favorites.includes(product.id) ? 'fill-current' : ''}`} />
              </button>
            </div>
            
            <div className="space-y-1 mb-4">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{product.category}</p>
                <div 
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedProductReview(product);
                  }}
                  className="flex items-center gap-1 text-[10px] bg-slate-100 dark:bg-slate-700/50 px-2 py-0.5 rounded-full cursor-pointer hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all border border-transparent hover:border-emerald-200"
                >
                  <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                  <span className="font-bold text-slate-700 dark:text-slate-300">{product.rating || 'N/A'}</span>
                  <span className="text-slate-400">({product.reviewCount || 0})</span>
                </div>
              </div>
              <h5 className="font-serif text-lg font-bold text-slate-800 dark:text-slate-100">{product.name}</h5>
              <p className="text-xs text-slate-500 line-clamp-1">{product.description}</p>
            </div>

            <div className="flex items-center justify-between mt-auto">
              <div>
                <p className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white">R$ {product.price.toFixed(2)}</p>
                <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">por {product.unit}</p>
              </div>
              <button 
                onClick={() => addToCart(product)}
                className="w-10 h-10 sm:w-12 sm:h-12 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-full sm:rounded-2xl hover:scale-105 hover:bg-slate-800 dark:hover:bg-slate-100 flex items-center justify-center transition-all shadow-lg active:scale-95"
              >
                <Plus className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Floating Cart Button */}
      <AnimatePresence>
        {cart.length > 0 && (
          <motion.button
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            onClick={() => setShowCart(true)}
            className="fixed bottom-32 right-8 md:right-12 z-50 bg-slate-900 text-white px-8 py-5 rounded-full shadow-2xl flex items-center gap-4 hover:scale-105 transition-transform"
          >
            <div className="relative">
              <ShoppingBag className="w-6 h-6" />
              <div className="absolute -top-2 -right-2 min-w-[20px] h-5 bg-emerald-500 text-white rounded-full px-1.5 flex items-center justify-center text-[10px] font-bold shadow-sm">
                {cart.reduce((a, b) => a + b.quantity, 0)}
              </div>
            </div>
            <div className="text-left pr-4">
              <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest">Ver Carrinho</p>
              <p className="text-lg font-serif">R$ {cartTotal.toFixed(2)}</p>
            </div>
            <ChevronRight className="w-5 h-5 text-emerald-500" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Cart Modal */}
      <AnimatePresence>
        {showCart && (
          <div className="fixed inset-0 z-[100] flex items-center justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCart(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-full max-w-md h-full bg-white dark:bg-slate-900 shadow-2xl p-8 flex flex-col"
            >
              <div className="flex items-center justify-between mb-8 pb-4 border-b dark:border-slate-800">
                <h3 className="text-2xl font-serif font-bold">Seu Sacolão</h3>
                <button onClick={() => setShowCart(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400">
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-6 pr-2">
                {cart.map(item => (
                  <div key={item.id} className="flex gap-4 items-center">
                    <img src={item.image} className="w-20 h-20 rounded-2xl object-cover" />
                    <div className="flex-1">
                      <h5 className="font-bold text-slate-800 dark:text-slate-100">{item.name}</h5>
                      <p className="text-sm text-slate-500">R$ {item.price.toFixed(2)} / {item.unit}</p>
                    </div>
                    <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
                      <button 
                        onClick={() => removeFromCart(item.id)}
                        className="p-1 hover:bg-white dark:hover:bg-slate-700 rounded-lg text-slate-500"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-8 text-center font-bold">{item.quantity}</span>
                      <button 
                        onClick={() => addToCart(item)}
                        className="p-1 hover:bg-white dark:hover:bg-slate-700 rounded-lg text-slate-500"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-8 space-y-6 border-t dark:border-slate-800 mt-auto">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-slate-850 dark:text-slate-150 uppercase tracking-widest text-xs">Forma de Envio / Retirada</p>
                    {deliveryMethod === 'bicicleta' && (
                      <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Leaf className="w-3 h-3" /> Pegada Neutra
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    <button 
                      onClick={() => setDeliveryMethod('bicicleta')}
                      className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all outline-none ${deliveryMethod === 'bicicleta' ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 ring-2 ring-emerald-500/20 scale-[1.02]' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 hover:border-emerald-250 hover:bg-slate-50/50'}`}
                    >
                      <Bike className="w-5 h-5" />
                      <span className="text-[11px] font-bold block leading-none">Bicicleta</span>
                      <span className="text-[9px] text-slate-400 dark:text-slate-500 block leading-none font-medium">R$ 3,90 · 20min</span>
                    </button>
                    
                    <button 
                      onClick={() => setDeliveryMethod('moto')}
                      className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all outline-none ${deliveryMethod === 'moto' ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 ring-2 ring-emerald-500/20 scale-[1.02]' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 hover:border-emerald-250 hover:bg-slate-50/50'}`}
                    >
                      <Zap className="w-5 h-5 text-amber-500" />
                      <span className="text-[11px] font-bold block leading-none">Moto</span>
                      <span className="text-[9px] text-slate-400 dark:text-slate-500 block leading-none font-medium">R$ 5,90 · 12min</span>
                    </button>

                    <button 
                      onClick={() => setDeliveryMethod('retirada')}
                      className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all outline-none ${deliveryMethod === 'retirada' ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 ring-2 ring-emerald-500/20 scale-[1.02]' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 hover:border-emerald-250 hover:bg-slate-50/50'}`}
                    >
                      <Store className="w-5 h-5" />
                      <span className="text-[11px] font-bold block leading-none">Retirar</span>
                      <span className="text-[9px] text-slate-400 dark:text-slate-500 block leading-none font-medium">Grátis · 10min</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-slate-500">
                    <span>Subtotal</span>
                    <span>R$ {cartTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Taxa de Entrega</span>
                    <span className={deliveryMethod === 'retirada' ? 'text-emerald-500 font-bold' : 'font-bold'}>
                      {deliveryMethod === 'retirada' ? 'Grátis' : `R$ ${deliveryFee.toFixed(2)}`}
                    </span>
                  </div>
                  <div className="flex justify-between text-lg font-bold border-t dark:border-slate-800 pt-2 text-slate-800 dark:text-slate-150">
                    <span>Total a Pagar</span>
                    <span>R$ {finalTotal.toFixed(2)}</span>
                  </div>
                </div>
                
                <button 
                  onClick={async () => {
                    const newId = crypto.randomUUID();
                    try {
                      // Guardar pedido básico no Firestore se logado
                      const { collection, setDoc, doc, serverTimestamp } = await import('firebase/firestore');
                      const { db, auth } = await import('../lib/firebase');
                      if (auth.currentUser) {
                         await setDoc(doc(collection(db, 'users', auth.currentUser.uid, 'orders'), newId), {
                            id: newId,
                            status: deliveryMethod === 'retirada' ? 'completed' : 'pending',
                            storeId: 'default-store',
                            items: cart,
                            total: finalTotal,
                            deliveryMethod,
                            createdAt: serverTimestamp(),
                            updatedAt: serverTimestamp()
                         });
                      }
                    } catch(e) { 
                      console.error("Error saving order:", e); 
                    }

                    // Se for entrega, envia para a API do Servidor criar a rota, escolher entregador mais próximo e monitorar progresso
                    if (deliveryMethod !== 'retirada') {
                      try {
                        const payload = {
                          orderId: newId,
                          userId: profile?.id || "guest",
                          items: cart.map(i => `${i.quantity}x ${i.name}`).join(', '),
                          total: finalTotal,
                          vehicleType: deliveryMethod, // 'moto' | 'bicicleta'
                          deliveryAddress: profile?.address || "Avenida Paulista, 1500 - Bela Vista"
                        };

                        const res = await fetch('/api/delivery/create', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify(payload)
                        });

                        if (res.ok) {
                          const deliveryData = await res.json();
                          setActiveDeliveryId(deliveryData.id);
                          if (addNotification) {
                            addNotification({
                              title: "Entrega Iniciada",
                              message: `O pedido foi atribuído ao entregador ${deliveryData.courierName}!`,
                              type: "info"
                            });
                          }
                        }
                      } catch (e) {
                        console.error("Erro na API de entregas:", e);
                      }
                    } else {
                      if (addNotification) {
                        addNotification({
                          title: "Pedido de Retirada",
                          message: "Seu pedido foi registrado! Estará pronto para retirada em breve.",
                          type: "success"
                        });
                      }
                    }

                    // Limpa o carrinho e inicia página de rastreamento
                    onUpdateCart([]);
                    setIsTracking(true);
                  }}
                  className="w-full py-5 clay-primary px-6 font-bold text-md shadow-xl shadow-emerald-500/10 hover:bg-emerald-650 hover:scale-[1.01] active:scale-[0.99] rounded-xl transition-all flex items-center justify-center gap-2 text-white bg-emerald-600"
                >
                  {deliveryMethod === 'retirada' ? 'Finalizar e Retirar' : `Acompanhar Entrega via ${deliveryMethod === 'moto' ? 'Moto' : 'Bike'}`}
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      {/* Reviews Modal */}
      <AnimatePresence>
        {selectedProductReview && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedProductReview(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-2xl max-h-[90vh] bg-white dark:bg-slate-900 rounded-[40px] clay-card shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="p-8 border-b dark:border-slate-800 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                  <img src={selectedProductReview.image} className="w-16 h-16 rounded-2xl object-cover" />
                  <div>
                    <h3 className="text-xl font-serif font-bold text-slate-800 dark:text-slate-100">{selectedProductReview.name}</h3>
                    <div className="flex items-center gap-1.5 mt-1">
                      <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                      <span className="font-bold text-slate-900 dark:text-white">{selectedProductReview.rating || 'N/A'}</span>
                      <span className="text-slate-400 text-sm">({selectedProductReview.reviewCount || 0} avaliações)</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => toggleFavorite(selectedProductReview.id)}
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                      favorites.includes(selectedProductReview.id)
                      ? 'bg-red-50 text-red-500 dark:bg-red-900/20'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-red-500'
                    }`}
                  >
                    <Heart className={`w-5 h-5 ${favorites.includes(selectedProductReview.id) ? 'fill-current' : ''}`} />
                  </button>
                  <button 
                    onClick={() => setSelectedProductReview(null)}
                    className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-red-500 transition-all"
                  >
                    <Trash2 className="w-5 h-5 flex-shrink-0" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-8">
                {/* Leave a Review Section */}
                <div className="bg-emerald-50/50 dark:bg-emerald-900/10 p-6 rounded-3xl border border-emerald-100 dark:border-emerald-800/30 space-y-4">
                  <h4 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-500" />
                    O que você achou deste produto?
                  </h4>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => setReviewRating(star)}
                        className="transition-transform active:scale-90"
                      >
                        <Star 
                          className={`w-8 h-8 ${reviewRating >= star ? 'fill-amber-400 text-amber-400' : 'text-slate-300 dark:text-slate-700'}`} 
                        />
                      </button>
                    ))}
                  </div>
                  <div className="relative">
                    <textarea
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      placeholder="Escreva sua opinião..."
                      className="w-full p-4 clay-card p-6 focus:ring-2 focus:ring-emerald-500 outline-none text-sm resize-none h-24"
                    />
                    <button
                      disabled={isSubmittingReview || reviewRating === 0}
                      onClick={submitReview}
                      className="absolute bottom-4 right-4 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white px-4 py-2 rounded-xl flex items-center gap-2 text-xs font-bold transition-all shadow-lg shadow-emerald-500/20"
                    >
                      {isSubmittingReview ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      Publicar
                    </button>
                  </div>
                </div>

                {/* Review List */}
                <div className="space-y-6">
                  <h4 className="font-bold text-slate-400 uppercase text-xs tracking-widest flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    Avaliações dos Clientes
                  </h4>
                  
                  {selectedProductReview.reviews && selectedProductReview.reviews.length > 0 ? (
                    <div className="space-y-6">
                      {selectedProductReview.reviews.map((rev) => (
                        <div key={rev.id} className="space-y-3 pb-6 border-b border-slate-100 dark:border-slate-800 last:border-0">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center">
                                <User className="w-4 h-4 text-slate-400" />
                              </div>
                              <div>
                                <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{rev.userName}</p>
                                <div className="flex gap-0.5">
                                  {[1, 2, 3, 4, 5].map((s) => (
                                    <Star 
                                      key={s} 
                                      className={`w-2.5 h-2.5 ${rev.rating >= s ? 'fill-amber-400 text-amber-400' : 'text-slate-200 dark:text-slate-700'}`} 
                                    />
                                  ))}
                                </div>
                              </div>
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono">{rev.date}</span>
                          </div>
                          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed italic">
                            "{rev.comment}"
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 space-y-4">
                      <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800/50 rounded-full flex items-center justify-center mx-auto text-slate-300">
                        <MessageSquare className="w-8 h-8" />
                      </div>
                      <p className="text-slate-400 text-sm">Ainda não há avaliações para este produto.<br/>Seja o primeiro a avaliar!</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Partner CTA */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-12 clay-card p-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm w-full"
      >
        <div className="flex flex-col sm:flex-row items-center text-center sm:text-left gap-4 sm:gap-6 w-full">
          <div className="w-16 h-16 bg-emerald-500 rounded-3xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/20 shrink-0">
            <Store className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-xl font-serif font-bold text-slate-900 dark:text-white">Possui um sacolão ou hortifruti?</h3>
            <p className="text-slate-500 dark:text-slate-400">Venda seus produtos frescos direto para milhares de usuários no NutriAI.</p>
          </div>
        </div>
        <button 
          onClick={onOpenPartner}
          className="w-full md:w-auto px-8 py-4 bg-slate-900 dark:bg-slate-800 text-white rounded-2xl font-bold hover:scale-105 active:scale-95 transition-all shadow-xl"
        >
          Seja um parceiro
        </button>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-emerald-50 dark:bg-emerald-900/10 p-8 rounded-[40px] clay-card border border-emerald-100 dark:border-emerald-800/30 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm w-full"
      >
        <div className="flex flex-col sm:flex-row items-center text-center sm:text-left gap-4 sm:gap-6 w-full">
          <div className="w-16 h-16 bg-emerald-600 rounded-3xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/20 shrink-0">
            <Bike className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-xl font-serif font-bold text-slate-900 dark:text-white">Tem uma moto ou bike?</h3>
            <p className="text-slate-500 dark:text-slate-400">Seja seu próprio chefe e entregue saúde ganhando mais por entrega.</p>
          </div>
        </div>
        <button 
          onClick={() => {
            const evt = new CustomEvent('app:navigate', { detail: { tab: 'delivery' } });
            window.dispatchEvent(evt);
          }}
          className="w-full md:w-auto px-8 py-4 clay-primary font-bold hover:scale-105 active:scale-95 transition-all shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2 whitespace-nowrap"
        >
          Quero ser entregador
          <ChevronRight className="w-5 h-5" />
        </button>
      </motion.div>

      <AnimatePresence>
        {showOrders && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowOrders(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-[32px] overflow-hidden flex flex-col max-h-[85vh] shadow-2xl"
            >
              <div className="flex items-center justify-between p-6 border-b dark:border-slate-800">
                <h3 className="text-2xl font-serif font-bold text-slate-900 dark:text-white flex items-center gap-3">
                  <Package className="w-6 h-6 text-emerald-500" />
                  Histórico de Compras
                </h3>
                <button 
                  onClick={() => setShowOrders(false)}
                  className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-all"
                >
                  <X className="w-5 h-5 flex-shrink-0" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {orders.length === 0 ? (
                  <div className="text-center py-12 text-slate-500">
                    Nenhum pedido encontrado.
                  </div>
                ) : (
                  orders.map(order => (
                    <div key={order.id} className="p-4 border dark:border-slate-800 rounded-2xl flex flex-col gap-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white">Pedido #{order.id.slice(0, 8)}</p>
                          <p className="text-xs text-slate-500">
                            {new Date(order.createdAt?.seconds ? order.createdAt.seconds * 1000 : Date.now()).toLocaleDateString('pt-BR', { dateStyle: 'long' })}
                          </p>
                        </div>
                        <div className="px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full text-xs font-bold uppercase tracking-widest">
                          {order.status === 'pending' ? 'Pendente' : order.status}
                        </div>
                      </div>
                      <div className="space-y-2">
                        {order.items.map((item: any) => (
                          <div key={item.id} className="flex justify-between text-sm">
                            <span className="text-slate-600 dark:text-slate-400">{item.quantity}x {item.name}</span>
                            <span className="font-bold text-slate-800 dark:text-slate-200">R$ {(item.price * item.quantity).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                      <div className="pt-4 border-t dark:border-slate-800 flex justify-between items-center">
                        <span className="text-sm text-slate-500">{order.deliveryMethod === 'moto' ? 'Entrega em Casa' : 'Retirada'}</span>
                        <span className="font-bold text-lg text-emerald-600 dark:text-emerald-400">Total: R$ {order.total.toFixed(2)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
