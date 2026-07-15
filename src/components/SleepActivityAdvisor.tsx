import React, { useState, useEffect } from 'react';
import { Moon, Activity, Clock, Bell, Check, Plus, Trash2, Smartphone, Coffee, Dumbbell, Utensils } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLocalStorage } from '../hooks/useLocalStorage';

type ActivityType = 'workout' | 'screen' | 'caffeine' | 'meal';

interface ActivityRecord {
  id: string;
  type: ActivityType;
  time: string;
  label: string;
}

const ACTIVITY_META: Record<ActivityType, { icon: any; color: string; delayMinutes: number }> = {
  workout: { icon: Dumbbell, color: 'text-orange-500 bg-orange-100 dark:bg-orange-900/40', delayMinutes: 90 },
  screen: { icon: Smartphone, color: 'text-blue-500 bg-blue-100 dark:bg-blue-900/40', delayMinutes: 60 },
  caffeine: { icon: Coffee, color: 'text-amber-700 bg-amber-100 dark:bg-amber-900/40', delayMinutes: 240 },
  meal: { icon: Utensils, color: 'text-emerald-500 bg-emerald-100 dark:bg-emerald-900/40', delayMinutes: 120 },
};

export function SleepActivityAdvisor() {
  const [activities, setActivities] = useLocalStorage<ActivityRecord[]>('wellness_daily_activities', []);
  const [baseSleepTime, setBaseSleepTime] = useLocalStorage('base_sleep_time', '22:30');
  
  const [isAdding, setIsAdding] = useState(false);
  const [newType, setNewType] = useState<ActivityType>('screen');
  const [newTime, setNewTime] = useState('20:00');
  const [newLabel, setNewLabel] = useState('');

  const [suggestedSleepTime, setSuggestedSleepTime] = useState(baseSleepTime);
  const [notifEnabled, setNotifEnabled] = useState(false);
  const [delayReason, setDelayReason] = useState<string | null>(null);

  useEffect(() => {
    calculateIdealSleepTime();
  }, [activities, baseSleepTime]);

  const calculateIdealSleepTime = () => {
    if (activities.length === 0) {
      setSuggestedSleepTime(baseSleepTime);
      setDelayReason(null);
      return;
    }

    const [baseHours, baseMins] = baseSleepTime.split(':').map(Number);
    let baseDate = new Date();
    baseDate.setHours(baseHours, baseMins, 0, 0);

    let maxDelayMins = 0;
    let primaryReason = '';

    activities.forEach(act => {
      const meta = ACTIVITY_META[act.type];
      const [actHours, actMins] = act.time.split(':').map(Number);
      
      let actDate = new Date();
      actDate.setHours(actHours, actMins, 0, 0);

      // Se a atividade foi feita perto da hora de dormir (ex: após as 16h)
      if (actHours > 16) {
        const minSleepDate = new Date(actDate.getTime() + meta.delayMinutes * 60000);
        
        if (minSleepDate > baseDate) {
          const delay = (minSleepDate.getTime() - baseDate.getTime()) / 60000;
          if (delay > maxDelayMins) {
            maxDelayMins = delay;
            primaryReason = `Devido à atividade "${act.label || act.type}" às ${act.time}, sugerimos atrasar o sono para metabolizar/relaxar.`;
          }
        }
      }
    });

    if (maxDelayMins > 0) {
      const suggestedDate = new Date(baseDate.getTime() + maxDelayMins * 60000);
      const h = suggestedDate.getHours().toString().padStart(2, '0');
      const m = suggestedDate.getMinutes().toString().padStart(2, '0');
      setSuggestedSleepTime(`${h}:${m}`);
      setDelayReason(primaryReason);
    } else {
      setSuggestedSleepTime(baseSleepTime);
      setDelayReason(null);
    }
  };

  const handleAddActivity = () => {
    if (!newTime) return;
    const newAct: ActivityRecord = {
      id: Math.random().toString(36).substring(7),
      type: newType,
      time: newTime,
      label: newLabel || (newType === 'workout' ? 'Treino' : newType === 'screen' ? 'Telas/Trabalho' : newType === 'caffeine' ? 'Cafeína' : 'Jantar Pesado')
    };
    setActivities([...activities, newAct].sort((a, b) => a.time.localeCompare(b.time)));
    setIsAdding(false);
    setNewLabel('');
  };

  const removeActivity = (id: string) => {
    setActivities(activities.filter(a => a.id !== id));
  };

  const toggleNotification = async () => {
    if (!notifEnabled) {
      if ('Notification' in window) {
        const p = await Notification.requestPermission();
        if (p === 'granted') {
          setNotifEnabled(true);
          new Notification('Consultor de Sono Ativado 🌙', {
            body: `Baseado no seu histórico de hoje, te lembraremos de dormir às ${suggestedSleepTime}.`,
          });
        } else {
          alert('Permissão de notificação negada.');
        }
      }
    } else {
      setNotifEnabled(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-[32px] p-6 md:p-8 shadow-sm border border-slate-200 dark:border-slate-800 mb-10 overflow-hidden relative">
      {/* Background decoration */}
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 rounded-full text-[10px] font-bold uppercase tracking-wider mb-3">
              <Activity className="w-3.5 h-3.5" />
              IA de Hábitos
            </div>
            <h3 className="text-2xl font-serif font-black text-slate-800 dark:text-slate-100">
              Consultor de Sono Dinâmico
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-xl">
              Registre suas atividades do fim do dia. Calcularemos o horário ideal para dormir com base na fisiologia (ex: meia-vida da cafeína, cortisol pós-treino).
            </p>
          </div>
          
          <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col items-center min-w-[140px]">
            <span className="text-[10px] uppercase font-bold text-slate-500">Horário Base</span>
            <input 
              type="time" 
              value={baseSleepTime}
              onChange={(e) => setBaseSleepTime(e.target.value)}
              className="bg-transparent border-none text-xl font-black text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-0 text-center cursor-pointer"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Timeline / Activities */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-400" />
                Histórico de Hoje
              </h4>
              <button 
                onClick={() => setIsAdding(!isAdding)}
                className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 border-none cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Adicionar
              </button>
            </div>

            <AnimatePresence>
              {isAdding && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden mb-4"
                >
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Tipo</label>
                        <select 
                          value={newType}
                          onChange={(e) => setNewType(e.target.value as ActivityType)}
                          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-sm text-slate-700 dark:text-slate-300"
                        >
                          <option value="screen">Telas / Trabalho</option>
                          <option value="workout">Treino Intenso</option>
                          <option value="caffeine">Cafeína / Pré-treino</option>
                          <option value="meal">Refeição Pesada</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Horário</label>
                        <input 
                          type="time" 
                          value={newTime}
                          onChange={(e) => setNewTime(e.target.value)}
                          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-sm text-slate-700 dark:text-slate-300"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Descrição (Opcional)</label>
                      <input 
                        type="text" 
                        placeholder="Ex: Café Expresso, Treino de Pernas..."
                        value={newLabel}
                        onChange={(e) => setNewLabel(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-sm text-slate-700 dark:text-slate-300"
                      />
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                      <button 
                        onClick={() => setIsAdding(false)}
                        className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors border-none bg-transparent cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button 
                        onClick={handleAddActivity}
                        className="px-4 py-1.5 text-xs font-bold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors border-none shadow-sm cursor-pointer"
                      >
                        Salvar
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {activities.length === 0 ? (
              <div className="py-8 text-center bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                <p className="text-sm text-slate-400 font-medium">Nenhuma atividade registrada hoje.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activities.map(act => {
                  const meta = ACTIVITY_META[act.type];
                  const Icon = meta.icon;
                  return (
                    <motion.div 
                      key={act.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center justify-between p-3 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-100 dark:border-slate-700/50 shadow-sm"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${meta.color}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{act.label}</p>
                          <p className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded inline-block mt-0.5">
                            {act.time}
                          </p>
                        </div>
                      </div>
                      <button 
                        onClick={() => removeActivity(act.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-md transition-colors border-none bg-transparent cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>

          {/* AI Suggestion & Notifications */}
          <div className="flex flex-col h-full">
            <div className="flex-1 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 rounded-3xl p-6 border border-indigo-100 dark:border-indigo-900/50 flex flex-col justify-center relative overflow-hidden">
              
              <div className="text-center relative z-10 mb-6">
                <Moon className="w-10 h-10 text-indigo-500 mx-auto mb-3" />
                <h5 className="text-xs font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400 mb-1">
                  Horário Ideal Sugerido
                </h5>
                <div className="text-5xl font-black font-serif text-slate-800 dark:text-slate-100 tracking-tight">
                  {suggestedSleepTime}
                </div>
                
                {delayReason ? (
                  <div className="mt-4 p-3 bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm rounded-xl border border-indigo-200 dark:border-indigo-800 text-xs text-indigo-800 dark:text-indigo-300 font-medium leading-relaxed">
                    {delayReason}
                  </div>
                ) : (
                  <p className="mt-4 text-xs text-slate-500 font-medium">
                    Sem interferências detectadas. Seu horário base está mantido.
                  </p>
                )}
              </div>

              <button
                onClick={toggleNotification}
                className={`w-full py-3.5 px-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all border-none cursor-pointer relative z-10 ${
                  notifEnabled 
                    ? 'bg-indigo-200 text-indigo-800 dark:bg-indigo-800/80 dark:text-indigo-200 shadow-inner' 
                    : 'bg-indigo-600 text-white shadow-lg hover:bg-indigo-700 hover:shadow-xl hover:-translate-y-0.5'
                }`}
              >
                {notifEnabled ? (
                  <><Check className="w-4 h-4" /> Alarme Inteligente Ativo</>
                ) : (
                  <><Bell className="w-4 h-4" /> Ativar Alarme Inteligente</>
                )}
              </button>
              {notifEnabled && (
                <p className="text-center text-[10px] text-indigo-600/70 dark:text-indigo-400/70 mt-2 font-medium">
                  Você será notificado 45 minutos antes das {suggestedSleepTime} para começar a relaxar.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
