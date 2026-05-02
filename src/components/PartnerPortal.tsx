import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Store, ShoppingBasket, MapPin, Truck, Clock, CreditCard, 
  ChevronRight, ChevronLeft, CheckCircle2, Upload, Plus, 
  Trash2, Package, TrendingUp, Inbox, Settings, Volume2, 
  Sparkles, Smartphone, LayoutDashboard, Utensils
} from 'lucide-react';
import { speak } from '../lib/speech';

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
  const [isPlaying, setIsPlaying] = useState(false);
  const [editingProduct, setEditingProduct] = useState<{ id: string; name: string; price: string; unit: string; description: string; image: string; category: string } | null>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);

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
        image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=400',
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
    handleSpeak(guidance);
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
      image: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&q=80&w=400',
      category: 'Frutas'
    });
    setIsProductModalOpen(true);
  };

  // Onboarding Screen
  if (step === 'onboarding') {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="bg-white dark:bg-slate-900 rounded-[40px] overflow-hidden shadow-2xl border border-white/60 dark:border-slate-800 flex flex-col lg:flex-row">
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
                className="px-10 py-5 bg-emerald-600 text-white rounded-2xl font-bold text-lg shadow-xl shadow-emerald-500/30 hover:bg-emerald-700 transition-all flex items-center justify-center gap-3"
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
                  className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-8 rounded-[32px] border border-white dark:border-slate-800 shadow-xl flex flex-col items-center text-center space-y-3"
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
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 grid lg:grid-cols-12 gap-8">
        <aside className="lg:col-span-3 space-y-4">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center text-white font-bold text-xl uppercase">
                {form.businessName.charAt(0)}
              </div>
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white truncate max-w-[150px]">{form.businessName}</h4>
                <p className="text-xs text-emerald-500 font-bold">● Vendedor Ativo</p>
              </div>
            </div>
            
            <nav className="space-y-1">
              {[
                { icon: LayoutDashboard, label: 'Painel', active: true },
                { icon: Inbox, label: 'Pedidos', count: '4' },
                { icon: Package, label: 'Estoque' },
                { icon: TrendingUp, label: 'Vendas' },
                { icon: Settings, label: 'Configurações' }
              ].map((item, i) => (
                <button 
                  key={i}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold transition-all ${item.active ? 'bg-emerald-500 text-white' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </div>
                  {item.count && <span className="bg-white text-emerald-600 px-2 py-0.5 rounded-full text-[10px]">{item.count}</span>}
                </button>
              ))}
            </nav>
          </div>
          
          <button 
            onClick={() => setStep('onboarding')}
            className="w-full py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-2xl font-bold text-sm"
          >
            Sair do Painel
          </button>
        </aside>

        <main className="lg:col-span-9 space-y-8">
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { label: 'Vendas Hoje', val: 'R$ 450,00', sub: '+12%', color: 'emerald' },
              { label: 'Novos Pedidos', val: '04', sub: 'Pendentes', color: 'blue' },
              { label: 'Ticket Médio', val: 'R$ 112,50', sub: 'Estável', color: 'purple' }
            ].map((stat, i) => (
              <div key={i} className="bg-white dark:bg-slate-900 p-8 rounded-[32px] border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
                <div className={`absolute top-0 right-0 w-24 h-24 bg-${stat.color}-500/5 rounded-full -mr-8 -mt-8`} />
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
                <p className="text-3xl font-serif font-bold text-slate-900 dark:text-white">{stat.val}</p>
                <p className={`text-[10px] font-bold mt-2 ${stat.color === 'emerald' ? 'text-emerald-500' : 'text-slate-500'}`}>{stat.sub}</p>
              </div>
            ))}
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-[32px] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h4 className="font-serif text-xl font-bold text-slate-900 dark:text-white">Pedidos Recentes</h4>
              <button className="text-emerald-600 font-bold text-sm">Ver todos</button>
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
                      <th className="px-6 py-4">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                    {[
                      { id: '#4401', user: 'Ana Maria', items: 'Combo Detox + 5kg Laranja', total: 'R$ 89,90', status: 'Novo' },
                      { id: '#4402', user: 'Pedro S.', items: 'Abacaxi, Melancia, Uva', total: 'R$ 45,00', status: 'Preparando' },
                      { id: '#4403', user: 'Julia L.', items: 'Cesta Família G', total: 'R$ 120,00', status: 'Enviado' }
                    ].map((order, i) => (
                      <tr key={i} className="text-sm dark:bg-transparent">
                        <td className="px-6 py-4 font-mono font-bold text-slate-400">{order.id}</td>
                        <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">{order.user}</td>
                        <td className="px-6 py-4 text-slate-500">{order.items}</td>
                        <td className="px-6 py-4 font-bold text-emerald-600">{order.total}</td>
                        <td className="px-6 py-4">
                           <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${
                             order.status === 'Novo' ? 'bg-blue-100 text-blue-600' : 
                             order.status === 'Preparando' ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'
                           }`}>
                             {order.status}
                           </span>
                        </td>
                        <td className="px-6 py-4">
                          <button className="text-slate-400 hover:text-emerald-500 transition-all">
                             <ChevronRight className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
               </table>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Pending Approval
  if (step === 'pending') {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-8 animate-in fade-in zoom-in duration-700">
         <div className="w-32 h-32 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto shadow-2xl shadow-emerald-500/20">
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
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="bg-white dark:bg-slate-900 rounded-[40px] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
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

        <div className="p-8 md:p-12 space-y-10">
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
                className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-400 hover:bg-emerald-500 hover:text-white transition-all"
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
                   <div className="p-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[32px] flex flex-col items-center justify-center text-center space-y-4 bg-slate-50 dark:bg-slate-950">
                      <div className="w-16 h-16 bg-white dark:bg-slate-900 rounded-2xl shadow-sm flex items-center justify-center text-emerald-500">
                         <MapPin className="w-8 h-8" />
                      </div>
                      <div className="space-y-1">
                        <p className="font-bold text-slate-900 dark:text-white">Marcar Localização no Mapa</p>
                        <p className="text-xs text-slate-500">Isso ajudará clientes locais a te encontrarem.</p>
                      </div>
                      <button className="px-6 py-2.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl font-bold text-xs border border-slate-200 dark:border-slate-700">
                        Abrir Mapa Interativo
                      </button>
                   </div>
                   
                   <div className="grid grid-cols-3 gap-6">
                      <div className="col-span-2 space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase">Endereço</label>
                        <input type="text" placeholder="Rua, número, bairro" className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl ring-1 ring-slate-200 dark:ring-slate-700 outline-none" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase">CEP</label>
                        <input type="text" placeholder="00000-000" className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl ring-1 ring-slate-200 dark:ring-slate-700 outline-none" />
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
                        <div key={p.id} className="bg-slate-50 dark:bg-slate-950 rounded-[32px] border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden group shadow-sm hover:shadow-md transition-all">
                           <div className="relative h-40 overflow-hidden">
                              <img src={p.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
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
                        className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[32px] flex flex-col items-center justify-center space-y-4 min-h-[220px] hover:bg-slate-50 dark:hover:bg-slate-950 transition-all group"
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
                      handleSpeak("Parabéns! Seu cadastro foi enviado com sucesso. Em breve você estará vendendo para toda a comunidade NutriAI.");
                   }
                }}
                className="flex-1 py-5 bg-emerald-600 text-white rounded-2xl font-bold text-lg shadow-xl shadow-emerald-500/30 hover:bg-emerald-700 transition-all flex items-center justify-center gap-3"
              >
                {step === 'payment' ? 'Concluir Cadastro' : 'Próximo Passo'}
                <ChevronRight className="w-6 h-6" />
              </button>
           </div>
        </div>
      </div>

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
                className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-[40px] shadow-2xl overflow-hidden"
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
                                 <img src={editingProduct.image} className="absolute inset-0 w-full h-full object-cover" />
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
                        className="flex-[2] py-4 bg-emerald-600 text-white rounded-2xl font-bold shadow-xl shadow-emerald-500/20 hover:bg-emerald-700 transition-all"
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
