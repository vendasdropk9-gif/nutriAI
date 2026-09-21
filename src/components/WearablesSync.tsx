import React, { useState, useEffect } from 'react';
import { 
  Watch, Activity, Heart, Flame, Moon, RefreshCw, CheckCircle2, 
  Smartphone, Zap, ShieldCheck, AlertCircle, Sparkles, Sliders 
} from 'lucide-react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { playSfx, vibrate } from '../lib/sensory';

interface WearableDevice {
  id: string;
  name: string;
  brand: 'apple' | 'google' | 'fitbit' | 'garmin' | 'samsung';
  connected: boolean;
  lastSync: string;
  batteryLevel?: number;
  iconColor: string;
}

const INITIAL_DEVICES: WearableDevice[] = [
  { id: 'apple_health', name: 'Apple Health Kit (iPhone/Watch)', brand: 'apple', connected: true, lastSync: 'Há 5 minutos', batteryLevel: 88, iconColor: 'text-rose-500' },
  { id: 'google_fit', name: 'Google Fit / Health Connect', brand: 'google', connected: true, lastSync: 'Há 12 minutos', batteryLevel: 92, iconColor: 'text-sky-500' },
  { id: 'fitbit', name: 'Fitbit Sense / Charge', brand: 'fitbit', connected: false, lastSync: 'Nunca', iconColor: 'text-teal-500' },
  { id: 'garmin', name: 'Garmin Connect (Forerunner/Fenix)', brand: 'garmin', connected: false, lastSync: 'Nunca', iconColor: 'text-blue-600' },
  { id: 'samsung', name: 'Samsung Health (Galaxy Watch)', brand: 'samsung', connected: false, lastSync: 'Nunca', iconColor: 'text-indigo-500' }
];

export function WearablesSync() {
  const [devices, setDevices] = useLocalStorage<WearableDevice[]>('nutri-wearables-devices', INITIAL_DEVICES);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTimestamp, setLastSyncTimestamp] = useState<Date>(new Date());
  
  // Real-time telemetry metrics state
  const [stepCount, setStepCount] = useLocalStorage<number>('nutri-wearable-steps', 8420);
  const [activeKcal, setActiveKcal] = useLocalStorage<number>('nutri-wearable-kcal', 430);
  const [heartRate, setHeartRate] = useLocalStorage<number>('nutri-wearable-hr', 68);
  const [sleepHours, setSleepHours] = useLocalStorage<number>('nutri-wearable-sleep', 7.5);

  const toggleDevice = (id: string) => {
    playSfx('tap');
    vibrate(12);
    setDevices(devices.map(d => {
      if (d.id === id) {
        const nextConnected = !d.connected;
        return {
          ...d,
          connected: nextConnected,
          lastSync: nextConnected ? 'Sincronizado agora' : 'Desconectado'
        };
      }
      return d;
    }));
  };

  const handleSyncTelemetry = () => {
    setIsSyncing(true);
    playSfx('tap');
    vibrate(20);

    setTimeout(() => {
      // Simulate live incoming sensor updates
      const bonusSteps = Math.floor(Math.random() * 350) + 150;
      const bonusKcal = Math.floor(bonusSteps * 0.04);
      const newHr = 65 + Math.floor(Math.random() * 10);

      setStepCount(prev => prev + bonusSteps);
      setActiveKcal(prev => prev + bonusKcal);
      setHeartRate(newHr);
      setLastSyncTimestamp(new Date());

      setDevices(devices.map(d => d.connected ? { ...d, lastSync: 'Agora mesmo' } : d));

      setIsSyncing(false);
      playSfx('success');
      vibrate([20, 80, 20]);
    }, 1800);
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xl space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-700 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-sky-500/10 text-sky-600 dark:text-sky-400">
            <Watch className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <span>Sincronização com Wearables & Sensores</span>
              <span className="px-2.5 py-0.5 rounded-full bg-sky-500/15 text-sky-600 dark:text-sky-400 text-xs font-bold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
                Live Telemetry
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Conecte o Apple Watch, Galaxy Watch, Garmin, Google Fit e receba passos, batimentos e calorias automaticamente.
            </p>
          </div>
        </div>

        <button
          onClick={handleSyncTelemetry}
          disabled={isSyncing}
          className="px-5 py-2.5 rounded-full bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 active:scale-95 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-sky-500/25 transition-all cursor-pointer disabled:opacity-60"
        >
          <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
          <span>{isSyncing ? 'Sincronizando Dados...' : 'Sincronizar Telemetria'}</span>
        </button>
      </div>

      {/* Real-time Telemetry Dashboard Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-sky-50/80 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800/40 space-y-1">
          <div className="flex items-center justify-between text-sky-600 dark:text-sky-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Passos Diários</span>
            <Activity className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-slate-800 dark:text-slate-100">
            {stepCount.toLocaleString('pt-BR')}
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400">
            Meta: 10.000 passos ({Math.min(100, Math.round((stepCount / 10000) * 100))}%)
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-rose-50/80 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/40 space-y-1">
          <div className="flex items-center justify-between text-rose-600 dark:text-rose-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Gasto Ativo</span>
            <Flame className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-slate-800 dark:text-slate-100">
            {activeKcal} <span className="text-xs font-bold text-slate-400">kcal</span>
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400">
            Calculado via aceleração de pulso
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 space-y-1">
          <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Frequência Repouso</span>
            <Heart className="w-4 h-4 text-rose-500 animate-pulse" />
          </div>
          <div className="text-2xl font-black text-slate-800 dark:text-slate-100">
            {heartRate} <span className="text-xs font-bold text-slate-400">BPM</span>
          </div>
          <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
            Ritmo Cardíaco Ideal
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/40 space-y-1">
          <div className="flex items-center justify-between text-indigo-600 dark:text-indigo-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Sono Restaurador</span>
            <Moon className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-slate-800 dark:text-slate-100">
            {sleepHours} <span className="text-xs font-bold text-slate-400">Horas</span>
          </div>
          <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold">
            88% Eficiência REM
          </p>
        </div>
      </div>

      {/* Wearable Platforms Connection List */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          Plataformas & Dispositivos Configurados
        </h3>

        <div className="space-y-2.5">
          {devices.map(device => (
            <div
              key={device.id}
              className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl bg-white dark:bg-slate-800 shadow-sm ${device.iconColor}`}>
                  <Watch className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-slate-800 dark:text-slate-100">
                    {device.name}
                  </h4>
                  <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
                    <span>Última sincronização: {device.lastSync}</span>
                    {device.batteryLevel && (
                      <>
                        <span>•</span>
                        <span>Bateria: {device.batteryLevel}%</span>
                      </>
                    )}
                  </span>
                </div>
              </div>

              <button
                onClick={() => toggleDevice(device.id)}
                className={`px-4 py-2 rounded-full font-bold text-xs transition-all cursor-pointer ${
                  device.connected
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-300'
                }`}
              >
                {device.connected ? 'Conectado' : 'Conectar'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
