import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, BellRing, Sparkles, CheckCircle2, AlertCircle, Droplets, Utensils, X } from 'lucide-react';
import { UserProfile } from '../types';
import { playSfx, vibrate } from '../lib/sensory';
import { requestNotificationPermission, getNotificationPermission, syncSchedulesToServiceWorker } from '../lib/pushScheduler';
import { useLanguage } from '../contexts/LanguageContext';

interface PushNotificationManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile | null;
  onUpdateProfile?: (updater: (prev: UserProfile | null) => UserProfile | null) => void;
}

export function PushNotificationManagerModal({ isOpen, onClose, profile, onUpdateProfile }: PushNotificationManagerModalProps) {
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [mealReminders, setMealReminders] = useState(profile?.mealRemindersEnabled ?? true);
  const [challengeReminders, setChallengeReminders] = useState(profile?.challengeRemindersEnabled ?? true);

  useEffect(() => {
    setPermission(getNotificationPermission());
  }, [isOpen]);

  const handleRequestPermission = async () => {
    playSfx('tap');
    vibrate(15);
    const res = await requestNotificationPermission();
    setPermission(res);
    if (res === 'granted') {
      playSfx('success');
      if (profile && onUpdateProfile) {
        onUpdateProfile(prev => prev ? { ...prev, mealRemindersEnabled: true } : null);
      }
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        syncSchedulesToServiceWorker(profile);
      }
    }
  };

  const handleTestNotification = () => {
    playSfx('notification');
    vibrate([100, 50, 100]);
    if (permission === 'granted') {
      new Notification('NutriAI • Alerta de Refeição & Hidratação', {
        body: 'Sua refeição (Almoço) começa em 15 minutos! Lembre-se também de beber água.',
        icon: '/icon-192.png',
        tag: 'nutriai-test-push'
      });
    } else {
      alert('Permissão de notificação não concedida. Clique em "Ativar Notificações Push" primeiro.');
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          className="relative w-full max-w-lg bg-[#131920] rounded-[32px] border border-emerald-500/40 shadow-2xl p-6 sm:p-8 space-y-6 text-white"
        >
          <button
            onClick={() => {
              playSfx('tap');
              onClose();
            }}
            className="absolute top-5 right-5 z-20 p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-xs font-bold text-emerald-400">
              <BellRing className="w-3.5 h-3.5 animate-bounce" />
              <span>Service Worker • Push Scheduler</span>
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
              <span>Gerenciador de Notificações Push</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Configure alertas inteligentes em segundo plano para refeições próximas, lembretes de hidratação e metas diárias integradas ao Service Worker.
            </p>
          </div>

          {/* Permission Status Card */}
          <div className="bg-slate-900/80 p-4 sm:p-5 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Status da Permissão</span>
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${
                permission === 'granted'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : permission === 'denied'
                  ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              }`}>
                {permission === 'granted' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                {permission === 'granted' ? 'Permitido (Ativo)' : permission === 'denied' ? 'Bloqueado' : 'Pendente / Não Solicitado'}
              </span>
            </div>

            {permission !== 'granted' && (
              <button
                onClick={handleRequestPermission}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Bell className="w-4 h-4" />
                <span>Ativar Notificações Push</span>
              </button>
            )}

            {permission === 'granted' && (
              <button
                onClick={handleTestNotification}
                className="w-full py-3 bg-teal-600/20 hover:bg-teal-600/30 text-teal-300 border border-teal-500/40 font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4 text-teal-400" />
                <span>Testar Notificação Imediata</span>
              </button>
            )}
          </div>

          {/* Toggles */}
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400">
                  <Utensils className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Alertas de Refeições Próximas</h4>
                  <p className="text-[11px] text-slate-400">Avisos 15 min antes e no horário de cada refeição</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={mealReminders}
                onChange={(e) => {
                  setMealReminders(e.target.checked);
                  playSfx('tap');
                  if (profile && onUpdateProfile) {
                    onUpdateProfile(prev => prev ? { ...prev, mealRemindersEnabled: e.target.checked } : null);
                  }
                }}
                className="w-5 h-5 accent-emerald-500 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-500/20 text-blue-400">
                  <Droplets className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Lembretes de Hidratação Inteligentes</h4>
                  <p className="text-[11px] text-slate-400">Alertas baseados no clima e atividade física</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={challengeReminders}
                onChange={(e) => {
                  setChallengeReminders(e.target.checked);
                  playSfx('tap');
                  if (profile && onUpdateProfile) {
                    onUpdateProfile(prev => prev ? { ...prev, challengeRemindersEnabled: e.target.checked } : null);
                  }
                }}
                className="w-5 h-5 accent-emerald-500 cursor-pointer"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={() => {
                playSfx('success');
                onClose();
              }}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl shadow-lg transition-all cursor-pointer"
            >
              Concluir & Salvar
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
