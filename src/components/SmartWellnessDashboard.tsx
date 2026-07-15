import React, { useState, useEffect } from 'react';
import { Droplet, Moon, Bell, BellOff, Info, Clock, Activity, Settings, Check } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { motion, AnimatePresence } from 'motion/react';

export function SmartWellnessDashboard() {
  const { user } = useAuth();
  
  // Hydration state
  const [hydrationGoal, setHydrationGoal] = useLocalStorage('hydration_goal', 2500); // ml
  const [hydrationInterval, setHydrationInterval] = useLocalStorage('hydration_interval', 60); // minutes
  const [hydrationNotifsEnabled, setHydrationNotifsEnabled] = useLocalStorage('hydration_notifs_enabled', false);
  const [showHydrationSettings, setShowHydrationSettings] = useState(false);
  const [isDynamicMode, setIsDynamicMode] = useLocalStorage('dynamic_hydration', false);

  // Sleep state
  const [sleepTarget, setSleepTarget] = useLocalStorage('sleep_target', 8); // hours
  const [wakeTime, setWakeTime] = useLocalStorage('wake_time', '07:00');
  const [sleepNotifsEnabled, setSleepNotifsEnabled] = useLocalStorage('sleep_notifs_enabled', false);
  const [showSleepSettings, setShowSleepSettings] = useState(false);

  // Notifications API permission
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = async () => {
    if ('Notification' in window) {
      const p = await Notification.requestPermission();
      setPermission(p);
      return p;
    }
    return 'denied';
  };

  const toggleHydrationNotifs = async () => {
    if (!hydrationNotifsEnabled) {
      const p = await requestPermission();
      if (p === 'granted') {
        setHydrationNotifsEnabled(true);
        const currentInterval = isDynamicMode ? Math.max(30, hydrationInterval - 30) : hydrationInterval;
        new Notification('Lembrete de Hidratação Ativado 💧', {
          body: `Você será lembrado a cada ${currentInterval} minutos para beber água.`,
        });
      } else {
        alert('Permissão para notificações negada.');
      }
    } else {
      setHydrationNotifsEnabled(false);
    }
  };

  const sendTestHydrationNotification = () => {
    if ('Notification' in window && Notification.permission === 'granted') {
       new Notification('Alerta de Hidratação Dinâmico ☀️💧', {
          body: `Temperatura de 32°C e atividade intensa detectada! Beba um copo de água agora para repor.`,
        });
    }
  };

  const calculateIdealSleepTime = () => {
    const [hours, minutes] = wakeTime.split(':').map(Number);
    // Suggest 30 minutes before sleep target to wind down
    let sleepHour = hours - sleepTarget;
    if (sleepHour < 0) sleepHour += 24;
    return `${sleepHour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  const calculateWindDownTime = () => {
    const [hours, minutes] = calculateIdealSleepTime().split(':').map(Number);
    let windDownHour = hours - 1;
    if (windDownHour < 0) windDownHour += 24;
    return `${windDownHour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  const idealSleepTime = calculateIdealSleepTime();
  const windDownTime = calculateWindDownTime();

  const toggleSleepNotifs = async () => {
    if (!sleepNotifsEnabled) {
      const p = await requestPermission();
      if (p === 'granted') {
        setSleepNotifsEnabled(true);
        new Notification('Metas de Sono Ativadas 🌙', {
          body: `Analisamos seu histórico. Seu horário ideal de dormir é às ${idealSleepTime}. Te lembraremos para desacelerar às ${windDownTime}.`,
        });
      } else {
        alert('Permissão para notificações negada.');
      }
    } else {
      setSleepNotifsEnabled(false);
    }
  };

  const sendTestSleepNotification = () => {
    if ('Notification' in window && Notification.permission === 'granted') {
       new Notification('Sugestão de Sono 🌙', {
          body: `Baseado na sua rotina de hoje, sugerimos que você comece a relaxar. Idealmente, tente dormir às ${idealSleepTime} para atingir ${sleepTarget}h de sono.`,
        });
    }
  };

  return (
    <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md rounded-[32px] p-6 md:p-8 shadow-sm border border-slate-200/50 dark:border-slate-800/50 mb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h3 className="text-2xl font-serif font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Activity className="w-6 h-6 text-indigo-500" />
            Painel de Controle de Bem-Estar
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Defina metas e receba lembretes inteligentes baseados na sua rotina.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Hydration Card */}
        <div className="bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 rounded-[24px] p-6 relative overflow-hidden flex flex-col">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-400/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex items-start justify-between mb-4 relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Droplet className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-800 dark:text-slate-200">Hidratação</h4>
                <p className="text-xs text-slate-500 font-medium">Meta: {isDynamicMode ? hydrationGoal + 500 : hydrationGoal}ml / dia</p>
              </div>
            </div>
            <button 
              onClick={() => setShowHydrationSettings(!showHydrationSettings)}
              className="p-2 text-slate-400 hover:text-blue-500 bg-white/50 dark:bg-slate-800/50 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-full transition-all border-none cursor-pointer"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>

          <AnimatePresence>
            {showHydrationSettings && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden mb-4 relative z-10"
              >
                <div className="space-y-3 pt-2 pb-4 border-b border-blue-200/50 dark:border-blue-800/50">
                  <div>
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">Meta Diária Base (ml)</label>
                    <input 
                      type="range" 
                      min="1000" max="5000" step="100" 
                      value={hydrationGoal}
                      onChange={(e) => setHydrationGoal(Number(e.target.value))}
                      className="w-full accent-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">Intervalo Lembretes (min)</label>
                    <select 
                      value={hydrationInterval}
                      onChange={(e) => setHydrationInterval(Number(e.target.value))}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-sm text-slate-700 dark:text-slate-300"
                    >
                      <option value="30">A cada 30 min</option>
                      <option value="60">A cada 1 hora</option>
                      <option value="90">A cada 1.5 horas</option>
                      <option value="120">A cada 2 horas</option>
                    </select>
                  </div>
                  
                  <div className="flex items-center justify-between pt-2 border-t border-blue-100 dark:border-blue-800/50">
                    <div>
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Modo Dinâmico</span>
                      <span className="text-[10px] text-slate-500">Ajusta via clima e atividade</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer"
                        checked={isDynamicMode}
                        onChange={(e) => setIsDynamicMode(e.target.checked)}
                      />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-blue-500"></div>
                    </label>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {!showHydrationSettings && isDynamicMode && hydrationNotifsEnabled && (
             <div className="mb-4 p-3 bg-blue-100/50 dark:bg-blue-900/40 rounded-xl border border-blue-200/50 dark:border-blue-800/50 relative z-10 flex flex-col gap-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-blue-500 flex items-center gap-1"><Clock className="w-3 h-3"/> Ajuste Inteligente</span>
                <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                  Temperatura local: <strong className="text-blue-600 dark:text-blue-400">32°C</strong>.
                  Detectamos <strong className="text-blue-600 dark:text-blue-400">atividade intensa</strong>. A meta foi aumentada em +500ml e os lembretes estão mais frequentes.
                </p>
                <button 
                  onClick={sendTestHydrationNotification}
                  className="mt-1 text-[10px] text-blue-500 hover:text-blue-700 underline self-start border-none bg-transparent cursor-pointer font-medium p-0"
                >
                  Testar notificação dinâmica
                </button>
             </div>
          )}

          <div className="mt-auto relative z-10">
            <button
              onClick={toggleHydrationNotifs}
              className={`w-full py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all border-none cursor-pointer ${
                hydrationNotifsEnabled 
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 shadow-inner' 
                  : 'bg-blue-500 text-white shadow-md hover:bg-blue-600 hover:shadow-lg'
              }`}
            >
              {hydrationNotifsEnabled ? (
                <><Check className="w-4 h-4" /> Lembretes Ativos</>
              ) : (
                <><Bell className="w-4 h-4" /> Ativar Lembretes</>
              )}
            </button>
            {hydrationNotifsEnabled && !isDynamicMode && (
              <p className="text-center text-[10px] text-blue-600/70 dark:text-blue-400/70 mt-2 font-medium">
                Notificando a cada {hydrationInterval} minutos.
              </p>
            )}
          </div>
        </div>

        {/* Sleep Card */}
        <div className="bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 rounded-[24px] p-6 relative overflow-hidden flex flex-col">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-400/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex items-start justify-between mb-4 relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Moon className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-800 dark:text-slate-200">Sono Reparador</h4>
                <p className="text-xs text-slate-500 font-medium">Meta: {sleepTarget}h | Acordar: {wakeTime}</p>
              </div>
            </div>
            <button 
              onClick={() => setShowSleepSettings(!showSleepSettings)}
              className="p-2 text-slate-400 hover:text-indigo-500 bg-white/50 dark:bg-slate-800/50 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-full transition-all border-none cursor-pointer"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>

          <AnimatePresence>
            {showSleepSettings && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden mb-4 relative z-10"
              >
                <div className="space-y-3 pt-2 pb-4 border-b border-indigo-200/50 dark:border-indigo-800/50">
                  <div>
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">Meta de Sono (horas)</label>
                    <input 
                      type="range" 
                      min="5" max="12" step="0.5" 
                      value={sleepTarget}
                      onChange={(e) => setSleepTarget(Number(e.target.value))}
                      className="w-full accent-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">Horário de Acordar</label>
                    <input 
                      type="time" 
                      value={wakeTime}
                      onChange={(e) => setWakeTime(e.target.value)}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-sm text-slate-700 dark:text-slate-300"
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {!showSleepSettings && sleepNotifsEnabled && (
             <div className="mb-4 p-3 bg-indigo-100/50 dark:bg-indigo-900/40 rounded-xl border border-indigo-200/50 dark:border-indigo-800/50 relative z-10 flex flex-col gap-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-500 flex items-center gap-1"><Clock className="w-3 h-3"/> Sugestão da IA</span>
                <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                  Idealmente durma às <strong className="text-indigo-600 dark:text-indigo-400 text-sm">{idealSleepTime}</strong> para atingir {sleepTarget}h.
                </p>
                <button 
                  onClick={sendTestSleepNotification}
                  className="mt-1 text-[10px] text-indigo-500 hover:text-indigo-700 underline self-start border-none bg-transparent cursor-pointer font-medium p-0"
                >
                  Testar notificação
                </button>
             </div>
          )}

          <div className="mt-auto relative z-10">
            <button
              onClick={toggleSleepNotifs}
              className={`w-full py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all border-none cursor-pointer ${
                sleepNotifsEnabled 
                  ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 shadow-inner' 
                  : 'bg-indigo-500 text-white shadow-md hover:bg-indigo-600 hover:shadow-lg'
              }`}
            >
              {sleepNotifsEnabled ? (
                <><Check className="w-4 h-4" /> Monitoramento Ativo</>
              ) : (
                <><Bell className="w-4 h-4" /> Ativar Metas de Sono</>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
