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
  X,
  Mic,
  MicOff,
  Filter
} from 'lucide-react';
import { MarketPartner, Product, CartItem, UserProfile, ProductReview } from '../types';
import { PARTNER_ESTABLISHMENTS, LOCAL_PRODUCTS_CATALOG } from '../data/marketPartnersData';
import bannerImage1 from '../assets/images/regenerated_image_1781049540812.jpg';
import productImage1 from '../assets/images/regenerated_image_1779398315958.jpg';
import { speak, stopSpeech } from '../lib/speech';
import { playSfx, vibrate } from '../lib/sensory';
import { DeliveryTracking } from './DeliveryTracking';
import { DailyTips } from './DailyTips';
import { SmartMarketListOrganizer } from './SmartMarketListOrganizer';
import { FoodPhotoSalesFeedback } from './FoodPhotoSalesFeedback';
import { useTranslation } from '../contexts/LanguageContext';
import { db, auth } from '../lib/firebase';
import { doc, getDoc, updateDoc, setDoc, query, collection, where, getDocs, addDoc } from 'firebase/firestore';
import { PriceAlert } from '../types';

const MARKET_PARTNERS: MarketPartner[] = PARTNER_ESTABLISHMENTS;
const PRODUCTS: Product[] = LOCAL_PRODUCTS_CATALOG;

export type DietaryFilterType = 'all' | 'keto' | 'low-carb' | 'vegan' | 'high-protein' | 'detox' | 'high-fiber' | 'gluten-free';

export interface DietaryCriterion {
  id: DietaryFilterType;
  label: string;
  shortLabel: string;
  icon: string;
  speechConfirmation: string;
  keywords: string[];
  excluded?: string[];
}

