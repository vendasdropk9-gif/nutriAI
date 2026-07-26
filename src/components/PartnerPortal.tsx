import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Store, ShoppingBasket, MapPin, Truck, Clock, CreditCard, 
  ChevronRight, ChevronLeft, CheckCircle2, Upload, Plus, 
  Trash2, Package, TrendingUp, Inbox, Settings, Volume2, 
  Sparkles, Smartphone, LayoutDashboard, Utensils, Search, Edit, Check
} from 'lucide-react';
import { speak } from '../lib/speech';
import { playSfx, vibrate } from '../lib/sensory';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Custom Pin Icon for Leaflet Map
const partnerMarkerIcon = typeof window !== 'undefined' ? L.divIcon({
  className: 'custom-partner-marker',
  html: `<div style="background-color: #10b981; border: 3px solid white; border-radius: 50%; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; color: white; box-shadow: 0 4px 10px rgba(16,185,129,0.4); transform: translate(0, -10px);">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
      <circle cx="12" cy="10" r="3"></circle>
    </svg>
  </div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 36]
}) : null;

function ChangeMapView({ center }: { center: [number, number] }) {
  const map = useMap();
  map.setView(center, 15);
  return null;
}

function MapEventsHandler({ onChange }: { onChange: (latlng: { lat: number; lng: number }) => void }) {
  useMapEvents({
    click(e) {
      onChange({ lat: e.latlng.lat, lng: e.latlng.lng });
    }
  });
  return null;
}

// Robust mock geocoding to find SP neighborhoods or return smart addresses
const getMockAddress = (lat: number, lng: number) => {
  const decLat = Math.abs(lat + 23.5);
  const decLng = Math.abs(lng + 46.6);
  
  if (decLat < 0.1 && decLng < 0.1) {
    return {
      address: `Avenida Lins de Vasconcelos, ${Math.floor(decLat * 10000 + 100)} - Vila Mariana`,
      zip: `04112-010`,
      city: 'São Paulo'
    };
  } else if (decLat < 0.3 && decLng < 0.3) {
    return {
      address: `Alameda Lorena, ${Math.floor(decLat * 5000 + 100)} - Jardins`,
      zip: `01424-001`,
      city: 'São Paulo'
    };
  } else {
    return {
      address: `Avenida Principal, ${Math.floor(decLat * 1200 + 20)} - Centro`,
      zip: `01000-000`,
      city: 'São Paulo'
    };
  }
};

type Step = 'onboarding' | 'business' | 'location' | 'service' | 'products' | 'hours' | 'payment' | 'pending' | 'dashboard';

interface PartnerForm {
  businessName: string;
  responsible: string;
  taxId: string;
  phone: string;
  email: string;
  address: string;
  zip: string;
  city: string;
  delivery: boolean;
  pickup: boolean;
  radius: string;
  fee: string;
  time: string;
  products: { id: string; name: string; price: string; unit: string; description: string; image: string; category: string }[];
  hours: { day: string; open: string; close: string }[];
  payments: string[];
}

export function PartnerPortal() {
  const [step, setStep] = useState<Step>('onboarding');
  const [dashboardTab, setDashboardTab] = useState<'panel' | 'orders' | 'stock' | 'sales' | 'settings'>('panel');
  const [orders, setOrders] = useState([
    { id: '#4401', user: 'Ana Maria', items: 'Combo Detox + 5kg Laranja', total: 'R$ 89,90', status: 'Novo', time: '14:23' },
    { id: '#4402', user: 'Pedro S.', items: 'Abacaxi, Melancia, Uva', total: 'R$ 45,00', status: 'Preparando', time: '13:50' },
    { id: '#4403', user: 'Julia L.', items: 'Cesta Família G', total: 'R$ 120,00', status: 'Enviado', time: '12:15' },
    { id: '#4404', user: 'Carlos Henrique', items: '3kg Banana Prata, 2kg Maçã', total: 'R$ 32,50', status: 'Novo', time: '14:38' }
  ]);
  const [orderFilter, setOrderFilter] = useState<'all' | 'Novo' | 'Preparando' | 'Enviado' | 'Entregue'>('all');
  const [stockSearch, setStockSearch] = useState('');
  const [stockCategory, setStockCategory] = useState('all');
  const [showSettingsSuccess, setShowSettingsSuccess] = useState(false);

  const [isPlaying, setIsPlaying] = useState(false);
  const [editingProduct, setEditingProduct] = useState<{ id: string; name: string; price: string; unit: string; description: string; image: string; category: string } | null>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [mapCoords, setMapCoords] = useState<[number, number]>([-23.5505, -46.6333]);

  const [form, setForm] = useState<PartnerForm>({
    businessName: '',
    responsible: '',
    taxId: '',
    phone: '',
    email: '',
    address: '',
    zip: '',
    city: '',
    delivery: true,
    pickup: true,
    radius: '5',
    fee: '5.00',
    time: '45-60 min',
    products: [
      { 
        id: 'p1', 
        name: 'Cesta de Frutas da Estação', 
        price: '45.00', 
        unit: 'Cesta', 
        description: 'Uma seleção premium de frutas frescas colhidas hoje.',
        image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=1200',
        category: 'Cestas'
      }
    ],
    hours: [{ day: 'Segunda-Sexta', open: '08:00', close: '19:00' }],
    payments: ['Pix', 'Cartão']
  });

  const handleSpeak = async (text: string) => {
    if (isPlaying) return;
    setIsPlaying(true);
    await speak(text, {
      onEnded: () => setIsPlaying(false),
      onError: () => setIsPlaying(false)
    });
  };

  const nextStep = (target: Step, guidance: string) => {
    setStep(target);
  };

  const saveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    if (editingProduct.id === 'new') {
      const newProd = { ...editingProduct, id: `p-${Date.now()}` };
      setForm({ ...form, products: [...form.products, newProd] });
    } else {
      setForm({
        ...form,
        products: form.products.map(p => p.id === editingProduct.id ? editingProduct : p)
      });
    }
    setIsProductModalOpen(false);
    setEditingProduct(null);
  };

  const removeProduct = (id: string) => {
    setForm({ ...form, products: form.products.filter(p => p.id !== id) });
  };

  const startEditProduct = (prod: any) => {
    setEditingProduct(prod);
    setIsProductModalOpen(true);
  };

  const startAddProduct = () => {
    setEditingProduct({
      id: 'new',
      name: '',
      price: '',
      unit: 'kg',
      description: '',
      image: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&q=80&w=1200',
      category: 'Frutas'
    });
    setIsProductModalOpen(true);
  };

  // Onboarding Screen
  if (step === 'onboarding') {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="bg-white dark:bg-slate-900 rounded-[40px] clay-card overflow-hidden shadow-2xl border border-white/60 dark:border-slate-800 flex flex-col lg:flex-row">
          <div className="lg:w-1/2 p-12 lg:p-20 space-y-8 flex flex-col justify-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 rounded-full border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-sm font-bold uppercase tracking-widest"
            >
              <Store className="w-4 h-4" />
              NutriAI Partner Portal
            </motion.div>
            
            <h1 className="text-4xl md:text-6xl font-serif font-bold text-slate-900 dark:text-white leading-tight">
              Venda seus produtos frescos no <span className="text-emerald-600">NutriAI</span>
            </h1>
            
            <p className="text-xl text-slate-500 dark:text-slate-400 leading-relaxed">
              Alcance novos clientes e aumente suas vendas com entrega ou retirada no local. Conectamos seu hortifruti direto com quem busca saúde.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <button 
                onClick={() => nextStep('business', "Vou te ajudar a cadastrar seu sacolão. É rápido e fácil, leva menos de 2 minutos.")}
                className="px-10 py-5 clay-primary px-6 py-3 font-bold text-lg shadow-xl shadow-emerald-500/30 hover:bg-emerald-700 transition-all flex items-center justify-center gap-3"
              >
                Cadastrar meu sacolão
                <ChevronRight className="w-6 h-6" />
              </button>
              <button 
                onClick={() => handleSpeak("Com a NutriAI, você poderá vender direto para clientes da sua região que buscam uma alimentação mais saudável.")}
                className="px-8 py-5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-2xl font-bold border border-slate-200 dark:border-slate-700 hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
              >
                <Volume2 className={`w-5 h-5 ${isPlaying ? 'animate-pulse text-emerald-500' : ''}`} />
                Saiba Mais
              </button>
            </div>
          </div>
          
          <div className="lg:w-1/2 relative bg-emerald-50 dark:bg-slate-950 flex items-center justify-center p-12">
            <div className="absolute inset-0 opacity-20 pointer-events-none overflow-hidden">
               <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200%] h-[200%] bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-emerald-500 via-transparent to-transparent" />
            </div>
            
            <div className="relative grid grid-cols-2 gap-4">
              {[
                { icon: ShoppingBasket, label: 'Produtos' },
                { icon: Truck, label: 'Entregas' },
                { icon: TrendingUp, label: 'Vendas' },
                { icon: Utensils, label: 'Saude' }
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.8, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-8 rounded-[32px] clay-card border border-white dark:border-slate-800 shadow-xl flex flex-col items-center text-center space-y-3"
                >
                  <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500">
                    <item.icon className="w-6 h-6" />
                  </div>
                  <span className="font-bold text-slate-800 dark:text-white text-sm">{item.label}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Dashboard View (Mock)
  if (step === 'dashboard') {
    // Computed values
    const newOrders = orders.filter(o => o.status === 'Novo');
    const preparingOrders = orders.filter(o => o.status === 'Preparando');
    const sentOrders = orders.filter(o => o.status === 'Enviado');
    const deliveredOrders = orders.filter(o => o.status === 'Entregue');

    // Filtered orders for dedicated 'orders' tab
    const filteredOrders = orders.filter(o => {
      if (orderFilter === 'all') return true;
      return o.status === orderFilter;
    });

    const filteredProducts = form.products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(stockSearch.toLowerCase()) || 
                            p.description.toLowerCase().includes(stockSearch.toLowerCase());
      const matchesCategory = stockCategory === 'all' || p.category === stockCategory;
      return matchesSearch && matchesCategory;
    });

    const advanceOrderStatus = (orderId: string, currentStatus: string) => {
      let nextStatus = '';
      if (currentStatus === 'Novo') nextStatus = 'Preparando';
      else if (currentStatus === 'Preparando') nextStatus = 'Enviado';
      else if (currentStatus === 'Enviado') nextStatus = 'Entregue';

      if (nextStatus) {
        vibrate(10);
        playSfx('success');
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: nextStatus } : o));
      }
    };

    const handleSaveSettings = (e: React.FormEvent) => {
      e.preventDefault();
      vibrate(20);
      playSfx('success');
      setShowSettingsSuccess(true);
      setTimeout(() => setShowSettingsSuccess(false), 3500);
    };

    return (
      <div className="max-w-7xl mx-auto px-4 py-12 grid lg:grid-cols-12 gap-8">
        {/* Sidebar */}
        <aside className="lg:col-span-3 space-y-4">
          <div className="clay-card p-6 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center text-white font-bold text-xl uppercase shrink-0">
                {(form.businessName || 'Sacolão').charAt(0)}
              </div>
              <div className="min-w-0">
                <h4 className="font-bold text-slate-900 dark:text-white truncate" title={form.businessName || 'Meu Sacolão'}>
                  {form.businessName || 'Meu Sacolão'}
                </h4>
                <p className="text-xs text-emerald-500 font-bold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Vendedor Ativo
                </p>
              </div>
            </div>
            
            <nav className="space-y-1">
              {[
                { icon: LayoutDashboard, label: 'Painel', value: 'panel' },
                { icon: Inbox, label: 'Pedidos', value: 'orders', count: newOrders.length > 0 ? String(newOrders.length) : undefined },
                { icon: Package, label: 'Estoque', value: 'stock' },
                { icon: TrendingUp, label: 'Vendas', value: 'sales' },
                { icon: Settings, label: 'Configurações', value: 'settings' }
              ].map((item, i) => (
                <button 
                  key={i}
                  id={`dashboard-tab-${item.value}`}
                  onClick={() => {
                    vibrate(10);
                    playSfx('tap');
                    setDashboardTab(item.value as any);
                  }}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                    dashboardTab === item.value 
                      ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/10' 
                      : 'text-slate-500 dark:text-slate-450 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </div>
                  {item.count && (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      dashboardTab === item.value 
                        ? 'bg-white text-emerald-600' 
                        : 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
                    }`}>
                      {item.count}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>
          
          <button 
            onClick={() => {
              vibrate(10);
              playSfx('tap');
              setStep('onboarding');
            }}
            className="w-full py-4 bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700/80 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 rounded-2xl font-bold text-sm transition-all cursor-pointer"
          >
            Sair do Painel
          </button>
        </aside>

        {/* Action Content Area */}
        <main className="lg:col-span-9 space-y-8 min-w-0">
          
          {/* STEP 1: PAINEL */}
          {dashboardTab === 'panel' && (
            <div className="space-y-8 animate-fade">
              {/* Stats Cards */}
              <div className="grid sm:grid-cols-3 gap-6">
                {[
                  { label: 'Vendas Hoje', val: 'R$ 450,00', sub: '+12%', color: 'emerald', bgClass: 'bg-emerald-500/5', textClass: 'text-emerald-500' },
                  { 
                    label: 'Novos Pedidos', 
                    val: newOrders.length.toString().padStart(2, '0'), 
                    sub: 'Pendentes de Preparo', 
                    color: 'blue', 
                    bgClass: 'bg-blue-500/5', 
                    textClass: 'text-blue-500',
                    onClickAction: () => {
                      vibrate(10);
                      playSfx('tap');
                      setDashboardTab('orders');
                      setOrderFilter('Novo');
                    }
                  },
                  { label: 'Ticket Médio', val: 'R$ 112,50', sub: 'Estável', color: 'purple', bgClass: 'bg-purple-500/5', textClass: 'text-purple-500' }
                ].map((stat, i) => (
                  <div 
                    key={i} 
                    onClick={stat.onClickAction}
                    className={`clay-card p-6 shadow-sm relative overflow-hidden transition-all hover:scale-[1.02] duration-300 ${stat.onClickAction ? 'cursor-pointer group' : ''}`}
                  >
                    <div className={`absolute top-0 right-0 w-24 h-24 ${stat.bgClass} rounded-full -mr-8 -mt-8 transition-transform group-hover:scale-110`} />
                    <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">{stat.label}</p>
                    <p className="text-3xl font-serif font-bold text-slate-900 dark:text-white">{stat.val}</p>
                    <p className={`text-xs font-bold mt-2 ${stat.textClass}`}>{stat.sub}</p>
                  </div>
                ))}
              </div>

              {/* Recent Orders in Panel */}
              <div className="clay-card p-6 overflow-hidden shadow-sm">
                <div className="pb-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <h4 className="font-serif text-xl font-bold text-slate-900 dark:text-white">Pedidos Recentes</h4>
                  <button 
                    onClick={() => {
                      vibrate(10);
                      playSfx('tap');
                      setDashboardTab('orders');
                      setOrderFilter('all');
                    }}
                    className="text-emerald-600 dark:text-emerald-400 font-bold text-sm hover:underline cursor-pointer"
                  >
                    Ver todos ({orders.length})
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 dark:bg-slate-800/50 text-[10px] font-bold text-slate-400 uppercase">
                      <tr>
                        <th className="px-6 py-4">ID</th>
                        <th className="px-6 py-4">Cliente</th>
                        <th className="px-6 py-4">Produtos</th>
                        <th className="px-6 py-4">Total</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4 text-right">Ações Rápidas</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                      {orders.slice(0, 4).map((order, i) => (
                        <tr key={i} className="text-sm dark:bg-transparent">
                          <td className="px-6 py-4 font-mono font-bold text-slate-400">{order.id}</td>
                          <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">{order.user}</td>
                          <td className="px-6 py-4 text-slate-500 max-w-[200px] truncate" title={order.items}>{order.items}</td>
                          <td className="px-6 py-4 font-bold text-emerald-600 dark:text-emerald-400">{order.total}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${
                              order.status === 'Novo' ? 'bg-blue-100 text-blue-600' : 
                              order.status === 'Preparando' ? 'bg-amber-100 text-amber-600' : 
                              order.status === 'Enviado' ? 'bg-indigo-100 text-indigo-600' : 'bg-emerald-100 text-emerald-600'
                            }`}>
                              {order.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right border-0">
                            <div className="flex justify-end items-center">
                              {order.status !== 'Entregue' ? (
                                <button 
                                  onClick={() => advanceOrderStatus(order.id, order.status)}
                                  className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-500 dark:hover:bg-emerald-600 text-emerald-600 dark:text-emerald-400 hover:text-white hover:shadow-md transition-all text-xs font-bold rounded-xl flex items-center gap-1 cursor-pointer active:scale-95"
                                >
                                  <span>
                                    {order.status === 'Novo' && 'Aceitar'}
                                    {order.status === 'Preparando' && 'Despachar'}
                                    {order.status === 'Enviado' && 'Entregar'}
                                  </span>
                                  <ChevronRight className="w-3.5 h-3.5" />
                                </button>
                              ) : (
                                <span className="text-xs font-bold text-slate-400 dark:text-slate-500 flex items-center gap-1">
                                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                                  Concluído
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Informative tips widget */}
              <div className="bg-emerald-500/5 border border-emerald-100 dark:border-emerald-900/50 rounded-3xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div>
                    <h5 className="font-bold text-slate-900 dark:text-white text-sm">Dica Inteligente do NutriAI</h5>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Os clientes estão buscando mais Cestas de Frutas nas quartas-feiras à tarde. Prepare seu estoque!</p>
                  </div>
                </div>
                <button 
                  onClick={() => handleSpeak("Olha a dica de hoje! Clientes buscam mais Cestas de Frutas nas quartas à tarde. Aumente seu estoque de abacaxis e laranjas para faturar mais.")}
                  className="px-4 py-2 bg-emerald-500 text-white rounded-xl text-xs font-bold hover:bg-emerald-600 transition-all cursor-pointer shadow-md shadow-emerald-500/10 shrink-0 flex items-center gap-1.5"
                >
                  <Volume2 className="w-3.5 h-3.5" /> Ouvir Dica
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: PEDIDOS */}
          {dashboardTab === 'orders' && (
            <div className="space-y-6 animate-fade">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-3xl font-serif font-bold text-slate-900 dark:text-white">Gerenciamento de Pedidos</h3>
                  <p className="text-xs text-slate-400 dark:text-slate-500">Monitore, prepare e distribua os pedidos com velocidade e segurança.</p>
                </div>
              </div>

              {/* Filter Tabs */}
              <div className="flex flex-wrap gap-2 pb-2">
                {[
                  { value: 'all', label: 'Todos', badge: orders.length },
                  { value: 'Novo', label: 'Novos', badge: newOrders.length, color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30' },
                  { value: 'Preparando', label: 'Em Preparo', badge: preparingOrders.length, color: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30' },
                  { value: 'Enviado', label: 'Enviados', badge: sentOrders.length, color: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30' },
                  { value: 'Entregue', label: 'Concluídos', badge: deliveredOrders.length, color: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30' }
                ].map((tab) => (
                  <button
                    key={tab.value}
                    onClick={() => {
                      vibrate(5);
                      playSfx('tap');
                      setOrderFilter(tab.value as any);
                    }}
                    className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                      orderFilter === tab.value
                        ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-950 font-bold'
                        : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-450 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                      orderFilter === tab.value ? 'bg-emerald-500 text-white' : tab.color || 'bg-slate-200 text-slate-600 dark:bg-slate-800'
                    }`}>
                      {tab.badge}
                    </span>
                  </button>
                ))}
              </div>

              {/* Orders Grid/List */}
              {filteredOrders.length === 0 ? (
                <div className="clay-card p-12 text-center space-y-3">
                  <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-400 mx-auto">
                    <Inbox className="w-8 h-8" />
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 font-bold text-sm">Nenhum pedido encontrado nesta categoria.</p>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-6">
                  {filteredOrders.map((order) => (
                    <motion.div
                      layout
                      key={order.id}
                      className="clay-card p-6 flex flex-col justify-between space-y-6 relative overflow-hidden group shadow-sm hover:shadow-md transition-all border border-slate-100 dark:border-slate-800"
                    >
                      <div className="space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3">
                          <span className="font-mono text-xs font-bold text-slate-400">{order.id}</span>
                          <span className="text-xs text-slate-400 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" /> {order.time}
                          </span>
                        </div>
                        <div className="space-y-1">
                          <h4 className="font-bold text-slate-900 dark:text-white text-base">{order.user}</h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">{order.items}</p>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-0.5">
                          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest font-bold block">Valor Total</span>
                          <span className="font-bold text-xl text-emerald-600 dark:text-emerald-400">{order.total}</span>
                        </div>

                        {order.status !== 'Entregue' ? (
                          <button
                            onClick={() => advanceOrderStatus(order.id, order.status)}
                            className="px-5 py-2.5 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 shadow-md shadow-emerald-500/10 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 shrink-0"
                          >
                            <span>
                              {order.status === 'Novo' && 'Aceitar Pedido'}
                              {order.status === 'Preparando' && 'Enviar para Entrega'}
                              {order.status === 'Enviado' && 'Marcar como Entregue'}
                            </span>
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                        ) : (
                          <div className="px-4 py-2 bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 rounded-xl text-xs font-bold flex items-center justify-center gap-1">
                            <Check className="w-4 h-4 font-bold" /> Entregue com Sucesso
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* STEP 3: ESTOQUE */}
          {dashboardTab === 'stock' && (
            <div className="space-y-6 animate-fade">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-3xl font-serif font-bold text-slate-900 dark:text-white">Estoque Digital</h3>
                  <p className="text-xs text-slate-400 dark:text-slate-500">Adicione novos itens sazonais ou gerencie preços em tempo real.</p>
                </div>
                <button
                  onClick={() => {
                    setEditingProduct({ id: 'new', name: '', price: '', unit: 'kg', description: '', image: '', category: 'Frutas' });
                    setIsProductModalOpen(true);
                    vibrate(15);
                    playSfx('tap');
                  }}
                  className="px-6 py-3.5 bg-emerald-505 bg-emerald-500 text-white rounded-2xl hover:bg-emerald-600 shadow-lg shadow-emerald-500/10 text-sm font-bold flex items-center gap-2 transition-all cursor-pointer grow-0 ml-auto shrink-0"
                >
                  <Plus className="w-4 h-4" /> Novo Produto
                </button>
              </div>

              {/* Search & Category Filter */}
              <div className="grid sm:grid-cols-12 gap-4">
                <div className="sm:col-span-8 relative">
                  <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    value={stockSearch}
                    onChange={(e) => setStockSearch(e.target.value)}
                    placeholder="Pesquisar frutas, legumes, combos..."
                    className="w-full pl-12 pr-4 py-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white transition-all shadow-sm"
                  />
                </div>
                <div className="sm:col-span-4">
                  <select
                    value={stockCategory}
                    onChange={(e) => setStockCategory(e.target.value)}
                    className="w-full p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white transition-all shadow-sm"
                  >
                    <option value="all">Todas Categorias</option>
                    <option value="Frutas">Frutas</option>
                    <option value="Verduras">Verduras</option>
                    <option value="Legumes">Legumes</option>
                    <option value="Kits">Kits Saudáveis</option>
                    <option value="Cestas">Cestas</option>
                  </select>
                </div>
              </div>

              {/* Product Grid */}
              {filteredProducts.length === 0 ? (
                <div className="clay-card p-12 text-center space-y-3 shadow-none">
                  <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-400 mx-auto">
                    <ShoppingBasket className="w-8 h-8" />
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 font-bold text-sm">Nenhum produto cadastrado que atenda a busca.</p>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredProducts.map((p) => (
                    <div 
                      key={p.id}
                      className="clay-card overflow-hidden group hover:shadow-lg hover:scale-[1.01] transition-all duration-300 border border-slate-100 dark:border-slate-800/80 p-0 flex flex-col"
                    >
                      <div className="relative aspect-video bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        {p.image ? (
                          <img 
                            src={p.image} 
                            alt={p.name} 
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-400 dark:text-slate-500">
                            <ShoppingBasket className="w-10 h-10" />
                          </div>
                        )}
                        <span className="absolute top-3 left-3 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-bold text-slate-700 dark:text-slate-300 shadow-sm border border-slate-200/50 dark:border-slate-800/10">
                          {p.category}
                        </span>
                      </div>

                      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                        <div className="space-y-1.5">
                          <h4 className="font-serif font-bold text-slate-900 dark:text-white text-base max-w-full leading-tight truncate">{p.name}</h4>
                          <p className="text-xs text-slate-400 dark:text-slate-450 leading-relaxed font-semibold line-clamp-2 min-h-[2rem]">{p.description || 'Fruta fresca colhida hoje de manhã.'}</p>
                        </div>

                        <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                          <div>
                            <span className="text-[9px] font-mono text-slate-400 block tracking-widest font-bold">PREÇO</span>
                            <span className="font-bold text-lg text-emerald-600 dark:text-emerald-400">R$ {p.price}</span>
                            <span className="text-xs text-slate-400 dark:text-slate-450">/{p.unit}</span>
                          </div>

                          <div className="flex items-center gap-1.5 flex-row">
                            <button
                              onClick={() => {
                                setEditingProduct(p);
                                setIsProductModalOpen(true);
                                vibrate(10);
                                playSfx('tap');
                              }}
                              className="p-2.5 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-emerald-500 hover:text-white rounded-xl transition-all shadow-sm cursor-pointer border border-slate-200/50 dark:border-slate-700"
                              title="Editar Produto"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                playSfx('scratch');
                                vibrate(15);
                                setForm(prev => ({ ...prev, products: prev.products.filter(item => item.id !== p.id) }));
                              }}
                              className="p-2.5 bg-slate-50 dark:bg-slate-800 text-slate-400 hover:bg-rose-500 hover:text-white rounded-xl transition-all shadow-sm cursor-pointer border border-slate-200/50 dark:border-slate-700"
                              title="Excluir Produto"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* STEP 4: VENDAS */}
          {dashboardTab === 'sales' && (
            <div className="space-y-8 animate-fade">
              <div>
                <h3 className="text-3xl font-serif font-bold text-slate-900 dark:text-white">Análise de Performance</h3>
                <p className="text-xs text-slate-400 dark:text-slate-500">Histórico de rendimentos, faturamento quinzenal e metas de crescimento.</p>
              </div>

              {/* Stats Cards */}
              <div className="grid sm:grid-cols-4 gap-6">
                {[
                  { label: "Faturamento Total", value: "R$ 4.890,00" },
                  { label: "Pedidos Entregues", value: "43" },
                  { label: "Taxa de Aceitação", value: "98.2%" },
                  { label: "Próximo Repasse", value: "R$ 1.240,00" }
                ].map((s, i) => (
                  <div key={i} className="clay-card p-5 shadow-sm">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{s.label}</span>
                    <p className="text-2xl font-serif font-bold text-slate-900 dark:text-white mt-1">{s.value}</p>
                  </div>
                ))}
              </div>

              {/* Sales Chart Section */}
              <div className="clay-card p-6 shadow-sm space-y-6">
                <div>
                  <h4 className="font-serif text-lg font-bold text-slate-900 dark:text-white">Faturamento Diário (R$ - Semana Atual)</h4>
                  <p className="text-xs text-slate-400 dark:text-slate-500">Destaque para o aumento nos finais de semana.</p>
                </div>

                {/* SVG Visual Representation */}
                <div className="w-full h-64 flex flex-col justify-between pt-4">
                  <div className="flex-1 flex gap-4 items-stretch justify-between relative">
                    {/* Background Grid Lines */}
                    <div className="absolute inset-0 flex flex-col justify-between pointer-events-none select-none opacity-40">
                      <div className="border-b border-dashed border-slate-200 dark:border-slate-800" />
                      <div className="border-b border-dashed border-slate-200 dark:border-slate-800" />
                      <div className="border-b border-dashed border-slate-200 dark:border-slate-800" />
                    </div>

                    {[
                      { day: 'Seg', val: 120, height: '35%' },
                      { day: 'Ter', val: 240, height: '55%' },
                      { day: 'Qua', val: 180, height: '45%' },
                      { day: 'Qui', val: 320, height: '70%' },
                      { day: 'Sex', val: 450, height: '95%', pulse: true },
                      { day: 'Sáb', val: 380, height: '80%' },
                      { day: 'Dom', val: 290, height: '62%' }
                    ].map((bar, i) => (
                      <div key={i} className="flex-1 flex flex-col justify-end items-center relative group">
                        {/* Interactive dynamic tooltip on hover */}
                        <div className="absolute bottom-[105%] bg-slate-900 dark:bg-white dark:text-slate-950 text-white rounded-lg px-2 py-1 text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-md pointer-events-none mb-1">
                          R$ {bar.val},00
                        </div>

                        {/* Bar Shape */}
                        <div 
                          className={`w-full rounded-t-xl transition-all duration-700 ease-out flex items-end justify-center ${
                            bar.pulse 
                              ? 'bg-gradient-to-t from-emerald-500 to-teal-400 shadow-lg shadow-emerald-500/20' 
                              : 'bg-emerald-500/20 group-hover:bg-emerald-500/40 text-slate-700'
                          }`}
                          style={{ height: bar.height }}
                        >
                          <span className={`text-[10px] font-mono font-bold mb-2 ${bar.pulse ? 'text-white' : 'text-emerald-600 dark:text-emerald-400'}`}>
                            {bar.val}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Horizontal X axis */}
                  <div className="flex gap-4 justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                    {['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'].map((day, i) => (
                      <div key={i} className="flex-1 text-center font-mono text-[10px] font-bold text-slate-400 dark:text-slate-500">
                        {day.substring(0, 3)}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: CONFIGURAÇÕES */}
          {dashboardTab === 'settings' && (
            <div className="space-y-6 animate-fade">
              <div>
                <h3 className="text-3xl font-serif font-bold text-slate-900 dark:text-white">Configurações do Perfil</h3>
                <p className="text-xs text-slate-400 dark:text-slate-500">Mantenha os dados cadastrais da sua quitanda atualizados para os clientes da região.</p>
              </div>

              {showSettingsSuccess && (
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center gap-3 text-sm font-bold animate-[slideUp_0.4s_ease-out]">
                  <CheckCircle2 className="w-5 h-5" /> Configurações salvas e aplicadas com sucesso!
                </div>
              )}

              {/* Setting Form */}
              <form onSubmit={handleSaveSettings} className="clay-card p-6 md:p-8 space-y-8 shadow-sm">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Nome do Estabelecimento *</label>
                    <input
                      required
                      value={form.businessName}
                      onChange={(e) => setForm({ ...form, businessName: e.target.value })}
                      placeholder="Sacolão do Bairro..."
                      className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl ring-1 ring-slate-200 dark:ring-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 text-sm dark:text-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Nome do Responsável</label>
                    <input
                      value={form.responsible}
                      onChange={(e) => setForm({ ...form, responsible: e.target.value })}
                      placeholder="Pedro Souza..."
                      className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl ring-1 ring-slate-200 dark:ring-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 text-sm dark:text-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Contato de Celular *</label>
                    <input
                      required
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      placeholder="(11) 98765-4321"
                      className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl ring-1 ring-slate-200 dark:ring-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 text-sm dark:text-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Email de Notificações</label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="sacolao@email.com"
                      className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl ring-1 ring-slate-200 dark:ring-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 text-sm dark:text-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Taxa de Entrega (R$)</label>
                    <input
                      type="text"
                      value={form.fee}
                      onChange={(e) => setForm({ ...form, fee: e.target.value })}
                      placeholder="5.00"
                      className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl ring-1 ring-slate-200 dark:ring-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 text-sm dark:text-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Tempo Estimado de Entrega</label>
                    <input
                      value={form.time}
                      onChange={(e) => setForm({ ...form, time: e.target.value })}
                      placeholder="30-45 min"
                      className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl ring-1 ring-slate-200 dark:ring-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 text-sm dark:text-white"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Endereço Comercial</label>
                  <input
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    placeholder="Av. Paulista, 1000 - Bela Vista"
                    className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl ring-1 ring-slate-200 dark:ring-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 text-sm dark:text-white"
                  />
                </div>

                <div className="flex flex-wrap gap-4 pt-4">
                  <div className="flex-1">
                    <button
                      type="submit"
                      className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-2xl hover:shadow-xl transition-all cursor-pointer active:scale-95"
                    >
                      Salvar Alterações
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}
        </main>
      </div>
    );
  }

  // Pending Approval
  if (step === 'pending') {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-8 animate-in fade-in zoom-in duration-700">
         <div className="w-32 h-32 clay-primary px-6 py-3 flex items-center justify-center mx-auto shadow-2xl shadow-emerald-500/20">
            <CheckCircle2 className="w-16 h-16" />
         </div>
         <div className="space-y-4">
            <h2 className="text-4xl font-serif font-bold text-slate-900 dark:text-white">Cadastro Enviado!</h2>
            <p className="text-slate-500 dark:text-slate-400 text-lg leading-relaxed">
              Nossa equipe IA está analisando seu cadastro. Você receberá uma notificação em até 24 horas para começar a vender.
            </p>
         </div>
         <button 
           onClick={() => setStep('dashboard')}
           className="px-10 py-5 bg-slate-900 text-white rounded-2xl font-bold flex items-center justify-center gap-3 mx-auto shadow-xl"
         >
           Visitar Painel de Controle
           <ChevronRight className="w-6 h-6" />
         </button>
      </div>
    );
  }

  // Registration Flow
  return (
    <div className="max-w-4xl mx-auto w-full py-0 sm:py-4 md:py-12">
      <div className="clay-card overflow-hidden !rounded-none sm:!rounded-[32px] !border-x-0 sm:!border-x">
        {/* Progress Bar */}
        <div className="h-2 bg-slate-100 dark:bg-slate-800 flex">
           {[ 'business', 'location', 'service', 'products', 'hours', 'payment'].map((s, i) => {
             const stepsArr: Step[] = ['business', 'location', 'service', 'products', 'hours', 'payment'];
             const currentIdx = stepsArr.indexOf(step as any);
             return (
               <div 
                 key={s} 
                 className={`h-full transition-all duration-500 ${i <= currentIdx ? 'bg-emerald-500' : 'bg-transparent'}`}
                 style={{ width: '16.66%' }}
               />
             )
           })}
        </div>

        <div className="p-6 md:p-12 space-y-8 md:space-y-10">
           {/* Step Header */}
           <div className="flex items-center justify-between">
              <div className="space-y-2">
                 <h2 className="text-3xl font-serif font-bold text-slate-900 dark:text-white">
                   {step === 'business' && 'Dados do seu Negócio'}
                   {step === 'location' && 'Onde você está?'}
                   {step === 'service' && 'Como você atende?'}
                   {step === 'products' && 'Seus Melhores Produtos'}
                   {step === 'hours' && 'Horários de Venda'}
                   {step === 'payment' && 'Formas de Receber'}
                 </h2>
                 <div className="flex items-center gap-2 text-emerald-500 font-bold text-xs uppercase tracking-widest">
                    <Sparkles className="w-4 h-4" />
                    Guia IA de Cadastro
                 </div>
              </div>
              <button 
                onClick={() => handleSpeak("Vou te ajudar nesta etapa.")}
                className={`w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-white hover:bg-emerald-500 dark:hover:bg-emerald-500 transition-all ${isPlaying ? 'animate-pulse text-emerald-500 bg-emerald-50 dark:bg-emerald-950/30' : ''}`}
                title="Ouvir instrução por voz"
              >
                <Volume2 className="w-6 h-6" />
              </button>
           </div>

           {/* Step Content */}
           <div className="space-y-6">
              {step === 'business' && (
                <div className="grid md:grid-cols-2 gap-6 animate-in slide-in-from-right-4">
                   <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase">Nome do Sacolão / Hortifruti</label>
                      <input 
                        type="text" 
                        value={form.businessName}
                        onChange={e => setForm({...form, businessName: e.target.value})}
                        placeholder="Ex: Hortifruti do Vale"
                        className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none ring-1 ring-slate-200 dark:ring-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none text-slate-900 dark:text-white"
                      />
                   </div>
                   <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase">Nome do Responsável</label>
                      <input 
                        type="text"
                        value={form.responsible}
                        onChange={e => setForm({...form, responsible: e.target.value})}
                        placeholder="Nome completo"
                        className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none ring-1 ring-slate-200 dark:ring-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none text-slate-900 dark:text-white"
                      />
                   </div>
                   <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase">CNPJ ou CPF</label>
                      <input 
                        type="text" 
                        value={form.taxId}
                        onChange={e => setForm({...form, taxId: e.target.value})}
                        placeholder="00.000.000/0001-00"
                        className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none ring-1 ring-slate-200 dark:ring-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none text-slate-900 dark:text-white"
                      />
                   </div>
                   <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase">WhatsApp</label>
                      <input 
                        type="text" 
                        value={form.phone}
                        onChange={e => setForm({...form, phone: e.target.value})}
                        placeholder="(11) 99999-9999"
                        className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none ring-1 ring-slate-200 dark:ring-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none text-slate-900 dark:text-white"
                      />
                   </div>
                </div>
              )}

              {step === 'location' && (
                <div className="space-y-6 animate-in slide-in-from-right-4">
                   <div className="p-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[32px] clay-card flex flex-col items-center justify-center text-center space-y-4 bg-slate-50 dark:bg-slate-950">
                      <div className="w-16 h-16 bg-white dark:bg-slate-900 rounded-2xl shadow-sm flex items-center justify-center text-emerald-500">
                         <MapPin className="w-8 h-8" />
                      </div>
                      <div className="space-y-1">
                        <p className="font-bold text-slate-900 dark:text-white">Marcar Localização no Mapa</p>
                        <p className="text-xs text-slate-500">Isso ajudará clientes locais a te encontrarem.</p>
                      </div>
                      <button 
                        type="button"
                        onClick={() => setIsMapOpen(true)}
                        className="px-6 py-2.5 bg-[#6ab01a] hover:bg-[#589216] active:scale-95 text-white rounded-xl font-bold text-xs border border-transparent shadow shadow-[#6ab01a]/20 transition-all cursor-pointer"
                      >
                        Abrir Mapa Interativo
                      </button>

                      {form.address ? (
                        <div className="flex items-center gap-2 justify-center py-1.5 px-4 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-xs text-emerald-600 dark:text-emerald-400 font-bold max-w-md">
                           <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                           Local Selecionado: {form.address}
                        </div>
                      ) : (
                        <p className="text-xs text-amber-500 dark:text-amber-400 font-medium">Nenhum local selecionado no mapa ainda.</p>
                      )}
                   </div>
                   
                   <div className="grid grid-cols-3 gap-6">
                      <div className="col-span-2 space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase">Endereço</label>
                        <input 
                          type="text" 
                          value={form.address}
                          onChange={e => setForm({...form, address: e.target.value})}
                          placeholder="Rua, número, bairro" 
                          className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl ring-1 ring-slate-200 dark:ring-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white font-sans" 
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase">CEP</label>
                        <input 
                          type="text" 
                          value={form.zip}
                          onChange={e => setForm({...form, zip: e.target.value})}
                          placeholder="00000-000" 
                          className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl ring-1 ring-slate-200 dark:ring-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white font-sans" 
                        />
                      </div>
                   </div>
                </div>
              )}

              {step === 'service' && (
                <div className="space-y-8 animate-in slide-in-from-right-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <button 
                      onClick={() => setForm({...form, delivery: !form.delivery})}
                      className={`p-6 rounded-3xl border-2 transition-all flex items-center gap-4 ${form.delivery ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/10' : 'border-slate-100 dark:border-slate-800'}`}
                    >
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${form.delivery ? 'bg-emerald-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                        <Truck className="w-6 h-6" />
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-slate-900 dark:text-white">Entrega em Domicílio</p>
                        <p className="text-xs text-slate-500">Venda direto no app</p>
                      </div>
                    </button>
                    
                    <button 
                      onClick={() => setForm({...form, pickup: !form.pickup})}
                      className={`p-6 rounded-3xl border-2 transition-all flex items-center gap-4 ${form.pickup ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/10' : 'border-slate-100 dark:border-slate-800'}`}
                    >
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${form.pickup ? 'bg-emerald-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                        <Smartphone className="w-6 h-6" />
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-slate-900 dark:text-white">Retirada no Local</p>
                        <p className="text-xs text-slate-500">Ganhe tempo no balcão</p>
                      </div>
                    </button>
                  </div>

                  {form.delivery && (
                    <div className="grid md:grid-cols-3 gap-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                       <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-400 uppercase">Raio de Entrega (km)</label>
                          <input type="number" value={form.radius} onChange={e => setForm({...form, radius: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl ring-1 ring-slate-200 dark:ring-slate-700 outline-none" />
                       </div>
                       <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-400 uppercase">Taxa de Entrega (R$)</label>
                          <input type="text" value={form.fee} onChange={e => setForm({...form, fee: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl ring-1 ring-slate-200 dark:ring-slate-700 outline-none" />
                       </div>
                       <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-400 uppercase">Tempo Médio</label>
                          <input type="text" value={form.time} onChange={e => setForm({...form, time: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl ring-1 ring-slate-200 dark:ring-slate-700 outline-none" />
                       </div>
                    </div>
                  )}
                </div>
              )}

              {step === 'products' && (
                <div className="space-y-6 animate-in slide-in-from-right-4">
                   <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {form.products.map((p) => (
                        <div key={p.id} className="bg-slate-50 dark:bg-slate-950 rounded-[32px] clay-card border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden group shadow-sm hover:shadow-md transition-all">
                           <div className="relative h-40 overflow-hidden">
                              <img src={p.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" referrerPolicy="no-referrer" />
                              <div className="absolute top-3 left-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-3 py-1 rounded-full border border-white/20 text-[10px] font-bold text-emerald-600 uppercase">
                                {p.category}
                              </div>
                              <div className="absolute top-3 right-3 flex gap-2">
                                <button 
                                  onClick={() => startEditProduct(p)}
                                  className="w-8 h-8 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-200 rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-all hover:text-emerald-500"
                                >
                                  <Settings className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => removeProduct(p.id)}
                                  className="w-8 h-8 bg-white dark:bg-slate-800 text-red-500 rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-red-50"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                           </div>
                           <div className="p-5 flex-1 flex flex-col space-y-2">
                              <h5 className="font-bold text-slate-900 dark:text-white truncate">{p.name}</h5>
                              <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{p.description}</p>
                              <div className="mt-auto pt-2 flex items-center justify-between">
                                 <span className="text-sm font-bold text-emerald-600">R$ {p.price}</span>
                                 <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">/ {p.unit}</span>
                              </div>
                           </div>
                        </div>
                      ))}
                      <button 
                        onClick={startAddProduct}
                        className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[32px] clay-card flex flex-col items-center justify-center space-y-4 min-h-[220px] hover:bg-slate-50 dark:hover:bg-slate-950 transition-all group"
                      >
                         <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-400 group-hover:bg-emerald-500 group-hover:text-white transition-all">
                           <Plus className="w-8 h-8" />
                         </div>
                         <div className="text-center">
                            <span className="block font-bold text-slate-900 dark:text-white">Adicionar Produto</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Fruta, Verdura ou Combo</span>
                         </div>
                      </button>
                   </div>
                   
                   <div className="bg-amber-50 dark:bg-amber-900/10 p-6 rounded-3xl border border-amber-100 dark:border-amber-900/30 flex items-center gap-4">
                      <Sparkles className="w-8 h-8 text-amber-500" />
                      <p className="text-xs text-amber-800 dark:text-amber-200 leading-relaxed">
                        <strong>Dica IA:</strong> Sacolões que utilizam fotos de alta qualidade e descrições detalhadas vendem até 55% mais no NutriAI.
                      </p>
                   </div>
                </div>
              )}

              {(step === 'hours' || step === 'payment') && (
                <div className="space-y-6 animate-in slide-in-from-right-4">
                  {step === 'hours' ? (
                    <div className="space-y-4">
                       {form.hours.map((h, i) => (
                         <div key={i} className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                           <Clock className="w-5 h-5 text-emerald-500" />
                           <div className="flex-1 font-bold text-sm text-slate-700 dark:text-slate-200">{h.day}</div>
                           <div className="text-sm text-slate-500">{h.open} às {h.close}</div>
                         </div>
                       ))}
                       <button className="text-emerald-500 text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                         <Plus className="w-4 h-4" />
                         Adicionar Horário Diferenciado
                       </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                       {['Pix', 'Cartão no App', 'Cartão na Entrega', 'Dinheiro'].map(method => (
                         <button 
                           key={method}
                           onClick={() => {
                             if (form.payments.includes(method)) setForm({...form, payments: form.payments.filter(p => p !== method)});
                             else setForm({...form, payments: [...form.payments, method]});
                           }}
                           className={`p-6 rounded-3xl border-2 transition-all flex items-center gap-4 ${form.payments.includes(method) ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/10' : 'border-slate-100 dark:border-slate-800'}`}
                         >
                           <CreditCard className={`w-6 h-6 ${form.payments.includes(method) ? 'text-emerald-500' : 'text-slate-400'}`} />
                           <span className="font-bold text-slate-700 dark:text-slate-200">{method}</span>
                         </button>
                       ))}
                    </div>
                  )}
                </div>
              )}
           </div>

           {/* Actions */}
           <div className="flex gap-4 pt-10 border-t border-slate-100 dark:border-slate-800">
              <button 
                onClick={() => {
                   const stepsArr: Step[] = ['onboarding', 'business', 'location', 'service', 'products', 'hours', 'payment'];
                   const currentIdx = stepsArr.indexOf(step as any);
                   setStep(stepsArr[currentIdx - 1]);
                }}
                className="px-8 py-5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-200 rounded-2xl font-bold flex items-center gap-2"
              >
                <ChevronLeft className="w-6 h-6" />
                Voltar
              </button>
              <button 
                onClick={() => {
                   const stepsArr: Step[] = ['business', 'location', 'service', 'products', 'hours', 'payment'];
                   const currentIdx = stepsArr.indexOf(step as any);
                   if (currentIdx < stepsArr.length - 1) {
                      const next = stepsArr[currentIdx + 1];
                      let guidance = "";
                      if (next === 'location') guidance = "Onde seu sacolão está localizado? Isso ajuda os clientes a te encontrarem.";
                      if (next === 'service') guidance = "Como você entrega para seus clientes? Você faz entregas ou aceita retiradas?";
                      if (next === 'products') guidance = "Agora, adicione seus melhores produtos frescos.";
                      if (next === 'hours') guidance = "Quais são seus horários de atendimento?";
                      if (next === 'payment') guidance = "Por fim, como você deseja receber seus pagamentos?";
                      nextStep(next, guidance);
                   } else {
                      setStep('pending');
                   }
                }}
                className="flex-1 py-5 clay-primary px-6 py-3 font-bold text-lg shadow-xl shadow-emerald-500/30 hover:bg-emerald-700 transition-all flex items-center justify-center gap-3"
              >
                {step === 'payment' ? 'Concluir Cadastro' : 'Próximo Passo'}
                <ChevronRight className="w-6 h-6" />
              </button>
           </div>
        </div>
      </div>

      {/* Map Selector Modal */}
      <AnimatePresence>
         {isMapOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsMapOpen(false)}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              />
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-[40px] clay-card shadow-2xl overflow-hidden flex flex-col pointer-events-auto"
              >
                 <div className="p-8 md:p-10 space-y-6 flex-1 flex flex-col">
                    <div className="flex items-center justify-between">
                       <div>
                          <h3 className="text-2xl font-serif font-bold text-slate-900 dark:text-white flex items-center gap-2">
                             <MapPin className="w-6 h-6 text-emerald-500" />
                             Marcar Localização no Mapa
                          </h3>
                          <p className="text-xs text-slate-500">Mova o marcador ou clique em qualquer ponto do mapa para definir onde fica.</p>
                       </div>
                       <button 
                         type="button"
                         onClick={() => setIsMapOpen(false)}
                         className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-400 font-bold hover:bg-slate-200 transition-all cursor-pointer"
                       >
                         ✕
                       </button>
                    </div>

                    {/* Preselected jumps / Neighborhood geocoding simulator */}
                    <div className="space-y-4">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Simular busca ou ir para bairros principais</label>
                       <div className="flex flex-wrap gap-2">
                          {[
                            { name: 'Vila Mariana', coords: [-23.589, -46.634] as [number, number] },
                            { name: 'Pinheiros', coords: [-23.567, -46.703] as [number, number] },
                            { name: 'Jardins', coords: [-23.561, -46.656] as [number, number] },
                            { name: 'Centro / Sé', coords: [-23.5505, -46.6333] as [number, number] }
                          ].map((b) => (
                             <button
                               key={b.name}
                               type="button"
                               onClick={() => {
                                 setMapCoords(b.coords);
                                 const resGeo = getMockAddress(b.coords[0], b.coords[1]);
                                 setForm(prev => ({
                                   ...prev,
                                   address: resGeo.address,
                                   zip: resGeo.zip,
                                   city: resGeo.city
                                 }));
                               }}
                               className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                                 Math.abs(mapCoords[0] - b.coords[0]) < 0.005 
                                   ? 'bg-emerald-500 border-emerald-500 text-white' 
                                   : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-250'
                               }`}
                             >
                               {b.name}
                             </button>
                          ))}
                       </div>
                    </div>

                    {/* Leaflet Map Area */}
                    <div className="w-full h-[320px] rounded-[24px] overflow-hidden border border-slate-200 dark:border-slate-800 relative z-10">
                       <MapContainer 
                         center={mapCoords} 
                         zoom={15} 
                         className="w-full h-full"
                         style={{ background: "#f8fafc" }}
                       >
                          <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                          />
                          <ChangeMapView center={mapCoords} />
                          <MapEventsHandler 
                            onChange={(latlng) => {
                              const coordsObj: [number, number] = [latlng.lat, latlng.lng];
                              setMapCoords(coordsObj);
                              const resGeo = getMockAddress(latlng.lat, latlng.lng);
                              setForm(prev => ({
                                ...prev,
                                address: resGeo.address,
                                zip: resGeo.zip,
                                city: resGeo.city
                              }));
                            }} 
                          />
                          <Marker 
                            position={mapCoords} 
                            icon={partnerMarkerIcon || undefined}
                          />
                       </MapContainer>
                    </div>

                    {/* Footer Address Preview */}
                    <div className="bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 p-4 rounded-2xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                       <div className="space-y-0.5">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Endereço Identificado</p>
                          <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{form.address || "Clique no mapa para marcar..."}</p>
                       </div>
                       <button
                         type="button"
                         onClick={() => setIsMapOpen(false)}
                         className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl shadow-md transition-all shrink-0 active:scale-95 cursor-pointer text-center"
                       >
                         Confirmar Localização
                       </button>
                    </div>
                 </div>
              </motion.div>
           </div>
         )}
      </AnimatePresence>

      {/* Product Modal */}
      <AnimatePresence>
         {isProductModalOpen && editingProduct && (
           <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsProductModalOpen(false)}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              />
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-[40px] clay-card shadow-2xl overflow-hidden"
              >
                <form onSubmit={saveProduct} className="p-8 md:p-12 space-y-8">
                   <div className="flex items-center justify-between">
                      <h3 className="text-3xl font-serif font-bold text-slate-900 dark:text-white">
                        {editingProduct.id === 'new' ? 'Novo Produto' : 'Editar Produto'}
                      </h3>
                      <button 
                        type="button"
                        onClick={() => setIsProductModalOpen(false)}
                        className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-400"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                   </div>

                   <div className="grid md:grid-cols-2 gap-8">
                      <div className="space-y-6">
                         <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Nome do Produto</label>
                            <input 
                              required
                              value={editingProduct.name}
                              onChange={e => setEditingProduct({...editingProduct, name: e.target.value})}
                              className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl ring-1 ring-slate-200 dark:ring-slate-700 outline-none focus:ring-2 focus:ring-emerald-500"
                              placeholder="Ex: Alface Americana"
                            />
                         </div>
                         <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                               <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Preço (R$)</label>
                               <input 
                                 required
                                 type="text"
                                 value={editingProduct.price}
                                 onChange={e => setEditingProduct({...editingProduct, price: e.target.value})}
                                 className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl ring-1 ring-slate-200 dark:ring-slate-700 outline-none focus:ring-2 focus:ring-emerald-500"
                                 placeholder="5.90"
                               />
                            </div>
                            <div className="space-y-2">
                               <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Unidade</label>
                               <select 
                                 value={editingProduct.unit}
                                 onChange={e => setEditingProduct({...editingProduct, unit: e.target.value})}
                                 className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl ring-1 ring-slate-200 dark:ring-slate-700 outline-none focus:ring-2 focus:ring-emerald-500"
                               >
                                 <option value="kg">Quilo (kg)</option>
                                 <option value="unid">Unidade</option>
                                 <option value="bandeja">Bandeja</option>
                                 <option value="Cesta">Cesta</option>
                                 <option value="kit">Kit / Combo</option>
                               </select>
                            </div>
                         </div>
                         <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Categoria</label>
                            <select 
                              value={editingProduct.category}
                              onChange={e => setEditingProduct({...editingProduct, category: e.target.value})}
                              className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl ring-1 ring-slate-200 dark:ring-slate-700 outline-none focus:ring-2 focus:ring-emerald-500"
                            >
                              <option value="Frutas">Frutas</option>
                              <option value="Verduras">Verduras</option>
                              <option value="Legumes">Legumes</option>
                              <option value="Kits">Kits Saudáveis</option>
                              <option value="Cestas">Cestas</option>
                            </select>
                         </div>
                      </div>

                      <div className="space-y-6">
                         <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Imagem (URL)</label>
                            <div className="relative group overflow-hidden rounded-2xl aspect-video bg-slate-100 dark:bg-slate-800 border-2 border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center text-center p-4">
                               {editingProduct.image ? (
                                 <img src={editingProduct.image} className="absolute inset-0 w-full h-full object-cover" referrerPolicy="no-referrer" />
                               ) : (
                                 <>
                                   <Upload className="w-8 h-8 text-slate-400 mb-2" />
                                   <span className="text-[10px] text-slate-500">Colar link de imagem ou fazer upload</span>
                                 </>
                               )}
                               <input 
                                 className="absolute inset-0 opacity-0 cursor-pointer"
                                 onChange={e => {
                                   const val = e.target.value;
                                   if (val) setEditingProduct({...editingProduct, image: val});
                                 }}
                               />
                            </div>
                         </div>
                         <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Descrição detalhada</label>
                            <textarea 
                              value={editingProduct.description}
                              onChange={e => setEditingProduct({...editingProduct, description: e.target.value})}
                              className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl ring-1 ring-slate-200 dark:ring-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 text-sm h-28 resize-none"
                              placeholder="Fale mais sobre a origem e benefícios..."
                            />
                         </div>
                      </div>
                   </div>

                   <div className="flex gap-4 pt-4">
                      <button 
                        type="button"
                        onClick={() => setIsProductModalOpen(false)}
                        className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-200 rounded-2xl font-bold"
                      >
                        Cancelar
                      </button>
                      <button 
                        type="submit"
                        className="flex-[2] py-4 clay-primary px-6 py-3 font-bold shadow-xl shadow-emerald-500/20 hover:bg-emerald-700 transition-all"
                      >
                        Salvar Produto
                      </button>
                   </div>
                </form>
              </motion.div>
           </div>
         )}
      </AnimatePresence>
    </div>
  );
}
