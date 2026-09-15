import React, { useState, useEffect } from 'react';
import { 
  Camera, 
  Wifi, 
  WifiOff, 
  AlertTriangle, 
  ShieldCheck, 
  Maximize2, 
  Settings, 
  Loader2, 
  Plus, 
  Bell, 
  ShieldAlert, 
  Sparkles, 
  Volume2, 
  VolumeX,
  Eye,
  Radio
} from 'lucide-react';
import { CameraSetupModal, NewCameraPayload } from './CameraSetupModal';
import { CameraAlertToast } from './CameraAlertToast';
import { CameraAlertModal } from './CameraAlertModal';
import { CameraAlertRulesModal } from './CameraAlertRulesModal';
import { SecurityRule, CameraAlert } from '../types/cameraAlerts';
import { defaultSecurityRules, initialMockAlerts, playAlertSound } from '../lib/cameraAlertsService';

interface CameraFeed {
  id: string;
  name: string;
  location: string;
  status: 'online' | 'offline' | 'connecting';
  lastPing: string;
}

const STORAGE_KEYS = {
  CAMERAS: 'nutriai_merchant_cameras_v1',
  ALERTS: 'nutriai_merchant_alerts_v1',
  RULES: 'nutriai_merchant_rules_v1',
  SOUND: 'nutriai_merchant_sound_v1',
};

const mockCameras: CameraFeed[] = [
  { id: 'cam-1', name: 'Cam 01 - Cozinha', location: 'Cozinha', status: 'online', lastPing: 'Agora mesmo' },
  { id: 'cam-2', name: 'Cam 02 - Frente de Loja', location: 'Balcão Principal', status: 'online', lastPing: 'Agora mesmo' },
  { id: 'cam-3', name: 'Cam 03 - Estoque', location: 'Corredor B', status: 'offline', lastPing: 'Há 5 minutos' },
];

