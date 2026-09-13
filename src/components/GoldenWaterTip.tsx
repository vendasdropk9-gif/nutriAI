import React, { useState, useMemo, useEffect } from 'react';
import { UserProfile } from '../types';
import {
  Sparkles,
  Sun,
  CloudSun,
  Thermometer,
  Clock,
  Droplets,
  CheckCircle2,
  TrendingUp,
  AlertCircle,
  Coffee,
  Moon,
  ChevronRight,
  Flame,
  Zap,
  Info,
  Calendar,
  CloudRain
} from 'lucide-react';

interface GoldenWaterTipProps {
  profile: UserProfile | null;
  onUpdateProfile?: (updated: Partial<UserProfile> | UserProfile) => void;
}

interface WeatherCondition {
  temp: number; // in °C
  humidity: number; // in %
  condition: 'hot' | 'mild' | 'cold' | 'rainy';
  label: string;
  icon: 'sun' | 'cloudSun' | 'rain';
  extraMlRecommendation: number;
}

export function GoldenWaterTip({ profile, onUpdateProfile }: GoldenWaterTipProps) {
  const currentWeight = profile?.weight || 70;
  const baseWaterGoal = profile?.waterGoal || Math.round(currentWeight * 35) || 2200;

  // Local simulated/dynamic climate state with manual selector option so user can customize
  const [selectedClimate, setSelectedClimate] = useState<'hot' | 'mild' | 'cold'>('mild');

  // Detect realistic climate based on current season/time or local simulation
  const weather: WeatherCondition = useMemo(() => {
    switch (selectedClimate) {
      case 'hot':
        return {
          temp: 31,
          humidity: 48,
          condition: 'hot',
          label: 'Dia Quente e Seco',
          icon: 'sun',
          extraMlRecommendation: 450
        };
      case 'cold':
        return {
          temp: 18,
          humidity: 75,
          condition: 'cold',
          label: 'Dia Fresco / Ameno',
          icon: 'cloudSun',
          extraMlRecommendation: 0
        };
      case 'mild':
      default:
        return {
          temp: 26,
          humidity: 58,
          condition: 'mild',
          label: 'Clima Moderado',
          icon: 'cloudSun',
          extraMlRecommendation: 200
        };
    }
  }, [selectedClimate]);

  // Adjusted daily goal based on climate
  const targetAdjustedWater = baseWaterGoal + weather.extraMlRecommendation;

  // Analyze user's hydration log history to identify patterns & dehydration gaps
  const habitAnalysis = useMemo(() => {
    const logs = profile?.hydrationLogs || [];

    // Bucket logs into day periods: morning (06-11), afternoon (12-17), evening (18-23)
    let morningCount = 0;
    let afternoonCount = 0;
    let eveningCount = 0;

    let totalLoggedToday = 0;
    const todayStr = new Date().toISOString().split('T')[0];

    logs.forEach((log) => {
      const logDate = new Date(log.date);
      const hour = logDate.getHours();

      if (log.date.startsWith(todayStr)) {
        totalLoggedToday += log.amount;
      }

      if (hour >= 5 && hour < 12) morningCount++;
      else if (hour >= 12 && hour < 18) afternoonCount++;
      else eveningCount++;
    });

    // Identify user's vulnerable hydration window
    let weakestPeriod: 'morning' | 'afternoon' | 'evening' = 'morning';
    if (morningCount >= afternoonCount && afternoonCount <= eveningCount) {
      weakestPeriod = 'afternoon';
    } else if (eveningCount <= morningCount && eveningCount <= afternoonCount) {
      weakestPeriod = 'evening';
    } else {
      weakestPeriod = 'morning';
    }

    return {
      morningCount,
      afternoonCount,
      eveningCount,
      totalLoggedToday,
      weakestPeriod,
      hasLogs: logs.length > 0
    };
  }, [profile?.hydrationLogs]);

  // Generate personalized optimal schedule slots
  const optimalSchedule = useMemo(() => {
    const slots = [
      {
        id: 'slot-morning-fast',
        time: '07:00 - 07:30',
        label: 'Ao Despertar em Jejum',
        icon: Sun,
        amount: Math.round(targetAdjustedWater * 0.2), // ~400-500ml
        tag: 'Ativação Metabólica',
        description: 'Reidrata órgãos após 8h de sono, estimula o peristaltismo intestinal e eleva o metabolismo basal.',
        highlight: habitAnalysis.weakestPeriod === 'morning',
        color: 'from-amber-500/10 to-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/40'
      },
      {
        id: 'slot-mid-morning',
        time: '10:30',
        label: 'Meio da Manhã',
        icon: Sparkles,
        amount: Math.round(targetAdjustedWater * 0.15), // ~300-350ml
        tag: 'Foco & Concentração',
        description: 'Mantém o fluxo sanguíneo cerebral estável e previne a névoa mental pré-almoço.',
        highlight: false,
        color: 'from-blue-500/10 to-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/40'
      },
      {
        id: 'slot-pre-lunch',
        time: '11:45',
        label: '30 min Antes do Almoço',
        icon: Droplets,
        amount: Math.round(targetAdjustedWater * 0.12), // ~250-300ml
        tag: 'Digestão Eficiente',
        description: 'Prepara o muco gástrico sem diluir o ácido clorídrico durante a refeição principal.',
        highlight: false,
        color: 'from-emerald-500/10 to-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/40'
      },
      {
        id: 'slot-afternoon-peak',
        time: weather.condition === 'hot' ? '14:30 e 16:00' : '15:30',
        label: 'Pico Térmico da Tarde',
        icon: Flame,
        amount: Math.round(targetAdjustedWater * (weather.condition === 'hot' ? 0.28 : 0.22)), // ~500-600ml
        tag: weather.condition === 'hot' ? 'Termorregulação Extra' : 'Combate à Letargia',
        description:
          weather.condition === 'hot'
            ? `Com ${weather.temp}°C, a transpiração imperceptível sobe 40%. Beba pequenas doses fracionadas para não reter sódio.`
            : 'Evita a queda de energia pós-prandial e reduz a falsa fome por doces ou cafés repetidos.',
        highlight: habitAnalysis.weakestPeriod === 'afternoon' || weather.condition === 'hot',
        color: 'from-orange-500/10 to-orange-500/20 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800/40'
      },
      {
        id: 'slot-early-evening',
        time: '18:30 - 19:30',
        label: 'Início da Noite',
        icon: Droplets,
        amount: Math.round(targetAdjustedWater * 0.15), // ~300ml
        tag: 'Detox Linfático',
        description: 'Auxilia a filtragem renal noturna e evita retenção hídrica nas extremidades.',
        highlight: habitAnalysis.weakestPeriod === 'evening',
        color: 'from-cyan-500/10 to-cyan-500/20 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800/40'
      },
      {
        id: 'slot-pre-sleep',
        time: '21:30',
        label: '1h Antes de Dormir',
        icon: Moon,
        amount: Math.min(200, Math.round(targetAdjustedWater * 0.08)), // ~150-200ml
        tag: 'Prevenção Cardiovascular',
        description: 'Dose moderada para proteger a viscosidade sanguínea sem interromper o sono profundo para urinar.',
        highlight: false,
        color: 'from-indigo-500/10 to-indigo-500/20 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/40'
      }
    ];

    return slots;
  }, [targetAdjustedWater, weather, habitAnalysis]);

  // Handle quick water logging directly from golden tip
  const handleLogQuickWater = (amountMl: number) => {
    if (!profile) return;
    const newLog = {
      id: `water-${Date.now()}`,
      date: new Date().toISOString(),
      amount: amountMl
    };
    const updatedHydration = [...(profile.hydrationLogs || []), newLog];

    if (onUpdateProfile) {
      onUpdateProfile({
        hydrationLogs: updatedHydration
      });
    }
  };

  return (
    <div
      id="golden-water-tip-card"
      className="bg-gradient-to-br from-amber-500/[0.07] via-white to-emerald-500/[0.05] dark:from-amber-950/20 dark:via-slate-800/90 dark:to-emerald-950/20 backdrop-blur-2xl p-6 md:p-8 rounded-[36px] shadow-xl border border-amber-200/60 dark:border-amber-700/30 flex flex-col justify-between relative overflow-hidden transition-all duration-300"
    >
      {/* Decorative Golden Glow */}
      <div className="absolute top-0 right-0 -mt-10 -mr-10 w-44 h-44 bg-amber-400/15 dark:bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />

      <div>
        {/* Header with Badge & Climate Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-amber-100 dark:border-amber-900/30">
          <div>
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 mb-1">
              <Sparkles className="w-4 h-4 fill-amber-400 animate-pulse text-amber-500" />
              <span className="text-xs font-black uppercase tracking-wider">Crononutrição & Hidratação</span>
            </div>
            <h3 className="font-serif text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
              Dica de Ouro
              <span className="text-xs font-sans font-black px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700/50">
                Horários Ideais
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-lg">
              Sugestão estratégica de horários baseada no seu padrão de ingestão e nas demandas térmicas do clima de hoje.
            </p>
          </div>

          {/* Climate Context Selector */}
          <div className="flex items-center gap-1.5 bg-white/90 dark:bg-slate-900/90 p-1.5 rounded-2xl border border-amber-200/60 dark:border-slate-700 shadow-sm shrink-0">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase px-2">Clima:</span>
            <button
              onClick={() => setSelectedClimate('mild')}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border-none outline-none ${
                selectedClimate === 'mild'
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              title="Clima Ameno / Moderado (24°C - 26°C)"
            >
              <CloudSun className="w-3.5 h-3.5" />
              <span>Ameno</span>
            </button>
            <button
              onClick={() => setSelectedClimate('hot')}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border-none outline-none ${
                selectedClimate === 'hot'
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              title="Clima Quente / Seco (>30°C)"
            >
              <Sun className="w-3.5 h-3.5" />
              <span>Quente (+450ml)</span>
            </button>
            <button
              onClick={() => setSelectedClimate('cold')}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border-none outline-none ${
                selectedClimate === 'cold'
                  ? 'bg-blue-500 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              title="Clima Fresco / Inverno (<20°C)"
            >
              <Thermometer className="w-3.5 h-3.5" />
              <span>Fresco</span>
            </button>
          </div>
        </div>

        {/* Dynamic Climate & Behavioral Insight Banner */}
        <div className="my-5 p-4 rounded-2xl bg-amber-500/10 dark:bg-amber-500/10 border border-amber-200/80 dark:border-amber-800/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
              <Thermometer className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-amber-900 dark:text-amber-200">
                  {weather.label} • {weather.temp}°C
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white dark:bg-slate-900 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                  Umidade {weather.humidity}%
                </span>
              </div>
              <p className="text-xs text-amber-800/90 dark:text-amber-300/90 mt-0.5">
                {weather.condition === 'hot'
                  ? 'O calor eleva a perda hídrica basal. Recomendamos acrescentar +450 ml divididos nos picos da tarde.'
                  : weather.condition === 'cold'
                  ? 'No frio, a sensação de sede cai até 40%, mas a perda respiratória continua. Mantenha os copos programados!'
                  : 'Condição térmica balanceada: siga o cronograma circadiano para maximizar a absorção sem sobrecarregar a bexiga.'}
              </p>
            </div>
          </div>

          <div className="sm:text-right shrink-0">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Meta Ajustada Hoje</span>
            <span className="text-base font-black text-amber-700 dark:text-amber-400">
              {targetAdjustedWater.toLocaleString('pt-BR')} ml
            </span>
          </div>
        </div>

        {/* Personalized Golden Schedule Timeline */}
        <div className="space-y-3 mt-4">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 px-1">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              Cronograma Inteligente Recomendado
            </span>
            <span className="text-[11px] text-amber-600 dark:text-amber-400">
              Doses fracionadas de 250 a 450 ml
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {optimalSchedule.map((slot) => {
              const SlotIcon = slot.icon;
              return (
                <div
                  key={slot.id}
                  className={`p-3.5 rounded-2xl border transition-all hover:shadow-md flex flex-col justify-between relative bg-white/70 dark:bg-slate-900/60 ${
                    slot.highlight
                      ? 'border-amber-400 dark:border-amber-500/60 ring-2 ring-amber-400/20'
                      : 'border-slate-200/70 dark:border-slate-800'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                          <SlotIcon className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-xs font-black text-slate-900 dark:text-slate-100">{slot.label}</span>
                      </div>

                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5 text-amber-500" />
                        {slot.time}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed mb-2.5">
                      {slot.description}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-black text-amber-600 dark:text-amber-400">
                        {slot.amount} ml
                      </span>
                      <span className="text-[10px] font-semibold text-slate-400">
                        ({slot.tag})
                      </span>
                    </div>

                    <button
                      onClick={() => handleLogQuickWater(slot.amount)}
                      className="text-[10px] font-bold px-2 py-1 rounded-lg bg-amber-500/10 dark:bg-amber-500/20 hover:bg-amber-500 hover:text-white text-amber-700 dark:text-amber-300 transition-all flex items-center gap-1 cursor-pointer border border-amber-300/50 dark:border-amber-700/40"
                      title={`Registrar agora ${slot.amount} ml de água`}
                    >
                      <Droplets className="w-2.5 h-2.5" />
                      Beber {slot.amount}ml
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Golden Tip Bottom Action Callout */}
      <div className="mt-6 pt-4 border-t border-amber-200/50 dark:border-amber-900/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-amber-900 dark:text-amber-200">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>
            <strong>Regra de Ouro:</strong> Nunca beba mais de 600 ml em um único gole. O corpo absorve melhor água em pequenos goles constantes a cada 60-90 minutos.
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] text-slate-400">Ingestão Hoje:</span>
          <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
            {habitAnalysis.totalLoggedToday} ml
          </span>
        </div>
      </div>
    </div>
  );
}
