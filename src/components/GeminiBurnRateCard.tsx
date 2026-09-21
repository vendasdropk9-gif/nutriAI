import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Flame, TrendingUp, Calendar, AlertCircle, DollarSign, 
  CheckCircle2, AlertTriangle, ShieldAlert, Sparkles, Sliders, 
  Zap, ArrowUpRight, Cpu, Layers, Clock
} from 'lucide-react';
import { AnimatedCounter } from './AnimatedCounter';
import { playSfx, vibrate } from '../lib/sensory';

export interface BurnRateData {
  currentDayOfMonth: number;
  daysInMonth: number;
  remainingDaysInMonth: number;
  dailyBurnRateBrl: number;
  dailyBurnRateUsd: number;
  mtdSpendBrl: number;
  mtdSpendUsd: number;
  projectedMonthEndSpendBrl: number;
  projectedMonthEndSpendUsd: number;
  monthlyBudgetBrl: number;
  budgetUsedPercentage: number;
  projectedBudgetUsedPercentage: number;
  status: 'healthy' | 'warning' | 'critical';
  tpmBurnRateTokens?: number;
}

interface GeminiBurnRateCardProps {
  burnRateData?: BurnRateData;
  isLoading?: boolean;
}

export function GeminiBurnRateCard({ burnRateData, isLoading }: GeminiBurnRateCardProps) {
  // Default fallback values if backend data loading
  const defaultData: BurnRateData = {
    currentDayOfMonth: new Date().getDate(),
    daysInMonth: 30,
    remainingDaysInMonth: 30 - new Date().getDate(),
    dailyBurnRateBrl: 42.80,
    dailyBurnRateUsd: 7.64,
    mtdSpendBrl: 898.80,
    mtdSpendUsd: 160.50,
    projectedMonthEndSpendBrl: 1284.00,
    projectedMonthEndSpendUsd: 229.28,
    monthlyBudgetBrl: 1500.00,
    budgetUsedPercentage: 59.9,
    projectedBudgetUsedPercentage: 85.6,
    status: 'healthy',
    tpmBurnRateTokens: 160
  };

  const data = burnRateData || defaultData;
  const [targetBudget, setTargetBudget] = useState<number>(data.monthlyBudgetBrl || 1500);

  // Recalculate projection against customizable budget target
  const projectedMonthEnd = data.projectedMonthEndSpendBrl;
  const projectedPercentage = parseFloat(((projectedMonthEnd / targetBudget) * 100).toFixed(1));
  const currentPercentage = parseFloat(((data.mtdSpendBrl / targetBudget) * 100).toFixed(1));

  let statusBadge = {
    label: '🟢 Burn Rate Estável',
    bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    barColor: 'from-emerald-500 to-teal-400',
    icon: CheckCircle2
  };

  if (projectedPercentage >= 100) {
    statusBadge = {
      label: '🔴 Risco de Aceleração Acima do Teto',
      bg: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
      barColor: 'from-amber-500 via-rose-500 to-red-600',
      icon: ShieldAlert
    };
  } else if (projectedPercentage >= 85) {
    statusBadge = {
      label: '🟡 Atenção: Próximo ao Limite de Teto',
      bg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      barColor: 'from-emerald-500 via-amber-400 to-amber-500',
      icon: AlertTriangle
    };
  }

  const StatusIcon = statusBadge.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="p-6 rounded-[32px] bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-amber-500/30 shadow-2xl text-slate-100 relative overflow-hidden space-y-6"
    >
      {/* Background Ambient Glow */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4 relative z-10">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-slate-950 shadow-lg shadow-amber-500/20">
            <Flame className="w-6 h-6 fill-current animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40">
                Análise Preditiva
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border flex items-center gap-1 ${statusBadge.bg}`}>
                <StatusIcon className="w-3 h-3 shrink-0" />
                <span>{statusBadge.label}</span>
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-black text-white mt-1 flex items-center gap-2 font-serif">
              <span>Gemini API Burn Rate & Projeção Mensal</span>
            </h3>
          </div>
        </div>

        {/* Days Remaining Counter */}
        <div className="px-4 py-2 rounded-2xl bg-slate-800/80 border border-slate-700/80 flex items-center gap-3 text-right">
          <Calendar className="w-5 h-5 text-amber-400 shrink-0" />
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Restantes no Mês</span>
            <div className="text-sm font-black text-amber-300 flex items-center gap-1 justify-end">
              <AnimatedCounter value={data.remainingDaysInMonth} duration={600} />
              <span>dias</span>
            </div>
          </div>
        </div>
      </div>

      {/* Hero Projected Month-End Spend KPI with Incremental Counter */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-800/90 via-slate-900 to-slate-800/90 border border-slate-700/80 relative overflow-hidden shadow-inner">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-1">
            <span className="text-xs uppercase font-extrabold tracking-wider text-amber-400 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" />
              <span>Projeção Estimada de Gasto até o Fim do Mês:</span>
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-4xl font-black text-white font-mono tracking-tight">R$</span>
              <AnimatedCounter 
                value={projectedMonthEnd} 
                decimals={2} 
                duration={1200}
                className="text-4xl sm:text-6xl font-black text-amber-300 tracking-tight font-mono drop-shadow-md"
              />
            </div>
            <p className="text-xs text-slate-400 font-medium">
              Aproximadamente <strong className="text-slate-200">${(projectedMonthEnd / 5.60).toFixed(2)} USD</strong> calculado com base no Burn Rate diário atual.
            </p>
          </div>

          <div className="flex flex-col items-start md:items-end gap-1.5 p-4 rounded-2xl bg-slate-950/60 border border-slate-800 shrink-0">
            <span className="text-[10px] uppercase font-bold text-slate-400">Teto Orcamentário Alocado</span>
            <div className="text-lg font-black text-white font-mono">
              R$ <AnimatedCounter value={targetBudget} decimals={2} duration={800} />
            </div>
            <span className="text-[11px] font-extrabold text-amber-400">
              <AnimatedCounter value={projectedPercentage} decimals={1} suffix="%" duration={1000} /> do orçamento projetado
            </span>
          </div>
        </div>

        {/* Visual Budget Progress Bar */}
        <div className="mt-6 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-slate-400 flex items-center gap-1">
              <span>Gasto Acumulado MTD:</span>
              <strong className="text-white">R$ <AnimatedCounter value={data.mtdSpendBrl} decimals={2} duration={900} /></strong>
            </span>
            <span className="text-amber-300 font-mono">
              Projeção: <AnimatedCounter value={projectedPercentage} decimals={1} suffix="%" duration={1000} />
            </span>
          </div>

          <div className="w-full h-3.5 bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-800 relative">
            {/* MTD Progress */}
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, currentPercentage)}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className={`h-full rounded-full bg-gradient-to-r ${statusBadge.barColor} shadow-md`}
            />
          </div>
        </div>
      </div>

      {/* 4 Incremental Burn Rate Metric Cards (Framer-Motion Counters) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Daily Burn Rate */}
        <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/80 hover:border-amber-500/40 transition-all space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Burn Rate Diário</span>
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-white font-mono">
            R$ <AnimatedCounter value={data.dailyBurnRateBrl} decimals={2} duration={900} />
            <span className="text-xs font-normal text-slate-400 ml-1">/dia</span>
          </div>
          <p className="text-[10px] text-slate-400 font-medium">
            Velocidade diária de consumo da API.
          </p>
        </div>

        {/* Metric 2: MTD Accumulated Spend */}
        <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/80 hover:border-emerald-500/40 transition-all space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Acumulado MTD</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-white font-mono">
            R$ <AnimatedCounter value={data.mtdSpendBrl} decimals={2} duration={900} />
          </div>
          <p className="text-[10px] text-slate-400 font-medium">
            Gasto do Dia 1 até o Dia <AnimatedCounter value={data.currentDayOfMonth} duration={500} />.
          </p>
        </div>

        {/* Metric 3: Token Velocity (TPM) */}
        <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/80 hover:border-teal-500/40 transition-all space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Vazão de Tokens (TPM)</span>
            <Cpu className="w-4 h-4 text-teal-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-white font-mono">
            <AnimatedCounter value={data.tpmBurnRateTokens || 160} decimals={0} duration={900} />
            <span className="text-xs font-normal text-slate-400 ml-1">tok/min</span>
          </div>
          <p className="text-[10px] text-slate-400 font-medium">
            Média de tokens processados por minuto.
          </p>
        </div>

        {/* Metric 4: Projected Run Rate Percentage */}
        <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/80 hover:border-amber-500/40 transition-all space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Run Rate vs Teto</span>
            <TrendingUp className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-300 font-mono">
            <AnimatedCounter value={projectedPercentage} decimals={1} suffix="%" duration={1000} />
          </div>
          <p className="text-[10px] text-slate-400 font-medium">
            Percentual do orçamento previsto no mês.
          </p>
        </div>
      </div>

      {/* Interactive Budget Simulator Slider */}
      <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <Sliders className="w-4 h-4 text-amber-400" />
            <span>Simulador Interativo de Teto Orçamentário (Ajustar Limite Mensal):</span>
          </label>
          <span className="text-xs font-black text-amber-400 font-mono">
            R$ {targetBudget.toLocaleString('pt-BR')}
          </span>
        </div>

        <input
          type="range"
          min="500"
          max="5000"
          step="100"
          value={targetBudget}
          onChange={(e) => {
            playSfx('pop');
            setTargetBudget(Number(e.target.value));
          }}
          className="w-full accent-amber-500 cursor-pointer"
        />

        <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
          <span>R$ 500</span>
          <span>R$ 1.500 (Padrão)</span>
          <span>R$ 3.000</span>
          <span>R$ 5.000</span>
        </div>
      </div>
    </motion.div>
  );
}
