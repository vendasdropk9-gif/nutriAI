import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  Lightbulb, 
  ArrowRight, 
  ArrowLeft, 
  Check, 
  Plus, 
  RefreshCw, 
  ShieldCheck, 
  Heart, 
  Zap, 
  Utensils, 
  Leaf, 
  ChevronRight, 
  ChevronLeft,
  Pause,
  Play,
  Copy,
  Layers,
  Award
} from 'lucide-react';
import { UserProfile } from '../types';
import { VoicePlayButton } from './VoicePlayButton';
import { playSfx, vibrate } from '../lib/sensory';

export interface ExpertTipItem {
  id: string;
  tag: string;
  category: 'substituição' | 'técnica' | 'nutrição' | 'saúde';
  icon: string;
  title: string;
  message: string;
  suggestedAction?: {
    label: string;
    ingredientText?: string;
    preferenceText?: string;
  };
  restrictionMatch?: string;
}

interface ExpertTipsProps {
  profile: UserProfile | null;
  activePreferences?: string;
  onApplySuggestion?: (ingredientOrPref: { ingredient?: string; preference?: string }) => void;
  className?: string;
}

const DEFAULT_EXPERT_TIPS: ExpertTipItem[] = [
  // --- Sem Glúten / Doença Celíaca ---
  {
    id: 'tip-gluten-1',
    tag: 'Sem Glúten',
    category: 'substituição',
    icon: '🌾',
    title: 'Farinha de Trigo → Farinha de Amêndoa',
    message: 'Que tal substituir a farinha de trigo por farinha de amêndoa ou farinha de aveia sem glúten para um toque mais saudável e rica em gorduras boas?',
    suggestedAction: {
      label: 'Adicionar farinha de amêndoa',
      ingredientText: 'farinha de amêndoa',
      preferenceText: 'sem glúten'
    },
    restrictionMatch: 'glúten'
  },
  {
    id: 'tip-gluten-2',
    tag: 'Sem Glúten',
    category: 'substituição',
    icon: '🥣',
    title: 'Espessante Inteligente para Molhos',
    message: 'Para engrossar cremes e sopas sem farinha de trigo, use polvilho doce, biomassa de banana verde ou farinha de araruta.',
    suggestedAction: {
      label: 'Usar biomassa ou polvilho',
      ingredientText: 'biomassa de banana verde',
      preferenceText: 'sem glúten'
    },
    restrictionMatch: 'glúten'
  },
  {
    id: 'tip-gluten-3',
    tag: 'Sem Glúten',
    category: 'substituição',
    icon: '🍝',
    title: 'Massa Tradicional → Zoodles ou Pupunha',
    message: 'Troque a massa de trigo por tiras de abobrinha fresca (zoodles) ou palmito pupunha para uma digestão leve e livre de glúten.',
    suggestedAction: {
      label: 'Usar espiral de abobrinha',
      ingredientText: 'abobrinha em espiral',
      preferenceText: 'sem glúten'
    },
    restrictionMatch: 'glúten'
  },

  // --- Sem Lactose / Intolerância ---
  {
    id: 'tip-lactose-1',
    tag: 'Sem Lactose',
    category: 'substituição',
    icon: '🥛',
    title: 'Creme de Leite → Creme de Castanhas',
    message: 'Bata castanhas-de-caju hidratadas com água morna para criar um creme aveludado e neutro, perfeito para risotos e molhos brancos.',
    suggestedAction: {
      label: 'Usar creme de castanha',
      ingredientText: 'castanha de caju hidratada',
      preferenceText: 'sem lactose'
    },
    restrictionMatch: 'lactose'
  },
  {
    id: 'tip-lactose-2',
    tag: 'Sem Lactose',
    category: 'substituição',
    icon: '🧀',
    title: 'Toque Queijoso com Levedura Nutricional',
    message: 'A levedura nutricional (Nutritional Yeast) adiciona um delicioso sabor de queijo e um boost de vitaminas do complexo B sem lactose.',
    suggestedAction: {
      label: 'Adicionar levedura nutricional',
      ingredientText: 'levedura nutricional',
      preferenceText: 'sem lactose'
    },
    restrictionMatch: 'lactose'
  },
  {
    id: 'tip-lactose-3',
    tag: 'Sem Lactose',
    category: 'substituição',
    icon: '🥥',
    title: 'Leite de Coco Caseiro em Sobremesas',
    message: 'Para doces cremosos e vitaminas, o leite de coco ou leite de aveia adicionam textura encorpada e gorduras de absorção rápida.',
    suggestedAction: {
      label: 'Usar leite vegetal',
      ingredientText: 'leite de coco',
      preferenceText: 'sem lactose'
    },
    restrictionMatch: 'lactose'
  },

  // --- Vegano / Vegetariano ---
  {
    id: 'tip-vegan-1',
    tag: 'Vegano & Vegetariano',
    category: 'substituição',
    icon: '🌿',
    title: 'Ovo em Massas → Gel de Chia ou Linhaça',
    message: 'Misture 1 colher (sopa) de sementes de chia com 3 colheres de água morna e deixe descansar 5 min para substituir 1 ovo perfeitamente!',
    suggestedAction: {
      label: 'Usar gel de chia',
      ingredientText: 'gel de semente de chia',
      preferenceText: 'vegano'
    },
    restrictionMatch: 'vegano'
  },
  {
    id: 'tip-vegan-2',
    tag: 'Vegano & Vegetariano',
    category: 'nutrição',
    icon: '💪',
    title: 'Proteína Vegetal Completa: Arroz + Feijão',
    message: 'A clássica combinação de leguminosas (grão-de-bico, lentilha, feijões) com cereais integrais (arroz, quinoa) garante todos os aminoácidos essenciais.',
    suggestedAction: {
      label: 'Adicionar grão-de-bico e quinoa',
      ingredientText: 'grão-de-bico cozido, quinoa',
      preferenceText: 'plant-based'
    },
    restrictionMatch: 'vegetariano'
  },
  {
    id: 'tip-vegan-3',
    tag: 'Vegano & Vegetariano',
    category: 'técnica',
    icon: '🍄',
    title: 'Sabor Umami Natural com Cogumelos',
    message: 'Cogumelos frescos (shitake, shimeji ou paris) tostados na frigideira fornecem a profundidade de sabor umami sem ingredientes de origem animal.',
    suggestedAction: {
      label: 'Adicionar cogumelos frescos',
      ingredientText: 'cogumelos frescos',
      preferenceText: 'vegano'
    },
    restrictionMatch: 'vegano'
  },

  // --- Diabetes & Controle Glicêmico ---
  {
    id: 'tip-diabetes-1',
    tag: 'Controle Glicêmico',
    category: 'substituição',
    icon: '🩸',
    title: 'Arroz Branco → Arroz de Couve-Flor ou Quinoa',
    message: 'Triture couve-flor crua para fazer um arroz de baixo índice glicêmico que absorve os temperos e evita picos rápidos de glicemia.',
    suggestedAction: {
      label: 'Usar arroz de couve-flor',
      ingredientText: 'arroz de couve-flor',
      preferenceText: 'baixo índice glicêmico'
    },
    restrictionMatch: 'diabetes'
  },
  {
    id: 'tip-diabetes-2',
    tag: 'Controle Glicêmico',
    category: 'nutrição',
    icon: '🌱',
    title: 'Canela e Vinagre de Maçã Pré-Refeição',
    message: 'Uma pitada de canela ou 1 colher de vinagre de maçã nas saladas auxilia na sensibilidade à insulina e no controle pós-prandial.',
    suggestedAction: {
      label: 'Adicionar canela e vinagre',
      ingredientText: 'canela em pó, vinagre de maçã',
      preferenceText: 'diabetes'
    },
    restrictionMatch: 'diabetes'
  },

  // --- Hipertensão & Saúde Cardiovascular ---
  {
    id: 'tip-hypertension-1',
    tag: 'Saúde Cardiovascular',
    category: 'substituição',
    icon: '❤️',
    title: 'Sal Refinado → Sal de Ervas Frescas (Gersal)',
    message: 'Prepare um sal de ervas com orégano, alecrim, cúrcuma e raspas de limão siciliano para triplicar o sabor e reduzir o sódio em até 70%.',
    suggestedAction: {
      label: 'Usar ervas e raspas de limão',
      ingredientText: 'alecrim fresco, orégano, cúrcuma, limão siciliano',
      preferenceText: 'baixo sódio'
    },
    restrictionMatch: 'hipertensão'
  },
  {
    id: 'tip-hypertension-2',
    tag: 'Saúde Cardiovascular',
    category: 'nutrição',
    icon: '🧄',
    title: 'Alho Assado e Azeite Extra Virgem',
    message: 'A alicina do alho e os polifenóis do azeite de oliva extra virgem auxiliam na vasodilatação e na proteção endotelial.',
    suggestedAction: {
      label: 'Adicionar alho e azeite extra virgem',
      ingredientText: 'alho assado, azeite de oliva extra virgem',
      preferenceText: 'cardioprotetor'
    },
    restrictionMatch: 'hipertensão'
  },

  // --- Emagrecimento & Saciedade ---
  {
    id: 'tip-weightloss-1',
    tag: 'Emagrecimento',
    category: 'substituição',
    icon: '🔥',
    title: 'Cremes Pesados → Iogurte Grego Natural',
    message: 'Substitua maionese e creme de leite por iogurte grego natural desnatado temperado com mostarda dijon, ervas e limão: menos calorias e 3x mais proteína!',
    suggestedAction: {
      label: 'Usar iogurte grego com ervas',
      ingredientText: 'iogurte grego natural, mostarda dijon',
      preferenceText: 'baixo teor calórico'
    },
    restrictionMatch: 'emagrecimento'
  },
  {
    id: 'tip-weightloss-2',
    tag: 'Saciedade',
    category: 'nutrição',
    icon: '🥗',
    title: 'Volume e Fibras com Folhas Escuras',
    message: 'Adicione espinafre, rúcula ou couve picadinha nos últimos 2 minutos de cocção para dobrar o volume do prato sem adicionar calorias.',
    suggestedAction: {
      label: 'Adicionar espinafre e rúcula',
      ingredientText: 'espinafre fresco, rúcula',
      preferenceText: 'rico em fibras'
    },
    restrictionMatch: 'emagrecimento'
  },

  // --- Ganho de Massa & Performance ---
  {
    id: 'tip-muscle-1',
    tag: 'Ganho de Massa',
    category: 'nutrição',
    icon: '🏋️',
    title: 'Densidade Proteica com Sementes e Claras',
    message: 'Adicione sementes de abóbora tostadas ou claras de ovos pasteurizadas em preparos quentes para alcançar facilmente 30g+ de proteína por refeição.',
    suggestedAction: {
      label: 'Adicionar sementes de abóbora',
      ingredientText: 'sementes de abóbora tostadas',
      preferenceText: 'hiperproteico'
    },
    restrictionMatch: 'massa'
  },

  // --- Anti-inflamatório & Vitalidade Geral ---
  {
    id: 'tip-vitality-1',
    tag: 'Anti-inflamatório',
    category: 'técnica',
    icon: '✨',
    title: 'A Dupla Dourada: Cúrcuma + Pimenta Preta',
    message: 'A piperina da pimenta-do-reino aumenta a absorção da curcumina anti-inflamatória em até 2000%! Use sempre essa dupla nos refogados.',
    suggestedAction: {
      label: 'Adicionar cúrcuma com pimenta preta',
      ingredientText: 'cúrcuma em pó, pimenta-do-reino moída',
      preferenceText: 'anti-inflamatório'
    }
  },
  {
    id: 'tip-vitality-2',
    tag: 'Doçura Natural',
    category: 'substituição',
    icon: '🍎',
    title: 'Açúcar Refinado → Purê de Maçã ou Tâmaras',
    message: 'Em bolos e doces caseiros, substitua o açúcar branco por purê de maçã assada ou pasta de tâmaras para obter doçura com fibras solúveis.',
    suggestedAction: {
      label: 'Usar purê de maçã ou tâmaras',
      ingredientText: 'purê de maçã, tâmaras',
      preferenceText: 'sem açúcar refinado'
    }
  }
];

