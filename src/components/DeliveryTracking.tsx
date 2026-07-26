import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, Navigation, Map as MapIcon, Package, CheckCircle2, Clock, Phone, MessageCircle, X, Store, Star, Leaf, Bike, Zap } from 'lucide-react';

interface DeliveryTrackingProps {
  orderTotal: number;
  activeDeliveryId: string | null;
  onClose: () => void;
}

type DeliveryStatus = 'preparing' | 'accepted' | 'on_the_way' | 'arriving' | 'delivered';

interface DeliveryNotification {
  id: string;
  title: string;
  message: string;
  time: string;
}

interface DeliveryDoc {
  id: string;
  orderId: string;
  total: number;
  vehicleType: 'moto' | 'bicicleta';
  courierId: string;
  courierName: string;
  courierPhone: string;
  courierPhoto: string;
  courierRating: number;
  vehicleModel: string;
  status: DeliveryStatus;
  progress: number;
  etaMinutes: number;
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  currentLat: number;
  currentLng: number;
  deliveryAddress: string;
  notifications?: DeliveryNotification[];
}

export function DeliveryTracking({ orderTotal, activeDeliveryId, onClose }: DeliveryTrackingProps) {
  const [delivery, setDelivery] = useState<DeliveryDoc | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Rating states
  const [userRating, setUserRating] = useState(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [ratingComment, setRatingComment] = useState('');
  const [hasRated, setHasRated] = useState(false);
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);

  // Status/Progress fallbacks if activeDeliveryId is null (mock-up offline flow)
  const [fallbackStatus, setFallbackStatus] = useState<DeliveryStatus>('preparing');
  const [fallbackProgress, setFallbackProgress] = useState(0);

  // Fetch / Poll Delivery context from server
  useEffect(() => {
    if (!activeDeliveryId) {
      setLoading(false);
      // Simulate fallback offline delivery
      const timer1 = setTimeout(() => {
        setFallbackStatus('on_the_way');
        setFallbackProgress(15);
        const interval = setInterval(() => {
          setFallbackProgress(p => {
            if (p >= 100) {
              clearInterval(interval);
              setFallbackStatus('delivered');
              return 100;
            }
            if (p >= 90) setFallbackStatus('arriving');
            return p + 5;
          });
        }, 1500);
        return () => clearInterval(interval);
      }, 4000);

      return () => clearTimeout(timer1);
    }

    const fetchDelivery = async () => {
      try {
        const res = await fetch(`/api/delivery/orders/${activeDeliveryId}`);
        if (res.ok) {
          const data = await res.json();
          setDelivery(data);
        }
      } catch (err) {
        console.warn("Erro ao pollar dados de entrega:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDelivery();
    const intervalId = setInterval(fetchDelivery, 1500); // pull every 1.5s for real-time smoothness
    return () => clearInterval(intervalId);
  }, [activeDeliveryId]);

  // Submit delivery / courier feedback
  const handleSubmitRating = async () => {
    if (!activeDeliveryId) {
      setHasRated(true);
      return;
    }

    setIsSubmittingRating(true);
    try {
      const res = await fetch(`/api/delivery/orders/${activeDeliveryId}/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating: userRating,
          comment: ratingComment
        })
      });
      if (res.ok) {
        setHasRated(true);
      }
    } catch (err) {
      console.error("Falha ao postar nota do entregador:", err);
    } finally {
      setIsSubmittingRating(false);
    }
  };

  const getStatusText = () => {
    const currentStatus = delivery ? delivery.status : fallbackStatus;
    switch (currentStatus) {
      case 'preparing': return 'Preparando sacolas nutritivas...';
      case 'accepted': return 'Entregador aceitou o pedido!';
      case 'on_the_way': return 'Seu pedido saiu para entrega!';
      case 'arriving': return 'O entregador está chegando!';
      case 'delivered': return 'Pedido entregue com sucesso!';
    }
  };

  const getETA = () => {
    if (delivery) {
      return delivery.status === 'delivered' ? 'Entregue' : `${delivery.etaMinutes} min`;
    }
    switch (fallbackStatus) {
      case 'preparing': return '15-20 min';
      case 'on_the_way': return '8-12 min';
      case 'arriving': return '1-2 min';
      case 'delivered': return 'Entregue';
    }
  };

  const getProgress = () => {
    return delivery ? delivery.progress : fallbackProgress;
  };

  // Coordinates mapping
  const storeLat = -23.5615;
  const storeLng = -46.6560;
  const targetLat = delivery ? delivery.endLat : -23.5700;
  const targetLng = delivery ? delivery.endLng : -46.6450;
  const currentLat = delivery ? delivery.currentLat : storeLat + (fallbackProgress / 100) * (targetLat - storeLat);
  const currentLng = delivery ? delivery.currentLng : storeLng + (fallbackProgress / 100) * (targetLng - storeLng);

  // SVG drawing ratios
  const startX = 25;
  const startY = 30;
  const endX = 75;
  const endY = 70;
  const activePercent = getProgress() / 100;
  const markerX = startX + activePercent * (endX - startX);
  const markerY = startY + activePercent * (endY - startY);

  const vehicleType = delivery ? delivery.vehicleType : 'bicicleta';

  return (
    <motion.div
      initial={{ opacity: 0, y: '100%' }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: '100%' }}
      className="fixed inset-0 z-[200] bg-white dark:bg-slate-900 flex flex-col font-sans"
    >
      {/* Header */}
      <div className="absolute top-0 inset-x-0 z-20 flex items-center justify-between p-6 bg-gradient-to-b from-black/60 to-transparent">
        <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-md px-4 py-2 rounded-full border border-white/20 shadow-lg flex items-center gap-2">
          {vehicleType === 'bicicleta' ? (
            <Bike className="w-5 h-5 text-emerald-500" />
          ) : (
            <Zap className="w-5 h-5 text-amber-500" />
          )}
          <span className="font-bold text-slate-800 dark:text-white text-sm">
            Previsão: {getETA()}
          </span>
        </div>
        <button 
          onClick={onClose}
          className="w-12 h-12 bg-white/95 dark:bg-slate-800/95 backdrop-blur-md rounded-full flex items-center justify-center shadow-lg text-slate-700 dark:text-slate-200 hover:scale-105 active:scale-95 transition-all outline-none"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Real-time Map Area */}
      <div className="relative flex-1 bg-slate-50 dark:bg-slate-950 overflow-hidden">
        {/* Map Grid Pattern */}
        <div className="absolute inset-0 opacity-[0.04] dark:opacity-[0.08]" 
             style={{ backgroundImage: 'linear-gradient(#10b981 1.5px, transparent 1.5px), linear-gradient(90deg, #10b981 1.5px, transparent 1.5px)', backgroundSize: '30px 30px' }} />
        
        {/* Animated Map Pins */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {/* Store Location */}
          <div className="absolute top-[30%] left-[25%] flex flex-col items-center gap-2">
            <div className="w-12 h-12 bg-emerald-500/20 rounded-full animate-ping absolute" />
            <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center text-white shadow-xl relative z-10 transition-colors">
              <Store className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded shadow-sm border border-emerald-100">SACOLÃO NUTRI-AI</span>
          </div>

          {/* User Location */}
          <div className="absolute top-[70%] left-[75%] flex flex-col items-center gap-2">
            <div className="w-10 h-10 bg-slate-900 dark:bg-white rounded-full flex items-center justify-center text-white dark:text-slate-900 shadow-xl z-10 border-2 border-emerald-500">
              <MapPin className="w-5 h-5 text-emerald-500" />
            </div>
            <span className="text-[10px] font-bold bg-white dark:bg-slate-800 text-slate-800 dark:text-white px-2 py-0.5 rounded shadow-sm">SUA CASA</span>
          </div>

          {/* Connected Route Path */}
          <svg className="absolute inset-0 w-full h-full stroke-emerald-500 stroke-[3] drop-shadow-lg opacity-40" style={{ strokeDasharray: '6 6', strokeLinecap: 'round' }}>
            <path d={`M 25% 30% H 50% V 70% H 75%`} fill="none" className="vector-effect-non-scaling-stroke" />
          </svg>

          {/* Live Progress Path */}
          <svg className="absolute inset-0 w-full h-full stroke-emerald-500 stroke-[5] drop-shadow-md" style={{ strokeLinecap: 'round' }}>
            {getProgress() > 0 && (
              <path 
                d={`M 25% 30% ${getProgress() > 50 ? 'H 50% V 70%' : `H ${25 + (getProgress() / 50) * 25}%`}`} 
                fill="none" 
                className="vector-effect-non-scaling-stroke stroke-emerald-600 dark:stroke-emerald-400" 
              />
            )}
            {getProgress() > 50 && (
              <path 
                d={`M 50% 70% H ${50 + ((getProgress() - 50) / 50) * 25}%`} 
                fill="none" 
                className="vector-effect-non-scaling-stroke stroke-emerald-600 dark:stroke-emerald-400" 
              />
            )}
          </svg>

          {/* Live Mobile Courier Marker */}
          <motion.div 
            className="absolute w-12 h-12 bg-white dark:bg-slate-800 rounded-full shadow-2xl flex items-center justify-center z-20 border-2 border-emerald-500 cursor-pointer"
            animate={{
              left: getProgress() <= 50 ? `${25 + (getProgress() / 50) * 25}%` : `50%`,
              top: getProgress() <= 50 ? `30%` : `${30 + ((getProgress() - 50) / 50) * 40}%`,
            }}
            transition={{ type: 'spring', stiffness: 60, damping: 15 }}
            style={{ transform: 'translate(-50%, -50%)' }}
          >
            <span className="text-xl animate-bounce">{vehicleType === 'bicicleta' ? '🚲' : '🛵'}</span>
          </motion.div>
        </div>
      </div>

      {/* Info bottom panel drawer */}
      <div className="bg-white dark:bg-slate-900 rounded-t-[32px] shadow-[0_-15px_35px_rgba(0,0,0,0.08)] z-30 px-6 py-6 md:px-12 md:py-8 space-y-6 relative border-t border-slate-100 dark:border-slate-800/60 max-h-[50%] overflow-y-auto">
        <div className="w-12 h-1 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto" />
        
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              {getStatusText()}
            </h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
              Ref: {activeDeliveryId ? activeDeliveryId.substring(0, 13) : "#offline-demo"} • Total: R$ {orderTotal.toFixed(2)}
            </p>
          </div>
          <div className="flex flex-col items-end">
            <span className={`text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1 ${vehicleType === 'bicicleta' ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600' : 'bg-amber-50 dark:bg-amber-950/40 text-amber-600'}`}>
              {vehicleType === 'bicicleta' ? <Leaf className="w-3 h-3 text-emerald-500" /> : <Zap className="w-3 h-3 text-amber-500" />}
              {vehicleType === 'bicicleta' ? 'Entrega Verde' : 'Entrega Turbo'}
            </span>
          </div>
        </div>

        {/* Live Delivery Progress Feed */}
        <div className="space-y-3 bg-slate-50/70 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100/50 dark:border-slate-800/40">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Avisos do Trajeto em Tempo Real</p>
          {delivery?.notifications && delivery.notifications.length > 0 ? (
            <div className="space-y-2 max-h-[110px] overflow-y-auto">
              {delivery.notifications.slice().reverse().map((notif) => (
                <div key={notif.id} className="flex gap-2 text-xs border-b border-dashed border-slate-100 dark:border-slate-800/30 pb-2 last:border-0 last:pb-0">
                  <span className="text-emerald-500 font-bold">•</span>
                  <div className="flex-1">
                    <p className="font-semibold text-slate-800 dark:text-slate-200">{notif.title}</p>
                    <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-tight mt-0.5">{notif.message}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-slate-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Sincronizando feed de atualizações do entregador...
            </div>
          )}
        </div>

        {/* Courier profile box / Rating review card */}
        <AnimatePresence mode="wait">
          {((delivery && delivery.status !== 'delivered') || (!delivery && fallbackStatus !== 'delivered')) ? (
            <motion.div 
              key="driver-active"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-slate-200 rounded-full overflow-hidden border-2 border-emerald-500/20">
                  <img 
                    src={delivery?.courierPhoto || "https://images.unsplash.com/photo-1599566150163-29194dcaad36?auto=format&fit=crop&q=80&w=200&h=200"} 
                    alt="Entregador" 
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover" 
                  />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                    {delivery?.courierName || "Carlos Santos"}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <span className="text-amber-500 font-bold">★ {delivery?.courierRating || "4.9"}</span>
                    <span className="opacity-40">|</span> 
                    <span>{delivery?.vehicleModel || "Honda CG 160 Fan"}</span>
                  </p>
                </div>
              </div>
              
              <div className="flex gap-1.5">
                <a 
                  href={`tel:${delivery?.courierPhone || "11987654321"}`}
                  className="w-9 h-9 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow hover:bg-slate-50 active:scale-90 transition-all text-slate-600 dark:text-slate-300 border border-slate-100 dark:border-slate-800"
                >
                  <Phone className="w-4 h-4" />
                </a>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="rating-flow"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-1"
            >
              {!hasRated ? (
                <div className="bg-emerald-50/50 dark:bg-slate-800/50 p-5 rounded-2xl border border-emerald-500/20 space-y-4">
                  <div className="flex flex-col items-center text-center space-y-1">
                    <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mb-1">
                      <Star className="w-6 h-6 fill-current" />
                    </div>
                    <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm">Avaliar Entregador</h4>
                    <p className="text-[11px] text-slate-400">Como foi a entrega sustentável com {delivery?.courierName || "Carlos Santos"}?</p>
                  </div>

                  {/* Interactive Stars Selector */}
                  <div className="flex justify-center gap-2">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button
                        key={s}
                        onClick={() => setUserRating(s)}
                        onMouseEnter={() => setHoverRating(s)}
                        onMouseLeave={() => setHoverRating(null)}
                        className="p-1 transform hover:scale-125 transition-all outline-none"
                      >
                        <Star 
                          className={`w-7 h-7 ${(hoverRating !== null ? s <= hoverRating : s <= userRating) ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} 
                        />
                      </button>
                    ))}
                  </div>

                  {/* Comment Input */}
                  <textarea
                    value={ratingComment}
                    onChange={(e) => setRatingComment(e.target.value)}
                    placeholder="Escreva um comentário opcional (ajuda no bem-estar)..."
                    className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 outline-none focus:border-emerald-500 transition-colors"
                    rows={2}
                  />

                  {/* Action button */}
                  <button
                    onClick={handleSubmitRating}
                    disabled={isSubmittingRating}
                    className="w-full py-2.5 bg-emerald-600 text-white font-bold rounded-xl text-xs shadow-md shadow-emerald-500/10 hover:bg-emerald-650 transition-colors flex items-center justify-center gap-2"
                  >
                    {isSubmittingRating ? 'Enviando...' : 'Enviar Avaliação & Ganhar +50 EXP'}
                  </button>
                </div>
              ) : (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-emerald-500 text-white p-5 rounded-2xl flex flex-col items-center text-center space-y-3 shadow-lg shadow-emerald-500/10"
                >
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm">Obrigado pelo seu feedback!</h4>
                    <p className="text-[11px] text-white/90 mt-1">Sua avaliação ajuda a manter nossa rede saudável e sustentável. +50 EXP creditados na sua conta! 🌿</p>
                  </div>
                  <button
                    onClick={onClose}
                    className="mt-1 bg-white text-emerald-700 font-bold text-xs px-5 py-2 rounded-xl border border-transparent hover:bg-emerald-50 transition-colors outline-none"
                  >
                    Concluir & Voltar
                  </button>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
