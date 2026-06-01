import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, Star, Zap, Crown, ShieldCheck, ArrowRight, Volume2, Info, Sparkles, TrendingUp } from 'lucide-react';
import { speak } from '../lib/speech';

const PLANS = [
  {
    id: 'premium',
    name: 'Plano Premium',
    description: 'A base para sua evolução',
    price: { monthly: 34.90, annual: 297 },
    icon: Zap,
    color: 'emerald',
    badge: 'Mais Escolhido',
    features: [
      'Plano alimentar com IA',
      'Avatar 3D com evolução corporal',
      'Treinos personalizados',
      'Análise de alimentos por foto',
      'Sugestão de sucos e receitas',
      'Lista de compras automática',
      'Integração com sacolões',
      'Sem anúncios'
    ],
    cta: 'Começar 7 dias grátis',
    popular: true,
    trial: 'Teste grátis por 7 dias • Cancele quando quiser',
    tip: 'Você pode testar tudo por 7 dias sem pagar nada. Esse plano é o mais escolhido por quem quer resultado.'
  },
  {
    id: 'pro',
    name: 'Plano PRO',
    description: 'A experiência elite NutriAI',
    price: { monthly: 59.90, annual: 497 },
    icon: Crown,
    color: 'amber',
    badge: 'Mais Completo',
    features: [
      'Tudo do Plano Premium',
      'Ajustes em tempo real com IA',
      'Projeção detalhada de resultados',
      'Acompanhamento avançado (3D Pro)',
      'Suporte VIP prioritário',
      'Receitas Gourmet exclusivas',
      'Análise de Bioimpedância Virtual'
    ],
    cta: 'Começar 7 dias grátis',
    popular: false,
    trial: 'Teste grátis por 7 dias • Cancele quando quiser',
    tip: 'O plano PRO é para quem busca o máximo de performance. Se não gostar, pode cancelar a qualquer momento.'
  }
];

