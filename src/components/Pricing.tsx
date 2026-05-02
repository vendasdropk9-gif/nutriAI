import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, Star, Zap, Crown, ShieldCheck, ArrowRight, Volume2, Info, Sparkles, TrendingUp } from 'lucide-react';
import { speak } from '../lib/speech';

const PLANS = [
  {
    id: 'premium',
    name: 'Plano Premium',
    description: 'Transformação guiada por IA',
    price: { monthly: 29.90, annual: 197 },
    icon: Zap,
    color: 'emerald',
    badge: 'Melhor Custo-Benefício',
    features: [
      'Plano alimentar com IA',
      'Avatar 3D com evolução do corpo',
      'Treinos personalizados',
      'Análise de alimentos por foto',
      'Lista de compras automática',
      'Integração com sacolões',
      'Sem anúncios'
    ],
    cta: 'Começar 7 dias grátis',
    popular: true,
    trial: 'Teste grátis por 7 dias • Cancele quando quiser',
    tip: 'Você pode testar tudo por 7 dias sem pagar nada 💚'
  },
  {
    id: 'pro',
    name: 'Plano PRO',
    description: 'A experiência máxima NutriAI',
    price: { monthly: 49.90, annual: 297 },
    icon: Crown,
    color: 'amber',
    badge: 'Mais Completo',
    features: [
      'Tudo do Plano Premium',
      'Ajustes em tempo real',
      'Avatar 3D Pro (detalhado)',
      'Suporte VIP prioritário',
      'Receitas Gourmet exclusivas',
      'Análise de Bioimpedância Virtual',
      'Acesso antecipado a funções'
    ],
    cta: 'Começar 7 dias grátis',
    popular: false,
    trial: 'Teste grátis por 7 dias • Cancele quando quiser',
    tip: 'Esse plano é o mais escolhido por quem quer resultado rápido.'
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
        <div className="flex flex-col">
          <div className="flex items-baseline gap-1">
            <span className="text-sm font-medium text-slate-500">R$</span>
            <span className="text-4xl font-black">{monthlyEquivalent}</span>
            <span className="text-sm font-medium text-slate-500">/mês</span>
          </div>
          <span className="text-xs text-emerald-500 font-bold mt-1">Faturado R$ {p} anualmente</span>
        </div>
      );
    }

    return (
      <div className="flex items-baseline gap-1">
        <span className="text-sm font-medium text-slate-500">R$</span>
        <span className="text-4xl font-black">{p.toFixed(2)}</span>
        <span className="text-sm font-medium text-slate-500">/mês</span>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 space-y-16 animate-in fade-in slide-in-from-bottom-4 duration-1000">
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
      <div className="grid md:grid-cols-2 gap-10 max-w-5xl mx-auto items-stretch">
        {PLANS.map((plan, i) => (
          <motion.div
            key={plan.id}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.2 }}
            className={`relative group flex flex-col rounded-[48px] p-10 border-2 transition-all duration-700 ${
              plan.id === 'pro'
              ? 'bg-gradient-to-b from-amber-50 to-white dark:from-amber-950/20 dark:to-slate-950 border-amber-400/50 shadow-2xl shadow-amber-500/10 scale-105'
              : 'bg-white dark:bg-slate-950 border-emerald-500 shadow-2xl shadow-emerald-500/10'
            }`}
          >
            {/* Badges */}
            <div className="absolute -top-5 left-1/2 -translate-x-1/2 flex gap-2">
              <div className={`px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg ${
                plan.id === 'pro' ? 'bg-amber-500 text-white' : 'bg-emerald-600 text-white'
              }`}>
                {plan.badge}
              </div>
              {billingCycle === 'annual' && (
                <div className="bg-slate-900 text-white px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg">
                  Mais Vantajoso
                </div>
              )}
            </div>

            <div className="flex items-start justify-between mb-10">
              <div className={`w-16 h-16 rounded-[24px] flex items-center justify-center ${
                plan.color === 'emerald' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
              }`}>
                <plan.icon className="w-8 h-8" />
              </div>
              <button 
                onClick={() => handleSpeak(plan.tip)}
                disabled={isPlaying}
                className={`group/btn w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                  isPlaying ? 'bg-emerald-500 text-white animate-pulse' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:bg-emerald-500 hover:text-white'
                }`}
              >
                <Volume2 className="w-6 h-6 transition-transform group-hover/btn:scale-110" />
              </button>
            </div>

            <div className="space-y-3 mb-10">
              <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{plan.name}</h3>
              <p className="text-base text-slate-500 dark:text-slate-400 font-medium">{plan.description}</p>
            </div>

            <div className="mb-12">
              {getPriceDisplay(plan)}
              <div className="mt-4 px-4 py-2 bg-slate-50 dark:bg-slate-900/50 rounded-2xl text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-2 w-max">
                 <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                 {plan.trial}
              </div>
            </div>

            <div className="flex-1 space-y-5 mb-12">
              {plan.features.map((feature, j) => (
                <div key={j} className="flex items-start gap-4">
                  <div className={`mt-1 flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${
                    plan.color === 'emerald' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'
                  }`}>
                    <Check className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-sm font-semibold text-slate-600 dark:text-slate-300 leading-tight">{feature}</span>
                </div>
              ))}
            </div>

            <div className="space-y-4">
              <button className={`w-full py-6 rounded-3xl font-black text-xs uppercase tracking-[3px] shadow-2xl transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3 ${
                plan.id === 'pro'
                ? 'bg-amber-500 text-white shadow-amber-500/30 hover:bg-amber-600'
                : 'bg-emerald-600 text-white shadow-emerald-600/30 hover:bg-emerald-700'
              }`}>
                {plan.cta}
                <ArrowRight className="w-5 h-5" />
              </button>
              
              <button className="w-full py-4 rounded-2xl font-bold text-[10px] uppercase tracking-widest text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors flex items-center justify-center gap-2">
                Ver detalhes do plano
                <Info className="w-3.5 h-3.5" />
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
