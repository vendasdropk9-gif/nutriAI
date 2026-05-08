import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, Navigation, Map as MapIcon, Package, CheckCircle2, Clock, Phone, MessageCircle, X, Store } from 'lucide-react';

interface DeliveryTrackingProps {
  orderTotal: number;
  onClose: () => void;
}

type DeliveryStatus = 'preparing' | 'on_the_way' | 'arriving' | 'delivered';

export function DeliveryTracking({ orderTotal, onClose }: DeliveryTrackingProps) {
  const [status, setStatus] = useState<DeliveryStatus>('preparing');
  const [progress, setProgress] = useState(0); // 0 to 100

  // Simulate delivery process
  useEffect(() => {
    let timer1: NodeJS.Timeout, timer2: NodeJS.Timeout, timer3: NodeJS.Timeout;
    
    // Start preparing
    timer1 = setTimeout(() => {
      setStatus('on_the_way');
      setProgress(25);
      
      const simulateMovement = setInterval(() => {
        setProgress(p => {
          if (p >= 85) {
            clearInterval(simulateMovement);
            return p;
          }
          return p + 1;
        });
      }, 500);

      // Transition to arriving
      timer2 = setTimeout(() => {
        setStatus('arriving');
      }, 15000);

      // Transition to delivered
      timer3 = setTimeout(() => {
        setStatus('delivered');
        setProgress(100);
      }, 25000);

      return () => clearInterval(simulateMovement);
    }, 5000);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, []);

  const getStatusText = () => {
    switch (status) {
      case 'preparing': return 'Preparando seu pedido...';
      case 'on_the_way': return 'Saiu para entrega';
      case 'arriving': return 'Chegando!';
      case 'delivered': return 'Pedido Entregue';
    }
  };

  const getETA = () => {
    switch (status) {
      case 'preparing': return '15-20 min';
      case 'on_the_way': return '8-12 min';
      case 'arriving': return '1-2 min';
      case 'delivered': return 'Finalizado';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: '100%' }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: '100%' }}
      className="fixed inset-0 z-[200] bg-white dark:bg-slate-900 flex flex-col font-sans"
    >
      {/* Header */}
      <div className="absolute top-0 inset-x-0 z-20 flex items-center justify-between p-6 bg-gradient-to-b from-black/50 to-transparent">
        <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-md px-4 py-2 rounded-full border border-white/20 shadow-lg flex items-center gap-2">
          <Clock className="w-5 h-5 text-emerald-500" />
          <span className="font-bold text-slate-800 dark:text-white">Previsão: {getETA()}</span>
        </div>
        <button 
          onClick={onClose}
          className="w-12 h-12 bg-white/90 dark:bg-slate-800/90 backdrop-blur-md rounded-full flex items-center justify-center shadow-lg text-slate-700 dark:text-slate-200"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Simulated Map Area */}
      <div className="relative flex-1 bg-slate-100 dark:bg-slate-800 overflow-hidden">
        {/* Decorative Grid indicating "City Maps" */}
        <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]" 
             style={{ backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        
        {/* Map Elements */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
           {/* Store Location */}
           <div className="absolute top-1/4 left-1/4 flex flex-col items-center gap-2">
              <div className="w-16 h-16 bg-emerald-500/20 rounded-full animate-ping absolute" />
              <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center text-white shadow-xl relative z-10">
                 <Store className="w-6 h-6" />
              </div>
           </div>

           {/* User Location */}
           <div className="absolute bottom-1/4 right-1/4 flex flex-col items-center gap-2">
              <div className="w-12 h-12 bg-slate-900 dark:bg-white rounded-full flex items-center justify-center text-white dark:text-slate-900 shadow-xl z-10">
                 <MapPin className="w-6 h-6" />
              </div>
           </div>

           {/* Route Line (Simulated) */}
           <svg className="absolute inset-0 w-full h-full stroke-emerald-500 stroke-[4] drop-shadow-lg opacity-30" style={{ strokeDasharray: '8 8', strokeLinecap: 'round' }}>
              {/* Curve from store to user */}
              <path d="M 25% 25% Q 75% 25% 75% 75%" fill="none" className="vector-effect-non-scaling-stroke" />
           </svg>

           {/* Motorcycle Marker (Moves along the route based on progress) */}
           <motion.div 
             className="absolute w-14 h-14 bg-white dark:bg-slate-800 rounded-full shadow-2xl flex items-center justify-center z-20 border-2 border-emerald-500"
             animate={{
                left: `${25 + (progress / 100) * 50}%`,
                top: `${25 + (progress / 100) * 50}%`,
             }}
             transition={{ ease: 'linear', duration: 0.5 }}
             style={{ transform: 'translate(-50%, -50%)' }}
           >
              <span className="text-2xl">🛵</span>
           </motion.div>
        </div>
      </div>

      {/* Info Panel */}
      <div className="bg-white dark:bg-slate-900 rounded-t-[40px] shadow-[0_-20px_40px_rgba(0,0,0,0.1)] z-30 -mt-10 px-6 py-8 md:px-12 md:py-10 space-y-8 relative">
         <div className="w-16 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto absolute top-4 left-1/2 -translate-x-1/2" />
         
         <div className="flex items-center justify-between">
            <div>
               <h3 className="text-2xl font-serif font-bold text-slate-900 dark:text-white">{getStatusText()}</h3>
               <p className="text-slate-500 dark:text-slate-400 mt-1">Pedido #4029 • R$ {orderTotal.toFixed(2)}</p>
            </div>
            {status === 'delivered' ? (
              <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
                 <CheckCircle2 className="w-8 h-8" />
              </div>
            ) : (
              <div className="w-14 h-14 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center">
                 <Package className="w-8 h-8" />
              </div>
            )}
         </div>

         {/* Steps indicator */}
         <div className="flex justify-between items-center relative">
            <div className="absolute top-1/2 left-0 right-0 h-1 bg-slate-100 dark:bg-slate-800 -translate-y-1/2 z-0" />
            
            <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center transition-colors ${status === 'preparing' || status === 'on_the_way' || status === 'arriving' || status === 'delivered' ? 'bg-emerald-500 text-white shadow-xl shadow-emerald-500/30' : 'bg-slate-200 dark:bg-slate-700 text-slate-400'}`}>
               <Store className="w-5 h-5" />
            </div>
            
            <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center transition-colors ${status === 'on_the_way' || status === 'arriving' || status === 'delivered' ? 'bg-emerald-500 text-white shadow-xl shadow-emerald-500/30' : 'bg-slate-200 dark:bg-slate-700 text-slate-400'}`}>
               <Navigation className="w-5 h-5" />
            </div>

            <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center transition-colors ${status === 'delivered' ? 'bg-emerald-500 text-white shadow-xl shadow-emerald-500/30' : 'bg-slate-200 dark:bg-slate-700 text-slate-400'}`}>
               <MapPin className="w-5 h-5" />
            </div>
         </div>

         {/* Driver Info */}
         {status !== 'preparing' && status !== 'delivered' && (
           <motion.div 
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-3xl border border-slate-100 dark:border-slate-700/50 flex items-center justify-between"
           >
              <div className="flex items-center gap-4">
                 <div className="w-16 h-16 bg-slate-200 rounded-full overflow-hidden border-2 border-white dark:border-slate-700">
                    <img src="https://images.unsplash.com/photo-1599566150163-29194dcaad36?auto=format&fit=crop&q=80&w=200&h=200" alt="Entregador" className="w-full h-full object-cover" />
                 </div>
                 <div>
                    <h4 className="font-bold text-slate-900 dark:text-white">Carlos S.</h4>
                    <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1">
                       ⭐ 4.9 <span className="opacity-50">|</span> Honda CG 160
                    </p>
                 </div>
              </div>
              
              <div className="flex gap-2">
                 <button className="w-12 h-12 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-lg text-emerald-600 hover:bg-emerald-50 transition-colors">
                    <MessageCircle className="w-5 h-5" />
                 </button>
                 <button className="w-12 h-12 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-lg text-emerald-600 hover:bg-emerald-50 transition-colors">
                    <Phone className="w-5 h-5" />
                 </button>
              </div>
           </motion.div>
         )}

         {status === 'delivered' && (
           <motion.div 
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             className="flex flex-col gap-4"
           >
             <button 
                onClick={onClose}
                className="w-full py-5 bg-emerald-500 hover:clay-primary px-6 py-3 font-bold text-lg shadow-xl shadow-emerald-500/20 active:scale-95 transition-all"
             >
                Recebi o Pedido
             </button>
           </motion.div>
         )}
      </div>
    </motion.div>
  );
}
