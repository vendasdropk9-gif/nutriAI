import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { UserProfile } from "../types";
import { Brain, CheckCircle2, ChevronRight, Activity, Clock, Heart, Sparkles, ChevronLeft, Zap } from 'lucide-react';

interface PersonalizationWizardProps {
  profile: UserProfile | null;
  onComplete: (data: Partial<UserProfile>) => void;
}

export function PersonalizationWizard({ profile, onComplete }: PersonalizationWizardProps) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    bodyType: profile?.bodyType || "",
    metabolism: profile?.metabolism || "",
    routine: profile?.routine || "",
    restrictions: profile?.restrictions?.join(", ") || "",
  });

  const updateForm = (key: string, value: string) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleNext = () => setStep(s => s + 1);
  const handleBack = () => setStep(s => s - 1);

  const handleFinish = () => {
    onComplete({
      bodyType: formData.bodyType as any,
      metabolism: formData.metabolism as any,
      routine: formData.routine,
      restrictions: formData.restrictions.split(",").map(s => s.trim()).filter(Boolean),
    });
    setStep(5);
  };

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-lg mb-8 text-center space-y-2">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-500 mb-4">
          <Brain className="w-8 h-8" />
        </div>
        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
          Seu plano personalizado
        </h1>
        <p className="text-slate-500 font-medium">A Inteligência Artificial precisa entender seu corpo</p>
      </div>

      <div className="w-full max-w-lg relative">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="bg-white dark:bg-slate-900 rounded-[32px] p-8 shadow-2xl border border-slate-100 dark:border-slate-800"
            >
              <div className="flex items-center gap-3 mb-6">
                 <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 rounded-xl">
                    <Activity className="w-5 h-5" />
                 </div>
                 <p className="text-lg font-bold text-slate-900 dark:text-white">Qual seu tipo de corpo?</p>
              </div>
              
              <div className="grid gap-3 mb-8">
                {['Ectomorfo', 'Mesomorfo', 'Endomorfo'].map((type) => (
                  <button
                    key={type}
                    onClick={() => { updateForm('bodyType', type); handleNext(); }}
                    className={`p-4 rounded-2xl border-2 text-left transition-all ${
                      formData.bodyType === type
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
                        : 'border-slate-100 dark:border-slate-800 hover:border-emerald-200 dark:hover:border-emerald-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    <div className="font-bold">{type}</div>
                    <div className="text-xs mt-1 opacity-70">
                      {type === 'Ectomorfo' && 'Magro, dificuldade em ganhar peso muscular.'}
                      {type === 'Mesomorfo' && 'Atlético, facilidade em ganhar massa e perder gordura.'}
                      {type === 'Endomorfo' && 'Estrutura mais larga, tendência a acumular gordura.'}
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="bg-white dark:bg-slate-900 rounded-[32px] p-8 shadow-2xl border border-slate-100 dark:border-slate-800"
            >
              <div className="flex items-center gap-3 mb-6">
                 <div className="p-2 bg-amber-50 dark:bg-amber-900/30 text-amber-600 rounded-xl">
                    <Zap className="w-5 h-5" />
                 </div>
                 <p className="text-lg font-bold text-slate-900 dark:text-white">Como é o seu metabolismo?</p>
              </div>
              
              <div className="grid gap-3 mb-8">
                {['Lento', 'Moderado', 'Acelerado'].map((type) => (
                  <button
                    key={type}
                    onClick={() => { updateForm('metabolism', type); handleNext(); }}
                    className={`p-4 rounded-2xl border-2 text-left transition-all ${
                      formData.metabolism === type
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
                        : 'border-slate-100 dark:border-slate-800 hover:border-emerald-200 dark:hover:border-emerald-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    <div className="font-bold">{type}</div>
                  </button>
                ))}
              </div>
              <button onClick={handleBack} className="text-slate-400 hover:text-slate-600 flex items-center gap-2 text-sm font-bold">
                 <ChevronLeft className="w-4 h-4" /> Voltar
              </button>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="bg-white dark:bg-slate-900 rounded-[32px] p-8 shadow-2xl border border-slate-100 dark:border-slate-800"
            >
              <div className="flex items-center gap-3 mb-6">
                 <div className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 rounded-xl">
                    <Clock className="w-5 h-5" />
                 </div>
                 <p className="text-lg font-bold text-slate-900 dark:text-white">Qual a sua rotina real?</p>
              </div>
              
              <div className="mb-8 space-y-4">
                <textarea 
                  value={formData.routine}
                  onChange={(e) => updateForm('routine', e.target.value)}
                  placeholder="Ex: Trabalho das 8h às 18h, treino musculação às 6h, almoço em 30 min." 
                  className="w-full p-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:border-emerald-500 outline-none transition-colors min-h-[120px] resize-none text-slate-700 dark:text-slate-200"
                />
                <button 
                  onClick={handleNext}
                  disabled={!formData.routine}
                  className="w-full py-4 rounded-2xl bg-emerald-600 text-white font-black uppercase tracking-widest disabled:opacity-50 transition-transform active:scale-95"
                >
                  Próximo
                </button>
              </div>
              <button onClick={handleBack} className="text-slate-400 hover:text-slate-600 flex items-center gap-2 text-sm font-bold">
                 <ChevronLeft className="w-4 h-4" /> Voltar
              </button>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="bg-white dark:bg-slate-900 rounded-[32px] p-8 shadow-2xl border border-slate-100 dark:border-slate-800"
            >
               <div className="flex items-center gap-3 mb-6">
                 <div className="p-2 bg-rose-50 dark:bg-rose-900/30 text-rose-600 rounded-xl">
                    <Heart className="w-5 h-5" />
                 </div>
                 <p className="text-lg font-bold text-slate-900 dark:text-white">Preferências e Restrições</p>
              </div>
              
              <div className="mb-8 space-y-4">
                <textarea 
                  value={formData.restrictions}
                  onChange={(e) => updateForm('restrictions', e.target.value)}
                  placeholder="Ex: Intolerante a lactose, não gosto de peixe, prefiro frango." 
                  className="w-full p-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:border-emerald-500 outline-none transition-colors min-h-[120px] resize-none text-slate-700 dark:text-slate-200"
                />
                <button 
                  onClick={handleFinish}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black uppercase tracking-widest shadow-xl shadow-emerald-500/20 transition-transform hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-5 h-5" />
                  Gerar Meu Plano
                </button>
              </div>
              <button onClick={handleBack} className="text-slate-400 hover:text-slate-600 flex items-center gap-2 text-sm font-bold">
                 <ChevronLeft className="w-4 h-4" /> Voltar
              </button>
            </motion.div>
          )}

          {step === 5 && (
            <motion.div
              key="step5"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-[40px] p-10 shadow-2xl text-white text-center space-y-6"
            >
              <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto backdrop-blur-md">
                <CheckCircle2 className="w-10 h-10 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-black mb-2">Plano criado com sucesso 💚</h2>
                <p className="text-emerald-50 font-medium leading-relaxed">
                  A Inteligência Artificial analisou seu biotipo e rotina. Seu plano exclusivo está pronto para uso e será ajustado em tempo real.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {step < 5 && (
            <div className="mt-8 flex justify-center gap-2">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className={`h-2 rounded-full transition-all duration-500 ${step >= i ? 'w-8 bg-emerald-500' : 'w-2 bg-slate-200 dark:bg-slate-800'}`} />
                ))}
            </div>
        )}
      </div>
    </div>
  );
}
