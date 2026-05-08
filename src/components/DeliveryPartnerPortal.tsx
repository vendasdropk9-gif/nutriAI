import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bike, Navigation, MapPin, CheckCircle2, Store, Clock, Settings, Wallet, AlertCircle, ChevronLeft } from 'lucide-react';

export function DeliveryPartnerPortal({ onBack }: { onBack: () => void }) {
  const [step, setStep] = useState<'landing' | 'register' | 'dashboard'>('landing');
  const [status, setStatus] = useState<'available' | 'delivering' | 'offline'>('offline');
  const [activeTab, setActiveTab] = useState<'home' | 'map' | 'earnings' | 'settings'>('home');

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setStep('dashboard');
    setStatus('available');
  };

  const getStatusColor = () => {
    switch(status) {
      case 'available': return 'bg-emerald-500';
      case 'delivering': return 'bg-blue-500';
      case 'offline': return 'bg-slate-400';
    }
  };

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
            <p className="text-slate-500 dark:text-slate-400">Seja seu próprio chefe e entregue saúde.</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-12 items-center">
           <div className="space-y-8">
              <h3 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white leading-tight">
                 Faça suas horas.<br />Ganhe <span className="text-emerald-500">mais</span>.
              </h3>
              <p className="text-lg text-slate-600 dark:text-slate-300">
                 Junte-se à frota mais rápida da cidade entregando alimentos frescos e saudáveis.
              </p>
              
              <div className="space-y-4">
                 <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center shrink-0">
                       <Clock className="w-6 h-6" />
                    </div>
                    <div>
                       <h4 className="font-bold text-slate-900 dark:text-white">Flexibilidade Total</h4>
                       <p className="text-slate-500 text-sm">Fique online quando quiser.</p>
                    </div>
                 </div>
                 <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center shrink-0">
                       <Wallet className="w-6 h-6" />
                    </div>
                    <div>
                       <h4 className="font-bold text-slate-900 dark:text-white">Ganhos Claros</h4>
                       <p className="text-slate-500 text-sm">Saiba o valor antes de aceitar a corrida.</p>
                    </div>
                 </div>
              </div>

              <button 
                 onClick={() => setStep('register')}
                 className="w-full sm:w-auto px-8 py-4 clay-primary px-6 py-3 font-bold text-lg shadow-xl shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                 Começar Agora
                 <Bike className="w-5 h-5" />
              </button>
           </div>
           
           <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 to-blue-500/20 rounded-[40px] clay-card blur-3xl -z-10" />
              <div className="bg-slate-900 rounded-[40px] clay-card p-8 border border-slate-800 shadow-2xl relative overflow-hidden">
                 <div className="absolute top-0 right-0 p-8 opacity-10">
                    <Bike className="w-48 h-48" />
                 </div>
                 <h4 className="text-2xl font-bold text-white mb-6">Cadastro Rápido</h4>
                 <div className="space-y-4 relative z-10">
                    <div className="bg-slate-800/80 p-4 rounded-2xl flex items-center gap-4">
                       <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold font-serif">1</div>
                       <p className="text-slate-300">Dados Básicos & CNH</p>
                    </div>
                    <div className="bg-slate-800/80 p-4 rounded-2xl flex items-center gap-4">
                       <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold font-serif">2</div>
                       <p className="text-slate-300">Aprovação IA (até 5min)</p>
                    </div>
                    <div className="bg-slate-800/80 p-4 rounded-2xl flex items-center gap-4">
                       <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold font-serif">3</div>
                       <p className="text-slate-300">Pronto para rodar!</p>
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
        <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
           <button onClick={() => setStep('landing')} className="flex items-center gap-2 text-slate-500 hover:text-emerald-500 transition-colors font-bold text-sm uppercase tracking-widest">
              <ChevronLeft className="w-4 h-4" /> Voltar
           </button>
           
           <h2 className="text-3xl font-serif font-bold">Crie sua conta</h2>
           <form onSubmit={handleRegister} className="clay-card p-6 space-y-6">
              <div className="space-y-4">
                 <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Nome Completo</label>
                    <input required type="text" className="w-full p-4 bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Ex: Carlos Silva" />
                 </div>
                 <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Telefone</label>
                    <input required type="tel" className="w-full p-4 bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500" placeholder="(00) 00000-0000" />
                 </div>
                 <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Veículo</label>
                    <div className="grid grid-cols-2 gap-4">
                       <label className="flex items-center gap-3 p-4 border dark:border-slate-700 rounded-2xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800">
                          <input type="radio" name="vehicle" defaultChecked className="text-emerald-500 w-5 h-5 focus:ring-emerald-500" />
                          <span className="font-bold">Moto</span>
                       </label>
                       <label className="flex items-center gap-3 p-4 border dark:border-slate-700 rounded-2xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800">
                          <input type="radio" name="vehicle" className="text-emerald-500 w-5 h-5 focus:ring-emerald-500" />
                          <span className="font-bold">Bicicleta</span>
                       </label>
                    </div>
                 </div>
              </div>

              <div className="pt-6">
                 <button type="submit" className="w-full py-4 clay-primary px-6 py-3 font-bold text-lg hover:bg-emerald-700 transition-colors shadow-lg">
                    Concluir Cadastro
                 </button>
              </div>
           </form>
        </div>
     );
  }

  // Dashboard
  return (
    <div className="max-w-md mx-auto min-h-[80vh] bg-slate-50 dark:bg-slate-900 rounded-[40px] clay-card shadow-2xl overflow-hidden flex flex-col border border-slate-200 dark:border-slate-800 relative animate-in zoom-in-95 duration-500 pb-20">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 p-6 shadow-sm z-10 flex items-center justify-between">
         <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden border-2 border-white dark:border-slate-700">
               <img src="https://images.unsplash.com/photo-1599566150163-29194dcaad36?auto=format&fit=crop&q=80&w=100&h=100" alt="Avatar" className="w-full h-full object-cover" />
            </div>
            <div>
               <h3 className="font-bold text-slate-900 dark:text-white leading-tight">Carlos S.</h3>
               <p className="text-xs text-slate-500 flex items-center gap-1">⭐ 5.0 (Novo)</p>
            </div>
         </div>
         
         <button 
           onClick={() => setStatus(s => s === 'offline' ? 'available' : 'offline')}
           className={`px-4 py-2 rounded-full font-bold text-xs uppercase tracking-widest text-white flex items-center gap-2 transition-all ${status === 'offline' ? 'bg-slate-400' : 'bg-emerald-500'}`}
         >
            <div className={`w-2 h-2 rounded-full ${status === 'offline' ? 'bg-slate-200' : 'bg-white animate-pulse'}`} />
            {status === 'offline' ? 'Ficar Online' : 'Online'}
         </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
         {status === 'offline' ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4 mt-20">
               <div className="w-24 h-24 bg-slate-200 dark:bg-slate-800 rounded-full flex items-center justify-center">
                  <Bike className="w-10 h-10 text-slate-400" />
               </div>
               <div>
                  <h4 className="text-xl font-bold mb-2">Você está Offline</h4>
                  <p className="text-slate-500 text-sm max-w-[200px] mx-auto">Fique online para começar a receber pedidos próximos.</p>
               </div>
            </div>
         ) : (
            <div className="space-y-6">
               <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl p-6 text-white shadow-xl shadow-emerald-500/20 relative overflow-hidden">
                  <div className="relative z-10 flex items-center justify-between">
                     <div>
                        <p className="text-emerald-100 text-sm font-bold uppercase tracking-widest mb-1">Ganhos Hoje</p>
                        <p className="text-4xl font-serif font-bold">R$ 0,00</p>
                     </div>
                     <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center">
                        <Wallet className="w-6 h-6" />
                     </div>
                  </div>
                  <div className="absolute -bottom-4 -right-4 opacity-20">
                     <Bike className="w-32 h-32" />
                  </div>
               </div>

               {/* Mock Order Request - shows up when online */}
               <motion.div 
                 initial={{ opacity: 0, y: 20, scale: 0.95 }}
                 animate={{ opacity: 1, y: 0, scale: 1 }}
                 className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-xl border-2 border-emerald-500 relative overflow-hidden group hover:shadow-emerald-500/20 transition-all cursor-pointer"
                 onClick={() => setStatus('delivering')}
               >
                  {/* Ping effect */}
                  <div className="absolute top-4 right-4 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                  </div>

                  <h4 className="font-black text-slate-800 dark:text-white uppercase tracking-widest text-xs mb-4 text-emerald-500">Novo Pedido Próximo</h4>
                  
                  <div className="flex items-center justify-between mb-6">
                     <p className="text-3xl font-serif font-bold text-slate-900 dark:text-white">R$ 7,50</p>
                     <div className="bg-slate-100 dark:bg-slate-700 px-3 py-1.5 rounded-lg">
                        <p className="text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1">
                           <MapPin className="w-3 h-3" /> 2.3 km total
                        </p>
                     </div>
                  </div>

                  <div className="space-y-4 mb-6">
                     <div className="flex gap-4">
                        <div className="w-8 shrink-0 flex flex-col items-center">
                           <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center z-10"><Store className="w-3 h-3" /></div>
                           <div className="w-0.5 h-full bg-slate-200 dark:bg-slate-700 my-1"></div>
                        </div>
                        <div>
                           <p className="text-xs font-bold text-slate-500 uppercase">Coleta (0.8km)</p>
                           <p className="font-medium text-sm text-slate-900 dark:text-white leading-tight mt-1">Sacolão Saúde<br/><span className="text-slate-500 text-xs font-normal">Av. Paulista, 1000</span></p>
                        </div>
                     </div>
                     <div className="flex gap-4">
                        <div className="w-8 shrink-0 flex flex-col items-center">
                           <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center z-10"><MapPin className="w-3 h-3" /></div>
                        </div>
                        <div>
                           <p className="text-xs font-bold text-slate-500 uppercase">Entrega (1.5km)</p>
                           <p className="font-medium text-sm text-slate-900 dark:text-white leading-tight mt-1">Ana Paula C.<br/><span className="text-slate-500 text-xs font-normal">Rua Augusta, 1500</span></p>
                        </div>
                     </div>
                  </div>

                  {status === 'available' ? (
                     <button className="w-full py-4 clay-btn px-6 py-3 font-bold transform transition-transform group-hover:scale-[1.02] active:scale-[0.98]">
                        Toque para Aceitar
                     </button>
                  ) : (
                     <button className="w-full py-4 clay-primary px-6 py-3 font-bold flex items-center justify-center gap-2">
                        <Navigation className="w-5 h-5" />
                        Iniciar Rota
                     </button>
                  )}
               </motion.div>
            </div>
         )}
      </div>

      {/* Action Button that replaces bottom nav if we are delivering */}
      {status === 'delivering' && (
         <div className="absolute inset-x-0 bottom-0 bg-white dark:bg-slate-800 p-6 shadow-[0_-20px_40px_rgba(0,0,0,0.1)] border-t border-slate-100 dark:border-slate-800 animate-in slide-in-from-bottom-full duration-300">
            <button 
              onClick={() => { setStatus('available'); }}
              className="w-full h-14 clay-primary px-6 py-3 font-bold shadow-xl shadow-emerald-500/20 active:scale-95 transition-transform"
            >
               Confirmar Coleta
            </button>
         </div>
      )}

      {/* Bottom Nav */}
      <div className={`absolute inset-x-0 bottom-0 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-800 flex justify-around p-4 transition-transform duration-300 ${status === 'delivering' ? 'translate-y-full' : 'translate-y-0'}`}>
         {[
            { id: 'home', icon: Navigation, label: 'Início' },
            { id: 'earnings', icon: Wallet, label: 'Ganhos' },
            { id: 'settings', icon: Settings, label: 'Conta' }
         ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex flex-col items-center gap-1 p-2 w-16 ${activeTab === tab.id ? 'text-emerald-500' : 'text-slate-400 hover:text-slate-600'}`}>
               <tab.icon className={`w-6 h-6 ${activeTab === tab.id ? 'stroke-[2.5]' : 'stroke-2'}`} />
               <span className="text-[10px] font-bold">{tab.label}</span>
            </button>
         ))}
      </div>
    </div>
  );
}
