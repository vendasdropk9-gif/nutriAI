import React, { useState, useMemo, useRef } from 'react';
import { MealPlan } from '../types';
import { 
  CheckCircle2, 
  Circle, 
  ShoppingBag, 
  Sparkles, 
  TrendingDown, 
  Store, 
  ArrowLeftRight, 
  Percent, 
  Plus, 
  Trash2, 
  Volume2, 
  Search, 
  Heart, 
  ShoppingCart, 
  Info, 
  Check,
  Copy, 
  ChevronDown, 
  ChevronUp, 
  AlertCircle,
  HelpCircle,
  MapPin,
  Navigation,
  Compass,
  Star,
  ExternalLink,
  ShieldCheck,
  DollarSign,
  Clock,
  Mic,
  MicOff
} from 'lucide-react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { motion, AnimatePresence } from 'motion/react';
import { speak, stopSpeech } from '../lib/speech';
import { playSfx, vibrate } from '../lib/sensory';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface ShoppingListViewProps {
  mealPlan: MealPlan;
}

// 1. Partner Active Promotions Mock Data
const PARTNER_PROMOTIONS = [
  {
    id: 'promo-1',
    name: 'Morango Orgânico',
    originalPrice: 12.90,
    promoPrice: 9.90,
    unit: 'bandeja',
    storeName: 'Sacolão Vida Verde',
    storeId: 'm1',
    discount: '23% OFF',
    description: 'Morangos fresquinhos, colhidos de forma 100% orgânica. Perfeitos para lanches saudáveis e ricos em antioxidantes.',
    image: 'https://images.unsplash.com/photo-1464965911861-746a04b4bca6?auto=format&fit=crop&q=80&w=300&h=300',
    category: 'Frutas',
    voiceIntro: 'O Sacolão Vida Verde está com promoção de morango orgânico de doze e noventa por apenas nove e noventa a bandeja!'
  },
  {
    id: 'promo-2',
    name: 'Brócolis Ninja Orgânico',
    originalPrice: 8.90,
    promoPrice: 6.50,
    unit: 'unid',
    storeName: 'Hortifruti Premium',
    storeId: 'm2',
    discount: '27% OFF',
    description: 'Brócolis super fresco, ideal para cozimento no vapor ou refogados saudáveis ricos em ferro.',
    image: 'https://images.unsplash.com/photo-1584270354949-c26b0d5b4a0c?auto=format&fit=crop&q=80&w=300&h=300',
    category: 'Verduras',
    voiceIntro: 'O Hortifruti Premium traz o brócolis ninja orgânico fresquinho com vinte e sete por cento de desconto, saindo por seis e cinquenta a unidade!'
  },
  {
    id: 'promo-3',
    name: 'Abóbora Cabotiá Fresca',
    originalPrice: 4.20,
    promoPrice: 2.90,
    unit: 'kg',
    storeName: 'Sacolão Vida Verde',
    storeId: 'm1',
    discount: '30% OFF',
    description: 'Abóbora extremamente saborosa e cremosa, perfeita para caldos detox e acompanhamentos fitness.',
    image: 'https://images.unsplash.com/photo-1570586437263-ab629fccc818?auto=format&fit=crop&q=80&w=300&h=300',
    category: 'Legumes',
    voiceIntro: 'Abóbora Cabotiá na promoção no Sacolão Vida Verde por apenas dois e noventa o quilo. Economia de trinta por cento!'
  },
  {
    id: 'promo-4',
    name: 'Kit Salada Prática',
    originalPrice: 19.90,
    promoPrice: 15.90,
    unit: 'unid',
    storeName: 'Hortifruti Premium',
    storeId: 'm2',
    discount: '20% OFF',
    description: 'Mix selecionado de alface crespa, rúcula e couve higienizadas. Pronta para o consumo imediato com molho leve.',
    image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&q=80&w=300&h=300',
    category: 'Kits',
    voiceIntro: 'Facilite seu dia com o Kit Salada Prática no Hortifruti Premium, saindo por quinze e noventa. Já vem limpa!'
  }
];

// Price Comparator Geolocation constants and helpers
const DEFAULT_CENTER: [number, number] = [-23.5505, -46.6333]; // São Paulo Center

const PRESET_LOCATIONS = [
  { name: 'São Paulo (Centro/Paulista)', coords: [-23.5505, -46.6333] as [number, number] },
  { name: 'Rio de Janeiro (Copacabana)', coords: [-22.9711, -43.1886] as [number, number] },
  { name: 'Belo Horizonte (Savassi)', coords: [-19.9386, -43.9339] as [number, number] },
  { name: 'Curitiba (Batel)', coords: [-25.4421, -49.2797] as [number, number] },
  { name: 'Salvador (Barra)', coords: [-13.0038, -38.5323] as [number, number] }
];

const SUPERMARKETS_TEMPLATES = [
  {
    id: 'm-vv',
    name: 'Sacolão Vida Verde',
    priceIndex: 1.0,
    rating: 4.8,
    latOffset: 0.003,
    lngOffset: -0.004,
    deliveryTime: '15-25 min',
    logo: '🥬',
    color: '#10b981', // emerald
    addressTemplate: 'Rua das Margaridas, 342'
  },
  {
    id: 'm-hp',
    name: 'Hortifruti Premium',
    priceIndex: 1.2,
    rating: 4.9,
    latOffset: -0.005,
    lngOffset: 0.006,
    deliveryTime: '20-30 min',
    logo: '🍊',
    color: '#ec4899', // pink
    addressTemplate: 'Alameda Lorena, 1150'
  },
  {
    id: 'm-sa',
    name: 'Supermercado Alvorada',
    priceIndex: 0.92,
    rating: 4.3,
    latOffset: 0.007,
    lngOffset: 0.002,
    deliveryTime: '30-45 min',
    logo: '🛒',
    color: '#3b82f6', // blue
    addressTemplate: 'Avenida Principal, 890'
  },
  {
    id: 'm-mo',
    name: 'Mercado Organique',
    priceIndex: 1.4,
    rating: 4.7,
    latOffset: -0.002,
    lngOffset: -0.006,
    deliveryTime: '25-35 min',
    logo: '🥑',
    color: '#8b5cf6', // purple
    addressTemplate: 'Rua Bela Cintra, 2040'
  },
  {
    id: 'm-sep',
    name: 'Sacolão Economia Popular',
    priceIndex: 0.84,
    rating: 4.1,
    latOffset: -0.006,
    lngOffset: -0.003,
    deliveryTime: '35-50 min',
    logo: '💰',
    color: '#f59e0b', // amber
    addressTemplate: 'Praça da República, 12'
  }
];

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // distance in km
}

function ChangeView({ center }: { center: [number, number] }) {
  const map = useMap();
  React.useEffect(() => {
    map.setView(center, 15);
  }, [center, map]);
  return null;
}

