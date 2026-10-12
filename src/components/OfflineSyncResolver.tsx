/* eslint-disable i18next/no-literal-string */
import React, { useState, useEffect } from 'react';
import { AlertTriangle, Cloud, HardDrive, Check, X, RefreshCw, Layers, ShieldAlert } from 'lucide-react';
import { playSfx, vibrate } from '../lib/sensory';

export interface SyncConflictItem {
  id: string;
  collection: string;
  docId: string;
  localData: any;
  serverData: any;
  localUpdatedAt: number;
  serverUpdatedAt: number;
}

export function OfflineSyncResolver() {
  const [conflicts, setConflicts] = useState<SyncConflictItem[]>([]);
  const [activeConflict, setActiveConflict] = useState<SyncConflictItem | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  useEffect(() => {
    // Listen for custom sync conflict events
    const handleSyncConflict = (e: CustomEvent<SyncConflictItem[]>) => {
      if (e.detail && Array.isArray(e.detail) && e.detail.length > 0) {
        setConflicts(e.detail);
        setActiveConflict(e.detail[0]);
        setIsOpen(true);
        playSfx('notification');
        vibrate([30, 50, 30]);
      }
    };

    window.addEventListener('nutri:sync-conflict', handleSyncConflict as EventListener);

    // Also support checking mock/test conflicts for demonstration when offline/online sync encounters divergence
    const demoConflictListener = () => {
      // Create a sample test conflict for demonstration if triggered
      const sampleConflict: SyncConflictItem = {
        id: 'conflict_demo_1',
        collection: 'mealPlanDrafts',
        docId: 'draft_week_01',
        localData: {
          title: 'Plano Nutricional Personalizado (Offline Local)',
          caloriesTarget: 2150,
          proteinGrams: 155,
          notes: 'Editado sem conexão (IndexedDB)',
        },
        serverData: {
          title: 'Plano Nutricional Atualizado (Firebase Cloud)',
          caloriesTarget: 2000,
          proteinGrams: 150,
          notes: 'Atualizado em outro dispositivo via nuvem',
        },
        localUpdatedAt: Date.now() - 1000 * 60 * 15,
        serverUpdatedAt: Date.now() - 1000 * 60 * 5,
      };
      setConflicts([sampleConflict]);
      setActiveConflict(sampleConflict);
      setIsOpen(true);
      playSfx('notification');
      vibrate([30, 50, 30]);
    };

    window.addEventListener('nutri:trigger-demo-conflict', demoConflictListener);

    return () => {
      window.removeEventListener('nutri:sync-conflict', handleSyncConflict as EventListener);
      window.removeEventListener('nutri:trigger-demo-conflict', demoConflictListener);
    };
  }, []);

  const handleResolve = async (strategy: 'local' | 'server' | 'merge') => {
    if (!activeConflict) return;
    setResolvingId(activeConflict.id);
    playSfx('tap');
    vibrate(20);

    // Simulate resolution delay
    await new Promise(r => setTimeout(r, 600));

    // Remove resolved conflict from state
    const remaining = conflicts.filter(c => c.id !== activeConflict.id);
    setConflicts(remaining);
    setResolvingId(null);
    playSfx('success');
    vibrate(20);

    if (remaining.length > 0) {
      setActiveConflict(remaining[0]);
    } else {
      setIsOpen(false);
      setActiveConflict(null);
    }

    window.dispatchEvent(new CustomEvent('nutri:sync-conflict-resolved', {
      detail: { conflictId: activeConflict.id, strategy }
    }));
  };

  if (!isOpen || !activeConflict) {
    return (
      <div className="fixed bottom-6 left-6 z-40">
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('nutri:trigger-demo-conflict'))}
          className="px-3 py-2 rounded-xl bg-amber-500/90 hover:bg-amber-600 text-white shadow-lg backdrop-blur-md text-xs font-extrabold flex items-center gap-2 transition-transform active:scale-95 cursor-pointer border border-amber-300/40"
          title="Verificar ou Simular Conflitos de Sincronização"
        >
          <ShieldAlert className="w-4 h-4 animate-pulse" />
          <span>Resolver Conflitos (Offline)</span>
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-2xl w-full p-6 text-white shadow-2xl relative overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-400">
              <AlertTriangle className="w-6 h-6 animate-bounce" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-amber-300">
                Resolução de Conflitos de Sincronização
              </h3>
              <p className="text-xs text-slate-400">
                Conflito detectado entre o estado local (IndexedDB) e o servidor Firebase. Escolha a versão desejada.
              </p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full bg-slate-800 text-amber-400 font-mono text-xs font-bold border border-slate-700">
            {conflicts.length} Pendente{conflicts.length > 1 ? 's' : ''}
          </span>
        </div>

        {/* Content body: Side by side comparison */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-6">
          {/* Local IndexedDB Version */}
          <div className="p-4 rounded-2xl bg-slate-800/80 border-2 border-indigo-500/40 hover:border-indigo-500 transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="flex items-center gap-1.5 text-xs font-extrabold text-indigo-400">
                  <HardDrive className="w-4 h-4" />
                  Versão Local (IndexedDB)
                </span>
                <span className="text-[10px] text-slate-400">
                  {new Date(activeConflict.localUpdatedAt).toLocaleTimeString()}
                </span>
              </div>
              <div className="bg-slate-900/90 rounded-xl p-3 font-mono text-xs text-slate-200 space-y-1.5 border border-slate-800 max-h-48 overflow-y-auto">
                {Object.entries(activeConflict.localData).map(([key, val]) => (
                  <div key={key} className="flex justify-between gap-2 border-b border-slate-800/50 pb-1">
                    <span className="text-slate-400 font-semibold">{key}:</span>
                    <span className="text-indigo-300 text-right">{String(val)}</span>
                  </div>
                ))}
              </div>
            </div>
            <button
              onClick={() => handleResolve('local')}
              disabled={resolvingId === activeConflict.id}
              className="mt-4 w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              {resolvingId === activeConflict.id ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              <span>Manter Versão Local</span>
            </button>
          </div>

          {/* Server Firebase Version */}
          <div className="p-4 rounded-2xl bg-slate-800/80 border-2 border-emerald-500/40 hover:border-emerald-500 transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="flex items-center gap-1.5 text-xs font-extrabold text-emerald-400">
                  <Cloud className="w-4 h-4" />
                  Versão do Servidor (Firebase)
                </span>
                <span className="text-[10px] text-slate-400">
                  {new Date(activeConflict.serverUpdatedAt).toLocaleTimeString()}
                </span>
              </div>
              <div className="bg-slate-900/90 rounded-xl p-3 font-mono text-xs text-slate-200 space-y-1.5 border border-slate-800 max-h-48 overflow-y-auto">
                {Object.entries(activeConflict.serverData).map(([key, val]) => (
                  <div key={key} className="flex justify-between gap-2 border-b border-slate-800/50 pb-1">
                    <span className="text-slate-400 font-semibold">{key}:</span>
                    <span className="text-emerald-300 text-right">{String(val)}</span>
                  </div>
                ))}
              </div>
            </div>
            <button
              onClick={() => handleResolve('server')}
              disabled={resolvingId === activeConflict.id}
              className="mt-4 w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              {resolvingId === activeConflict.id ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              <span>Manter Servidor (Firebase)</span>
            </button>
          </div>
        </div>

        {/* Merge action option */}
        <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
          <button
            onClick={() => handleResolve('merge')}
            disabled={resolvingId === activeConflict.id}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-extrabold text-xs flex items-center gap-2 transition-all border border-slate-700 cursor-pointer"
          >
            <Layers className="w-4 h-4 text-violet-400" />
            <span>Mesclar Dados (Combinar Alterações)</span>
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-xs font-semibold cursor-pointer"
          >
            Resolver Depois
          </button>
        </div>
      </div>
    </div>
  );
}
