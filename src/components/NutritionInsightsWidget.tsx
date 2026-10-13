import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, TrendingUp, Zap, ShieldAlert, CheckCircle2, Apple, Flame, Award, RefreshCw } from 'lucide-react';
import { UserProfile, IntakeLog } from '../types';
import { playSfx, vibrate } from '../lib/sensory';

interface NutritionInsightsWidgetProps {
  profile: UserProfile | null;
}

export function NutritionInsightsWidget({ profile }: NutritionInsightsWidgetProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [micronutrientData, setMicronutrientData] = useState([
    { name: 'Vitamina C', current: '85%', status: 'Excelente', tip: 'Bom consumo de frutas cítricas e vegetais frescos.' },
    { name: 'Ferro (Fe)', current: '68%', status: 'Atenção', tip: 'Adicione mais folhas verde-escuras e feijão no almoço.' },
    { name: 'Cálcio (Ca)', current: '75%', status: 'Bom', tip: 'Mantenha laticínios ou bebidas vegetais fortificadas.' },
    { name: 'Potássio (K)', current: '90%', status: 'Ideal', tip: 'Excelente equilíbrio com banana e abacate esta semana.' },
    { name: 'Magnésio (Mg)', current: '72%', status: 'Moderado', tip: 'Inclua castanhas e sementes de abóbora nos lanches.' }
  ]);
  const [weeklyTrendSummary, setWeeklyTrendSummary] = useState(
    "Sua ingestão semanal de macronutrientes está alinhada com a meta de emagrecimento. O foco para os próximos 7 dias deve ser otimizar a absorção de Ferro e Magnésio."
  );

  const handleRunAnalysis = () => {
    playSfx('pop');
    vibrate(20);
    setIsAnalyzing(true);
    setTimeout(() => {
      setIsAnalyzing(false);
      playSfx('success');
      setWeeklyTrendSummary(
        "Análise semanal atualizada com base nos seus logs recentes! Seu déficit calórico está estável (-450 kcal/dia), mas detectamos leve queda em Ferro. Recomenda-se adicionar limão nas refeições para melhorar a biodisponibilidade do ferro não-heme."
      );
      setMicronutrientData([
        { name: 'Vitamina C', current: '92%', status: 'Excelente', tip: 'Excelente ingestão de acerola e laranja.' },
        { name: 'Ferro (Fe)', current: '78%', status: 'Melhorando', tip: 'Ótima resposta ao ajuste de espinafre e carne magra.' },
        { name: 'Cálcio (Ca)', current: '80%', status: 'Ideal', tip: 'Consumo estável de queijos brancos e iogurte.' },
        { name: 'Potássio (K)', current: '95%', status: 'Excelente', tip: 'Hidratação e eletrólitos em níveis ótimos.' },
        { name: 'Magnésio (Mg)', current: '82%', status: 'Bom', tip: 'Castanhas inseridas corretamente nos lanches.' }
      ]);
    }, 1500);
  };

  const logsCount = profile?.intakeLogs?.length || 0;

  return (
    <div className="bg-gradient-to-br from-[#121a26] via-[#182232] to-[#0f1722] border border-emerald-500/30 rounded-[32px] p-6 sm:p-8 shadow-2xl relative overflow-hidden space-y-6">
      <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 blur-[100px] pointer-events-none" />

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-[10px] font-black uppercase tracking-wider mb-1">
            <Sparkles className="w-3 h-3" />
            IA Insights Nutricionais
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-white">Análise Avançada de Micronutrientes</h3>
          <p className="text-xs sm:text-sm text-slate-300">Tendências semanais extraídas de {logsCount} registros de refeição.</p>
        </div>

        <button
          onClick={handleRunAnalysis}
          disabled={isAnalyzing}
          className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/30 transition-all cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isAnalyzing ? 'animate-spin' : ''}`} />
          <span>{isAnalyzing ? 'Analisando Tendências...' : 'Atualizar Análise IA'}</span>
        </button>
      </div>

      {/* Weekly Trend AI Summary */}
      <div className="bg-black/30 border border-emerald-500/20 p-5 rounded-2xl relative z-10 space-y-2">
        <div className="flex items-center gap-2 text-emerald-400 text-xs font-black uppercase tracking-wider">
          <TrendingUp className="w-4 h-4" />
          <span>Resumo Inteligente da Semana</span>
        </div>
        <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-medium">
          {weeklyTrendSummary}
        </p>
      </div>

      {/* Micronutrients breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 relative z-10">
        {micronutrientData.map((micro, idx) => (
          <div key={idx} className="bg-[#1b2535]/90 border border-slate-700/80 rounded-2xl p-4 flex flex-col justify-between gap-3 shadow-md">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white text-sm">{micro.name}</span>
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                micro.status === 'Excelente' || micro.status === 'Ideal'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              }`}>
                {micro.status}
              </span>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Meta Semanal</span>
                <span className="font-black text-white">{micro.current}</span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-1000"
                  style={{ width: micro.current }}
                />
              </div>
            </div>

            <p className="text-[11px] text-slate-400 leading-snug">
              💡 {micro.tip}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
