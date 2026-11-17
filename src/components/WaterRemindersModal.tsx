import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Droplets, X, Clock, Sun, Sunrise, Sunset, Sparkles, Bell, CheckCircle2, ShieldCheck, Volume2 } from 'lucide-react';
import { UserProfile, WaterPushScheduleConfig, WaterPushScheduleSlot } from '../types';
import { WaterPushSchedulerPanel } from './WaterPushSchedulerPanel';
import { useSolarCircadianNotification } from '../hooks/useSolarCircadianNotification';
import { playSfx, vibrate } from '../lib/sensory';
import { speak } from '../lib/speech';
import { MALU_VOICE_ID } from '../lib/maluVoice';

interface WaterRemindersModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile | null;
  onUpdateConfig: (nextConfig: WaterPushScheduleConfig) => void;
  addNotification: (notif: { title: string; message: string; type: 'info' | 'success' | 'warning' | 'error' | 'point' }) => void;
  updateProfile: (updater: (prev: UserProfile | null) => UserProfile | null) => void;
}

export const WaterRemindersModal: React.FC<WaterRemindersModalProps> = ({
  isOpen,
  onClose,
  profile,
  onUpdateConfig,
  addNotification,
  updateProfile,
}) => {
  // Sincroniza com o ritmo circadiano do usuário ativamente na modal
  useSolarCircadianNotification(profile, addNotification, updateProfile);

  const [savedToast, setSavedToast] = useState(false);

  if (!isOpen) return null;

  const handleTestPush = (previewSlot?: WaterPushScheduleSlot) => {
    playSfx('success');
    vibrate([30, 40, 30]);
    const title = previewSlot?.title || '💧 Hora de Beber Água!';
    const message = previewSlot?.message || 'Mantenha-se hidratado(a)! Beba água agora para manter seu metabolismo em alta.';
    
    addNotification({
      title,
      message,
      type: 'info',
    });

    speak(`Teste de lembrete de água: ${title}. ${message}`, {
      voice: MALU_VOICE_ID,
      lang: 'pt-BR',
    });

    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 3000);
  };

  return (
    <AnimatePresence>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="water-reminders-modal-title"
        className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-sky-200 dark:border-slate-800 rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="relative px-6 py-5 bg-gradient-to-r from-sky-600 via-teal-600 to-emerald-600 text-white flex items-center justify-between shadow-md">
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />
            
            <div className="flex items-center gap-3 relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shadow-inner">
                <Droplets className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-bold uppercase tracking-wider border border-white/25 flex items-center gap-1">
                    <Sunrise className="w-3 h-3" /> Ritmo Circadiano & Água
                  </span>
                </div>
                <h3
                  id="water-reminders-modal-title"
                  className="text-lg sm:text-xl font-black font-display tracking-tight text-white mt-0.5"
                >
                  Gerenciar Lembretes de Água
                </h3>
              </div>
            </div>

            <button
              type="button"
              data-malu-voice-id={MALU_VOICE_ID}
              onClick={() => {
                playSfx('tap');
                onClose();
              }}
              className="p-2 rounded-xl bg-black/20 hover:bg-black/30 text-white transition-all cursor-pointer active:scale-95 relative z-10"
              title="Fechar modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body Content */}
          <div className="p-6 overflow-y-auto space-y-6 custom-scrollbar flex-1">
            {savedToast && (
              <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-2xl text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-2 animate-fadeIn">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>Notificação de teste disparada com sucesso com a voz da Malu!</span>
              </div>
            )}

            <div className="space-y-1">
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium">
                Personalize a frequência, horários de início e término dos alertas de hidratação. O sistema sincroniza automaticamente com o nascer e pôr do sol para otimizar sua absorção celular.
              </p>
            </div>

            {/* Embedded Scheduler Panel */}
            <WaterPushSchedulerPanel
              profile={profile}
              onUpdateConfig={(nextCfg) => {
                onUpdateConfig(nextCfg);
                setSavedToast(true);
                setTimeout(() => setSavedToast(false), 2500);
              }}
              onTestWaterPush={handleTestPush}
            />
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Sincronizado com o Service Worker em segundo plano</span>
            </div>

            <button
              type="button"
              data-malu-voice-id={MALU_VOICE_ID}
              onClick={() => {
                playSfx('success');
                vibrate(15);
                onClose();
              }}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-emerald-600 hover:from-sky-700 hover:to-emerald-700 text-white font-black text-xs sm:text-sm shadow-md shadow-sky-600/25 transition-all cursor-pointer active:scale-95 flex items-center gap-2"
            >
              <span>Concluir & Salvar</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default WaterRemindersModal;
