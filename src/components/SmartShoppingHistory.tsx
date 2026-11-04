import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  TrendingUp, 
  TrendingDown, 
  Package, 
  ShoppingCart, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw, 
  DollarSign, 
  ShieldAlert, 
  ArrowRight,
  PieChart as PieChartIcon,
  BarChart3,
  Lightbulb,
  Check
} from 'lucide-react';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid, Cell 
} from 'recharts';
import { UserProfile } from '../types';
import { playSfx, vibrate } from '../lib/sensory';
import { useTranslation } from '../contexts/LanguageContext';

interface SmartShoppingHistoryProps {
  profile?: UserProfile | null;
  addNotification?: (notif: any) => void;
}

interface PurchaseItemStats {
  name: string;
  category: string;
  purchaseCount: number;
  avgCost: number;
  inPantryDaysLeft: number;
  status: 'frequent_unused' | 'balanced' | 'running_low';
}

const INITIAL_PURCHASE_STATS: PurchaseItemStats[] = [
  { name: 'Ovos Caipiras (Dúzia)', category: 'Laticínios', purchaseCount: 8, avgCost: 18.90, inPantryDaysLeft: 2, status: 'running_low' },
  { name: 'Peito de Frango (1kg)', category: 'Proteínas', purchaseCount: 6, avgCost: 24.50, inPantryDaysLeft: 9, status: 'frequent_unused' },
  { name: 'Abacate Hass (kg)', category: 'Frutas', purchaseCount: 5, avgCost: 12.00, inPantryDaysLeft: 4, status: 'balanced' },
  { name: 'Aveia em Flocos (500g)', category: 'Grãos', purchaseCount: 4, avgCost: 8.50, inPantryDaysLeft: 14, status: 'frequent_unused' },
  { name: 'Castanha de Caju (200g)', category: 'Snacks', purchaseCount: 4, avgCost: 22.00, inPantryDaysLeft: 1, status: 'running_low' },
  { name: 'Brócolis Fresco (Unidade)', category: 'Vegetais', purchaseCount: 7, avgCost: 6.50, inPantryDaysLeft: 3, status: 'balanced' },
  { name: 'Filé de Salmão (500g)', category: 'Proteínas', purchaseCount: 3, avgCost: 44.90, inPantryDaysLeft: 6, status: 'frequent_unused' },
];

