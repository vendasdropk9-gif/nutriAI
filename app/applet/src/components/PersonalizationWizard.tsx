import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { UserProfile } from "../types";
import { Brain, CheckCircle2, Activity, Clock, Heart, Sparkles, ChevronLeft, Zap, Utensils, MessageSquare } from 'lucide-react';

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
    <div className="w-full min-h-[75vh] flex flex-col items-center justify-center px-4 py-8 md:py-12 bg-slate-50 dark:bg-slate-950/50 rounded-3xl my-4">
      <div className="w-full max-w-lg mb-6 text-center flex flex-col items-center justify-center space-y-1.5">
        <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-sm mb-1">
          <Brain className="w-5 h-5" />
        </div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          Seu plano personalizado
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium max-w-xs mx-auto">
          A IA precisa entender seu corpo para calibrar sua nutrição 360.
        </p>
        <div className="flex items-center justify-center gap-2 mt-2">
          <button className="p-2 rounded-full bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 transition-all border border-amber-500/20 shadow-sm">
            <Utensils className="w-4 h-4" />
          </button>
          <button className="p-2 rounded-full bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 transition-all border border-emerald-500/20 shadow-sm">
            <MessageSquare className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="w-full max-w-lg relative">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="bg-white dark:bg-slate-900 rounded-[32px] p-6 sm:p-8 shadow-xl border border-slate-200 dark:border-slate-800"
            >
              <div className="flex flex-col items-center justify-center text-center gap-2 mb-6">
                <div className="p-2.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 rounded-2xl">
                  <Activity className="w-6 h-6" />
                </div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Qual seu tipo de corpo?</h2>
              </div>

              <div className="grid gap-3 mb-6">
                {['Ectomorfo', 'Mesomorfo', 'Endomorfo'].map((type) => (
                  <button
                    key={type}
                    onClick={() => { updateForm('bodyType', type); handleNext(); }}
                    className={`p-4 rounded-2xl border-2 text-center transition-all ${
                      formData.bodyType === type
                        ? 'border-emerald-500 bg-emerald-50/80 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 shadow-sm'
                        : 'border-slate-100 dark:border-slate-800 hover:border-emerald-200 dark:hover:border-emerald-800 text-slate-600 dark:text-slate-300 bg-slate-50/50 dark:bg-slate-900/50'
                    }`}
                  >
                    <div className="font-bold text-base">{type}</div>
                    <div className="text-xs mt-1 opacity-75 leading-relaxed">
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
              className="bg-white dark:bg-slate-900 rounded-[32px] p-6 sm:p-8 shadow-xl border border-slate-200 dark:border-slate-800"
            >
              <div className="flex flex-col items-center justify-center text-center gap-2 mb-6">
                <div className="p-2.5 bg-amber-50 dark:bg-amber-900/30 text-amber-600 rounded-2xl">
                  <Zap className="w-6 h-6" />
                </div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Como é o seu metabolismo?</h2>
              </div>

              <div className="grid gap-3 mb-6">
                {['Lento', 'Moderado', 'Acelerado'].map((type) => (
                  <button
                    key={type}
                    onClick={() => { updateForm('metabolism', type); handleNext(); }}
                    className={`p-4 rounded-2xl border-2 text-center transition-all ${
                      formData.metabolism === type
                        ? 'border-emerald-500 bg-emerald-50/80 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 shadow-sm'
                        : 'border-slate-100 dark:border-slate-800 hover:border-emerald-200 dark:hover:border-emerald-800 text-slate-600 dark:text-slate-300 bg-slate-50/50 dark:bg-slate-900/50'
                    }`}
                  >
                    <div className="font-bold text-base">{type}</div>
                  </button>
                ))}
              </div>

              <button onClick={handleBack} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center justify-center w-full gap-2 text-sm font-bold pt-2">
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
              className="bg-white dark:bg-slate-900 rounded-[32px] p-6 sm:p-8 shadow-xl border border-slate-200 dark:border-slate-800"
            >
              <div className="flex flex-col items-center justify-center text-center gap-2 mb-6">
                <div className="p-2.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 rounded-2xl">
                  <Clock className="w-6 h-6" />
                </div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Qual a sua rotina real?</h2>
              </div>

              <div className="space-y-4 mb-6">
                <textarea
                  value={formData.routine}
                  onChange={(e) => updateForm('routine', e.target.value)}
                  placeholder="Ex: Trabalho das 8h às 18h, treino musculação às 6h, almoço em 30 min."
                  className="w-full p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:border-emerald-500 outline-none transition-colors min-h-[120px] resize-none text-slate-700 dark:text-slate-200 text-sm"
                />
                <button
                  onClick={handleNext}
                  disabled={!formData.routine}
                  className="w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest disabled:opacity-50 transition-all shadow-lg shadow-emerald-600/20 active:scale-95 cursor-pointer"
                >
                  Próximo
                </button>
              </div>

              <button onClick={handleBack} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center justify-center w-full gap-2 text-sm font-bold pt-2">
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
              className="bg-white dark:bg-slate-900 rounded-[32px] p-6 sm:p-8 shadow-xl border border-slate-200 dark:border-slate-800"
            >
              <div className="flex flex-col items-center justify-center text-center gap-2 mb-6">
                <div className="p-2.5 bg-rose-50 dark:bg-rose-900/30 text-rose-600 rounded-2xl">
                  <Heart className="w-6 h-6" />
                </div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Preferências e Restrições</h2>
              </div>

              <div className="space-y-4 mb-6">
                <textarea
                  value={formData.restrictions}
                  onChange={(e) => updateForm('restrictions', e.target.value)}
                  placeholder="Ex: Intolerante a lactose, não gosto de peixe, prefiro frango."
                  className="w-full p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:border-emerald-500 outline-none transition-colors min-h-[120px] resize-none text-slate-700 dark:text-slate-200 text-sm"
                />
                <button
                  onClick={handleFinish}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black uppercase tracking-widest shadow-xl shadow-emerald-500/20 transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-5 h-5" />
                  Gerar Meu Plano
                </button>
              </div>

              <button onClick={handleBack} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center justify-center w-full gap-2 text-sm font-bold pt-2">
                <ChevronLeft className="w-4 h-4" /> Voltar
              </button>
            </motion.div>
          )}

          {step === 5 && (
            <motion.div
              key="step5"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-[32px] p-8 sm:p-10 shadow-2xl text-white text-center space-y-6"
            >
              <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto backdrop-blur-md shadow-inner">
                <CheckCircle2 className="w-10 h-10 text-white" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-black mb-2">Plano criado com sucesso 💚</h2>
                <p className="text-emerald-50 font-medium text-sm sm:text-base leading-relaxed">
                  A Inteligência Artificial analisou seu biotipo e rotina. Seu plano exclusivo está pronto para uso e será ajustado em tempo real.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {step < 5 && (
          <div className="mt-8 flex justify-center gap-2">
            {[1, 2, 3, 4].map(i => (
              <div
                key={i}
                className={`h-2 rounded-full transition-all duration-500 ${
                  step >= i ? 'w-8 bg-emerald-500' : 'w-2 bg-slate-200 dark:bg-slate-800'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