function createMarketIcon(logo: string, color: string, isSelected: boolean) {
  const size = isSelected ? 48 : 38;
  const border = isSelected ? '4px solid #fff' : '2.2px solid #fff';
  const shadow = isSelected ? 'box-shadow: 0 0 15px rgba(16, 185, 129, 0.7); z-index: 1000;' : 'box-shadow: 0 4px 6px rgba(0,0,0,0.1);';
  
  return L.divIcon({
    className: 'custom-market-icon',
    html: `<div style="background-color: ${color}; border: ${border}; border-radius: 50%; width: ${size}px; height: ${size}px; display: flex; align-items: center; justify-content: center; font-size: ${isSelected ? '22px' : '17px'}; ${shadow} transition: all 0.2s ease; cursor: pointer;">
      ${logo}
    </div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
  });
}

function getSupermarketItemPrice(itemName: string, marketPriceIndex: number, marketId: string): number {
  const n = itemName.toLowerCase();
  const presets: Record<string, { base: number }> = {
    'morango': { base: 11.40 },
    'banana': { base: 5.20 },
    'brócolis': { base: 7.70 },
    'abóbora': { base: 3.35 },
    'kit salada': { base: 17.90 },
    'salada': { base: 17.90 },
    'frango': { base: 18.20 },
    'peito de frango': { base: 18.20 },
    'ovo': { base: 14.90 },
    'ovos': { base: 14.90 },
    'aveia': { base: 5.00 },
    'iogurte': { base: 3.30 },
    'espinafre': { base: 4.20 },
    'alface': { base: 3.30 },
    'cenoura': { base: 5.00 },
    'tomate': { base: 7.40 },
    'chia': { base: 10.15 },
    'azeite': { base: 29.20 },
  };

  let basePrice = 4.20;
  const matchedKey = Object.keys(presets).find(k => n.includes(k));
  if (matchedKey) {
    basePrice = presets[matchedKey].base;
  } else {
    for (let i = 0; i < itemName.length; i++) {
      basePrice += (itemName.charCodeAt(i) % 8) * 0.55;
    }
    basePrice = Number((basePrice % 16 + 3.20).toFixed(2));
  }

  let finalPrice = basePrice * marketPriceIndex;
  const variation = ((marketId.length + itemName.length) % 10 - 5) * 0.05;
  finalPrice = Math.max(1.50, Number((finalPrice + variation).toFixed(2)));

  return finalPrice;
}

// Helper to categorize ingredients
function categorizeIngredient(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('morango') || n.includes('banana') || n.includes('laranja') || n.includes('maçã') || n.includes('melancia') || n.includes('uva') || n.includes('abacaxi') || n.includes('limão') || n.includes('fruta') || n.includes('abacate') || n.includes('mamão') || n.includes('pera') || n.includes('pêra') || n.includes('pêssego') || n.includes('kiwi') || n.includes('manga') || n.includes('melão') || n.includes('ameixa')) {
    return 'Frutas';
  }
  if (n.includes('folha') || n.includes('alface') || n.includes('espinafre') || n.includes('rúcula') || n.includes('agrião') || n.includes('acelga') || n.includes('couve') || n.includes('repolho') || n.includes('salsa') || n.includes('coentro') || n.includes('cebolinha') || n.includes('hortelã') || n.includes('manjericão') || n.includes('temper')) {
    return 'Verduras';
  }
  if (n.includes('brócolis') || n.includes('abóbora') || n.includes('tomate') || n.includes('cenoura') || n.includes('abobrinha') || n.includes('chuchu') || n.includes('berinjela') || n.includes('batata') || n.includes('beterraba') || n.includes('cebola') || n.includes('alho') || n.includes('pimentão') || n.includes('pepino') || n.includes('vagem') || n.includes('milho') || n.includes('legume') || n.includes('cogumelo') || n.includes('funghi')) {
    return 'Legumes';
  }
  if (n.includes('ovo') || n.includes('frango') || n.includes('carne') || n.includes('peixe') || n.includes('atum') || n.includes('sardinha') || n.includes('filé') || n.includes('bife') || n.includes('peito de frango') || n.includes('peru') || n.includes('lombo') || n.includes('tofu') || n.includes('whey') || n.includes('proteína') || n.includes('salmão') || n.includes('tilápia')) {
    return 'Proteínas';
  }
  if (n.includes('aveia') || n.includes('arroz') || n.includes('chia') || n.includes('quinoa') || n.includes('linhaça') || n.includes('feijão') || n.includes('grão') || n.includes('lentilha') || n.includes('grão de bico') || n.includes('granola') || n.includes('castanha') || n.includes('amêndoa') || n.includes('nozes') || n.includes('amendoim') || n.includes('cereal') || n.includes('pão integral') || n.includes('massa integral') || n.includes('fibra') || n.includes('semente')) {
    return 'Grãos, Cereais & Sementes';
  }
  return 'Outros';
}

// Helper to estimate prices per item for comparison
function getProductPrice(name: string, store: 'vida_verde' | 'hortifruti_premium'): { price: number; unit: string } {
  const n = name.toLowerCase();
  
  const presets: Record<string, { vv: number; hp: number; unit: string }> = {
    'morango': { vv: 12.90, hp: 9.90, unit: 'bandeja' }, // Morango is currently on promo at HP in this mock!
    'banana': { vv: 5.50, hp: 4.90, unit: 'kg' },
    'brócolis': { vv: 8.90, hp: 6.50, unit: 'unid' }, // Promo at HP
    'abóbora': { vv: 2.90, hp: 3.80, unit: 'kg' },  // Promo at VV
    'kit salada': { vv: 19.90, hp: 15.90, unit: 'unid' }, // Promo at HP
    'salada': { vv: 19.90, hp: 15.90, unit: 'unid' },
    'frango': { vv: 18.90, hp: 17.50, unit: 'kg' },
    'peito de frango': { vv: 18.90, hp: 17.50, unit: 'kg' },
    'ovo': { vv: 15.90, hp: 14.50, unit: 'dúzia' },
    'ovos': { vv: 15.90, hp: 14.50, unit: 'dúzia' },
    'aveia': { vv: 4.95, hp: 5.20, unit: 'pacote' },
    'iogurte': { vv: 3.50, hp: 3.20, unit: 'unid' },
    'espinafre': { vv: 4.50, hp: 3.90, unit: 'maço' },
    'alface': { vv: 3.50, hp: 3.20, unit: 'unid' },
    'cenoura': { vv: 5.20, hp: 4.80, unit: 'kg' },
    'tomate': { vv: 7.90, hp: 6.90, unit: 'kg' },
    'chia': { vv: 9.80, hp: 10.50, unit: 'pacote' },
    'azeite': { vv: 29.90, hp: 28.50, unit: 'garrafa' },
  };

  const matchedKey = Object.keys(presets).find(k => n.includes(k));
  if (matchedKey) {
    const val = presets[matchedKey];
    return {
      price: store === 'vida_verde' ? val.vv : val.hp,
      unit: val.unit
    };
  }

  // Consistent deterministic price generator based on character codes
  let basePrice = 4.20;
  for (let i = 0; i < name.length; i++) {
    basePrice += (name.charCodeAt(i) % 8) * 0.55;
  }
  basePrice = Number((basePrice % 16 + 3.20).toFixed(2));

  if (store === 'vida_verde') {
    return { price: basePrice, unit: 'unid/kg' };
  } else {
    const diff = (name.length % 3 === 0) ? -0.60 : (name.length % 2 === 0) ? 0.40 : -0.20;
    const finalPrice = Math.max(1.80, Number((basePrice + diff).toFixed(2)));
    return { price: finalPrice, unit: 'unid/kg' };
  }
}

export function ShoppingListView({ mealPlan }: ShoppingListViewProps) {
  const [activeTab, setActiveTab] = useState<'list' | 'compare' | 'promos'>('list');
  const [checkedItems, setCheckedItems] = useLocalStorage<Record<string, boolean>>('nutri-shopping-checked', {});
  const [customItems, setCustomItems] = useLocalStorage<{ name: string; checked: boolean }[]>('nutri-shopping-custom-items', []);
  const [newCustomName, setNewCustomName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});
  const [speakingPromoId, setSpeakingPromoId] = useState<string | null>(null);

  // Geolocation and suggested markets states
  const [userCoords, setUserCoords] = useState<[number, number]>(DEFAULT_CENTER);
  const [isLocating, setIsLocating] = useState(false);
  const [locationSource, setLocationSource] = useState<'default' | 'gps' | 'preset'>('default');
  const [locationName, setLocationName] = useState('São Paulo, SP (Padrão)');
  const [selectedMarketId, setSelectedMarketId] = useState<string>('m-vv');

  // Voice Recognition states
  const [isListening, setIsListening] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  // Parse mealPlan ingredients
  const mealPlanIngredients = useMemo(() => {
    const items = new Set<string>();
    if (mealPlan) {
      Object.values(mealPlan).forEach(day => {
        if (day.meals) {
          Object.values(day.meals).forEach(recipe => {
            if (recipe && recipe.ingredients) {
              recipe.ingredients.forEach(ing => {
                // Sanitize strings a little bit (e.g. "300g de peito de frango" -> extract main food)
                let cleaned = ing.replace(/^\d+[\w]*\s*(de)?\s*/i, '').trim();
                cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
                if (cleaned.length > 2) {
                  items.add(cleaned);
                }
              });
            }
          });
        }
      });
    }
    return Array.from(items);
  }, [mealPlan]);

  // Combine mealPlan ingredients and customItems
  const allListItems = useMemo(() => {
    const list = mealPlanIngredients.map(name => ({
      name,
      checked: !!checkedItems[name],
      isCustom: false
    }));

    const customs = customItems.map(item => ({
      name: item.name,
      checked: item.checked,
      isCustom: true
    }));

    // Deduplicate between custom and meal plan
    const finalItems = [...list];
    customs.forEach(c => {
      if (!finalItems.some(f => f.name.toLowerCase() === c.name.toLowerCase())) {
        finalItems.push(c);
      }
    });

    return finalItems;
  }, [mealPlanIngredients, checkedItems, customItems]);

  // Group items by category
  const groupedItems = useMemo(() => {
    const groups: Record<string, typeof allListItems> = {};
    
    const filtered = allListItems.filter(item => 
      item.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    filtered.forEach(item => {
      const cat = categorizeIngredient(item.name);
      if (!groups[cat]) {
        groups[cat] = [];
      }
      groups[cat].push(item);
    });

    return groups;
  }, [allListItems, searchQuery]);

  // Progress calculations
  const totalCount = allListItems.length;
  const completedCount = allListItems.filter(i => i.checked).length;
  const progressPercent = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);

  // Toggle item check state
  const toggleItem = (name: string, isCustom: boolean) => {
    vibrate(10);
    playSfx('tap');
    if (isCustom) {
      setCustomItems(prev => prev.map(item => 
        item.name === name ? { ...item, checked: !item.checked } : item
      ));
    } else {
      setCheckedItems(prev => ({
        ...prev,
        [name]: !prev[name]
      }));
    }
  };

  // Add custom healthy item
  const handleAddCustom = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newCustomName.trim()) return;

    vibrate(15);
    playSfx('pop');
    
    const capitalized = newCustomName.trim().charAt(0).toUpperCase() + newCustomName.trim().slice(1);
    
    // Check if duplicate
    if (allListItems.some(i => i.name.toLowerCase() === capitalized.toLowerCase())) {
      setNewCustomName('');
      return;
    }

    setCustomItems(prev => [...prev, { name: capitalized, checked: false }]);
    setNewCustomName('');
  };

  // Remove custom item
  const handleRemoveCustom = (name: string) => {
    vibrate(10);
    playSfx('scratch');
    setCustomItems(prev => prev.filter(i => i.name !== name));
  };

  // Clear all items / reset
  const handleClearAll = () => {
    vibrate(20);
    playSfx('scratch');
    setCheckedItems({});
    setCustomItems([]);
  };

  // Voice Recognition handlers
  const startVoiceListening = () => {
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      alert("Reconhecimento de voz não é suportado pelo seu navegador.");
      return;
    }

    vibrate(15);
    playSfx('tap');
    setVoiceError(null);

    try {
      const rec = new SpeechRecognitionAPI();
      rec.lang = 'pt-BR';
      rec.continuous = false;
      rec.interimResults = false;

      rec.onstart = () => {
        setIsListening(true);
      };

      rec.onresult = (event: any) => {
        const resultIndex = event.resultIndex;
        const transcript = event.results[resultIndex][0].transcript;
        if (transcript && transcript.trim()) {
          processDictatedItems(transcript);
        }
      };

      rec.onerror = (event: any) => {
        console.warn("Erro no reconhecimento de voz:", event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          setVoiceError("Permissão de microfone negada.");
          alert("Permissão de acesso ao microfone negada. Ative nas configurações do navegador.");
        } else {
          setVoiceError(`Erro: ${event.error}`);
        }
      };

      rec.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = rec;
      rec.start();
    } catch (err) {
      console.warn(err);
      setIsListening(false);
      setVoiceError("Falha ao iniciar microfone.");
    }
  };

  const stopVoiceListening = () => {
    vibrate(10);
    playSfx('scratch');
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.warn(e);
      }
    }
    setIsListening(false);
  };

  const processDictatedItems = (text: string) => {
    // Splits text into multiple items
    // Replace " e " with a comma, " ou " with a comma, " e/ou " with a comma
    let cleanedText = text
      .replace(/\s+e\s+/gi, ',')
      .replace(/\s+ou\s+/gi, ',')
      .replace(/\s+e\/ou\s+/gi, ',');
      
    const items = cleanedText.split(',').map(item => item.trim()).filter(Boolean);
    
    if (items.length === 0) return;

    vibrate(30);
    playSfx('crystal');

    const addedNames: string[] = [];
    setCustomItems(prev => {
      const updated = [...prev];
      items.forEach(rawItem => {
        const capitalized = rawItem.charAt(0).toUpperCase() + rawItem.slice(1);
        const alreadyExists = allListItems.some(existing => existing.name.toLowerCase() === capitalized.toLowerCase()) ||
                              updated.some(existing => existing.name.toLowerCase() === capitalized.toLowerCase());
        
        if (!alreadyExists) {
          updated.push({ name: capitalized, checked: false });
          addedNames.push(capitalized);
        }
      });
      return updated;
    });

    if (addedNames.length > 0) {
      alert(`Adicionado por voz: ${addedNames.join(', ')}`);
    } else {
      alert("Nenhum item novo detectado ou os itens já existem na lista.");
    }
  };

  // Dynamic suggestions block based on list content
  const smartRecommendation = useMemo(() => {
    const listLower = allListItems.map(i => i.name.toLowerCase());
    const hasFruit = listLower.some(n => n.includes('banana') || n.includes('morango') || n.includes('maçã') || n.includes('uva') || n.includes('laranja'));
    const hasYogurt = listLower.some(n => n.includes('iogurte') || n.includes('leite') || n.includes('coalhada'));
    const hasSalad = listLower.some(n => n.includes('alface') || n.includes('folha') || n.includes('rúcula') || n.includes('espinafre') || n.includes('tomate') || n.includes('pepino'));
    const hasMeat = listLower.some(n => n.includes('frango') || n.includes('carne') || n.includes('peixe') || n.includes('bife'));

    if (hasFruit || hasYogurt) {
      return {
        text: 'Sugerimos adicionar Aveia em Flocos Orgânica e Sementes de Chia para complementar suas fibras e dar mais saciedade nas refeições com frutas ou iogurte!',
        itemsToAdd: ['Aveia em Flocos Orgânica', 'Sementes de Chia'],
        reason: 'Saciedade & Fibras 🌾'
      };
    }
    if (hasSalad || hasMeat) {
      return {
        text: 'Detectamos preparos de vegetais ou proteínas. Sugerimos adicionar Azeite de Oliva Extra Virgem para temperos mais saudáveis e gorduras benéficas para o coração.',
        itemsToAdd: ['Azeite de Oliva Extra Virgem'],
        reason: 'Gorduras Saudáveis 🫒'
      };
    }
    return {
      text: 'Recomendamos adicionar Ovos Caipiras Orgânicos à sua lista! É a melhor fonte proteica limpa e versátil para complementar qualquer dieta fitness.',
      itemsToAdd: ['Ovos Caipiras Orgânicos'],
      reason: 'Proteína Coringa 🥚'
    };
  }, [allListItems]);

  const handleAddSuggestedItems = (items: string[]) => {
    vibrate(15);
    playSfx('crystal');
    const toAdd = items.filter(item => 
      !allListItems.some(existing => existing.name.toLowerCase() === item.toLowerCase())
    );
    if (toAdd.length > 0) {
      setCustomItems(prev => [
        ...prev, 
        ...toAdd.map(name => ({ name, checked: false }))
      ]);
    }
  };

  // Comparisons Store Basket Math
  const comparisonResults = useMemo(() => {
    let vvTotal = 0;
    let hpTotal = 0;
    
    const itemsPriceList = allListItems.map(item => {
      const priceVV = getProductPrice(item.name, 'vida_verde');
      const priceHP = getProductPrice(item.name, 'hortifruti_premium');
      
      vvTotal += priceVV.price;
      hpTotal += priceHP.price;

      return {
        name: item.name,
        priceVV: priceVV.price,
        unitVV: priceVV.unit,
        priceHP: priceHP.price,
        unitHP: priceHP.unit,
        cheaper: priceVV.price < priceHP.price ? 'vida_verde' : priceVV.price > priceHP.price ? 'hortifruti_premium' : 'tie'
      };
    });

    const isVVCheaper = vvTotal < hpTotal;
    const savings = Math.abs(vvTotal - hpTotal);

    return {
      itemsPriceList,
      vvTotal,
      hpTotal,
      winner: isVVCheaper ? 'Sacolão Vida Verde' : 'Hortifruti Premium',
      savings: savings.toFixed(2),
      isVVCheaper
    };
  }, [allListItems]);

  // Dynamic suggestedMarkets memo incorporating user geolocation
  const suggestedMarkets = useMemo(() => {
    const [userLat, userLng] = userCoords;
    const computed = SUPERMARKETS_TEMPLATES.map(tpl => {
      const marketLat = userLat + tpl.latOffset;
      const marketLng = userLng + tpl.lngOffset;
      const distanceNum = calculateDistance(userLat, userLng, marketLat, marketLng);
      
      let totalPrice = 0;
      const items = allListItems.map(item => {
        const price = getSupermarketItemPrice(item.name, tpl.priceIndex, tpl.id);
        totalPrice += price;
        return {
          name: item.name,
          price,
          checked: item.checked
        };
      });

      return {
        ...tpl,
        coordinates: { lat: marketLat, lng: marketLng },
        distanceNum,
        distance: distanceNum.toFixed(2),
        totalPrice,
        items,
        address: tpl.addressTemplate
      };
    });

    // Find winners
    let cheapest = computed[0];
    let closest = computed[0];
    
    computed.forEach(m => {
      if (m.totalPrice < cheapest.totalPrice) cheapest = m;
      if (m.distanceNum < closest.distanceNum) closest = m;
    });

    // Best value (balanced price vs distance score)
    const avgPrice = computed.reduce((sum, m) => sum + m.totalPrice, 0) / computed.length;
    const avgDist = computed.reduce((sum, m) => sum + m.distanceNum, 0) / computed.length;
    
    let bestValue = computed[0];
    let bestScore = Infinity;
    
    computed.forEach(m => {
      const priceScore = m.totalPrice / (avgPrice || 1);
      const distScore = m.distanceNum / (avgDist || 1);
      const score = priceScore * 0.65 + distScore * 0.35;
      if (score < bestScore) {
        bestScore = score;
        bestValue = m;
      }
    });

    return {
      markets: computed,
      cheapest,
      closest,
      bestValue
    };
  }, [userCoords, allListItems]);

  const activeMarket = useMemo(() => {
    return suggestedMarkets.markets.find(m => m.id === selectedMarketId) || suggestedMarkets.markets[0];
  }, [suggestedMarkets, selectedMarketId]);

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocalização não é suportada por este navegador.");
      return;
    }
    setIsLocating(true);
    vibrate(10);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setUserCoords([lat, lng]);
        setLocationSource('gps');
        setLocationName('Minha Localização (GPS)');
        setIsLocating(false);
        vibrate(30);
        playSfx('success');
      },
      (err) => {
        console.warn(err);
        setIsLocating(false);
        alert("Não foi possível acessar seu GPS (pode estar bloqueado pelo navegador). Escolha uma das regiões predefinidas!");
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleSelectPreset = (preset: typeof PRESET_LOCATIONS[0]) => {
    vibrate(10);
    playSfx('tap');
    setUserCoords(preset.coords);
    setLocationSource('preset');
    setLocationName(preset.name);
  };

  // Audio Promotion announcer
  const handleHearPromo = async (promo: typeof PARTNER_PROMOTIONS[0]) => {
    if (speakingPromoId === promo.id) {
      stopSpeech();
      setSpeakingPromoId(null);
      return;
    }
    vibrate(10);
    setSpeakingPromoId(promo.id);
    await speak(promo.voiceIntro, {
      onEnded: () => setSpeakingPromoId(null),
      onError: () => setSpeakingPromoId(null)
    });
  };

  const toggleCategoryCollapse = (cat: string) => {
    setCollapsedCategories(prev => ({
      ...prev,
      [cat]: !prev[cat]
    }));
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      
      {/* Header Banner */}
      <div className="w-full bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-700 text-white p-8 rounded-[36px] shadow-lg relative overflow-hidden">
        <div className="absolute right-0 bottom-0 translate-y-8 translate-x-8 opacity-10">
          <ShoppingBag className="w-48 h-48" />
        </div>
        <div className="relative z-10 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 rounded-full text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 animate-pulse text-amber-300" />
            Inteligência de Compras
          </div>
          <h2 className="text-3xl md:text-4xl font-serif font-black tracking-tight leading-tight">
            Economize e Coma Bem
          </h2>
          <p className="text-sm text-emerald-50 max-w-xl font-medium leading-relaxed">
            Organize sua lista baseada no seu plano de nutrição diário, compare preços em tempo real entre estabelecimentos cadastrados e confira ofertas exclusivas de parceiros.
          </p>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex overflow-x-auto hide-scrollbar bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-[24px] shadow-inner gap-1">
        {[
          { id: 'list', label: 'Lista Inteligente', icon: <CheckCircle2 className="w-4 h-4" /> },
          { id: 'compare', label: 'Comparar Preços', icon: <ArrowLeftRight className="w-4 h-4" /> },
          { id: 'promos', label: 'Promoções de Parceiros', icon: <Percent className="w-4 h-4" /> }
        ].map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                vibrate(5);
                playSfx('tap');
                setActiveTab(tab.id as any);
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-xs md:text-sm font-extrabold transition-all outline-none border-none cursor-pointer ${
                active 
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-md scale-[1.01]' 
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
            </button>
          );
        })}
      </div>

      {/* SEARCH AND ACTIONS CONTROLS */}
      {activeTab !== 'promos' && totalCount > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          <div className="md:col-span-8 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Pesquisar ingredientes..."
              className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white transition-all shadow-sm"
            />
          </div>
          <div className="md:col-span-4 flex flex-col sm:flex-row justify-end gap-2">
            <button
              onClick={() => {
                vibrate(10);
                playSfx('tap');
                let exportText = "🛒 *Minha Lista de Compras - NutriAI*\n\n";
                Object.entries(groupedItems).forEach(([cat, items]) => {
                  if (items.length > 0) {
                    exportText += `📦 *${cat}*\n`;
                    items.forEach(item => {
                      exportText += `- [${item.checked ? 'x' : ' '}] ${item.name}\n`;
                    });
                    exportText += "\n";
                  }
                });
                navigator.clipboard.writeText(exportText)
                  .then(() => alert("Lista copiada para a área de transferência!"))
                  .catch(() => alert("Erro ao copiar a lista."));
              }}
              className="px-4 py-3 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-2xl border border-slate-200 dark:border-slate-800 transition-all cursor-pointer inline-flex items-center gap-1 w-full sm:w-auto justify-center"
            >
              <Copy className="w-3.5 h-3.5" /> Copiar Lista
            </button>
            <button
              onClick={handleClearAll}
              className="px-4 py-3 text-xs font-bold text-rose-500 hover:text-white hover:bg-rose-500 rounded-2xl border border-rose-200 dark:border-rose-950 transition-all cursor-pointer inline-flex items-center gap-1 w-full sm:w-auto justify-center"
            >
              <Trash2 className="w-3.5 h-3.5" /> Limpar
            </button>
          </div>
        </div>
      )}

      {/* MAIN VIEWPORT PANELS */}
      <div className="min-h-[300px]">
        {/* LIST EMPTY FALLBACK */}
        {totalCount === 0 && activeTab !== 'promos' && (
          <div className="text-center py-16 bg-white dark:bg-slate-900/40 rounded-[32px] border border-slate-100 dark:border-slate-800/80 p-8 space-y-4">
            <ShoppingBag className="w-16 h-16 mx-auto text-slate-300 dark:text-slate-700" />
            <h3 className="font-serif text-2xl font-bold text-slate-700 dark:text-slate-300">Sua Lista Está Vazia</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm max-w-md mx-auto leading-relaxed">
              Adicione receitas no plano alimentar semanal para povoar sua lista de ingredientes de forma automática, ou adicione itens saudáveis avulsos abaixo!
            </p>
            
            <div className="max-w-md mx-auto pt-4">
              <form onSubmit={handleAddCustom} className="flex gap-2">
                <input
                  type="text"
                  value={newCustomName}
                  onChange={(e) => setNewCustomName(e.target.value)}
                  placeholder="Ex: Peito de Frango, Banana, Aveia..."
                  className="flex-1 min-w-0 px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  type="button"
                  onClick={isListening ? stopVoiceListening : startVoiceListening}
                  className={`p-3 rounded-2xl transition-all cursor-pointer flex items-center justify-center shrink-0 border-none ${
                    isListening 
                      ? 'bg-rose-500 hover:bg-rose-600 text-white animate-pulse' 
                      : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-600 dark:bg-indigo-950/30 dark:hover:bg-indigo-900/40 dark:text-indigo-400'
                  }`}
                  title="Ditar itens para a lista"
                >
                  {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>
                <button
                  type="submit"
                  className="px-4 py-3 sm:px-6 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-bold text-xs shrink-0 flex items-center gap-1.5 transition-all outline-none"
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">Adicionar</span>
                </button>
              </form>
              {isListening && (
                <div className="mt-2 text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-2 justify-center font-bold animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-ping" />
                  Ouvindo... Dite um ou mais itens (Ex: "banana, maçã e aveia")
                </div>
              )}
              {voiceError && (
                <div className="mt-2 text-xs text-rose-500 flex items-center gap-1 justify-center font-bold">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {voiceError}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 1: LISTA INTELIGENTE */}
        {activeTab === 'list' && totalCount > 0 && (
          <div className="space-y-6">
            
            {/* Progress Card */}
            <div className="bg-white dark:bg-slate-900/60 rounded-[32px] p-6 shadow-sm border border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="space-y-1 text-center sm:text-left">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Seu Progresso de Compras</p>
                <h4 className="font-serif text-2xl font-black text-slate-800 dark:text-white">
                  {completedCount} de {totalCount} itens adquiridos
                </h4>
              </div>
              <div className="flex items-center gap-4 w-full sm:w-auto">
                <div className="flex-1 sm:w-40 bg-slate-100 dark:bg-slate-800 rounded-full h-3 overflow-hidden">
                  <div 
                    className="bg-emerald-500 h-full transition-all duration-700 ease-out" 
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <span className="font-mono font-black text-xl text-emerald-600 dark:text-emerald-400">{progressPercent}%</span>
              </div>
            </div>

            {/* Custom item quick adder */}
            <div className="bg-white dark:bg-slate-900/60 rounded-[32px] p-6 border border-slate-100 dark:border-slate-800/80 shadow-sm space-y-3">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block">Adicionar Novo Alimento Avulso</label>
              <form onSubmit={handleAddCustom} className="flex gap-2">
                <input
                  type="text"
                  value={newCustomName}
                  onChange={(e) => setNewCustomName(e.target.value)}
                  placeholder="Ex: Ovos, Abacate, Whey Protein..."
                  className="flex-1 min-w-0 px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  type="button"
                  onClick={isListening ? stopVoiceListening : startVoiceListening}
                  className={`p-3 rounded-2xl transition-all cursor-pointer flex items-center justify-center shrink-0 border-none ${
                    isListening 
                      ? 'bg-rose-500 hover:bg-rose-600 text-white animate-pulse' 
                      : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-600 dark:bg-indigo-950/30 dark:hover:bg-indigo-900/40 dark:text-indigo-400'
                  }`}
                  title="Ditar itens para a lista"
                >
                  {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>
                <button
                  type="submit"
                  className="px-4 py-3 sm:px-6 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-bold text-xs shrink-0 flex items-center gap-1.5 transition-all outline-none border-none"
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">Adicionar</span>
                </button>
              </form>
              {isListening && (
                <div className="mt-2 text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-2 justify-center font-bold animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-ping" />
                  Ouvindo... Dite um ou mais itens (Ex: "ovos, abacate e couve")
                </div>
              )}
              {voiceError && (
                <div className="mt-2 text-xs text-rose-500 flex items-center gap-1 justify-center font-bold">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {voiceError}
                </div>
              )}
            </div>

            {/* Categorized Ingredients Folders */}
            <div className="space-y-4">
              {Object.keys(groupedItems).sort().map(category => {
                const isCollapsed = collapsedCategories[category];
                const items = groupedItems[category];
                const checkedInCat = items.filter(i => i.checked).length;
                
                return (
                  <div 
                    key={category} 
                    className="bg-white dark:bg-slate-900/40 rounded-[28px] border border-slate-100 dark:border-slate-800/80 overflow-hidden shadow-sm transition-all"
                  >
                    {/* Folder Header */}
                    <button
                      onClick={() => toggleCategoryCollapse(category)}
                      className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-slate-800/20 text-left border-none outline-none cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold">
                          {category === 'Frutas' ? '🍎' : category === 'Verduras' ? '🥬' : category === 'Legumes' ? '🥕' : category === 'Proteínas' ? '🍗' : category === 'Grãos, Cereais & Sementes' ? '🌾' : '📦'}
                        </div>
                        <div>
                          <h4 className="font-serif font-bold text-slate-800 dark:text-white text-base leading-tight">{category}</h4>
                          <span className="text-[10px] text-slate-400 font-medium font-mono">{checkedInCat} de {items.length} concluídos</span>
                        </div>
                      </div>
                      
                      <div className="text-slate-400">
                        {isCollapsed ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
                      </div>
                    </button>

                    {/* Folder Items */}
                    <AnimatePresence initial={false}>
                      {!isCollapsed && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25 }}
                          className="border-t border-slate-100 dark:border-slate-800/60 overflow-hidden"
                        >
                          <ul className="divide-y divide-slate-100 dark:divide-slate-800/60">
                            {items.map((item, idx) => (
                              <li key={idx} className="group flex items-center justify-between px-6 py-3.5 hover:bg-slate-50/20 dark:hover:bg-slate-800/10 transition-colors">
                                <button
                                  onClick={() => toggleItem(item.name, item.isCustom)}
                                  className="flex-1 flex items-center gap-3 text-left border-none outline-none bg-transparent cursor-pointer"
                                >
                                  {item.checked ? (
                                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                                  ) : (
                                    <Circle className="w-5 h-5 text-slate-300 dark:text-slate-600 group-hover:text-emerald-400 shrink-0 transition-colors" />
                                  )}
                                  <span className={`text-sm font-semibold transition-all ${
                                    item.checked ? 'text-slate-400 line-through' : 'text-slate-700 dark:text-slate-200'
                                  }`}>
                                    {item.name}
                                  </span>
                                  {item.isCustom && (
                                    <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-400 text-[8px] rounded font-bold uppercase tracking-wider">Avulso</span>
                                  )}
                                </button>
                                
                                {item.isCustom && (
                                  <button
                                    onClick={() => handleRemoveCustom(item.name)}
                                    className="p-1 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer opacity-0 group-hover:opacity-100 focus:opacity-100 border-none bg-transparent outline-none"
                                    title="Excluir item"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </li>
                            ))}
                          </ul>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>

            {/* Smart recommendation block */}
            <div className="bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-900/30 rounded-[32px] p-6 space-y-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500/15 flex items-center justify-center text-emerald-500 shrink-0">
                  <Sparkles className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h5 className="font-bold text-slate-900 dark:text-white text-sm">IA Sugestão Nutricional Inteligente</h5>
                  <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded font-black uppercase tracking-wider">
                    {smartRecommendation.reason}
                  </span>
                </div>
              </div>
              
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                {smartRecommendation.text}
              </p>

              <div className="flex flex-wrap gap-2 pt-2">
                {smartRecommendation.itemsToAdd.map(item => {
                  const isAlreadyAdded = allListItems.some(existing => existing.name.toLowerCase() === item.toLowerCase());
                  return (
                    <button
                      key={item}
                      disabled={isAlreadyAdded}
                      onClick={() => handleAddSuggestedItems([item])}
                      className={`px-4 py-2 rounded-xl text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                        isAlreadyAdded 
                          ? 'bg-slate-100 text-slate-400 dark:bg-slate-800' 
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-500/10'
                      }`}
                    >
                      {isAlreadyAdded ? (
                        <>
                          <Check className="w-3.5 h-3.5" /> Adicionado
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5" /> Adicionar {item}
                        </>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

          </div>
        )}

        {/* TAB 2: COMPARADOR DE ESTABELECIMENTOS GEOLOCALIZADO */}
        {activeTab === 'compare' && totalCount > 0 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            
            {/* Geolocation Controls Card */}
            <div className="bg-white dark:bg-slate-900/60 rounded-[28px] p-6 shadow-sm border border-slate-100 dark:border-slate-800/80 space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Compass className="w-5 h-5 text-emerald-500 animate-spin" style={{ animationDuration: '6s' }} />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sua Localização de Busca</span>
                  </div>
                  <h4 className="font-serif text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-rose-500 shrink-0" />
                    {locationName}
                  </h4>
                  <p className="text-[10px] text-slate-400 font-medium">
                    Coordenadas: {userCoords[0].toFixed(4)}, {userCoords[1].toFixed(4)} • {locationSource === 'gps' ? 'Obtido via Satélite' : locationSource === 'preset' ? 'Região Selecionada' : 'Localização Padrão'}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={handleGetCurrentLocation}
                    disabled={isLocating}
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 dark:disabled:bg-slate-800 text-white disabled:text-slate-400 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all outline-none border-none cursor-pointer"
                  >
                    <Navigation className={`w-3.5 h-3.5 ${isLocating ? 'animate-bounce' : ''}`} />
                    {isLocating ? 'Obtendo GPS...' : 'Usar Meu GPS'}
                  </button>

                  <div className="relative group">
                    <select
                      onChange={(e) => {
                        const preset = PRESET_LOCATIONS.find(p => p.name === e.target.value);
                        if (preset) handleSelectPreset(preset);
                      }}
                      value={locationName}
                      className="px-4 py-2.5 bg-slate-100 dark:bg-slate-850 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-xs outline-none border-none cursor-pointer transition-all pr-8 appearance-none"
                    >
                      <option disabled value="">Alterar Região...</option>
                      {PRESET_LOCATIONS.map(p => (
                        <option key={p.name} value={p.name}>{p.name}</option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-3.5 pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>

            {/* Price/Distance Recommendation Badges */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Cheapest */}
              <div 
                onClick={() => {
                  vibrate(10);
                  setSelectedMarketId(suggestedMarkets.cheapest.id);
                }}
                className={`p-5 rounded-[24px] border cursor-pointer transition-all hover:scale-[1.02] ${
                  selectedMarketId === suggestedMarkets.cheapest.id 
                    ? 'border-emerald-500 bg-emerald-500/5 dark:bg-emerald-500/10' 
                    : 'border-slate-100 dark:border-slate-800/80 bg-white/40'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[9px] font-black uppercase text-emerald-600 dark:text-emerald-400 tracking-wider">💰 Mais Econômico</span>
                  <span className="text-xs">⭐ {suggestedMarkets.cheapest.rating}</span>
                </div>
                <h5 className="font-bold text-slate-800 dark:text-white text-sm truncate">{suggestedMarkets.cheapest.name}</h5>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">R$ {suggestedMarkets.cheapest.totalPrice.toFixed(2)}</span>
                  <span className="text-[10px] text-slate-400 font-mono font-bold">{suggestedMarkets.cheapest.distance} km</span>
                </div>
              </div>

              {/* Closest */}
              <div 
                onClick={() => {
                  vibrate(10);
                  setSelectedMarketId(suggestedMarkets.closest.id);
                }}
                className={`p-5 rounded-[24px] border cursor-pointer transition-all hover:scale-[1.02] ${
                  selectedMarketId === suggestedMarkets.closest.id 
                    ? 'border-blue-500 bg-blue-500/5 dark:bg-blue-500/10' 
                    : 'border-slate-100 dark:border-slate-800/80 bg-white/40'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[9px] font-black uppercase text-blue-600 dark:text-blue-400 tracking-wider">📍 Mais Próximo</span>
                  <span className="text-xs">⭐ {suggestedMarkets.closest.rating}</span>
                </div>
                <h5 className="font-bold text-slate-800 dark:text-white text-sm truncate">{suggestedMarkets.closest.name}</h5>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-lg font-black text-blue-600 dark:text-blue-400">R$ {suggestedMarkets.closest.totalPrice.toFixed(2)}</span>
                  <span className="text-[10px] text-slate-400 font-mono font-bold">{suggestedMarkets.closest.distance} km</span>
                </div>
              </div>

              {/* Best Value */}
              <div 
                onClick={() => {
                  vibrate(10);
                  setSelectedMarketId(suggestedMarkets.bestValue.id);
                }}
                className={`p-5 rounded-[24px] border cursor-pointer transition-all hover:scale-[1.02] ${
                  selectedMarketId === suggestedMarkets.bestValue.id 
                    ? 'border-purple-500 bg-purple-500/5 dark:bg-purple-500/10' 
                    : 'border-slate-100 dark:border-slate-800/80 bg-white/40'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[9px] font-black uppercase text-purple-600 dark:text-purple-400 tracking-wider">💎 Custo-Benefício</span>
                  <span className="text-xs">⭐ {suggestedMarkets.bestValue.rating}</span>
                </div>
                <h5 className="font-bold text-slate-800 dark:text-white text-sm truncate">{suggestedMarkets.bestValue.name}</h5>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-lg font-black text-purple-600 dark:text-purple-400">R$ {suggestedMarkets.bestValue.totalPrice.toFixed(2)}</span>
                  <span className="text-[10px] text-slate-400 font-mono font-bold">{suggestedMarkets.bestValue.distance} km</span>
                </div>
              </div>
            </div>

            {/* Map and Active Market Detail Column Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              
              {/* Interactive Leaflet Map Box */}
              <div className="lg:col-span-7 bg-white dark:bg-slate-900/60 rounded-[32px] p-4 shadow-sm border border-slate-100 dark:border-slate-800/80 overflow-hidden flex flex-col min-h-[380px] lg:min-h-[460px] relative z-0">
                <div className="flex items-center justify-between mb-3 px-2">
                  <div className="space-y-0.5">
                    <h5 className="font-bold text-slate-800 dark:text-white text-sm">Mapa de Mercados Próximos</h5>
                    <p className="text-[10px] text-slate-400 font-medium">Preços de sacolão geolocalizados em tempo real</p>
                  </div>
                  <Compass className="w-4 h-4 text-slate-400 shrink-0" />
                </div>
                
                <div className="flex-1 rounded-[24px] overflow-hidden relative border border-slate-100 dark:border-slate-800/80 h-[300px] lg:h-auto">
                  <MapContainer 
                    center={userCoords} 
                    zoom={15} 
                    zoomControl={true}
                    className="w-full h-full"
                    style={{ height: '100%', width: '100%' }}
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <ChangeView center={userCoords} />
                    
                    {suggestedMarkets.markets.map((store) => (
                      <Marker 
                        key={store.id}
                        position={[store.coordinates.lat, store.coordinates.lng]}
                        icon={createMarketIcon(store.logo, store.color, selectedMarketId === store.id)}
                        eventHandlers={{
                          click: () => {
                            vibrate(10);
                            setSelectedMarketId(store.id);
                          },
                        }}
                      />
                    ))}
                    
                    {/* User Location Pulsing Point */}
                    <Marker 
                      position={userCoords} 
                      icon={L.divIcon({
                        className: 'user-pulse-icon',
                        html: '<div style="background-color: #3b82f6; width: 15px; height: 15px; border: 3.5px solid white; border-radius: 50%; box-shadow: 0 0 12px #3b82f6;"></div>',
                        iconSize: [20, 20],
                        iconAnchor: [10, 10],
                      })}
                    />
                  </MapContainer>
                </div>
              </div>

              {/* Markets comparison sidebar */}
              <div className="lg:col-span-5 flex flex-col gap-4">
                <div className="bg-white dark:bg-slate-900/60 rounded-[32px] p-6 shadow-sm border border-slate-100 dark:border-slate-800/80 flex-1 flex flex-col justify-between">
                  
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full flex items-center justify-center text-2xl shadow-inner" style={{ backgroundColor: `${activeMarket.color}20` }}>
                          {activeMarket.logo}
                        </div>
                        <div>
                          <h4 className="font-serif text-lg font-black text-slate-800 dark:text-white">{activeMarket.name}</h4>
                          <p className="text-[10px] text-slate-400 font-semibold">{activeMarket.address}</p>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
                        {activeMarket.deliveryTime}
                      </span>
                    </div>

                    <div className="py-4 border-y border-slate-100 dark:border-slate-800/60 grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Preço da Cesta</span>
                        <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                          R$ {activeMarket.totalPrice.toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Distância</span>
                        <p className="text-xl font-black text-slate-700 dark:text-slate-300 mt-1">
                          {activeMarket.distance} km
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Avaliação & Informações</span>
                      <div className="flex items-center gap-4 text-xs font-semibold text-slate-600 dark:text-slate-300">
                        <div className="flex items-center gap-1">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          <span>{activeMarket.rating}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Parceiro Verificado</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 space-y-2">
                    <button
                      onClick={() => {
                        vibrate(15);
                        playSfx('crystal');
                        const marketTabBtn = document.getElementById('dashboard-tab-market') || document.querySelector('[data-id="market"]');
                        if (marketTabBtn instanceof HTMLElement) {
                          marketTabBtn.click();
                        }
                      }}
                      className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-2xl transition-all shadow-md shadow-emerald-500/10 flex items-center justify-center gap-2 outline-none border-none cursor-pointer"
                    >
                      <ShoppingCart className="w-4 h-4" />
                      Pedir pelo NutriMarket
                    </button>
                    <p className="text-[9px] text-center text-slate-400 font-semibold italic">
                      Economize combustível! Compre direto de casa com frete grátis via cupom "FITNESS".
                    </p>
                  </div>

                </div>
              </div>

            </div>

            {/* List side by side pricing table with Selected Market highlighted */}
            <div className="bg-white dark:bg-slate-900/40 rounded-[32px] border border-slate-100 dark:border-slate-800/80 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <div>
                  <h4 className="font-serif text-lg font-black text-slate-800 dark:text-white">Lista de Preços Detalhada: {activeMarket.name}</h4>
                  <p className="text-[10px] text-slate-400">Valores unitários simulados com base no índice regional e distância do GPS.</p>
                </div>
                <Info className="w-5 h-5 text-slate-400" />
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 dark:bg-slate-850 text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
                    <tr>
                      <th className="px-6 py-4">Ingrediente</th>
                      <th className="px-6 py-4 text-center">Categoria</th>
                      <th className="px-6 py-4 text-center">Preço Estimado</th>
                      <th className="px-6 py-4 text-center">Cesta Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-sm">
                    {activeMarket.items.map((item, i) => {
                      const avgOther = suggestedMarkets.markets
                        .filter(m => m.id !== activeMarket.id)
                        .reduce((sum, m) => sum + m.items[i].price, 0) / (suggestedMarkets.markets.length - 1);
                      const isCheaper = item.price < avgOther;

                      return (
                        <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-colors">
                          <td className="px-6 py-4">
                            <span className="font-bold text-slate-700 dark:text-slate-200 block">{item.name}</span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="text-[10px] font-bold text-slate-400 capitalize px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                              {categorizeIngredient(item.name)}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center font-bold text-slate-600 dark:text-slate-300">
                            R$ {item.price.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 text-center">
                            {isCheaper ? (
                              <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold px-2 py-0.5 rounded-full">
                                ✓ Economia de R$ {(avgOther - item.price).toFixed(2)}
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400 font-semibold">Preço Padrão</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* TAB 3: PROMOÇÕES ATIVAS DE PARCEIROS */}
        {activeTab === 'promos' && (
          <div className="space-y-6">
            
            {/* Promo Intro */}
            <div className="text-center space-y-2 max-w-xl mx-auto py-2">
              <h3 className="font-serif text-2xl font-black text-slate-800 dark:text-white">Alimentos Saudáveis com Descontos Reais</h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 leading-relaxed">
                Nossos parceiros locais Sacolão Vida Verde e Hortifruti Premium oferecem descontos em alimentos frescos diariamente. Adicione diretamente à sua lista com um toque.
              </p>
            </div>

            {/* Promos Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {PARTNER_PROMOTIONS.map((promo) => {
                const isAlreadyInList = allListItems.some(item => item.name.toLowerCase() === promo.name.toLowerCase());
                const isSpeaking = speakingPromoId === promo.id;

                return (
                  <div 
                    key={promo.id}
                    className="bg-white dark:bg-slate-900/40 rounded-[32px] border border-slate-100 dark:border-slate-800/80 shadow-sm p-6 overflow-hidden flex gap-4 hover:shadow-lg transition-all"
                  >
                    <div className="relative w-28 h-28 rounded-2xl overflow-hidden shrink-0 bg-slate-100">
                      <img 
                        src={promo.image} 
                        alt={promo.name} 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <span className="absolute top-2 left-2 bg-rose-500 text-white px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider shadow-sm">
                        {promo.discount}
                      </span>
                    </div>

                    <div className="flex-1 flex flex-col justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[9px] text-emerald-600 font-extrabold uppercase tracking-wider">{promo.category}</span>
                          <span className="text-[9px] text-slate-400 font-medium">{promo.storeName}</span>
                        </div>
                        <h4 className="font-serif text-base font-black text-slate-800 dark:text-white leading-tight">{promo.name}</h4>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed font-semibold">{promo.description}</p>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800/60 mt-2">
                        <div className="leading-tight">
                          <span className="text-[10px] text-slate-400 line-through block">De R$ {promo.originalPrice.toFixed(2)}</span>
                          <span className="text-base font-black text-emerald-600 dark:text-emerald-400 block">
                            R$ {promo.promoPrice.toFixed(2)} <span className="text-[10px] text-slate-400 font-normal">/{promo.unit}</span>
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleHearPromo(promo)}
                            className={`p-2.5 rounded-xl border border-slate-150 dark:border-slate-800 flex items-center justify-center transition-all cursor-pointer ${
                              isSpeaking 
                                ? 'bg-amber-100 border-amber-300 text-amber-600 dark:bg-amber-950/20' 
                                : 'bg-slate-50 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50/30'
                            }`}
                            title="Ouvir descrição por voz"
                          >
                            <Volume2 className={`w-4 h-4 ${isSpeaking ? 'animate-pulse' : ''}`} />
                          </button>

                          <button
                            onClick={() => {
                              vibrate(15);
                              playSfx('crystal');
                              setCustomItems(prev => [...prev, { name: promo.name, checked: false }]);
                            }}
                            disabled={isAlreadyInList}
                            className={`p-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 outline-none border-none ${
                              isAlreadyInList 
                                ? 'bg-slate-100 text-slate-400 dark:bg-slate-800' 
                                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-500/10'
                            }`}
                          >
                            {isAlreadyInList ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                            <span>{isAlreadyInList ? 'Na Lista' : 'Lista'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Smart Tip */}
            <div className="bg-amber-500/5 dark:bg-amber-500/10 border border-amber-100/30 dark:border-amber-900/30 rounded-[32px] p-6 flex gap-4 items-start">
              <Info className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h5 className="font-bold text-slate-900 dark:text-white text-xs">Por que comprar com nossos parceiros?</h5>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                  Alimentos orgânicos e sazonais possuem até 3x mais fitonutrientes e minerais em comparação com alimentos comuns estocados em câmaras frias industriais. Com o NutriMarket, você apoia agricultores locais e garante ingredientes frescos e saudáveis direto na sua mesa em minutos!
                </p>
              </div>
            </div>

          </div>
        )}
      </div>

    </div>
  );
}