export const CameraDashboard: React.FC = () => {
  const [cameras, setCameras] = useState<CameraFeed[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CAMERAS);
      if (saved) return JSON.parse(saved);
    } catch {}
    return mockCameras;
  });

  const [selectedCam, setSelectedCam] = useState<CameraFeed | null>(null);
  const [isSetupModalOpen, setIsSetupModalOpen] = useState(false);

  // Smart Alerts State with Local Persistence
  const [rules, setRules] = useState<SecurityRule[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.RULES);
      if (saved) return JSON.parse(saved);
    } catch {}
    return defaultSecurityRules;
  });

  const [alerts, setAlerts] = useState<CameraAlert[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ALERTS);
      if (saved) return JSON.parse(saved);
    } catch {}
    return initialMockAlerts;
  });

  const [currentToastAlert, setCurrentToastAlert] = useState<CameraAlert | null>(null);
  const [activeModalAlert, setActiveModalAlert] = useState<CameraAlert | null>(null);
  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);
  
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SOUND);
      if (saved !== null) return saved === 'true';
    } catch {}
    return true;
  });

  const [nativeNotificationPermission, setNativeNotificationPermission] = useState<NotificationPermission | 'unsupported'>(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'unsupported';
  });

  const pendingAlertsCount = alerts.filter(a => a.status === 'pending').length;

  // Persist states
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.CAMERAS, JSON.stringify(cameras));
    } catch {}
  }, [cameras]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.ALERTS, JSON.stringify(alerts));
    } catch {}
  }, [alerts]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.RULES, JSON.stringify(rules));
    } catch {}
  }, [rules]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.SOUND, String(soundEnabled));
    } catch {}
  }, [soundEnabled]);

  const requestNativeNotificationPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const perm = await Notification.requestPermission();
        setNativeNotificationPermission(perm);
        if (perm === 'granted') {
          new Notification('NutriAI Guard Ativado 🛡️', {
            body: 'Você receberá alertas em tempo real de filas, conformidade e segurança das câmeras.',
            icon: '/icon-192.png'
          });
        }
      } catch (err) {
        console.error('Falha ao requisitar permissão de notificação:', err);
      }
    }
  };

  const handleAddCamera = (newCamPayload: NewCameraPayload) => {
    if (cameras.length >= 4) return;
    const newCamera: CameraFeed = {
      id: `cam-${Date.now()}`,
      name: newCamPayload.name,
      location: newCamPayload.location,
      status: 'connecting',
      lastPing: 'Conectando...'
    };
    setCameras(prev => [...prev, newCamera]);
  };

  // Trigger simulated alert
  const handleTriggerAlert = (ruleId?: string) => {
    const targetRule = (ruleId ? rules.find(r => r.id === ruleId) : null) || 
      rules.filter(r => r.enabled)[Math.floor(Math.random() * rules.filter(r => r.enabled).length)] ||
      rules[0];

    // Find camera matching rule or random camera
    const matchedCam = cameras.find(c => targetRule.cameraIds.includes(c.id)) || cameras[0] || {
      id: 'cam-1',
      name: 'Cam 01 - Cozinha',
      location: 'Cozinha'
    };

    const newAlert: CameraAlert = {
      id: `alt-${Date.now().toString().slice(-4)}`,
      ruleId: targetRule.id,
      ruleName: targetRule.name,
      cameraId: matchedCam.id,
      cameraName: matchedCam.name,
      location: matchedCam.location,
      severity: targetRule.severity,
      title: targetRule.name,
      description: targetRule.description,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      timeAgo: 'Agora mesmo',
      status: 'pending',
      confidenceScore: Math.floor(Math.random() * 8) + 92,
      detectedObject: targetRule.detectionType === 'crowd' ? 'Fila com 6+ pessoas' :
                     targetRule.detectionType === 'restriction' ? 'Movimento suspeito no escuro' :
                     targetRule.detectionType === 'uniform' ? 'Colaborador sem touca protetora' :
                     'Interrupção de sinal de vídeo',
      isRead: false
    };

    setAlerts(prev => [newAlert, ...prev]);
    setCurrentToastAlert(newAlert);

    if (soundEnabled) {
      playAlertSound(newAlert.severity);
    }

    // Trigger Native Push Notification if permitted
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(`🚨 ${newAlert.title}`, {
          body: `${newAlert.cameraName} (${newAlert.location}): ${newAlert.description}`,
          icon: '/icon-192.png',
          tag: newAlert.id
        });
      } catch (e) {
        console.error('Notification dispatch error:', e);
      }
    }
  };

  const handleResolveAlert = (alertId: string) => {
    setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, status: 'resolved' as const } : a));
    if (currentToastAlert?.id === alertId) {
      setCurrentToastAlert(null);
    }
  };

  const handleToggleRule = (ruleId: string) => {
    setRules(prev => prev.map(r => r.id === ruleId ? { ...r, enabled: !r.enabled } : r));
  };
  
  // Simulate connection updates
  useEffect(() => {
    const interval = setInterval(() => {
      setCameras(prev => prev.map(cam => {
        if (cam.status === 'connecting') {
          return { ...cam, status: Math.random() > 0.5 ? 'online' : 'connecting', lastPing: 'Agora mesmo' };
        }
        if (cam.id === 'cam-3' && Math.random() > 0.8) {
          return { ...cam, status: 'online', lastPing: 'Agora mesmo' };
        }
        return cam;
      }));
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white dark:bg-slate-900 p-6 rounded-[24px] shadow-sm border border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <Camera className="w-6 h-6 text-emerald-500" />
              Central de Câmeras
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              NutriAI Guard
            </span>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
            Monitoramento ao vivo com detecção inteligente de segurança e conformidade.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 w-full lg:w-auto">
          {/* Native Web Push Notification Permission Request */}
          {nativeNotificationPermission !== 'granted' && nativeNotificationPermission !== 'unsupported' && (
            <button
              onClick={requestNativeNotificationPermission}
              className="min-h-[40px] px-3.5 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 rounded-xl flex items-center gap-1.5 font-bold text-xs transition-colors"
              title="Permitir notificações push nativas no celular ou navegador"
            >
              <Bell className="w-3.5 h-3.5" />
              <span>Ativar Push</span>
            </button>
          )}

          {/* Sound Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`min-h-[40px] min-w-[40px] p-2 rounded-xl border transition-colors flex items-center justify-center ${
              soundEnabled
                ? 'bg-slate-100 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 border-slate-200 dark:border-slate-700'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700'
            }`}
            title={soundEnabled ? "Som de alertas ativado" : "Som de alertas mudo"}
            aria-label="Alternar som"
          >
            {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>

          {/* Smart Alerts & Rules Center Button */}
          <button
            onClick={() => setIsRulesModalOpen(true)}
            className={`min-h-[40px] px-3.5 py-2 rounded-xl flex items-center gap-2 font-bold text-sm transition-all border ${
              pendingAlertsCount > 0
                ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/30 ring-2 ring-rose-500/20 animate-pulse'
                : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
            }`}
          >
            <ShieldAlert className={`w-4 h-4 ${pendingAlertsCount > 0 ? 'text-rose-500' : 'text-slate-400'}`} />
            <span>Alertas IA</span>
            {pendingAlertsCount > 0 && (
              <span className="px-1.5 py-0.2 bg-rose-600 text-white rounded-full text-[11px] font-extrabold">
                {pendingAlertsCount}
              </span>
            )}
          </button>

          {/* Quick Simulate Alert */}
          <button
            onClick={() => handleTriggerAlert()}
            className="min-h-[40px] px-3.5 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30 rounded-xl flex items-center gap-1.5 font-bold text-sm transition-colors"
            title="Dispara uma simulação de evento em tempo real"
          >
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span className="hidden sm:inline">Simular Evento</span>
          </button>

          {/* New Camera Button */}
          <button 
            onClick={() => setIsSetupModalOpen(true)}
            disabled={cameras.length >= 4}
            className="min-h-[40px] px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-300 disabled:hover:bg-slate-300 dark:disabled:bg-slate-700 dark:disabled:text-slate-500 text-white rounded-xl flex items-center gap-2 font-bold text-sm transition-colors shadow-lg shadow-emerald-500/20 disabled:shadow-none disabled:cursor-not-allowed"
            title={cameras.length >= 4 ? "Limite máximo de 4 câmeras atingido" : "Adicionar nova câmera"}
          >
            <Plus className="w-4 h-4" />
            Nova Câmera
          </button>

          <button 
            onClick={() => setIsRulesModalOpen(true)}
            className="min-h-[40px] min-w-[40px] p-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-200 transition-colors flex items-center justify-center"
            title="Configurações de Monitoramento"
            aria-label="Configurações"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Active Incident Warning Bar if there is any critical alert */}
      {pendingAlertsCount > 0 && (
        <div className="bg-rose-500/10 border border-rose-500/30 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-500 flex items-center justify-center shrink-0 animate-pulse">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-rose-700 dark:text-rose-400">
                {pendingAlertsCount} {pendingAlertsCount === 1 ? 'ocorrência ativa' : 'ocorrências ativas'} com detecção inteligente
              </p>
              <p className="text-xs text-rose-600/80 dark:text-rose-400/80">
                Acesse o detalhamento da gravação para checar a evidência ou disparar a sirene local.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              const firstPending = alerts.find(a => a.status === 'pending');
              if (firstPending) setActiveModalAlert(firstPending);
            }}
            className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-colors shadow-sm shrink-0 flex items-center gap-1.5"
          >
            <Eye className="w-3.5 h-3.5" />
            Inspecionar Agora
          </button>
        </div>
      )}

      {cameras.length >= 4 && (
        <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-400 p-4 rounded-xl flex items-center gap-3 text-sm animate-in fade-in">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <p>Você atingiu o limite de <strong>4 câmeras ativas</strong> do seu plano atual. Para adicionar mais dispositivos de monitoramento, faça um upgrade no seu painel de configurações.</p>
        </div>
      )}

      {/* Feeds Grid with Refined CSS Grid Auto-Fit & Ultra-Wide Centering */}
      <div className="w-full flex justify-center">
        <div 
          className="grid-camera-dashboard grid gap-6 w-full max-w-[1200px] mx-auto justify-items-center justify-center"
          style={{
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))',
            maxWidth: '1200px',
            margin: '0 auto',
            justifyItems: 'center'
          }}
        >
          {cameras.map(cam => {
            const cameraPendingAlert = alerts.find(a => a.cameraId === cam.id && a.status === 'pending');

            return (
              <div 
                key={cam.id} 
                className={`bg-slate-950 rounded-[24px] overflow-hidden border flex flex-col group relative transition-all duration-300 ease-out hover:scale-[1.018] hover:-translate-y-1 hover:shadow-2xl hover:shadow-emerald-500/15 dark:hover:shadow-black/70 hover:border-slate-700/80 w-full mx-auto ${
                  cameraPendingAlert
                    ? cameraPendingAlert.severity === 'critical'
                      ? 'border-rose-500/80 ring-2 ring-rose-500/30 shadow-lg shadow-rose-950/50'
                      : 'border-amber-500/80 ring-2 ring-amber-500/30'
                    : 'border-slate-800'
                }`}
              >
              {/* Header */}
              <div className="p-4 flex justify-between items-center bg-slate-900/85 backdrop-blur-md border-b border-slate-800 absolute top-0 w-full z-10">
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white">{cam.name}</span>
                    {cameraPendingAlert && (
                      <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                    )}
                  </div>
                  <span className="text-xs text-slate-400">{cam.location}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-400 hidden sm:inline-block">{cam.lastPing}</span>
                  {cam.status === 'online' && (
                    <div className="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-xs font-medium flex items-center gap-1.5 border border-emerald-500/30">
                      <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                      Online
                    </div>
                  )}
                  {cam.status === 'offline' && (
                    <div className="px-3 py-1 bg-rose-500/20 text-rose-400 rounded-full text-xs font-medium flex items-center gap-1.5 border border-rose-500/30">
                      <WifiOff className="w-3 h-3" />
                      Offline
                    </div>
                  )}
                  {cam.status === 'connecting' && (
                    <div className="px-3 py-1 bg-amber-500/20 text-amber-400 rounded-full text-xs font-medium flex items-center gap-1.5 border border-amber-500/30">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Conectando
                    </div>
                  )}
                  <button 
                    onClick={() => setSelectedCam(cam)}
                    className="p-1.5 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 transition-colors opacity-0 group-hover:opacity-100"
                    title="Expandir visualização"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Camera Video Stream Canvas Area */}
              <div className="aspect-video w-full bg-slate-900 relative flex items-center justify-center">
                {cam.status === 'online' ? (
                  <div className="absolute inset-0 w-full h-full">
                    <div className="absolute inset-0 bg-black/20" />
                    <div className="absolute inset-0 grid grid-cols-4 grid-rows-4 opacity-[0.03]">
                      {Array.from({ length: 16 }).map((_, i) => (
                        <div key={i} className="border border-white/50" />
                      ))}
                    </div>
                    {/* Camera feed representation */}
                    <div className="w-full h-full object-cover bg-gradient-to-br from-slate-800 to-slate-900" />

                    {/* Active Alert Flag Overlay on Stream */}
                    {cameraPendingAlert && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-4">
                        <div className="pointer-events-auto bg-slate-950/90 border border-rose-500/50 p-3 rounded-2xl text-center space-y-1.5 backdrop-blur-md shadow-2xl max-w-xs animate-in zoom-in-90 duration-200">
                          <div className="flex items-center justify-center gap-1.5 text-rose-400 text-xs font-bold uppercase tracking-wider">
                            <ShieldAlert className="w-4 h-4 animate-bounce" />
                            {cameraPendingAlert.severity === 'critical' ? 'Alerta Crítico' : 'Atenção IA'}
                          </div>
                          <p className="text-xs font-bold text-white leading-tight">
                            {cameraPendingAlert.title}
                          </p>
                          <button
                            onClick={() => setActiveModalAlert(cameraPendingAlert)}
                            className="mt-1 px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1"
                          >
                            <Eye className="w-3 h-3" />
                            Abrir Ocorrência
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="absolute bottom-4 left-4 text-xs font-mono text-white/50 drop-shadow-md flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                      <span>REC {new Date().toLocaleTimeString()} - {cam.name}</span>
                    </div>

                    {cameraPendingAlert && (
                      <div className="absolute bottom-4 right-4 bg-rose-600/90 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider flex items-center gap-1">
                        Detecção Ativa
                      </div>
                    )}
                  </div>
                ) : cam.status === 'connecting' ? (
                  <div className="flex flex-col items-center gap-3 text-slate-500">
                    <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
                    <span className="text-sm">Estabelecendo conexão...</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3 text-slate-500">
                    <AlertTriangle className="w-8 h-8 text-rose-500/50" />
                    <span className="text-sm">Sinal Perdido</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        </div>
      </div>
      
      {/* Expanded Modal */}
      {selectedCam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-950 w-full max-w-5xl rounded-3xl overflow-hidden shadow-2xl border border-slate-800 flex flex-col">
            <div className="flex justify-between items-center p-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <Camera className="w-5 h-5 text-emerald-500" />
                <h3 className="font-bold text-white text-lg">{selectedCam.name}</h3>
                <span className="px-2 py-1 bg-slate-800 text-slate-300 rounded text-xs">{selectedCam.location}</span>
              </div>
              <button 
                onClick={() => setSelectedCam(null)}
                className="min-w-[44px] min-h-[44px] p-2 bg-slate-800 text-slate-400 hover:text-white rounded-xl transition-colors flex items-center justify-center"
                aria-label="Fechar visualização expandida"
              >
                ✕
              </button>
            </div>
            <div className="aspect-video w-full bg-black relative flex items-center justify-center">
              {selectedCam.status === 'online' ? (
                <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
                   <div className="absolute bottom-6 left-6 text-sm font-mono text-white/70 drop-shadow-md">
                    {new Date().toLocaleString()} - HD 1080p - 30FPS
                  </div>
                  <div className="absolute top-6 right-6">
                     <div className="px-3 py-1 bg-rose-600 text-white rounded-full text-xs font-bold flex items-center gap-2 animate-pulse">
                        <div className="w-2 h-2 bg-white rounded-full"></div> LIVE
                     </div>
                  </div>
                </div>
              ) : (
                <div className="text-slate-500 flex flex-col items-center">
                  <WifiOff className="w-12 h-12 mb-4 opacity-50" />
                  <p>Sem sinal da câmera.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <CameraSetupModal 
        isOpen={isSetupModalOpen} 
        onClose={() => setIsSetupModalOpen(false)} 
        onAdd={handleAddCamera}
      />

      {/* Floating Push Notification Toast */}
      {currentToastAlert && (
        <CameraAlertToast 
          alert={currentToastAlert}
          onDismiss={() => setCurrentToastAlert(null)}
          onViewDetails={(alert) => {
            setActiveModalAlert(alert);
            setCurrentToastAlert(null);
          }}
        />
      )}

      {/* Full AI Evidence & Action Modal */}
      {activeModalAlert && (
        <CameraAlertModal 
          alert={activeModalAlert}
          isOpen={!!activeModalAlert}
          onClose={() => setActiveModalAlert(null)}
          onResolve={handleResolveAlert}
        />
      )}

      {/* Security Rules & Notification Preferences Modal */}
      <CameraAlertRulesModal 
        isOpen={isRulesModalOpen}
        onClose={() => setIsRulesModalOpen(false)}
        rules={rules}
        onToggleRule={handleToggleRule}
        alerts={alerts}
        onViewAlert={(alert) => {
          setActiveModalAlert(alert);
          setIsRulesModalOpen(false);
        }}
        onResolveAlert={handleResolveAlert}
        onSimulateAlert={(ruleId) => handleTriggerAlert(ruleId)}
      />
    </div>
  );
};
