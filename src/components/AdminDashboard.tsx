import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Database, ShieldCheck, AlertTriangle, CheckCircle2, XCircle, 
  RefreshCw, Terminal, Copy, Check, Download, Layers, Server, 
  Cpu, HardDrive, Search, Filter, Activity, Clock, Zap, 
  Lock, Eye, Code, FileText, Sparkles, ExternalLink, HelpCircle,
  BarChart3, Settings, ShieldAlert, ArrowUpRight, Flame,
  Archive, CloudUpload, RotateCcw, FolderArchive, ArrowDownToLine,
  CheckCircle, Play, CheckCheck, FileJson, Shield, AlertCircle,
  Wrench, History, Trash2, ChevronDown, ChevronUp, CheckSquare
} from 'lucide-react';
import { 
  checkDatabaseIntegrity, 
  getLatestDatabaseReport, 
  getIntegrityAuditHistory,
  clearIntegrityAuditHistory,
  fixMissingResource,
  fixAllMissingResources,
  DatabaseIntegrityReport, 
  IntegrityCheckItem,
  AuditHistoryEntry,
  AuditTriggerType
} from '../lib/databaseIntegrityMonitor';
import { 
  runCriticalBackup, 
  getLatestBackupMetadata, 
  getBackupHistory, 
  downloadBackupFile, 
  restoreBackupSnapshot, 
  getBackupConfig, 
  saveBackupConfig, 
  getBackupSnapshot,
  BackupMetadata, 
  CriticalBackupData, 
  BackupConfig 
} from '../lib/backupService';
import { db } from '../lib/firebase';
import { isSupabaseConfigured } from '../lib/supabase';
import { playSfx, vibrate } from '../lib/sensory';
import { UserProfile } from '../types';
import { SystemLogsView } from './SystemLogsView';
import { AiPerformanceView } from './AiPerformanceView';

interface AdminDashboardProps {
  profile?: UserProfile | null;
  onNavigateTab?: (tab: string) => void;
}

