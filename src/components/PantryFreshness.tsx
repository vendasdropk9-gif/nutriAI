import React, { useState, useEffect, useMemo } from 'react';
import { 
  AlertTriangle, Clock, Calendar, CheckCircle2, PlusCircle, 
  Trash2, Bell, Sparkles, ChefHat, RefreshCw, 
  Check, HelpCircle, Flame, ShieldAlert, ArrowRight,
  TrendingDown, Heart, Apple, Package, BarChart3, ShoppingBag,
  Info, ChevronDown, ChevronUp, Layers
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer, 
  Cell, 
  CartesianGrid 
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { PantryItem, UserProfile, Recipe } from '../types';
import { auth, db, doc, setDoc, getDoc, collection, getDocs, deleteDoc } from '../lib/firebase';
import { playSfx, vibrate } from '../lib/sensory';
import { useTranslation } from '../contexts/LanguageContext';
import { 
  calculatePantryDaysRemaining, 
  sendPantryExpirationNotification, 
  checkPantrySpoilage 
} from '../hooks/usePantrySpoilageChecker';
import { requestNotificationPermission, getNotificationPermission } from '../lib/pushScheduler';

interface PantryFreshnessProps {
  profile?: UserProfile | null;
  onCookRecipe?: (recipe: Recipe) => void;
  onNavigateToTab?: (tab: string) => void;
}

const CATEGORIES = [
  'Proteínas & Carnes',
  'Laticínios & Ovos',
  'Vegetais & Frutas',
  'Grãos & Massas',
  'Temperos & Molhos',
  'Bebidas',
  'Padaria & Pães',
  'Outros'
];

const STORAGE_LOCATIONS: ('despensa' | 'geladeira' | 'freezer')[] = ['geladeira', 'despensa', 'freezer'];

const PRESET_DAYS = [
  { label: '+1 dia (Amanhã)', days: 1, urgency: 'high' },
  { label: '+3 dias', days: 3, urgency: 'high' },
  { label: '+7 dias (1 sem)', days: 7, urgency: 'med' },
  { label: '+15 dias (2 sem)', days: 15, urgency: 'low' },
  { label: '+30 dias (1 mês)', days: 30, urgency: 'low' },
  { label: '+90 dias (3 meses)', days: 90, urgency: 'low' }
];

export const PantryFreshness: React.FC<PantryFreshnessProps> = ({ 
  profile, 
  onCookRecipe,
  onNavigateToTab 
}) => {
  const { t } = useTranslation();
  const [items, setItems] = useState<PantryItem[]>([]);
  const [loading, setLoading] = useState(false);
  type FreshnessFilter = 'all' | 'urgent' | 'expired' | 'fresh' | 'this_week' | 'next_week' | 'long_term' | 'low_stock';
  const [filter, setFilter] = useState<FreshnessFilter>('all');
  const [locationFilter, setLocationFilter] = useState<'all' | 'geladeira' | 'despensa' | 'freezer'>('all');
  const [lowStockThreshold, setLowStockThreshold] = useState<number>(() => {
    return Number(localStorage.getItem('nutri_pantry_low_stock_threshold') || 1);
  });
  const [isChartExpanded, setIsChartExpanded] = useState(true);
  const [hoveredTimeframe, setHoveredTimeframe] = useState<string | null>(null);
  const [notificationStatus, setNotificationStatus] = useState<NotificationPermission | 'unsupported'>('default');
  const [isTestingNotification, setIsTestingNotification] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('1 unidade');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [storageLocation, setStorageLocation] = useState<'despensa' | 'geladeira' | 'freezer'>('geladeira');
  const [expirationDate, setExpirationDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 5);
    return d.toISOString().split('T')[0];
  });
  const [consumedCount, setConsumedCount] = useState<number>(() => {
    return Number(localStorage.getItem('nutri_consumed_fresh_count') || 0);
  });

  // Check notification permission
  useEffect(() => {
    setNotificationStatus(getNotificationPermission());
  }, []);

  // Load items from Firestore & LocalStorage
  const loadItems = async () => {
    setLoading(true);
    let loaded: PantryItem[] = [];

    // LocalStorage fallback
    try {
      const local = localStorage.getItem('nutri_pantry_items');
      if (local) {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed)) loaded = parsed;
      }
    } catch (e) {}

    // Firestore
    try {
      const user = auth.currentUser || (profile?.id ? { uid: profile.id } : null);
      if (user) {
        const snap = await getDocs(collection(db, `users/${user.uid}/pantryItems`));
        if (!snap.empty) {
          const remote = snap.docs.map(d => ({ id: d.id, ...d.data() } as PantryItem));
          const seen = new Set(remote.map(r => r.id));
          loaded = [...remote, ...loaded.filter(l => !seen.has(l.id))];
        }
      }
    } catch (err) {
      console.warn('[PantryFreshness] Erro ao carregar itens:', err);
    }

    // Default starter items if completely empty
    if (loaded.length === 0) {
      loaded = [
        {
          id: 'fresh-demo-1',
          name: 'Iogurte Natural Desnatado',
          quantity: '2 potes',
          category: 'Laticínios & Ovos',
          expirationDate: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0],
          daysRemaining: 2,
          status: 'perto_vencimento',
          storageLocation: 'geladeira',
          addedAt: new Date().toISOString()
        },
        {
          id: 'fresh-demo-2',
          name: 'Peito de Frango em Cubos',
          quantity: '500g',
          category: 'Proteínas & Carnes',
          expirationDate: new Date(Date.now() + 1 * 86400000).toISOString().split('T')[0],
          daysRemaining: 1,
          status: 'perto_vencimento',
          storageLocation: 'geladeira',
          addedAt: new Date().toISOString()
        },
        {
          id: 'fresh-demo-3',
          name: 'Cenouras Orgânicas',
          quantity: '4 unidades',
          category: 'Vegetais & Frutas',
          expirationDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
          daysRemaining: 7,
          status: 'fresco',
          storageLocation: 'geladeira',
          addedAt: new Date().toISOString()
        }
      ];
      localStorage.setItem('nutri_pantry_items', JSON.stringify(loaded));
    }

    // Update remaining days and status dynamically
    const updated = loaded.map(item => {
      const days = calculatePantryDaysRemaining(item.expirationDate);
      let status: 'vencido' | 'perto_vencimento' | 'fresco' = 'fresco';
      if (days < 0) status = 'vencido';
      else if (days <= 3) status = 'perto_vencimento';

      return {
        ...item,
        daysRemaining: days,
        status
      };
    }).sort((a, b) => a.daysRemaining - b.daysRemaining);

    setItems(updated);
    setLoading(false);
  };

  useEffect(() => {
    loadItems();

    // Listen to updates from other tabs
    const handleUpdate = () => loadItems();
    window.addEventListener('pantry:updated', handleUpdate);
    return () => window.removeEventListener('pantry:updated', handleUpdate);
  }, [profile?.id]);

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    playSfx('tap');
    vibrate(15);

    const days = calculatePantryDaysRemaining(expirationDate);
    let status: 'vencido' | 'perto_vencimento' | 'fresco' = 'fresco';
    if (days < 0) status = 'vencido';
    else if (days <= 3) status = 'perto_vencimento';

    const newItem: PantryItem = {
      id: 'pantry-' + Date.now(),
      name: name.trim(),
      quantity: quantity.trim() || '1 unidade',
      category,
      storageLocation,
      expirationDate,
      daysRemaining: days,
      status,
      addedAt: new Date().toISOString()
    };

    const newItems = [newItem, ...items].sort((a, b) => a.daysRemaining - b.daysRemaining);
    setItems(newItems);
    localStorage.setItem('nutri_pantry_items', JSON.stringify(newItems));
    window.dispatchEvent(new CustomEvent('pantry:updated'));

    // Save to Firestore
    try {
      const user = auth.currentUser || (profile?.id ? { uid: profile.id } : null);
      if (user) {
        await setDoc(doc(db, `users/${user.uid}/pantryItems/${newItem.id}`), newItem);
      }
    } catch (err) {
      console.warn('[PantryFreshness] Erro ao sincronizar item:', err);
    }

    // Reset Form
    setName('');
    setQuantity('1 unidade');
    setIsFormOpen(false);
    setFeedbackMessage(`"${newItem.name}" adicionado com validade monitorada!`);
    setTimeout(() => setFeedbackMessage(null), 3500);

    // If item is already nearing expiration (<= 3 days), trigger notification check
    if (days <= 3) {
      sendPantryExpirationNotification([newItem], { force: true });
    }
  };

  const handleMarkConsumed = async (item: PantryItem) => {
    playSfx('success');
    vibrate([50, 50, 100]);

    const updated = items.filter(i => i.id !== item.id);
    setItems(updated);
    localStorage.setItem('nutri_pantry_items', JSON.stringify(updated));

    const newConsumed = consumedCount + 1;
    setConsumedCount(newConsumed);
    localStorage.setItem('nutri_consumed_fresh_count', String(newConsumed));

    setFeedbackMessage(`🎉 Parabéns! "${item.name}" consumido a tempo, evitando desperdício de alimento!`);
    setTimeout(() => setFeedbackMessage(null), 4000);

    window.dispatchEvent(new CustomEvent('pantry:updated'));

    try {
      const user = auth.currentUser || (profile?.id ? { uid: profile.id } : null);
      if (user) {
        await deleteDoc(doc(db, `users/${user.uid}/pantryItems/${item.id}`));
      }
    } catch (err) {}
  };

  const handleDeleteItem = async (itemId: string) => {
    playSfx('pop');
    vibrate(15);
    const updated = items.filter(i => i.id !== itemId);
    setItems(updated);
    localStorage.setItem('nutri_pantry_items', JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('pantry:updated'));

    try {
      const user = auth.currentUser || (profile?.id ? { uid: profile.id } : null);
      if (user) {
        await deleteDoc(doc(db, `users/${user.uid}/pantryItems/${itemId}`));
      }
    } catch (err) {}
  };

  const handleRequestPushPermission = async () => {
    playSfx('tap');
    const perm = await requestNotificationPermission();
    setNotificationStatus(perm);
    if (perm === 'granted') {
      playSfx('success');
      setFeedbackMessage('🔔 Notificações ativadas! Você será avisado quando os alimentos estiverem perto de vencer.');
      setTimeout(() => setFeedbackMessage(null), 4000);
      // Run immediate check
      checkPantrySpoilage(profile, { force: true });
    } else {
      setFeedbackMessage('Permissão de notificação negada ou não autorizada no navegador.');
      setTimeout(() => setFeedbackMessage(null), 3500);
    }
  };

  const handleTestNotification = async () => {
    setIsTestingNotification(true);
    playSfx('tap');
    vibrate(12);

    const urgentItems = items.filter(i => i.daysRemaining <= 3 && i.daysRemaining >= 0);
    const targetItems = urgentItems.length > 0 ? urgentItems : items.slice(0, 2);

    const sent = await sendPantryExpirationNotification(targetItems, { force: true });
    setIsTestingNotification(false);

    if (sent) {
      setFeedbackMessage('🔔 Notificação enviada com sucesso! Verifique a barra de notificações do seu sistema.');
    } else {
      setFeedbackMessage('Aviso gerado na tela! Para push nativo no sistema, permita as notificações no botão acima.');
    }
    setTimeout(() => setFeedbackMessage(null), 4500);
  };

  const setPresetDate = (daysToAdd: number) => {
    const d = new Date();
    d.setDate(d.getDate() + daysToAdd);
    setExpirationDate(d.toISOString().split('T')[0]);
  };

  const parseItemQuantityNumber = (qtyStr: string): number => {
    if (!qtyStr) return 1;
    const match = qtyStr.match(/(\d+[\.,]?\d*)/);
    if (match) {
      return parseFloat(match[1].replace(',', '.'));
    }
    return 1;
  };

  const isItemLowStock = (item: PantryItem): boolean => {
    const num = parseItemQuantityNumber(item.quantity);
    return num <= lowStockThreshold;
  };

  const urgentItems = items.filter(i => i.daysRemaining >= 0 && i.daysRemaining <= 3);
  const expiredItems = items.filter(i => i.daysRemaining < 0);
  const thisWeekItems = items.filter(i => i.daysRemaining >= 4 && i.daysRemaining <= 7);
  const nextWeekItems = items.filter(i => i.daysRemaining >= 8 && i.daysRemaining <= 14);
  const longTermItems = items.filter(i => i.daysRemaining > 14);
  const freshItems = items.filter(i => i.daysRemaining > 3);
  const lowStockItems = items.filter(i => isItemLowStock(i));

  const handleAddToShoppingList = async (item: PantryItem) => {
    playSfx('success');
    vibrate(20);

    let existingCustom: Array<{ name: string; checked: boolean; [k: string]: any }> = [];
    try {
      const raw = localStorage.getItem('nutri-shopping-custom-items');
      if (raw) existingCustom = JSON.parse(raw);
    } catch (e) {}

    let checkedMap: Record<string, boolean> = {};
    try {
      const rawChecked = localStorage.getItem('nutri-shopping-checked');
      if (rawChecked) checkedMap = JSON.parse(rawChecked);
    } catch (e) {}

    const cleanName = item.name.trim();
    checkedMap[cleanName] = false;

    const exists = existingCustom.some(i => i.name.toLowerCase() === cleanName.toLowerCase());
    let updatedList = existingCustom;

    if (!exists) {
      const newItem = {
        id: `shop_pantry_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        name: cleanName,
        quantity: item.quantity,
        checked: false,
        addedAt: new Date().toISOString(),
        source: 'pantry-low-stock'
      };
      updatedList = [...existingCustom, newItem];

      try {
        const targetUid = auth.currentUser?.uid || profile?.id;
        if (targetUid) {
          await setDoc(doc(db, 'users', targetUid, 'shoppingList', newItem.id), newItem, { merge: true });
        }
      } catch (err) {}
    }

    localStorage.setItem('nutri-shopping-custom-items', JSON.stringify(updatedList));
    localStorage.setItem('nutri-shopping-checked', JSON.stringify(checkedMap));
    window.dispatchEvent(new CustomEvent('nutri:shopping-list-updated'));

    setFeedbackMessage(`🛒 "${item.name}" adicionado à Lista de Compras!`);
    setTimeout(() => setFeedbackMessage(null), 3500);
  };

  const handleAddAllLowStockToShoppingList = async () => {
    if (lowStockItems.length === 0) return;
    playSfx('success');
    vibrate([40, 40, 80]);

    let existingCustom: Array<{ name: string; checked: boolean; [k: string]: any }> = [];
    try {
      const raw = localStorage.getItem('nutri-shopping-custom-items');
      if (raw) existingCustom = JSON.parse(raw);
    } catch (e) {}

    let checkedMap: Record<string, boolean> = {};
    try {
      const rawChecked = localStorage.getItem('nutri-shopping-checked');
      if (rawChecked) checkedMap = JSON.parse(rawChecked);
    } catch (e) {}

    const existingNames = new Set(existingCustom.map(i => i.name.toLowerCase().trim()));
    const newItemsCreated: any[] = [];

    lowStockItems.forEach((item, idx) => {
      const cleanName = item.name.trim();
      checkedMap[cleanName] = false;
      if (!existingNames.has(cleanName.toLowerCase())) {
        const newItem = {
          id: `shop_pantry_batch_${Date.now()}_${idx}`,
          name: cleanName,
          quantity: item.quantity,
          checked: false,
          addedAt: new Date().toISOString(),
          source: 'pantry-low-stock-batch'
        };
        newItemsCreated.push(newItem);
        existingNames.add(cleanName.toLowerCase());
      }
    });

    const updatedList = [...existingCustom, ...newItemsCreated];
    localStorage.setItem('nutri-shopping-custom-items', JSON.stringify(updatedList));
    localStorage.setItem('nutri-shopping-checked', JSON.stringify(checkedMap));
    window.dispatchEvent(new CustomEvent('nutri:shopping-list-updated'));

    try {
      const targetUid = auth.currentUser?.uid || profile?.id;
      if (targetUid) {
        for (const newItem of newItemsCreated) {
          await setDoc(doc(db, 'users', targetUid, 'shoppingList', newItem.id), newItem, { merge: true });
        }
      }
    } catch (err) {}

    setFeedbackMessage(`🛒 ${newItemsCreated.length} itens com estoque baixo adicionados à Lista de Compras!`);
    setTimeout(() => setFeedbackMessage(null), 4000);
  };

  // Filtered items
  const filteredItems = items.filter(item => {
    if (locationFilter !== 'all' && item.storageLocation !== locationFilter) return false;
    if (filter === 'urgent') return item.daysRemaining >= 0 && item.daysRemaining <= 3;
    if (filter === 'expired') return item.daysRemaining < 0;
    if (filter === 'fresh') return item.daysRemaining > 3;
    if (filter === 'this_week') return item.daysRemaining >= 4 && item.daysRemaining <= 7;
    if (filter === 'next_week') return item.daysRemaining >= 8 && item.daysRemaining <= 14;
    if (filter === 'long_term') return item.daysRemaining > 14;
    if (filter === 'low_stock') return isItemLowStock(item);
    return true;
  });

  // Timeframe Distribution for Recharts & Meal Rotation Planning
  const timeframeData = useMemo(() => {
    return [
      {
        key: 'expired',
        filterKey: 'expired' as const,
        timeframe: 'Vencidos',
        shortName: 'Vencidos (<0d)',
        range: '< 0 dias',
        count: expiredItems.length,
        color: '#f59e0b', // amber-500
        bgGradient: 'from-amber-500/20 to-amber-600/10',
        borderColor: 'border-amber-400/40',
        textColor: 'text-amber-500 dark:text-amber-400',
        description: 'Passaram da validade',
        recommendation: 'Inspecione antes do consumo ou descarte.',
        items: expiredItems
      },
      {
        key: 'urgent',
        filterKey: 'urgent' as const,
        timeframe: 'Crítico (0-3d)',
        shortName: '0 - 3 dias',
        range: 'Hoje a 3 dias',
        count: urgentItems.length,
        color: '#f43f5e', // rose-500
        bgGradient: 'from-rose-500/20 to-rose-600/10',
        borderColor: 'border-rose-400/40',
        textColor: 'text-rose-500 dark:text-rose-400',
        description: 'Prioridade máxima de consumo',
        recommendation: 'Planeje as próximas refeições com estes itens.',
        items: urgentItems
      },
      {
        key: 'this_week',
        filterKey: 'this_week' as const,
        timeframe: 'Esta Semana (4-7d)',
        shortName: '4 - 7 dias',
        range: '4 a 7 dias',
        count: thisWeekItems.length,
        color: '#f97316', // orange-500
        bgGradient: 'from-orange-500/20 to-orange-600/10',
        borderColor: 'border-orange-400/40',
        textColor: 'text-orange-500 dark:text-orange-400',
        description: 'Consumo nos próximos dias',
        recommendation: 'Insira no cardápio antes de comprar mais perecíveis.',
        items: thisWeekItems
      },
      {
        key: 'next_week',
        filterKey: 'next_week' as const,
        timeframe: 'Próx. Semana (8-14d)',
        shortName: '8 - 14 dias',
        range: '8 a 14 dias',
        count: nextWeekItems.length,
        color: '#0d9488', // teal-600
        bgGradient: 'from-teal-500/20 to-teal-600/10',
        borderColor: 'border-teal-400/40',
        textColor: 'text-teal-600 dark:text-teal-400',
        description: 'Média rotatividade',
        recommendation: 'Janela ideal para programar o próximo ciclo de feira/mercado.',
        items: nextWeekItems
      },
      {
        key: 'long_term',
        filterKey: 'long_term' as const,
        timeframe: 'Longo Prazo (15d+)',
        shortName: '15+ dias',
        range: 'Mais de 15 dias',
        count: longTermItems.length,
        color: '#10b981', // emerald-500
        bgGradient: 'from-emerald-500/20 to-emerald-600/10',
        borderColor: 'border-emerald-400/40',
        textColor: 'text-emerald-600 dark:text-emerald-400',
        description: 'Despensa e congelados estáveis',
        recommendation: 'Estoque seguro; sem urgência iminente de consumo.',
        items: longTermItems
      }
    ];
  }, [expiredItems, urgentItems, thisWeekItems, nextWeekItems, longTermItems]);

  const CustomTimeframeTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900/95 dark:bg-slate-950/95 backdrop-blur-md border border-slate-700/80 rounded-2xl p-3.5 shadow-2xl text-white max-w-xs z-50 text-left">
          <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2 mb-2">
            <span className="font-bold text-xs flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: data.color }} />
              {data.timeframe}
            </span>
            <span className="px-2 py-0.5 rounded-md bg-white/10 text-[11px] font-bold">
              {data.count} {data.count === 1 ? 'item' : 'itens'}
            </span>
          </div>
          <p className="text-[11px] text-slate-300 mb-1.5">
            {data.description} ({data.range})
          </p>
          <p className="text-[10px] text-emerald-400 font-medium">
            💡 {data.recommendation}
          </p>
          {data.items && data.items.length > 0 && (
            <div className="mt-2 pt-2 border-t border-slate-800/80">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block mb-1">
                Alimentos nesta faixa:
              </span>
              <div className="flex flex-wrap gap-1">
                {data.items.slice(0, 3).map((it: PantryItem) => (
                  <span key={it.id} className="text-[10px] bg-slate-800 text-slate-200 px-1.5 py-0.5 rounded">
                    {it.name}
                  </span>
                ))}
                {data.items.length > 3 && (
                  <span className="text-[10px] text-slate-400 self-center">
                    +{data.items.length - 3} mais
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-800 via-teal-900 to-slate-900 p-6 sm:p-8 text-white shadow-xl border border-emerald-500/20">
        <div className="absolute right-0 top-0 -mt-10 -mr-10 w-72 h-72 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2.5">
              <span className="p-2.5 rounded-2xl bg-white/10 backdrop-blur-md text-emerald-300 shadow-inner">
                <Apple className="w-6 h-6" />
              </span>
              <h2 className="text-2xl sm:text-3xl font-serif font-bold tracking-tight">
                Frescor & Validades da Cozinha
              </h2>
            </div>
            <p className="text-sm text-emerald-100/90 leading-relaxed">
              Monitore a validade de ingredientes da geladeira e despensa. Nosso sistema verifica periodicamente as datas e dispara notificações push para evitar desperdício de comida e economizar dinheiro.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                playSfx('pop');
                setIsFormOpen(!isFormOpen);
              }}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 active:scale-95 text-white font-bold text-xs shadow-lg shadow-emerald-950/30 flex items-center gap-2 transition-all cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{isFormOpen ? 'Fechar Formulário' : 'Cadastrar Validade'}</span>
            </button>

            <button
              type="button"
              onClick={handleTestNotification}
              disabled={isTestingNotification}
              className="px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white font-bold text-xs backdrop-blur-md border border-white/20 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              title="Disparar verificação de expiração e notificação de teste"
            >
              <Bell className="w-4 h-4 text-amber-300" />
              <span>Verificar & Notificar</span>
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-6 pt-5 border-t border-white/10 text-xs">
          <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-sm">
            <span className="text-emerald-200/80 block text-[11px] font-medium">Itens Monitorados</span>
            <span className="text-xl font-bold text-white mt-0.5 block">{items.length} itens</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-amber-500/20 backdrop-blur-sm border border-amber-400/30">
            <div className="flex items-center justify-between">
              <span className="text-amber-200 text-[11px] font-medium">Estoque Baixo</span>
              {lowStockItems.length > 0 && <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />}
            </div>
            <span className="text-xl font-bold text-amber-300 mt-0.5 block">{lowStockItems.length} itens</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-rose-500/20 backdrop-blur-sm border border-rose-400/30">
            <div className="flex items-center justify-between">
              <span className="text-rose-200 text-[11px] font-medium">Vencendo em breve</span>
              {urgentItems.length > 0 && <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping" />}
            </div>
            <span className="text-xl font-bold text-rose-300 mt-0.5 block">{urgentItems.length} urgentes</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-amber-500/15 backdrop-blur-sm border border-amber-400/20">
            <span className="text-amber-200 text-[11px] font-medium">Já Vencidos</span>
            <span className="text-xl font-bold text-amber-300 mt-0.5 block">{expiredItems.length} itens</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-emerald-500/20 backdrop-blur-sm border border-emerald-400/30">
            <span className="text-emerald-200 text-[11px] font-medium">Salvos do Desperdício</span>
            <span className="text-xl font-bold text-emerald-300 mt-0.5 block">{consumedCount} consumidos</span>
          </div>
        </div>

        {/* Low Stock Threshold & Batch Action Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-4 pt-4 border-t border-white/10 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-emerald-200 font-medium">Limiar de Alerta (Qtd ≤):</span>
            <div className="flex items-center gap-1">
              {[1, 2, 3].map(val => (
                <button
                  key={val}
                  type="button"
                  onClick={() => {
                    setLowStockThreshold(val);
                    localStorage.setItem('nutri_pantry_low_stock_threshold', String(val));
                    playSfx('tap');
                  }}
                  className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-colors cursor-pointer ${
                    lowStockThreshold === val
                      ? 'bg-emerald-500 text-white shadow-sm'
                      : 'bg-white/10 text-white/80 hover:bg-white/20'
                  }`}
                >
                  {val} {val === 1 ? 'unidade' : 'unidades'}
                </button>
              ))}
            </div>
          </div>

          {lowStockItems.length > 0 && (
            <button
              type="button"
              onClick={handleAddAllLowStockToShoppingList}
              className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-bold text-xs shadow-md shadow-amber-500/20 flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Adicionar Todos ({lowStockItems.length}) à Lista de Compras</span>
            </button>
          )}
        </div>
      </div>

      {/* Push Notification Banner if Default */}
      {notificationStatus !== 'granted' && notificationStatus !== 'unsupported' && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500 text-white shadow-md">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">
                Ative Notificações Push de Validade
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Receba alertas nativos no celular ou computador 3 dias antes dos seus alimentos vencerem.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleRequestPushPermission}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-bold text-xs shadow-md shadow-amber-500/20 transition-all cursor-pointer whitespace-nowrap self-start sm:self-auto"
          >
            Ativar Alertas Push
          </button>
        </div>
      )}

      {/* Feedback Toast */}
      <AnimatePresence>
        {feedbackMessage && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            className="p-3.5 rounded-2xl bg-slate-900 text-white dark:bg-slate-800 border border-emerald-500/30 shadow-xl flex items-center justify-between gap-3 text-xs font-medium"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>{feedbackMessage}</span>
            </div>
            <button
              onClick={() => setFeedbackMessage(null)}
              className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
            >
              <Check className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* New Item Form Modal / Drawer */}
      <AnimatePresence>
        {isFormOpen && (
          <motion.form
            initial={{ opacity: 0, height: 0, y: -10 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -10 }}
            onSubmit={handleSaveItem}
            className="p-6 rounded-3xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 shadow-xl space-y-5 overflow-hidden"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-emerald-500" />
                <h3 className="font-serif font-bold text-base text-slate-800 dark:text-slate-100">
                  Cadastrar Validade de Item
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                Cancelar
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Item Name */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wide">
                  Nome do Alimento *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Queijo Minas Frescal, Leite, Frango..."
                  className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500/30"
                />
              </div>

              {/* Quantity */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wide">
                  Quantidade / Porção
                </label>
                <input
                  type="text"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="Ex: 500g, 1 garrafa, 6 ovos..."
                  className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500/30"
                />
              </div>

              {/* Category */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wide">
                  Categoria
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500/30"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Storage Location */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wide">
                  Onde está guardado?
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {STORAGE_LOCATIONS.map(loc => (
                    <button
                      key={loc}
                      type="button"
                      onClick={() => setStorageLocation(loc)}
                      className={`p-2.5 rounded-xl text-xs font-bold capitalize transition-all ${
                        storageLocation === loc
                          ? 'bg-emerald-500 text-white shadow-sm'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                      }`}
                    >
                      {loc}
                    </button>
                  ))}
                </div>
              </div>

              {/* Expiration Date */}
              <div className="sm:col-span-2 space-y-1.5">
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wide">
                  Data de Vencimento *
                </label>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <input
                    type="date"
                    required
                    value={expirationDate}
                    onChange={(e) => setExpirationDate(e.target.value)}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500/30"
                  />
                  
                  {/* Preset quick buttons */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {PRESET_DAYS.map(preset => (
                      <button
                        key={preset.days}
                        type="button"
                        onClick={() => setPresetDate(preset.days)}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-emerald-100 dark:hover:bg-emerald-950/60 hover:text-emerald-700 text-[11px] font-semibold text-slate-600 dark:text-slate-300 transition-colors"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
              >
                Salvar Validade
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Visualização Gráfica Recharts: Distribuição por Prazo de Validade & Rotação de Compras */}
      <div className="rounded-3xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-md space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <BarChart3 className="w-5 h-5" />
              </span>
              <h3 className="font-serif font-bold text-base sm:text-lg text-slate-800 dark:text-slate-100">
                Distribuição por Prazo de Validade
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-300">
                Rotação & Compras
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Visualização gráfica por faixa de vencimento para apoiar seu planejamento de refeições e compras semanais.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {filter !== 'all' && (
              <button
                type="button"
                onClick={() => {
                  playSfx('tap');
                  vibrate(10);
                  setFilter('all');
                }}
                className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[11px] font-bold text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
              >
                Limpar Filtro ({filter})
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                playSfx('pop');
                setIsChartExpanded(!isChartExpanded);
              }}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
              title={isChartExpanded ? 'Minimizar gráfico' : 'Expandir gráfico'}
            >
              {isChartExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {isChartExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-5"
          >
            {/* Recharts Bar Chart Area */}
            <div className="h-60 sm:h-64 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={timeframeData}
                  margin={{ top: 15, right: 10, left: -20, bottom: 25 }}
                  onClick={(e: any) => {
                    const payload = e?.activePayload?.[0]?.payload;
                    if (payload?.filterKey) {
                      playSfx('tap');
                      vibrate(15);
                      setFilter(prev => prev === payload.filterKey ? 'all' : payload.filterKey);
                    }
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94a3b8" strokeOpacity={0.2} />
                  <XAxis 
                    dataKey="shortName" 
                    stroke="#94a3b8" 
                    fontSize={11} 
                    tickLine={false}
                    axisLine={{ stroke: '#94a3b8', strokeOpacity: 0.3 }}
                    dy={8}
                  />
                  <YAxis 
                    stroke="#94a3b8" 
                    fontSize={11} 
                    allowDecimals={false}
                    tickLine={false}
                    axisLine={{ stroke: '#94a3b8', strokeOpacity: 0.3 }}
                  />
                  <RechartsTooltip content={<CustomTimeframeTooltip />} />
                  <Bar 
                    dataKey="count" 
                    radius={[8, 8, 0, 0]} 
                    cursor="pointer"
                    onMouseEnter={(data: any) => setHoveredTimeframe(data?.key || null)}
                    onMouseLeave={() => setHoveredTimeframe(null)}
                  >
                    {timeframeData.map((entry, index) => {
                      const isSelected = filter === entry.filterKey;
                      const isHovered = hoveredTimeframe === entry.key;
                      return (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.color}
                          opacity={filter === 'all' || isSelected ? (isHovered ? 1 : 0.9) : 0.35}
                          stroke={isSelected ? '#ffffff' : 'none'}
                          strokeWidth={isSelected ? 2 : 0}
                        />
                      );
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Timeframe Interactive Chips */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
              {timeframeData.map(tf => {
                const isSelected = filter === tf.filterKey;
                return (
                  <button
                    key={tf.key}
                    type="button"
                    onClick={() => {
                      playSfx('tap');
                      vibrate(12);
                      setFilter(prev => prev === tf.filterKey ? 'all' : tf.filterKey);
                    }}
                    className={`p-3 rounded-2xl text-left transition-all border cursor-pointer relative overflow-hidden ${
                      isSelected
                        ? `bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-lg ring-2 ring-emerald-500 scale-[1.02]`
                        : `bg-slate-50 dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700`
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: tf.color }} />
                        <span className={`text-[11px] font-bold truncate ${isSelected ? 'text-white dark:text-slate-900' : 'text-slate-700 dark:text-slate-300'}`}>
                          {tf.timeframe}
                        </span>
                      </div>
                      <span 
                        className="px-1.5 py-0.5 rounded-md text-[10px] font-black shrink-0"
                        style={{
                          backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : tf.color + '20',
                          color: isSelected ? 'currentColor' : tf.color
                        }}
                      >
                        {tf.count}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[10px]">
                      <span className={isSelected ? 'text-slate-300 dark:text-slate-600' : 'text-slate-400 dark:text-slate-400'}>
                        {tf.range}
                      </span>
                      {isSelected && (
                        <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-400 dark:text-emerald-600">
                          Filtrado
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Meal Rotation & Smart Shopping Guidance Box */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent border border-emerald-500/25 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <h4 className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-100">
                    Sugestão de Rotação & Compras
                  </h4>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {urgentItems.length > 0 || thisWeekItems.length > 0 ? (
                    <>
                      Você possui <strong className="text-rose-600 dark:text-rose-400">{urgentItems.length} {urgentItems.length === 1 ? 'item urgente' : 'itens urgentes'}</strong> e <strong className="text-orange-600 dark:text-orange-400">{thisWeekItems.length} para esta semana</strong>. Recomendamos consumir estes ingredientes antes de abastecer a despensa/geladeira, evitando desperdício e compras duplicadas.
                    </>
                  ) : (
                    <>
                      Excelente controle! Nenhum item com vencimento iminente nesta semana. Sua despensa e geladeira estão com estoque estável para o próximo ciclo de compras.
                    </>
                  )}
                </p>
              </div>

              {(urgentItems.length > 0 || thisWeekItems.length > 0) && (
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      playSfx('tap');
                      vibrate(15);
                      if (onNavigateToTab) onNavigateToTab('generator');
                      else window.dispatchEvent(new CustomEvent('app:switchTab', { detail: 'generator' }));
                    }}
                    className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 active:scale-95 text-white font-bold text-xs shadow-md shadow-emerald-500/20 flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap"
                  >
                    <ChefHat className="w-3.5 h-3.5" />
                    <span>Cozinhar com Urgentes</span>
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>

      {/* Filter Tabs & Location Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200 dark:border-slate-800">
        {/* Status Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filter === 'all'
                ? 'bg-emerald-500 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Todos ({items.length})
          </button>
          <button
            onClick={() => setFilter('urgent')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              filter === 'urgent'
                ? 'bg-rose-500 text-white shadow-sm'
                : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 hover:bg-rose-100'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Urgentes (≤ 3d) ({urgentItems.length})</span>
          </button>
          <button
            onClick={() => setFilter('this_week')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filter === 'this_week'
                ? 'bg-orange-500 text-white shadow-sm'
                : 'bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-400 hover:bg-orange-100'
            }`}
          >
            Esta Semana ({thisWeekItems.length})
          </button>
          <button
            onClick={() => setFilter('fresh')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filter === 'fresh'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}
          >
            Frescos ({freshItems.length})
          </button>
          {expiredItems.length > 0 && (
            <button
              onClick={() => setFilter('expired')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filter === 'expired'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400'
              }`}
            >
              Vencidos ({expiredItems.length})
            </button>
          )}
          <button
            onClick={() => setFilter('low_stock')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              filter === 'low_stock'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 hover:bg-amber-100'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Estoque Baixo ({lowStockItems.length})</span>
          </button>
        </div>

        {/* Location Filter */}
        <div className="flex items-center gap-1 text-xs">
          <span className="text-slate-400 text-[11px] mr-1 hidden sm:inline">Local:</span>
          {(['all', 'geladeira', 'despensa', 'freezer'] as const).map(loc => (
            <button
              key={loc}
              onClick={() => setLocationFilter(loc)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold capitalize transition-colors ${
                locationFilter === loc
                  ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {loc === 'all' ? 'Todos' : loc}
            </button>
          ))}
        </div>
      </div>

      {/* Items List */}
      {filteredItems.length === 0 ? (
        <div className="py-12 px-6 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 text-center flex flex-col items-center justify-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">
            Nenhum item nesta visualização
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">
            Tudo em ordem! Cadastre os itens recém-comprados para manter a despensa monitorada contra desperdício.
          </p>
          <button
            type="button"
            onClick={() => setIsFormOpen(true)}
            className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            Cadastrar Item Agora
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          <AnimatePresence mode="popLayout">
            {filteredItems.map(item => {
              const isUrgent = item.daysRemaining >= 0 && item.daysRemaining <= 3;
              const isExpired = item.daysRemaining < 0;
              const isLowStock = isItemLowStock(item);

              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                  className={`p-4 rounded-2xl border transition-all ${
                    isExpired
                      ? 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800/60'
                      : isUrgent
                      ? 'bg-rose-50/70 dark:bg-rose-950/25 border-rose-300 dark:border-rose-800/80 shadow-sm'
                      : isLowStock
                      ? 'bg-amber-50/40 dark:bg-amber-950/15 border-amber-200 dark:border-amber-900/40'
                      : 'bg-white dark:bg-slate-850 border-slate-200 dark:border-slate-800 shadow-xs'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-serif font-bold text-sm sm:text-base text-slate-800 dark:text-slate-100 truncate">
                          {item.name}
                        </h4>
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-300 shrink-0">
                          {item.quantity}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                        <span className="capitalize">{item.storageLocation}</span>
                        <span>•</span>
                        <span>{item.category}</span>
                      </div>
                    </div>

                    {/* Expiration & Low Stock Badges */}
                    <div className="shrink-0 text-right flex items-center gap-1.5 justify-end flex-wrap">
                      {isLowStock && (
                        <span className="px-2.5 py-1 rounded-xl bg-amber-500/20 dark:bg-amber-950/60 border border-amber-400/40 text-amber-700 dark:text-amber-300 text-[11px] font-bold flex items-center gap-1">
                          <Package className="w-3 h-3 text-amber-500" />
                          Estoque Baixo
                        </span>
                      )}
                      {isExpired ? (
                        <span className="px-2.5 py-1 rounded-xl bg-amber-500 text-white text-xs font-bold flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Vencido ({Math.abs(item.daysRemaining)}d atrás)
                        </span>
                      ) : isUrgent ? (
                        <span className="px-2.5 py-1 rounded-xl bg-rose-500 text-white text-xs font-bold flex items-center gap-1 animate-pulse shadow-sm shadow-rose-500/20">
                          <Clock className="w-3.5 h-3.5" />
                          {item.daysRemaining === 0 ? 'Vence Hoje!' : item.daysRemaining === 1 ? 'Vence Amanhã!' : `Vence em ${item.daysRemaining} dias`}
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          {item.daysRemaining} dias restantes
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Date details and freshness progress */}
                  <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-[11px] text-slate-400">
                      Validade: <strong>{new Date(item.expirationDate).toLocaleDateString('pt-BR')}</strong>
                    </span>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleAddToShoppingList(item)}
                        className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500 text-amber-700 hover:text-white dark:text-amber-400 dark:hover:text-white font-bold text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                        title="Adicionar à Lista de Compras"
                      >
                        <ShoppingBag className="w-3 h-3" />
                        <span>Comprar</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleMarkConsumed(item)}
                        className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500 text-emerald-700 hover:text-white dark:text-emerald-400 dark:hover:text-white font-bold text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                        title="Marcar como consumido a tempo"
                      >
                        <Check className="w-3 h-3" />
                        <span>Consumido</span>
                      </button>

                      {onCookRecipe && (
                        <button
                          type="button"
                          onClick={() => {
                            if (onNavigateToTab) onNavigateToTab('generator');
                            else window.dispatchEvent(new CustomEvent('app:switchTab', { detail: 'generator' }));
                          }}
                          className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-emerald-500 hover:text-white text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                          title="Cozinhar com este ingrediente"
                        >
                          <ChefHat className="w-3.5 h-3.5" />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleDeleteItem(item.id)}
                        className="p-1.5 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-950/60 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                        title="Remover item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};
