import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi, RefreshCw, CheckCircle2, CloudUpload } from 'lucide-react';
import { getPendingOfflineMutations, flushOfflineMutations, PendingMutation } from '../lib/offlineSyncEngine';
import { playSfx, vibrate } from '../lib/sensory';

export function OfflineSyncBanner() {
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [pendingCount, setPendingCount] = useState<number>(() => getPendingOfflineMutations().length);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncedSuccessToast, setSyncedSuccessToast] = useState(false);

  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      playSfx('success');
      vibrate(20);

      const count = getPendingOfflineMutations().length;
      if (count > 0) {
        setIsSyncing(true);
        const flushed = await flushOfflineMutations();
        setIsSyncing(false);
        setPendingCount(0);
        setSyncedSuccessToast(true);
        setTimeout(() => setSyncedSuccessToast(false), 3500);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      playSfx('tap');
      vibrate(30);
    };

    const handleMutationsUpdated = (e: CustomEvent<PendingMutation[]>) => {
      setPendingCount(e.detail.length);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('nutri:offline-mutations-updated', handleMutationsUpdated as EventListener);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('nutri:offline-mutations-updated', handleMutationsUpdated as EventListener);
    };
  }, []);

  const handleManualFlush = async () => {
    if (!isOnline) return;
    setIsSyncing(true);
    playSfx('tap');
    const flushed = await flushOfflineMutations();
    setIsSyncing(false);
    setPendingCount(0);
    setSyncedSuccessToast(true);
    setTimeout(() => setSyncedSuccessToast(false), 3500);
  };

  if (isOnline && pendingCount === 0 && !syncedSuccessToast) {
    return null;
  }

  return (
    <div className="fixed bottom-20 left-4 right-4 sm:left-auto sm:right-6 sm:w-96 z-50 animate-fade-in">
      {!isOnline && (
        <div className="p-3.5 rounded-2xl bg-amber-500 text-white shadow-2xl border border-amber-400/40 flex items-center justify-between gap-3 text-xs font-bold backdrop-blur-md">
          <div className="flex items-center gap-2">
            <WifiOff className="w-5 h-5 shrink-0 animate-pulse" />
            <div>
              <p className="font-extrabold">Você está Offline</p>
              <p className="text-[10px] text-amber-100 font-normal">
                {pendingCount > 0 
                  ? `${pendingCount} alterações salvas localmente no app.` 
                  : 'Navegação em modo cache ativo.'}
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-black/20 text-[10px] font-bold">
            PWA Offline
          </span>
        </div>
      )}

      {isOnline && pendingCount > 0 && (
        <div className="p-3.5 rounded-2xl bg-indigo-600 text-white shadow-2xl border border-indigo-500/40 flex items-center justify-between gap-3 text-xs font-bold backdrop-blur-md">
          <div className="flex items-center gap-2">
            <CloudUpload className="w-5 h-5 shrink-0 animate-bounce" />
            <div>
              <p className="font-extrabold">Conexão Restabelecida!</p>
              <p className="text-[10px] text-indigo-200 font-normal">
                {pendingCount} alterações aguardando sincronização.
              </p>
            </div>
          </div>
          <button
            onClick={handleManualFlush}
            disabled={isSyncing}
            className="px-3 py-1.5 rounded-full bg-white text-indigo-700 hover:bg-indigo-50 font-extrabold text-[11px] shadow-sm cursor-pointer"
          >
            {isSyncing ? 'Sincronizando...' : 'Sincronizar'}
          </button>
        </div>
      )}

      {syncedSuccessToast && (
        <div className="p-3.5 rounded-2xl bg-emerald-600 text-white shadow-2xl border border-emerald-500/40 flex items-center gap-2 text-xs font-bold backdrop-blur-md">
          <CheckCircle2 className="w-5 h-5 text-emerald-200" />
          <span>Todas as alterações salvas offline foram sincronizadas com sucesso!</span>
        </div>
      )}
    </div>
  );
}