export function AdminDashboard({ profile, onNavigateTab }: AdminDashboardProps) {
  const [report, setReport] = useState<DatabaseIntegrityReport | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'tables' | 'schema' | 'backups' | 'logs' | 'system_logs' | 'ai_performance'>('overview');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'firestore' | 'supabase'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'ok' | 'warning' | 'error' | 'missing'>('all');
  const [copiedSql, setCopiedSql] = useState<boolean>(false);
  const [copiedIndexes, setCopiedIndexes] = useState<boolean>(false);
  const [lastCheckTime, setLastCheckTime] = useState<Date | null>(null);
  const [selectedItem, setSelectedItem] = useState<IntegrityCheckItem | null>(null);

  // Audit History & Fix States
  const [auditHistory, setAuditHistory] = useState<AuditHistoryEntry[]>([]);
  const [fixingResource, setFixingResource] = useState<string | null>(null);
  const [isFixingAll, setIsFixingAll] = useState<boolean>(false);
  const [historyFilter, setHistoryFilter] = useState<'all' | 'startup_auto' | 'manual_admin' | 'fix_verification' | 'issues_only'>('all');
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);

  // Backup States
  const [latestBackup, setLatestBackup] = useState<BackupMetadata | null>(null);
  const [backupHistory, setBackupHistory] = useState<BackupMetadata[]>([]);
  const [backupConfig, setBackupConfig] = useState<BackupConfig>(getBackupConfig());
  const [isBackingUp, setIsBackingUp] = useState<boolean>(false);
  const [isRestoring, setIsRestoring] = useState<boolean>(false);
  const [inspectingBackup, setInspectingBackup] = useState<BackupMetadata | null>(null);
  const [restoreConfirmModal, setRestoreConfirmModal] = useState<BackupMetadata | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Carrega histórico de auditorias
  const loadAuditHistory = useCallback(() => {
    const hist = getIntegrityAuditHistory();
    setAuditHistory(hist);
  }, []);

  // Carrega histórico de backups
  const loadBackupData = useCallback(async () => {
    const meta = getLatestBackupMetadata();
    setLatestBackup(meta);
    const history = await getBackupHistory();
    setBackupHistory(history);
    setBackupConfig(getBackupConfig());
  }, []);

  // Executa auditoria do banco
  const handleRunAudit = useCallback(async (force = true) => {
    setIsLoading(true);
    playSfx('pop');
    vibrate(15);
    try {
      const result = await checkDatabaseIntegrity({ force, silent: false });
      setReport(result);
      setLastCheckTime(new Date());
      loadAuditHistory();
      playSfx('success');
      vibrate([20, 30]);
    } catch (err) {
      console.error('[AdminDashboard] Erro ao executar auditoria:', err);
    } finally {
      setIsLoading(false);
    }
  }, [loadAuditHistory]);

  // Executa correção de recurso individual (tabela ou índice)
  const handleFixResource = async (item: IntegrityCheckItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setFixingResource(item.name);
    playSfx('pop');
    vibrate([15, 20]);
    try {
      const res = await fixMissingResource(item);
      if (res.success) {
        playSfx('success');
        vibrate([25, 40]);
        showToast(res.message, 'success');
      } else {
        playSfx('scratch');
        showToast(res.message, 'error');
      }
      await handleRunAudit(true);
      loadAuditHistory();
    } catch (err: any) {
      console.error('[AdminDashboard] Erro ao corrigir recurso:', err);
      showToast(`Falha ao corrigir recurso: ${err.message || err}`, 'error');
    } finally {
      setFixingResource(null);
    }
  };

  // Executa correção em lote para todos os recursos pendentes
  const handleFixAll = async (itemsToFix?: IntegrityCheckItem[]) => {
    const targetItems = itemsToFix || report?.items || [];
    const actionable = targetItems.filter(i => i.status === 'missing' || i.status === 'error' || i.status === 'warning');
    if (actionable.length === 0) {
      showToast('Nenhum recurso ausente ou com pendência detectado.', 'info');
      return;
    }
    setIsFixingAll(true);
    playSfx('pop');
    vibrate([20, 30, 20]);
    try {
      const result = await fixAllMissingResources(targetItems);
      if (result.fixed > 0) {
        playSfx('success');
        vibrate([30, 40, 30]);
        showToast(`${result.fixed} de ${result.total} recursos corrigidos com sucesso!`, 'success');
      } else {
        showToast('Nenhum recurso foi corrigido.', 'error');
      }
      await handleRunAudit(true);
      loadAuditHistory();
    } catch (err: any) {
      console.error('[AdminDashboard] Erro ao corrigir todos os recursos:', err);
      showToast(`Erro ao corrigir recursos: ${err.message || err}`, 'error');
    } finally {
      setIsFixingAll(false);
    }
  };

  // Limpa histórico de auditorias
  const handleClearAuditHistory = () => {
    playSfx('tap');
    vibrate(15);
    clearIntegrityAuditHistory();
    setAuditHistory([]);
    showToast('Histórico de logs de auditoria limpo com sucesso.', 'info');
  };

  // Executa rotina de backup crítico
  const handleRunBackup = async (triggeredBy: 'manual_admin' | 'system_trigger' = 'manual_admin') => {
    setIsBackingUp(true);
    playSfx('pop');
    vibrate([15, 20]);
    try {
      const meta = await runCriticalBackup({ triggeredBy });
      setLatestBackup(meta);
      await loadBackupData();
      playSfx('success');
      vibrate([25, 40, 25]);
      showToast(`Backup concluído com sucesso! (${meta.formattedSize}, ${meta.totalRecords} registros)`);
    } catch (err: any) {
      console.error('[AdminDashboard] Falha no backup:', err);
      showToast('Falha ao gerar backup: ' + (err.message || 'Erro desconhecido'), 'error');
    } finally {
      setIsBackingUp(false);
    }
  };

  // Download de snapshot
  const handleDownloadSnapshot = (item: BackupMetadata) => {
    playSfx('tap');
    vibrate(15);
    downloadBackupFile(item);
    showToast(`Snapshot ${item.backupId.slice(0, 15)}... baixado com sucesso!`);
  };

  // Restauração de dados do snapshot
  const handleExecuteRestore = async () => {
    if (!restoreConfirmModal) return;
    setIsRestoring(true);
    playSfx('pop');
    vibrate(20);
    try {
      const snapshot = await getBackupSnapshot(restoreConfirmModal.backupId);
      if (!snapshot) {
        throw new Error('Arquivo de snapshot não encontrado localmente ou no Firestore.');
      }
      const result = await restoreBackupSnapshot(snapshot);
      if (result.success) {
        playSfx('success');
        vibrate([30, 40, 30]);
        showToast(`Restauração concluída com sucesso! ${result.restoredCount} registros recuperados.`);
        setRestoreConfirmModal(null);
      } else {
        throw new Error(result.errors.join(', '));
      }
    } catch (err: any) {
      console.error('[AdminDashboard] Erro na restauração:', err);
      showToast(`Erro na restauração: ${err.message || 'Falha ao processar snapshot'}`, 'error');
    } finally {
      setIsRestoring(false);
    }
  };

  // Atualização de configurações de backup
  const handleUpdateConfig = (partial: Partial<BackupConfig>) => {
    playSfx('tap');
    vibrate(10);
    const updated = saveBackupConfig(partial);
    setBackupConfig(updated);
    showToast('Configurações do backup periódico atualizadas com sucesso!');
  };

  useEffect(() => {
    const existing = getLatestDatabaseReport();
    if (existing) {
      setReport(existing);
      setLastCheckTime(new Date(existing.timestamp));
    } else {
      handleRunAudit(false);
    }

    loadAuditHistory();
    loadBackupData();

    const handleReportEvent = (e: Event) => {
      const customEvent = e as CustomEvent<DatabaseIntegrityReport>;
      if (customEvent.detail) {
        setReport(customEvent.detail);
        setLastCheckTime(new Date(customEvent.detail.timestamp));
      }
    };

    const handleHistoryEvent = (e: Event) => {
      const customEvent = e as CustomEvent<AuditHistoryEntry[]>;
      if (customEvent.detail) {
        setAuditHistory(customEvent.detail);
      }
    };

    const handleBackupCompleted = (e: Event) => {
      const customEvent = e as CustomEvent<BackupMetadata>;
      if (customEvent.detail) {
        setLatestBackup(customEvent.detail);
        loadBackupData();
      }
    };

    window.addEventListener('nutri:db-integrity-checked', handleReportEvent as EventListener);
    window.addEventListener('nutri:db-integrity-history-updated', handleHistoryEvent as EventListener);
    window.addEventListener('nutri:backup-completed', handleBackupCompleted as EventListener);
    
    return () => {
      window.removeEventListener('nutri:db-integrity-checked', handleReportEvent as EventListener);
      window.removeEventListener('nutri:db-integrity-history-updated', handleHistoryEvent as EventListener);
      window.removeEventListener('nutri:backup-completed', handleBackupCompleted as EventListener);
    };
  }, [handleRunAudit, loadAuditHistory, loadBackupData]);

  // Filtra itens da tabela de integridade
  const filteredItems = useMemo(() => {
    if (!report?.items) return [];
    return report.items.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.details && item.details.toLowerCase().includes(searchQuery.toLowerCase()));

      let matchesType = true;
      if (typeFilter === 'firestore') {
        matchesType = item.type.startsWith('firestore');
      } else if (typeFilter === 'supabase') {
        matchesType = item.type.startsWith('supabase');
      }

      let matchesStatus = true;
      if (statusFilter !== 'all') {
        matchesStatus = item.status === statusFilter;
      }

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [report, searchQuery, typeFilter, statusFilter]);

  // Contagens para badges rápidos
  const statsCounts = useMemo(() => {
    if (!report?.items) return { total: 0, ok: 0, warning: 0, error: 0, missing: 0 };
    return {
      total: report.items.length,
      ok: report.items.filter(i => i.status === 'ok').length,
      warning: report.items.filter(i => i.status === 'warning').length,
      error: report.items.filter(i => i.status === 'error').length,
      missing: report.items.filter(i => i.status === 'missing').length,
    };
  }, [report]);

  const copyToClipboard = (text: string, isIndex = false) => {
    navigator.clipboard.writeText(text);
    playSfx('tap');
    vibrate(12);
    if (isIndex) {
      setCopiedIndexes(true);
      setTimeout(() => setCopiedIndexes(false), 2200);
    } else {
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 2200);
    }
  };

  const handleExportJson = () => {
    if (!report) return;
    playSfx('tap');
    vibrate(15);
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(report, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `nutriai_database_integrity_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const scoreColor = (score: number) => {
    if (score >= 90) return 'text-emerald-500';
    if (score >= 70) return 'text-amber-500';
    return 'text-rose-500';
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 pb-16 animate-fade-in">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-2xl shadow-xl border flex items-center gap-2 text-xs sm:text-sm font-bold backdrop-blur-md ${
              toastMessage.type === 'success' 
                ? 'bg-emerald-500/90 text-white border-emerald-400/30' 
                : toastMessage.type === 'error'
                ? 'bg-rose-500/90 text-white border-rose-400/30'
                : 'bg-slate-900/90 text-white border-slate-700'
            }`}
          >
            {toastMessage.type === 'success' && <CheckCircle className="w-4 h-4" />}
            {toastMessage.type === 'error' && <AlertCircle className="w-4 h-4" />}
            <span>{toastMessage.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Header Card */}
      <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 text-white p-6 sm:p-8 border border-slate-800 shadow-xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold tracking-wide">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Painel de Administração do Sistema</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-3">
              <Database className="w-7 h-7 text-emerald-400" />
              Monitor de Banco de Dados & Backups
            </h1>
            <p className="text-sm text-slate-400 max-w-2xl leading-relaxed">
              Verificação em tempo real do Firestore, rotinas de backup periódico em storage dedicado, integridade de esquemas e gerador de migrações.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => handleRunAudit(true)}
              disabled={isLoading}
              className={`px-4 sm:px-5 py-2.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 active:scale-95 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-emerald-500/25 transition-all cursor-pointer ${
                isLoading ? 'opacity-70 cursor-not-allowed' : ''
              }`}
              id="btn-run-db-audit"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span>{isLoading ? 'Verificando...' : 'Auditar Banco'}</span>
            </button>

            <button
              onClick={() => handleRunBackup('manual_admin')}
              disabled={isBackingUp}
              className={`px-4 sm:px-5 py-2.5 rounded-full bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 active:scale-95 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-indigo-500/25 transition-all cursor-pointer ${
                isBackingUp ? 'opacity-70 cursor-not-allowed' : ''
              }`}
              id="btn-run-backup-now"
            >
              <CloudUpload className={`w-4 h-4 ${isBackingUp ? 'animate-bounce' : ''}`} />
              <span>{isBackingUp ? 'Fazendo Backup...' : 'Executar Backup'}</span>
            </button>

            <button
              onClick={handleExportJson}
              disabled={!report}
              className="px-4 py-2.5 rounded-full bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 font-bold text-xs sm:text-sm flex items-center gap-2 border border-slate-700 transition-all cursor-pointer"
              title="Baixar Relatório JSON de Integridade"
              id="btn-export-db-json"
            >
              <Download className="w-4 h-4 text-sky-400" />
              <span>Exportar JSON</span>
            </button>
          </div>
        </div>

        {/* Status Mini Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5 mt-6 pt-6 border-t border-slate-800/80">
          <div className="p-3.5 rounded-2xl bg-slate-800/50 border border-slate-700/60">
            <span className="text-[11px] text-slate-400 font-medium block">Integridade Global</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className={`text-2xl font-black ${report ? scoreColor(report.score) : 'text-slate-400'}`}>
                {report ? `${report.score}%` : '--'}
              </span>
              <span className="text-[10px] text-slate-400 font-bold">
                {report?.overallHealthy ? 'Saudável' : 'Atenção'}
              </span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-800/50 border border-slate-700/60">
            <span className="text-[11px] text-slate-400 font-medium block">Firestore Cloud</span>
            <div className="flex items-center gap-2 mt-1">
              <span className={`w-2.5 h-2.5 rounded-full ${report?.firestoreStatus.connected ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-rose-400'}`} />
              <span className="text-sm font-bold text-slate-200">
                {report?.firestoreStatus.connected ? 'Conectado' : 'Offline'}
              </span>
            </div>
            <span className="text-[10px] text-slate-500 block mt-0.5">
              {report?.firestoreStatus.checkedCollections || 0} coleções verificadas
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-800/50 border border-slate-700/60">
            <span className="text-[11px] text-slate-400 font-medium block">Supabase / SQL</span>
            <div className="flex items-center gap-2 mt-1">
              <span className={`w-2.5 h-2.5 rounded-full ${
                report?.supabaseStatus.configured 
                  ? (report.supabaseStatus.connected ? 'bg-emerald-400' : 'bg-rose-400')
                  : 'bg-slate-500'
              }`} />
              <span className="text-sm font-bold text-slate-200">
                {report?.supabaseStatus.configured 
                  ? (report.supabaseStatus.connected ? 'Sincronizado' : 'Erro Chave')
                  : 'Modo Nativo'}
              </span>
            </div>
            <span className="text-[10px] text-slate-500 block mt-0.5">
              {report?.supabaseStatus.checkedTables || 0} tabelas auditadas
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-800/50 border border-slate-700/60">
            <span className="text-[11px] text-slate-400 font-medium block">Último Backup Crítico</span>
            <div className="flex items-center gap-2 mt-1">
              <span className={`w-2.5 h-2.5 rounded-full ${
                latestBackup?.status === 'completed' 
                  ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' 
                  : latestBackup?.status === 'warning'
                  ? 'bg-amber-400'
                  : 'bg-slate-500'
              }`} />
              <span className="text-sm font-bold text-slate-200 truncate">
                {latestBackup ? latestBackup.formattedSize : 'Pendente'}
              </span>
            </div>
            <span className="text-[10px] text-slate-500 block mt-0.5 truncate">
              {latestBackup ? new Date(latestBackup.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Nunca executado'}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-800/50 border border-slate-700/60">
            <span className="text-[11px] text-slate-400 font-medium block">Rotina Periódica</span>
            <div className="text-sm font-bold text-slate-200 mt-1 truncate flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
              <span>{backupConfig.enabled ? `A cada ${backupConfig.intervalHours}h` : 'Pausada'}</span>
            </div>
            <span className="text-[10px] text-slate-500 block mt-0.5">
              {backupConfig.enabled ? 'Agendador ativo' : 'Desativado'}
            </span>
          </div>
        </div>
      </div>

      {/* Internal Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        <button
          onClick={() => { setActiveSubTab('overview'); playSfx('tap'); }}
          className={`px-4 py-2.5 rounded-full font-bold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'overview'
              ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Visão Geral & Métricas</span>
        </button>

        <button
          onClick={() => { setActiveSubTab('backups'); playSfx('tap'); }}
          className={`px-4 py-2.5 rounded-full font-bold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'backups'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
          }`}
        >
          <Archive className="w-4 h-4 text-indigo-400" />
          <span>Backups & Storage Dedicado</span>
          {latestBackup && (
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
              {latestBackup.formattedSize}
            </span>
          )}
        </button>

        <button
          onClick={() => { setActiveSubTab('tables'); playSfx('tap'); }}
          className={`px-4 py-2.5 rounded-full font-bold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'tables'
              ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Tabelas & Coleções ({statsCounts.total})</span>
          {statsCounts.warning + statsCounts.error > 0 && (
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          )}
        </button>

        <button
          onClick={() => { setActiveSubTab('schema'); playSfx('tap'); }}
          className={`px-4 py-2.5 rounded-full font-bold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'schema'
              ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
          }`}
        >
          <Code className="w-4 h-4" />
          <span>Integridade do Esquema & Migrações</span>
          {(report?.suggestedSqlMigrations.length || 0) > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-bold">
              {report?.suggestedSqlMigrations.length}
            </span>
          )}
        </button>

        <button
          onClick={() => { setActiveSubTab('ai_performance'); playSfx('tap'); }}
          className={`px-4 py-2.5 rounded-full font-bold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'ai_performance'
              ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md shadow-indigo-500/20'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
          }`}
        >
          <Cpu className="w-4 h-4 text-indigo-400" />
          <span>Desempenho da IA</span>
          <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
        </button>

        <button
          onClick={() => { setActiveSubTab('system_logs'); playSfx('tap'); }}
          className={`px-4 py-2.5 rounded-full font-bold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'system_logs'
              ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
          }`}
        >
          <Activity className="w-4 h-4 text-teal-400" />
          <span>Logs de Sistema</span>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        </button>

        <button
          onClick={() => { setActiveSubTab('logs'); playSfx('tap'); }}
          className={`px-4 py-2.5 rounded-full font-bold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'logs'
              ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
          }`}
        >
          <Terminal className="w-4 h-4" />
          <span>Console & Diagnósticos</span>
        </button>
      </div>

      {/* Tab 1: Visão Geral */}
      {activeSubTab === 'overview' && (
        <div className="space-y-6 animate-fade-in">
          {/* Main Health Card */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Score & Progress */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Score de Integridade
                  </span>
                  <ShieldCheck className="w-5 h-5 text-emerald-500" />
                </div>
                <div className="mt-4 flex items-baseline gap-3">
                  <span className={`text-5xl font-black tracking-tight ${report ? scoreColor(report.score) : 'text-slate-300'}`}>
                    {report ? report.score : '--'}
                  </span>
                  <span className="text-sm font-bold text-slate-400">/ 100</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                  {report?.overallHealthy 
                    ? 'Todas as coleções e tabelas críticas responderam normalmente aos testes de integridade.'
                    : 'Foram detectadas pendências que podem ser resolvidas aplicando os scripts de migração recomendados.'}
                </p>
              </div>

              <div className="mt-6">
                <div className="w-full h-3 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${report?.score || 0}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className={`h-full rounded-full ${
                      (report?.score || 0) >= 90 ? 'bg-emerald-500' : (report?.score || 0) >= 70 ? 'bg-amber-500' : 'bg-rose-500'
                    }`}
                  />
                </div>
              </div>
            </div>

            {/* Firestore Health Status */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <Server className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">Google Firestore</h3>
                    <span className="text-[11px] text-slate-400">Persistência Primária</span>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                  Ativo & Conectado
                </span>
              </div>

              <ul className="text-xs space-y-2 text-slate-600 dark:text-slate-300">
                <li className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-700/60">
                  <span>ID do Banco:</span>
                  <code className="text-[11px] font-mono text-slate-800 dark:text-slate-200">ai-studio-nutriai</code>
                </li>
                <li className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-700/60">
                  <span>Coleções Auditadas:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{report?.firestoreStatus.checkedCollections || 0}</span>
                </li>
                <li className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-700/60">
                  <span>Modo de Operação:</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Online & Sincronizado</span>
                </li>
                <li className="flex items-center justify-between py-1">
                  <span>Índices Compostos:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">Configurados</span>
                </li>
              </ul>
            </div>

            {/* Backup & Data Vault Card */}
            <div className="p-6 rounded-3xl bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 text-white border border-indigo-500/30 shadow-lg space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-300">
                      <Archive className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-slate-100">Cofre de Backups</h3>
                      <span className="text-[11px] text-indigo-300">Storage Bucket Crítico</span>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                    latestBackup?.status === 'completed'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  }`}>
                    {latestBackup ? 'Protegido' : 'Pendente'}
                  </span>
                </div>

                <div className="mt-4 space-y-2 text-xs text-slate-300">
                  <div className="flex justify-between py-1 border-b border-indigo-500/20">
                    <span className="text-slate-400">Último Snapshot:</span>
                    <span className="font-bold text-slate-100">{latestBackup?.formattedSize || '--'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-indigo-500/20">
                    <span className="text-slate-400">Total de Registros:</span>
                    <span className="font-bold text-slate-100">{latestBackup?.totalRecords || 0} itens</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-400">Frequência:</span>
                    <span className="font-bold text-indigo-300">A cada {backupConfig.intervalHours} horas</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setActiveSubTab('backups')}
                className="w-full py-2.5 rounded-full bg-indigo-500 hover:bg-indigo-600 active:scale-95 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
              >
                <span>Gerenciar Backups & Snapshots</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Quick Breakdown Summary */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
            <h3 className="font-bold text-base text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-500" />
              Módulos Críticos Auditados & Prontidão de Câmeras
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-700/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-700 dark:text-slate-200">Diário Nutricional</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Logs de refeições, fotos do prato e cálculo de calorias sincronizados.
                </p>
                <div className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                  Coleção: intakeLogs
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-700/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-700 dark:text-slate-200">Biometria & Saúde</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Glicemia, pressão arterial, batimentos e monitor facial/digital ativos.
                </p>
                <div className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                  Coleção: bloodPressureLogs
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-700/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-700 dark:text-slate-200">Despensa & Geladeira</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Controle de validade por IA, notificações e lista de compras inteligente.
                </p>
                <div className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                  Coleção: fridgeItems
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-700/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-700 dark:text-slate-200">Câmeras & Alertas</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Alertas em tempo real, regras de detecção de alimentos e auditoria.
                </p>
                <div className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                  Coleção: cameraAlerts
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Backups & Storage Dedicado */}
      {activeSubTab === 'backups' && (
        <div className="space-y-6 animate-fade-in">
          {/* Hero Backup Card */}
          <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white border border-indigo-500/30 shadow-xl space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 text-xs font-bold">
                  <Archive className="w-3.5 h-3.5" />
                  <span>Bucket de Storage Crítico & Snapshots</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-3">
                  <Shield className="w-7 h-7 text-indigo-400" />
                  Rotina de Backup Periódico & Cofre de Dados
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
                  Exportação e redundância automática de planos alimentares, logs de saúde, biometria e inventário da geladeira em storage dedicado do Firestore com suporte a restauração instantânea.
                </p>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <button
                  onClick={() => handleRunBackup('manual_admin')}
                  disabled={isBackingUp}
                  className={`px-5 py-3 rounded-full bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 active:scale-95 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-indigo-500/30 transition-all cursor-pointer ${
                    isBackingUp ? 'opacity-70 cursor-not-allowed' : ''
                  }`}
                  id="btn-trigger-full-backup"
                >
                  <CloudUpload className={`w-4 h-4 ${isBackingUp ? 'animate-bounce' : ''}`} />
                  <span>{isBackingUp ? 'Processando Backup...' : 'Executar Backup Imediato'}</span>
                </button>

                {latestBackup && (
                  <button
                    onClick={() => handleDownloadSnapshot(latestBackup)}
                    className="px-4 py-3 rounded-full bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 font-bold text-xs sm:text-sm flex items-center gap-2 border border-slate-700 transition-all cursor-pointer"
                    title="Baixar Snapshot do Último Backup em JSON"
                  >
                    <Download className="w-4 h-4 text-sky-400" />
                    <span>Baixar Snapshot</span>
                  </button>
                )}
              </div>
            </div>

            {/* Grid de Métricas do Backup */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-indigo-500/20">
              <div className="p-4 rounded-2xl bg-indigo-900/30 border border-indigo-500/20">
                <span className="text-[11px] text-indigo-300 font-semibold block">Status do Último Backup</span>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className={`w-2.5 h-2.5 rounded-full ${
                    latestBackup?.status === 'completed' ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-amber-400'
                  }`} />
                  <span className="text-base font-extrabold text-slate-100 uppercase">
                    {latestBackup?.status || 'Não Realizado'}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 block mt-1">
                  {latestBackup ? new Date(latestBackup.timestamp).toLocaleString() : '--'}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-indigo-900/30 border border-indigo-500/20">
                <span className="text-[11px] text-indigo-300 font-semibold block">Tamanho & Registros</span>
                <div className="text-base font-extrabold text-slate-100 mt-1.5">
                  {latestBackup ? latestBackup.formattedSize : '0 KB'}
                </div>
                <span className="text-[10px] text-slate-400 block mt-1">
                  {latestBackup ? `${latestBackup.totalRecords} itens protegidos` : '0 itens'}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-indigo-900/30 border border-indigo-500/20">
                <span className="text-[11px] text-indigo-300 font-semibold block">Destino do Bucket</span>
                <div className="text-xs font-mono font-bold text-slate-200 mt-1.5 truncate">
                  system_backups/vault
                </div>
                <span className="text-[10px] text-emerald-400 font-semibold block mt-1">
                  Cloud Firestore Storage
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-indigo-900/30 border border-indigo-500/20">
                <span className="text-[11px] text-indigo-300 font-semibold block">Próxima Execução</span>
                <div className="text-sm font-extrabold text-slate-100 mt-1.5">
                  {backupConfig.enabled ? `A cada ${backupConfig.intervalHours}h` : 'Pausado'}
                </div>
                <span className="text-[10px] text-indigo-300 block mt-1">
                  {latestBackup?.nextScheduledBackup 
                    ? `Previsão: ${new Date(latestBackup.nextScheduledBackup).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` 
                    : 'Agendamento automático ativo'}
                </span>
              </div>
            </div>
          </div>

          {/* Configuração de Agendamento e Periodicidade */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-base text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-indigo-500" />
                  Configurações do Agendador de Backup Periódico
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Defina o intervalo em que a rotina em segundo plano salvará snapshots dos dados críticos.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Backup Automático:
                </span>
                <button
                  onClick={() => handleUpdateConfig({ enabled: !backupConfig.enabled })}
                  className={`px-4 py-1.5 rounded-full font-bold text-xs transition-all cursor-pointer ${
                    backupConfig.enabled 
                      ? 'bg-emerald-500 text-white shadow-sm' 
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {backupConfig.enabled ? 'Ativado' : 'Pausado'}
                </button>
              </div>
            </div>

            {/* Seletor de Frequência */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[6, 12, 24, 48].map((hours) => (
                <button
                  key={hours}
                  onClick={() => handleUpdateConfig({ intervalHours: hours })}
                  className={`p-3.5 rounded-2xl border text-center transition-all cursor-pointer ${
                    backupConfig.intervalHours === hours
                      ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-500 text-indigo-600 dark:text-indigo-300 font-extrabold shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300 font-semibold'
                  }`}
                >
                  <span className="text-base sm:text-lg block">A cada {hours}h</span>
                  <span className="text-[11px] opacity-75 block mt-0.5">
                    {hours === 6 ? 'Alta Frequência' : hours === 24 ? 'Recomendado' : `${hours / 24} dias`}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Breakdown por Coleção Crítica */}
          {latestBackup && (
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
              <h3 className="font-bold text-base text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-500" />
                Detalhamento dos Dados no Último Snapshot ({latestBackup.totalRecords} Registros)
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 pt-2">
                {Object.entries(latestBackup.collectionCounts).map(([key, count]) => (
                  <div key={key} className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-700/60 text-center">
                    <span className="text-xs text-slate-500 dark:text-slate-400 capitalize block truncate">
                      {key.replace(/([A-Z])/g, ' $1')}
                    </span>
                    <span className="text-lg font-black text-slate-800 dark:text-slate-100 block mt-1">
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Histórico de Snapshots de Backup */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-base text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <FolderArchive className="w-5 h-5 text-indigo-500" />
                  Histórico de Snapshots & Cofre de Restauração
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Snapshots salvos com hash de integridade SHA-256 e possibilidade de download ou restauração.
                </p>
              </div>

              <button
                onClick={loadBackupData}
                className="px-3.5 py-1.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer hover:bg-slate-200"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Recarregar Histórico</span>
              </button>
            </div>

            {backupHistory.length === 0 ? (
              <div className="p-8 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-dashed border-slate-200 dark:border-slate-700 text-center space-y-3">
                <Archive className="w-8 h-8 text-slate-400 mx-auto" />
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  Nenhum snapshot de backup gerado ainda.
                </p>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Clique no botão &quot;Executar Backup Imediato&quot; acima para criar o primeiro snapshot redundante.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-900/80 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="py-3 px-4">Snapshot ID / Data</th>
                      <th className="py-3 px-4">Origem</th>
                      <th className="py-3 px-4">Tamanho</th>
                      <th className="py-3 px-4">Registros</th>
                      <th className="py-3 px-4">Integridade Hash</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                    {backupHistory.map((item) => (
                      <tr key={item.backupId} className="hover:bg-slate-50/80 dark:hover:bg-slate-750 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-800 dark:text-slate-200">
                          <div>{item.backupId}</div>
                          <span className="text-[10px] font-sans font-normal text-slate-400">
                            {new Date(item.timestamp).toLocaleString()}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            item.triggeredBy === 'auto_periodic'
                              ? 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30'
                              : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                          }`}>
                            {item.triggeredBy === 'auto_periodic' ? 'Automático' : 'Manual Admin'}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300">
                          {item.formattedSize}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300">
                          {item.totalRecords}
                        </td>
                        <td className="py-3 px-4 font-mono text-[10px] text-slate-500 truncate max-w-[120px]">
                          {item.checksum}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            item.status === 'completed'
                              ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
                              : 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/20'
                          }`}>
                            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                            <span>{item.status.toUpperCase()}</span>
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                          <button
                            onClick={() => handleDownloadSnapshot(item)}
                            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 transition-all cursor-pointer"
                            title="Baixar JSON"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setInspectingBackup(item)}
                            className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950 hover:bg-indigo-100 text-indigo-600 dark:text-indigo-300 transition-all cursor-pointer"
                            title="Inspecionar Detalhes"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setRestoreConfirmModal(item)}
                            className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950 hover:bg-amber-100 text-amber-600 dark:text-amber-300 transition-all cursor-pointer"
                            title="Restaurar Snapshot"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Tabelas & Coleções */}
      {activeSubTab === 'tables' && (
        <div className="space-y-6 animate-fade-in">
          {/* Controls Bar */}
          <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar coleção ou tabela..."
                className="w-full pl-10 pr-4 py-2 rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto flex-wrap">
              {/* Type Filter */}
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-full border border-slate-200 dark:border-slate-700 text-xs">
                <button
                  onClick={() => setTypeFilter('all')}
                  className={`px-3 py-1 rounded-full font-bold transition-all cursor-pointer ${
                    typeFilter === 'all' ? 'bg-white dark:bg-slate-800 shadow-xs text-slate-900 dark:text-slate-100' : 'text-slate-500'
                  }`}
                >
                  Todas
                </button>
                <button
                  onClick={() => setTypeFilter('firestore')}
                  className={`px-3 py-1 rounded-full font-bold transition-all cursor-pointer ${
                    typeFilter === 'firestore' ? 'bg-white dark:bg-slate-800 shadow-xs text-emerald-600 dark:text-emerald-400' : 'text-slate-500'
                  }`}
                >
                  Firestore
                </button>
                <button
                  onClick={() => setTypeFilter('supabase')}
                  className={`px-3 py-1 rounded-full font-bold transition-all cursor-pointer ${
                    typeFilter === 'supabase' ? 'bg-white dark:bg-slate-800 shadow-xs text-teal-600 dark:text-teal-400' : 'text-slate-500'
                  }`}
                >
                  Supabase
                </button>
              </div>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none"
              >
                <option value="all">Todos os Status</option>
                <option value="ok">✅ Saudável (OK)</option>
                <option value="warning">⚠️ Aviso / Cache</option>
                <option value="missing">❌ Ausente</option>
                <option value="error">⛔ Erro</option>
              </select>
            </div>
          </div>

          {/* Tables Data List */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-700 pb-3">
              <div>
                <h3 className="font-bold text-base text-slate-800 dark:text-slate-100">
                  Lista de Tabelas & Coleções ({filteredItems.length})
                </h3>
                <span className="text-xs text-slate-400">
                  Clique na linha para diagnóstico detalhado ou clique em Corrigir para resolver inconsistências
                </span>
              </div>
              {filteredItems.some(i => i.status !== 'ok') && (
                <button
                  onClick={() => handleFixAll(filteredItems)}
                  disabled={isFixingAll}
                  className="px-3.5 py-1.5 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all active:scale-95 cursor-pointer shrink-0"
                >
                  <Wrench className={`w-3.5 h-3.5 ${isFixingAll ? 'animate-spin' : ''}`} />
                  <span>{isFixingAll ? 'Corrigindo...' : 'Corrigir Filtrados'}</span>
                </button>
              )}
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900/80 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="py-3.5 px-4 sm:px-6">Nome do Recurso</th>
                    <th className="py-3.5 px-4">Tipo</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Latência</th>
                    <th className="py-3.5 px-4 sm:px-6">Detalhes</th>
                    <th className="py-3.5 px-4 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        Nenhum recurso encontrado para os filtros selecionados.
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((item, idx) => (
                      <tr 
                        key={`${item.name}-${idx}`}
                        onClick={() => setSelectedItem(item)}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-750 transition-colors cursor-pointer"
                      >
                        <td className="py-3.5 px-4 sm:px-6 font-bold font-mono text-slate-800 dark:text-slate-200 flex items-center gap-2">
                          <Database className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          <span>{item.name}</span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            item.type.startsWith('firestore')
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                              : 'bg-teal-500/10 text-teal-600 dark:text-teal-400'
                          }`}>
                            {item.type.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            item.status === 'ok'
                              ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
                              : item.status === 'warning'
                              ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/20'
                              : item.status === 'missing' || item.status === 'error'
                              ? 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/20'
                              : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                          }`}>
                            {item.status === 'ok' && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
                            {item.status === 'warning' && <AlertTriangle className="w-3 h-3 text-amber-500" />}
                            {item.status === 'missing' && <XCircle className="w-3 h-3 text-rose-500" />}
                            <span>{item.status.toUpperCase()}</span>
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-500 dark:text-slate-400">
                          {item.latencyMs ? `${item.latencyMs}ms` : '--'}
                        </td>
                        <td className="py-3.5 px-4 sm:px-6 text-slate-600 dark:text-slate-300 truncate max-w-xs">
                          {item.details || 'Tabela e índices íntegros'}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {item.status !== 'ok' ? (
                            <button
                              onClick={(e) => handleFixResource(item, e)}
                              disabled={fixingResource === item.name}
                              className="px-3 py-1 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-[11px] inline-flex items-center gap-1 transition-all active:scale-95 cursor-pointer shadow-xs"
                            >
                              <Wrench className={`w-3 h-3 ${fixingResource === item.name ? 'animate-spin' : ''}`} />
                              <span>{fixingResource === item.name ? 'Corrigindo...' : 'Corrigir'}</span>
                            </button>
                          ) : (
                            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              OK
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Integridade do Esquema & Migrações */}
      {activeSubTab === 'schema' && (
        <div className="space-y-6 animate-fade-in">
          {/* SQL Migrations Section */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-base text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <Code className="w-5 h-5 text-emerald-500" />
                  Migrações SQL Automáticas (Supabase / PostgreSQL)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Scripts SQL prontos para criar tabelas ausentes e índices compostos no banco relacional.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {report?.items.some(i => i.status === 'missing' || i.status === 'warning' || i.status === 'error') && (
                  <button
                    onClick={() => handleFixAll()}
                    disabled={isFixingAll}
                    className="px-4 py-2 rounded-full bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                  >
                    <Wrench className={`w-4 h-4 ${isFixingAll ? 'animate-spin' : ''}`} />
                    <span>{isFixingAll ? 'Aplicando...' : 'Aplicar e Corrigir Esquema'}</span>
                  </button>
                )}
                {report?.suggestedSqlMigrations && report.suggestedSqlMigrations.length > 0 && (
                  <button
                    onClick={() => copyToClipboard(report.suggestedSqlMigrations.join('\n\n'))}
                    className="px-4 py-2 rounded-full bg-slate-800 hover:bg-slate-700 active:scale-95 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    {copiedSql ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedSql ? 'Copiado!' : 'Copiar Migrações'}</span>
                  </button>
                )}
              </div>
            </div>

            {report?.suggestedSqlMigrations && report.suggestedSqlMigrations.length > 0 ? (
              <div className="relative rounded-2xl bg-slate-900 text-slate-200 p-4 font-mono text-xs overflow-x-auto border border-slate-800 max-h-96">
                <pre>{report.suggestedSqlMigrations.join('\n\n')}</pre>
              </div>
            ) : (
              <div className="p-6 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                <h4 className="font-bold text-sm text-emerald-900 dark:text-emerald-200">
                  Esquema Relacional 100% Sincronizado!
                </h4>
                <p className="text-xs text-emerald-700 dark:text-emerald-400 max-w-md mx-auto">
                  Não há migrações SQL pendentes. Todas as tabelas e índices necessários já estão ativos ou o aplicativo está operando com sucesso no Firestore nativo.
                </p>
              </div>
            )}
          </div>

          {/* Firestore Composite Indexes Section */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-base text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <Flame className="w-5 h-5 text-amber-500" />
                  Índices Compostos do Firestore (firestore.indexes.json)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Estrutura de índices compostos para ordenações e consultas simultâneas ultra-rápidas.
                </p>
              </div>

              {report?.suggestedFirestoreIndexes && (
                <button
                  onClick={() => copyToClipboard(JSON.stringify(report.suggestedFirestoreIndexes, null, 2), true)}
                  className="px-4 py-2 rounded-full bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shrink-0 border border-slate-700"
                >
                  {copiedIndexes ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-400" />}
                  <span>{copiedIndexes ? 'Copiado!' : 'Copiar JSON de Índices'}</span>
                </button>
              )}
            </div>

            <div className="relative rounded-2xl bg-slate-900 text-emerald-400 p-4 font-mono text-xs overflow-x-auto border border-slate-800 max-h-80">
              <pre>{JSON.stringify(report?.suggestedFirestoreIndexes || {}, null, 2)}</pre>
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: Logs de Sistema & Auditoria de Esquema */}
      {activeSubTab === 'logs' && (
        <div className="space-y-6 animate-fade-in">
          {/* Header & Quick Controls */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-base text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <History className="w-5 h-5 text-emerald-500" />
                  Logs de Sistema & Histórico de Verificações de Esquema
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Histórico detalhado das auditorias automáticas e manuais do <code className="text-emerald-600 dark:text-emerald-400 font-mono">databaseIntegrityMonitor</code> com diagnóstico e resolução automática via botão 'Corrigir'.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => handleRunAudit(true)}
                  disabled={isLoading}
                  className="px-4 py-2 rounded-full bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                  <span>{isLoading ? 'Verificando...' : 'Nova Auditoria'}</span>
                </button>

                {report?.items.some(i => i.status !== 'ok') && (
                  <button
                    onClick={() => handleFixAll()}
                    disabled={isFixingAll}
                    className="px-4 py-2 rounded-full bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                  >
                    <Wrench className={`w-3.5 h-3.5 ${isFixingAll ? 'animate-spin' : ''}`} />
                    <span>{isFixingAll ? 'Corrigindo...' : 'Corrigir Todos os Problemas'}</span>
                  </button>
                )}

                {auditHistory.length > 0 && (
                  <button
                    onClick={handleClearAuditHistory}
                    className="p-2 rounded-full bg-slate-100 dark:bg-slate-700 hover:bg-rose-100 dark:hover:bg-rose-950/40 text-slate-600 dark:text-slate-300 hover:text-rose-600 transition-colors cursor-pointer"
                    title="Limpar Histórico de Logs"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Quick Summary Pill Bar */}
            <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-slate-100 dark:border-slate-700">
              <span className="text-xs font-bold text-slate-400">Filtrar Histórico:</span>
              <button
                onClick={() => setHistoryFilter('all')}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  historyFilter === 'all'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                Todos ({auditHistory.length})
              </button>
              <button
                onClick={() => setHistoryFilter('startup_auto')}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  historyFilter === 'startup_auto'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100'
                }`}
              >
                Inicialização ({auditHistory.filter(h => h.trigger === 'startup_auto').length})
              </button>
              <button
                onClick={() => setHistoryFilter('manual_admin')}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  historyFilter === 'manual_admin'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100'
                }`}
              >
                Manual Admin ({auditHistory.filter(h => h.trigger === 'manual_admin').length})
              </button>
              <button
                onClick={() => setHistoryFilter('fix_verification')}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  historyFilter === 'fix_verification'
                    ? 'bg-teal-600 text-white'
                    : 'bg-teal-50 dark:bg-teal-950/30 text-teal-700 dark:text-teal-300 hover:bg-teal-100'
                }`}
              >
                Pós-Correção ({auditHistory.filter(h => h.trigger === 'fix_verification').length})
              </button>
              <button
                onClick={() => setHistoryFilter('issues_only')}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  historyFilter === 'issues_only'
                    ? 'bg-amber-600 text-white'
                    : 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 hover:bg-amber-100'
                }`}
              >
                Com Pendências ({auditHistory.filter(h => h.missingCount > 0 || h.warningCount > 0 || h.errorCount > 0).length})
              </button>
            </div>
          </div>

          {/* Actionable Detected Issues Alert (if any currently missing or warning) */}
          {report?.items.some(i => i.status === 'missing' || i.status === 'error' || i.status === 'warning') && (
            <div className="p-6 rounded-3xl bg-amber-50/80 dark:bg-amber-950/20 border border-amber-300 dark:border-amber-800/60 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
                  <div>
                    <h4 className="font-bold text-sm text-amber-900 dark:text-amber-200">
                      Recursos Ausentes ou com Inconsistências Detectados
                    </h4>
                    <p className="text-xs text-amber-700 dark:text-amber-400">
                      Clique no botão <strong>'Corrigir'</strong> ao lado de cada recurso para inicializá-lo ou sincronizar o esquema automaticamente.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleFixAll()}
                  disabled={isFixingAll}
                  className="px-4 py-2 rounded-full bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer shrink-0"
                >
                  <Wrench className={`w-3.5 h-3.5 ${isFixingAll ? 'animate-spin' : ''}`} />
                  <span>{isFixingAll ? 'Corrigindo...' : 'Corrigir Todos'}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {report.items
                  .filter(i => i.status === 'missing' || i.status === 'error' || i.status === 'warning')
                  .map((item, idx) => (
                    <div 
                      key={`action-issue-${item.name}-${idx}`}
                      className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/90 border border-amber-200 dark:border-amber-800/40 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            item.status === 'missing' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                          }`}>
                            {item.status}
                          </span>
                          <span className="font-bold text-xs text-slate-800 dark:text-slate-200 font-mono truncate">
                            {item.name}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                          {item.recommendedFix || item.details}
                        </p>
                      </div>

                      <button
                        onClick={(e) => handleFixResource(item, e)}
                        disabled={fixingResource === item.name}
                        className="px-3.5 py-1.5 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs inline-flex items-center gap-1 shadow-sm transition-all active:scale-95 cursor-pointer shrink-0"
                      >
                        <Wrench className={`w-3 h-3 ${fixingResource === item.name ? 'animate-spin' : ''}`} />
                        <span>{fixingResource === item.name ? 'Corrigindo...' : 'Corrigir'}</span>
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Audit History Log Timeline */}
          <div className="space-y-3">
            <h4 className="font-bold text-sm text-slate-700 dark:text-slate-300 px-1 flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-500" />
              Linha do Tempo das Auditorias de Esquema ({auditHistory.length} registros)
            </h4>

            {auditHistory.length === 0 ? (
              <div className="p-8 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center space-y-3">
                <ShieldCheck className="w-10 h-10 text-emerald-500 mx-auto" />
                <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">
                  Nenhum log de auditoria gravado ainda
                </h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Clique em 'Nova Auditoria' acima para disparar uma verificação completa e registrar o primeiro log de integridade.
                </p>
                <button
                  onClick={() => handleRunAudit(true)}
                  className="px-4 py-2 rounded-full bg-emerald-500 text-white font-bold text-xs hover:bg-emerald-600 cursor-pointer"
                >
                  Executar Primeira Auditoria
                </button>
              </div>
            ) : (
              auditHistory
                .filter(entry => {
                  if (historyFilter === 'startup_auto') return entry.trigger === 'startup_auto';
                  if (historyFilter === 'manual_admin') return entry.trigger === 'manual_admin';
                  if (historyFilter === 'fix_verification') return entry.trigger === 'fix_verification';
                  if (historyFilter === 'issues_only') return entry.missingCount > 0 || entry.warningCount > 0 || entry.errorCount > 0;
                  return true;
                })
                .map((entry) => {
                  const isExpanded = expandedHistoryId === entry.id;
                  const hasIssues = entry.missingCount > 0 || entry.warningCount > 0 || entry.errorCount > 0;

                  return (
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`rounded-3xl border transition-all ${
                        hasIssues 
                          ? 'bg-white dark:bg-slate-800 border-amber-200 dark:border-amber-800/40 shadow-xs' 
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-xs'
                      }`}
                    >
                      {/* Entry Header */}
                      <div 
                        onClick={() => setExpandedHistoryId(isExpanded ? null : entry.id)}
                        className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-750/50 rounded-3xl transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 ${
                            entry.overallHealthy 
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
                              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                          }`}>
                            {entry.overallHealthy ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                          </div>

                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-100">
                                {new Date(entry.timestamp).toLocaleString()}
                              </span>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                entry.trigger === 'startup_auto' 
                                  ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300'
                                  : entry.trigger === 'manual_admin'
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                                  : entry.trigger === 'fix_verification'
                                  ? 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300'
                                  : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                              }`}>
                                {entry.trigger === 'startup_auto' ? 'Inicialização' : entry.trigger === 'manual_admin' ? 'Manual Admin' : entry.trigger === 'fix_verification' ? 'Pós-Correção' : 'Periódico'}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-0.5">
                              <span>Duração: <strong className="text-slate-600 dark:text-slate-300">{entry.durationMs}ms</strong></span>
                              <span>Total Checado: <strong className="text-slate-600 dark:text-slate-300">{entry.totalChecked} recursos</strong></span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 self-end sm:self-center">
                          <div className="flex items-center gap-1.5">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                              entry.score >= 90
                                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                                : entry.score >= 70
                                ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400'
                                : 'bg-rose-500/15 text-rose-700 dark:text-rose-400'
                            }`}>
                              Score: {entry.score}%
                            </span>

                            {hasIssues ? (
                              <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[11px] font-bold">
                                {entry.missingCount + entry.warningCount + entry.errorCount} pendências
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold">
                                100% OK
                              </span>
                            )}
                          </div>

                          {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                        </div>
                      </div>

                      {/* Entry Expanded Details */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="border-t border-slate-100 dark:border-slate-700 p-4 sm:p-5 space-y-4"
                          >
                            <div className="flex items-center justify-between">
                              <h5 className="font-bold text-xs text-slate-700 dark:text-slate-300">
                                Diagnóstico Item a Item do Snapshot:
                              </h5>
                              {entry.items.some(i => i.status !== 'ok') && (
                                <button
                                  onClick={() => handleFixAll(entry.items)}
                                  disabled={isFixingAll}
                                  className="px-3 py-1 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-[11px] flex items-center gap-1 shadow-xs cursor-pointer"
                                >
                                  <Wrench className={`w-3 h-3 ${isFixingAll ? 'animate-spin' : ''}`} />
                                  <span>{isFixingAll ? 'Corrigindo...' : 'Corrigir Itens deste Log'}</span>
                                </button>
                              )}
                            </div>

                            <div className="divide-y divide-slate-100 dark:divide-slate-700/60 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden bg-slate-50/50 dark:bg-slate-900/40">
                              {entry.items.map((item, itemIdx) => (
                                <div 
                                  key={`history-item-${entry.id}-${item.name}-${itemIdx}`}
                                  className="p-3 sm:p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <Database className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                    <span className="font-bold font-mono text-slate-800 dark:text-slate-200 truncate">
                                      {item.name}
                                    </span>
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 uppercase">
                                      {item.type.replace('_', ' ')}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-3 self-end sm:self-center">
                                    {item.latencyMs && (
                                      <span className="font-mono text-slate-400 text-[11px]">
                                        {item.latencyMs}ms
                                      </span>
                                    )}

                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                      item.status === 'ok'
                                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                        : item.status === 'warning'
                                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                        : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                                    }`}>
                                      {item.status}
                                    </span>

                                    {item.status !== 'ok' ? (
                                      <button
                                        onClick={(e) => handleFixResource(item, e)}
                                        disabled={fixingResource === item.name}
                                        className="px-2.5 py-1 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-[10px] inline-flex items-center gap-1 shadow-xs transition-all active:scale-95 cursor-pointer"
                                      >
                                        <Wrench className={`w-2.5 h-2.5 ${fixingResource === item.name ? 'animate-spin' : ''}`} />
                                        <span>{fixingResource === item.name ? 'Corrigindo...' : 'Corrigir'}</span>
                                      </button>
                                    ) : null}
                                  </div>
                                </div>
                              ))}
                            </div>

                            {/* Migrations if present in entry */}
                            {entry.suggestedSqlMigrations && entry.suggestedSqlMigrations.length > 0 && (
                              <div className="space-y-1.5">
                                <span className="font-bold text-[11px] text-slate-400">Migrações SQL Sugeridas:</span>
                                <pre className="p-3 rounded-xl bg-slate-900 text-emerald-400 font-mono text-[10px] overflow-x-auto max-h-40">
                                  {entry.suggestedSqlMigrations.join('\n\n')}
                                </pre>
                              </div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })
            )}
          </div>

          {/* Developer Live Terminal & Global API Interface */}
          <div className="p-6 rounded-3xl bg-slate-900 text-slate-200 border border-slate-800 shadow-xl space-y-4 font-mono">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-slate-300">Developer Diagnostic Console & API Engine</span>
              </div>
              <span className="text-[11px] text-slate-500 font-mono">window.__NUTRI_DB_INTEGRITY__</span>
            </div>

            <div className="space-y-1.5 text-xs leading-relaxed max-h-72 overflow-y-auto pr-1">
              <p className="text-emerald-400">[INFO] NutriAI Database Integrity Engine v2.4 initialized and monitoring.</p>
              <p className="text-indigo-400">[BACKUP] Critical storage vault: system_backups/critical_vault ({backupConfig.enabled ? `Periodic ${backupConfig.intervalHours}h` : 'Manual'})</p>
              <p className="text-slate-400">[AUDIT] Latest verified snapshot: {lastCheckTime ? lastCheckTime.toLocaleString() : 'N/A'}</p>
              {report?.items.map((item, idx) => (
                <p key={`term-log-${idx}`} className={`text-[11px] ${
                  item.status === 'ok' ? 'text-slate-400' : item.status === 'warning' ? 'text-amber-400' : 'text-rose-400'
                }`}>
                  [{item.status.toUpperCase()}] {item.type.toUpperCase()}: <span className="text-slate-200 font-bold">{item.name}</span> {item.latencyMs ? `(${item.latencyMs}ms)` : ''} - {item.details || 'OK'}
                </p>
              ))}
              <p className="text-sky-400">[DONE] Audit score: {report?.score}/100. Status: {report?.overallHealthy ? 'HEALTHY' : 'WARNING'}</p>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400 space-y-1">
              <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Comandos do Console DevTools:</span>
              </div>
              <ul className="list-disc list-inside space-y-0.5 text-slate-400 pl-1 font-mono text-[10px]">
                <li><code className="text-emerald-300">window.__NUTRI_DB_INTEGRITY__.getHistory()</code>: Retorna o array de logs históricos</li>
                <li><code className="text-emerald-300">window.__NUTRI_DB_INTEGRITY__.runCheck()</code>: Executa uma auditoria completa síncrona</li>
                <li><code className="text-emerald-300">window.__NUTRI_DB_INTEGRITY__.fixResource(item)</code>: Cria/corrige a tabela ou coleção ausente</li>
                <li><code className="text-emerald-300">window.__NUTRI_DB_INTEGRITY__.fixAll(items)</code>: Corrige todas as pendências em lote</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: Logs de Sistema (Tempo Real) */}
      {activeSubTab === 'system_logs' && (
        <div className="animate-fade-in">
          <SystemLogsView 
            addNotification={(title, msg, type) => {
              showToast(`${title}: ${msg}`, type === 'error' ? 'error' : 'success');
            }} 
          />
        </div>
      )}

      {/* Tab 6: Desempenho & Saúde das APIs de IA */}
      {activeSubTab === 'ai_performance' && (
        <div className="animate-fade-in">
          <AiPerformanceView />
        </div>
      )}

      {/* Modal de Detalhes do Snapshot do Backup */}
      <AnimatePresence>
        {inspectingBackup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
                <div className="flex items-center gap-2">
                  <Archive className="w-5 h-5 text-indigo-500" />
                  <h3 className="font-bold text-base text-slate-800 dark:text-slate-100 font-mono truncate">
                    {inspectingBackup.backupId}
                  </h3>
                </div>
                <button
                  onClick={() => setInspectingBackup(null)}
                  className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 cursor-pointer"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300 max-h-96 overflow-y-auto pr-1">
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-700/60">
                  <span className="font-bold">Data de Criação:</span>
                  <span>{new Date(inspectingBackup.timestamp).toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-700/60">
                  <span className="font-bold">Tamanho do Arquivo:</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">{inspectingBackup.formattedSize}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-700/60">
                  <span className="font-bold">Total de Registros:</span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">{inspectingBackup.totalRecords} itens</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-700/60">
                  <span className="font-bold">Origem:</span>
                  <span className="font-semibold">{inspectingBackup.triggeredBy === 'auto_periodic' ? 'Agendador Automático' : 'Manual pelo Admin'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-700/60">
                  <span className="font-bold">Destino no Bucket:</span>
                  <span className="font-mono">{inspectingBackup.targetBucket}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-700/60">
                  <span className="font-bold">Integridade Checksum:</span>
                  <span className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400">{inspectingBackup.checksum}</span>
                </div>

                <div>
                  <span className="font-bold block mb-1">Registros por Coleção:</span>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono text-[11px] grid grid-cols-2 gap-2">
                    {Object.entries(inspectingBackup.collectionCounts).map(([col, num]) => (
                      <div key={col} className="flex justify-between">
                        <span className="text-slate-400">{col}:</span>
                        <span className="font-bold text-slate-200">{num}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  onClick={() => {
                    handleDownloadSnapshot(inspectingBackup);
                    setInspectingBackup(null);
                  }}
                  className="flex-1 py-2.5 rounded-full bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Download className="w-4 h-4" />
                  <span>Baixar JSON</span>
                </button>
                <button
                  onClick={() => setInspectingBackup(null)}
                  className="px-5 py-2.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs hover:bg-slate-200 cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal de Confirmação de Restauração */}
      <AnimatePresence>
        {restoreConfirmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-800 border border-amber-500/40 p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-3 text-amber-500">
                <AlertTriangle className="w-7 h-7" />
                <h3 className="font-bold text-base text-slate-800 dark:text-slate-100">
                  Restaurar Snapshot de Dados
                </h3>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Você está prestes a restaurar o snapshot <strong>{restoreConfirmModal.backupId}</strong> gerado em <strong>{new Date(restoreConfirmModal.timestamp).toLocaleString()}</strong>.
              </p>

              <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 text-xs text-amber-800 dark:text-amber-300 space-y-1">
                <p className="font-bold">⚠️ Atenção:</p>
                <p>Planos alimentares, inventário da geladeira e logs de saúde locais serão atualizados com os dados deste snapshot.</p>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  onClick={() => setRestoreConfirmModal(null)}
                  disabled={isRestoring}
                  className="flex-1 py-2.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs hover:bg-slate-200 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleExecuteRestore}
                  disabled={isRestoring}
                  className="flex-1 py-2.5 rounded-full bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md"
                >
                  <RotateCcw className={`w-4 h-4 ${isRestoring ? 'animate-spin' : ''}`} />
                  <span>{isRestoring ? 'Restaurando...' : 'Confirmar Restauração'}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal de Detalhes do Item de Integridade */}
      <AnimatePresence>
        {selectedItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
                <div className="flex items-center gap-2">
                  <Database className="w-5 h-5 text-emerald-500" />
                  <h3 className="font-bold text-base text-slate-800 dark:text-slate-100 font-mono">
                    {selectedItem.name}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedItem(null)}
                  className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 cursor-pointer"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-700/60">
                  <span className="font-bold">Tipo:</span>
                  <span className="font-mono">{selectedItem.type}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-700/60">
                  <span className="font-bold">Status:</span>
                  <span className={`font-bold uppercase ${
                    selectedItem.status === 'ok' 
                      ? 'text-emerald-600 dark:text-emerald-400' 
                      : selectedItem.status === 'warning' 
                      ? 'text-amber-600 dark:text-amber-400' 
                      : 'text-rose-600 dark:text-rose-400'
                  }`}>
                    {selectedItem.status}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-700/60">
                  <span className="font-bold">Tempo de Resposta:</span>
                  <span className="font-mono">{selectedItem.latencyMs ? `${selectedItem.latencyMs} ms` : 'N/A'}</span>
                </div>
                <div>
                  <span className="font-bold block mb-1">Diagnóstico Detalhado:</span>
                  <p className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono text-[11px] leading-relaxed">
                    {selectedItem.details || 'Recurso verificado com sucesso sem anomalias detectadas.'}
                  </p>
                </div>
                {selectedItem.recommendedFix && (
                  <div>
                    <span className="font-bold block mb-1 text-amber-600 dark:text-amber-400">Correção Recomendada:</span>
                    <pre className="p-3 rounded-xl bg-slate-900 text-amber-300 font-mono text-[11px] overflow-x-auto">
                      {selectedItem.recommendedFix}
                    </pre>
                  </div>
                )}
              </div>

              <div className="pt-2 flex gap-2">
                {selectedItem.status !== 'ok' && (
                  <button
                    onClick={() => {
                      handleFixResource(selectedItem);
                      setSelectedItem(null);
                    }}
                    disabled={fixingResource === selectedItem.name}
                    className="flex-1 py-2.5 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-md"
                  >
                    <Wrench className={`w-3.5 h-3.5 ${fixingResource === selectedItem.name ? 'animate-spin' : ''}`} />
                    <span>{fixingResource === selectedItem.name ? 'Corrigindo...' : 'Corrigir Recurso'}</span>
                  </button>
                )}
                <button
                  onClick={() => setSelectedItem(null)}
                  className={`${selectedItem.status !== 'ok' ? 'px-5' : 'w-full'} py-2.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs hover:bg-slate-200 cursor-pointer`}
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