export function ExpertTips({
  profile,
  activePreferences = '',
  onApplySuggestion,
  className = ''
}: ExpertTipsProps) {
  // Compute matching tips based on profile restrictions and preferences
  const getRelevantTips = (): ExpertTipItem[] => {
    const userRestrictions = (profile?.restrictions || []).map(r => r.toLowerCase());
    const userAllergies = (profile?.allergies || []).map(a => a.toLowerCase());
    const userGoals = (profile?.goals || '').toLowerCase();
    const currentPrefs = activePreferences.toLowerCase();

    // Score and filter tips
    const scored = DEFAULT_EXPERT_TIPS.map(tip => {
      let score = 1;
      const match = (tip.restrictionMatch || '').toLowerCase();

      if (match) {
        if (userRestrictions.some(r => r.includes(match))) score += 5;
        if (userAllergies.some(a => a.includes(match))) score += 5;
        if (userGoals.includes(match)) score += 3;
        if (currentPrefs.includes(match)) score += 4;
      }
      return { tip, score };
    });

    // Sort by relevance score descending
    scored.sort((a, b) => b.score - a.score);
    return scored.map(s => s.tip);
  };

  const [tips, setTips] = useState<ExpertTipItem[]>(getRelevantTips);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [appliedTipId, setAppliedTipId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [showAllDrawer, setShowAllDrawer] = useState(false);

  // Update tips pool when profile or preferences change
  useEffect(() => {
    const updated = getRelevantTips();
    setTips(updated);
    if (currentIndex >= updated.length) {
      setCurrentIndex(0);
    }
  }, [profile?.restrictions, profile?.allergies, profile?.goals, activePreferences]);

  // Periodic Auto-Rotation (every 8 seconds with progress bar)
  const ROTATION_INTERVAL_MS = 8000;
  const TICK_INTERVAL_MS = 100;

  useEffect(() => {
    if (isPaused || showAllDrawer || tips.length <= 1) return;

    const timer = setInterval(() => {
      setProgress(prev => {
        const next = prev + (TICK_INTERVAL_MS / ROTATION_INTERVAL_MS) * 100;
        if (next >= 100) {
          setCurrentIndex(current => (current + 1) % tips.length);
          return 0;
        }
        return next;
      });
    }, TICK_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [isPaused, showAllDrawer, tips.length, currentIndex]);

  const currentTip = tips[currentIndex] || tips[0];

  const handleNext = () => {
    playSfx('tap');
    vibrate(15);
    setProgress(0);
    setCurrentIndex(prev => (prev + 1) % tips.length);
  };

  const handlePrev = () => {
    playSfx('tap');
    vibrate(15);
    setProgress(0);
    setCurrentIndex(prev => (prev - 1 + tips.length) % tips.length);
  };

  const handleApplyTip = (tip: ExpertTipItem) => {
    playSfx('success');
    vibrate(25);
    setAppliedTipId(tip.id);

    if (onApplySuggestion && tip.suggestedAction) {
      onApplySuggestion({
        ingredient: tip.suggestedAction.ingredientText,
        preference: tip.suggestedAction.preferenceText
      });
    }

    setTimeout(() => {
      setAppliedTipId(null);
    }, 2500);
  };

  if (!currentTip) return null;

  return (
    <div 
      className={`relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-amber-500/5 dark:from-emerald-950/30 dark:via-slate-900/40 dark:to-teal-950/20 border border-emerald-500/25 dark:border-emerald-500/20 p-5 sm:p-6 shadow-sm transition-all duration-300 ${className}`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      id="section-expert-nutritionist-tips"
    >
      {/* Background soft ambient badge */}
      <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

      {/* Top Header Row */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
            <Lightbulb className="w-4 h-4 animate-pulse text-amber-300" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h4 className="font-serif font-bold text-sm sm:text-base text-slate-900 dark:text-white leading-none">
                Dicas de Especialista
              </h4>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[10px] font-extrabold uppercase tracking-wider">
                Nutri & Chef IA
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Sugestões rápidas e substituições baseadas no seu perfil alimentar
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5">
          {/* Pause / Play auto-cycle */}
          <button
            type="button"
            onClick={() => {
              playSfx('tap');
              setIsPaused(!isPaused);
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title={isPaused ? "Retomar rotação automática" : "Pausar rotação"}
          >
            {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
          </button>

          {/* Prev / Next buttons */}
          <button
            type="button"
            onClick={handlePrev}
            className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-white/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Dica anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="text-[10px] font-mono font-bold text-slate-400 dark:text-slate-500 px-1">
            {currentIndex + 1}/{tips.length}
          </span>

          <button
            type="button"
            onClick={handleNext}
            className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-white/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Próxima dica"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* View all toggle */}
          <button
            type="button"
            onClick={() => {
              playSfx('pop');
              setShowAllDrawer(!showAllDrawer);
            }}
            className="ml-1 px-2.5 py-1 rounded-xl bg-white/70 dark:bg-slate-800/70 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-[11px] font-bold text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700 hover:border-emerald-500/40 transition-all cursor-pointer shadow-xs"
          >
            {showAllDrawer ? 'Ver Menos' : 'Ver Todas'}
          </button>
        </div>
      </div>

      {/* Main Single Tip Card with Animated Transition */}
      {!showAllDrawer ? (
        <AnimatePresence mode="wait">
          <motion.div
            key={currentTip.id}
            initial={{ opacity: 0, y: 8, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.99 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="bg-white/90 dark:bg-slate-900/90 rounded-2xl p-4 sm:p-5 border border-white/60 dark:border-slate-800 shadow-sm backdrop-blur-md space-y-3.5"
          >
            {/* Tag and Category Pill */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xl" role="img" aria-label={currentTip.tag}>
                  {currentTip.icon}
                </span>
                <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 text-xs font-bold border border-emerald-500/20">
                  {currentTip.tag}
                </span>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  {currentTip.category}
                </span>
              </div>

              {/* Voice button */}
              <VoicePlayButton
                text={`${currentTip.title}. ${currentTip.message}`}
                size="sm"
                title="Ouvir dica com a voz da Malu"
              />
            </div>

            {/* Tip Title & Message */}
            <div className="space-y-1">
              <h5 className="font-serif font-bold text-sm sm:text-base text-slate-900 dark:text-slate-100">
                {currentTip.title}
              </h5>
              <p className="font-sans text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {currentTip.message}
              </p>
            </div>

            {/* Footer with Quick Action to Apply */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <span className="text-[11px] text-slate-400 dark:text-slate-500 italic">
                {profile?.restrictions && profile.restrictions.length > 0 
                  ? `💡 Alinhado às suas preferências: ${profile.restrictions.join(', ')}`
                  : '💡 Dica funcional para potencializar o valor nutricional'}
              </span>

              {currentTip.suggestedAction && (
                <button
                  type="button"
                  onClick={() => handleApplyTip(currentTip)}
                  className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95 ${
                    appliedTipId === currentTip.id
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-600 text-emerald-700 dark:text-emerald-300 hover:text-white border border-emerald-500/30'
                  }`}
                  id={`btn-apply-expert-tip-${currentTip.id}`}
                >
                  {appliedTipId === currentTip.id ? (
                    <>
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                      <span>Aplicado na Receita!</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      <span>{currentTip.suggestedAction.label}</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      ) : (
        /* Expanded Grid of All Tailored Tips */
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3 }}
          className="grid sm:grid-cols-2 gap-3.5 pt-1"
        >
          {tips.map((t) => {
            const isSelected = currentTip.id === t.id;
            return (
              <div
                key={t.id}
                className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                  isSelected
                    ? 'bg-emerald-500/10 dark:bg-emerald-950/40 border-emerald-500 shadow-xs'
                    : 'bg-white/80 dark:bg-slate-900/80 border-slate-200/80 dark:border-slate-800 hover:border-emerald-500/40'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{t.icon}</span>
                      <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold">
                        {t.tag}
                      </span>
                    </div>
                    <VoicePlayButton text={`${t.title}. ${t.message}`} size="sm" />
                  </div>

                  <h6 className="font-serif font-bold text-xs sm:text-sm text-slate-900 dark:text-white leading-snug">
                    {t.title}
                  </h6>
                  <p className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-sans">
                    {t.message}
                  </p>
                </div>

                {t.suggestedAction && (
                  <button
                    type="button"
                    onClick={() => handleApplyTip(t)}
                    className={`w-full py-1.5 px-3 rounded-xl text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 ${
                      appliedTipId === t.id
                        ? 'bg-emerald-600 text-white'
                        : 'bg-emerald-500/10 hover:bg-emerald-600 text-emerald-700 dark:text-emerald-300 hover:text-white border border-emerald-500/20'
                    }`}
                  >
                    {appliedTipId === t.id ? (
                      <>
                        <Check className="w-3 h-3 stroke-[3]" />
                        <span>Aplicado!</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-3 h-3" />
                        <span>{t.suggestedAction.label}</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            );
          })}
        </motion.div>
      )}

      {/* Auto-Rotation Progress Bar */}
      {!showAllDrawer && tips.length > 1 && (
        <div className="mt-3 flex items-center gap-3">
          <div className="flex-1 bg-emerald-500/10 dark:bg-slate-800 h-1 rounded-full overflow-hidden">
            <div
              className="bg-emerald-500 h-full transition-all duration-100 ease-linear rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Dots Indicator */}
          <div className="flex items-center gap-1">
            {tips.slice(0, 8).map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  playSfx('tap');
                  setProgress(0);
                  setCurrentIndex(idx);
                }}
                className={`w-1.5 h-1.5 rounded-full transition-all cursor-pointer ${
                  currentIndex === idx
                    ? 'w-4 bg-emerald-600 dark:bg-emerald-400'
                    : 'bg-slate-300 dark:bg-slate-700 hover:bg-emerald-400'
                }`}
                title={`Ir para dica ${idx + 1}`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
