import React, { useState, useEffect, useRef } from 'react';
import { 
  Barcode, PlusCircle, Calendar, AlertTriangle, CheckCircle2, 
  Trash2, Sparkles, ChefHat, Clock, Flame, Loader2, Camera, 
  Upload, Search, Filter, RefreshCw, Layers, ShieldAlert,
  ArrowRight, Utensils, Check, HelpCircle, Package, ArrowDownUp
} from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { analyzeBarcodeProduct, generatePantryExpiringRecipes } from '../lib/gemini';
import { speak } from '../lib/speech';
import { PantryItem, PantryRecipeSuggestion, UserProfile, Recipe } from '../types';
import { AiCookingAdvisor } from './AiCookingAdvisor';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, collection, getDocs, deleteDoc } from 'firebase/firestore';

interface PantryScannerProps {
  profile?: UserProfile | null;
  onCookRecipe?: (recipe: Recipe) => void;
}

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
  const [activeTab, setActiveTab] = useState<'inventory' | 'scan' | 'manual' | 'recipes' | 'advisor'>('inventory');
  const [pantryItems, setPantryItems] = useState<PantryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterLocation, setFilterLocation] = useState<string>('todos');
  const [filterUrgentOnly, setFilterUrgentOnly] = useState(false);

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

  // Initial load from Firestore & localStorage
  useEffect(() => {
    loadPantryItems();
  }, []);

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
      const auth = getAuth();
      const user = auth.currentUser;
      if (user) {
        const db = getFirestore();
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
      const auth = getAuth();
      const user = auth.currentUser;
      if (user) {
        const db = getFirestore();
        for (const item of items) {
          await setDoc(doc(db, `users/${user.uid}/pantryItems/${item.id}`), item, { merge: true });
        }
      }
    } catch (e) {
      console.warn("Aviso ao sincronizar despensa com Firestore:", e);
    }
  };

  const handleAddItem = async (itemData: Omit<PantryItem, 'id' | 'daysRemaining' | 'status' | 'addedAt'>) => {
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

    // Speak confirmation
    speak(`${newItem.name} adicionado à sua ${newItem.storageLocation}.`, { lang: 'pt-BR' });
    
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
      const auth = getAuth();
      const user = auth.currentUser;
      if (user) {
        const db = getFirestore();
        await deleteDoc(doc(db, `users/${user.uid}/pantryItems/${id}`));
      }
    } catch (e) {}
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
              id="generate-expiring-recipes-header-btn"
              onClick={handleGenerateExpiringRecipes}
              disabled={generatingRecipes || pantryItems.length === 0}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold text-xs shadow-lg shadow-amber-950/20 transition transform active:scale-95 disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4 text-amber-100" />
              <span>Sugerir Receitas Anti-Desperdício</span>
              {urgentCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-white text-amber-700 text-[10px] font-bold">
                  {urgentCount} urgente{urgentCount > 1 ? 's' : ''}
                </span>
              )}
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
                    className={`rounded-2xl p-4 border transition duration-200 flex flex-col justify-between ${
                      isUrgent
                        ? 'bg-rose-50/70 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50 shadow-sm'
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

                        {/* Expiration Tag */}
                        <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                          isUrgent
                            ? 'bg-rose-500 text-white animate-pulse'
                            : isWarning
                            ? 'bg-amber-500 text-white'
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        }`}>
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
                      <option key={c} value={c}>{c}</option>
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
          <div className="space-y-1">
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              Cadastrar Mantimento Manualmente
            </h3>
            <p className="text-xs text-zinc-500">
              Insira o nome, porção e a data de validade para controle preventivo de desperdício.
            </p>
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
                    setManualName(item.name);
                    setManualQty(item.defaultQty);
                    setManualCategory(item.category);
                    setManualLocation(item.loc);
                    const exp = new Date(Date.now() + item.days * 86400000).toISOString().split('T')[0];
                    setManualExpiration(exp);
                  }}
                  className="px-2.5 py-1 rounded-lg text-xs bg-zinc-100 hover:bg-emerald-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:text-emerald-700 border border-zinc-200 dark:border-zinc-700 transition"
                >
                  + {item.name}
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
                    <option key={c} value={c}>{c}</option>
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

      {/* TAB: ADVISOR (DÚVIDAS DO CHEF) */}
      {activeTab === 'advisor' && (
        <div className="space-y-4">
          <AiCookingAdvisor profile={profile} />
        </div>
      )}
    </div>
  );
};
