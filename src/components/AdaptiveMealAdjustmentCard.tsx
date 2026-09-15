import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, Utensils, Flame, Check, Plus, Volume2, VolumeX, 
  ArrowRight, ShieldCheck, Heart, Leaf, ChevronDown, ChevronUp, AlertCircle
} from 'lucide-react';
import { UserProfile, IntakeLog } from '../types';
import { speak, stopSpeech } from '../lib/speech';
import { playSfx, vibrate } from '../lib/sensory';

interface AdaptiveMealAdjustmentCardProps {
  profile: UserProfile | null;
  onNavigate?: (tabId: string) => void;
  onLogIntake?: (log: IntakeLog) => void;
  onUpdateProfile?: (updater: (prev: UserProfile | null) => UserProfile | null) => void;
}

interface ProteinOption {
  id: string;
  name: string;
  portion: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  icon: string;
  isPlantBased?: boolean;
}

const PROTEIN_OPTIONS: ProteinOption[] = [
  {
    id: 'chicken_breast',
    name: 'Filé de Frango Grelhado',
    portion: '120g',
    calories: 195,
    protein: 36,
    carbs: 0,
    fat: 4,
    icon: '🍗'
  },
  {
    id: 'boiled_eggs',
    name: '2 Ovos Cozidos / Pochê',
    portion: '2 unidades (100g)',
    calories: 140,
    protein: 13,
    carbs: 1,
    fat: 9,
    icon: '🥚'
  },
  {
    id: 'greek_yogurt',
    name: 'Iogurte Grego Natural + Chia',
    portion: '150g',
    calories: 160,
    protein: 15,
    carbs: 8,
    fat: 4,
    icon: '🥣'
  },
  {
    id: 'salmon_fillet',
    name: 'Filé de Salmão / Tilápia',
    portion: '130g',
    calories: 220,
    protein: 32,
    carbs: 0,
    fat: 8,
    icon: '🐟'
  },
  {
    id: 'tofu_sauté',
    name: 'Tofu Grelhado com Cúrcuma',
    portion: '150g',
    calories: 155,
    protein: 17,
    carbs: 3,
    fat: 7,
    icon: '🌱',
    isPlantBased: true
  }
];

