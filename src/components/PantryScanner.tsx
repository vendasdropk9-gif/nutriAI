import React, { useState, useEffect, useRef } from 'react';
import { 
  Barcode, PlusCircle, Calendar, AlertTriangle, CheckCircle2, 
  Trash2, Sparkles, ChefHat, Clock, Flame, Loader2, Camera, 
  Upload, Search, Filter, RefreshCw, Layers, ShieldAlert,
  ArrowRight, Utensils, Check, HelpCircle, Package, ArrowDownUp, Scale,
  PackagePlus, FolderInput, ClipboardPaste, ShoppingCart, RefreshCcw, Plus, X,
  MoveRight, CheckCheck, ListPlus, Mic, MicOff, Volume2
} from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { analyzeBarcodeProduct, generatePantryExpiringRecipes } from '../lib/gemini';
import { speak } from '../lib/speech';
import { PantryItem, PantryRecipeSuggestion, UserProfile, Recipe } from '../types';
import { AiCookingAdvisor } from './AiCookingAdvisor';
import { FoodWasteCalculator } from './FoodWasteCalculator';
import { PantryFreshness } from './PantryFreshness';
import { auth, db, doc, setDoc, getDoc, collection, getDocs, deleteDoc } from '../lib/firebase';
import { useTranslation } from '../contexts/LanguageContext';
import { safeGet, safeSet } from '../lib/storage';
import { playSfx, vibrate } from '../lib/sensory';

interface PantryScannerProps {
  profile?: UserProfile | null;
  onCookRecipe?: (recipe: Recipe) => void;
}

export interface BulkImportItem {
  id: string;
  name: string;
  quantity: string;
  category: string;
  storageLocation: 'despensa' | 'geladeira' | 'freezer';
  freshnessStatus: 'fresh' | 'expiring_soon' | 'restock';
  customDays?: number;
}

export interface ScanHistoryItem {
  id: string;
  name: string;
  quantity: string;
  category: string;
  storageLocation: 'despensa' | 'geladeira' | 'freezer';
  expirationDate: string;
  scannedAt: string;
  scanType: 'qr_code' | 'barcode' | 'receipt';
}

export const DEFAULT_BULK_DEMO: BulkImportItem[] = [
  {
    id: 'bulk-1',
    name: 'Tomates Maduros',
    quantity: '6 unidades',
    category: 'Vegetais & Frutas',
    storageLocation: 'geladeira',
    freshnessStatus: 'fresh',
    customDays: 7
  },
  {
    id: 'bulk-2',
    name: 'Arroz Integral',
    quantity: '1 kg',
    category: 'Grãos & Massas',
    storageLocation: 'despensa',
    freshnessStatus: 'fresh',
    customDays: 180
  },
  {
    id: 'bulk-3',
    name: 'Peito de Frango Resfriado',
    quantity: '500g',
    category: 'Proteínas & Carnes',
    storageLocation: 'geladeira',
    freshnessStatus: 'expiring_soon',
    customDays: 2
  },
  {
    id: 'bulk-4',
    name: 'Iogurte Grego Natural',
    quantity: '2 potes',
    category: 'Laticínios & Ovos',
    storageLocation: 'geladeira',
    freshnessStatus: 'expiring_soon',
    customDays: 2
  },
  {
    id: 'bulk-5',
    name: 'Ovos Caipiras',
    quantity: '1 dúzia',
    category: 'Laticínios & Ovos',
    storageLocation: 'geladeira',
    freshnessStatus: 'restock',
    customDays: 0
  },
  {
    id: 'bulk-6',
    name: 'Azeite de Oliva Extravirgem',
    quantity: '500ml',
    category: 'Temperos & Molhos',
    storageLocation: 'despensa',
    freshnessStatus: 'restock',
    customDays: 0
  }
];

export const BULK_PRESET_CHIPS = [
  { name: 'Peito de Frango', category: 'Proteínas & Carnes', defaultQty: '500g', loc: 'geladeira' as const },
  { name: 'Ovos Caipiras', category: 'Laticínios & Ovos', defaultQty: '12 un', loc: 'geladeira' as const },
  { name: 'Leite Desnatado', category: 'Laticínios & Ovos', defaultQty: '1L', loc: 'geladeira' as const },
  { name: 'Tomate Italiano', category: 'Vegetais & Frutas', defaultQty: '5 un', loc: 'geladeira' as const },
  { name: 'Banana Prata', category: 'Vegetais & Frutas', defaultQty: '6 un', loc: 'despensa' as const },
  { name: 'Cenoura Fresca', category: 'Vegetais & Frutas', defaultQty: '3 un', loc: 'geladeira' as const },
  { name: 'Espinafre / Folhas', category: 'Vegetais & Frutas', defaultQty: '1 maço', loc: 'geladeira' as const },
  { name: 'Arroz Integral', category: 'Grãos & Massas', defaultQty: '1kg', loc: 'despensa' as const },
  { name: 'Feijão Carioca', category: 'Grãos & Massas', defaultQty: '1kg', loc: 'despensa' as const },
  { name: 'Aveia em Flocos', category: 'Grãos & Massas', defaultQty: '400g', loc: 'despensa' as const },
  { name: 'Azeite de Oliva', category: 'Temperos & Molhos', defaultQty: '500ml', loc: 'despensa' as const },
  { name: 'Iogurte Natural', category: 'Laticínios & Ovos', defaultQty: '2 potes', loc: 'geladeira' as const }
];

const STORAGE_LOCATIONS: ('despensa' | 'geladeira' | 'freezer')[] = ['despensa', 'geladeira', 'freezer'];

const CATEGORIES = [
  'Proteínas & Carnes',
  'Laticínios & Ovos',
  'Vegetais & Frutas',
  'Grãos & Massas',
  'Temperos & Molhos',
  'Bebidas',
  'Outros'
];

const PRESET_EXPIRATION_DAYS: Record<string, number> = {
  'Laticínios & Ovos': 7,
  'Proteínas & Carnes': 3,
  'Vegetais & Frutas': 5,
  'Grãos & Massas': 180,
  'Temperos & Molhos': 90,
  'Bebidas': 30,
  'Outros': 15
};

const SUGGESTED_ITEMS = [
  { name: 'Peito de Frango', category: 'Proteínas & Carnes', defaultQty: '500g', loc: 'geladeira' as const, days: 3 },
  { name: 'Iogurte Grego Natural', category: 'Laticínios & Ovos', defaultQty: '2 potes', loc: 'geladeira' as const, days: 6 },
  { name: 'Creme de Leite', category: 'Laticínios & Ovos', defaultQty: '1 caixa', loc: 'despensa' as const, days: 25 },
  { name: 'Tomate Italiano', category: 'Vegetais & Frutas', defaultQty: '4 unidades', loc: 'geladeira' as const, days: 4 },
  { name: 'Ovos Caipiras', category: 'Laticínios & Ovos', defaultQty: '6 unidades', loc: 'geladeira' as const, days: 10 },
  { name: 'Cenoura Fresca', category: 'Vegetais & Frutas', defaultQty: '3 unidades', loc: 'geladeira' as const, days: 7 },
  { name: 'Espinafre / Folhas', category: 'Vegetais & Frutas', defaultQty: '1 maço', loc: 'geladeira' as const, days: 2 },
  { name: 'Aveia em Flocos', category: 'Grãos & Massas', defaultQty: '1 pacote', loc: 'despensa' as const, days: 90 },
  { name: 'Macarrão Integral', category: 'Grãos & Massas', defaultQty: '500g', loc: 'despensa' as const, days: 120 },
  { name: 'Azeite de Oliva Extravirgem', category: 'Temperos & Molhos', defaultQty: '500ml', loc: 'despensa' as const, days: 180 }
];

