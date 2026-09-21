import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Zap, Activity, Clock, AlertTriangle, CheckCircle2, XCircle, 
  RefreshCw, Cpu, Sparkles, Server, ShieldCheck, Flame, Filter, 
  ArrowUpRight, BarChart3, Radio, Download, DollarSign, Layers, 
  TrendingUp, FileSpreadsheet, PieChart as PieIcon, Coins, Users
} from 'lucide-react';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, 
  CartesianGrid, BarChart, Bar, Cell, PieChart, Pie, ComposedChart,
  Line, Legend 
} from 'recharts';
import { playSfx, vibrate } from '../lib/sensory';
import { AnimatedCounter } from './AnimatedCounter';

interface CategoryStat {
  id: string;
  name: string;
  calls: number;
  successfulCalls: number;
  failedCalls: number;
  totalDuration: number;
  minDuration: number;
  maxDuration: number;
  avgLatencyMs: number;
  successRatePercentage: number;
  estimatedCostUsd: number;
  estimatedCostBrl: number;
  estimatedCostUsdFormatted: string;
  estimatedCostBrlFormatted: string;
}

interface DauVsTokensTimelineEntry {
  date: string;
  dayLabel: string;
  activeUsers: number;
  geminiTokens: number | null;
  geminiTokensFormatted: string;
  avgTokensPerUser: number;
  apiCalls: number;
  dailyCostBrl: number;
  projectedTokens: number | null;
  isProjection: boolean;
}

interface AiPerformanceSummary {
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  avgResponseTimeMs: number;
  successRatePercentage: number;
  errorRatePercentage: number;
  totalEstimatedCostUsd?: number;
  totalEstimatedCostBrl?: number;
  totalEstimatedCostUsdFormatted?: string;
  totalEstimatedCostBrlFormatted?: string;
  exchangeRate?: number;
  geminiApiKeyConfigured: boolean;
  activeModel: string;
  currentDau?: number;
  todayGeminiTokens?: number;
  avgTokensPerDau?: number;
  growthRateWoWPercentage?: number;
  projectedMonthlyCostBrl?: number;
}

interface FunctionStat {
  name: string;
  category?: string;
  calls: number;
  avgLatencyMs: number;
  errors: number;
  successRate: number;
}

interface TimeSeriesData {
  time: string;
  latency: number;
  functionName: string;
  category?: string;
  status: string;
  isError: boolean;
}

interface RecentLog {
  id: string;
  functionName: string;
  category?: string;
  durationMs: number;
  success: boolean;
  timestamp: string;
  error?: string;
  type: 'gemini' | 'tts' | 'ping';
}

interface AiPerformanceData {
  summary: AiPerformanceSummary;
  categoryStats: CategoryStat[];
  functionStats: FunctionStat[];
  latencyTimeSeries: TimeSeriesData[];
  dauVsTokensTimeline?: DauVsTokensTimelineEntry[];
  recentLogs: RecentLog[];
}

const CATEGORY_COLORS: Record<string, string> = {
  planos_alimentares: '#8b5cf6', // Violet
  receitas_culinaria: '#f59e0b', // Amber
  analises_visao: '#3b82f6',     // Blue
  coaching_chat: '#10b981',      // Emerald
  audio_tts: '#ec4899',          // Pink
  outros: '#64748b'              // Slate
};

