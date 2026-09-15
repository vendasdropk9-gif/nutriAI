import React, { useState } from 'react';
import { CameraAlert } from '../types/cameraAlerts';
import { 
  X, 
  ShieldAlert, 
  AlertTriangle, 
  CheckCircle2, 
  Volume2, 
  PhoneCall, 
  Download, 
  Clock, 
  MapPin, 
  Scan, 
  Sliders, 
  BellOff,
  Radio,
  Check
} from 'lucide-react';

interface CameraAlertModalProps {
  alert: CameraAlert | null;
  isOpen: boolean;
  onClose: () => void;
  onResolve: (alertId: string) => void;
}

export const CameraAlertModal: React.FC<CameraAlertModalProps> = ({
  alert,
  isOpen,
  onClose,
  onResolve
}) => {
  const [isAlarmActive, setIsAlarmActive] = useState(false);
  const [securityNotified, setSecurityNotified] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [mutedUntil, setMutedUntil] = useState<string | null>(null);

  if (!isOpen || !alert) return null;

  const isCritical = alert.severity === 'critical';
  const isWarning = alert.severity === 'warning';

  const handleTriggerAlarm = () => {
    setIsAlarmActive(true);
    setTimeout(() => {
      setIsAlarmActive(false);
    }, 4000);
  };

  const handleNotifySecurity = () => {
    setSecurityNotified(true);
    setTimeout(() => {
      setSecurityNotified(false);
    }, 3500);
  };

  const handleDownload = () => {
    setDownloading(true);
    setTimeout(() => {
      setDownloading(false);
    }, 2000);
  };

  const handleMuteCamera = () => {
    setMutedUntil('30 minutos');
  };

  const handleResolveAlert = () => {
    onResolve(alert.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 w-full max-w-4xl rounded-[28px] shadow-2xl border border-slate-800 overflow-hidden flex flex-col relative animate-in zoom-in-95 duration-200 text-white max-h-[92vh]">
        
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-5 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
              isCritical
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                : isWarning
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
            }`}>
              {isCritical ? <ShieldAlert className="w-6 h-6 animate-pulse" /> : <AlertTriangle className="w-6 h-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider ${
                  isCritical
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    : isWarning
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                }`}>
                  {isCritical ? 'Ocorrência Crítica' : isWarning ? 'Atenção IA' : 'Evento Informativo'}
                </span>
                <span className="text-xs text-slate-400 font-mono">ID #{alert.id}</span>
              </div>
              <h3 className="text-lg font-bold text-white mt-0.5">{alert.title}</h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
            aria-label="Fechar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto p-6 space-y-6 flex-1">
          {/* Simulated Snapshot with Computer Vision Overlays */}
          <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-black aspect-video flex items-center justify-center">
            {/* Background Feed Simulation */}
            <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-black opacity-90" />
            
            {/* Security Grid */}
            <div className="absolute inset-0 grid grid-cols-6 grid-rows-4 opacity-10">
              {Array.from({ length: 24 }).map((_, i) => (
                <div key={i} className="border border-emerald-400/40" />
              ))}
            </div>

            {/* AI Bounding Box & Target Highlight */}
            <div className="absolute top-[25%] left-[30%] w-[38%] h-[50%] border-2 border-dashed border-rose-500 rounded-lg bg-rose-500/10 flex flex-col justify-between p-2 animate-pulse">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 bg-rose-600 text-white font-mono text-[10px] font-bold rounded">
                  ALVO DETECTADO: {alert.confidenceScore}%
                </span>
                <Scan className="w-4 h-4 text-rose-400" />
              </div>
              <div className="text-[11px] font-mono text-rose-300 bg-black/60 px-2 py-1 rounded backdrop-blur-sm self-start">
                {alert.detectedObject || 'Anomalia Detectada'}
              </div>
            </div>

            {/* Live Camera Watermark */}
            <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/70 px-3 py-1.5 rounded-lg border border-white/10 text-xs font-mono">
              <Radio className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
              <span>{alert.cameraName} • {alert.location}</span>
            </div>

            <div className="absolute bottom-4 left-4 bg-black/70 px-3 py-1.5 rounded-lg border border-white/10 text-xs font-mono text-slate-300 flex items-center gap-3">
              <span>{alert.timestamp} (Horário do Flagrante)</span>
              <span>•</span>
              <span className="text-emerald-400">FPS: 30 • 1080p</span>
            </div>

            <div className="absolute top-4 right-4 bg-rose-600/90 text-white text-[11px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wider flex items-center gap-1.5 shadow-lg shadow-rose-900/40">
              <span className="w-2 h-2 rounded-full bg-white animate-ping" />
              Evidência Gravada
            </div>
          </div>

          {/* Details & Rule Specifications */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80 space-y-1">
              <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider">
                <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                Local & Câmera
              </div>
              <p className="font-bold text-white text-sm">{alert.cameraName}</p>
              <p className="text-xs text-slate-400">{alert.location}</p>
            </div>

            <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80 space-y-1">
              <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider">
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                Data & Horário
              </div>
              <p className="font-bold text-white text-sm">{alert.timestamp} ({alert.timeAgo})</p>
              <p className="text-xs text-slate-400">Detecção em tempo real</p>
            </div>

            <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80 space-y-1">
              <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider">
                <Sliders className="w-3.5 h-3.5 text-emerald-400" />
                Regra Inteligente
              </div>
              <p className="font-bold text-white text-sm truncate">{alert.ruleName}</p>
              <p className="text-xs text-emerald-400 font-mono">IA Confiança: {alert.confidenceScore}%</p>
            </div>
          </div>

          {/* Alert Description & Action Plan */}
          <div className="bg-slate-950/40 p-5 rounded-2xl border border-slate-800/80 space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Diagnóstico da Visão Computacional</h4>
            <p className="text-sm text-slate-200 leading-relaxed">{alert.description}</p>
          </div>

          {/* Action Feedback Banners */}
          {isAlarmActive && (
            <div className="bg-rose-500/20 border border-rose-500/40 text-rose-300 p-4 rounded-2xl flex items-center gap-3 animate-in fade-in">
              <Volume2 className="w-6 h-6 animate-bounce text-rose-400 shrink-0" />
              <div>
                <p className="font-bold text-sm">Sirene Local Acionada!</p>
                <p className="text-xs opacity-80">Sinal acústico e estroboscópio disparados no setor {alert.location}.</p>
              </div>
            </div>
          )}

          {securityNotified && (
            <div className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 p-4 rounded-2xl flex items-center gap-3 animate-in fade-in">
              <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
              <div>
                <p className="font-bold text-sm">Alerta Enviado para a Equipe de Segurança!</p>
                <p className="text-xs opacity-80">SMS de urgência e chamada automática iniciados para a ronda do estabelecimento.</p>
              </div>
            </div>
          )}

          {mutedUntil && (
            <div className="bg-slate-800 border border-slate-700 text-slate-300 p-3 rounded-2xl flex items-center gap-2.5 text-xs animate-in fade-in">
              <BellOff className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Notificações sonoras pausadas para esta câmera por {mutedUntil}.</span>
            </div>
          )}

          {/* Action Buttons Matrix */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <button
              onClick={handleTriggerAlarm}
              className={`p-3 rounded-xl border font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                isAlarmActive
                  ? 'bg-rose-600 border-rose-500 text-white animate-pulse'
                  : 'bg-slate-800/80 hover:bg-rose-950/40 border-slate-700 hover:border-rose-500/50 text-rose-300'
              }`}
            >
              <Volume2 className="w-4 h-4" />
              {isAlarmActive ? 'Disparando...' : 'Acionar Sirene'}
            </button>

            <button
              onClick={handleNotifySecurity}
              className={`p-3 rounded-xl border font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                securityNotified
                  ? 'bg-emerald-600 border-emerald-500 text-white'
                  : 'bg-slate-800/80 hover:bg-slate-700 border-slate-700 text-slate-200'
              }`}
            >
              <PhoneCall className="w-4 h-4 text-emerald-400" />
              {securityNotified ? 'Notificado!' : 'Ligar Segurança'}
            </button>

            <button
              onClick={handleDownload}
              className="p-3 bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all"
            >
              <Download className={`w-4 h-4 text-sky-400 ${downloading ? 'animate-bounce' : ''}`} />
              {downloading ? 'Baixando Evidência...' : 'Exportar Gravação'}
            </button>

            <button
              onClick={handleMuteCamera}
              className="p-3 bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all"
            >
              <BellOff className="w-4 h-4 text-amber-400" />
              Silenciar Câmera
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/80 flex flex-col sm:flex-row items-center justify-between gap-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <p className="text-xs text-slate-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            NutriAI Guard • Monitoramento Contínuo com IA
          </p>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="flex-1 sm:flex-none min-h-[44px] px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-colors flex items-center justify-center"
            >
              Fechar
            </button>
            <button
              onClick={handleResolveAlert}
              className="flex-1 sm:flex-none min-h-[44px] px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/30"
            >
              <Check className="w-4 h-4" />
              Marcar como Resolvido
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
