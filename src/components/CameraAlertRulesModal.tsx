import React, { useState } from 'react';
import { SecurityRule, CameraAlert } from '../types/cameraAlerts';
import { 
  X, 
  ShieldCheck, 
  Sliders, 
  History, 
  Bell, 
  Play, 
  Check, 
  AlertTriangle, 
  ShieldAlert, 
  Clock, 
  Eye, 
  ToggleLeft, 
  ToggleRight,
  Zap,
  Sparkles
} from 'lucide-react';

interface CameraAlertRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  rules: SecurityRule[];
  onToggleRule: (ruleId: string) => void;
  alerts: CameraAlert[];
  onViewAlert: (alert: CameraAlert) => void;
  onResolveAlert: (alertId: string) => void;
  onSimulateAlert: (ruleId?: string) => void;
}

export const CameraAlertRulesModal: React.FC<CameraAlertRulesModalProps> = ({
  isOpen,
  onClose,
  rules,
  onToggleRule,
  alerts,
  onViewAlert,
  onResolveAlert,
  onSimulateAlert
}) => {
  const [activeTab, setActiveTab] = useState<'rules' | 'history'>('rules');
  const [selectedRuleToSimulate, setSelectedRuleToSimulate] = useState<string>(rules[0]?.id || '');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[28px] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col relative animate-in zoom-in-95 duration-200 max-h-[90vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-lg">
                Alertas Inteligentes & Regras de IA
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Configure gatilhos automatizados e visualize o histórico de segurança
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition-colors"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-100 dark:border-slate-800 px-6 bg-slate-50/50 dark:bg-slate-950/40">
          <button
            onClick={() => setActiveTab('rules')}
            className={`py-3.5 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'rules'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <Sliders className="w-4 h-4" />
            Regras Ativas ({rules.filter(r => r.enabled).length}/{rules.length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`py-3.5 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'history'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <History className="w-4 h-4" />
            Histórico ({alerts.length})
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {activeTab === 'rules' && (
            <div className="space-y-4">
              {/* Quick Simulation Bar */}
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-emerald-500" />
                    Simulador de Eventos em Tempo Real
                  </h4>
                  <p className="text-[11px] text-emerald-600/80 dark:text-emerald-400/80">
                    Dispare um teste para validar a notificação push e o alerta na tela.
                  </p>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <select
                    value={selectedRuleToSimulate}
                    onChange={e => setSelectedRuleToSimulate(e.target.value)}
                    className="p-2 text-xs bg-white dark:bg-slate-900 border border-emerald-500/30 rounded-xl text-slate-800 dark:text-white outline-none"
                  >
                    {rules.map(r => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => onSimulateAlert(selectedRuleToSimulate)}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shrink-0 shadow-sm"
                  >
                    <Play className="w-3.5 h-3.5" />
                    Disparar Teste
                  </button>
                </div>
              </div>

              {/* Rules List */}
              <div className="space-y-3">
                {rules.map(rule => (
                  <div
                    key={rule.id}
                    className={`p-4 rounded-2xl border transition-all ${
                      rule.enabled
                        ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-950/60 border-slate-200/50 dark:border-slate-800/40 opacity-60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider ${
                            rule.severity === 'critical'
                              ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                              : rule.severity === 'warning'
                              ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                              : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                          }`}>
                            {rule.severity === 'critical' ? 'Crítico' : rule.severity === 'warning' ? 'Atenção' : 'Informativo'}
                          </span>
                          <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                            {rule.name}
                          </h4>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {rule.description}
                        </p>
                        <div className="pt-2 text-[11px] font-mono text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                          <span className="font-bold text-slate-600 dark:text-slate-300">Gatilho:</span>
                          <span>{rule.triggerCondition}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => onToggleRule(rule.id)}
                        className="text-slate-400 hover:text-emerald-500 transition-colors p-1"
                        title={rule.enabled ? "Desativar regra" : "Ativar regra"}
                      >
                        {rule.enabled ? (
                          <ToggleRight className="w-8 h-8 text-emerald-500" />
                        ) : (
                          <ToggleLeft className="w-8 h-8 text-slate-400" />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-3">
              {alerts.length === 0 ? (
                <div className="text-center py-12 text-slate-400 dark:text-slate-500 space-y-2">
                  <ShieldCheck className="w-12 h-12 mx-auto text-emerald-500/40" />
                  <p className="font-semibold text-sm">Nenhuma ocorrência registrada no período</p>
                  <p className="text-xs">O sistema está operando normalmente com 100% de conformidade.</p>
                </div>
              ) : (
                alerts.map(alert => (
                  <div
                    key={alert.id}
                    className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                      alert.status === 'resolved'
                        ? 'bg-slate-50 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800/60 opacity-70'
                        : alert.severity === 'critical'
                        ? 'bg-rose-500/5 dark:bg-rose-500/10 border-rose-500/30'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        {alert.severity === 'critical' ? (
                          <ShieldAlert className="w-4 h-4 text-rose-500" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-amber-500" />
                        )}
                        <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                          {alert.title}
                        </h4>
                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                          alert.status === 'resolved'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-rose-500/20 text-rose-400'
                        }`}>
                          {alert.status === 'resolved' ? 'Resolvido' : 'Pendente'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {alert.cameraName} • {alert.location}
                      </p>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400">
                        <Clock className="w-3 h-3" />
                        <span>{alert.timestamp} ({alert.timeAgo})</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                      <button
                        onClick={() => onViewAlert(alert)}
                        className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center gap-1.5"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Ver Detalhes
                      </button>
                      {alert.status !== 'resolved' && (
                        <button
                          onClick={() => onResolveAlert(alert.id)}
                          className="px-3 py-1.5 bg-emerald-500 text-white rounded-xl text-xs font-bold hover:bg-emerald-600 transition-colors flex items-center gap-1.5"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Resolver
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80 flex items-center justify-between pb-[max(1rem,env(safe-area-inset-bottom))]">
          <span className="text-xs text-slate-500 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            NutriAI Guard Engine Ativo
          </span>
          <button
            onClick={onClose}
            className="min-h-[44px] px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition-colors flex items-center justify-center"
          >
            Concluir
          </button>
        </div>

      </div>
    </div>
  );
};
