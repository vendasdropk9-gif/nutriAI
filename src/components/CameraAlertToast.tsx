import React, { useEffect, useState } from 'react';
import { CameraAlert } from '../types/cameraAlerts';
import { AlertTriangle, Bell, ShieldAlert, X, Eye, Users, WifiOff } from 'lucide-react';

interface CameraAlertToastProps {
  alert: CameraAlert | null;
  onDismiss: () => void;
  onViewDetails: (alert: CameraAlert) => void;
}

export const CameraAlertToast: React.FC<CameraAlertToastProps> = ({
  alert,
  onDismiss,
  onViewDetails
}) => {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (!alert) return;
    setProgress(100);

    const duration = 10000; // 10s auto-dismiss
    const interval = 100;
    const step = (interval / duration) * 100;

    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev <= step) {
          clearInterval(timer);
          onDismiss();
          return 0;
        }
        return prev - step;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [alert, onDismiss]);

  if (!alert) return null;

  const isCritical = alert.severity === 'critical';
  const isWarning = alert.severity === 'warning';

  const getIcon = () => {
    if (alert.ruleId.includes('crowd')) return <Users className="w-5 h-5 text-amber-500" />;
    if (alert.ruleId.includes('connection')) return <WifiOff className="w-5 h-5 text-rose-500" />;
    if (isCritical) return <ShieldAlert className="w-5 h-5 text-rose-500 animate-pulse" />;
    if (isWarning) return <AlertTriangle className="w-5 h-5 text-amber-500" />;
    return <Bell className="w-5 h-5 text-emerald-500" />;
  };

  return (
    <div className="fixed top-20 right-4 md:right-8 z-[120] max-w-md w-full animate-in slide-in-from-top-4 fade-in duration-300">
      <div className={`rounded-2xl shadow-2xl border backdrop-blur-xl overflow-hidden ${
        isCritical
          ? 'bg-slate-900/95 border-rose-500/40 text-white ring-1 ring-rose-500/30'
          : isWarning
          ? 'bg-slate-900/95 border-amber-500/40 text-white ring-1 ring-amber-500/30'
          : 'bg-slate-900/95 border-emerald-500/40 text-white'
      }`}>
        {/* Progress bar */}
        <div className="w-full h-1 bg-slate-800/80">
          <div
            className={`h-full transition-all duration-100 ease-linear ${
              isCritical ? 'bg-rose-500' : isWarning ? 'bg-amber-500' : 'bg-emerald-500'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className={`p-2.5 rounded-xl shrink-0 flex items-center justify-center ${
              isCritical
                ? 'bg-rose-500/20 ring-2 ring-rose-500/30 animate-pulse'
                : isWarning
                ? 'bg-amber-500/20 ring-2 ring-amber-500/30'
                : 'bg-emerald-500/20'
            }`}>
              {getIcon()}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider ${
                  isCritical
                    ? 'bg-rose-500/30 text-rose-300 border border-rose-500/40'
                    : isWarning
                    ? 'bg-amber-500/30 text-amber-300 border border-amber-500/40'
                    : 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/40'
                }`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-current animate-ping" />
                  {isCritical ? 'Alerta Crítico' : isWarning ? 'Atenção IA' : 'Informativo'}
                </span>
                <span className="text-[11px] text-slate-400 font-mono">Agora</span>
              </div>

              <h4 className="font-bold text-white text-sm mt-1 leading-snug truncate">
                {alert.title}
              </h4>
              <p className="text-xs text-slate-300 line-clamp-2 mt-0.5">
                {alert.description}
              </p>

              <div className="flex items-center gap-2 mt-2 text-[11px] text-slate-400 font-medium">
                <span className="text-emerald-400 font-semibold">{alert.cameraName}</span>
                <span>•</span>
                <span className="truncate">{alert.location}</span>
                {alert.confidenceScore && (
                  <>
                    <span>•</span>
                    <span className="text-slate-400">IA: {alert.confidenceScore}%</span>
                  </>
                )}
              </div>
            </div>

            <button
              onClick={onDismiss}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              aria-label="Fechar notificação"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-3.5 pt-3 border-t border-slate-800/80 flex items-center justify-end gap-2">
            <button
              onClick={onDismiss}
              className="px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/80 transition-colors"
            >
              Dispensar
            </button>
            <button
              onClick={() => onViewDetails(alert)}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors shadow-sm ${
                isCritical
                  ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30'
                  : isWarning
                  ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/30'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              Ver Ocorrência
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
