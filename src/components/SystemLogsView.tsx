import React, { useState, useEffect, useRef } from 'react';
import { 
  Terminal, Activity, RefreshCw, Play, Pause, Clock, Search, Filter, 
  Trash2, Download, CheckCircle2, AlertTriangle, XCircle, Info, 
  ChevronDown, ChevronUp, Zap, Database, ShieldAlert, Wrench, Sparkles, AlertOctagon
} from 'lucide-react';
import { 
  getIntegrityAuditHistory, 
  clearIntegrityAuditHistory, 
  checkDatabaseIntegrity, 
  fixMissingResource, 
  AuditHistoryEntry, 
  IntegrityCheckItem,
  AuditTriggerType
} from '../lib/databaseIntegrityMonitor';
import { playSfx, vibrate } from '../lib/sensory';

interface SystemLogsViewProps {
  addNotification?: (title: string, message: string, type: 'info' | 'success' | 'warning' | 'error') => void;
}

export function SystemLogsView({ addNotification }: SystemLogsViewProps) {
  const [logs, setLogs] = useState<AuditHistoryEntry[]>(() => getIntegrityAuditHistory());
  const [isPollingActive, setIsPollingActive] = useState<boolean>(true);
  const [pollingIntervalMs, setPollingIntervalMs] = useState<number>(3000); // 3 seconds real-time polling
  const [isCheckingNow, setIsCheckingNow] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [triggerFilter, setTriggerFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [fixingItemName, setFixingItemName] = useState<string | null>(null);
  const [lastPolledAt, setLastPolledAt] = useState<Date>(new Date());

  const pollingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Load latest logs from storage and update state
  const refreshLogs = () => {
    const updated = getIntegrityAuditHistory();
    setLogs(updated);
    setLastPolledAt(new Date());
  };

  // Setup Real-time Polling + Event Subscribers
  useEffect(() => {
    // 1. Initial load
    refreshLogs();

    // 2. Custom Event Listeners for instant push updates
    const handleHistoryUpdated = (e: Event) => {
      const customEv = e as CustomEvent<AuditHistoryEntry[]>;
      if (customEv.detail) {
        setLogs(customEv.detail);
      } else {
        refreshLogs();
      }
      setLastPolledAt(new Date());
    };

    const handleCheckedEvent = () => {
      refreshLogs();
    };

    window.addEventListener('nutri:db-integrity-history-updated', handleHistoryUpdated);
    window.addEventListener('nutri:db-integrity-checked', handleCheckedEvent);

    return () => {
      window.removeEventListener('nutri:db-integrity-history-updated', handleHistoryUpdated);
      window.removeEventListener('nutri:db-integrity-checked', handleCheckedEvent);
    };
  }, []);

  // Polling Loop Effect
  useEffect(() => {
    if (pollingTimerRef.current) {
      clearInterval(pollingTimerRef.current);
      pollingTimerRef.current = null;
    }

    if (isPollingActive && pollingIntervalMs > 0) {
      pollingTimerRef.current = setInterval(() => {
        refreshLogs();
      }, pollingIntervalMs);
    }

    return () => {
      if (pollingTimerRef.current) {
        clearInterval(pollingTimerRef.current);
      }
    };
  }, [isPollingActive, pollingIntervalMs]);

  // Execute immediate check
  const handleRunImmediateAudit = async (trigger: AuditTriggerType = 'manual_admin') => {
    vibrate(10);
    playSfx('tap');
    setIsCheckingNow(true);
    try {
      await checkDatabaseIntegrity({ force: true, trigger });
      refreshLogs();
      if (addNotification) {
        addNotification('Verificação Executada', 'Nova auditoria gravada nos logs em tempo real.', 'info');
      }
    } catch (err: any) {
      console.error('[SystemLogsView] Erro na auditoria:', err);
      if (addNotification) {
        addNotification('Erro na Verificação', err.message || 'Falha ao executar auditoria', 'error');
      }
    } finally {
      setIsCheckingNow(false);
    }
  };

  // Clear logs history
  const handleClearLogs = () => {
    vibrate(20);
    playSfx('pop');
    if (window.confirm('Deseja realmente limpar todo o histórico de logs de integridade do sistema?')) {
      clearIntegrityAuditHistory();
      refreshLogs();
      if (addNotification) {
        addNotification('Logs Limpos', 'O histórico de verificações foi resetado.', 'info');
      }
    }
  };

  // Export logs to JSON
  const handleExportLogs = () => {
    vibrate(10);
    playSfx('tap');
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(logs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `nutriai_system_logs_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    if (addNotification) {
      addNotification('Logs Exportados', 'Arquivo JSON de histórico de integridade gerado.', 'success');
    }
  };

  // Fix an individual resource from log breakdown
  const handleFixResourceItem = async (item: IntegrityCheckItem) => {
    vibrate(15);
    playSfx('crystal');
    setFixingItemName(item.name);
    try {
      const res = await fixMissingResource(item);
      if (res.success) {
        if (addNotification) {
          addNotification('Recurso Corrigido', res.message, 'success');
        }
        await checkDatabaseIntegrity({ force: true, trigger: 'fix_verification' });
        refreshLogs();
      } else {
        if (addNotification) {
          addNotification('Falha ao Corrigir', res.message, 'warning');
        }
      }
    } catch (err: any) {
      console.error('[SystemLogsView] Erro ao corrigir recurso:', err);
    } finally {
      setFixingItemName(null);
    }
  };

  // Filtering Logic
  const filteredLogs = logs.filter(log => {
    // Search Query match
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const matchId = log.id.toLowerCase().includes(q);
      const matchTrigger = log.trigger.toLowerCase().includes(q);
      const matchItems = log.items.some(i => i.name.toLowerCase().includes(q) || (i.details && i.details.toLowerCase().includes(q)));
      if (!matchId && !matchTrigger && !matchItems) return false;
    }

    // Trigger Filter match
    if (triggerFilter !== 'all' && log.trigger !== triggerFilter) {
      return false;
    }

    // Status Filter match
    if (statusFilter === 'issues_only' && log.overallHealthy) {
      return false;
    }
    if (statusFilter === 'healthy_only' && !log.overallHealthy) {
      return false;
    }

    return true;
  });

  // Calculate stats summary
  const totalAuditsCount = logs.length;
  const avgDurationMs = totalAuditsCount > 0 
    ? Math.round(logs.reduce((acc, l) => acc + (l.durationMs || 0), 0) / totalAuditsCount) 
    : 0;
  const healthyAuditsCount = logs.filter(l => l.overallHealthy).length;
  const successRatePct = totalAuditsCount > 0 
    ? Math.round((healthyAuditsCount / totalAuditsCount) * 100) 
    : 100;

  // Format trigger labels and badge styling
  const getTriggerBadge = (trigger: AuditTriggerType) => {
    switch (trigger) {
      case 'manual_admin':
        return { label: 'ADMIN MANUAL', bg: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' };
      case 'startup_auto':
        return { label: 'STARTUP AUTO', bg: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30' };
      case 'periodic_auto':
        return { label: 'PERIÓDICO AUTO', bg: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30' };
      case 'fix_verification':
        return { label: 'VERIFICAÇÃO FIX', bg: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30' };
      default:
        return { label: 'SISTEMA', bg: 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30' };
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Live Real-Time Polling Status */}
      <div className="clay-card p-6 bg-gradient-to-br from-slate-900 via-slate-900 to-teal-950 text-white border border-teal-500/30 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 font-bold text-xs border border-teal-500/30">
              <Terminal className="w-3.5 h-3.5 text-teal-400" />
              Logs de Sistema em Tempo Real · databaseIntegrityMonitor
            </div>
            <h3 className="font-serif text-2xl font-bold flex items-center gap-3">
              Histórico do Monitor de Integridade
              {isPollingActive && (
                <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  LIVE POLLING
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Acompanhamento contínuo de diagnósticos de banco de dados, falhas de schema, latência e correções acionadas.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 self-start md:self-auto shrink-0">
            {/* Polling Interval Controls */}
            <div className="flex items-center gap-1.5 bg-slate-800/80 p-1.5 rounded-xl border border-slate-700">
              <button
                type="button"
                onClick={() => { setIsPollingActive(!isPollingActive); vibrate(5); }}
                className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  isPollingActive 
                    ? 'bg-emerald-500 text-slate-950' 
                    : 'bg-slate-700 text-slate-300 hover:text-white'
                }`}
                title={isPollingActive ? 'Pausar Polling em Tempo Real' : 'Ativar Polling em Tempo Real'}
              >
                {isPollingActive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{isPollingActive ? 'Ativo' : 'Pausado'}</span>
              </button>

              <select
                value={pollingIntervalMs}
                onChange={(e) => setPollingIntervalMs(Number(e.target.value))}
                className="bg-slate-900 text-xs font-bold text-slate-200 px-2 py-1 rounded-lg border border-slate-700 focus:outline-none focus:border-teal-400 cursor-pointer"
              >
                <option value={2000}>2s (Ultra Rápido)</option>
                <option value={3000}>3s (Tempo Real)</option>
                <option value={5000}>5s (Padrão)</option>
                <option value={10000}>10s (Econômico)</option>
              </select>
            </div>

            <button
              type="button"
              onClick={() => handleRunImmediateAudit('manual_admin')}
              disabled={isCheckingNow}
              className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs transition-all cursor-pointer flex items-center gap-2 shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isCheckingNow ? 'animate-spin' : ''}`} />
              <span>{isCheckingNow ? 'Auditando...' : 'Auditar Agora'}</span>
            </button>
          </div>
        </div>

        {/* Real-time Summary Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 pt-4 border-t border-white/10">
          <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
            <span className="text-[11px] text-slate-400 font-medium">Total de Auditorias</span>
            <p className="text-2xl font-extrabold text-white mt-0.5">{totalAuditsCount}</p>
          </div>
          <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
            <span className="text-[11px] text-slate-400 font-medium">Duração Média</span>
            <p className="text-2xl font-extrabold text-teal-300 mt-0.5">{avgDurationMs}ms</p>
          </div>
          <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
            <span className="text-[11px] text-emerald-300 font-medium">Taxa de Sucesso</span>
            <p className="text-2xl font-extrabold text-emerald-400 mt-0.5">{successRatePct}%</p>
          </div>
          <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
            <span className="text-[11px] text-slate-400 font-medium">Última Atualização Polling</span>
            <p className="text-xs font-mono font-bold text-slate-200 mt-2">
              {lastPolledAt.toLocaleTimeString('pt-BR')}
            </p>
          </div>
        </div>
      </div>

      {/* Action Bar & Search Filters */}
      <div className="clay-card p-4 space-y-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar nos logs por ID, coleção ou detalhe..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white text-xs border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-teal-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
            {/* Filter by Trigger */}
            <select
              value={triggerFilter}
              onChange={(e) => setTriggerFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium border border-slate-200 dark:border-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="all">Gatilho: Todos</option>
              <option value="manual_admin">Gatilho: Admin Manual</option>
              <option value="startup_auto">Gatilho: Startup Auto</option>
              <option value="periodic_auto">Gatilho: Periódico Auto</option>
              <option value="fix_verification">Gatilho: Verificação Fix</option>
            </select>

            {/* Filter by Status */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium border border-slate-200 dark:border-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="all">Status: Todos</option>
              <option value="issues_only">Status: Com Inconsistências</option>
              <option value="healthy_only">Status: 100% Hígidos</option>
            </select>

            {/* Export JSON Button */}
            <button
              type="button"
              onClick={handleExportLogs}
              disabled={logs.length === 0}
              className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 border border-slate-200 dark:border-slate-700"
              title="Exportar logs para JSON"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Exportar JSON</span>
            </button>

            {/* Clear History Button */}
            <button
              type="button"
              onClick={handleClearLogs}
              disabled={logs.length === 0}
              className="px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 border border-rose-500/20"
              title="Limpar histórico de logs"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Limpar</span>
            </button>
          </div>
        </div>
      </div>

      {/* Logs Live Stream Timeline List */}
      <div className="space-y-3">
        {filteredLogs.length === 0 ? (
          <div className="clay-card p-12 text-center space-y-3 border-dashed border-2 border-slate-200 dark:border-slate-800">
            <div className="w-12 h-12 rounded-2xl bg-teal-500/10 text-teal-500 flex items-center justify-center mx-auto">
              <Activity className="w-6 h-6 animate-pulse" />
            </div>
            <h4 className="font-bold text-slate-900 dark:text-white">Nenhum log encontrado</h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Nenhuma verificação de integridade gravada no histórico para os filtros selecionados.
            </p>
            <button
              type="button"
              onClick={() => handleRunImmediateAudit('manual_admin')}
              className="px-4 py-2 rounded-xl bg-teal-600 text-white font-bold text-xs hover:bg-teal-500 transition-all cursor-pointer inline-flex items-center gap-2"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Executar Primeira Auditoria Agora
            </button>
          </div>
        ) : (
          filteredLogs.map((log) => {
            const badge = getTriggerBadge(log.trigger);
            const isExpanded = expandedLogId === log.id;
            const issueCount = (log.missingCount || 0) + (log.warningCount || 0) + (log.errorCount || 0);

            return (
              <div 
                key={log.id}
                className={`clay-card p-4 transition-all border ${
                  log.overallHealthy 
                    ? 'border-slate-200 dark:border-slate-800 hover:border-emerald-500/40' 
                    : 'border-rose-500/40 bg-rose-50/20 dark:bg-rose-950/10'
                }`}
              >
                {/* Main Log Header Row */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {/* Status Icon */}
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                      log.overallHealthy 
                        ? 'bg-emerald-500/15 text-emerald-500' 
                        : 'bg-rose-500/15 text-rose-500'
                    }`}>
                      {log.overallHealthy ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 animate-bounce" />
                      )}
                    </div>

                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-extrabold text-slate-900 dark:text-white">
                          {log.id}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${badge.bg}`}>
                          {badge.label}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {new Date(log.timestamp).toLocaleString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit'
                          })}
                        </span>
                      </div>

                      <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
                        <span>{log.totalChecked || log.items.length} coleções/tabelas verificadas</span>
                        <span>•</span>
                        <span className="font-mono">{log.durationMs}ms latência</span>
                      </p>
                    </div>
                  </div>

                  {/* Right Score & Actions */}
                  <div className="flex items-center gap-3 self-end md:self-auto shrink-0">
                    <div className="text-right">
                      <span className={`text-base font-extrabold font-mono ${
                        log.score >= 90 ? 'text-emerald-500' : log.score >= 75 ? 'text-amber-500' : 'text-rose-500'
                      }`}>
                        Score: {log.score}/100
                      </span>
                      <p className="text-[10px] font-bold text-slate-400">
                        {issueCount > 0 ? `${issueCount} avisos/ausências` : 'Nenhuma inconsistência'}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setExpandedLogId(isExpanded ? null : log.id);
                        vibrate(5);
                      }}
                      className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition-all cursor-pointer flex items-center gap-1 border border-slate-200 dark:border-slate-700"
                    >
                      <span>{isExpanded ? 'Ocultar Detalhes' : 'Detalhes'}</span>
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Expanded Item Breakdown Details */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3 animate-fadeIn">
                    <h5 className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-2">
                      <Database className="w-3.5 h-3.5 text-teal-500" />
                      Detalhamento dos Recursos Verificados ({log.items.length})
                    </h5>

                    <div className="space-y-2 max-h-96 overflow-y-auto pr-1 custom-scrollbar">
                      {log.items.map((item, idx) => {
                        const isFixing = fixingItemName === item.name;
                        const isProblem = item.status === 'missing' || item.status === 'error' || item.status === 'warning';

                        return (
                          <div 
                            key={`${log.id}_item_${idx}`}
                            className={`p-3 rounded-xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                              item.status === 'ok' 
                                ? 'bg-slate-50 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-700/60' 
                                : item.status === 'missing' || item.status === 'error'
                                ? 'bg-rose-500/10 border-rose-500/30'
                                : 'bg-amber-500/10 border-amber-500/30'
                            }`}
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono font-bold text-slate-900 dark:text-white">
                                  {item.name}
                                </span>
                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                  item.status === 'ok' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                                  item.status === 'missing' ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' :
                                  'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                }`}>
                                  {item.status.toUpperCase()}
                                </span>
                                {item.latencyMs !== undefined && (
                                  <span className="text-[10px] text-slate-400 font-mono">
                                    {item.latencyMs}ms
                                  </span>
                                )}
                              </div>

                              {item.details && (
                                <p className="text-[11px] text-slate-600 dark:text-slate-300 font-mono">
                                  {item.details}
                                </p>
                              )}

                              {item.recommendedFix && (
                                <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
                                  <Wrench className="w-3 h-3 shrink-0" />
                                  <span>{item.recommendedFix}</span>
                                </p>
                              )}
                            </div>

                            {/* Fix Button if item has an issue */}
                            {isProblem && (
                              <button
                                type="button"
                                onClick={() => handleFixResourceItem(item)}
                                disabled={isFixing}
                                className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-bold text-[11px] transition-all cursor-pointer flex items-center gap-1 shrink-0 self-start sm:self-auto shadow-xs"
                              >
                                {isFixing ? (
                                  <RefreshCw className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Sparkles className="w-3 h-3 text-amber-300" />
                                )}
                                <span>{isFixing ? 'Corrigindo...' : 'Corrigir Recurso'}</span>
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
