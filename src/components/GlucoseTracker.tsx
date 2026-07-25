import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Activity, Sparkles, Plus, Bluetooth, CheckCircle2, TrendingUp, 
  TrendingDown, ArrowRight, ShieldCheck, Clock, Calendar, RefreshCw, 
  ChevronRight, AlertCircle, Cpu, Award, Zap, Heart, Info, X, Check,
  Smartphone, BarChart2, Filter
} from 'lucide-react';
import { playSfx, vibrate } from '../lib/sensory';
import { useAuth } from '../contexts/AuthContext';
import { db, doc, setDoc, collection, getDocs, serverTimestamp } from '../lib/firebase';
import { safeGet, safeSet } from '../lib/storage';

export interface GlucoseLog {
  id: string;
  value: number; // mg/dL
  date: string; // ISO or YYYY-MM-DD HH:mm
  context: 'fasting' | 'post_meal' | 'bedtime' | 'random';
  status: 'normal' | 'high' | 'critical' | 'low';
  notes?: string;
  timestamp: number;
}

const DEFAULT_LOGS: GlucoseLog[] = [
  { id: '1', value: 92, date: 'Hoje • 08:35', context: 'fasting', status: 'normal', timestamp: Date.now() - 3600000 * 2 },
  { id: '2', value: 95, date: 'Ontem • 08:10', context: 'fasting', status: 'normal', timestamp: Date.now() - 86400000 },
  { id: '3', value: 98, date: '2 dias atrás • 08:20', context: 'fasting', status: 'normal', timestamp: Date.now() - 86400000 * 2 },
  { id: '4', value: 105, date: '3 dias atrás • 13:45', context: 'post_meal', status: 'high', timestamp: Date.now() - 86400000 * 3 },
  { id: '5', value: 91, date: '4 dias atrás • 08:15', context: 'fasting', status: 'normal', timestamp: Date.now() - 86400000 * 4 },
  { id: '6', value: 88, date: '5 dias atrás • 08:00', context: 'fasting', status: 'normal', timestamp: Date.now() - 86400000 * 5 },
  { id: '7', value: 94, date: '6 dias atrás • 08:30', context: 'fasting', status: 'normal', timestamp: Date.now() - 86400000 * 6 },
  { id: '8', value: 96, date: '7 dias atrás • 08:12', context: 'fasting', status: 'normal', timestamp: Date.now() - 86400000 * 7 },
  { id: '9', value: 102, date: '8 dias atrás • 12:50', context: 'post_meal', status: 'high', timestamp: Date.now() - 86400000 * 8 },
  { id: '10', value: 89, date: '9 dias atrás • 08:05', context: 'fasting', status: 'normal', timestamp: Date.now() - 86400000 * 9 },
  { id: '11', value: 93, date: '10 dias atrás • 08:10', context: 'fasting', status: 'normal', timestamp: Date.now() - 86400000 * 10 },
  { id: '12', value: 87, date: '11 dias atrás • 08:15', context: 'fasting', status: 'normal', timestamp: Date.now() - 86400000 * 11 },
  { id: '13', value: 90, date: '12 dias atrás • 08:22', context: 'fasting', status: 'normal', timestamp: Date.now() - 86400000 * 12 },
  { id: '14', value: 92, date: '13 dias atrás • 08:00', context: 'fasting', status: 'normal', timestamp: Date.now() - 86400000 * 13 },
];