export const PantryScanner: React.FC<PantryScannerProps> = ({ profile, onCookRecipe }) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'inventory' | 'scan' | 'manual' | 'bulk' | 'scan-history' | 'recipes' | 'waste' | 'advisor' | 'freshness'>('inventory');
  const [pantryItems, setPantryItems] = useState<PantryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterLocation, setFilterLocation] = useState<string>('todos');
  const [filterUrgentOnly, setFilterUrgentOnly] = useState(false);

  // Scan History State
  const [scanHistory, setScanHistory] = useState<ScanHistoryItem[]>([]);

  // Bulk Import State
  const [bulkTab, setBulkTab] = useState<'fresh' | 'expiring_soon' | 'restock'>('fresh');
  const [bulkItems, setBulkItems] = useState<BulkImportItem[]>(DEFAULT_BULK_DEMO);
  const [bulkItemName, setBulkItemName] = useState('');
  const [bulkItemQty, setBulkItemQty] = useState('1 unidade');
  const [bulkItemCategory, setBulkItemCategory] = useState(CATEGORIES[0]);
  const [bulkItemLocation, setBulkItemLocation] = useState<'despensa' | 'geladeira' | 'freezer'>('geladeira');
  const [bulkPasteText, setBulkPasteText] = useState('');
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [bulkSuccessToast, setBulkSuccessToast] = useState<string | null>(null);
  const [isExecutingBulk, setIsExecutingBulk] = useState(false);

  // Manual Form State
  const [manualName, setManualName] = useState('');
  const [manualQty, setManualQty] = useState('1 unidade');
  const [manualCategory, setManualCategory] = useState(CATEGORIES[0]);
  const [manualLocation, setManualLocation] = useState<'despensa' | 'geladeira' | 'freezer'>('despensa');
  const [manualExpiration, setManualExpiration] = useState('');

  // Barcode Scanner State
  const [isScanning, setIsScanning] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [scanStatus, setScanStatus] = useState<string | null>(null);
  const [scannedProductPreview, setScannedProductPreview] = useState<any | null>(null);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  // Suggested Recipes State
  const [suggestedRecipes, setSuggestedRecipes] = useState<PantryRecipeSuggestion[]>([]);
  const [generatingRecipes, setGeneratingRecipes] = useState(false);
  const [consumedSuccessId, setConsumedSuccessId] = useState<string | null>(null);

  // Voice Command Quick Add State
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [isVoiceListening, setIsVoiceListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [parsedVoiceItem, setParsedVoiceItem] = useState<{
    name: string;
    quantity: string;
    category: string;
    storageLocation: 'despensa' | 'geladeira' | 'freezer';
    expirationDate: string;
  } | null>(null);
  const voiceRecognitionRef = useRef<any>(null);

  // Initial load from Firestore & localStorage
  useEffect(() => {
    loadPantryItems();
    const localHist = localStorage.getItem('nutri_pantry_scan_history');
    if (localHist) {
      try { setScanHistory(JSON.parse(localHist)); } catch (e) {}
    }
    return () => {
      if (voiceRecognitionRef.current) {
        try { voiceRecognitionRef.current.abort(); } catch (e) {}
      }
    };
  }, []);

  const recordScanHistory = (item: Omit<ScanHistoryItem, 'id' | 'scannedAt'>) => {
    const newItem: ScanHistoryItem = {
      ...item,
      id: `scan-hist-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      scannedAt: new Date().toISOString()
    };
    setScanHistory(prev => {
      const updated = [newItem, ...prev].slice(0, 20);
      localStorage.setItem('nutri_pantry_scan_history', JSON.stringify(updated));
      return updated;
    });
  };

  const handleReAddHistoryItem = async (histItem: ScanHistoryItem) => {
    await handleAddItem({
      name: histItem.name,
      quantity: histItem.quantity,
      category: histItem.category,
      storageLocation: histItem.storageLocation,
      expirationDate: histItem.expirationDate
    }, true);
    speak(`Re-adicionado ${histItem.name} à sua ${histItem.storageLocation}!`, { lang: 'pt-BR', voice: 'Aoede' });
  };

  const calculateDaysRemaining = (expDateStr: string): number => {
    if (!expDateStr) return 7;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expDate = new Date(expDateStr);
    expDate.setHours(0, 0, 0, 0);
    const diffTime = expDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getStatusFromDays = (days: number): 'vencido' | 'perto_vencimento' | 'fresco' => {
    if (days < 0) return 'vencido';
    if (days <= 3) return 'perto_vencimento';
    return 'fresco';
  };

  const loadPantryItems = async () => {
    setLoading(true);
    let items: PantryItem[] = [];

    // Check localStorage fallback
    const local = localStorage.getItem('nutri_pantry_items');
    if (local) {
      try {
        items = JSON.parse(local);
      } catch (e) {}
    }

    // Try Firestore if logged in
    try {
      const user = auth.currentUser || (profile?.id ? { uid: profile.id } : null);
      if (user) {
        const snap = await getDocs(collection(db, `users/${user.uid}/pantryItems`));
        if (!snap.empty) {
          items = snap.docs.map(d => ({ id: d.id, ...d.data() } as PantryItem));
        }
      }
    } catch (e) {
      console.warn("Aviso ao carregar itens da despensa do Firestore:", e);
    }

    // Recalculate remaining days on fresh load
    const updated = items.map(it => {
      const days = calculateDaysRemaining(it.expirationDate);
      return {
        ...it,
        daysRemaining: days,
        status: getStatusFromDays(days)
      };
    }).sort((a, b) => a.daysRemaining - b.daysRemaining);

    // If completely empty, seed with helpful starter demo items
    if (updated.length === 0) {
      const demoItems: PantryItem[] = [
        {
          id: 'item-demo-1',
          name: 'Peito de Frango Resfriado',
          quantity: '600g',
          category: 'Proteínas & Carnes',
          expirationDate: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0],
          daysRemaining: 2,
          status: 'perto_vencimento',
          storageLocation: 'geladeira',
          addedAt: new Date().toISOString()
        },
        {
          id: 'item-demo-2',
          name: 'Iogurte Grego Natural',
          quantity: '2 potes (340g)',
          category: 'Laticínios & Ovos',
          expirationDate: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
          daysRemaining: 3,
          status: 'perto_vencimento',
          storageLocation: 'geladeira',
          addedAt: new Date().toISOString()
        },
        {
          id: 'item-demo-3',
          name: 'Tomates Maduros',
          quantity: '4 unidades',
          category: 'Vegetais & Frutas',
          expirationDate: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
          daysRemaining: 3,
          status: 'perto_vencimento',
          storageLocation: 'geladeira',
          addedAt: new Date().toISOString()
        },
        {
          id: 'item-demo-4',
          name: 'Creme de Leite Leve',
          quantity: '1 caixa (200g)',
          category: 'Laticínios & Ovos',
          expirationDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
          daysRemaining: 30,
          status: 'fresco',
          storageLocation: 'despensa',
          addedAt: new Date().toISOString()
        },
        {
          id: 'item-demo-5',
          name: 'Macarrão Integral Penne',
          quantity: '500g',
          category: 'Grãos & Massas',
          expirationDate: new Date(Date.now() + 180 * 86400000).toISOString().split('T')[0],
          daysRemaining: 180,
          status: 'fresco',
          storageLocation: 'despensa',
          addedAt: new Date().toISOString()
        }
      ];
      setPantryItems(demoItems);
      saveItems(demoItems);
    } else {
      setPantryItems(updated);
    }
    setLoading(false);
  };

  const saveItems = async (items: PantryItem[]) => {
    localStorage.setItem('nutri_pantry_items', JSON.stringify(items));
    try {
      const user = auth.currentUser || (profile?.id ? { uid: profile.id } : null);
      if (user) {
        for (const item of items) {
          await setDoc(doc(db, `users/${user.uid}/pantryItems/${item.id}`), item, { merge: true });
        }
      }
    } catch (e) {
      console.warn("Aviso ao sincronizar despensa com Firestore:", e);
    }
  };

  const handleAddItem = async (itemData: Omit<PantryItem, 'id' | 'daysRemaining' | 'status' | 'addedAt'>, isFromScan = false) => {
    const days = calculateDaysRemaining(itemData.expirationDate);
    const newItem: PantryItem = {
      ...itemData,
      id: `pantry-item-${Date.now()}`,
      daysRemaining: days,
      status: getStatusFromDays(days),
      addedAt: new Date().toISOString()
    };

    const updated = [...pantryItems, newItem].sort((a, b) => a.daysRemaining - b.daysRemaining);
    setPantryItems(updated);
    await saveItems(updated);

    if (isFromScan || activeTab === 'scan' || scannedProductPreview) {
      recordScanHistory({
        name: newItem.name,
        quantity: newItem.quantity,
        category: newItem.category,
        storageLocation: newItem.storageLocation,
        expirationDate: newItem.expirationDate,
        scanType: (newItem.barcode || '').length > 5 ? 'barcode' : 'qr_code'
      });
    }

    // Speak confirmation with Aoede voice profile
    speak(`${newItem.name} adicionado à sua ${newItem.storageLocation}.`, { lang: 'pt-BR', voice: 'Aoede' });
    
    // Reset manual form
    setManualName('');
    setManualQty('1 unidade');
    setManualExpiration('');
    setScannedProductPreview(null);
    setActiveTab('inventory');
  };

  const handleDeleteItem = async (id: string) => {
    const updated = pantryItems.filter(i => i.id !== id);
    setPantryItems(updated);
    localStorage.setItem('nutri_pantry_items', JSON.stringify(updated));

    try {
      const user = auth.currentUser || (profile?.id ? { uid: profile.id } : null);
      if (user) {
        await deleteDoc(doc(db, `users/${user.uid}/pantryItems/${id}`));
      }
    } catch (e) {}
  };

  // Bulk Import Handlers
  const handleAddSingleBulkItem = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!bulkItemName.trim()) return;

    const newItem: BulkImportItem = {
      id: `bulk-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: bulkItemName.trim(),
      quantity: bulkItemQty.trim() || '1 unidade',
      category: bulkItemCategory,
      storageLocation: bulkItemLocation,
      freshnessStatus: bulkTab,
      customDays: bulkTab === 'fresh' ? (PRESET_EXPIRATION_DAYS[bulkItemCategory] || 10) : bulkTab === 'expiring_soon' ? 2 : 0
    };

    setBulkItems(prev => [newItem, ...prev]);
    playSfx('tap');
    vibrate(20);
    setBulkItemName('');
    setBulkItemQty('1 unidade');
  };

  const handleAddPresetToBulk = (preset: typeof BULK_PRESET_CHIPS[0]) => {
    const newItem: BulkImportItem = {
      id: `bulk-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: preset.name,
      quantity: preset.defaultQty,
      category: preset.category,
      storageLocation: preset.loc,
      freshnessStatus: bulkTab,
      customDays: bulkTab === 'fresh' ? (PRESET_EXPIRATION_DAYS[preset.category] || 10) : bulkTab === 'expiring_soon' ? 2 : 0
    };

    setBulkItems(prev => [newItem, ...prev]);
    playSfx('pop');
    vibrate(20);
  };

  const handleParsePasteBulk = () => {
    if (!bulkPasteText.trim()) return;
    const lines = bulkPasteText.split(/[\n,;]+/);
    const newItems: BulkImportItem[] = [];

    lines.forEach((line, idx) => {
      const clean = line.trim();
      if (!clean) return;

      let name = clean;
      let qty = '1 unidade';

      if (clean.includes('-')) {
        const parts = clean.split('-');
        name = parts[0].trim();
        qty = parts[1]?.trim() || '1 unidade';
      } else if (clean.includes(':')) {
        const parts = clean.split(':');
        name = parts[0].trim();
        qty = parts[1]?.trim() || '1 unidade';
      } else {
        const match = clean.match(/^([\d.,]+\s*(?:g|kg|ml|l|unidades?|un|pacotes?|pct|caixas?|potes?|dúzias?|maços?))\s+(.+)$/i);
        if (match) {
          qty = match[1].trim();
          name = match[2].trim();
        }
      }

      const lower = name.toLowerCase();
      let matchedCategory = CATEGORIES[0];
      if (lower.includes('frango') || lower.includes('carne') || lower.includes('peixe') || lower.includes('tilapia') || lower.includes('patinho')) {
        matchedCategory = 'Proteínas & Carnes';
      } else if (lower.includes('leite') || lower.includes('iogurte') || lower.includes('queijo') || lower.includes('creme') || lower.includes('ovo')) {
        matchedCategory = 'Laticínios & Ovos';
      } else if (lower.includes('tomate') || lower.includes('banana') || lower.includes('maca') || lower.includes('maçã') || lower.includes('cenoura') || lower.includes('alface') || lower.includes('espinafre')) {
        matchedCategory = 'Vegetais & Frutas';
      } else if (lower.includes('arroz') || lower.includes('feijao') || lower.includes('feijão') || lower.includes('macarrao') || lower.includes('macarrão') || lower.includes('aveia') || lower.includes('pão')) {
        matchedCategory = 'Grãos & Massas';
      } else if (lower.includes('azeite') || lower.includes('sal') || lower.includes('molho') || lower.includes('pimenta')) {
        matchedCategory = 'Temperos & Molhos';
      } else if (lower.includes('suco') || lower.includes('cafe') || lower.includes('café') || lower.includes('cha') || lower.includes('chá')) {
        matchedCategory = 'Bebidas';
      }

      const storageLoc: 'despensa' | 'geladeira' | 'freezer' = 
        matchedCategory === 'Proteínas & Carnes' || matchedCategory === 'Laticínios & Ovos' ? 'geladeira'
        : matchedCategory === 'Vegetais & Frutas' ? 'geladeira'
        : 'despensa';

      newItems.push({
        id: `bulk-paste-${Date.now()}-${idx}`,
        name: name.charAt(0).toUpperCase() + name.slice(1),
        quantity: qty,
        category: matchedCategory,
        storageLocation: storageLoc,
        freshnessStatus: bulkTab,
        customDays: bulkTab === 'fresh' ? (PRESET_EXPIRATION_DAYS[matchedCategory] || 10) : bulkTab === 'expiring_soon' ? 2 : 0
      });
    });

    if (newItems.length > 0) {
      setBulkItems(prev => [...newItems, ...prev]);
      playSfx('crystal');
      vibrate([20, 40]);
      setBulkPasteText('');
      setShowPasteModal(false);
    }
  };

  const handleMoveBulkItem = (id: string, newStatus: 'fresh' | 'expiring_soon' | 'restock') => {
    setBulkItems(prev => prev.map(item => {
      if (item.id === id) {
        return {
          ...item,
          freshnessStatus: newStatus,
          customDays: newStatus === 'fresh' ? (PRESET_EXPIRATION_DAYS[item.category] || 10) : newStatus === 'expiring_soon' ? 2 : 0
        };
      }
      return item;
    }));
    playSfx('tap');
    vibrate(15);
  };

  const handleDeleteBulkItem = (id: string) => {
    setBulkItems(prev => prev.filter(i => i.id !== id));
    playSfx('pop');
    vibrate(15);
  };

  const handleClearBulk = () => {
    setBulkItems([]);
    playSfx('tap');
    vibrate(20);
  };

  const handleLoadDemoBulk = () => {
    setBulkItems(DEFAULT_BULK_DEMO);
    playSfx('crystal');
    vibrate([20, 30]);
  };

  const handleExecuteBulkImport = async () => {
    if (bulkItems.length === 0) return;
    setIsExecutingBulk(true);
    playSfx('crystal');
    vibrate([40, 60, 40]);

    const newPantryItems: PantryItem[] = [];
    const restockShoppingItems: Array<{ id: string; name: string; checked: boolean; addedAt: string; source: string; category?: string }> = [];

    for (const item of bulkItems) {
      if (item.freshnessStatus === 'fresh') {
        const expDays = item.customDays || PRESET_EXPIRATION_DAYS[item.category] || 10;
        const expDate = new Date(Date.now() + expDays * 86400000).toISOString().split('T')[0];
        newPantryItems.push({
          id: `pantry-bulk-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          name: item.name,
          quantity: item.quantity,
          category: item.category,
          storageLocation: item.storageLocation,
          expirationDate: expDate,
          daysRemaining: expDays,
          status: 'fresco',
          addedAt: new Date().toISOString()
        });
      } else if (item.freshnessStatus === 'expiring_soon') {
        const expDays = item.customDays || 2;
        const expDate = new Date(Date.now() + expDays * 86400000).toISOString().split('T')[0];
        newPantryItems.push({
          id: `pantry-bulk-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          name: item.name,
          quantity: item.quantity,
          category: item.category,
          storageLocation: item.storageLocation,
          expirationDate: expDate,
          daysRemaining: expDays,
          status: 'perto_vencimento',
          addedAt: new Date().toISOString()
        });
      } else if (item.freshnessStatus === 'restock') {
        const todayStr = new Date().toISOString().split('T')[0];
        newPantryItems.push({
          id: `pantry-bulk-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          name: item.name,
          quantity: item.quantity,
          category: item.category,
          storageLocation: item.storageLocation,
          expirationDate: todayStr,
          daysRemaining: 0,
          status: 'vencido',
          needsRestock: true,
          addedAt: new Date().toISOString()
        });

        restockShoppingItems.push({
          id: `shop_restock_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          name: `${item.name} (${item.quantity})`,
          checked: false,
          addedAt: new Date().toISOString(),
          source: 'pantry-bulk-restock',
          category: item.category
        });
      }
    }

    // Update pantry items in memory, localStorage, and Firestore
    const updatedPantry = [...pantryItems, ...newPantryItems].sort((a, b) => a.daysRemaining - b.daysRemaining);
    setPantryItems(updatedPantry);
    await saveItems(updatedPantry);

    // Sync restock items to shopping list
    if (restockShoppingItems.length > 0) {
      try {
        let existingCustom: any[] = [];
        const raw = safeGet('nutri-shopping-custom-items');
        if (raw) existingCustom = JSON.parse(raw);
        const combined = [...existingCustom, ...restockShoppingItems];
        safeSet('nutri-shopping-custom-items', JSON.stringify(combined));
        window.dispatchEvent(new CustomEvent('nutri:shopping-list-updated'));

        const targetUid = auth.currentUser?.uid || profile?.id;
        if (targetUid) {
          for (const sItem of restockShoppingItems) {
            await setDoc(doc(db, 'users', targetUid, 'shoppingList', sItem.id), sItem, { merge: true });
          }
        }
      } catch (e) {
        console.warn('Aviso ao sincronizar lista de reposição com lista de compras:', e);
      }
    }

    playSfx('success');
    vibrate([50, 80]);
    const summaryMsg = `${newPantryItems.length} alimentos importados em lote! ${restockShoppingItems.length > 0 ? `(${restockShoppingItems.length} adicionados à Lista de Compras)` : ''}`;
    setBulkSuccessToast(summaryMsg);
    speak(`Importação em lote concluída com ${newPantryItems.length} itens categorizados.`, { lang: 'pt-BR' });

    setBulkItems([]);
    setIsExecutingBulk(false);

    window.dispatchEvent(new CustomEvent('app:notification', {
      detail: {
        title: "Importação em Lote Concluída! 📦",
        message: summaryMsg,
        type: "success"
      }
    }));

    setTimeout(() => {
      setActiveTab('inventory');
      setBulkSuccessToast(null);
    }, 1800);
  };

  // ============================================================================
  // VOICE COMMAND INGREDIENT PARSER & HANDLERS
  // Allows users to quickly speak an ingredient name and quantity into the pantry
  // ============================================================================
  const parseVoicePantryCommand = (rawTranscript: string) => {
    let text = (rawTranscript || '').toLowerCase().trim();

    // 1. Storage Location inference from voice
    let storageLocation: 'despensa' | 'geladeira' | 'freezer' | null = null;
    if (text.includes('geladeira') || text.includes('refrigerador') || text.includes('fridge')) {
      storageLocation = 'geladeira';
    } else if (text.includes('freezer') || text.includes('congelador')) {
      storageLocation = 'freezer';
    } else if (text.includes('despensa') || text.includes('armário') || text.includes('armario') || text.includes('pantry')) {
      storageLocation = 'despensa';
    }

    // Strip location phrases from spoken text
    text = text.replace(/\b(na\s+geladeira|no\s+refrigerador|no\s+freezer|no\s+congelador|na\s+despensa|no\s+arm[aá]rio)\b/gi, '').trim();

    // 2. Normalize spoken number words to numerals
    text = text
      .replace(/\bmeio\s+quilo\b/gi, '500g')
      .replace(/\bmeia\s+d[uú]zia\b/gi, '6 unidades')
      .replace(/\b(uma|1)\s+d[uú]zia\b/gi, '12 unidades')
      .replace(/\bduas\s+d[uú]zias\b/gi, '24 unidades')
      .replace(/\bquinhentos\s+gramas\b/gi, '500g')
      .replace(/\bquinhentas\s+gramas\b/gi, '500g')
      .replace(/\bcem\s+gramas\b/gi, '100g')
      .replace(/\bduzentos\s+gramas\b/gi, '200g')
      .replace(/\btrezentos\s+gramas\b/gi, '300g')
      .replace(/\bquatrocentos\s+gramas\b/gi, '400g')
      .replace(/\bum\s+quilo\b/gi, '1kg')
      .replace(/\bdois\s+quilos\b/gi, '2kg')
      .replace(/\btr[eê]s\s+quilos\b/gi, '3kg')
      .replace(/\bum\s+litro\b/gi, '1L')
      .replace(/\bdois\s+litros\b/gi, '2L')
      .replace(/\btr[eê]s\s+litros\b/gi, '3L')
      .replace(/\b(uma|um)\s+(pote|caixa|pacote|garrafa|lata|unidade|maço)\b/gi, '1 $2')
      .replace(/\b(duas|dois)\s+(potes|caixas|pacotes|garrafas|latas|unidades|maços)\b/gi, '2 $2')
      .replace(/\btr[eê]s\s+(potes|caixas|pacotes|garrafas|latas|unidades|maços)\b/gi, '3 $1')
      .replace(/\bquatro\s+(potes|caixas|pacotes|garrafas|latas|unidades|maços)\b/gi, '4 $1')
      .replace(/\bcinco\s+(potes|caixas|pacotes|garrafas|latas|unidades|maços)\b/gi, '5 $1')
      .replace(/\bseis\s+(potes|caixas|pacotes|garrafas|latas|unidades|maços)\b/gi, '6 $1');

    // 3. Extract quantity
    let quantity = '1 unidade';
    const qtyRegex = /\b(\d+(?:[.,]\d+)?\s*(?:kg|quilos?|kilos?|g|gramas?|l|litros?|ml|unidades?|un|potes?|caixas?|pacotes?|maços?|macos?|garrafas?|latas?|dúzias?|duzias?|fatias?))\b/i;
    const qtyMatch = text.match(qtyRegex);

    if (qtyMatch) {
      quantity = qtyMatch[1].trim();
      text = text.replace(qtyMatch[0], ' ');
    } else {
      const leadingNumMatch = text.match(/^\s*(\d+)\s+/i);
      if (leadingNumMatch) {
        quantity = `${leadingNumMatch[1]} unidades`;
        text = text.replace(leadingNumMatch[0], ' ');
      }
    }

    // 4. Strip command words
    text = text
      .replace(/\b(adicionar|adiciona|adicione|adicionando|colocar|coloca|coloque|colocando|anotar|anota|anote|salvar|salva|salve|cadastrar|cadastra|cadastre|incluir|inclui|novo|nova|por favor|mais|com)\b/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Strip connector "de"
    text = text.replace(/^de\s+/i, '').replace(/\s+de\s+/gi, ' de ').trim();

    // 5. Clean name
    let name = text || 'Alimento';
    name = name
      .split(' ')
      .filter(Boolean)
      .map((word, idx) => {
        const w = word.toLowerCase();
        if (idx > 0 && ['de', 'da', 'do', 'das', 'dos', 'com', 'e', 'em'].includes(w)) {
          return w;
        }
        return w.charAt(0).toUpperCase() + w.slice(1);
      })
      .join(' ');

    // 6. Infer Category
    const lowerName = name.toLowerCase();
    let category = 'Outros';

    if (
      lowerName.includes('frango') || lowerName.includes('carne') || lowerName.includes('peixe') ||
      lowerName.includes('patinho') || lowerName.includes('alcatra') || lowerName.includes('filé') ||
      lowerName.includes('file') || lowerName.includes('bovino') || lowerName.includes('suíno') ||
      lowerName.includes('camarão') || lowerName.includes('camarao') || lowerName.includes('atum') ||
      lowerName.includes('salmão') || lowerName.includes('salmao') || lowerName.includes('bacon') ||
      lowerName.includes('linguiça') || lowerName.includes('linguica') || lowerName.includes('presunto') ||
      lowerName.includes('whey') || lowerName.includes('proteína') || lowerName.includes('proteina')
    ) {
      category = 'Proteínas & Carnes';
    } else if (
      lowerName.includes('leite') || lowerName.includes('queijo') || lowerName.includes('iogurte') ||
      lowerName.includes('manteiga') || lowerName.includes('requeijão') || lowerName.includes('requeijao') ||
      lowerName.includes('nata') || lowerName.includes('creme de leite') || lowerName.includes('muçarela') ||
      lowerName.includes('mussarela') || lowerName.includes('parmesão') || lowerName.includes('parmesao') ||
      lowerName.includes('ovo') || lowerName.includes('ovos')
    ) {
      category = 'Laticínios & Ovos';
    } else if (
      lowerName.includes('tomate') || lowerName.includes('banana') || lowerName.includes('maçã') ||
      lowerName.includes('maca') || lowerName.includes('laranja') || lowerName.includes('limão') ||
      lowerName.includes('limao') || lowerName.includes('cenoura') || lowerName.includes('alface') ||
      lowerName.includes('espinafre') || lowerName.includes('batata') || lowerName.includes('cebola') ||
      lowerName.includes('alho') || lowerName.includes('brócolis') || lowerName.includes('brocolis') ||
      lowerName.includes('abacate') || lowerName.includes('uva') || lowerName.includes('manga') ||
      lowerName.includes('mamão') || lowerName.includes('mamao') || lowerName.includes('morango') ||
      lowerName.includes('pepino') || lowerName.includes('abobrinha') || lowerName.includes('couve') ||
      lowerName.includes('rúcula') || lowerName.includes('rucula') || lowerName.includes('fruta') ||
      lowerName.includes('legume') || lowerName.includes('verdura')
    ) {
      category = 'Vegetais & Frutas';
    } else if (
      lowerName.includes('arroz') || lowerName.includes('feijão') || lowerName.includes('feijao') ||
      lowerName.includes('macarrão') || lowerName.includes('macarrao') || lowerName.includes('aveia') ||
      lowerName.includes('farinha') || lowerName.includes('massa') || lowerName.includes('trigo') ||
      lowerName.includes('quinoa') || lowerName.includes('lentilha') || lowerName.includes('grão') ||
      lowerName.includes('grao') || lowerName.includes('cuscuz') || lowerName.includes('pão') ||
      lowerName.includes('pao') || lowerName.includes('tapioca') || lowerName.includes('cereal')
    ) {
      category = 'Grãos & Massas';
    } else if (
      lowerName.includes('azeite') || lowerName.includes('óleo') || lowerName.includes('oleo') ||
      lowerName.includes('vinagre') || lowerName.includes('molho') || lowerName.includes('sal') ||
      lowerName.includes('pimenta') || lowerName.includes('orégano') || lowerName.includes('oregano') ||
      lowerName.includes('páprica') || lowerName.includes('paprica') || lowerName.includes('mostarda') ||
      lowerName.includes('ketchup') || lowerName.includes('maionese') || lowerName.includes('tempero')
    ) {
      category = 'Temperos & Molhos';
    } else if (
      lowerName.includes('suco') || lowerName.includes('café') || lowerName.includes('cafe') ||
      lowerName.includes('chá') || lowerName.includes('cha') || lowerName.includes('água') ||
      lowerName.includes('agua') || lowerName.includes('refrigerante') || lowerName.includes('cerveja') ||
      lowerName.includes('vinho') || lowerName.includes('kombucha') || lowerName.includes('bebida')
    ) {
      category = 'Bebidas';
    }

    // 7. Infer storage location if not explicitly stated
    if (!storageLocation) {
      if (category === 'Proteínas & Carnes' || category === 'Laticínios & Ovos') {
        storageLocation = 'geladeira';
      } else if (category === 'Vegetais & Frutas') {
        if (lowerName.includes('banana') || lowerName.includes('cebola') || lowerName.includes('alho') || lowerName.includes('batata')) {
          storageLocation = 'despensa';
        } else {
          storageLocation = 'geladeira';
        }
      } else if (category === 'Grãos & Massas' || category === 'Temperos & Molhos') {
        storageLocation = 'despensa';
      } else if (category === 'Bebidas') {
        storageLocation = 'geladeira';
      } else {
        storageLocation = 'geladeira';
      }
    }

    const expirationDays = PRESET_EXPIRATION_DAYS[category] || 7;

    return {
      name,
      quantity,
      category,
      storageLocation,
      expirationDays
    };
  };

  const startVoiceCommand = () => {
    setShowVoiceModal(true);
    setVoiceTranscript('');
    setVoiceError(null);
    setParsedVoiceItem(null);
    playSfx('crystal');
    vibrate([20, 30]);

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceError("Reconhecimento de voz não suportado neste navegador. Digite ou use a entrada manual.");
      return;
    }

    try {
      if (voiceRecognitionRef.current) {
        try { voiceRecognitionRef.current.abort(); } catch (e) {}
      }

      const recognition = new SpeechRecognition();
      recognition.lang = 'pt-BR';
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsVoiceListening(true);
        setVoiceError(null);
      };

      recognition.onresult = (event: any) => {
        let interim = '';
        let final = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            final += event.results[i][0].transcript;
          } else {
            interim += event.results[i][0].transcript;
          }
        }
        const text = (final || interim).trim();
        setVoiceTranscript(text);

        if (final) {
          const parsed = parseVoicePantryCommand(final);
          const expDate = new Date(Date.now() + parsed.expirationDays * 86400000).toISOString().split('T')[0];
          setParsedVoiceItem({
            name: parsed.name,
            quantity: parsed.quantity,
            category: parsed.category,
            storageLocation: parsed.storageLocation,
            expirationDate: expDate
          });
          playSfx('pop');
          vibrate(15);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('[PantryScanner Voice] Speech error:', event?.error);
        if (event.error !== 'no-speech') {
          setVoiceError(`Não foi possível captar a voz (${event.error}). Toque no microfone para tentar novamente.`);
        }
        setIsVoiceListening(false);
      };

      recognition.onend = () => {
        setIsVoiceListening(false);
      };

      voiceRecognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.warn('[PantryScanner Voice] Start failed:', err);
      setVoiceError("Erro ao iniciar o microfone. Verifique as permissões de áudio.");
      setIsVoiceListening(false);
    }
  };

  const stopVoiceCommand = () => {
    if (voiceRecognitionRef.current) {
      try { voiceRecognitionRef.current.stop(); } catch (e) {}
    }
    setIsVoiceListening(false);
  };

  const handleConfirmVoiceItem = async () => {
    if (!parsedVoiceItem || !parsedVoiceItem.name.trim()) return;
    playSfx('crystal');
    vibrate([30, 50]);

    await handleAddItem({
      name: parsedVoiceItem.name.trim(),
      quantity: parsedVoiceItem.quantity.trim() || '1 unidade',
      category: parsedVoiceItem.category,
      storageLocation: parsedVoiceItem.storageLocation,
      expirationDate: parsedVoiceItem.expirationDate
    });

    // Provide affirmative spoken confirmation with Malu's Aoede profile
    speak(`Perfeito! Adicionei ${parsedVoiceItem.quantity} de ${parsedVoiceItem.name} na sua ${parsedVoiceItem.storageLocation}.`, {
      lang: 'pt-BR',
      voice: 'Aoede'
    });

    setShowVoiceModal(false);
    setParsedVoiceItem(null);
    setVoiceTranscript('');
  };

  // Barcode Camera Scanner setup
  const startBarcodeCamera = () => {
    setIsScanning(true);
    setScanStatus("Inicializando câmera para leitura do código de barras...");

    setTimeout(() => {
      try {
        const scanner = new Html5QrcodeScanner(
          "pantry-barcode-reader",
          { 
            fps: 10, 
            qrbox: { width: 250, height: 150 },
            aspectRatio: 1.5
          },
          /* verbose= */ false
        );
        scannerRef.current = scanner;

        scanner.render(
          (decodedText) => {
            scanner.clear();
            setIsScanning(false);
            lookupBarcode(decodedText);
          },
          (error) => {
            // non-fatal scanning frame failure
          }
        );
      } catch (err) {
        console.warn("Erro ao iniciar leitor de código de barras:", err);
        setScanStatus("Câmera indisponível ou permissão negada. Tente digitar o código de barras abaixo.");
        setIsScanning(false);
      }
    }, 200);
  };

  const stopBarcodeCamera = () => {
    if (scannerRef.current) {
      scannerRef.current.clear().catch(() => {});
      scannerRef.current = null;
    }
    setIsScanning(false);
  };

  const lookupBarcode = async (barcode: string) => {
    const code = barcode.trim();
    if (!code) return;
    setScanStatus(`Buscando informações do código: ${code}...`);

    try {
      // 1. Query Open Food Facts
      const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${code}.json`);
      if (res.ok) {
        const json = await res.json();
        if (json.status === 1 && json.product) {
          const p = json.product;
          const prodName = p.product_name_pt || p.product_name || p.generic_name_pt || 'Alimento';
          const brand = p.brands || '';
          const categoryGuess = p.categories_hierarchy?.[0] || '';
          
          let matchedCategory = CATEGORIES[0];
          if (/dairy|lait|leite|iogurte|queijo|queij/i.test(categoryGuess + prodName)) matchedCategory = 'Laticínios & Ovos';
          else if (/meat|carne|frango|peixe|ave/i.test(categoryGuess + prodName)) matchedCategory = 'Proteínas & Carnes';
          else if (/fruit|vegetable|legume|fruta|horta/i.test(categoryGuess + prodName)) matchedCategory = 'Vegetais & Frutas';
          else if (/pasta|cereal|grain|arroz|feijao|farinha/i.test(categoryGuess + prodName)) matchedCategory = 'Grãos & Massas';
          else if (/sauce|condiment|molho|tempero/i.test(categoryGuess + prodName)) matchedCategory = 'Temperos & Molhos';
          else if (/beverage|drink|suco|refrigerante/i.test(categoryGuess + prodName)) matchedCategory = 'Bebidas';

          const defaultDays = PRESET_EXPIRATION_DAYS[matchedCategory] || 10;
          const defaultExpDate = new Date(Date.now() + defaultDays * 86400000).toISOString().split('T')[0];

          setScannedProductPreview({
            name: prodName,
            brand,
            category: matchedCategory,
            quantity: p.quantity || '1 unidade',
            barcode: code,
            expirationDate: defaultExpDate,
            storageLocation: (matchedCategory.includes('Laticínios') || matchedCategory.includes('Proteínas')) ? 'geladeira' : 'despensa'
          });
          setScanStatus(`Produto localizado: ${prodName}`);
          speak(`Código lido: ${prodName}`, { lang: 'pt-BR' });
          return;
        }
      }

      // Fallback: AI analysis of barcode
      const aiResult = await analyzeBarcodeProduct(code, profile || undefined);
      if (aiResult && aiResult.product) {
        const defaultExpDate = new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0];
        setScannedProductPreview({
          name: aiResult.product.name,
          brand: aiResult.product.brand || '',
          category: aiResult.product.category || CATEGORIES[0],
          quantity: '1 unidade',
          barcode: code,
          expirationDate: defaultExpDate,
          storageLocation: 'despensa'
        });
        setScanStatus(`Produto identificado: ${aiResult.product.name}`);
        return;
      }
    } catch (e) {
      console.warn("Erro ao buscar código de barras:", e);
    }

    // Default unknown barcode
    const defaultExpDate = new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0];
    setScannedProductPreview({
      name: `Item (Código ${code.slice(-6)})`,
      brand: '',
      category: 'Outros',
      quantity: '1 unidade',
      barcode: code,
      expirationDate: defaultExpDate,
      storageLocation: 'despensa'
    });
    setScanStatus(`Código registrado. Complete os detalhes do alimento.`);
  };

  // Recipe Suggestion prioritizing expiring items
  const handleGenerateExpiringRecipes = async () => {
    if (pantryItems.length === 0) {
      alert("Adicione alguns itens à despensa primeiro.");
      return;
    }

    setGeneratingRecipes(true);
    setActiveTab('recipes');

    try {
      const recipes = await generatePantryExpiringRecipes(pantryItems, profile || undefined);
      setSuggestedRecipes(recipes);
      if (recipes.length > 0) {
        speak(`Encontrei ${recipes.length} receitas aproveitando seus ingredientes mais urgentes!`, { lang: 'pt-BR' });
      }
    } catch (e) {
      console.warn("Erro ao gerar receitas da despensa:", e);
    } finally {
      setGeneratingRecipes(false);
    }
  };

  const handleSuggestFreshOrExpiringRecipes = async () => {
    const freshOrExpiringItems = pantryItems.filter(
      item => item.status === 'fresco' || item.status === 'perto_vencimento' || item.daysRemaining >= 0
    );

    if (freshOrExpiringItems.length === 0) {
      alert("Nenhum ingrediente fresco ou perto do vencimento encontrado na despensa.");
      return;
    }

    setGeneratingRecipes(true);
    setActiveTab('recipes');

    try {
      const recipes = await generatePantryExpiringRecipes(freshOrExpiringItems, profile || undefined);
      setSuggestedRecipes(recipes);
      if (recipes.length > 0) {
        speak(`Encontrei ${recipes.length} receitas usando exclusivamente seus ingredientes frescos e perto do vencimento!`, { lang: 'pt-BR', voice: 'Aoede' });
      }
    } catch (e) {
      console.warn("Erro ao gerar receitas para frescos/vencendo:", e);
    } finally {
      setGeneratingRecipes(false);
    }
  };

  // Consume ingredients button
  const handleMarkAsConsumed = (recipe: PantryRecipeSuggestion) => {
    const rescuedNames = (recipe.urgentExpiringIngredientsUsed || []).map(s => s.toLowerCase());
    const otherNames = (recipe.otherPantryIngredientsUsed || []).map(s => s.toLowerCase());
    const allUsedNames = [...rescuedNames, ...otherNames];

    const updated = pantryItems.filter(item => {
      const itemLower = item.name.toLowerCase();
      const wasUsed = allUsedNames.some(used => itemLower.includes(used) || used.includes(itemLower));
      return !wasUsed;
    });

    setPantryItems(updated);
    saveItems(updated);
    setConsumedSuccessId(recipe.id);
    speak("Ingredientes consumidos e despensa atualizada!", { lang: 'pt-BR' });
    setTimeout(() => setConsumedSuccessId(null), 3500);
  };

  // Filter items
  const filteredItems = pantryItems.filter(item => {
    if (filterLocation !== 'todos' && item.storageLocation !== filterLocation) return false;
    if (filterUrgentOnly && item.daysRemaining > 3) return false;
    return true;
  });

  const urgentCount = pantryItems.filter(i => i.daysRemaining <= 3).length;

  return (
    <div id="pantry-scanner-wrapper" className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-br from-teal-700 via-emerald-800 to-zinc-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-white/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-white/10 backdrop-blur-md text-emerald-300">
                <Package className="w-6 h-6" />
              </span>
              <h1 className="text-2xl font-bold tracking-tight">Scanner de Despensa Inteligente</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-400/20 text-emerald-200 border border-emerald-300/30">
                Zero Desperdício
              </span>
            </div>
            <p className="text-sm text-emerald-100/80 max-w-2xl">
              Cadastre alimentos por código de barras ou entrada manual. Nosso algoritmo inteligente rastreia validades e sugere receitas focadas no resgate de ingredientes prestes a vencer!
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              id="btn-voice-add-pantry-header"
              type="button"
              onClick={startVoiceCommand}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 active:scale-95 text-white font-bold text-xs shadow-lg shadow-emerald-950/25 transition cursor-pointer"
              title="Ditar alimento e quantidade por comando de voz (Ex: '500g de frango na geladeira')"
            >
              <Mic className="w-4 h-4 text-emerald-100 animate-pulse" />
              <span>Adicionar por Voz</span>
            </button>

            <button
              id="generate-expiring-recipes-header-btn"
              onClick={handleGenerateExpiringRecipes}
              disabled={generatingRecipes || pantryItems.length === 0}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold text-xs shadow-lg shadow-amber-950/20 transition transform active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-100" />
              <span>Sugerir Receitas Anti-Desperdício</span>
              {urgentCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-white text-amber-700 text-[10px] font-bold">
                  {urgentCount} urgente{urgentCount > 1 ? 's' : ''}
                </span>
              )}
            </button>

            <button
              id="generate-fresh-expiring-recipes-btn"
              onClick={handleSuggestFreshOrExpiringRecipes}
              disabled={generatingRecipes || pantryItems.length === 0}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold text-xs shadow-lg shadow-emerald-950/20 transition transform active:scale-95 disabled:opacity-50 cursor-pointer"
              title="Gerar receitas usando exclusivamente ingredientes frescos e perto do vencimento"
            >
              <ChefHat className="w-4 h-4 text-emerald-100" />
              <span>Sugerir Receitas (Frescos & Vencendo)</span>
            </button>
          </div>
        </div>

        {/* Quick Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-white/10 text-xs">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3">
            <span className="text-emerald-200/80 block text-[11px]">Total na Despensa</span>
            <span className="text-lg font-bold text-white">{pantryItems.length} itens</span>
          </div>
          <div className="bg-rose-500/20 backdrop-blur-sm rounded-xl p-3 border border-rose-400/30">
            <span className="text-rose-200 block text-[11px] font-medium">Vencendo em breve</span>
            <span className="text-lg font-bold text-rose-300">{urgentCount} itens</span>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3">
            <span className="text-emerald-200/80 block text-[11px]">Na Geladeira</span>
            <span className="text-lg font-bold text-white">
              {pantryItems.filter(i => i.storageLocation === 'geladeira').length} itens
            </span>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3">
            <span className="text-emerald-200/80 block text-[11px]">Secos / Despensa</span>
            <span className="text-lg font-bold text-white">
              {pantryItems.filter(i => i.storageLocation === 'despensa').length} itens
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-2">
        <div className="flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-800/60 p-1 rounded-xl">
          <button
            id="tab-pantry-inventory"
            onClick={() => setActiveTab('inventory')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
              activeTab === 'inventory'
                ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Minha Despensa ({pantryItems.length})</span>
          </button>

          <button
            id="tab-pantry-scan"
            onClick={() => { setActiveTab('scan'); startBarcodeCamera(); }}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
              activeTab === 'scan'
                ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
            }`}
          >
            <Barcode className="w-3.5 h-3.5" />
            <span>Escanear Código</span>
          </button>

          <button
            id="tab-pantry-scan-history"
            onClick={() => setActiveTab('scan-history')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
              activeTab === 'scan-history'
                ? 'bg-emerald-600 text-white shadow-sm font-bold'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Histórico de Scans ({scanHistory.length})</span>
          </button>

          <button
            id="tab-pantry-manual"
            onClick={() => setActiveTab('manual')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
              activeTab === 'manual'
                ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
            }`}
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Entrada Manual</span>
          </button>

          <button
            id="tab-pantry-voice-btn"
            type="button"
            onClick={startVoiceCommand}
            className="px-3.5 py-2 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 bg-gradient-to-r from-emerald-500/15 to-teal-500/15 hover:from-emerald-500/25 hover:to-teal-500/25 text-emerald-700 dark:text-emerald-300 border border-emerald-400/40 dark:border-emerald-600/40 cursor-pointer shadow-xs active:scale-95"
            title="Ditar alimento e quantidade por voz (ex: '1 dúzia de ovos')"
          >
            <Mic className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 animate-pulse" />
            <span>Ditar por Voz</span>
          </button>

          <button
            id="tab-pantry-bulk"
            onClick={() => setActiveTab('bulk')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
              activeTab === 'bulk'
                ? 'bg-emerald-600 text-white shadow-sm font-bold'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
            }`}
          >
            <PackagePlus className="w-3.5 h-3.5" />
            <span>Importação em Lote</span>
            {bulkItems.length > 0 && (
              <span className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold flex items-center gap-1 ${
                bulkItems.some(i => i.freshnessStatus === 'expiring_soon')
                  ? 'bg-amber-500 text-white animate-pulse'
                  : 'bg-white/20'
              }`}>
                {bulkItems.some(i => i.freshnessStatus === 'expiring_soon') && (
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                )}
                {bulkItems.length}
              </span>
            )}
          </button>

          <button
            id="tab-pantry-recipes"
            onClick={() => setActiveTab('recipes')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
              activeTab === 'recipes'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Receitas Anti-Desperdício</span>
            {suggestedRecipes.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 bg-white/20 rounded-full text-[10px]">
                {suggestedRecipes.length}
              </span>
            )}
          </button>

          <button
            id="tab-pantry-waste-calculator"
            onClick={() => setActiveTab('waste')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
              activeTab === 'waste'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
            }`}
          >
            <Scale className="w-3.5 h-3.5" />
            <span>Índice de Desperdício</span>
          </button>

          <button
            id="tab-pantry-advisor"
            onClick={() => setActiveTab('advisor')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
              activeTab === 'advisor'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
            }`}
          >
            <ChefHat className="w-3.5 h-3.5" />
            <span>Chef Malu (Dúvidas de Cozinha)</span>
          </button>

          <button
            id="tab-pantry-freshness"
            onClick={() => setActiveTab('freshness')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
              activeTab === 'freshness'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-sm font-bold'
                : 'text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-emerald-500" />
            <span>Frescor & Validades</span>
            {urgentCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 bg-rose-500 text-white rounded-full text-[10px] font-bold animate-pulse">
                {urgentCount}
              </span>
            )}
          </button>
        </div>

        {activeTab === 'inventory' && (
          <div className="flex items-center gap-2">
            <button
              id="filter-urgent-toggle"
              onClick={() => setFilterUrgentOnly(!filterUrgentOnly)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition flex items-center gap-1.5 ${
                filterUrgentOnly
                  ? 'bg-rose-50 border-rose-300 text-rose-700 dark:bg-rose-950/30 dark:border-rose-800 dark:text-rose-300'
                  : 'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
              <span>Priorizar Vencendo ({urgentCount})</span>
            </button>

            <select
              value={filterLocation}
              onChange={(e) => setFilterLocation(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 focus:outline-none"
            >
              <option value="todos">Todos os locais</option>
              <option value="geladeira">Geladeira</option>
              <option value="despensa">Despensa Seca</option>
              <option value="freezer">Freezer</option>
            </select>
          </div>
        )}
      </div>

      {/* TAB: INVENTORY LIST */}
      {activeTab === 'inventory' && (
        <div className="space-y-4">
          {filteredItems.length === 0 ? (
            <div className="text-center py-12 bg-zinc-50 dark:bg-zinc-800/40 rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700 p-8 space-y-3">
              <Package className="w-12 h-12 text-zinc-400 mx-auto" />
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-zinc-800 dark:text-zinc-200">
                  Nenhum alimento localizado com os filtros atuais
                </h3>
                <p className="text-xs text-zinc-500 max-w-md mx-auto">
                  Adicione mantimentos usando a câmera com leitor de código de barras ou preencha rapidamente os dados manuais.
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  onClick={() => { setActiveTab('scan'); startBarcodeCamera(); }}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <Barcode className="w-4 h-4" />
                  <span>Escanear Código de Barras</span>
                </button>
                <button
                  onClick={() => setActiveTab('manual')}
                  className="px-4 py-2 rounded-xl bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 text-zinc-800 dark:text-zinc-200 text-xs font-semibold transition"
                >
                  Entrada Manual
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredItems.map((item) => {
                const isUrgent = item.daysRemaining <= 3;
                const isWarning = item.daysRemaining > 3 && item.daysRemaining <= 7;
                
                return (
                  <div
                    key={item.id}
                    id={`pantry-item-card-${item.id}`}
                    className={`rounded-2xl p-4 border transition duration-200 flex flex-col justify-between relative overflow-hidden ${
                      isUrgent
                        ? 'bg-rose-50/80 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800/80 shadow-md shadow-rose-500/10 ring-1 ring-rose-400/50 animate-pulse'
                        : isWarning
                        ? 'bg-amber-50/50 dark:bg-amber-950/15 border-amber-200/80 dark:border-amber-900/40'
                        : 'bg-white dark:bg-zinc-800/80 border-zinc-200/80 dark:border-zinc-700/60 shadow-sm'
                    }`}
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          item.storageLocation === 'geladeira'
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                            : item.storageLocation === 'freezer'
                            ? 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                        }`}>
                          {item.storageLocation}
                        </span>

                        {/* Expiration Tag with pulsing beacon */}
                        <div className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          isUrgent
                            ? 'bg-rose-500 text-white animate-pulse shadow-xs'
                            : isWarning
                            ? 'bg-amber-500 text-white'
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        }`}>
                          {isUrgent && (
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-80" />
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
                            </span>
                          )}
                          {isUrgent && <AlertTriangle className="w-3 h-3" />}
                          <span>
                            {item.daysRemaining < 0
                              ? 'Vencido!'
                              : item.daysRemaining === 0
                              ? 'Vence hoje!'
                              : item.daysRemaining === 1
                              ? 'Vence amanhã'
                              : `${item.daysRemaining} dias`}
                          </span>
                        </div>
                      </div>

                      {/* Name & Category */}
                      <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 leading-snug">
                        {item.name}
                      </h4>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        {item.quantity} • {item.category}
                        {item.brand ? ` (${item.brand})` : ''}
                      </p>

                      {item.barcode && (
                        <span className="text-[10px] font-mono text-zinc-400 block mt-1">
                          Código: {item.barcode}
                        </span>
                      )}
                    </div>

                    {/* Footer / Actions */}
                    <div className="mt-3 pt-3 border-t border-zinc-200/60 dark:border-zinc-700/40 flex items-center justify-between text-xs">
                      <span className="text-[11px] text-zinc-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {item.expirationDate ? new Date(item.expirationDate).toLocaleDateString('pt-BR') : 'Sem data'}
                      </span>

                      <button
                        id={`delete-pantry-item-${item.id}`}
                        onClick={() => handleDeleteItem(item.id)}
                        title="Remover item da despensa"
                        className="text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 p-1 rounded-lg hover:bg-rose-50 dark:hover:bg-zinc-700 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB: SCAN BARCODE */}
      {activeTab === 'scan' && (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 space-y-6">
          <div className="text-center max-w-md mx-auto space-y-1">
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              Escanear Código de Barras de Mantimentos
            </h3>
            <p className="text-xs text-zinc-500">
              Aponte a câmera para o código de barras de embalagens de alimentos (Open Food Facts + IA).
            </p>
          </div>

          {/* Camera Scanner Container */}
          <div className="max-w-md mx-auto">
            <div 
              id="pantry-barcode-reader" 
              className="rounded-2xl overflow-hidden border-2 border-emerald-500/40 shadow-md bg-zinc-950 min-h-[220px]"
            />

            <div className="flex items-center justify-between gap-2 mt-3 text-xs">
              <button
                type="button"
                onClick={startBarcodeCamera}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium flex items-center gap-1.5 transition"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Reiniciar Câmera</span>
              </button>

              <button
                type="button"
                onClick={stopBarcodeCamera}
                className="px-3 py-1.5 rounded-lg bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium transition"
              >
                Pausar Câmera
              </button>
            </div>
          </div>

          {/* Manual Barcode Input Fallback */}
          <div className="max-w-md mx-auto pt-4 border-t border-zinc-200 dark:border-zinc-800 space-y-2">
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block">
              Ou digite o código de barras numérico:
            </label>
            <form
              onSubmit={(e) => { e.preventDefault(); lookupBarcode(barcodeInput); }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                placeholder="Ex: 7891000100103"
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={!barcodeInput.trim()}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold text-xs transition"
              >
                Buscar
              </button>
            </form>
            {scanStatus && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400 italic">
                {scanStatus}
              </p>
            )}
          </div>

          {/* Scanned Product Confirmation Card */}
          {scannedProductPreview && (
            <div className="max-w-md mx-auto bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-4 space-y-3 animate-in fade-in">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400 block">
                    Alimento Identificado
                  </span>
                  <h4 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
                    {scannedProductPreview.name}
                  </h4>
                  {scannedProductPreview.brand && (
                    <span className="text-xs text-zinc-500">Marca: {scannedProductPreview.brand}</span>
                  )}
                </div>
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-1" />
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="text-[10px] text-zinc-500 block">Quantidade</label>
                  <input
                    type="text"
                    value={scannedProductPreview.quantity}
                    onChange={(e) => setScannedProductPreview({ ...scannedProductPreview, quantity: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-emerald-300 dark:border-emerald-800 bg-white dark:bg-zinc-800 text-xs text-zinc-800 dark:text-zinc-200"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-500 block">Validade Estimada</label>
                  <input
                    type="date"
                    value={scannedProductPreview.expirationDate}
                    onChange={(e) => setScannedProductPreview({ ...scannedProductPreview, expirationDate: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-emerald-300 dark:border-emerald-800 bg-white dark:bg-zinc-800 text-xs text-zinc-800 dark:text-zinc-200"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-500 block">Armazenar em</label>
                  <select
                    value={scannedProductPreview.storageLocation}
                    onChange={(e) => setScannedProductPreview({ ...scannedProductPreview, storageLocation: e.target.value as any })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-emerald-300 dark:border-emerald-800 bg-white dark:bg-zinc-800 text-xs text-zinc-800 dark:text-zinc-200"
                  >
                    <option value="despensa">Despensa Seca</option>
                    <option value="geladeira">Geladeira</option>
                    <option value="freezer">Freezer</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-zinc-500 block">Categoria</label>
                  <select
                    value={scannedProductPreview.category}
                    onChange={(e) => setScannedProductPreview({ ...scannedProductPreview, category: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-emerald-300 dark:border-emerald-800 bg-white dark:bg-zinc-800 text-xs text-zinc-800 dark:text-zinc-200"
                  >
                    {CATEGORIES.map(c => (
                      <option key={c} value={c}>{t(c)}</option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                type="button"
                id="confirm-add-scanned-product-btn"
                onClick={() => handleAddItem(scannedProductPreview)}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-sm"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Salvar na Minha Despensa</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB: MANUAL ENTRY */}
      {activeTab === 'manual' && (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-100 dark:border-zinc-800">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Cadastrar Mantimento Manualmente
              </h3>
              <p className="text-xs text-zinc-500">
                Insira o nome, porção e a data de validade para controle preventivo de desperdício.
              </p>
            </div>

            <button
              id="btn-voice-command-manual-tab"
              type="button"
              onClick={startVoiceCommand}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 hover:from-emerald-500/20 hover:to-teal-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-400/40 text-xs font-bold flex items-center gap-2 transition active:scale-95 cursor-pointer self-start sm:self-auto"
              title="Ditar alimento por voz"
            >
              <Mic className="w-4 h-4 text-emerald-600 dark:text-emerald-400 animate-pulse" />
              <span>Ditar por Comando de Voz</span>
            </button>
          </div>

          {/* Quick presets for common foods */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block">
              Sugestões rápidas de alimentos:
            </label>
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTED_ITEMS.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setManualName(t(item.name));
                    setManualQty(item.defaultQty);
                    setManualCategory(item.category);
                    setManualLocation(item.loc);
                    const exp = new Date(Date.now() + item.days * 86400000).toISOString().split('T')[0];
                    setManualExpiration(exp);
                  }}
                  className="px-2.5 py-1 rounded-lg text-xs bg-zinc-100 hover:bg-emerald-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:text-emerald-700 border border-zinc-200 dark:border-zinc-700 transition"
                >
                  + {t(item.name)}
                </button>
              ))}
            </div>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!manualName.trim()) return;
              const expDate = manualExpiration || new Date(Date.now() + (PRESET_EXPIRATION_DAYS[manualCategory] || 7) * 86400000).toISOString().split('T')[0];
              handleAddItem({
                name: manualName.trim(),
                quantity: manualQty.trim() || '1 unidade',
                category: manualCategory,
                storageLocation: manualLocation,
                expirationDate: expDate
              });
            }}
            className="space-y-4 max-w-xl"
          >
            <div>
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                Nome do Alimento ou Produto *
              </label>
              <input
                type="text"
                value={manualName}
                onChange={(e) => setManualName(e.target.value)}
                placeholder="Ex: Peito de Frango, Iogurte Grego, Tomates, Macarrão"
                required
                className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Quantidade / Porção
                </label>
                <input
                  type="text"
                  value={manualQty}
                  onChange={(e) => setManualQty(e.target.value)}
                  placeholder="Ex: 500g, 2 potes, 1 maço"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Categoria
                </label>
                <select
                  value={manualCategory}
                  onChange={(e) => setManualCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  {CATEGORIES.map(c => (
                    <option key={c} value={c}>{t(c)}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Local de Armazenamento
                </label>
                <select
                  value={manualLocation}
                  onChange={(e) => setManualLocation(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="despensa">Despensa Seca / Armário</option>
                  <option value="geladeira">Geladeira</option>
                  <option value="freezer">Freezer / Congelador</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Data de Validade
                </label>
                <input
                  type="date"
                  value={manualExpiration}
                  onChange={(e) => setManualExpiration(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Quick expiration shortcuts */}
            <div className="flex items-center gap-1.5 pt-1 text-xs">
              <span className="text-[11px] text-zinc-400">Atalhos de validade:</span>
              {[
                { label: 'Hoje', days: 0 },
                { label: '+2 dias', days: 2 },
                { label: '+5 dias', days: 5 },
                { label: '+15 dias', days: 15 },
                { label: '+30 dias', days: 30 }
              ].map((shortcut, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    const d = new Date(Date.now() + shortcut.days * 86400000).toISOString().split('T')[0];
                    setManualExpiration(d);
                  }}
                  className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-zinc-600 dark:text-zinc-400 text-[11px] transition"
                >
                  {shortcut.label}
                </button>
              ))}
            </div>

            <button
              type="submit"
              id="submit-manual-pantry-item-btn"
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition shadow-md shadow-emerald-900/10"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Adicionar à Despensa</span>
            </button>
          </form>
        </div>
      )}

      {/* TAB: BULK IMPORT (IMPORTAÇÃO EM LOTE COM ABAS DE FRESCOR) */}
      {activeTab === 'bulk' && (
        <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-6 space-y-6 shadow-sm">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 dark:border-zinc-800 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                  <PackagePlus className="w-5 h-5" />
                </span>
                <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                  Importação em Lote de Mantimentos
                </h3>
              </div>
              <p className="text-xs text-zinc-500 mt-1 max-w-xl">
                Classifique múltiplos alimentos pelo status de frescor (Fresco, Perto do Vencimento ou Reposição) usando as abas abaixo e adicione tudo à sua despensa de uma vez só!
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleLoadDemoBulk}
                className="px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-700 dark:text-zinc-300 font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer"
                title="Carregar exemplo equilibrado de compras para testar"
              >
                <RefreshCcw className="w-3.5 h-3.5" />
                <span>Exemplo Pronto</span>
              </button>

              {bulkItems.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearBulk}
                  className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer border border-rose-200 dark:border-rose-900/40"
                  title="Limpar todos os itens da importação em lote"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Limpar Lote</span>
                </button>
              )}
            </div>
          </div>

          {/* Success Toast Banner */}
          {bulkSuccessToast && (
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{bulkSuccessToast}</span>
            </div>
          )}

          {/* Clean Tabbed UI for Freshness Status Categories */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-1.5 bg-zinc-100 dark:bg-zinc-800/70 rounded-2xl border border-zinc-200 dark:border-zinc-700/60">
              {/* Tab 1: Fresh */}
              <button
                type="button"
                id="bulk-tab-fresh"
                onClick={() => { setBulkTab('fresh'); playSfx('tap'); }}
                className={`px-4 py-3 rounded-xl text-xs font-bold transition flex items-center justify-between gap-2 cursor-pointer ${
                  bulkTab === 'fresh'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                    : 'text-zinc-600 dark:text-zinc-400 hover:bg-white/60 dark:hover:bg-zinc-700/60'
                }`}
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className={`w-4 h-4 ${bulkTab === 'fresh' ? 'text-white' : 'text-emerald-500'}`} />
                  <span>Fresco (Fresh)</span>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                  bulkTab === 'fresh'
                    ? 'bg-white/20 text-white'
                    : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                }`}>
                  {bulkItems.filter(i => i.freshnessStatus === 'fresh').length}
                </span>
              </button>

              {/* Tab 2: Expiring Soon */}
              <button
                type="button"
                id="bulk-tab-expiring"
                onClick={() => { setBulkTab('expiring_soon'); playSfx('tap'); }}
                className={`px-4 py-3 rounded-xl text-xs font-bold transition flex items-center justify-between gap-2 cursor-pointer relative overflow-hidden ${
                  bulkTab === 'expiring_soon'
                    ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20'
                    : 'text-zinc-600 dark:text-zinc-400 hover:bg-white/60 dark:hover:bg-zinc-700/60'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <AlertTriangle className={`w-4 h-4 ${bulkTab === 'expiring_soon' ? 'text-white' : 'text-amber-500'}`} />
                    {bulkItems.some(i => i.freshnessStatus === 'expiring_soon') && (
                      <span className="absolute -top-1 -right-1 flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-80" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
                      </span>
                    )}
                  </div>
                  <span>Perto do Vencimento</span>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold flex items-center gap-1 ${
                  bulkTab === 'expiring_soon'
                    ? 'bg-white/20 text-white'
                    : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                } ${bulkItems.some(i => i.freshnessStatus === 'expiring_soon') ? 'animate-pulse' : ''}`}>
                  {bulkItems.filter(i => i.freshnessStatus === 'expiring_soon').length}
                </span>
              </button>

              {/* Tab 3: Restock */}
              <button
                type="button"
                id="bulk-tab-restock"
                onClick={() => { setBulkTab('restock'); playSfx('tap'); }}
                className={`px-4 py-3 rounded-xl text-xs font-bold transition flex items-center justify-between gap-2 cursor-pointer ${
                  bulkTab === 'restock'
                    ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20'
                    : 'text-zinc-600 dark:text-zinc-400 hover:bg-white/60 dark:hover:bg-zinc-700/60'
                }`}
              >
                <div className="flex items-center gap-2">
                  <ShoppingCart className={`w-4 h-4 ${bulkTab === 'restock' ? 'text-white' : 'text-rose-500'}`} />
                  <span>Reposição (Restock)</span>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                  bulkTab === 'restock'
                    ? 'bg-white/20 text-white'
                    : 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                }`}>
                  {bulkItems.filter(i => i.freshnessStatus === 'restock').length}
                </span>
              </button>
            </div>

            {/* Freshness Status Info Banner */}
            <div className={`p-4 rounded-2xl border text-xs flex items-start gap-3 transition-colors ${
              bulkTab === 'fresh'
                ? 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200'
                : bulkTab === 'expiring_soon'
                ? 'bg-amber-50/70 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200'
                : 'bg-rose-50/70 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/60 text-rose-900 dark:text-rose-200'
            }`}>
              <div className="shrink-0 mt-0.5">
                {bulkTab === 'fresh' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : bulkTab === 'expiring_soon' ? (
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                ) : (
                  <ShoppingCart className="w-4 h-4 text-rose-600" />
                )}
              </div>
              <div>
                <p className="font-bold text-sm">
                  {bulkTab === 'fresh'
                    ? '🟢 Categoria: Fresco (Fresh)'
                    : bulkTab === 'expiring_soon'
                    ? '🟡 Categoria: Perto do Vencimento (Expiring Soon)'
                    : '🔴 Categoria: Reposição (Restock)'}
                </p>
                <p className="text-zinc-600 dark:text-zinc-300 mt-0.5">
                  {bulkTab === 'fresh'
                    ? 'Alimentos recém-comprados ou com prazo confortável. Serão salvos na despensa com validades seguras (7 a 180 dias de acordo com a categoria).'
                    : bulkTab === 'expiring_soon'
                    ? 'Alimentos que necessitam consumo urgente (1 a 3 dias). Serão integrados imediatamente ao motor de receitas anti-desperdício!'
                    : 'Ingredientes esgotados ou com estoque crítico. Serão registrados e sincronizados automaticamente na sua Lista de Compras.'}
                </p>
              </div>
            </div>

            {/* Quick Add Bar to Current Category */}
            <form
              onSubmit={handleAddSingleBulkItem}
              className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700/80 space-y-3"
            >
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                  Adicionar alimento a "{bulkTab === 'fresh' ? 'Fresco' : bulkTab === 'expiring_soon' ? 'Perto do Vencimento' : 'Reposição'}":
                </span>

                <button
                  type="button"
                  onClick={() => setShowPasteModal(true)}
                  className="px-2.5 py-1 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:text-emerald-600 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer self-start sm:self-auto"
                >
                  <ClipboardPaste className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Colar Vários em Texto</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                <div className="sm:col-span-4">
                  <input
                    type="text"
                    value={bulkItemName}
                    onChange={(e) => setBulkItemName(e.target.value)}
                    placeholder="Nome (ex: Queijo Minas, Tomate, Frango)"
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <input
                    type="text"
                    value={bulkItemQty}
                    onChange={(e) => setBulkItemQty(e.target.value)}
                    placeholder="Qtd (ex: 500g, 2 potes)"
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-3">
                  <select
                    value={bulkItemCategory}
                    onChange={(e) => setBulkItemCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    {CATEGORIES.map(c => (
                      <option key={c} value={c}>{t(c)}</option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <select
                    value={bulkItemLocation}
                    onChange={(e) => setBulkItemLocation(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="geladeira">Geladeira</option>
                    <option value="despensa">Despensa Seca</option>
                    <option value="freezer">Freezer</option>
                  </select>
                </div>

                <div className="sm:col-span-1">
                  <button
                    type="submit"
                    disabled={!bulkItemName.trim()}
                    className="w-full h-full py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-xl font-bold text-xs flex items-center justify-center transition cursor-pointer"
                    title="Adicionar à lista atual"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Quick Preset Chips */}
              <div className="pt-1">
                <span className="text-[11px] text-zinc-400 block mb-1">
                  Atalhos de 1 toque para adicionar a "{bulkTab === 'fresh' ? 'Fresco' : bulkTab === 'expiring_soon' ? 'Vencendo' : 'Repor'}":
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {BULK_PRESET_CHIPS.map((chip, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleAddPresetToBulk(chip)}
                      className="px-2 py-0.5 rounded-lg text-[11px] bg-white hover:bg-emerald-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:text-emerald-700 border border-zinc-200 dark:border-zinc-700 transition cursor-pointer"
                    >
                      + {chip.name}
                    </button>
                  ))}
                </div>
              </div>
            </form>

            {/* Paste Modal / Drawer */}
            {showPasteModal && (
              <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 space-y-3 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                    <ClipboardPaste className="w-4 h-4 text-emerald-600" />
                    Colar Lista de Ingredientes (1 por linha ou com vírgulas)
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowPasteModal(false)}
                    className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <textarea
                  rows={4}
                  value={bulkPasteText}
                  onChange={(e) => setBulkPasteText(e.target.value)}
                  placeholder={`Cole aqui sua lista de compras ou inventário:\nExemplo:\nPeito de Frango, 600g\nOvos Caipiras, 1 dúzia\nTomates Maduros, 4 unidades\nArroz Integral, 1kg`}
                  className="w-full p-3 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />

                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowPasteModal(false)}
                    className="px-3 py-1.5 rounded-xl text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleParsePasteBulk}
                    disabled={!bulkPasteText.trim()}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Processar & Adicionar à aba atual</span>
                  </button>
                </div>
              </div>
            )}

            {/* Staged Items List in Current Tab */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Itens nesta categoria ({bulkItems.filter(i => i.freshnessStatus === bulkTab).length}):
                </h4>
                <span className="text-[11px] text-zinc-400">
                  Dica: Toque nos botões para mover entre Fresco, Vencendo ou Reposição
                </span>
              </div>

              {bulkItems.filter(i => i.freshnessStatus === bulkTab).length === 0 ? (
                <div className="p-8 text-center rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/20 space-y-2">
                  <Package className="w-8 h-8 text-zinc-400 mx-auto" />
                  <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                    Nenhum alimento adicionado à categoria "{bulkTab === 'fresh' ? 'Fresco' : bulkTab === 'expiring_soon' ? 'Perto do Vencimento' : 'Reposição'}" ainda.
                  </p>
                  <p className="text-[11px] text-zinc-400">
                    Use o formulário acima, cole uma lista de texto ou toque nos atalhos rápidos de alimentos.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {bulkItems.filter(i => i.freshnessStatus === bulkTab).map((item) => {
                    const isExpiring = item.freshnessStatus === 'expiring_soon' || (item.customDays !== undefined && item.customDays <= 3 && item.freshnessStatus !== 'restock');

                    return (
                    <div
                      key={item.id}
                      className={`p-3.5 rounded-2xl border flex flex-col justify-between gap-3 transition-all relative overflow-hidden ${
                        isExpiring
                          ? 'border-amber-400 dark:border-amber-500/80 bg-gradient-to-br from-amber-500/10 via-amber-50/70 to-orange-500/5 dark:from-amber-950/40 dark:via-zinc-800/90 dark:to-orange-950/20 shadow-md shadow-amber-500/10 ring-1 ring-amber-400/50 animate-pulse'
                          : 'border-zinc-200 dark:border-zinc-700/80 bg-zinc-50 dark:bg-zinc-800/60 shadow-xs'
                      }`}
                    >
                      {/* Visual indicator banner for expiring ingredients */}
                      {isExpiring && (
                        <div className="flex items-center justify-between gap-2 -mt-0.5">
                          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/20 dark:bg-amber-500/30 border border-amber-400/60 text-amber-800 dark:text-amber-200 text-[10px] font-bold">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-80" />
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
                            </span>
                            <AlertTriangle className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />
                            <span>Vence em breve ({item.customDays ?? 2}d) • Prioritário</span>
                          </div>
                        </div>
                      )}

                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h5 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                              {item.name}
                            </h5>
                            {isExpiring && (
                              <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0 animate-ping" title="Atenção: consumo imediato recomendado" />
                            )}
                          </div>
                          <p className="text-xs text-zinc-500 mt-0.5">
                            {item.quantity} • {item.category}
                          </p>
                        </div>

                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          item.storageLocation === 'geladeira'
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                            : item.storageLocation === 'freezer'
                            ? 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                        }`}>
                          {item.storageLocation}
                        </span>
                      </div>

                      {/* Move to another Freshness status actions */}
                      <div className="pt-2 border-t border-zinc-200/60 dark:border-zinc-700/60 flex items-center justify-between gap-1 text-[11px]">
                        <div className="flex items-center gap-1">
                          <span className="text-zinc-400 text-[10px]">Mover p/:</span>
                          {bulkTab !== 'fresh' && (
                            <button
                              type="button"
                              onClick={() => handleMoveBulkItem(item.id, 'fresh')}
                              className="px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-200 text-[10px] font-semibold transition"
                              title="Mover para Fresco"
                            >
                              Fresco
                            </button>
                          )}
                          {bulkTab !== 'expiring_soon' && (
                            <button
                              type="button"
                              onClick={() => handleMoveBulkItem(item.id, 'expiring_soon')}
                              className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 hover:bg-amber-200 text-[10px] font-semibold transition"
                              title="Mover para Perto do Vencimento"
                            >
                              Vencendo
                            </button>
                          )}
                          {bulkTab !== 'restock' && (
                            <button
                              type="button"
                              onClick={() => handleMoveBulkItem(item.id, 'restock')}
                              className="px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 hover:bg-rose-200 text-[10px] font-semibold transition"
                              title="Mover para Reposição"
                            >
                              Repor
                            </button>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteBulkItem(item.id)}
                          className="text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 p-1 rounded-lg hover:bg-rose-50 dark:hover:bg-zinc-700 transition"
                          title="Remover item do lote"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
                </div>
              )}
            </div>
          </div>

          {/* Unified Bottom Bar & Final Bulk Import Action */}
          <div className="p-4 rounded-2xl bg-zinc-900 text-white dark:bg-zinc-950 border border-zinc-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 shadow-lg">
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <span className="font-bold text-white flex items-center gap-1.5">
                <PackagePlus className="w-4 h-4 text-emerald-400" />
                Resumo do Lote:
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                🟢 {bulkItems.filter(i => i.freshnessStatus === 'fresh').length} Frescos
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold">
                🟡 {bulkItems.filter(i => i.freshnessStatus === 'expiring_soon').length} Perto do Vencimento
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 font-semibold">
                🔴 {bulkItems.filter(i => i.freshnessStatus === 'restock').length} Reposição
              </span>
              <span className="text-zinc-400 font-mono">
                Total: {bulkItems.length} alimentos
              </span>
            </div>

            <button
              type="button"
              id="confirm-execute-bulk-import-btn"
              onClick={handleExecuteBulkImport}
              disabled={bulkItems.length === 0 || isExecutingBulk}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-40 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/30 transition transform active:scale-95 cursor-pointer shrink-0"
            >
              {isExecutingBulk ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Importando alimentos...</span>
                </>
              ) : (
                <>
                  <CheckCheck className="w-4 h-4" />
                  <span>Importar Todos ({bulkItems.length} itens)</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* TAB: SCAN HISTORY */}
      {activeTab === 'scan-history' && (
        <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-6 space-y-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 dark:border-zinc-800 pb-4">
            <div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <Barcode className="w-5 h-5 text-emerald-600" />
                Histórico de Scans QR Code & Código de Barras (Últimos 20)
              </h3>
              <p className="text-xs text-zinc-500 mt-1">
                Visualize os últimos 20 itens escaneados com sucesso. Toque em "Re-adicionar" para incluí-los novamente na sua despensa instantaneamente.
              </p>
            </div>

            {scanHistory.length > 0 && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const headers = ['Data/Hora', 'Nome', 'Quantidade', 'Categoria', 'Local', 'Tipo de Scan'];
                    const csvRows = [headers.join(',')];
                    for (const item of scanHistory) {
                      const row = [
                        new Date(item.scannedAt).toLocaleString('pt-BR'),
                        `"${item.name}"`,
                        `"${item.quantity}"`,
                        `"${item.category}"`,
                        `"${item.storageLocation}"`,
                        item.scanType
                      ];
                      csvRows.push(row.join(','));
                    }
                    const csvString = csvRows.join('\n');
                    const blob = new Blob([csvString], { type: 'text/csv' });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `historico_scans_${new Date().toISOString().slice(0, 10)}.csv`;
                    link.click();
                    URL.revokeObjectURL(url);
                    playSfx('success');
                  }}
                  className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer border border-emerald-200 dark:border-emerald-900/40"
                >
                  <FolderInput className="w-3.5 h-3.5" />
                  <span>Exportar CSV</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setScanHistory([]);
                    localStorage.removeItem('nutri_pantry_scan_history');
                    playSfx('tap');
                  }}
                  className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer border border-rose-200 dark:border-rose-900/40"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Limpar Histórico</span>
                </button>
              </div>
            )}
          </div>

          {scanHistory.length === 0 ? (
            <div className="p-12 text-center rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/20 space-y-3">
              <Barcode className="w-10 h-10 text-zinc-400 mx-auto" />
              <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                Nenhum item escaneado recentemente.
              </p>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                Use a aba "Escanear Código" para ler etiquetas de alimentos ou QR codes de recibos de supermercado.
              </p>
              <button
                type="button"
                onClick={() => { setActiveTab('scan'); startBarcodeCamera(); }}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs inline-flex items-center gap-1.5 transition cursor-pointer"
              >
                <Camera className="w-4 h-4" />
                <span>Ir para Escaner</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {scanHistory.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-700/80 bg-zinc-50 dark:bg-zinc-800/60 flex flex-col justify-between gap-3 shadow-xs transition hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 uppercase">
                          {item.scanType === 'qr_code' ? 'QR Code' : 'Código de Barras'}
                        </span>
                        <span className="text-[10px] text-zinc-400 font-mono">
                          {new Date(item.scannedAt).toLocaleDateString('pt-BR')} às {new Date(item.scannedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 mt-1.5">
                        {item.name}
                      </h4>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        {item.quantity} • {item.category}
                      </p>
                    </div>

                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      item.storageLocation === 'geladeira'
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                        : item.storageLocation === 'freezer'
                        ? 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300'
                        : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                    }`}>
                      {item.storageLocation}
                    </span>
                  </div>

                  <div className="pt-3 border-t border-zinc-200/60 dark:border-zinc-700/60 flex items-center justify-between text-xs">
                    <span className="text-[11px] text-zinc-400">
                      Validade: {new Date(item.expirationDate).toLocaleDateString('pt-BR')}
                    </span>

                    <button
                      type="button"
                      onClick={() => handleReAddHistoryItem(item)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-xs cursor-pointer"
                      title="Adicionar este item novamente à despensa"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Re-adicionar</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB: SUGGESTED RECIPES (ANTI-DESPERDÍCIO) */}
      {activeTab === 'recipes' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                Receitas com Foco nos Ingredientes Prestes a Vencer
              </h3>
              <p className="text-xs text-zinc-500">
                Estas receitas priorizam o resgate dos alimentos com menor prazo de validade na sua despensa.
              </p>
            </div>

            <button
              onClick={handleGenerateExpiringRecipes}
              disabled={generatingRecipes}
              className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${generatingRecipes ? 'animate-spin' : ''}`} />
              <span>Gerar Novas Receitas</span>
            </button>
          </div>

          {generatingRecipes && (
            <div className="p-10 text-center space-y-3 bg-amber-50/50 dark:bg-amber-950/20 rounded-2xl border border-amber-200 dark:border-amber-900/40">
              <Loader2 className="w-8 h-8 text-amber-600 animate-spin mx-auto" />
              <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                Chef Malu criando receitas para salvar seus ingredientes...
              </p>
              <p className="text-xs text-zinc-500">
                Priorizando alimentos com prazo iminente para zero desperdício e máxima nutrição.
              </p>
            </div>
          )}

          {!generatingRecipes && suggestedRecipes.length === 0 && (
            <div className="text-center py-10 bg-zinc-50 dark:bg-zinc-800/40 rounded-2xl border border-zinc-200 dark:border-zinc-700 p-8 space-y-3">
              <Utensils className="w-10 h-10 text-amber-500 mx-auto" />
              <h4 className="font-semibold text-sm text-zinc-800 dark:text-zinc-200">
                Pronto para transformar sua despensa em refeições deliciosas?
              </h4>
              <p className="text-xs text-zinc-500 max-w-md mx-auto">
                Clique no botão abaixo para analisar os itens cadastrados e gerar receitas inteligentes de aproveitamento.
              </p>
              <button
                onClick={handleGenerateExpiringRecipes}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold transition"
              >
                Gerar Sugestões Anti-Desperdício
              </button>
            </div>
          )}

          {!generatingRecipes && suggestedRecipes.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {suggestedRecipes.map((recipe) => (
                <div
                  key={recipe.id}
                  className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-sm hover:shadow-md transition space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200/60">
                            ⭐ Aproveitamento: {recipe.zeroWasteScore}%
                          </span>
                          <span className="text-xs text-zinc-400 font-medium">
                            ⏱️ {recipe.prepTime} • {recipe.difficulty}
                          </span>
                        </div>
                        <h4 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
                          {recipe.title}
                        </h4>
                      </div>
                    </div>

                    <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
                      {recipe.description}
                    </p>

                    {/* Rescued Urgent Ingredients Banner */}
                    {recipe.urgentExpiringIngredientsUsed && recipe.urgentExpiringIngredientsUsed.length > 0 && (
                      <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200/70 dark:border-rose-900/40 rounded-xl p-2.5">
                        <span className="text-[10px] font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider block mb-1 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-rose-600" />
                          Ingredientes Urgentes Salvos da Validade:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {recipe.urgentExpiringIngredientsUsed.map((ing, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 rounded-md text-xs font-semibold bg-rose-500 text-white shadow-xs"
                            >
                              ✓ {ing}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Macros */}
                    <div className="grid grid-cols-4 gap-2 text-center text-xs bg-zinc-50 dark:bg-zinc-800/60 p-2.5 rounded-xl border border-zinc-100 dark:border-zinc-800">
                      <div>
                        <span className="text-[10px] text-zinc-400 block">Calorias</span>
                        <span className="font-bold text-zinc-800 dark:text-zinc-200">{recipe.calories} kcal</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-zinc-400 block">Proteína</span>
                        <span className="font-bold text-blue-600 dark:text-blue-400">{recipe.protein}g</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-zinc-400 block">Carbos</span>
                        <span className="font-bold text-amber-600 dark:text-amber-400">{recipe.carbs}g</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-zinc-400 block">Gordura</span>
                        <span className="font-bold text-rose-600 dark:text-rose-400">{recipe.fat}g</span>
                      </div>
                    </div>

                    {/* Ingredients list */}
                    <div className="space-y-1 text-xs">
                      <span className="font-semibold text-zinc-700 dark:text-zinc-300 block">
                        Ingredientes necessários:
                      </span>
                      <ul className="space-y-1 text-zinc-600 dark:text-zinc-400">
                        {recipe.ingredients.map((ing, idx) => (
                          <li key={idx} className="flex items-center gap-1.5">
                            <span className="w-1 h-1 rounded-full bg-emerald-500" />
                            <span>{ing}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Instructions */}
                    <div className="space-y-1 text-xs pt-1 border-t border-zinc-100 dark:border-zinc-800">
                      <span className="font-semibold text-zinc-700 dark:text-zinc-300 block">
                        Modo de Preparo:
                      </span>
                      <ol className="space-y-1.5 text-zinc-600 dark:text-zinc-300">
                        {recipe.instructions.map((step, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="w-4 h-4 rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                              {idx + 1}
                            </span>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ol>
                    </div>

                    {recipe.chefTip && (
                      <p className="text-xs text-amber-800 dark:text-amber-300/90 italic bg-amber-50/50 dark:bg-amber-950/20 p-2.5 rounded-lg border border-amber-200/50">
                        💡 <strong>Dica do Chef:</strong> {recipe.chefTip}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-3 border-t border-zinc-200/60 dark:border-zinc-800">
                    <button
                      id={`cook-recipe-btn-${recipe.id}`}
                      onClick={() => {
                        if (onCookRecipe) {
                          onCookRecipe({
                            id: recipe.id,
                            name: recipe.title,
                            title: recipe.title,
                            description: recipe.description,
                            prepTime: recipe.prepTime,
                            difficulty: recipe.difficulty,
                            calories: recipe.calories,
                            protein: recipe.protein,
                            carbs: recipe.carbs,
                            fat: recipe.fat,
                            ingredients: recipe.ingredients,
                            instructions: recipe.instructions,
                            nutrition: {
                              calories: recipe.calories,
                              protein: recipe.protein,
                              carbs: recipe.carbs,
                              fat: recipe.fat,
                              fiber: 0
                            },
                            imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=600'
                          });
                        } else {
                          alert(`Abrindo modo de preparo para: ${recipe.title}`);
                        }
                      }}
                      className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition"
                    >
                      <ChefHat className="w-4 h-4" />
                      <span>Cozinhar com Modo Cozinha</span>
                    </button>

                    <button
                      id={`consume-recipe-btn-${recipe.id}`}
                      onClick={() => handleMarkAsConsumed(recipe)}
                      className="px-3 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-semibold text-xs flex items-center gap-1 transition"
                      title="Dar baixa nos ingredientes utilizados da despensa"
                    >
                      {consumedSuccessId === recipe.id ? (
                        <Check className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                      <span>{consumedSuccessId === recipe.id ? 'Baixa Efetuada!' : 'Consumir Itens'}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB: WASTE CALCULATOR */}
      {activeTab === 'waste' && (
        <div className="space-y-4">
          <FoodWasteCalculator 
            items={pantryItems} 
            profile={profile} 
            onCookRecipe={onCookRecipe} 
            onItemsUpdated={loadPantryItems} 
          />
        </div>
      )}

      {/* TAB: ADVISOR (DÚVIDAS DO CHEF) */}
      {activeTab === 'advisor' && (
        <div className="space-y-4">
          <AiCookingAdvisor profile={profile} />
        </div>
      )}

      {/* TAB: PANTRY FRESHNESS (CONTROLE DE VALIDADES & NOTIFICAÇÕES) */}
      {activeTab === 'freshness' && (
        <div className="space-y-4">
          <PantryFreshness 
            profile={profile} 
            onCookRecipe={onCookRecipe} 
          />
        </div>
      )}
      {/* =================================================================== */}
      {/* MODAL: QUICK ADD BY VOICE COMMAND                                  */}
      {/* =================================================================== */}
      {showVoiceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-6 max-w-lg w-full shadow-2xl space-y-5 relative overflow-hidden">
            {/* Ambient background glow */}
            <div className="absolute -top-16 -right-16 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

            {/* Modal Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                  <Mic className="w-5 h-5 animate-pulse" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                    Adicionar Alimento por Voz
                  </h3>
                  <p className="text-xs text-zinc-500">
                    Diga o nome e a porção ou quantidade
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  stopVoiceCommand();
                  setShowVoiceModal(false);
                }}
                className="p-1.5 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition cursor-pointer"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Microphone Listening Status Box */}
            <div className={`p-6 rounded-2xl border text-center space-y-4 transition-all ${
              isVoiceListening
                ? 'bg-gradient-to-b from-emerald-500/15 via-emerald-500/5 to-transparent border-emerald-400 dark:border-emerald-600 ring-2 ring-emerald-400/20 shadow-inner'
                : 'bg-zinc-50 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-700/60'
            }`}>
              {/* Animated Mic Wave */}
              <div className="relative inline-flex items-center justify-center">
                {isVoiceListening && (
                  <>
                    <span className="animate-ping absolute inline-flex h-20 w-20 rounded-full bg-emerald-400/30" />
                    <span className="animate-pulse absolute inline-flex h-16 w-16 rounded-full bg-emerald-500/20" />
                  </>
                )}
                <button
                  type="button"
                  onClick={isVoiceListening ? stopVoiceCommand : startVoiceCommand}
                  className={`relative z-10 w-16 h-16 rounded-full flex items-center justify-center transition-transform active:scale-90 cursor-pointer shadow-lg ${
                    isVoiceListening
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-emerald-500/30 animate-pulse'
                      : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 hover:bg-emerald-500 hover:text-white'
                  }`}
                  title={isVoiceListening ? 'Toque para pausar' : 'Toque para falar'}
                >
                  <Mic className="w-7 h-7" />
                </button>
              </div>

              <div className="space-y-1">
                <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                  {isVoiceListening ? 'Ouvindo você... Fale agora' : 'Microfone em espera'}
                </p>
                <p className="text-[11px] text-zinc-500">
                  Exemplos: "500g de peito de frango na geladeira", "1 dúzia de ovos", "2 litros de leite", "1 pacote de arroz integral"
                </p>
              </div>

              {/* Live Transcript Display */}
              {voiceTranscript && (
                <div className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-emerald-200 dark:border-emerald-800/60 text-xs font-medium text-emerald-800 dark:text-emerald-300 italic shadow-xs">
                  "{voiceTranscript}"
                </div>
              )}

              {voiceError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 font-medium">
                  {voiceError}
                </div>
              )}
            </div>

            {/* Parsed Ingredient Preview Card */}
            {parsedVoiceItem && (
              <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    Alimento Identificado:
                  </span>
                  <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                    Validade sugerida: {parsedVoiceItem.expirationDate ? new Date(parsedVoiceItem.expirationDate).toLocaleDateString('pt-BR') : ''}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="text-[11px] font-semibold text-zinc-500 block mb-0.5">Nome do Alimento</label>
                    <input
                      type="text"
                      value={parsedVoiceItem.name}
                      onChange={(e) => setParsedVoiceItem({ ...parsedVoiceItem, name: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-bold text-zinc-900 dark:text-zinc-100"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-zinc-500 block mb-0.5">Quantidade / Porção</label>
                    <input
                      type="text"
                      value={parsedVoiceItem.quantity}
                      onChange={(e) => setParsedVoiceItem({ ...parsedVoiceItem, quantity: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-bold text-zinc-900 dark:text-zinc-100"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-zinc-500 block mb-0.5">Categoria</label>
                    <select
                      value={parsedVoiceItem.category}
                      onChange={(e) => setParsedVoiceItem({ ...parsedVoiceItem, category: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-semibold text-zinc-900 dark:text-zinc-100"
                    >
                      {CATEGORIES.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-zinc-500 block mb-0.5">Local de Guarda</label>
                    <select
                      value={parsedVoiceItem.storageLocation}
                      onChange={(e) => setParsedVoiceItem({ ...parsedVoiceItem, storageLocation: e.target.value as any })}
                      className="w-full px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-semibold text-zinc-900 dark:text-zinc-100"
                    >
                      <option value="geladeira">Geladeira</option>
                      <option value="despensa">Despensa Seca</option>
                      <option value="freezer">Freezer</option>
                    </select>
                  </div>
                </div>

                {/* Confirm Action Button */}
                <button
                  id="btn-confirm-voice-item"
                  type="button"
                  onClick={handleConfirmVoiceItem}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-950/20 transition active:scale-98 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Confirmar & Salvar na Despensa</span>
                </button>
              </div>
            )}

            {/* Quick Helper Tips & Actions */}
            <div className="flex items-center justify-between text-xs pt-1">
              <button
                type="button"
                onClick={() => {
                  setVoiceTranscript('');
                  setParsedVoiceItem(null);
                  startVoiceCommand();
                }}
                className="text-zinc-500 hover:text-emerald-600 dark:hover:text-emerald-400 flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Limpar e Ditar Novamente</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  stopVoiceCommand();
                  setShowVoiceModal(false);
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
