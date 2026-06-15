import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bike, Navigation, MapPin, CheckCircle2, Store, Clock, Settings, Wallet, AlertCircle, ChevronLeft, User, Phone, Check, RefreshCw, Zap, TrendingUp, Package, Star } from 'lucide-react';

export function DeliveryPartnerPortal({ onBack, addNotification }: { onBack: () => void; addNotification?: (notif: any) => void }) {
  const [step, setStep] = useState<'landing' | 'register' | 'dashboard'>('landing');
  const [status, setStatus] = useState<'available' | 'delivering' | 'offline'>('offline');
  const [activeTab, setActiveTab] = useState<'home' | 'earnings' | 'settings'>('home');
  
  // Registration Form States
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [cnh, setCnh] = useState('');
  const [rg, setRg] = useState('');
  const [vehicleType, setVehicleType] = useState<'bicicleta' | 'moto'>('bicicleta');
  const [vehicleModel, setVehicleModel] = useState('');
  const [plate, setPlate] = useState('');
  const [routes, setRoutes] = useState('Centro, Paulista, Augusta');
  const [hours, setHours] = useState('08:00 - 18:00');
  
  // Courier Session Info
  const [courier, setCourier] = useState<any>(null);
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Register New Courier on backend
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone || !cnh) return;

    setIsLoading(true);
    try {
      const res = await fetch('/api/delivery/couriers/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          phone,
          cnh,
          rg,
          vehicleType,
          vehicleModel: vehicleModel || (vehicleType === 'moto' ? "Yamaha Factor 125" : "Bicicleta Caloi"),
          plate: vehicleType === 'moto' ? plate : 'N/A',
          routes: routes.split(',').map(r => r.trim()),
          hours
        })
      });

      if (res.ok) {
        const data = await res.json();
        setCourier(data.courier);
        setStep('dashboard');
        setStatus('available');
        if (addNotification) {
          addNotification({
            title: "Cadastro Concluído!",
            message: `Olá, ${data.courier.name}. Você já está qualificado para receber corridas!`,
            type: "success"
          });
        }
      }
    } catch (err) {
      console.error("Erro ao registrar entregador:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const [pastJobs, setPastJobs] = useState<any[]>([]);
  const [customerRating, setCustomerRating] = useState(5);
  const [showRatingModal, setShowRatingModal] = useState<string | null>(null);

  // Poll deliveries assigned to this courier in real-time
  const fetchMyDeliveries = async () => {
    if (!courier) return;
    try {
      const { collection, getDocs, query, where } = await import('firebase/firestore');
      const { db } = await import('../lib/firebase');
      
      // Fetch all deliveries where courierId matches
      const q = query(
        collection(db, "deliveries"),
        where("courierId", "==", courier.id)
      );
      const snap = await getDocs(q);
      const list = snap.docs.map(doc => doc.data());
      setDeliveries(list);
      setPastJobs(list.filter(d => d.status === 'delivered'));

      // Auto update delivery status if we are offline vs active
      const hasDelivering = list.some(d => d.status === 'accepted' || d.status === 'on_the_way');
      if (hasDelivering) {
        setStatus('delivering');
      } else if (status === 'delivering') {
        setStatus('available');
      }
    } catch (e) {
      console.warn("Falha ao pollar entregas no portal:", e);
    }
  };

  useEffect(() => {
    if (step !== 'dashboard' || !courier) return;

    fetchMyDeliveries();
    const interval = setInterval(fetchMyDeliveries, 2000);
    return () => clearInterval(interval);
  }, [step, courier, status]);

  // Update status of actual delivery
  const handleUpdateDeliveryStatus = async (deliveryId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/delivery/orders/${deliveryId}/update-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      if (res.ok) {
        if (newStatus === 'delivered') {
           setShowRatingModal(deliveryId);
        }
        await fetchMyDeliveries();
        if (addNotification) {
          const statusMsgs: Record<string, string> = {
            'accepted': "Corrida aceita. Vá retirar os produtos no Sacolão!",
            'on_the_way': "Pedido retirado. Trânsito iniciado até o endereço do cliente!",
            'delivered': "Pedido entregue com sucesso! Nota de serviço registrada."
          };
          addNotification({
            title: "Sucesso!",
            message: statusMsgs[newStatus] || "Status do pedido modificado",
            type: "success"
          });
        }
      }
    } catch (e) {
      console.error("Erro ao alterar status da entrega:", e);
    }
  };

  const handleRateCustomer = () => {
    setShowRatingModal(null);
    if (addNotification) {
       addNotification({
         title: "Avaliação Enviada",
         message: "Sua avaliação sobre o cliente ajuda a manter a comunidade NutriAI segura.",
         type: "success"
       });
    }
  };

  const activeJobs = deliveries.filter(d => d.status !== 'delivered');
  const todayEarnings = pastJobs.reduce((acc, curr) => acc + (curr.total * 0.20 + 5.00), 0);

  if (step === 'landing') {
    return (
      <div className="max-w-6xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="flex items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
          <button onClick={onBack} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
             <ChevronLeft className="w-6 h-6" />
          </button>
          <div>
            <h2 className="text-3xl font-serif font-bold text-slate-900 dark:text-white flex items-center gap-3">
              <Bike className="w-8 h-8 text-emerald-500" />
              Entregadores NutriAI
            </h2>
            <p className="text-slate-500 dark:text-slate-400">Seja seu próprio chefe e entregue bem-estar sustentável.</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-12 items-center">
           <div className="space-y-8">
              <h3 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white leading-tight">
                 Faça seu próprio horário.<br />Ganhe <span className="text-emerald-500">mais</span> por entrega.
              </h3>
              <p className="text-lg text-slate-600 dark:text-slate-300">
                 Junte-se à maior rede de entregas saudáveis. Privilegiamos transportes sustentáveis (bicicletas) com bônus ambientais especiais!
              </p>
              
              <div className="space-y-4">
                 <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center shrink-0">
                       <Clock className="w-6 h-6" />
                    </div>
                    <div>
                       <h4 className="font-bold text-slate-900 dark:text-white">Flexibilidade Verde</h4>
                       <p className="text-slate-500 text-sm">Trabalhe de bike elétrica, convencional ou moto quando desejar.</p>
                    </div>
                 </div>
                 <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-950/30 text-emerald-650 dark:text-emerald-400 rounded-2xl flex items-center justify-center shrink-0">
                       <Wallet className="w-6 h-6" />
                    </div>
                    <div>
                       <h4 className="font-bold text-slate-900 dark:text-white">Ganhos Claros por Km</h4>
                       <p className="text-slate-500 text-sm">Veja o trajeto, valor estimado e gorjetas antes de clicar em aceitar.</p>
                    </div>
                 </div>
              </div>

              <div className="flex gap-4">
                <button 
                   onClick={() => setStep('register')}
                   className="px-8 py-4 bg-emerald-600 text-white font-bold rounded-2xl shadow-xl hover:bg-emerald-650 hover:scale-[1.01] transition-all flex items-center gap-2"
                >
                   Começar Cadastro
                   <Bike className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => {
                    // Quick Login as existing courier
                    setCourier({
                      id: "courier-1",
                      name: "Carlos Santos",
                      vehicleType: "moto",
                      vehicleModel: "Honda CG 160 Fan"
                    });
                    setStep('dashboard');
                    setStatus('available');
                  }}
                  className="px-6 py-4 bg-slate-150 dark:bg-slate-200 text-slate-700 dark:text-slate-800 font-bold rounded-2xl hover:bg-slate-200/60 transition-all text-sm"
                >
                  Entrar como Carlos S. (Demo)
                </button>
              </div>
           </div>
           
           <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/25 to-teal-500/10 rounded-[40px] blur-3xl -z-10" />
              <div className="bg-slate-900 rounded-[40px] p-8 border border-slate-800 shadow-2xl relative overflow-hidden text-white">
                 <div className="absolute top-0 right-0 p-8 opacity-10">
                    <Bike className="w-48 h-48" />
                 </div>
                 <h4 className="text-2xl font-bold mb-6">Processo de Inscrição</h4>
                 <div className="space-y-4 relative z-10">
                    <div className="bg-slate-800/80 p-4 rounded-2xl flex items-center gap-4 border border-slate-700/50">
                       <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold">1</div>
                       <p className="text-slate-300 text-sm font-semibold">Dados Básicos & Escolha do Veículo</p>
                    </div>
                    <div className="bg-slate-800/80 p-4 rounded-2xl flex items-center gap-4 border border-slate-700/50">
                       <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold">2</div>
                       <p className="text-slate-300 text-sm font-semibold">Rotas Favoritas & Horários de Expediente</p>
                    </div>
                    <div className="bg-slate-800/80 p-4 rounded-2xl flex items-center gap-4 border border-slate-700/50">
                       <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold">3</div>
                       <p className="text-slate-300 text-sm font-semibold">Ativação Instantânea sem Filas!</p>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      </div>
    );
  }

  if (step === 'register') {
     return (
        <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-right-8 duration-500 pb-16">
           <button onClick={() => setStep('landing')} className="flex items-center gap-2 text-slate-500 hover:text-emerald-500 transition-colors font-bold text-xs uppercase tracking-widest outline-none">
              <ChevronLeft className="w-4 h-4" /> Voltar
           </button>
           
           <div>
             <h2 className="text-3xl font-serif font-bold">Crie seu Perfil de Entregador</h2>
             <p className="text-slate-500 text-sm mt-1">Preencha de forma rápida para receber rotas saudáveis em tempo real.</p>
           </div>

           <form onSubmit={handleRegister} className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-xl space-y-6">
              <div className="space-y-4">
                 <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Nome Completo</label>
                    <input required type="text" value={name} onChange={e => setName(e.target.value)} className="w-full p-4 bg-slate-50 dark:bg-slate-900 border dark:border-slate-800 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 text-xs text-slate-805 dark:text-slate-205" placeholder="Ex: Lucas Ferreira de Souza" />
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Celular / WhatsApp</label>
                    <input required type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="w-full p-4 bg-slate-50 dark:bg-slate-900 border dark:border-slate-800 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 text-xs text-slate-805 dark:text-slate-205" placeholder="Ex: (11) 99999-8888" />
                 </div>

                 <div className="grid md:grid-cols-2 gap-4">
                    <div>
                       <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Documento (RG)</label>
                       <input required type="text" value={rg} onChange={e => setRg(e.target.value)} className="w-full p-4 bg-slate-50 dark:bg-slate-900 border dark:border-slate-800 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 text-xs text-slate-805 dark:text-slate-205" placeholder="Ex: 12.345.678-9" />
                    </div>
                    <div>
                       <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Habilitação (CNH)</label>
                       <input required type="text" value={cnh} onChange={e => setCnh(e.target.value)} className="w-full p-4 bg-slate-50 dark:bg-slate-900 border dark:border-slate-800 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 text-xs text-slate-805 dark:text-slate-205" placeholder="Ex: 01234567890" />
                    </div>
                 </div>

                 <div className="grid md:grid-cols-2 gap-4">
                   <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Meio de Transporte</label>
                      <div className="grid grid-cols-2 gap-2">
                         <button 
                            type="button"
                            onClick={() => { setVehicleType('bicicleta'); setVehicleModel(''); setPlate(''); }}
                            className={`p-3 border rounded-xl flex items-center justify-center gap-2 font-bold text-xs transition-all ${vehicleType === 'bicicleta' ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600' : 'border-slate-200 dark:border-slate-700'}`}
                         >
                            <Bike className="w-4 h-4" /> Bike (Verde)
                         </button>
                         <button 
                            type="button"
                            onClick={() => { setVehicleType('moto'); setVehicleModel(''); }}
                            className={`p-3 border rounded-xl flex items-center justify-center gap-2 font-bold text-xs transition-all ${vehicleType === 'moto' ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600' : 'border-slate-200 dark:border-slate-700'}`}
                         >
                            <Navigation className="w-4 h-4" /> Moto (Turbo)
                         </button>
                      </div>
                   </div>
                   <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                        {vehicleType === 'moto' ? 'Marca/Modelo & Placa' : 'Marca/Modelo do Veículo'}
                      </label>
                      <div className="flex gap-2">
                        <input type="text" value={vehicleModel} onChange={e => setVehicleModel(e.target.value)} className="flex-1 p-4 bg-slate-50 dark:bg-slate-900 border dark:border-slate-800 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 text-xs text-slate-805 dark:text-slate-205" placeholder={vehicleType === 'moto' ? "Ex: Honda CG" : "Ex: Caloi Explorer"} />
                        {vehicleType === 'moto' && (
                          <input required type="text" value={plate} onChange={e => setPlate(e.target.value)} className="w-24 p-4 bg-slate-100 dark:bg-slate-950 border dark:border-slate-800 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 text-xs text-slate-805 dark:text-slate-205 text-center uppercase" placeholder="ABC-1234" />
                        )}
                      </div>
                   </div>
                 </div>

                 <div className="grid md:grid-cols-2 gap-4">
                   <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Rotas Preferenciais</label>
                      <input type="text" value={routes} onChange={e => setRoutes(e.target.value)} className="w-full p-4 bg-slate-50 dark:bg-slate-900 border dark:border-slate-800 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 text-xs text-slate-805 dark:text-slate-205" placeholder="Ex: Paulista, Jardins, Pinheiros" />
                   </div>
                   <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Horários Disponíveis</label>
                      <input type="text" value={hours} onChange={e => setHours(e.target.value)} className="w-full p-4 bg-slate-50 dark:bg-slate-900 border dark:border-slate-800 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 text-xs text-slate-805 dark:text-slate-205" placeholder="Ex: 08:00 - 18:00" />
                   </div>
                 </div>
              </div>

              <div className="pt-4">
                 <button 
                  type="submit" 
                  disabled={isLoading}
                  className="w-full py-4 bg-emerald-600 hover:bg-emerald-650 text-white font-bold rounded-2xl transition-all shadow-lg flex items-center justify-center gap-2"
                 >
                    {isLoading ? 'Conectando...' : 'Finalizar Ativação do Entregador'}
                    <Check className="w-5 h-5" />
                 </button>
              </div>
           </form>
        </div>
     );
  }

  // Dashboard View
  return (
    <div className="max-w-md mx-auto min-h-[80vh] bg-slate-50 dark:bg-slate-900 rounded-[32px] shadow-2xl overflow-hidden flex flex-col border border-slate-200 dark:border-slate-800 relative animate-in zoom-in-95 duration-500 pb-20">
      {/* Port Header */}
      <div className="bg-white dark:bg-slate-800 p-6 shadow-sm z-10 flex items-center justify-between border-b dark:border-slate-750">
         <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden border-2 border-emerald-500">
               <img src={courier?.photoURL || "https://images.unsplash.com/photo-1599566150163-29194dcaad36?auto=format&fit=crop&q=80&w=150&h=150"} alt="Avatar" className="w-full h-full object-cover" />
            </div>
            <div>
               <h3 className="font-bold text-slate-900 dark:text-white leading-none text-sm">{courier?.name || "Carlos Santos"}</h3>
               <p className="text-[11px] text-emerald-600 font-bold mt-1 flex items-center gap-1 uppercase tracking-tighter">
                 {courier?.vehicleType === 'moto' ? <Zap className="w-3" /> : <Bike className="w-3" />} 
                 {courier?.vehicleType === 'moto' ? 'Moto Turbo' : 'Entregador Eco'}
               </p>
            </div>
         </div>
         
         <button 
           onClick={() => setStatus(s => s === 'offline' ? 'available' : 'offline')}
           className={`px-3 py-1.5 rounded-full font-bold text-[10px] uppercase tracking-wider text-white flex items-center gap-1.5 transition-all outline-none ${status === 'offline' ? 'bg-slate-400' : 'bg-emerald-500'}`}
         >
            <span className={`w-1.5 h-1.5 rounded-full ${status === 'offline' ? 'bg-slate-200' : 'bg-white animate-pulse'}`} />
            {status === 'offline' ? 'Offline' : 'Online'}
         </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
         {status === 'offline' ? (
           <div className="h-full flex flex-col items-center justify-center text-center space-y-4 my-12">
              <div className="w-16 h-16 bg-slate-200 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-400">
                 <Bike className="w-8 h-8" />
              </div>
              <h4 className="text-md font-bold text-slate-800 dark:text-slate-100">Pronto para a jornada?</h4>
              <p className="text-slate-500 text-xs max-w-[220px] mx-auto mt-1">Fique online para identificar remessas de sacolões próximos e começar a ganhar.</p>
           </div>
         ) : (
            <div className="space-y-6">
               {/* Financial widget */}
               <div className="bg-slate-900 rounded-[28px] p-6 text-white shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                     <TrendingUp className="w-20 h-20" />
                  </div>
                  <div className="relative z-10 space-y-4">
                     <div>
                        <p className="text-white/50 text-[9px] font-bold uppercase tracking-widest mb-1">Repasse disponível p/ Saque</p>
                        <p className="text-4xl font-serif font-bold tracking-tight">R$ {todayEarnings.toFixed(2)}</p>
                     </div>
                     <button 
                        onClick={() => {
                          if (todayEarnings > 0 && addNotification) {
                            addNotification({
                              title: "Transferência Solicitada",
                              message: `O valor de R$ ${todayEarnings.toFixed(2)} foi enviado via PIX instantâneo.`,
                              type: "success"
                            });
                          }
                        }}
                        className="w-full py-3 bg-white text-slate-900 rounded-xl font-bold text-[10px] hover:bg-emerald-50 active:scale-95 transition-all shadow-lg uppercase tracking-widest"
                     >
                        Efetuar Transferência (PIX)
                     </button>
                  </div>
               </div>

               {/* JOB BOARD LIST */}
               <div className="space-y-4">
                  <div className="flex items-center justify-between">
                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Solicitações Ativas ({activeJobs.length})</p>
                     <button onClick={() => fetchMyDeliveries()} className="text-[10px] text-slate-400 flex items-center gap-1 hover:text-emerald-500 transition-colors">
                       <RefreshCw className="w-3" /> Atualizar
                     </button>
                  </div>

                  {activeJobs.length === 0 ? (
                     <div className="bg-white dark:bg-slate-800 p-8 rounded-[32px] border border-slate-100 dark:border-slate-700 text-center space-y-3">
                        <div className="w-12 h-12 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center mx-auto">
                           <Clock className="w-6 h-6 text-emerald-500/30" />
                        </div>
                        <h5 className="font-bold text-slate-800 dark:text-slate-100 text-xs">Radar de Entregas</h5>
                        <p className="text-[11px] text-slate-400 leading-relaxed">Nossa IA está buscando pedidos próximos ao seu perfil sustentável. Permaneça online!</p>
                     </div>
                  ) : (
                     activeJobs.map((job) => (
                        <div key={job.id} className="bg-white dark:bg-slate-800 rounded-[32px] p-6 border border-slate-100 dark:border-slate-705 shadow-sm space-y-6">
                           <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-700/60">
                              <div className="flex items-center gap-3">
                                 <div className="w-10 h-10 bg-emerald-50 content-[''] flex items-center justify-center rounded-xl text-emerald-600 shrink-0">
                                    <Package className="w-5 h-5" />
                                 </div>
                                 <div>
                                    <span className="text-[8px] bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-bold px-2 py-0.5 rounded-full uppercase tracking-tighter">Remessa Atribuída</span>
                                    <h5 className="font-bold text-slate-900 dark:text-white text-xs mt-1 uppercase">Ref #{job.id.substring(0, 8)}</h5>
                                 </div>
                              </div>
                              <div className="text-right">
                                <p className="text-[8px] font-bold text-slate-400 uppercase mb-0.5">Sua Parte</p>
                                <span className="text-md font-bold text-emerald-600 dark:text-emerald-400 font-serif">R$ {(job.total * 0.15 + 5.00).toFixed(2)}</span>
                              </div>
                           </div>

                           <div className="space-y-4 text-xs">
                              {/* Origin */}
                              <div className="flex gap-4">
                                 <div className="w-8 h-8 rounded-full border border-slate-100 dark:border-slate-700 flex items-center justify-center shrink-0">
                                   <Store className="w-4 h-4 text-emerald-500" />
                                 </div>
                                 <div className="flex-1">
                                    <p className="font-bold text-slate-400 uppercase text-[8px] tracking-widest mb-1 text-left">Ponto de Coleta</p>
                                    <p className="text-slate-800 dark:text-slate-205 font-bold">NutriAI Fresh Market</p>
                                    <p className="text-[10px] text-slate-500 truncate">Av. Paulista, 1500 • Bela Vista</p>
                                 </div>
                              </div>

                              {/* Destination */}
                              <div className="flex gap-4">
                                 <div className="w-8 h-8 rounded-full border border-slate-100 dark:border-slate-700 flex items-center justify-center shrink-0">
                                   <MapPin className="w-4 h-4 text-amber-500" />
                                 </div>
                                 <div className="flex-1">
                                    <p className="font-bold text-slate-400 uppercase text-[8px] tracking-widest mb-1 text-left">Local da Entrega</p>
                                    <p className="text-slate-800 dark:text-slate-205 font-bold">{job.deliveryAddress}</p>
                                    <p className="text-[10px] text-slate-500">Aproximadamente 4.2 km de rota</p>
                                 </div>
                              </div>
                           </div>

                           <div className="pt-2">
                              {job.status === 'preparing' && (
                                <button 
                                  onClick={() => handleUpdateDeliveryStatus(job.id, 'accepted')}
                                  className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-2xl text-[10px] uppercase tracking-[0.2em] hover:opacity-90 transition-all shadow-xl active:scale-95"
                                >
                                  Aceitar Corrida
                                </button>
                              )}
                              {job.status === 'accepted' && (
                                <button 
                                  onClick={() => handleUpdateDeliveryStatus(job.id, 'on_the_way')}
                                  className="w-full py-4 bg-emerald-600 text-white font-bold rounded-2xl text-[10px] uppercase tracking-[0.2em] hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-500/20 active:scale-95"
                                >
                                  Confirmar Retirada
                                </button>
                              )}
                              {(job.status === 'on_the_way' || job.status === 'arriving') && (
                                <button 
                                  onClick={() => handleUpdateDeliveryStatus(job.id, 'delivered')}
                                  className="w-full py-4 bg-emerald-500 text-white font-bold rounded-2xl text-[10px] uppercase tracking-[0.2em] animate-pulse hover:bg-emerald-600 transition-all shadow-xl shadow-emerald-500/20 active:scale-95"
                                >
                                  Finalizar Entrega
                                </button>
                              )}
                           </div>
                        </div>
                     ))
                  )}
               </div>
            </div>
         )}
      </div>

      {/* Customer Rating Modal */}
      <AnimatePresence>
        {showRatingModal && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowRatingModal(null)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 30 }}
              className="relative w-full max-w-sm bg-white dark:bg-slate-900 p-8 rounded-[40px] shadow-2xl text-center space-y-6 flex flex-col items-center"
            >
              <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-950/40 rounded-full flex items-center justify-center text-emerald-600 mx-auto">
                  <Star className="w-10 h-10 fill-current" />
              </div>
              <div className="space-y-2">
                  <h3 className="text-xl font-serif font-bold text-slate-800 dark:text-white">Avalie o Cliente</h3>
                  <p className="text-[10px] leading-relaxed text-slate-500 px-4 uppercase tracking-widest font-bold">Feedback Essencial</p>
                  <p className="text-xs text-slate-400 px-6">Sua avaliação ajuda a manter a comunidade NutriAI segura para todos os parceiros.</p>
              </div>
              
              <div className="flex justify-center gap-3">
                  {[1, 2, 3, 4, 5].map(s => (
                    <button key={s} onClick={() => setCustomerRating(s)} className="p-1 transform hover:scale-125 transition-all outline-none">
                      <Star className={`w-8 h-8 ${s <= customerRating ? 'text-amber-400 fill-current' : 'text-slate-200 dark:text-slate-800'}`} />
                    </button>
                  ))}
              </div>

              <button 
                  onClick={handleRateCustomer}
                  className="w-full py-4 bg-slate-900 dark:bg-white dark:text-slate-900 text-white rounded-2xl font-bold shadow-lg active:scale-95 transition-all uppercase tracking-widest text-[10px]"
              >
                  Enviar Avaliação
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Footer Nav tabs */}
      <div className="absolute inset-x-0 bottom-0 bg-white dark:bg-slate-800 border-t border-slate-205 dark:border-slate-750 flex justify-around p-4 font-sans">
         {[
            { id: 'home', icon: Navigation, label: 'Painel' },
            { id: 'settings', icon: Settings, label: 'Voltar' }
         ].map(tab => (
            <button 
              key={tab.id} 
              onClick={() => {
                if (tab.id === 'settings') {
                  onBack();
                } else {
                  setActiveTab(tab.id as any);
                }
              }} 
              className={`flex flex-col items-center gap-1 p-2 w-16 outline-none ${activeTab === tab.id ? 'text-emerald-500 font-bold' : 'text-slate-400 hover:text-slate-600'}`}
            >
               <tab.icon className="w-5 h-5" />
               <span className="text-[10px]">{tab.label}</span>
            </button>
         ))}
      </div>
    </div>
  );
}