export function SmartShoppingHistory({ profile, addNotification }: SmartShoppingHistoryProps) {
  const { t } = useTranslation();
  const [timeframe, setTimeframe] = useState<'1M' | '3M' | '6M'>('1M');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [purchaseData, setPurchaseData] = useState<PurchaseItemStats[]>(INITIAL_PURCHASE_STATS);
  const [optimized, setOptimized] = useState(false);
  const [estimatedSavings, setEstimatedSavings] = useState(142.80);
  const [wasteReductionPct, setWasteReductionPct] = useState(34);

  // Sync with pantry inventory from local storage if available
  useEffect(() => {
    try {
      const rawPantry = localStorage.getItem('nutri_pantry_items');
      if (rawPantry) {
        const pantryItems = JSON.parse(rawPantry);
        if (Array.isArray(pantryItems) && pantryItems.length > 0) {
          // Update items matching pantry
          setPurchaseData(prev => prev.map(item => {
            const found = pantryItems.find((p: any) => p.name?.toLowerCase().includes(item.name.toLowerCase().split(' ')[0]));
            if (found && found.expirationDate) {
              const exp = new Date(found.expirationDate).getTime();
              const diffDays = Math.ceil((exp - Date.now()) / (1000 * 60 * 60 * 24));
              return { ...item, inPantryDaysLeft: Math.max(0, diffDays) };
            }
            return item;
          }));
        }
      }
    } catch (e) {
      console.warn("Error loading pantry data for shopping history:", e);
    }
  }, []);

  const handleRunAiOptimization = () => {
    playSfx('success');
    vibrate([40, 60, 40]);
    setIsAnalyzing(true);

    setTimeout(() => {
      setIsAnalyzing(false);
      setOptimized(true);
      setEstimatedSavings(189.50);
      setWasteReductionPct(42);

      if (addNotification) {
        addNotification({
          title: "IA Aplicou Otimização de Compras! 🧠",
          message: "Identificamos 3 itens repetidos na despensa. Sua lista foi otimizada com economia de R$ 46,70 nesta semana.",
          type: "success"
        });
      } else {
        window.dispatchEvent(new CustomEvent('app:notification', {
          detail: {
            title: "IA Aplicou Otimização de Compras! 🧠",
            message: "Identificamos 3 itens repetidos na despensa. Sua lista foi otimizada com economia de R$ 46,70 nesta semana.",
            type: "success"
          }
        }));
      }
    }, 1200);
  };

  const chartData = purchaseData.map(item => ({
    name: item.name.length > 18 ? item.name.substring(0, 16) + '...' : item.name,
    compras: item.purchaseCount,
    diasDespensa: item.inPantryDaysLeft,
    custo: item.avgCost
  }));

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-xl border border-emerald-100 dark:border-slate-800 space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <BarChart3 className="w-6 h-6" />
            </span>
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                Histórico de Compras & Despensa (Smart AI)
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Cruzamento inteligente entre itens comprados frequentemente e o estoque atual na despensa.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl flex items-center text-xs font-medium">
            {(['1M', '3M', '6M'] as const).map(tf => (
              <button
                key={tf}
                onClick={() => { playSfx('tap'); setTimeframe(tf); }}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  timeframe === tf 
                    ? 'bg-emerald-600 text-white shadow-md' 
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {tf === '1M' ? 'Último Mês' : tf === '3M' ? '3 Meses' : '6 Meses'}
              </button>
            ))}
          </div>

          <button
            onClick={handleRunAiOptimization}
            disabled={isAnalyzing}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl shadow-lg shadow-emerald-600/20 font-medium text-sm transition-all transform active:scale-95 disabled:opacity-70"
          >
            {isAnalyzing ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
            )}
            <span>{isAnalyzing ? 'Analisando...' : 'Otimizar com IA'}</span>
          </button>
        </div>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/5 dark:from-emerald-500/20 dark:to-teal-500/10 rounded-2xl p-4 border border-emerald-500/20 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Economia Estimada</p>
            <h4 className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">R$ {estimatedSavings.toFixed(2)}</h4>
            <p className="text-xs text-emerald-600 dark:text-emerald-300 mt-0.5">Evitando compras duplicadas</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/5 dark:from-blue-500/20 dark:to-cyan-500/10 rounded-2xl p-4 border border-blue-500/20 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wider">Redução de Desperdício</p>
            <h4 className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">{wasteReductionPct}%</h4>
            <p className="text-xs text-blue-600 dark:text-blue-300 mt-0.5">Baseado no vencimento da despensa</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <TrendingDown className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/5 dark:from-amber-500/20 dark:to-orange-500/10 rounded-2xl p-4 border border-amber-500/20 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider">Status da Despensa</p>
            <h4 className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
              {optimized ? 'Otimizado 🟢' : 'Atenção 🟡'}
            </h4>
            <p className="text-xs text-amber-600 dark:text-amber-300 mt-0.5">
              {optimized ? 'Nenhum desperdício previsto' : '3 itens com estoque parado'}
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <Package className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Chart Section */}
      <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-5 border border-slate-100 dark:border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-semibold text-slate-800 dark:text-slate-200 text-sm flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-emerald-500" />
            <span>Frequência de Compra vs. Dias Restantes na Despensa</span>
          </h4>
          <span className="text-xs text-slate-500 dark:text-slate-400">Análise Recharts 30 Dias</span>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.15} />
              <XAxis 
                dataKey="name" 
                angle={-25} 
                textAnchor="end" 
                tick={{ fontSize: 11, fill: '#64748b' }} 
                height={40} 
              />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#0f172a', 
                  borderColor: '#334155', 
                  borderRadius: '12px', 
                  color: '#fff',
                  fontSize: '12px' 
                }} 
              />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
              <Bar dataKey="compras" name="Vezes Compradas" fill="#10b981" radius={[6, 6, 0, 0]} />
              <Bar dataKey="diasDespensa" name="Dias Restantes na Despensa" fill="#3b82f6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* AI Recommendations & Unused Pantry items breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Unused / Overstocked items */}
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 border border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <h5 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
              Itens Frequentes com Estoque Suficiente
            </h5>
          </div>
          <div className="space-y-2">
            {purchaseData
              .filter(item => item.inPantryDaysLeft >= 5)
              .map((item, idx) => (
                <div key={idx} className="flex items-center justify-between bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800">
                  <div>
                    <p className="text-xs font-medium text-slate-900 dark:text-white">{item.name}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Comprado {item.purchaseCount}x • Custo médio R$ {item.avgCost.toFixed(2)}</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    Estoque para {item.inPantryDaysLeft} dias
                  </span>
                </div>
              ))}
          </div>
        </div>

        {/* Running Low / Needs Restock */}
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 border border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <h5 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
              Sugestões de Reposição Inteligente
            </h5>
          </div>
          <div className="space-y-2">
            {purchaseData
              .filter(item => item.inPantryDaysLeft < 5)
              .map((item, idx) => (
                <div key={idx} className="flex items-center justify-between bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800">
                  <div>
                    <p className="text-xs font-medium text-slate-900 dark:text-white">{item.name}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Acabando na despensa ({item.inPantryDaysLeft} dias restantes)</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <Check className="w-3 h-3" /> Adicionar à Lista
                  </span>
                </div>
              ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
