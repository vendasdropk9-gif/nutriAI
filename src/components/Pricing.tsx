import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, Star, Zap, Crown, ShieldCheck, ArrowRight, Volume2, Info, Sparkles, TrendingUp, Lock } from 'lucide-react';
import { speak } from '../lib/speech';

const PLANS = [
  {
    id: 'premium',
    name: 'NutriAI Premium',
    description: 'Transformação de saúde guiada por Inteligência Artificial',
    price: { monthly: 34.90, annual: 297 },
    icon: Zap,
    color: 'emerald',
    badge: 'Mais Recomendado',
    features: [
      'Plano alimentar personalizado com IA',
      'Avatar 3D com evolução e simulação corporal',
      'Análise de pratos e caloria por foto',
      'Coach Nutricional disponível 24/7',
      'Alertas inteligentes de hidratação e sono',
      'Lista de compras automática sincronizada',
      'Receitas exclusivas de chefs & fitoterapia'
    ],
    cta: 'Assinar NutriAI Premium',
    popular: true,
    trial: '7 dias de teste grátis • Cancele quando quiser',
    tip: 'O plano Premium é a escolha recomendada para quem busca resultados consistentes com acompanhamento em tempo real.'
  },
  {
    id: 'pro',
    name: 'NutriAI Elite PRO',
    description: 'A experiência definitiva para alta performance humana',
    price: { monthly: 59.90, annual: 497 },
    icon: Crown,
    color: 'gold',
    badge: 'Edição Exclusiva',
    features: [
      'Todas as funcionalidades do Plano Premium',
      'Ajustes de dieta dinâmicos em tempo real',
      'Projeção preditiva de resultados metabólicos',
      'Suporte VIP prioritário e nutricionista dedicado',
      'Receitas Gourmet exclusivas preparadas com IA',
      'Análise de Bioimpedância Virtual Pro'
    ],
    cta: 'Acessar Edição Elite PRO',
    popular: false,
    trial: '7 dias de teste grátis • Cancele a qualquer momento',
    tip: 'A edição Elite PRO combina o estado da arte em IA metabólica com atendimento VIP exclusivo.'
  }
];

