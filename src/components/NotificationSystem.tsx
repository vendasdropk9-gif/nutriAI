import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, X, Trophy, Star, Flame } from 'lucide-react';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'achievement' | 'point' | 'streak' | 'info';
}

interface NotificationSystemProps {
  notifications: AppNotification[];
  onDismiss: (id: string) => void;
}

export function NotificationSystem({ notifications, onDismiss }: NotificationSystemProps) {
  useEffect(() => {
    if (notifications.length > 0) {
      // Optional subtle "pop" sound
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          if (ctx.state !== 'suspended') {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.setValueAtTime(800, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
            gain.gain.setValueAtTime(0, ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0.1, ctx.currentTime + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.4);
          } else {
            ctx.close().catch(() => {});
          }
        }
      } catch (e) {}
    }
  }, [notifications.length]);

  return (
    <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[60] w-full max-w-sm pointer-events-none flex flex-col gap-3">
      <AnimatePresence>
        {notifications.map((notif) => (
          <motion.div
            key={notif.id}
            initial={{ opacity: 0, y: -40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="pointer-events-auto bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-white/20 dark:border-slate-700/50 p-4 rounded-3xl shadow-2xl flex gap-4 items-start mx-4"
          >
            <div className={`p-3 rounded-2xl ${
              notif.type === 'achievement' ? 'bg-amber-100 text-amber-600' :
              notif.type === 'streak' ? 'bg-orange-100 text-orange-600' :
              notif.type === 'point' ? 'bg-emerald-100 text-emerald-600' :
              'bg-blue-100 text-blue-600'
            }`}>
              {notif.type === 'achievement' && <Trophy className="w-5 h-5" />}
              {notif.type === 'streak' && <Flame className="w-5 h-5" />}
              {notif.type === 'point' && <Star className="w-5 h-5" />}
              {notif.type === 'info' && <Bell className="w-5 h-5" />}
            </div>
            
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">{notif.title}</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{notif.message}</p>
            </div>

            <button 
              onClick={() => onDismiss(notif.id)}
              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-4 h-4 text-slate-400" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
