import { useEffect, useRef } from 'react';
import { UserProfile } from '../types';
import { 
  syncSchedulesToServiceWorker, 
  buildSchedulePayload, 
  DEFAULT_MEAL_TIMES, 
  DEFAULT_CHALLENGE_TIMES 
} from '../lib/pushScheduler';
import { playSfx, vibrate } from '../lib/sensory';

const PROACTIVE_TIPS = [
  "Você bebeu pouca água hoje. Que tal um copo fresco agora?",
  "Sua ingestão de proteínas está abaixo da meta do dia.",
  "Que tal uma caminhada de 20 minutos para acelerar o metabolismo?",
  "Há frutas na sua geladeira que podem estragar em breve."
];

export function useMealPushNotifications(
  profile: UserProfile | null, 
  addNotification: (notif: { title: string; message: string; type: any }) => void
) {
  const notifiedKeys = useRef<Set<string>>(new Set());
  const proactiveNotified = useRef(false);

  // Solicitar permissão de notificação no mount se estiver em 'default'
  useEffect(() => {
    try {
      if ('Notification' in window && typeof Notification !== 'undefined' && Notification.permission === 'default') {
        Notification.requestPermission().catch(() => {});
      }
    } catch (e) {
      console.warn('Notification API not supported or blocked in this environment:', e);
    }
  }, []);

  // Sincronizar preferências de horários e alertas com o Service Worker sempre que o perfil mudar
  useEffect(() => {
    if (!profile) return;
    syncSchedulesToServiceWorker(profile).catch((err) => {
      console.warn('Erro ao sincronizar agendamentos com o Service Worker:', err);
    });
  }, [
    profile?.mealRemindersEnabled,
    profile?.mealNotificationTimes,
    profile?.challengeRemindersEnabled,
    profile?.challengeReminderTime,
    profile?.challengeReviewTime,
    profile?.weeklyChallenges,
    profile?.mealPlan
  ]);

  // Assistente Proativo de Notificações
  useEffect(() => {
    if (!profile) return;

    const proactiveInterval = setInterval(() => {
      if (!proactiveNotified.current && Math.random() > 0.5) {
        const randomTip = PROACTIVE_TIPS[Math.floor(Math.random() * PROACTIVE_TIPS.length)];
        
        addNotification({
          title: 'Assistente Proativo 🤖',
          message: randomTip,
          type: 'info'
        });
        
        sendNativePushNotification('Assistente Proativo 🤖', randomTip, {
          tag: `proactive-${Date.now()}`
        });

        proactiveNotified.current = true;
      }
    }, 60000); // Checagem a cada 60s

    return () => clearInterval(proactiveInterval);
  }, [profile, addNotification]);

  // Monitor e Agendador de Alertas de Refeições e Desafios (Coordenação com Service Worker)
  useEffect(() => {
    if (!profile) return;

    const checkInterval = setInterval(() => {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const currentTime = `${hours}:${minutes}`;
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

      const scheduleData = buildSchedulePayload(profile);

      // 1. Checar Alertas de Refeições
      if (scheduleData.mealAlertsEnabled && Array.isArray(scheduleData.meals)) {
        for (const meal of scheduleData.meals) {
          if (meal.time === currentTime) {
            const key = `${todayStr}-meal-${meal.id}`;
            if (!notifiedKeys.current.has(key)) {
              notifiedKeys.current.add(key);

              const title = `🍲 Hora do ${meal.label}!`;
              const message = meal.recipeName
                ? `Está na hora de saborear: ${meal.recipeName}. Bom apetite!`
                : meal.defaultTip;

              playSfx('notification');
              vibrate([100, 50, 100]);

              addNotification({
                title,
                message,
                type: 'info'
              });

              sendNativePushNotification(title, message, {
                tag: `meal-${meal.id}-${todayStr}`,
                data: { url: '/?tab=plan' }
              });
            }
          }
        }
      }

      // 2. Checar Alertas de Desafios
      if (scheduleData.challengeAlertsEnabled && Array.isArray(scheduleData.challenges)) {
        for (const challenge of scheduleData.challenges) {
          if (challenge.time === currentTime) {
            const key = `${todayStr}-challenge-${challenge.id}`;
            if (!notifiedKeys.current.has(key)) {
              notifiedKeys.current.add(key);

              playSfx('crystal');
              vibrate([150, 80, 150]);

              addNotification({
                title: challenge.title,
                message: challenge.body,
                type: 'info'
              });

              sendNativePushNotification(challenge.title, challenge.body, {
                tag: `challenge-${challenge.id}-${todayStr}`,
                data: { url: '/?tab=challenge' }
              });
            }
          }
        }
      }
    }, 20000); // Checagem precisa a cada 20 segundos

    return () => clearInterval(checkInterval);
  }, [profile, addNotification]);
}

/**
 * Dispara notificação push nativa através do Service Worker se disponível ou fallback padrão
 */
async function sendNativePushNotification(title: string, body: string, options?: NotificationOptions) {
  try {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') {
      return;
    }

    // Prioriza envio via Service Worker Registration (nativo com ações e persistência no sistema)
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready;
        if (registration && registration.showNotification) {
          await registration.showNotification(title, {
            body,
            icon: '/pwa-192x192.png',
            badge: '/icon-192.png',
            vibrate: [150, 80, 150],
            renotify: true,
            ...options
          } as any);
          return;
        }
      } catch (swErr) {
        console.warn('Fallback para Notification API simples:', swErr);
      }
    }

    // Fallback padrão se SW registration não estiver disponível
    new Notification(title, {
      body,
      icon: '/pwa-192x192.png',
      ...options
    });
  } catch (e) {
    console.warn('Falha no envio da notificação nativa:', e);
  }
}
