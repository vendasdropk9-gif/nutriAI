import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Database, ShieldCheck, RefreshCw, Download, Clock, CheckCircle2, AlertTriangle, X, Sparkles, HardDrive, Settings } from 'lucide-react';
import { UserProfile } from '../types';
import { playSfx, vibrate } from '../lib/sensory';
import { useTranslation } from '../contexts/LanguageContext';
import { 
  runCriticalBackup, 
  getBackupConfig, 
  saveBackupConfig, 
  getLatestBackupMetadata, 
  getBackupHistory, 
  downloadBackupFile, 
  BackupMetadata, 
  BackupConfig 
} from '../lib/backupService';

interface ManualBackupSchedulerModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile | null;
  addNotification?: (notif: any) => void;
}

export function ManualBackupSchedulerModal({ isOpen, onClose, profile, addNotification }: ManualBackupSchedulerModalProps) {
  const { t } = useTranslation();
  const [config, setConfig] = useState<BackupConfig>(getBackupConfig());
  const [latestBackup, setLatestBackup] = useState<BackupMetadata | null>(getLatestBackupMetadata());
  const [history, setHistory] = useState<BackupMetadata[]>([]);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [activeTab, setActiveTab] = useState<'status' | 'schedule' | 'history'>('status');

  useEffect(() => {
    if (isOpen) {
      setConfig(getBackupConfig());
      setLatestBackup(getLatestBackupMetadata());
      getBackupHistory().then(setHistory).catch(() => {});
    }
  }, [isOpen]);

  const handleRunManualBackup = async () => {
    if (isBackingUp) return;
    setIsBackingUp(true);
    playSfx('tap');
    vibrate([30, 40]);

    try {
      const meta = await runCriticalBackup({ triggeredBy: 'manual_admin', force: true });
      setLatestBackup(meta);
      const updatedHistory = await getBackupHistory();
      setHistory(updatedHistory);

      playSfx('success');
      vibrate([40, 60, 40]);
      if (addNotification) {
        addNotification({
          title: "Backup Manual Concluído! 💾",
          message: `Snapshot ${meta.backupId} gerado com sucesso (${meta.totalRecords} registros, ${meta.formattedSize}).`,
          type: 'success'
        });
      }
    } catch (err: any) {
      playSfx('notification');
      vibrate(100);
      if (addNotification) {
        addNotification({
          title: "Erro no Backup",
          message: err?.message || 'Falha ao executar backup manual.',
          type: 'warning'
        });
      }
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleUpdateConfig = (partial: Partial<BackupConfig>) => {
    const updated = saveBackupConfig(partial);
    setConfig(updated);
    playSfx('tap');
    vibrate(15);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', stiffness: 350, damping: 25 }}
          className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col text-white max-h-[90vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-950/60">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-400">
                <Database className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h3 className="text-xl font-serif font-bold text-white">Central de Backups & Sincronização</h3>
                <p className="text-xs text-slate-400">Agende backups manuais e monitore a sincronização automática</p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Subtabs */}
          <div className="flex items-center gap-2 px-6 pt-4 border-b border-slate-800 bg-slate-950/30">
            <button
              type="button"
              onClick={() => setActiveTab('status')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                activeTab === 'status'
                  ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750'
              }`}
            >
              📊 Status & Sincronização
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('schedule')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                activeTab === 'schedule'
                  ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750'
              }`}
            >
              ⏰ Agendamento & Frequência
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                activeTab === 'history'
                  ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750'
              }`}
            >
              📁 Histórico de Snapshots ({history.length})
            </button>
          </div>

          {/* Body Content */}
          <div className="p-6 overflow-y-auto space-y-6 flex-1">
            {activeTab === 'status' && (
              <div className="space-y-6">
                {/* Last Sync Status Banner */}
                <div className="p-6 rounded-2xl bg-gradient-to-br from-indigo-950/60 to-slate-900 border border-indigo-500/30 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`w-3 h-3 rounded-full ${latestBackup?.status === 'completed' ? 'bg-emerald-400 shadow-[0_0_10px_#34d399]' : 'bg-amber-400'}`} />
                      <span className="text-xs font-black uppercase tracking-wider text-indigo-300">
                        {latestBackup?.status === 'completed' ? 'Sincronizado & Protegido' : 'Pendente / Não Executado'}
                      </span>
                    </div>

                    <span className="text-xs font-mono text-slate-400">
                      ID: {latestBackup?.backupId || 'N/A'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
                    <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
                      <p className="text-[10px] uppercase font-bold text-slate-400">Última Sincronização</p>
                      <p className="text-sm font-black text-white mt-0.5">
                        {latestBackup ? new Date(latestBackup.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {latestBackup ? new Date(latestBackup.timestamp).toLocaleDateString() : 'Nenhum'}
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
                      <p className="text-[10px] uppercase font-bold text-slate-400">Registros Salvos</p>
                      <p className="text-sm font-black text-indigo-400 mt-0.5">{latestBackup?.totalRecords || 0} itens</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Cofre Local & Nuvem</p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
                      <p className="text-[10px] uppercase font-bold text-slate-400">Tamanho do Snapshot</p>
                      <p className="text-sm font-black text-emerald-400 mt-0.5">{latestBackup?.formattedSize || '0 KB'}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Compactado JSON</p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
                      <p className="text-[10px] uppercase font-bold text-slate-400">Origem da Execução</p>
                      <p className="text-sm font-black text-amber-400 mt-0.5 uppercase">{latestBackup?.triggeredBy || 'Automático'}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Agendador / Manual</p>
                    </div>
                  </div>

                  {latestBackup && (
                    <div className="flex items-center justify-between pt-2">
                      <span className="text-xs text-slate-400 font-mono truncate max-w-md">
                        Destino: {latestBackup.targetBucket}
                      </span>
                      <button
                        type="button"
                        onClick={() => downloadBackupFile(latestBackup)}
                        className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" /> Baixar Último Snapshot
                      </button>
                    </div>
                  )}
                </div>

                {/* Manual Trigger Action */}
                <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-white">Executar Backup Manual Imediato</h4>
                    <p className="text-xs text-slate-400">Força a coleta de todos os dados atuais da despensa, treinos e planos e gera um novo cofre.</p>
                  </div>

                  <button
                    type="button"
                    onClick={handleRunManualBackup}
                    disabled={isBackingUp}
                    className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs sm:text-sm rounded-xl shadow-lg shadow-emerald-600/30 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 shrink-0"
                  >
                    <RefreshCw className={`w-4 h-4 ${isBackingUp ? 'animate-spin' : ''}`} />
                    <span>{isBackingUp ? 'Salvando Backup...' : 'Fazer Backup Manual Agora'}</span>
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'schedule' && (
              <div className="space-y-6">
                <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-white">Agendamento Automático Periódico</h4>
                      <p className="text-xs text-slate-400">Mantém seus dados sincronizados automaticamente em segundo plano.</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleUpdateConfig({ enabled: !config.enabled })}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${config.enabled ? 'bg-indigo-600' : 'bg-slate-700'}`}
                    >
                      <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${config.enabled ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                  </div>

                  <div className="space-y-3 pt-2">
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                      Frequência de Sincronização Automática
                    </label>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[6, 12, 24, 48].map((hours) => (
                        <button
                          key={hours}
                          type="button"
                          onClick={() => handleUpdateConfig({ intervalHours: hours })}
                          className={`p-3.5 rounded-xl border text-center transition-all cursor-pointer ${
                            config.intervalHours === hours
                              ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300 font-bold'
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                          }`}
                        >
                          <p className="text-base font-black text-white">A cada {hours}h</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">Automático</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-200 flex items-start gap-2.5">
                    <Sparkles className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                    <p>
                      O serviço em segundo plano verifica o intervalo configurado e envia um snapshot redundante para o Firestore e LocalStorage sempre que você abre o aplicativo.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'history' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white">Histórico de Snapshots Salvos ({history.length})</h4>
                  <span className="text-xs text-slate-400">Mantendo até {config.maxSnapshotsToKeep} backups</span>
                </div>

                {history.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 space-y-2">
                    <HardDrive className="w-10 h-10 mx-auto opacity-40" />
                    <p className="text-sm font-semibold">Nenhum snapshot gerado ainda.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {history.map((item) => (
                      <div key={item.backupId} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold text-indigo-300">{item.backupId}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-semibold uppercase">
                              {item.triggeredBy}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400">
                            {new Date(item.timestamp).toLocaleString()} • <strong className="text-white">{item.totalRecords} registros</strong> ({item.formattedSize})
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => downloadBackupFile(item)}
                          className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                        >
                          <Download className="w-3.5 h-3.5" /> Baixar
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-slate-800 bg-slate-950/60">
            <span className="text-xs text-slate-400 font-mono">
              Status: {config.enabled ? 'Sincronização Ativa ⚡' : 'Pausada'}
            </span>

            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