export const AdaptiveMealAdjustmentCard: React.FC<AdaptiveMealAdjustmentCardProps> = ({
  profile,
  onNavigate,
  onLogIntake,
  onUpdateProfile
}) => {
  const [selectedOptionId, setSelectedOptionId] = useState<string>('chicken_breast');
  const [isApplied, setIsApplied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Extract health metrics from profile or fallback
  const dailyMetrics = profile?.healthIntegrations?.dailyMetrics;
  const isGoogleFit = !!profile?.healthIntegrations?.googleFit?.connected;
  const isAppleHealth = !!profile?.healthIntegrations?.appleHealth?.connected;
  const sourceLabel = isAppleHealth ? 'Apple Health' : isGoogleFit ? 'Google Fit' : 'sensores de atividade';

  // Active calories burned today
  const activeCalories = dailyMetrics?.activeCalories ?? 480;
  const stepsToday = dailyMetrics?.steps ?? 8420;
  const factor = profile?.healthIntegrations?.activityCalorieFactor ?? 0.5;
  const safeCompensatedKcal = Math.round(activeCalories * factor);

  const selectedProtein = PROTEIN_OPTIONS.find(o => o.id === selectedOptionId) || PROTEIN_OPTIONS[0];

  // Malu voice narration using authentic Aoede voice in PT-BR
  const handleVoiceNarration = () => {
    if (isSpeaking) {
      stopSpeech();
      setIsSpeaking(false);
      return;
    }

    setIsSpeaking(true);
    playSfx('tap');

    const text = `Olá! Como você queimou ${activeCalories} calorias a mais hoje através do ${sourceLabel} em ${stepsToday.toLocaleString('pt-BR')} passos, seu corpo precisa de suporte para recuperação muscular. Sugiro adicionar ${selectedProtein.portion} de ${selectedProtein.name} ao seu jantar. Isso acrescenta ${selectedProtein.protein} gramas de proteína de alto valor biológico sem comprometer seu déficit calórico!`;

    speak(text, {
      onEnded: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false)
    });
  };

  // Apply adjustment to dinner
  const handleApplyAdjustment = () => {
    if (isApplied) return;

    playSfx('success');
    vibrate([20, 40, 20]);
    setIsApplied(true);

    const todayDate = new Date().toISOString().split('T')[0];

    // 1. If onLogIntake is available, record intake item
    const intakeEntry: IntakeLog = {
      id: `adj_${Date.now()}`,
      date: todayDate,
      mealId: `meal_${Date.now()}`,
      recipeName: `[Ajuste Atividade] ${selectedProtein.name} (${selectedProtein.portion})`,
      planned: {
        calories: selectedProtein.calories,
        protein: selectedProtein.protein,
        carbs: selectedProtein.carbs,
        fat: selectedProtein.fat
      },
      actual: {
        calories: selectedProtein.calories,
        protein: selectedProtein.protein,
        carbs: selectedProtein.carbs,
        fat: selectedProtein.fat
      },
      adjusted: true,
      mealType: 'dinner'
    };

    if (onLogIntake) {
      onLogIntake(intakeEntry);
    }

    // 2. Also update profile state if handler exists
    if (onUpdateProfile) {
      onUpdateProfile(prev => {
        if (!prev) return null;
        const currentIntakes = prev.intakeLogs || [];
        return {
          ...prev,
          intakeLogs: [intakeEntry, ...currentIntakes]
        };
      });
    }

    // Voice confirmation from Malu
    speak(`Excelente! Adicionei ${selectedProtein.name} ao seu jantar de hoje. Seu corpo terá todos os aminoácidos necessários para se recuperar.`, {
      onEnded: () => {},
      onError: () => {}
    });
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="card-premium p-5 sm:p-6 space-y-4 relative overflow-hidden group border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-blue-500/10 dark:from-[#0E1A17] dark:via-[#11221D] dark:to-[#101F29]"
    >
      {/* Background glow */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 dark:bg-emerald-500/15 rounded-full blur-2xl pointer-events-none -mr-12 -mt-12" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white flex items-center justify-center shadow-md shadow-emerald-500/20 shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Ajuste Inteligente de Refeição
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                +Gasto Detectado
              </span>
            </div>
            <h4 className="text-base sm:text-lg font-display font-bold text-slate-900 dark:text-white mt-0.5">
              Recomendação Pós-Atividade
            </h4>
          </div>
        </div>

        {/* Audio Button with Malu Aoede */}
        <button
          type="button"
          onClick={handleVoiceNarration}
          title={isSpeaking ? "Parar áudio" : "Ouvir recomendação da Chef Malu"}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all self-start sm:self-auto ${
            isSpeaking
              ? 'bg-purple-600 text-white animate-pulse shadow-md shadow-purple-500/30'
              : 'bg-white dark:bg-slate-800 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60 hover:bg-purple-50 dark:hover:bg-purple-950/50'
          }`}
        >
          {isSpeaking ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          <span>{isSpeaking ? 'Parar Voz' : 'Ouvir Malu'}</span>
        </button>
      </div>

      {/* Main Dynamic Message Box */}
      <div className="p-4 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-emerald-500/20 space-y-3 relative z-10 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-orange-100 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400 shrink-0 mt-0.5">
            <Flame className="w-4 h-4" />
          </div>
          <div className="space-y-1 text-sm">
            <p className="font-semibold text-slate-800 dark:text-slate-100 leading-snug">
              Como você queimou <span className="text-orange-600 dark:text-orange-400 font-bold">{activeCalories} kcal</span> a mais hoje com <span className="font-bold text-slate-900 dark:text-white">{stepsToday.toLocaleString('pt-BR')} passos</span>, adicione uma porção extra de proteína magra ao seu <span className="text-emerald-600 dark:text-emerald-400 font-bold">jantar</span>.
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Isso acelera a regeneração das fibras musculares, evita perda de massa magra durante o sono e preserva seu déficit calórico seguro (+{safeCompensatedKcal} kcal compensadas).
            </p>
          </div>
        </div>

        {/* Selected Protein Highlights & Macros */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{selectedProtein.icon}</span>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-slate-900 dark:text-white">
                  {selectedProtein.name}
                </span>
                <span className="text-xs text-slate-400 font-medium">
                  ({selectedProtein.portion})
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs mt-0.5 text-slate-600 dark:text-slate-300">
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  +{selectedProtein.protein}g proteína
                </span>
                <span>•</span>
                <span>{selectedProtein.calories} kcal</span>
                <span>•</span>
                <span>{selectedProtein.fat}g gorduras</span>
              </div>
            </div>
          </div>

          {/* Action Button: Apply or View Confirmation */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="px-2.5 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1"
            >
              <span>{isExpanded ? 'Ocultar opções' : 'Trocar opção'}</span>
              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={handleApplyAdjustment}
              disabled={isApplied}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm ${
                isApplied
                  ? 'bg-emerald-600 text-white cursor-default'
                  : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-500/20'
              }`}
            >
              {isApplied ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Adicionado ao Jantar</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>Aplicar ao Jantar</span>
                </>
              )}
            </motion.button>
          </div>
        </div>

        {/* Expandable alternative protein selectors */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2 overflow-hidden"
            >
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Escolha a fonte de proteína de sua preferência:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {PROTEIN_OPTIONS.map((item) => {
                  const isSelected = item.id === selectedOptionId;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setSelectedOptionId(item.id);
                        setIsApplied(false);
                        playSfx('tap');
                        vibrate(5);
                      }}
                      className={`p-2.5 rounded-xl text-left flex items-center justify-between border transition-all ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/40 text-slate-900 dark:text-white font-bold shadow-sm'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 hover:border-emerald-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-xl">{item.icon}</span>
                        <div>
                          <div className="text-xs font-bold leading-tight">{item.name}</div>
                          <div className="text-[10px] text-slate-400 font-medium">
                            {item.portion} • {item.protein}g prot • {item.calories} kcal
                          </div>
                        </div>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer info pill */}
      <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 px-1">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>Sincronizado com seu gasto real ({sourceLabel})</span>
        </div>
        {onNavigate && (
          <button 
            type="button"
            onClick={() => onNavigate('plan')}
            className="font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
          >
            <span>Ver Cardápio Completo</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        )}
      </div>
    </motion.div>
  );
};