export function Pricing() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');
  const [isPlaying, setIsPlaying] = useState(false);

  const handleSpeak = async (text: string) => {
    if (isPlaying) return;
    setIsPlaying(true);
    try {
      await speak(text, { onEnded: () => setIsPlaying(false) });
    } catch (e) {
      setIsPlaying(false);
    }
  };

  const getPriceDisplay = (plan: typeof PLANS[0]) => {
    const p = plan.price[billingCycle];
    
    if (billingCycle === 'annual') {
      const monthlyEquivalent = (p / 12).toFixed(2);
      return (
        <div className="flex flex-col items-center justify-center text-center w-full">
          <div className="flex items-baseline gap-1 justify-center">
            <span className="text-sm font-medium text-[#B5BDC9]">R$</span>
            <span className="text-4xl sm:text-5xl font-display font-black tracking-tight text-white">{monthlyEquivalent}</span>
            <span className="text-sm font-medium text-[#B5BDC9]">/mês</span>
          </div>
          <div className="mt-2 flex flex-col items-center justify-center gap-1 select-none">
            <span className="text-[10px] text-[#D8B14A] bg-[#D8B14A]/10 border border-[#D8B14A]/30 px-3 py-1 rounded-full font-bold uppercase tracking-widest">
              Economia de 60%
            </span>
            <span className="text-[11px] text-[#B5BDC9] font-medium mt-1">Faturado R$ {p}/ano</span>
          </div>
        </div>
      );
    }

    return (
      <div className="flex items-baseline gap-1 justify-center text-center w-full">
        <span className="text-sm font-medium text-[#B5BDC9]">R$</span>
        <span className="text-4xl sm:text-5xl font-display font-black tracking-tight text-white">{p.toFixed(2)}</span>
        <span className="text-sm font-medium text-[#B5BDC9]">/mês</span>
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto px-4 pt-8 pb-36 space-y-12 animate-in fade-in duration-700">
      
      {/* Header Banner - Dark Luxury Atmosphere */}
      <div className="relative rounded-[32px] p-8 sm:p-12 bg-gradient-to-br from-[#151B23] via-[#1A222C] to-[#0B0F14] border border-[#232C39] text-center space-y-6 overflow-hidden shadow-2xl">
        <div className="absolute -top-24 -right-24 w-80 h-80 bg-[#D8B14A]/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-[#16C784]/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative z-10 max-w-3xl mx-auto space-y-4">
          <motion.div
             initial={{ opacity: 0, scale: 0.9 }}
             animate={{ opacity: 1, scale: 1 }}
             className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#D8B14A]/15 border border-[#D8B14A]/30 rounded-full text-[#D8B14A] text-xs font-bold uppercase tracking-widest"
          >
            <Crown className="w-4 h-4 text-[#D8B14A]" />
            <span>Assinatura de Alta Performance</span>
          </motion.div>
          
          <h1 className="text-3xl sm:text-5xl font-display font-bold text-white tracking-tight leading-tight">
            Desbloqueie Todo o Poder da <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#16C784] via-[#34D399] to-[#D8B14A]">Inteligência Artificial</span>
          </h1>
          
          <p className="text-sm sm:text-base text-[#B5BDC9] max-w-xl mx-auto font-sans leading-relaxed">
            Experimente a tecnologia de nutrição e saúde mais exclusiva e personalizada. 
            Resultados visíveis com acompanhamento em tempo real.
          </p>

          {/* Billing Cycle Selector */}
          <div className="pt-4 flex justify-center">
            <div className="bg-[#0B0F14] p-1.5 rounded-full flex items-center border border-[#232C39]">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`px-6 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  billingCycle === 'monthly'
                    ? 'bg-[#151B23] text-white shadow-md border border-[#232C39]'
                    : 'text-[#B5BDC9] hover:text-white'
                }`}
              >
                Mensal
              </button>
              
              <button
                onClick={() => setBillingCycle('annual')}
                className={`relative px-6 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  billingCycle === 'annual'
                    ? 'bg-gradient-to-r from-[#D8B14A] to-[#B8860B] text-slate-950 font-extrabold shadow-lg'
                    : 'text-[#D8B14A] hover:text-white'
                }`}
              >
                Anual
                <span className="ml-1.5 text-[9px] bg-slate-950 text-[#D8B14A] px-2 py-0.5 rounded-full border border-[#D8B14A]/40">
                  -60%
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Pricing Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
        {PLANS.map((plan, i) => {
          const isGold = plan.color === 'gold';
          return (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.15 }}
              className={`rounded-[32px] p-8 flex flex-col justify-between relative overflow-hidden transition-all duration-500 ${
                isGold 
                  ? 'bg-gradient-to-b from-[#151B23] via-[#1A222C] to-[#0B0F14] border-2 border-[#D8B14A]/60 shadow-[0_16px_50px_rgba(216,177,74,0.15)]' 
                  : 'bg-[#151B23] border border-[#232C39] shadow-[0_16px_40px_rgba(0,0,0,0.4)]'
              }`}
            >
              {/* Top Accent Badge */}
              <div className="flex items-center justify-between mb-6">
                <span className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                  isGold 
                    ? 'bg-[#D8B14A]/20 text-[#D8B14A] border border-[#D8B14A]/40' 
                    : 'bg-[#16C784]/20 text-[#16C784] border border-[#16C784]/40'
                }`}>
                  {plan.badge}
                </span>

                <button 
                  onClick={() => handleSpeak(plan.tip)}
                  disabled={isPlaying}
                  className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[#B5BDC9] hover:text-white hover:bg-white/10 transition-colors"
                  title="Ouvir detalhes"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
              </div>

              {/* Plan Title & Info */}
              <div className="space-y-2 mb-6">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-2xl ${isGold ? 'bg-[#D8B14A]/10 text-[#D8B14A]' : 'bg-[#16C784]/10 text-[#16C784]'}`}>
                    <plan.icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-display font-bold text-white">{plan.name}</h3>
                    <p className="text-xs text-[#B5BDC9]">{plan.description}</p>
                  </div>
                </div>
              </div>

              {/* Price Box */}
              <div className="p-6 rounded-2xl bg-[#0B0F14] border border-[#232C39] mb-8 text-center">
                {getPriceDisplay(plan)}
                <div className="mt-3 text-[11px] text-[#16C784] font-semibold flex items-center justify-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{plan.trial}</span>
                </div>
              </div>

              {/* Features List */}
              <div className="space-y-3.5 mb-8 flex-1">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Incluso nesta assinatura:</div>
                {plan.features.map((feat, j) => (
                  <div key={j} className="flex items-start gap-3 text-sm text-slate-200">
                    <div className={`mt-0.5 p-1 rounded-full ${isGold ? 'bg-[#D8B14A]/20 text-[#D8B14A]' : 'bg-[#16C784]/20 text-[#16C784]'}`}>
                      <Check className="w-3.5 h-3.5" />
                    </div>
                    <span className="leading-snug">{feat}</span>
                  </div>
                ))}
              </div>

              {/* CTA Button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`w-full py-4 rounded-full font-display font-extrabold text-sm uppercase tracking-wider shadow-xl flex items-center justify-center gap-3 cursor-pointer transition-all ${
                  isGold
                    ? 'bg-gradient-to-r from-[#D8B14A] via-[#F3E5AB] to-[#B8860B] text-slate-950 shadow-[0_8px_30px_rgba(216,177,74,0.35)] hover:opacity-95'
                    : 'bg-gradient-to-r from-[#16C784] to-[#10B981] text-white shadow-[0_8px_30px_rgba(22,199,132,0.35)] hover:opacity-95'
                }`}
              >
                <span>{plan.cta}</span>
                <ArrowRight className="w-4 h-4" />
              </motion.button>
            </motion.div>
          );
        })}
      </div>

      {/* Trust & Guarantee Section */}
      <div className="pt-8 border-t border-[#232C39]">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
          <div className="p-5 rounded-2xl bg-[#151B23] border border-[#232C39] space-y-2">
            <ShieldCheck className="w-6 h-6 text-[#16C784] mx-auto" />
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Cancelamento Flexível</h4>
            <p className="text-xs text-[#B5BDC9]">Cancele com apenas um clique nas suas configurações sem multas.</p>
          </div>

          <div className="p-5 rounded-2xl bg-[#151B23] border border-[#232C39] space-y-2">
            <TrendingUp className="w-6 h-6 text-[#D8B14A] mx-auto" />
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Garantia de Evolução</h4>
            <p className="text-xs text-[#B5BDC9]">Resultados garantidos e respaldados por algoritmos metabólicos.</p>
          </div>

          <div className="p-5 rounded-2xl bg-[#151B23] border border-[#232C39] space-y-2">
            <Lock className="w-6 h-6 text-[#16C784] mx-auto" />
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Pagamento Criptografado</h4>
            <p className="text-xs text-[#B5BDC9]">Transação de alta segurança protegida por protocolos SSL.</p>
          </div>
        </div>
      </div>

    </div>
  );
}