export function Pricing() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');
  const [isPlaying, setIsPlaying] = useState(false);

  const handleSpeak = async (text: string) => {
    if (isPlaying) return;
    setIsPlaying(true);
    try {
      // Use speak utility instead of direct textToSpeech for better handling
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
            <span className="text-sm font-medium text-slate-500">R$</span>
            <span className="text-4xl sm:text-5xl font-black tracking-tighter text-slate-900 dark:text-white">{monthlyEquivalent}</span>
            <span className="text-sm font-medium text-slate-500">/mês</span>
          </div>
          <div className="mt-2 flex flex-col items-center justify-center gap-1.5 select-none text-center">
            <span className="text-[10px] sm:text-xs text-white bg-slate-950 px-2.5 py-1 rounded-md font-bold uppercase tracking-wider block w-max mx-auto">Economia Real</span>
            <span className="text-[11px] text-slate-400 font-medium tracking-tight block">Faturado R$ {p}/ano</span>
          </div>
        </div>
      );
    }

    return (
      <div className="flex items-baseline gap-1 justify-center text-center w-full">
        <span className="text-sm font-medium text-slate-500">R$</span>
        <span className="text-4xl sm:text-5xl font-black tracking-tighter text-slate-900 dark:text-white">{p.toFixed(2)}</span>
        <span className="text-sm font-medium text-slate-500">/mês</span>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 pt-12 pb-32 sm:pb-40 space-y-16 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      {/* Header */}
      <div className="text-center space-y-8 max-w-4xl mx-auto">
        <motion.div
           initial={{ opacity: 0, scale: 0.9 }}
           animate={{ opacity: 1, scale: 1 }}
           className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500/10 rounded-full border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-black uppercase tracking-[4px]"
        >
          <Crown className="w-4 h-4" />
          Acesso Exclusivo NutriAI
        </motion.div>
        
        <h1 className="text-5xl md:text-7xl font-black text-slate-900 dark:text-white leading-[1.1] tracking-tight">
          Sua melhor versão começa <span className="text-emerald-600 underline decoration-emerald-200 decoration-8 underline-offset-8">agora.</span>
        </h1>
        
        <p className="text-xl text-slate-500 dark:text-slate-400 font-medium max-w-2xl mx-auto">
          Resultados visíveis em semanas com a tecnologia de IA mais avançada do mundo. 
          Escolha o seu plano e teste grátis.
        </p>

        {/* Billing Toggle */}
        <div className="flex justify-center mt-12">
          <div className="bg-slate-100 dark:bg-slate-800 p-1.5 rounded-3xl flex items-center gap-1 border border-slate-200 dark:border-slate-700 shadow-inner">
            {[
              { id: 'monthly', label: 'Mensal' },
              { id: 'annual', label: 'Anual', badge: 'Economize até 60%' }
            ].map((cycle) => (
              <button
                key={cycle.id}
                onClick={() => setBillingCycle(cycle.id as any)}
                className={`relative px-8 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${
                  billingCycle === cycle.id 
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xl ring-1 ring-slate-200 dark:ring-slate-800' 
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                }`}
              >
                {cycle.label}
                {cycle.badge && (
                  <span className="absolute -top-4 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-[9px] px-2 py-1 rounded-full animate-bounce whitespace-nowrap">
                    {cycle.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 sm:gap-12 max-w-5xl mx-auto items-stretch px-4 select-none">
        {PLANS.map((plan, i) => (
          <motion.div
            key={plan.id}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.2 }}
            className={`box-border overflow-hidden flex flex-col items-center justify-center relative group rounded-[48px] p-6 sm:p-10 border-2 transition-all duration-700 w-full max-w-[340px] xs:max-w-[380px] sm:max-w-[420px] md:max-w-none mx-auto ${
              plan.id === 'pro'
              ? 'bg-gradient-to-b from-amber-50 to-white dark:from-amber-950/20 dark:to-slate-950 border-amber-400/50 shadow-2xl shadow-amber-500/10 md:scale-105'
              : 'bg-white dark:bg-slate-950 border-emerald-500 shadow-2xl shadow-emerald-500/10'
            }`}
          >
            {/* Badges */}
            <div className="absolute -top-5 left-1/2 -translate-x-1/2 flex flex-wrap justify-center gap-2 w-full max-w-xs px-2 z-10">
              <div className={`px-4 sm:px-6 py-2 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-widest shadow-lg whitespace-nowrap ${
                plan.id === 'pro' ? 'bg-amber-500 text-white' : 'bg-emerald-600 text-white'
              }`}>
                {plan.badge}
              </div>
              {billingCycle === 'annual' && (
                <div className="bg-slate-900 text-white px-4 sm:px-6 py-2 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-widest shadow-lg whitespace-nowrap">
                  Mais Vantajoso
                </div>
              )}
            </div>

            <button 
              onClick={() => handleSpeak(plan.tip)}
              disabled={isPlaying}
              className={`absolute top-6 right-6 group/btn w-12 h-12 rounded-2xl flex items-center justify-center transition-all z-10 ${
                isPlaying ? 'bg-emerald-500 text-white animate-pulse' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:bg-emerald-500 hover:text-white'
              }`}
            >
              <Volume2 className="w-6 h-6 transition-transform group-hover/btn:scale-110" />
            </button>

            <div className="flex flex-col items-center justify-center mb-8 w-full mt-4">
              <div className={`w-16 h-16 rounded-[24px] flex items-center justify-center ${
                plan.color === 'emerald' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
              }`}>
                <plan.icon className="w-8 h-8" />
              </div>
            </div>

            <div className="space-y-2 mb-8 text-center flex flex-col items-center w-full">
              <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{plan.name}</h3>
              <p className="text-base text-slate-500 dark:text-slate-400 font-medium">{plan.description}</p>
            </div>

            <div className="mb-8 w-full flex flex-col items-center justify-center text-center">
              {getPriceDisplay(plan)}
              <div className="mt-4 px-3 py-2 w-full max-w-[280px] xs:max-w-xs bg-slate-50 dark:bg-slate-900/50 rounded-2xl text-[10px] sm:text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1.5 mx-auto text-center">
                 <Sparkles className="w-3.5 h-3.5 animate-pulse flex-shrink-0" />
                 <span className="text-center leading-tight">{plan.trial}</span>
              </div>
            </div>

            <div className="flex-1 flex flex-col justify-center items-start w-full max-w-[240px] xs:max-w-[280px] sm:max-w-[320px] mx-auto space-y-4 sm:space-y-5 mb-8 px-1 sm:px-4">
              {plan.features.map((feature, j) => (
                <div key={j} className="flex items-start gap-3.5 text-left w-full">
                  <div className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${
                    plan.color === 'emerald' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'
                  }`}>
                    <Check className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 leading-tight flex-1">{feature}</span>
                </div>
              ))}
            </div>

            <div className="space-y-3 sm:space-y-4 w-full">
              <button className={`w-full py-4 sm:py-5 rounded-3xl font-black text-[11px] sm:text-xs uppercase tracking-[1.5px] sm:tracking-[3px] shadow-2xl transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 sm:gap-3 ${
                plan.id === 'pro'
                ? 'bg-amber-500 text-white shadow-amber-500/30 hover:bg-amber-600'
                : 'bg-emerald-600 text-white shadow-emerald-600/30 hover:bg-emerald-700'
              }`}>
                {plan.cta}
                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
              </button>
              
              <button className="w-full py-3 rounded-2xl font-bold text-[9px] sm:text-[10px] uppercase tracking-widest text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors flex items-center justify-center gap-2">
                Ver detalhes do plano
                <Info className="w-3.5 h-3.5 shrink-0" />
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Trust Badges */}
      <div className="pt-12 border-t border-slate-100 dark:border-slate-800">
        <div className="grid md:grid-cols-3 gap-12 text-center">
          {[
            { title: 'Cancelamento instantâneo', desc: 'Sem carência ou multas. Você manda.', icon: Zap },
            { title: 'Resultados Visíveis', desc: 'Milhares de usuários já transformaram seus corpos.', icon: TrendingUp },
            { title: 'Pagamento Seguro', desc: 'Processamento criptografado e 100% protegido.', icon: ShieldCheck }
          ].map((item, i) => (
            <div key={i} className="space-y-3">
              <div className="w-12 h-12 bg-white dark:bg-slate-900 rounded-2xl shadow-xl flex items-center justify-center mx-auto text-emerald-500 mb-4 border border-slate-100 dark:border-slate-800">
                <item.icon className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white">{item.title}</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Legal Note */}
      <p className="text-[10px] text-center text-slate-400 font-medium max-w-xl mx-auto leading-relaxed">
        Após os 7 dias grátis, a cobrança será realizada automaticamente conforme o plano escolhido. 
        Você pode cancelar através das configurações da sua conta a qualquer momento antes do fim do período de teste.
      </p>
    </div>
  );
}