export function GlucoseTracker() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<GlucoseLog[]>(() => {
    const saved = safeGet('nutri-glucose-logs');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    return DEFAULT_LOGS;
  });

  const [timeRange, setTimeRange] = useState<'7d' | '14d' | '30d'>('14d');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newValue, setNewValue] = useState('92');
  const [newContext, setNewContext] = useState<'fasting' | 'post_meal' | 'bedtime' | 'random'>('fasting');
  const [newNotes, setNewNotes] = useState('');
  const [isSyncingSensor, setIsSyncingSensor] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');
  const [selectedPoint, setSelectedPoint] = useState<GlucoseLog | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Sync to local storage & Firestore
  useEffect(() => {
    safeSet('nutri-glucose-logs', JSON.stringify(logs.slice(0, 100)));
    if (user && !user.uid.startsWith('local-user-')) {
      const syncRemote = async () => {
        try {
          for (const item of logs) {
            await setDoc(doc(db, 'users', user.uid, 'glucoseLogs', item.id), {
              ...item,
              userId: user.uid,
              updatedAt: serverTimestamp()
            }, { merge: true });
          }
        } catch (e) {
          console.warn("Could not sync glucose logs to firestore:", e);
        }
      };
      syncRemote();
    }
  }, [logs, user]);

  // Derived current metrics
  const latestLog = logs[0] || DEFAULT_LOGS[0];
  const currentVal = latestLog.value;

  // Filter logs by timeframe for statistics
  const filteredLogs = logs.slice(0, timeRange === '7d' ? 7 : timeRange === '14d' ? 14 : 30);
  const avg7 = Math.round(logs.slice(0, 7).reduce((acc, l) => acc + l.value, 0) / Math.min(logs.length, 7) || 94);
  const avg30 = Math.round(logs.slice(0, 30).reduce((acc, l) => acc + l.value, 0) / Math.min(logs.length, 30) || 97);
  const maxVal = Math.max(...logs.map(l => l.value));
  const minVal = Math.min(...logs.map(l => l.value));
  const inRangeCount = logs.filter(l => l.value >= 70 && l.value <= 99).length;
  const timeInRangePct = Math.round((inRangeCount / (logs.length || 1)) * 100);

  // Status helper
  const getStatusBadge = (val: number) => {
    if (val < 70) return { label: 'Baixo', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30', icon: '🟡' };
    if (val <= 99) return { label: 'Normal', color: 'text-[#16C784] bg-[#16C784]/10 border-[#16C784]/30', icon: '🟢' };
    if (val <= 125) return { label: 'Levemente Alto', color: 'text-[#D4AF37] bg-[#D4AF37]/10 border-[#D4AF37]/30', icon: '🟡' };
    return { label: 'Elevado', color: 'text-rose-400 bg-rose-500/10 border-rose-500/30', icon: '🔴' };
  };

  const handleAddMeasurement = (e: React.FormEvent) => {
    e.preventDefault();
    const numericVal = parseInt(newValue, 10);
    if (isNaN(numericVal) || numericVal < 30 || numericVal > 400) {
      showToast('Por favor, digite um valor de glicemia válido entre 30 e 400 mg/dL.', 'error');
      return;
    }

    let status: 'normal' | 'high' | 'critical' | 'low' = 'normal';
    if (numericVal < 70) status = 'low';
    else if (numericVal > 125) status = 'critical';
    else if (numericVal > 99) status = 'high';

    const newLogItem: GlucoseLog = {
      id: crypto.randomUUID(),
      value: numericVal,
      date: `Hoje • ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      context: newContext,
      status,
      notes: newNotes,
      timestamp: Date.now()
    };

    setLogs([newLogItem, ...logs]);
    setIsModalOpen(false);
    setNewNotes('');
    playSfx('success');
    vibrate([40, 40]);
    showToast('Nova medição registrada com sucesso!', 'success');
  };

  // Simulated Bluetooth Sensor Import
  const handleSensorImport = () => {
    playSfx('tap');
    vibrate(20);
    setIsSyncingSensor(true);
    setSyncMessage('Procurando sensores Bluetooth próximos (Dexcom / Libre / Smartwatch)...');

    setTimeout(() => {
      setSyncMessage('Conectado via Bluetooth LE. Baixando medições contínuas...');
    }, 1200);

    setTimeout(() => {
      setIsSyncingSensor(false);
      setSyncMessage('');
      playSfx('notification');
      showToast('14 novas medições importadas do sensor contínuo!', 'success');
    }, 2500);
  };

  // Chart rendering points calculation
  const chartData = [...filteredLogs].reverse();
  const svgWidth = 340;
  const svgHeight = 130;
  const paddingY = 20;

  const minChartVal = 60;
  const maxChartVal = 130;

  const getX = (index: number) => {
    if (chartData.length <= 1) return svgWidth / 2;
    return (index / (chartData.length - 1)) * (svgWidth - 20) + 10;
  };

  const getY = (val: number) => {
    const clamped = Math.max(minChartVal, Math.min(maxChartVal, val));
    const ratio = (clamped - minChartVal) / (maxChartVal - minChartVal);
    return svgHeight - paddingY - ratio * (svgHeight - 2 * paddingY);
  };

  // Build SVG Path string
  const points = chartData.map((d, i) => `${getX(i)},${getY(d.value)}`).join(' ');
  const areaPoints = `10,${svgHeight - 10} ${points} ${svgWidth - 10},${svgHeight - 10}`;

  return (
    <div className="w-full min-h-screen bg-[#0B0F14] text-slate-100 font-sans selection:bg-[#16C784]/30 selection:text-[#16C784] pb-24 pt-2">
      
      {/* 9:16 Responsive Container Layout (Apple Health / Oura / WHOOP aesthetic) */}
      <div className="max-w-md mx-auto min-h-[844px] bg-gradient-to-b from-[#0B0F14] via-[#04382B]/40 to-[#000000] border border-[#232C39]/80 rounded-[38px] shadow-[0_25px_80px_rgba(0,0,0,0.85)] overflow-hidden relative p-5 sm:p-6 backdrop-blur-2xl flex flex-col justify-between">
        
        {/* Subtle Ambient Glows */}
        <div className="absolute top-[-5%] left-[-10%] w-[320px] h-[320px] bg-[#16C784]/15 rounded-full blur-[110px] pointer-events-none" />
        <div className="absolute top-[40%] right-[-15%] w-[280px] h-[280px] bg-[#D4AF37]/10 rounded-full blur-[120px] pointer-events-none" />

        {/* Content Wrapper */}
        <div className="space-y-5 relative z-10">

          {/* CABEÇALHO */}
          <div className="flex items-center justify-between pt-1">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#16C784] animate-ping" />
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#16C784]">
                  NutriAI Biometria
                </span>
              </div>
              <h1 className="text-xl font-display font-extrabold text-white tracking-tight leading-snug mt-0.5">
                Monitoramento Inteligente da Glicemia
              </h1>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                Análise automática por Inteligência Artificial
              </p>
            </div>

            {/* Minimalist AI Icon Top Right */}
            <motion.div 
              whileHover={{ scale: 1.1, rotate: 12 }}
              className="w-11 h-11 rounded-2xl bg-[#151B23]/90 border border-[#16C784]/40 flex items-center justify-center shadow-[0_0_20px_rgba(22,199,132,0.25)] relative cursor-pointer"
              title="IA de Saúde Ativa"
            >
              <Sparkles className="w-5 h-5 text-[#16C784]" />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-[#D4AF37] rounded-full border-2 border-[#0B0F14] shadow-[0_0_8px_#D4AF37]" />
            </motion.div>
          </div>

          {/* CARD PRINCIPAL - GLICEMIA ATUAL */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-5 rounded-[28px] bg-[#151B23]/80 border border-[#232C39] backdrop-blur-xl shadow-2xl relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#16C784]/10 rounded-full blur-2xl group-hover:bg-[#16C784]/20 transition-all pointer-events-none" />

            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                  Glicemia Atual
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-4xl font-display font-black text-[#16C784] tracking-tight drop-shadow-[0_0_12px_rgba(22,199,132,0.3)]">
                    {currentVal}
                  </span>
                  <span className="text-sm font-bold text-slate-400">mg/dL</span>
                </div>
              </div>

              {/* Status Badge & Premium Badge */}
              <div className="flex flex-col items-end gap-1.5">
                <div className={`px-3 py-1 rounded-full border text-xs font-bold flex items-center gap-1.5 shadow-sm ${getStatusBadge(currentVal).color}`}>
                  <span>{getStatusBadge(currentVal).icon}</span>
                  <span>{getStatusBadge(currentVal).label}</span>
                </div>

                <div className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-[#D4AF37]/20 to-amber-500/10 border border-[#D4AF37]/40 text-[10px] font-extrabold text-[#D4AF37] tracking-widest uppercase flex items-center gap-1 shadow-[0_0_10px_rgba(212,175,55,0.2)]">
                  <Award className="w-3 h-3 text-[#D4AF37]" />
                  <span>IA PREMIUM</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3.5 border-t border-[#232C39]/80 flex items-center justify-between text-xs text-slate-400 font-medium">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <span>Última medição: <strong className="text-slate-200">{latestLog.date}</strong></span>
              </div>
              <div className="text-right">
                <span>Faixa ideal: <strong className="text-[#16C784]">70–99 mg/dL</strong></span>
              </div>
            </div>
          </motion.div>

          {/* INDICADORES (3 CARDS MENORES) */}
          <div className="grid grid-cols-3 gap-2.5">
            {/* Média 7 dias */}
            <div className="p-3 bg-[#151B23]/70 border border-[#232C39] rounded-2xl text-center space-y-1 backdrop-blur-md shadow-lg">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Média 7d
              </span>
              <span className="text-lg font-display font-black text-white block">
                {avg7} <span className="text-[10px] text-slate-400 font-normal">mg/dL</span>
              </span>
              <span className="text-[10px] font-semibold text-[#16C784] block">
                🟢 Dentro do alvo
              </span>
            </div>

            {/* Média 30 dias */}
            <div className="p-3 bg-[#151B23]/70 border border-[#232C39] rounded-2xl text-center space-y-1 backdrop-blur-md shadow-lg">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Média 30d
              </span>
              <span className="text-lg font-display font-black text-white block">
                {avg30} <span className="text-[10px] text-slate-400 font-normal">mg/dL</span>
              </span>
              <span className="text-[10px] font-semibold text-slate-400 block">
                Estabilidade alta
              </span>
            </div>

            {/* Tendência */}
            <div className="p-3 bg-[#151B23]/70 border border-[#232C39] rounded-2xl text-center space-y-1 backdrop-blur-md shadow-lg">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Tendência
              </span>
              <span className="text-sm font-display font-bold text-[#16C784] flex items-center justify-center gap-1 mt-1">
                Estável
                <ArrowRight className="w-4 h-4 text-[#16C784]" />
              </span>
              <span className="text-[10px] text-slate-400 block">Variabilidade baixa</span>
            </div>
          </div>

          {/* GRÁFICO INTELIGENTE */}
          <div className="p-4 bg-[#151B23]/80 border border-[#232C39] rounded-[28px] backdrop-blur-xl shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-[#16C784]" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Curva dos Últimos {timeRange === '7d' ? '7 Dias' : timeRange === '14d' ? '14 Dias' : '30 Dias'}
                </h3>
              </div>

              {/* Time Range Filter Selector */}
              <div className="flex items-center gap-1 bg-[#0B0F14] p-1 rounded-xl border border-[#232C39]">
                {(['7d', '14d', '30d'] as const).map((range) => (
                  <button
                    key={range}
                    onClick={() => {
                      setTimeRange(range);
                      playSfx('tap');
                    }}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer ${
                      timeRange === range 
                        ? 'bg-[#16C784] text-slate-950 shadow-sm' 
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {range.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Interactive Custom SVG Chart with Ideal Range Shading */}
            <div className="relative w-full h-[140px] bg-[#0B0F14]/90 rounded-2xl border border-[#232C39] p-2 overflow-hidden flex flex-col justify-between">
              
              {/* Shaded Band for Ideal Glucose Range (70-99 mg/dL) */}
              <div 
                className="absolute left-0 right-0 bg-[#16C784]/10 border-y border-[#16C784]/20 pointer-events-none transition-all"
                style={{
                  top: `${getY(99)}px`,
                  bottom: `${svgHeight - getY(70)}px`
                }}
              >
                <span className="absolute right-2 top-0.5 text-[8px] font-bold text-[#16C784]/80 uppercase tracking-widest">
                  Faixa Ideal (70-99)
                </span>
              </div>

              {/* SVG Curve */}
              <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-full overflow-visible">
                <defs>
                  <linearGradient id="emeraldGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#16C784" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#16C784" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Shaded Area */}
                <polygon points={areaPoints} fill="url(#emeraldGradient)" />

                {/* Main Line */}
                <polyline
                  fill="none"
                  stroke="#16C784"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={points}
                />

                {/* Data Points */}
                {chartData.map((d, idx) => {
                  const cx = getX(idx);
                  const cy = getY(d.value);
                  const isHigh = d.value > 99 && d.value <= 125;
                  const isCritical = d.value > 125 || d.value < 70;
                  const pointColor = isCritical ? '#EF4444' : isHigh ? '#D4AF37' : '#16C784';

                  return (
                    <g key={d.id} className="cursor-pointer" onClick={() => setSelectedPoint(d)}>
                      <circle
                        cx={cx}
                        cy={cy}
                        r={selectedPoint?.id === d.id ? "6" : "3.5"}
                        fill={pointColor}
                        stroke="#0B0F14"
                        strokeWidth="2"
                        className="transition-all hover:scale-150"
                      />
                    </g>
                  );
                })}
              </svg>

              {/* Selected Point Info Floating Card */}
              {selectedPoint && (
                <div className="absolute bottom-2 left-2 right-2 bg-[#151B23] border border-[#16C784]/50 rounded-xl p-2 text-xs flex items-center justify-between shadow-lg">
                  <div>
                    <span className="font-bold text-white">{selectedPoint.date}</span>
                    <span className="text-[10px] text-slate-400 block">{selectedPoint.context === 'fasting' ? 'Em Jejum' : 'Pós-refeição'}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-black text-[#16C784] text-sm">{selectedPoint.value} mg/dL</span>
                    <button 
                      onClick={() => setSelectedPoint(null)}
                      className="text-[10px] text-slate-500 hover:text-white ml-2"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Legend Indicators */}
            <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium px-1">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#16C784]" /> Normal (70–99)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#D4AF37]" /> Levemente Alto (100–125)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-rose-500" /> Alerta (&gt;125)
              </span>
            </div>
          </div>

          {/* INSIGHTS DA IA NUTRIAI */}
          <div className="p-4 bg-gradient-to-br from-[#151B23] via-[#0B0F14] to-[#04382B]/60 border border-[#16C784]/30 rounded-[28px] backdrop-blur-xl shadow-xl relative overflow-hidden">
            <div className="flex items-center gap-3">
              {/* 3D-styled AI Avatar with Emerald Glow */}
              <div className="relative shrink-0">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#16C784] via-[#10B981] to-[#D4AF37] p-0.5 shadow-[0_0_18px_rgba(22,199,132,0.4)] flex items-center justify-center">
                  <div className="w-full h-full bg-[#0B0F14] rounded-[14px] flex items-center justify-center">
                    <Cpu className="w-6 h-6 text-[#16C784] animate-pulse" />
                  </div>
                </div>
                <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-[#16C784] rounded-full border-2 border-[#0B0F14]" />
              </div>

              <div className="flex-1">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#16C784]" />
                  IA NutriAI recomenda
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed font-normal mt-1">
                  "Seus níveis permanecem estáveis. Continue mantendo refeições equilibradas, boa hidratação e atividade física regular."
                </p>
              </div>
            </div>
          </div>

          {/* HISTÓRICO DE MEDIÇÕES */}
          <div className="p-4 bg-[#151B23]/80 border border-[#232C39] rounded-[28px] backdrop-blur-xl shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#16C784]" />
                Histórico Recente
              </h3>
              <span className="text-[10px] text-slate-400 font-bold uppercase">{logs.length} Registros</span>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
              {logs.slice(0, 5).map((log) => {
                const badge = getStatusBadge(log.value);
                return (
                  <div 
                    key={log.id} 
                    className="p-3 bg-[#0B0F14]/80 border border-[#232C39] rounded-2xl flex items-center justify-between hover:border-[#16C784]/40 transition-colors"
                  >
                    <div>
                      <span className="text-xs font-bold text-white block">{log.date}</span>
                      <span className="text-[10px] text-slate-400">
                        {log.context === 'fasting' ? 'Em Jejum' : log.context === 'post_meal' ? 'Pós-Refeição' : 'Acaso'}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-sm font-black text-white font-mono">
                        {log.value} <span className="text-[10px] text-slate-400 font-normal">mg/dL</span>
                      </span>

                      <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${badge.color}`}>
                        {badge.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ESTATÍSTICAS DA GLICEMIA */}
          <div className="p-4 bg-[#151B23]/80 border border-[#232C39] rounded-[28px] backdrop-blur-xl shadow-xl space-y-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <BarChart2 className="w-3.5 h-3.5 text-[#D4AF37]" />
              Resumo Estatístico
            </h3>

            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div className="p-2.5 bg-[#0B0F14] rounded-xl border border-[#232C39] flex justify-between items-center">
                <span className="text-slate-400">Tempo na Faixa Ideal</span>
                <span className="font-bold text-[#16C784]">{timeInRangePct}%</span>
              </div>

              <div className="p-2.5 bg-[#0B0F14] rounded-xl border border-[#232C39] flex justify-between items-center">
                <span className="text-slate-400">Maior Valor</span>
                <span className="font-bold text-[#D4AF37]">{maxVal} mg/dL</span>
              </div>

              <div className="p-2.5 bg-[#0B0F14] rounded-xl border border-[#232C39] flex justify-between items-center">
                <span className="text-slate-400">Menor Valor</span>
                <span className="font-bold text-slate-200">{minVal} mg/dL</span>
              </div>

              <div className="p-2.5 bg-[#0B0F14] rounded-xl border border-[#232C39] flex justify-between items-center">
                <span className="text-slate-400">Média Geral</span>
                <span className="font-bold text-[#16C784]">{avg30} mg/dL</span>
              </div>
            </div>
          </div>

          {/* AÇÕES E BOTÕES */}
          <div className="space-y-2.5 pt-2">
            {/* Primary Button */}
            <button
              onClick={() => {
                setIsModalOpen(true);
                playSfx('tap');
              }}
              className="w-full bg-gradient-to-r from-[#16C784] to-[#10B981] text-slate-950 font-extrabold text-sm py-4 rounded-2xl shadow-[0_0_25px_rgba(22,199,132,0.3)] hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wider"
            >
              <Plus className="w-5 h-5 stroke-[3]" />
              Registrar Nova Medição
            </button>

            {/* Secondary Button */}
            <button
              onClick={handleSensorImport}
              disabled={isSyncingSensor}
              className="w-full bg-[#151B23] border border-[#232C39] hover:border-[#16C784]/50 text-slate-300 font-bold text-xs py-3 rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Bluetooth className={`w-4 h-4 text-[#16C784] ${isSyncingSensor ? 'animate-spin' : ''}`} />
              <span>{isSyncingSensor ? 'Sincronizando Sensor...' : 'Importar Dados do Sensor'}</span>
            </button>

            {syncMessage && (
              <p className="text-[11px] text-emerald-400 text-center font-medium animate-pulse">
                {syncMessage}
              </p>
            )}
          </div>

          {/* INTEGRAÇÕES COM DISPOSITIVOS (COMPATIBILIDADE MINIMALISTA) */}
          <div className="pt-3 border-t border-[#232C39]/80 text-center space-y-2">
            <span className="text-[9px] font-extrabold text-slate-500 uppercase tracking-widest block">
              Sincronização Contínua Compatível
            </span>

            <div className="flex items-center justify-center gap-3.5 opacity-60 hover:opacity-100 transition-opacity flex-wrap text-[11px] font-bold text-slate-400">
              <span className="flex items-center gap-1"><Smartphone className="w-3.5 h-3.5 text-slate-300" /> Apple Health</span>
              <span>•</span>
              <span className="flex items-center gap-1"><Activity className="w-3.5 h-3.5 text-blue-400" /> Google Fit</span>
              <span>•</span>
              <span className="flex items-center gap-1"><Heart className="w-3.5 h-3.5 text-rose-400" /> Samsung Health</span>
              <span>•</span>
              <span className="flex items-center gap-1"><Zap className="w-3.5 h-3.5 text-amber-400" /> Fitbit</span>
              <span>•</span>
              <span className="flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5 text-teal-400" /> Dexcom / Libre</span>
            </div>
          </div>

        </div>
      </div>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-6 left-1/2 -translate-x-1/2 z-[120] max-w-sm px-4 py-3 rounded-2xl shadow-2xl border backdrop-blur-xl flex items-center gap-2.5 text-xs font-bold ${
              toast.type === 'error' 
                ? 'bg-rose-950/90 border-rose-500/50 text-rose-200' 
                : toast.type === 'success'
                ? 'bg-[#04382B]/90 border-[#16C784]/60 text-emerald-200'
                : 'bg-[#151B23]/90 border-[#232C39] text-slate-200'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-[#16C784] shrink-0" />
            ) : toast.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            ) : (
              <Info className="w-4 h-4 text-blue-400 shrink-0" />
            )}
            <span>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL DE NOVA MEDIÇÃO */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-sm bg-[#151B23] border border-[#232C39] rounded-[32px] p-6 shadow-2xl space-y-5 text-slate-100 relative"
            >
              <div className="flex justify-between items-center pb-2 border-b border-[#232C39]">
                <h3 className="font-bold text-white text-base flex items-center gap-2">
                  <Activity className="w-5 h-5 text-[#16C784]" />
                  Registrar Glicemia
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1 rounded-full text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddMeasurement} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Nível de Glicemia (mg/dL)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={newValue}
                      onChange={(e) => setNewValue(e.target.value)}
                      placeholder="Ex: 92"
                      required
                      min="30"
                      max="400"
                      className="w-full bg-[#0B0F14] border border-[#232C39] rounded-2xl py-3.5 px-4 text-2xl font-black text-[#16C784] outline-none focus:border-[#16C784] transition-colors"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">
                      mg/dL
                    </span>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Momento da Medição
                  </label>
                  <select
                    value={newContext}
                    onChange={(e: any) => setNewContext(e.target.value)}
                    className="w-full bg-[#0B0F14] border border-[#232C39] rounded-2xl py-3 px-4 text-sm font-semibold text-white outline-none focus:border-[#16C784]"
                  >
                    <option value="fasting">Em Jejum (Manhã)</option>
                    <option value="post_meal">Pós-Refeição (2h após comer)</option>
                    <option value="bedtime">Antes de Dormir</option>
                    <option value="random">Ao Acaso / Outro</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Observações (Opcional)
                  </label>
                  <input
                    type="text"
                    value={newNotes}
                    onChange={(e) => setNewNotes(e.target.value)}
                    placeholder="Ex: Após treino leve ou café com aveia"
                    className="w-full bg-[#0B0F14] border border-[#232C39] rounded-2xl py-2.5 px-3.5 text-xs text-white outline-none focus:border-[#16C784]"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-[#16C784] text-slate-950 font-extrabold text-sm py-3.5 rounded-2xl shadow-lg hover:brightness-110 cursor-pointer mt-2"
                >
                  Salvar Medição
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
