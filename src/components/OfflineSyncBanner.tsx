import React, { useState, useEffect } from 'react';
import { WifiOff, RefreshCw, CheckCircle2, CloudUpload } from 'lucide-react';
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
        window.dispatchEvent(new CustomEvent('nutri:sync-progress', { detail: { syncing: true, count } }));
        await flushOfflineMutations();
        setIsSyncing(false);
        window.dispatchEvent(new CustomEvent('nutri:sync-progress', { detail: { syncing: false, count: 0 } }));
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
    window.dispatchEvent(new CustomEvent('nutri:sync-progress', { detail: { syncing: true, count: pendingCount } }));
    playSfx('tap');
    await flushOfflineMutations();
    setIsSyncing(false);
    window.dispatchEvent(new CustomEvent('nutri:sync-progress', { detail: { syncing: false, count: 0 } }));
    setPendingCount(0);
    setSyncedSuccessToast(true);
    setTimeout(() => setSyncedSuccessToast(false), 3500);
  };

  if (isOnline && pendingCount === 0 && !isSyncing && !syncedSuccessToast) {
    return null;
  }

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 sm:left-auto sm:right-6 sm:translate-x-0 z-50 animate-fade-in flex flex-col gap-2 max-w-md w-full px-4 sm:px-0">
      {isSyncing && (
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-2xl border border-indigo-400/40 flex items-center justify-between gap-3 text-xs font-bold backdrop-blur-md">
          <div className="flex items-center gap-3">
            <RefreshCw className="w-5 h-5 shrink-0 animate-spin text-indigo-200" />
            <div>
              <p className="font-extrabold flex items-center gap-1.5">
                <span>Sincronização em Progresso</span>
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              </p>
              <p className="text-[10px] text-indigo-100 font-normal">
                Enviando dados do IndexedDB para o Firebase...
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-black/30 text-[10px] font-mono tracking-wider">
            SYNC...
          </span>
        </div>
      )}

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

      {isOnline && pendingCount > 0 && !isSyncing && (
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
            Sincronizar
          </button>
        </div>
      )}

      {syncedSuccessToast && (
        <div className="p-3.5 rounded-2xl bg-emerald-600 text-white shadow-2xl border border-emerald-500/40 flex items-center gap-2 text-xs font-bold backdrop-blur-md">
          <CheckCircle2 className="w-5 h-5 text-emerald-200" />
          <span>Sincronização concluída com sucesso! Todos os dados enviados ao Firebase.</span>
        </div>
      )}
    </div>
  );
}