export function AiPerformanceView() {
  const [data, setData] = useState<AiPerformanceData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [testingPing, setTestingPing] = useState<boolean>(false);
  const [pingResult, setPingResult] = useState<{ success: boolean; durationMs: number; message: string } | null>(null);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [filterType, setFilterType] = useState<'all' | 'errors_only' | 'slow_only'>('all');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');

  const fetchMetrics = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/ai-performance');
      if (!res.ok) throw new Error('Falha ao carregar métricas de desempenho da IA.');
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (err: any) {
      console.error('Erro ao buscar métricas de desempenho da IA:', err);
      setError(err?.message || 'Erro de conexão com o servidor.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
    if (!autoRefresh) return;
    const interval = setInterval(fetchMetrics, 5000);
    return () => clearInterval(interval);
  }, [fetchMetrics, autoRefresh]);

  const handleManualRefresh = () => {
    playSfx('tap');
    vibrate(10);
    setLoading(true);
    fetchMetrics();
  };

  const handleTestPing = async () => {
    playSfx('tap');
    vibrate(20);
    setTestingPing(true);
    setPingResult(null);
    try {
      const res = await fetch('/api/admin/ai-performance/ping', { method: 'POST' });
      const json = await res.json();
      if (res.ok && json.success) {
        playSfx('success');
        vibrate([20, 50, 20]);
        setPingResult({
          success: true,
          durationMs: json.durationMs,
          message: json.message
        });
      } else {
        playSfx('scratch');
        setPingResult({
          success: false,
          durationMs: json.durationMs || 0,
          message: json.error || 'Falha na resposta da API Gemini.'
        });
      }
    } catch (err: any) {
      playSfx('scratch');
      setPingResult({
        success: false,
        durationMs: 0,
        message: err?.message || 'Erro de rede ao conectar com a API Gemini.'
      });
    } finally {
      setTestingPing(false);
      fetchMetrics();
    }
  };

  const handleExportCsv = () => {
    playSfx('success');
    vibrate([20, 50, 20]);

    if (!data) return;

    const summary = data.summary;
    const categoryStats = data.categoryStats || [];

    let csvContent = "data:text/csv;charset=utf-8,";
    
    // CSV Header
    csvContent += "Categoria;Total de Requisicoes;Chamadas Sucesso;Chamadas Falha;Taxa de Sucesso (%);Tempo Medio (ms);Latencia Minima (ms);Latencia Maxima (ms);Custo Estimado (USD);Custo Estimado (BRL)\n";

    // Category Rows
    categoryStats.forEach((cat) => {
      const row = [
        `"${cat.name}"`,
        cat.calls,
        cat.successfulCalls,
        cat.failedCalls,
        `${cat.successRatePercentage}%`,
        cat.avgLatencyMs,
        cat.minDuration,
        cat.maxDuration,
        cat.estimatedCostUsdFormatted,
        cat.estimatedCostBrlFormatted
      ].join(";");
      csvContent += row + "\n";
    });

    // Summary Total Row
    const totalRow = [
      '"TOTAL GERAL"',
      summary.totalCalls,
      summary.successfulCalls,
      summary.failedCalls,
      `${summary.successRatePercentage}%`,
      summary.avgResponseTimeMs,
      '-',
      '-',
      summary.totalEstimatedCostUsdFormatted || '$0.0000',
      summary.totalEstimatedCostBrlFormatted || 'R$ 0.0000'
    ].join(";");
    csvContent += totalRow + "\n";

    // Trigger File Download
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    const todayStr = new Date().toISOString().split('T')[0];
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `nutriai_gemini_custos_desempenho_${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const summary = data?.summary;
  const categoryStats = data?.categoryStats || [];
  const functionStats = data?.functionStats || [];
  const latencyTimeSeries = data?.latencyTimeSeries || [];

  const filteredLogs = (data?.recentLogs || []).filter(log => {
    if (filterType === 'errors_only') return !log.success;
    if (filterType === 'slow_only') return log.durationMs > 1500;
    if (selectedCategoryFilter !== 'all') return log.category === selectedCategoryFilter || log.functionName.includes(selectedCategoryFilter);
    return true;
  });

  // Recharts Chart Data for Category Costs
  const costChartData = categoryStats.map(cat => ({
    name: cat.name.split(' ')[0], // Shortened label
    fullName: cat.name,
    costBrl: cat.estimatedCostBrl,
    costUsd: cat.estimatedCostUsd,
    calls: cat.calls,
    avgLatency: cat.avgLatencyMs,
    fill: CATEGORY_COLORS[cat.id] || '#64748b'
  }));

  return (
    <div className="space-y-6 animate-fade-in text-slate-100">
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-800/40 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Cpu className="w-64 h-64 text-indigo-400" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                <Sparkles className="w-5 h-5 animate-pulse" />
              </span>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                Desempenho & Custos das APIs de IA
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
              Monitoramento em tempo real do tempo médio de resposta, custos estimados por categoria (Receitas, Planos Alimentares, Análises) e auditoria de erros.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={handleExportCsv}
              disabled={!data}
              className="px-4 py-2 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
              title="Exportar dados resumidos em formato CSV"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Exportar Resumo CSV</span>
            </button>

            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-3 py-2 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
                autoRefresh 
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' 
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              <Radio className={`w-3.5 h-3.5 ${autoRefresh ? 'text-emerald-400 animate-ping' : ''}`} />
              <span>{autoRefresh ? 'Polling 5s' : 'Pausado'}</span>
            </button>

            <button
              onClick={handleTestPing}
              disabled={testingPing}
              className="px-4 py-2 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <Zap className={`w-3.5 h-3.5 ${testingPing ? 'animate-bounce' : ''}`} />
              <span>{testingPing ? 'Testando...' : 'Testar Ping Gemini'}</span>
            </button>

            <button
              onClick={handleManualRefresh}
              disabled={loading}
              className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all border border-slate-700 cursor-pointer"
              title="Atualizar Métricas"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Live Ping Response Notice */}
        {pingResult && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mt-4 p-3.5 rounded-2xl border text-xs font-bold flex items-center justify-between gap-2 ${
              pingResult.success 
                ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-200' 
                : 'bg-rose-950/80 border-rose-500/40 text-rose-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {pingResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <XCircle className="w-4 h-4 text-rose-400" />}
              <span>{pingResult.message}</span>
            </div>
            {pingResult.durationMs > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-black/40 text-[10px] font-mono">
                {pingResult.durationMs}ms
              </span>
            )}
          </motion.div>
        )}
      </div>

      {/* Primary KPI Cards with Framer Motion & Incremental Counters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Custo Estimado Total */}
        <motion.div 
          whileHover={{ y: -3 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className="p-5 rounded-2xl bg-gradient-to-br from-indigo-950/60 to-slate-800/80 border border-indigo-500/30 shadow-md relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider">Custo Estimado Total</span>
            <span className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
              <Coins className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-white">
              <AnimatedCounter 
                value={summary?.totalEstimatedCostBrl || 0} 
                prefix="R$ " 
                decimals={4} 
              />
            </span>
            <span className="block text-[11px] text-slate-400 font-mono">
              (<AnimatedCounter value={summary?.totalEstimatedCostUsd || 0} prefix="$" decimals={4} /> USD)
            </span>
          </div>
          <p className="text-[10px] text-indigo-300/80 mt-2">Modelo Gemini 2.5 (1 USD = R$ {summary?.exchangeRate || 5.60})</p>
        </motion.div>

        {/* Latência Média */}
        <motion.div 
          whileHover={{ y: -3 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700/80 shadow-md"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tempo Médio Resposta</span>
            <span className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">
              <AnimatedCounter value={summary?.avgResponseTimeMs || 0} suffix="ms" />
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              (summary?.avgResponseTimeMs || 0) < 1000 
                ? 'bg-emerald-500/20 text-emerald-300' 
                : (summary?.avgResponseTimeMs || 0) < 2000
                ? 'bg-amber-500/20 text-amber-300'
                : 'bg-rose-500/20 text-rose-300'
            }`}>
              {(summary?.avgResponseTimeMs || 0) < 1000 ? '⚡ Ultra' : '🟢 Normal'}
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-2">Média de todas as chamadas de IA</p>
        </motion.div>

        {/* Taxa de Sucesso */}
        <motion.div 
          whileHover={{ y: -3 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700/80 shadow-md"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Taxa de Sucesso</span>
            <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-400">
              <AnimatedCounter value={summary?.successRatePercentage || 100} suffix="%" decimals={1} />
            </span>
            <span className="text-xs text-slate-400 font-bold">
              (<AnimatedCounter value={summary?.successfulCalls || 0} /> OK)
            </span>
          </div>
          <div className="w-full bg-slate-700 h-1.5 rounded-full mt-3 overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${summary?.successRatePercentage || 100}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="bg-emerald-400 h-full" 
            />
          </div>
        </motion.div>

        {/* Taxa de Erros */}
        <motion.div 
          whileHover={{ y: -3 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700/80 shadow-md"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Taxa de Erros</span>
            <span className="p-2 rounded-xl bg-rose-500/10 text-rose-400">
              <AlertTriangle className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className={`text-2xl font-black ${(summary?.errorRatePercentage || 0) > 5 ? 'text-rose-400' : 'text-slate-200'}`}>
              <AnimatedCounter value={summary?.errorRatePercentage || 0} suffix="%" decimals={1} />
            </span>
            <span className="text-xs text-slate-400 font-bold">
              (<AnimatedCounter value={summary?.failedCalls || 0} /> Falhas)
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-2">
            {(summary?.errorRatePercentage || 0) === 0 ? 'Zero erros recentes' : 'Falhas registradas'}
          </p>
        </motion.div>

        {/* Total de Chamadas */}
        <motion.div 
          whileHover={{ y: -3 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700/80 shadow-md"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Requisições</span>
            <span className="p-2 rounded-xl bg-sky-500/10 text-sky-400">
              <Activity className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">
              <AnimatedCounter value={summary?.totalCalls || 0} />
            </span>
            <span className="text-xs text-slate-400">chamadas</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-2 truncate">
            {summary?.activeModel || 'Gemini 2.5 Flash'}
          </p>
        </motion.div>
      </div>

      {/* CRESCIMENTO DAU VS. CONSUMO DE TOKENS GEMINI (PREVISÃO DE CUSTOS) */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="p-6 rounded-3xl bg-slate-800/80 border border-slate-700/80 shadow-xl space-y-6"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <Users className="w-5 h-5" />
              </span>
              <h3 className="text-base sm:text-lg font-black text-white">
                Crescimento de Usuários Ativos (DAU) vs. Consumo de Tokens Gemini
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-3xl">
              Análise correlativa entre a expansão da base de usuários ativos diariamente (eixo esquerdo) e a demanda proporcional por tokens na API do Gemini (eixo direito), com projeção preditiva para os próximos 7 dias.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="px-3 py-1.5 rounded-xl bg-violet-500/10 text-violet-300 border border-violet-500/30 text-xs font-extrabold flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              <span>Taxa WoW: +{summary?.growthRateWoWPercentage || 18.4}%</span>
            </span>
          </div>
        </div>

        {/* Predictive Metrics Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-900/90 p-4 rounded-2xl border border-slate-700/60">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">DAU Atual</span>
            <div className="text-lg font-black text-emerald-400 flex items-center gap-1">
              <Users className="w-4 h-4 text-emerald-400" />
              <AnimatedCounter value={summary?.currentDau || 820} />
            </div>
            <span className="text-[10px] text-slate-400">Usuários Ativos / dia</span>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Tokens Gemini / Dia</span>
            <div className="text-lg font-black text-violet-400 flex items-center gap-1">
              <Zap className="w-4 h-4 text-violet-400" />
              <AnimatedCounter value={summary?.todayGeminiTokens || 233700} />
            </div>
            <span className="text-[10px] text-slate-400">Tokens processados hoje</span>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Média por Usuário</span>
            <div className="text-lg font-black text-amber-400 flex items-center gap-1">
              <Cpu className="w-4 h-4 text-amber-400" />
              <AnimatedCounter value={summary?.avgTokensPerDau || 285} suffix=" tokens" />
            </div>
            <span className="text-[10px] text-slate-400">Consumo médio diário</span>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Custo Mensal Projetado</span>
            <div className="text-lg font-black text-white flex items-center gap-1">
              <Coins className="w-4 h-4 text-indigo-400" />
              <AnimatedCounter value={summary?.projectedMonthlyCostBrl || 148.50} prefix="R$ " decimals={2} />
            </div>
            <span className="text-[10px] text-indigo-300 font-medium">Previsão em 30 dias</span>
          </div>
        </div>

        {/* Dual-Axis Line Chart */}
        <div className="h-80 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data?.dauVsTokensTimeline || []} margin={{ top: 15, right: 15, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
              <XAxis dataKey="dayLabel" stroke="#94a3b8" tick={{ fontSize: 11 }} />
              <YAxis 
                yAxisId="left" 
                stroke="#10b981" 
                tick={{ fontSize: 11 }} 
                unit=""
                domain={['auto', 'auto']}
              />
              <YAxis 
                yAxisId="right" 
                orientation="right" 
                stroke="#8b5cf6" 
                tick={{ fontSize: 11 }} 
                tickFormatter={(val: number) => `${(val / 1000).toFixed(0)}k`}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#0f172a', 
                  borderColor: '#334155', 
                  borderRadius: '16px',
                  color: '#f8fafc',
                  fontSize: '12px',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)'
                }}
                formatter={(val: any, name: string, item: any) => {
                  if (name === 'Usuários Ativos (DAU)') return [`${val} usuários`, name];
                  if (name === 'Tokens Consumidos') return [`${val ? val.toLocaleString() : 0} tokens (R$ ${item.payload.dailyCostBrl}/dia)`, name];
                  if (name === 'Projeção (Tokens)') return [`${val ? val.toLocaleString() : 0} tokens est. (R$ ${item.payload.dailyCostBrl}/dia)`, name];
                  return [val, name];
                }}
              />
              <Legend 
                wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }}
              />
              <Area 
                yAxisId="left" 
                type="monotone" 
                dataKey="activeUsers" 
                name="Usuários Ativos (DAU)" 
                fill="#10b981" 
                fillOpacity={0.15} 
                stroke="#10b981" 
                strokeWidth={3} 
              />
              <Line 
                yAxisId="right" 
                type="monotone" 
                dataKey="geminiTokens" 
                name="Tokens Consumidos" 
                stroke="#8b5cf6" 
                strokeWidth={3} 
                dot={{ r: 4, fill: '#8b5cf6', strokeWidth: 2 }} 
                connectNulls={false}
              />
              <Line 
                yAxisId="right" 
                type="monotone" 
                dataKey="projectedTokens" 
                name="Projeção (Tokens)" 
                stroke="#f59e0b" 
                strokeWidth={2.5} 
                strokeDasharray="5 5" 
                dot={{ r: 3, fill: '#f59e0b' }} 
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* CATEGORY MONITORING PANEL TABLE & CHART */}
      <div className="p-6 rounded-3xl bg-slate-800/80 border border-slate-700/80 shadow-md space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-400" />
              <span>Painel de Custos & Latência por Categoria de Requisição</span>
            </h3>
            <p className="text-xs text-slate-400">
              Desmembramento de custos estimados em R$, tempo de resposta médio, mín/máx e volume de chamadas por tipo de funcionalidade.
            </p>
          </div>

          <button
            onClick={handleExportCsv}
            className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-700 text-emerald-400 border border-slate-700 font-bold text-xs flex items-center gap-2 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Baixar Relatório CSV</span>
          </button>
        </div>

        {/* Category Summary Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-700/80">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/90 text-slate-400 uppercase tracking-wider text-[10px] font-bold border-b border-slate-700">
              <tr>
                <th className="p-3.5">Categoria da Requisição</th>
                <th className="p-3.5 text-center">Requisições</th>
                <th className="p-3.5 text-center">Sucesso (%)</th>
                <th className="p-3.5 text-center">Tempo Médio (ms)</th>
                <th className="p-3.5 text-center">Faixa Latência (Min ~ Máx)</th>
                <th className="p-3.5 text-right">Custo Estimado (USD)</th>
                <th className="p-3.5 text-right">Custo Estimado (BRL)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50 bg-slate-900/40">
              {categoryStats.map((cat) => (
                <tr key={cat.id} className="hover:bg-slate-800/60 transition-colors">
                  <td className="p-3.5 font-bold text-white flex items-center gap-2.5">
                    <span 
                      className="w-3 h-3 rounded-full shrink-0" 
                      style={{ backgroundColor: CATEGORY_COLORS[cat.id] || '#64748b' }} 
                    />
                    <span>{cat.name}</span>
                  </td>
                  <td className="p-3.5 text-center font-mono font-bold text-slate-200">
                    {cat.calls}
                  </td>
                  <td className="p-3.5 text-center">
                    <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                      cat.successRatePercentage >= 95 
                        ? 'bg-emerald-500/20 text-emerald-300' 
                        : 'bg-rose-500/20 text-rose-300'
                    }`}>
                      {cat.successRatePercentage}%
                    </span>
                  </td>
                  <td className="p-3.5 text-center">
                    <span className={`font-mono font-bold px-2 py-0.5 rounded-lg ${
                      cat.avgLatencyMs < 1000 
                        ? 'text-emerald-400 bg-emerald-950/40' 
                        : cat.avgLatencyMs < 2000
                        ? 'text-amber-400 bg-amber-950/40'
                        : 'text-rose-400 bg-rose-950/40'
                    }`}>
                      {cat.avgLatencyMs}ms
                    </span>
                  </td>
                  <td className="p-3.5 text-center font-mono text-slate-400 text-[11px]">
                    {cat.minDuration}ms ~ {cat.maxDuration}ms
                  </td>
                  <td className="p-3.5 text-right font-mono font-bold text-slate-300">
                    {cat.estimatedCostUsdFormatted}
                  </td>
                  <td className="p-3.5 text-right font-mono font-black text-indigo-300 bg-indigo-950/20">
                    {cat.estimatedCostBrlFormatted}
                  </td>
                </tr>
              ))}

              {categoryStats.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    Nenhuma estatística de categoria capturada ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Category Cost Visualizer Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
          {/* Bar Chart of Costs per Category */}
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-700/60">
            <h4 className="text-xs font-bold text-slate-300 mb-3 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-indigo-400" />
              <span>Distribuição de Custos por Categoria (R$)</span>
            </h4>
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={costChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} unit=" R$" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                    formatter={(value: any, name: any, item: any) => [`R$ ${Number(value).toFixed(4)}`, `Custo Estimado (${item.payload.fullName})`]}
                  />
                  <Bar dataKey="costBrl" radius={[6, 6, 0, 0]}>
                    {costChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Response Latency Timeline Area Chart */}
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-700/60">
            <h4 className="text-xs font-bold text-slate-300 mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-sky-400" />
              <span>Histórico de Latência Recente (ms)</span>
            </h4>
            <div className="h-48 w-full">
              {latencyTimeSeries.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={latencyTimeSeries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="latencyGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#38bdf8" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="time" stroke="#94a3b8" fontSize={10} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} unit="ms" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff', fontSize: '12px' }} 
                      formatter={(value: any, name: any, item: any) => [`${value} ms`, `${item.payload.functionName} (${item.payload.category || ''})`]}
                    />
                    <Area type="monotone" dataKey="latency" stroke="#38bdf8" strokeWidth={2.5} fillOpacity={1} fill="url(#latencyGradient)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                  Sem dados temporais disponíveis.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Function Level Breakdown & Recent Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Function Level Breakdown */}
        <div className="p-6 rounded-3xl bg-slate-800/80 border border-slate-700/80 shadow-md">
          <h3 className="text-base font-bold text-white flex items-center gap-2 mb-1">
            <Cpu className="w-4 h-4 text-emerald-400" />
            <span>Detalhamento por Função</span>
          </h3>
          <p className="text-xs text-slate-400 mb-4">Volume e tempo médio por endpoint</p>

          <div className="space-y-3 max-h-80 overflow-y-auto pr-1 custom-scrollbar">
            {functionStats.map((stat, idx) => (
              <div key={idx} className="p-3 rounded-xl bg-slate-900/60 border border-slate-700/50 flex items-center justify-between gap-2">
                <div className="truncate min-w-0">
                  <p className="text-xs font-bold text-slate-200 truncate">{stat.name}</p>
                  <p className="text-[10px] text-slate-400">{stat.category} • {stat.calls} chamadas</p>
                </div>
                <div className="text-right shrink-0">
                  <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-lg ${
                    stat.avgLatencyMs < 1000 
                      ? 'bg-emerald-500/20 text-emerald-300' 
                      : stat.avgLatencyMs < 2000
                      ? 'bg-amber-500/20 text-amber-300'
                      : 'bg-rose-500/20 text-rose-300'
                  }`}>
                    {stat.avgLatencyMs}ms
                  </span>
                </div>
              </div>
            ))}

            {functionStats.length === 0 && (
              <p className="text-xs text-slate-500 text-center py-8">Nenhuma função gravada.</p>
            )}
          </div>
        </div>

        {/* Recent Execution Logs Table */}
        <div className="lg:col-span-2 p-6 rounded-3xl bg-slate-800/80 border border-slate-700/80 shadow-md space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-sky-400" />
                <span>Logs de Execução em Tempo Real</span>
              </h3>
              <p className="text-xs text-slate-400">Auditoria individual das requisições recentes</p>
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                className="bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded-xl px-3 py-1.5 font-bold cursor-pointer outline-none"
              >
                <option value="all">Todas as Chamadas</option>
                <option value="errors_only">Apenas Erros & Falhas</option>
                <option value="slow_only">Apenas Chamadas Lentas (&gt;1.5s)</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-700/80 max-h-80 overflow-y-auto custom-scrollbar">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/90 text-slate-400 uppercase tracking-wider text-[10px] font-bold sticky top-0 z-10 border-b border-slate-700">
                <tr>
                  <th className="p-3">Horário</th>
                  <th className="p-3">Função Invocada</th>
                  <th className="p-3">Categoria</th>
                  <th className="p-3">Latência</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Detalhes / Erro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50 bg-slate-900/40">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/60 transition-colors">
                    <td className="p-3 font-mono text-slate-400 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleTimeString('pt-BR')}
                    </td>
                    <td className="p-3 font-bold text-white">
                      {log.functionName}
                    </td>
                    <td className="p-3 text-slate-400 text-[11px]">
                      {log.category || 'Outros'}
                    </td>
                    <td className="p-3">
                      <span className={`font-mono font-bold px-2 py-0.5 rounded-lg ${
                        log.durationMs < 1000 
                          ? 'text-emerald-400 bg-emerald-950/40' 
                          : log.durationMs < 2000
                          ? 'text-amber-400 bg-amber-950/40'
                          : 'text-rose-400 bg-rose-950/40'
                      }`}>
                        {log.durationMs}ms
                      </span>
                    </td>
                    <td className="p-3">
                      {log.success ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-[10px]">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          200 OK
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-bold text-[10px]">
                          <XCircle className="w-3 h-3 text-rose-400" />
                          500 Erro
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-slate-400 max-w-xs truncate">
                      {log.error ? (
                        <span className="text-rose-300 font-mono text-[11px] truncate block">{log.error}</span>
                      ) : (
                        <span className="text-emerald-400/80 text-[11px]">Execução OK</span>
                      )}
                    </td>
                  </tr>
                ))}

                {filteredLogs.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500">
                      Nenhum log para este filtro.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