export const DIETARY_CRITERIA: Record<DietaryFilterType, DietaryCriterion> = {
  all: {
    id: 'all',
    label: 'Todos os Alimentos',
    shortLabel: 'Todos',
    icon: '🥗',
    speechConfirmation: 'Exibindo todos os produtos disponíveis.',
    keywords: []
  },
  keto: {
    id: 'keto',
    label: 'Dieta Cetogênica (Keto)',
    shortLabel: 'Keto / Cetogênica',
    icon: '🥑',
    speechConfirmation: 'Filtrando ingredientes perfeitos para dieta cetogênica com baixo carboidrato e gorduras saudáveis.',
    keywords: ['abacate', 'azeite', 'espinafre', 'couve', 'rucula', 'rúcula', 'alface', 'brocolis', 'brócolis', 'abobrinha', 'berinjela', 'cogumelo', 'ovo', 'frango', 'carne', 'peixe', 'salmao', 'salmão', 'castanha', 'nozes', 'morango', 'limão', 'limao', 'pepino', 'tomate', 'salada', 'folhas'],
    excluded: ['banana', 'manga', 'batata', 'mandioca', 'milho', 'melancia', 'uva', 'laranja', 'abacaxi']
  },
  'low-carb': {
    id: 'low-carb',
    label: 'Low Carb (Baixo Carboidrato)',
    shortLabel: 'Low Carb',
    icon: '🥦',
    speechConfirmation: 'Filtrando opções com baixo teor de carboidratos líquidos.',
    keywords: ['abacate', 'espinafre', 'couve', 'alface', 'rucula', 'rúcula', 'brocolis', 'brócolis', 'abobrinha', 'berinjela', 'tomate', 'morango', 'ovo', 'frango', 'carne', 'salmão', 'salmao', 'peixe', 'cogumelo', 'pepino', 'salada'],
    excluded: ['batata', 'mandioca', 'milho', 'banana']
  },
  vegan: {
    id: 'vegan',
    label: 'Vegano (100% Plant-Based)',
    shortLabel: 'Vegano',
    icon: '🌱',
    speechConfirmation: 'Exibindo alimentos frescos de origem 100% vegetal.',
    keywords: ['fruta', 'verdura', 'legume', 'alface', 'tomate', 'banana', 'manga', 'morango', 'abacate', 'laranja', 'mandioca', 'batata', 'cenoura', 'espinafre', 'brocolis', 'couve', 'cogumelo', 'abobrinha', 'berinjela', 'pepino'],
    excluded: ['carne', 'frango', 'ovo', 'peixe', 'salmao', 'salmão', 'queijo', 'leite', 'manteiga']
  },
  'high-protein': {
    id: 'high-protein',
    label: 'Alta Proteína / Hiperproteico',
    shortLabel: 'Alta Proteína',
    icon: '🥩',
    speechConfirmation: 'Filtrando alimentos e kits com alto teor de proteínas.',
    keywords: ['frango', 'carne', 'ovo', 'ovos', 'peixe', 'salmão', 'salmao', 'cogumelo', 'proteína', 'proteina', 'kit proteína']
  },
  detox: {
    id: 'detox',
    label: 'Detox & Antioxidante',
    shortLabel: 'Detox',
    icon: '🍋',
    speechConfirmation: 'Filtrando ingredientes desintoxicantes, ricos em fibras e micronutrientes.',
    keywords: ['limão', 'limao', 'gengibre', 'couve', 'hortelã', 'hortela', 'pepino', 'maçã', 'maca', 'suco', 'abacaxi', 'melancia', 'detox', 'chá', 'cha', 'ervas']
  },
  'high-fiber': {
    id: 'high-fiber',
    label: 'Rico em Fibras (High Fiber Snacks)',
    shortLabel: 'High Fiber',
    icon: '🌾',
    speechConfirmation: 'Filtrando opções e lanches ricos em fibras naturais para saciedade e saúde intestinal.',
    keywords: ['banana', 'maçã', 'maca', 'abacaxi', 'mamão', 'mamao', 'morango', 'cenoura', 'abóbora', 'abobora', 'cogumelo', 'couve', 'espinafre', 'brócolis', 'brocolis', 'chia', 'aveia', 'linhaça', 'linhaca', 'castanha', 'nozes', 'fibra', 'fibras', 'lanche', 'lanches', 'snack', 'snacks', 'fruta', 'frutas', 'salada', 'kit', 'cesta']
  },
  'gluten-free': {
    id: 'gluten-free',
    label: 'Sem Glúten (Gluten-Free Options)',
    shortLabel: 'Sem Glúten',
    icon: '🌾❌',
    speechConfirmation: 'Filtrando opções e produtos naturalmente livres de glúten.',
    keywords: ['fruta', 'frutas', 'legume', 'legumes', 'verdura', 'verduras', 'morango', 'banana', 'maçã', 'maca', 'abacate', 'cogumelo', 'cenoura', 'abóbora', 'abobora', 'batata', 'mandioca', 'arroz', 'ovo', 'ovos', 'frango', 'carne', 'peixe', 'salmão', 'salmao', 'suco', 'orgânico', 'organico', 'kit', 'cesta', 'snack', 'lanche'],
    excluded: ['trigo', 'centeio', 'cevada', 'macarrão', 'pão', 'farinha de trigo']
  }
};

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
  const { t } = useTranslation();
  const [marketViewMode, setMarketViewMode] = useState<'catalog' | 'organizer'>('catalog');
  const [activeCategory, setActiveCategory] = useState<string>('Tudo');
  const [selectedPartnerId, setSelectedPartnerId] = useState<string>('all');
  const [saleTypeFilter, setSaleTypeFilter] = useState<'all' | 'kg' | 'unidade'>('all');
  const [sortBy, setSortBy] = useState<'proximity' | 'rating' | 'speed'>('proximity');
  const [searchQuery, setSearchQuery] = useState<string>('');
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
  const [deliveryMethod, setDeliveryMethod] = useState<'moto' | 'bicicleta' | 'pe' | 'retirada'>('bicicleta');
  const [activeDeliveryId, setActiveDeliveryId] = useState<string | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [addingAI, setAddingAI] = useState(false);
  const [showOrders, setShowOrders] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  const [dietaryFilter, setDietaryFilter] = useState<DietaryFilterType>('all');
  const [isVoiceListening, setIsVoiceListening] = useState<boolean>(false);
  const [voiceTranscript, setVoiceTranscript] = useState<string>('');
  const [voiceToast, setVoiceToast] = useState<string | null>(null);
  const recognitionRef = React.useRef<any>(null);

  const handleToggleVoiceFilter = () => {
    playSfx('tap');
    vibrate(15);

    if (isVoiceListening) {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
        recognitionRef.current = null;
      }
      setIsVoiceListening(false);
      return;
    }

    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      setVoiceToast('Reconhecimento de voz não suportado neste navegador.');
      setTimeout(() => setVoiceToast(null), 3500);
      return;
    }

    try {
      const recognition = new SpeechRecognitionAPI();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'pt-BR';

      recognition.onstart = () => {
        setIsVoiceListening(true);
        setVoiceTranscript('Ouvindo... Diga ex: "show me high fiber snacks" ou "list gluten-free options"');
      };

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          transcript += event.results[i][0].transcript;
        }
        setVoiceTranscript(transcript);

        if (event.results[0]?.isFinal) {
          processVoiceQuery(transcript);
        }
      };

      recognition.onerror = (e: any) => {
        console.warn('Voice error in Marketplace', e);
        setIsVoiceListening(false);
      };

      recognition.onend = () => {
        setIsVoiceListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.warn('Speech recognition init error', err);
      setIsVoiceListening(false);
    }
  };

  const processVoiceQuery = (rawText: string) => {
    const text = rawText.toLowerCase().trim();
    playSfx('success');
    vibrate([30, 40]);

    // 1. High Fiber / High Fiber Snacks / Rico em Fibras
    if (
      text.includes('high fiber') || 
      text.includes('high-fiber') || 
      text.includes('fiber snacks') ||
      text.includes('fiber') ||
      text.includes('fibra') ||
      text.includes('fibras') ||
      text.includes('rico em fibras') ||
      text.includes('lanches com fibra') ||
      text.includes('lanches ricos em fibras') ||
      text.includes('opções ricas em fibras')
    ) {
      setDietaryFilter('high-fiber');
      setActiveCategory('Tudo');
      setSearchQuery('');
      setVoiceToast('🌾 Filtro Ativo: High Fiber Snacks (Rico em Fibras)');
      speak(DIETARY_CRITERIA['high-fiber'].speechConfirmation, { voice: 'Aoede', lang: 'pt-BR' });
    }
    // 2. Gluten-Free / Gluten Free Options / Sem Glúten
    else if (
      text.includes('gluten free') || 
      text.includes('gluten-free') || 
      text.includes('glutenfree') || 
      text.includes('gluten') || 
      text.includes('glúten') || 
      text.includes('sem glúten') || 
      text.includes('sem gluten') || 
      text.includes('opções sem glúten') || 
      text.includes('opcoes sem gluten')
    ) {
      setDietaryFilter('gluten-free');
      setActiveCategory('Tudo');
      setSearchQuery('');
      setVoiceToast('🌾❌ Filtro Ativo: Gluten-Free Options (Sem Glúten)');
      speak(DIETARY_CRITERIA['gluten-free'].speechConfirmation, { voice: 'Aoede', lang: 'pt-BR' });
    }
    // 3. Keto / Cetogênica
    else if (
      text.includes('keto') || 
      text.includes('cetogênica') || 
      text.includes('cetogenica') || 
      text.includes('cetose') ||
      text.includes('cetogênicos') ||
      text.includes('cetogenicos')
    ) {
      setDietaryFilter('keto');
      setActiveCategory('Tudo');
      setSearchQuery('');
      setVoiceToast('🥑 Filtro Ativo: Dieta Cetogênica (Keto)');
      speak(DIETARY_CRITERIA.keto.speechConfirmation, { voice: 'Aoede', lang: 'pt-BR' });
    }
    // 4. Low Carb
    else if (
      text.includes('low carb') || 
      text.includes('lowcarb') || 
      text.includes('baixo carboidrato') || 
      text.includes('baixo carbo') || 
      text.includes('pouco carbo')
    ) {
      setDietaryFilter('low-carb');
      setActiveCategory('Tudo');
      setSearchQuery('');
      setVoiceToast('🥦 Filtro Ativo: Low Carb');
      speak(DIETARY_CRITERIA['low-carb'].speechConfirmation, { voice: 'Aoede', lang: 'pt-BR' });
    }
    // 5. Vegano
    else if (
      text.includes('vegano') || 
      text.includes('vegan') || 
      text.includes('plant based') || 
      text.includes('vegetal') ||
      text.includes('vegetariano')
    ) {
      setDietaryFilter('vegan');
      setActiveCategory('Tudo');
      setSearchQuery('');
      setVoiceToast('🌱 Filtro Ativo: Vegano (100% Plant-Based)');
      speak(DIETARY_CRITERIA.vegan.speechConfirmation, { voice: 'Aoede', lang: 'pt-BR' });
    }
    // 6. Alta Proteína
    else if (
      text.includes('proteína') || 
      text.includes('proteina') || 
      text.includes('hiperproteico') || 
      text.includes('proteico') || 
      text.includes('massa muscular') ||
      text.includes('high protein')
    ) {
      setDietaryFilter('high-protein');
      setActiveCategory('Tudo');
      setSearchQuery('');
      setVoiceToast('🥩 Filtro Ativo: Alta Proteína');
      speak(DIETARY_CRITERIA['high-protein'].speechConfirmation, { voice: 'Aoede', lang: 'pt-BR' });
    }
    // 7. Detox
    else if (
      text.includes('detox') || 
      text.includes('limpeza') || 
      text.includes('antioxidante') ||
      text.includes('desintoxicante')
    ) {
      setDietaryFilter('detox');
      setActiveCategory('Tudo');
      setSearchQuery('');
      setVoiceToast('🍋 Filtro Ativo: Detox & Antioxidante');
      speak(DIETARY_CRITERIA.detox.speechConfirmation, { voice: 'Aoede', lang: 'pt-BR' });
    }
    // 8. Limpar / Ver todos
    else if (
      text.includes('limpar') || 
      text.includes('todos') || 
      text.includes('tudo') || 
      text.includes('cancelar') ||
      text.includes('remover filtro') ||
      text.includes('clear') ||
      text.includes('show all')
    ) {
      setDietaryFilter('all');
      setSearchQuery('');
      setVoiceToast('Filtro removido: Todos os produtos');
      speak(DIETARY_CRITERIA.all.speechConfirmation, { voice: 'Aoede', lang: 'pt-BR' });
    }
    // 9. General search fallback (ex: "show me apples", "list snacks", "find spinach")
    else {
      const clean = text
        .replace(/^(show\s+me|list|find|search\s+for|encontrar|buscar|procure|procurar|comprar|quero)\s+/i, '')
        .replace(/^(options\s+for|snacks\s+for|ingredientes\s+para|alimentos\s+para|produtos\s+de)\s+/i, '')
        .trim();
      setSearchQuery(clean);
      setDietaryFilter('all');
      setVoiceToast(`Buscando por: "${clean}"`);
      speak(`Buscando produtos relacionados a ${clean}.`, { voice: 'Aoede', lang: 'pt-BR' });
    }

    setTimeout(() => {
      setVoiceToast(null);
    }, 4500);
  };

  useEffect(() => {
    if (showOrders) {
       const loadOrders = async () => {
          try {
             const { collection, getDocs } = await import('../lib/firebase');
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
             console.warn('Erro ao buscar pedidos', e);
          }
       };
       loadOrders();
    }
  }, [showOrders]);

  const [activeBanners, setActiveBanners] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('nutri-partner-promos') || '[]');
      if (Array.isArray(stored) && stored.length > 0) {
        return [...stored, ...BANNERS];
      }
    } catch(e) {}
    return BANNERS;
  });

  const [priceAlerts, setPriceAlerts] = useState<PriceAlert[]>([]);

  useEffect(() => {
    const loadAlerts = async () => {
      if (!auth.currentUser) return;
      const q = query(collection(db, 'users', auth.currentUser.uid, 'priceAlerts'), where('active', '==', true));
      const snap = await getDocs(q);
      const alerts = snap.docs.map(d => ({ id: d.id, ...d.data() } as PriceAlert));
      setPriceAlerts(alerts);
      
      // Check for price alerts triggered
      alerts.forEach(alert => {
        const product = PRODUCTS.find(p => p.name === alert.ingredientName);
        if (product && product.price <= alert.targetPrice) {
          triggerAlertEmail(alert, product);
        }
      });
    };
    loadAlerts();
  }, []);

  const triggerAlertEmail = async (alert: PriceAlert, product: Product) => {
    if (!auth.currentUser?.email || !auth.currentUser?.uid) return;
    
    // Send Email
    await addDoc(collection(db, 'mail'), {
      to: auth.currentUser.email,
      message: {
        subject: `Alerta de Preço: ${alert.ingredientName}`,
        text: `Olá! O preço do ingrediente ${alert.ingredientName} caiu para R$ ${product.price.toFixed(2)}, atingindo seu alerta de R$ ${alert.targetPrice.toFixed(2)}.`,
        html: `<p>Olá!</p><p>O preço do ingrediente <b>${alert.ingredientName}</b> caiu para <b>R$ ${product.price.toFixed(2)}</b>, atingindo seu alerta de R$ ${alert.targetPrice.toFixed(2)}.</p>`
      }
    });

    // Save Notification Log
    await addDoc(collection(db, 'users', auth.currentUser.uid, 'notifications'), {
      title: 'Alerta de Preço',
      message: `O preço de ${alert.ingredientName} caiu para R$ ${product.price.toFixed(2)}!`,
      type: 'info',
      date: new Date().toISOString(),
      read: false
    });

    // Notify UI
    if (addNotification) {
        addNotification({
          title: 'Alerta de Preço',
          message: `O preço de ${alert.ingredientName} caiu para R$ ${product.price.toFixed(2)}!`,
          type: 'info'
        });
    }

    // Mark as inactive
    await updateDoc(doc(db, 'users', auth.currentUser.uid, 'priceAlerts', alert.id), { active: false });
    setPriceAlerts(prev => prev.filter(a => a.id !== alert.id));
  };

  useEffect(() => {
    const handlePromoAdded = (e: any) => {
      if (e.detail) {
        setActiveBanners((prev: any[]) => [e.detail, ...prev.filter((b: any) => b.id !== e.detail.id)]);
      }
    };
    window.addEventListener('nutri-promo-added', handlePromoAdded);
    return () => window.removeEventListener('nutri-promo-added', handlePromoAdded);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentBanner(prev => (prev + 1) % (activeBanners.length || 1));
    }, 6000);
    return () => clearInterval(timer);
  }, [activeBanners.length]);

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

  const handleSetPriceAlert = async (product: Product, targetPrice: number) => {
    if (!auth.currentUser) return;
    const newAlert: Omit<PriceAlert, 'id'> = {
      userId: auth.currentUser.uid,
      ingredientName: product.name,
      targetPrice,
      active: true,
      createdAt: new Date().toISOString()
    };
    const docRef = await addDoc(collection(db, 'users', auth.currentUser.uid, 'priceAlerts'), newAlert);
    setPriceAlerts(prev => [...prev, { id: docRef.id, ...newAlert }]);
    if (addNotification) {
      addNotification({
        title: 'Alerta de Preço Definido',
        message: `Alerta para ${product.name} definido em R$ ${targetPrice.toFixed(2)}`,
        type: 'success'
      });
    }
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
  const deliveryFee = deliveryMethod === 'moto' ? 5.90 : deliveryMethod === 'bicicleta' ? 3.90 : deliveryMethod === 'pe' ? 1.90 : 0;
  const finalTotal = cartTotal + deliveryFee;

  // Sorted Partners by selected criteria (default Proximity)
  const sortedPartners = [...MARKET_PARTNERS].sort((a, b) => {
    if (sortBy === 'proximity') return (a.distanceKm || 99) - (b.distanceKm || 99);
    if (sortBy === 'rating') return b.rating - a.rating;
    if (sortBy === 'speed') return parseInt(a.deliveryTime) - parseInt(b.deliveryTime);
    return 0;
  });

  // Filtered products based on category, active partner, sale modality, search, and dietary criteria
  const filteredProducts = PRODUCTS.filter(p => {
    const matchesCategory = activeCategory === 'Tudo' || p.category === activeCategory;
    const matchesPartner = selectedPartnerId === 'all' || p.partnerId === selectedPartnerId;
    const matchesSaleType = saleTypeFilter === 'all' || p.saleType === saleTypeFilter;
    const matchesSearch = !searchQuery.trim() || 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.origin && p.origin.toLowerCase().includes(searchQuery.toLowerCase()));

    let matchesDiet = true;
    if (dietaryFilter !== 'all') {
      const criteria = DIETARY_CRITERIA[dietaryFilter];
      const hay = (p.name + ' ' + p.description + ' ' + (p.category || '')).toLowerCase();
      const hasKeyword = criteria.keywords.some(k => hay.includes(k));
      const hasExcluded = criteria.excluded ? criteria.excluded.some(ex => hay.includes(ex)) : false;
      matchesDiet = hasKeyword && !hasExcluded;
    }

    return matchesCategory && matchesPartner && matchesSaleType && matchesSearch && matchesDiet;
  });

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
          
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 sm:gap-3">
            {/* Main View Mode Selector Tabs */}
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => { setMarketViewMode('catalog'); vibrate(5); }}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
                  marketViewMode === 'catalog'
                    ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                }`}
              >
                <Store className="w-3.5 h-3.5" />
                <span>Catálogo de Produtos</span>
              </button>
              <button
                type="button"
                onClick={() => { setMarketViewMode('organizer'); vibrate(5); }}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
                  marketViewMode === 'organizer'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 animate-spin" />
                <span>Organizador Inteligente de Listas</span>
              </button>
            </div>

            <button 
              onClick={onOpenMap}
              className="flex items-center gap-1.5 p-1.5 px-3 bg-emerald-600 text-white rounded-xl border border-emerald-500 font-bold text-[11px] sm:text-xs hover:scale-105 transition-all shadow-sm group cursor-pointer"
            >
              <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center text-white shadow-md shrink-0">
                 <MapIcon className="w-3.5 h-3.5" />
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
              className="flex items-center gap-1.5 p-1.5 px-3 bg-slate-900 dark:bg-slate-700 text-white rounded-xl border border-slate-800 dark:border-slate-600 font-bold text-[11px] sm:text-xs hover:scale-105 active:scale-95 transition-all shadow-sm group cursor-pointer outline-none whitespace-nowrap"
            >
              <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center text-white shadow-md shrink-0 group-hover:bg-emerald-600 transition-colors">
                 <Package className="w-3.5 h-3.5" />
              </div>
              <span className="hidden sm:inline">Meus Pedidos</span>
              <span className="sm:hidden">Pedidos</span>
            </button>
          </div>
        </div>
      </div>

      {/* Conditional View: Smart List Organizer OR Catalog */}
      {marketViewMode === 'organizer' ? (
        <SmartMarketListOrganizer
          profile={profile}
          cart={cart}
          onAddToCart={addToCart}
          onUpdateCart={(updatedCart) => {
            setCart(updatedCart);
            onUpdateCart(updatedCart);
          }}
          onOpenPartner={onOpenPartner}
        />
      ) : (
        <>
          {/* Smart Organizer Teaser Banner in Catalog Mode */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-slate-50 dark:from-emerald-950/30 dark:via-slate-900 dark:to-slate-900 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <Zap className="w-5 h-5 text-emerald-600 animate-bounce" />
              </div>
              <div>
                <p className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  Organizador Inteligente de Listas
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                    Estoque x Ofertas
                  </span>
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Cruze seus itens com seu estoque em casa para evitar desperdício e encontre ofertas nos mercados locais!
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => { setMarketViewMode('organizer'); vibrate(10); }}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all cursor-pointer shrink-0 shadow-sm flex items-center gap-1.5 self-start sm:self-auto"
            >
              <span>Abrir Organizador</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

      {/* Partner Establishments Bar - Tabs with Proximity & Store details */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-serif text-xl sm:text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Store className="w-5 h-5 text-emerald-600" />
              Estabelecimentos Parceiros Próximos
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Selecione uma loja para navegar pelo estoque local em tempo real
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Ordenar:</span>
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              <button
                onClick={() => setSortBy('proximity')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                  sortBy === 'proximity' ? 'bg-white dark:bg-slate-700 text-emerald-600 shadow-xs' : 'text-slate-500'
                }`}
              >
                Proximidade
              </button>
              <button
                onClick={() => setSortBy('rating')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                  sortBy === 'rating' ? 'bg-white dark:bg-slate-700 text-emerald-600 shadow-xs' : 'text-slate-500'
                }`}
              >
                Avaliação
              </button>
              <button
                onClick={() => setSortBy('speed')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                  sortBy === 'speed' ? 'bg-white dark:bg-slate-700 text-emerald-600 shadow-xs' : 'text-slate-500'
                }`}
              >
                Mais Rápido
              </button>
            </div>
          </div>
        </div>

        {/* Store Tabs Slider */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* 'All Stores' Tab */}
          <button
            onClick={() => setSelectedPartnerId('all')}
            className={`p-3.5 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
              selectedPartnerId === 'all'
                ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/30 ring-2 ring-emerald-500/20 shadow-sm'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                ALL
              </div>
              <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full font-bold text-slate-600 dark:text-slate-300">
                {PRODUCTS.length} itens
              </span>
            </div>
            <div>
              <p className="font-bold text-sm text-slate-800 dark:text-slate-100">Todos os Mercados</p>
              <p className="text-[11px] text-slate-500">Estoque integrado por raio</p>
            </div>
          </button>

          {/* Individual Store Tabs */}
          {sortedPartners.map(market => {
            const isSelected = selectedPartnerId === market.id;
            return (
              <button
                key={market.id}
                onClick={() => {
                  setSelectedPartnerId(market.id);
                  setActiveMarket(market);
                }}
                className={`p-3.5 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
                  isSelected
                    ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/30 ring-2 ring-emerald-500/20 shadow-sm'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-2.5 mb-2">
                  <img
                    src={market.image}
                    alt={market.name}
                    className="w-9 h-9 rounded-xl object-cover shrink-0 border border-slate-200 dark:border-slate-700"
                    referrerPolicy="no-referrer"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">{market.name}</p>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                      <MapPin className="w-2.5 h-2.5 shrink-0" />
                      <span>{market.distance}</span>
                      <span className="text-slate-400 font-normal">· {market.deliveryTime}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[10px] border-t border-slate-100 dark:border-slate-800/80 pt-2 mt-1">
                  <span className="text-slate-500 truncate max-w-[130px]">{market.typeLabel || 'Sacolão Local'}</span>
                  <div className="flex items-center gap-0.5 font-bold text-amber-500">
                    <Star className="w-2.5 h-2.5 fill-current" />
                    <span>{market.rating}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Dynamic Banner */}
      {activeBanners.length > 0 && (() => {
        const cur = activeBanners[currentBanner] || activeBanners[0];
        return (
          <div className="relative w-full max-w-full h-[180px] sm:h-[320px] md:h-[420px] rounded-[24px] md:rounded-[40px] clay-card overflow-hidden bg-white dark:bg-white transition-colors box-border mx-auto border-none">
            <AnimatePresence mode="wait">
              <motion.div
                key={cur.id}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.8 }}
                className="absolute inset-0"
              >
                {!failedImages[cur.id] ? (
                  <img 
                    src={cur.image} 
                    alt={cur.title}
                    className="w-full h-full object-cover object-center block" 
                    referrerPolicy="no-referrer"
                    onError={() => {
                      setFailedImages(prev => ({ ...prev, [cur.id]: true }));
                    }}
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-emerald-800 via-emerald-950 to-teal-950 flex flex-col items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.06),transparent_50%)] animate-pulse" />
                    <span className="text-4xl sm:text-6xl mb-2 filter drop-shadow-md select-none opacity-80">🍊 🥗 🥑</span>
                    <span className="text-emerald-400 font-mono text-[9px] uppercase tracking-[0.25em] relative z-10 select-none">
                      Hortifruti Premium
                    </span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent z-10" />
                <div className="absolute inset-x-0 bottom-0 p-3 sm:p-6 md:p-12 flex flex-col justify-end items-start text-left space-y-1 sm:space-y-2 md:space-y-4 box-border z-20">
                   <div className="flex items-center gap-1.5 sm:gap-3">
                      <div className="px-2 py-0.5 sm:px-3 sm:py-1 clay-primary text-[8px] sm:text-[10px] md:text-xs font-bold uppercase tracking-widest whitespace-nowrap">
                         {t(cur.price)}
                      </div>
                      <button 
                        onClick={() => handleSpeak(t(cur.tip))}
                        className="w-6 h-6 sm:w-10 sm:h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white active:bg-white/40 flex-shrink-0"
                        style={{ color: '#ffffff' }}
                      >
                         <Volume2 className="w-3 h-3 sm:w-5 sm:h-5" style={{ color: '#ffffff' }} />
                      </button>
                   </div>
                   <h3 className="text-sm sm:text-2xl md:text-5xl font-serif font-bold text-white leading-tight break-words">
                      {t(cur.title)}
                   </h3>
                   <p className="hidden sm:block text-white text-xs sm:text-base md:text-xl font-medium break-words max-w-lg">{t(cur.subtitle)}</p>
                   <button 
                      style={{ color: '#ffffff', backgroundColor: '#528f5c' }} onClick={() => addToCart(PRODUCTS[0])}
                      className="px-3 py-1 sm:py-3.5 md:px-8 md:py-4 clay-primary md:rounded-2xl font-bold active:scale-95 transition-all flex items-center justify-center gap-1.5 sm:gap-2 w-auto mt-0.5 sm:mt-2 text-white cursor-pointer"
                   >
                      <ShoppingCart style={{ color: '#ffffff' }} className="w-3 h-3 sm:w-5 sm:h-5 flex-shrink-0" />
                      <span style={{ color: '#ffffff' }} className="text-[10px] sm:text-sm md:text-base truncate text-white">{t('buy_now', 'Comprar Agora')}</span>
                   </button>
                </div>
              </motion.div>
            </AnimatePresence>
            
            {/* Indicators - Vertical on very small screens, horizontal otherwise */}
            <div className="absolute top-3 right-3 sm:bottom-4 sm:top-auto sm:right-6 md:bottom-8 md:right-12 flex flex-col sm:flex-row gap-1 sm:gap-2 md:gap-3 z-30">
              {activeBanners.map((_, i) => (
                <div 
                  key={i}
                  className={`rounded-full transition-all duration-500 ${currentBanner === i ? 'h-3 sm:h-1 sm:md:h-1.5 w-1 sm:w-8 md:w-10 bg-emerald-500' : 'h-1 sm:h-1 sm:md:h-1.5 w-1 sm:w-2 md:w-3 bg-white/30'}`}
                />
              ))}
            </div>
          </div>
        );
      })()}

      {/* Dicas Diárias (Daily Tips AI) Component */}
      <DailyTips profile={profile} />

      {/* AI Recommendation Section */}
      <div className="bg-white dark:bg-slate-900/60 p-5 rounded-[32px] clay-card border border-slate-100 dark:border-slate-800/80 shadow-sm flex flex-col items-center justify-center text-center space-y-4 w-full max-w-[600px] mx-auto box-border">
        <div className="w-16 h-16 bg-emerald-500/10 dark:bg-emerald-500/20 rounded-full flex items-center justify-center text-emerald-500 mx-auto shadow-sm">
          <Leaf className="w-8 h-8" />
        </div>
        <div className="space-y-2 text-center w-full">
          <h4 className="text-xl sm:text-2xl font-serif font-bold text-slate-900 dark:text-white break-words">
            Baseado no seu plano alimentar
          </h4>
          <p className="text-slate-500 dark:text-slate-400 text-sm sm:text-base break-words">
            Montei um kit especial com ingredientes fundamentais para seus objetivos de {profile?.goals || 'saúde'}.
          </p>
        </div>
        <button 
          onClick={() => {
            const kitProduct = PRODUCTS.find(p => p.category === 'Kits') || PRODUCTS[0];
            addToCart(kitProduct);
            setAddingAI(true);
            setTimeout(() => {
              setAddingAI(false);
            }, 1500);
          }}
          disabled={addingAI}
          id="ai-sug-btn"
          className={`w-full py-4 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 rounded-full font-bold transition-all shadow-sm border border-emerald-100 dark:border-emerald-900/50 flex items-center justify-center gap-2 ${addingAI ? 'bg-emerald-200 dark:bg-emerald-900 scale-95' : 'active:scale-95'}`}
        >
          {addingAI ? 'Adicionado! 🛒' : 'Adicionar Sugestão IA'}
        </button>
      </div>

      {/* Search & Modality Filters */}
      <div className="space-y-4">
        {/* Voice Search Toast Feedback */}
        <AnimatePresence>
          {voiceToast && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs sm:text-sm font-bold flex items-center justify-between shadow-lg shadow-emerald-500/20"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 animate-spin-slow" />
                <span>{voiceToast}</span>
              </div>
              <button
                type="button"
                onClick={() => setVoiceToast(null)}
                className="p-1 hover:bg-white/20 rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Search Input with Voice-Activated Filter Button */}
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder='Buscar ou fale ex: "show me high fiber snacks", "list gluten-free options"...'
              className="w-full pl-10 pr-24 py-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-slate-800 dark:text-slate-100 shadow-xs"
            />
            {/* Voice Command Filter Button */}
            <button
              type="button"
              onClick={handleToggleVoiceFilter}
              className={`absolute right-2 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                isVoiceListening
                  ? 'bg-rose-500 text-white animate-pulse shadow-md shadow-rose-500/40'
                  : 'bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
              }`}
              title='Filtrar por voz: clique e fale "show me high fiber snacks" ou "list gluten-free options"'
            >
              {isVoiceListening ? (
                <>
                  <Mic className="w-3.5 h-3.5 animate-bounce" />
                  <span className="text-[11px]">Ouvindo...</span>
                </>
              ) : (
                <>
                  <Mic className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-[11px]">Voz</span>
                </>
              )}
            </button>
          </div>

          {/* Modalidade de Venda Selector: Por Quilo (kg) vs Por Unidade (un) */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl w-full sm:w-auto justify-center">
            <button
              onClick={() => setSaleTypeFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                saleTypeFilter === 'all'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Todas Modalidades
            </button>
            <button
              onClick={() => setSaleTypeFilter('kg')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                saleTypeFilter === 'kg'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/20'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              Por Quilo (kg)
            </button>
            <button
              onClick={() => setSaleTypeFilter('unidade')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                saleTypeFilter === 'unidade'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-teal-700 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/20'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-teal-400" />
              Por Unidade (un)
            </button>
          </div>
        </div>

        {/* Dietary Criteria Pills Bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 px-1">
            <span className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-emerald-500" />
              Critérios Dietéticos (Fale por voz ou selecione):
            </span>
            {dietaryFilter !== 'all' && (
              <button
                type="button"
                onClick={() => {
                  setDietaryFilter('all');
                  playSfx('tap');
                }}
                className="text-xs text-rose-500 hover:underline cursor-pointer font-bold"
              >
                Limpar filtro dietético
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
            {(Object.keys(DIETARY_CRITERIA) as DietaryFilterType[]).map((dietKey) => {
              const item = DIETARY_CRITERIA[dietKey];
              const isSelected = dietaryFilter === dietKey;
              return (
                <button
                  key={dietKey}
                  type="button"
                  onClick={() => {
                    playSfx('tap');
                    vibrate(10);
                    setDietaryFilter(dietKey);
                    if (dietKey !== 'all') {
                      speak(item.speechConfirmation, { voice: 'Aoede', lang: 'pt-BR' });
                    }
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer border ${
                    isSelected
                      ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-500/25 scale-102 ring-2 ring-emerald-400/40'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-emerald-500/40'
                  }`}
                >
                  <span>{item.icon}</span>
                  <span>{item.shortLabel}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Active Dietary Filter Banner Notification */}
        {dietaryFilter !== 'all' && (
          <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-200 flex items-center justify-between text-xs sm:text-sm font-semibold">
            <div className="flex items-center gap-2">
              <span className="text-base">{DIETARY_CRITERIA[dietaryFilter].icon}</span>
              <span>
                Filtro Ativo: <strong>{DIETARY_CRITERIA[dietaryFilter].label}</strong> ({filteredProducts.length} itens encontrados)
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setDietaryFilter('all');
                playSfx('tap');
              }}
              className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-xs font-bold text-emerald-700 dark:text-emerald-300 cursor-pointer"
            >
              Remover
            </button>
          </div>
        )}

        {/* Category Tabs */}
        <div className="flex justify-center flex-wrap items-center gap-2 sm:gap-3 pb-2 w-full">
          {['Tudo', 'Frutas', 'Verduras', 'Legumes', 'Kits'].map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-xl font-bold text-xs sm:text-sm transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                activeCategory === cat 
                ? 'bg-slate-900 text-white shadow-md' 
                : 'bg-white dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700 hover:border-slate-300'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Product Grid with Crisp Real Images & Sale Modality */}
      <div className="grid grid-cols-1 min-[420px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 box-border w-full justify-items-stretch">
        {filteredProducts.map(product => {
          const partner = MARKET_PARTNERS.find(m => m.id === product.partnerId);
          return (
            <motion.div
              layout
              key={product.id}
              className="bg-white dark:bg-slate-900/60 p-4 sm:p-5 rounded-[28px] clay-card border border-slate-100 dark:border-slate-800/80 shadow-sm hover:shadow-xl transition-all group flex flex-col items-center text-center justify-between h-full w-full max-w-[600px] mx-auto gap-3.5 box-border"
            >
              <div className="relative w-full h-44 rounded-2xl overflow-hidden shrink-0 bg-slate-100 dark:bg-slate-800">
                {!failedImages[product.id] ? (
                  <img 
                    src={product.image} 
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-500" 
                    referrerPolicy="no-referrer"
                    onError={() => {
                      setFailedImages(prev => ({ ...prev, [product.id]: true }));
                    }}
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-emerald-500/10 to-teal-500/10 flex items-center justify-center text-4xl select-none">
                    {product.category === 'Frutas' ? '🍎' : product.category === 'Verduras' ? '🥬' : product.category === 'Legumes' ? '🥕' : '🥗'}
                  </div>
                )}

                {/* Badges Overlay */}
                <div className="absolute top-2.5 left-2.5 flex flex-col gap-1 items-start z-10">
                  {/* Modalidade de Venda Tag */}
                  <span className={`px-2 py-0.5 rounded-lg text-[9px] font-extrabold uppercase tracking-wider shadow-sm text-white ${
                    product.saleType === 'kg' 
                      ? 'bg-emerald-600' 
                      : 'bg-teal-700'
                  }`}>
                    {product.saleType === 'kg' ? 'Venda p/ Quilo (kg)' : 'Venda p/ Unidade'}
                  </span>

                  {product.isOrganic && (
                    <span className="px-2 py-0.5 bg-emerald-500 text-white rounded-lg text-[8px] font-bold uppercase tracking-widest shadow-sm">
                      Orgânico
                    </span>
                  )}
                  {product.stockStatus === 'fresh_today' && (
                    <span className="px-2 py-0.5 bg-amber-500 text-white rounded-lg text-[8px] font-bold uppercase tracking-widest shadow-sm">
                      Colhido Hoje
                    </span>
                  )}
                </div>

                {/* Instant Photo Feedback for Sales Optimization */}
                <div className="absolute top-2.5 right-2.5 z-20">
                  <FoodPhotoSalesFeedback
                    productName={product.name}
                    category={product.category === 'Frutas' || product.category === 'Verduras' || product.category === 'Legumes' ? 'fruits_veg' : 'food_product'}
                    photoUrl={product.image}
                    compact={true}
                  />
                </div>

                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavorite(product.id);
                  }}
                  className={`absolute bottom-2.5 right-2.5 p-2 rounded-xl backdrop-blur-md transition-all ${
                    favorites.includes(product.id)
                    ? 'bg-red-500 text-white shadow-lg'
                    : 'bg-black/30 hover:bg-black/50 text-white'
                  }`}
                >
                  <Heart className={`w-4 h-4 ${favorites.includes(product.id) ? 'fill-current' : ''}`} />
                </button>
              </div>
              
              <div className="space-y-1.5 flex flex-col items-center text-center w-full">
                {partner && (
                  <div className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                    <Store className="w-3 h-3 shrink-0" />
                    <span className="truncate max-w-[150px]">{partner.name}</span>
                    <span className="text-slate-400 font-normal">({partner.distance})</span>
                  </div>
                )}

                <div className="flex items-center justify-center gap-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{product.category}</p>
                  <div 
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedProductReview(product);
                    }}
                    className="flex items-center gap-1 text-[10px] bg-slate-100 dark:bg-slate-800/60 px-2 py-0.5 rounded-full cursor-pointer hover:bg-emerald-50 dark:hover:bg-emerald-950/20 transition-all border border-transparent hover:border-emerald-200"
                  >
                    <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                    <span className="font-bold text-slate-700 dark:text-slate-300">{product.rating || 'N/A'}</span>
                    <span className="text-slate-400">({product.reviewCount || 0})</span>
                  </div>
                </div>

                <h5 className="font-serif text-base font-bold text-slate-900 dark:text-white leading-snug">{product.name}</h5>
                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">{product.description}</p>
                {product.origin && (
                  <p className="text-[10px] text-slate-400 font-medium italic">Origem: {product.origin}</p>
                )}
              </div>

              <div className="flex flex-col items-center gap-2 w-full mt-auto pt-2 border-t border-slate-100 dark:border-slate-800/60">
                <div className="text-center">
                  <p className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">R$ {product.price.toFixed(2)}</p>
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider">
                    {product.saleTypeLabel || `por ${product.unit}`}
                  </p>
                </div>
                <button 
                  onClick={() => addToCart(product)}
                  className="w-full py-2.5 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-xl font-bold transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 text-xs sm:text-sm border-none cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Adicionar ao Sacolão
                </button>
                <button
                  onClick={() => {
                     const price = parseFloat(prompt('Defina o preço de alerta para ' + product.name + ':') || '0');
                     if (price > 0) handleSetPriceAlert(product, price);
                  }}
                  className="w-full py-2 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 rounded-xl font-bold transition-all hover:bg-amber-200 dark:hover:bg-amber-800 flex items-center justify-center gap-2 text-[10px] mt-2 cursor-pointer"
                >
                  <TrendingDown className="w-3 h-3" />
                  Alertar Preço
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Floating Cart Button */}
      <AnimatePresence>
        {cart.length > 0 && (
          <div className="fixed bottom-32 left-0 right-0 z-50 flex justify-center items-center pointer-events-none w-full px-4">
            <motion.button
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              onClick={() => setShowCart(true)}
              className="pointer-events-auto bg-slate-900 dark:bg-slate-950 text-white rounded-[20px] shadow-2xl flex items-center h-10 min-h-[40px] gap-2 hover:scale-105 active:scale-95 transition-transform border border-white/10"
              style={{
                paddingRight: '1px',
                paddingBottom: '0px',
                marginRight: '0px',
                marginBottom: '-280px',
                paddingTop: '8px',
                paddingLeft: '12px'
              }}
            >
              <div className="relative flex items-center justify-center">
                <ShoppingBag className="w-5 h-5 text-emerald-400" />
                <div className="absolute -top-1.5 -right-1.5 min-w-[14px] h-3.5 bg-emerald-500 text-white rounded-full px-1 flex items-center justify-center text-[8px] font-bold shadow-sm">
                  {cart.reduce((a, b) => a + b.quantity, 0)}
                </div>
              </div>
              <div className="text-left flex flex-col justify-center leading-none pr-1">
                <p className="text-[8px] font-extrabold text-white/50 uppercase tracking-widest leading-none">Ver Carrinho</p>
                <p className="text-xs font-bold leading-tight mt-0.5">R$ {cartTotal.toFixed(2)}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-emerald-500 ml-0.5" />
            </motion.button>
          </div>
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
                    <img src={item.image} className="w-20 h-20 rounded-2xl object-cover" referrerPolicy="no-referrer" />
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
                    <p className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-widest text-xs">Forma de Envio / Retirada</p>
                    {deliveryMethod === 'bicicleta' && (
                      <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Leaf className="w-3 h-3" /> Pegada Neutra
                      </span>
                    )}
                    {deliveryMethod === 'pe' && (
                      <span className="text-[10px] bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                        <User className="w-3 h-3" /> Curta Distância (Zero Poluição)
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-4 gap-1.5 mb-4">
                    <button 
                      onClick={() => setDeliveryMethod('pe')}
                      className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all outline-none ${deliveryMethod === 'pe' ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 ring-2 ring-emerald-500/20 scale-[1.02]' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 hover:border-emerald-250 hover:bg-slate-50/50'}`}
                    >
                      <User className="w-4 h-4" />
                      <span className="text-[10px] font-bold block leading-none">A Pé</span>
                      <span className="text-[8px] text-slate-400 dark:text-slate-500 block leading-none font-medium">R$ 1,90 · 10min</span>
                    </button>

                    <button 
                      onClick={() => setDeliveryMethod('bicicleta')}
                      className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all outline-none ${deliveryMethod === 'bicicleta' ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 ring-2 ring-emerald-500/20 scale-[1.02]' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 hover:border-emerald-250 hover:bg-slate-50/50'}`}
                    >
                      <Bike className="w-4 h-4" />
                      <span className="text-[10px] font-bold block leading-none">Bike</span>
                      <span className="text-[8px] text-slate-400 dark:text-slate-500 block leading-none font-medium">R$ 3,90 · 20min</span>
                    </button>
                    
                    <button 
                      onClick={() => setDeliveryMethod('moto')}
                      className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all outline-none ${deliveryMethod === 'moto' ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 ring-2 ring-emerald-500/20 scale-[1.02]' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 hover:border-emerald-250 hover:bg-slate-50/50'}`}
                    >
                      <Zap className="w-4 h-4 text-amber-500" />
                      <span className="text-[10px] font-bold block leading-none">Moto</span>
                      <span className="text-[8px] text-slate-400 dark:text-slate-500 block leading-none font-medium">R$ 5,90 · 12min</span>
                    </button>

                    <button 
                      onClick={() => setDeliveryMethod('retirada')}
                      className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all outline-none ${deliveryMethod === 'retirada' ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 ring-2 ring-emerald-500/20 scale-[1.02]' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 hover:border-emerald-250 hover:bg-slate-50/50'}`}
                    >
                      <Store className="w-4 h-4" />
                      <span className="text-[10px] font-bold block leading-none">Retirar</span>
                      <span className="text-[8px] text-slate-400 dark:text-slate-500 block leading-none font-medium">Grátis</span>
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
                  <div className="flex justify-between text-lg font-bold border-t dark:border-slate-800 pt-2 text-slate-800 dark:text-slate-200">
                    <span>Total a Pagar</span>
                    <span>R$ {finalTotal.toFixed(2)}</span>
                  </div>
                </div>
                
                <button 
                  onClick={async () => {
                    const newId = crypto.randomUUID();
                    try {
                      // Guardar pedido básico no Firestore se logado
                      const { collection, setDoc, doc, serverTimestamp } = await import('../lib/firebase');
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
                  <img src={selectedProductReview.image} className="w-16 h-16 rounded-2xl object-cover" referrerPolicy="no-referrer" />
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

      {/* Partner & Delivery Section - Grid of 2 Standardised Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 mt-12 w-full max-w-5xl mx-auto box-border">
        {/* Market Partner Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-900/60 p-5 rounded-[32px] clay-card border border-slate-100 dark:border-slate-800/80 flex flex-col items-center justify-center text-center space-y-4 shadow-sm w-full max-w-[600px] mx-auto box-border"
        >
          <div className="w-16 h-16 bg-emerald-500/10 dark:bg-emerald-500/20 rounded-full flex items-center justify-center text-emerald-500 mx-auto shadow-sm">
            <Store className="w-8 h-8" />
          </div>
          <div className="space-y-2 text-center w-full">
            <h3 className="text-xl font-serif font-bold text-slate-900 dark:text-white">Possui um sacolão ou hortifruti?</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Venda seus produtos frescos direto para milhares de usuários no NutriAI.</p>
          </div>
          <button 
            onClick={onOpenPartner}
            className="w-full py-4 bg-slate-900 dark:bg-slate-800 text-white rounded-full font-bold hover:scale-[1.02] active:scale-95 transition-all shadow-md text-sm mt-2 border-none cursor-pointer"
          >
            Seja um parceiro
          </button>
        </motion.div>

        {/* Delivery Partner Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-900/60 p-5 rounded-[32px] clay-card border border-slate-100 dark:border-slate-800/80 flex flex-col items-center justify-center text-center space-y-4 shadow-sm w-full max-w-[600px] mx-auto box-border"
        >
          <div className="w-16 h-16 bg-emerald-500/10 dark:bg-emerald-500/20 rounded-full flex items-center justify-center text-emerald-500 mx-auto shadow-sm">
            <Bike className="w-8 h-8" />
          </div>
          <div className="space-y-2 text-center w-full">
            <h3 className="text-xl font-serif font-bold text-slate-900 dark:text-white">Trabalhe com entregas?</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Cadastre-se e faça entregas com bicicleta ou moto.</p>
          </div>
          <button 
            onClick={() => {
              const evt = new CustomEvent('app:navigate', { detail: { tab: 'delivery' } });
              window.dispatchEvent(evt);
            }}
            className="w-full py-4 bg-slate-900 dark:bg-slate-800 text-white rounded-full font-bold hover:scale-[1.02] active:scale-95 transition-all shadow-md text-sm mt-2 border-none cursor-pointer"
          >
            Quero entregar
          </button>
        </motion.div>
      </div>
      </>
      )}

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
