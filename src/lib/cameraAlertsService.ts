import { SecurityRule, CameraAlert } from '../types/cameraAlerts';

export const defaultSecurityRules: SecurityRule[] = [
  {
    id: 'rule-motion-stock',
    name: 'Movimento em Área Restrita',
    description: 'Dispara alerta ao detectar presença humana no Estoque fora do horário comercial.',
    severity: 'critical',
    cameraIds: ['cam-3'],
    enabled: true,
    actionType: 'modal_and_push',
    triggerCondition: 'Movimento contínuo > 3s entre 22:00 e 06:00',
    detectionType: 'restriction'
  },
  {
    id: 'rule-crowd-counter',
    name: 'Fila Excessiva ou Aglomeração',
    description: 'Monitora acúmulo de mais de 5 pessoas aguardando atendimento simultaneamente.',
    severity: 'warning',
    cameraIds: ['cam-2'],
    enabled: true,
    actionType: 'push_only',
    triggerCondition: 'Mais de 5 pessoas por mais de 3 minutos no Balcão',
    detectionType: 'crowd'
  },
  {
    id: 'rule-kitchen-hygiene',
    name: 'Boas Práticas & Higiene na Cozinha',
    description: 'Verificação por visão computacional do uso de touca e avental na área de manipulação de alimentos.',
    severity: 'info',
    cameraIds: ['cam-1'],
    enabled: true,
    actionType: 'push_only',
    triggerCondition: 'Operador sem uniforme na bancada de preparo',
    detectionType: 'uniform'
  },
  {
    id: 'rule-connection-loss',
    name: 'Falha de Alimentação ou Sinal Perdido',
    description: 'Identifica interrupção abrupta no feed de gravação em tempo real.',
    severity: 'critical',
    cameraIds: [],
    enabled: true,
    actionType: 'modal_and_push',
    triggerCondition: 'Sem resposta de ping por mais de 30 segundos',
    detectionType: 'offline'
  }
];

export const initialMockAlerts: CameraAlert[] = [
  {
    id: 'alert-1',
    ruleId: 'rule-motion-stock',
    ruleName: 'Movimento em Área Restrita',
    cameraId: 'cam-3',
    cameraName: 'Cam 03 - Estoque',
    location: 'Corredor B - Prateleira 4',
    severity: 'critical',
    title: 'Movimento Não Autorizado Detectado',
    description: 'Presença identificada na área de armazenamento com iluminação apagada.',
    timestamp: new Date(Date.now() - 1000 * 60 * 12).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    timeAgo: 'Há 12 min',
    status: 'pending',
    confidenceScore: 96,
    detectedObject: 'Pessoa em movimento (Silhueta)',
    isRead: false
  },
  {
    id: 'alert-2',
    ruleId: 'rule-crowd-counter',
    ruleName: 'Fila Excessiva ou Aglomeração',
    cameraId: 'cam-2',
    cameraName: 'Cam 02 - Frente de Loja',
    location: 'Balcão Principal / Caixa',
    severity: 'warning',
    title: 'Capacidade Limite Atingida',
    description: 'Fila acumulada com 6 clientes em espera por mais de 4 minutos.',
    timestamp: new Date(Date.now() - 1000 * 60 * 45).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    timeAgo: 'Há 45 min',
    status: 'acknowledged',
    confidenceScore: 89,
    detectedObject: '6 pessoas detectadas',
    isRead: true
  }
];

export const playAlertSound = (severity: 'critical' | 'warning' | 'info') => {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    if (severity === 'critical') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.setValueAtTime(440, ctx.currentTime + 0.12);
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.24);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } else if (severity === 'warning') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(659, ctx.currentTime);
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } else {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    }
  } catch {
    // Autoplay restrictions bypass gracefully
  }
};
