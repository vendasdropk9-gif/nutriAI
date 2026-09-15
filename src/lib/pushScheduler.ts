/**
 * NutriAI - Push Notifications & Service Worker Scheduler Client
 * Comunicação entre a interface React e o Service Worker para agendamento de refeições e desafios
 */

import { UserProfile, MealNotificationTimes } from '../types';
import { safeGet, safeSet } from './storage';
import { playSfx, vibrate } from './sensory';

export const DEFAULT_MEAL_TIMES: Required<MealNotificationTimes> = {
  breakfast: '08:00',
  morningSnack: '10:30',
  lunch: '12:30',
  afternoonSnack: '16:30',
  dinner: '20:00',
  supper: '22:00'
};

export const DEFAULT_CHALLENGE_TIMES = {
  morningReminder: '09:00',
  eveningReview: '19:00'
};

const DAYS_OF_WEEK = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado'
];

export interface ScheduledMealPayload {
  id: string;
  label: string;
  time: string;
  recipeName?: string;
  defaultTip: string;
}

export interface ScheduledChallengePayload {
  id: string;
  title: string;
  time: string;
  body: string;
}

export interface NotificationSchedulePayload {
  mealAlertsEnabled: boolean;
  challengeAlertsEnabled: boolean;
  meals: ScheduledMealPayload[];
  challenges: ScheduledChallengePayload[];
}

/**
 * Retorna o status de permissão de notificações do navegador
 */
export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

/**
 * Solicita permissão ao usuário para envio de notificações push nativas
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    console.warn('[PushScheduler] API de Notificações não suportada no navegador');
    return 'denied';
  }

  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (err) {
    console.warn('[PushScheduler] Falha ao solicitar permissão de notificações:', err);
    return 'default';
  }
}

/**
 * Constrói o payload completo de agendamento com base nas preferências do perfil do usuário
 */
export function buildSchedulePayload(profile: UserProfile | null): NotificationSchedulePayload {
  const times: Required<MealNotificationTimes> = {
    breakfast: profile?.mealNotificationTimes?.breakfast || safeGet('nutri-meal-time-breakfast') || DEFAULT_MEAL_TIMES.breakfast,
    morningSnack: profile?.mealNotificationTimes?.morningSnack || safeGet('nutri-meal-time-morningSnack') || DEFAULT_MEAL_TIMES.morningSnack,
    lunch: profile?.mealNotificationTimes?.lunch || safeGet('nutri-meal-time-lunch') || DEFAULT_MEAL_TIMES.lunch,
    afternoonSnack: profile?.mealNotificationTimes?.afternoonSnack || safeGet('nutri-meal-time-afternoonSnack') || DEFAULT_MEAL_TIMES.afternoonSnack,
    dinner: profile?.mealNotificationTimes?.dinner || safeGet('nutri-meal-time-dinner') || DEFAULT_MEAL_TIMES.dinner,
    supper: profile?.mealNotificationTimes?.supper || safeGet('nutri-meal-time-supper') || DEFAULT_MEAL_TIMES.supper
  };

  const mealAlertsEnabled = profile?.mealRemindersEnabled !== false && safeGet('nutri-meal-reminders') !== 'false';
  const challengeAlertsEnabled = profile?.challengeRemindersEnabled !== false && safeGet('nutri-challenge-reminders') !== 'false';

  // Obter receita planejada para hoje, se houver
  const now = new Date();
  const currentDayName = DAYS_OF_WEEK[now.getDay()];
  const todayMeals = profile?.mealPlan?.[currentDayName]?.meals;

  const meals: ScheduledMealPayload[] = [
    {
      id: 'breakfast',
      label: 'Café da Manhã',
      time: times.breakfast,
      recipeName: todayMeals?.breakfast?.name,
      defaultTip: 'Comece o dia com energia, fibras e boas fontes de proteína!'
    },
    {
      id: 'morningSnack',
      label: 'Lanche da Manhã',
      time: times.morningSnack,
      recipeName: (todayMeals as any)?.snack?.name,
      defaultTip: 'Momento para uma fruta fresca, castanhas ou um iogurte natural.'
    },
    {
      id: 'lunch',
      label: 'Almoço',
      time: times.lunch,
      recipeName: todayMeals?.lunch?.name,
      defaultTip: 'Prato colorido com vegetais, carboidratos complexos e proteínas magras.'
    },
    {
      id: 'afternoonSnack',
      label: 'Lanche da Tarde',
      time: times.afternoonSnack,
      recipeName: (todayMeals as any)?.snack?.name,
      defaultTip: 'Evite picos de fome antes do jantar com um lanche equilibrado.'
    },
    {
      id: 'dinner',
      label: 'Jantar',
      time: times.dinner,
      recipeName: todayMeals?.dinner?.name,
      defaultTip: 'Refeição leve e aconchegante para preparar uma noite de descanso.'
    },
    {
      id: 'supper',
      label: 'Ceia',
      time: times.supper,
      defaultTip: 'Um chá calmante de camomila ou melissa para otimizar a regeneração.'
    }
  ];

  // Desafios
  const morningChallengeTime = profile?.challengeReminderTime || safeGet('nutri-challenge-time-morning') || DEFAULT_CHALLENGE_TIMES.morningReminder;
  const eveningChallengeTime = profile?.challengeReviewTime || safeGet('nutri-challenge-time-evening') || DEFAULT_CHALLENGE_TIMES.eveningReview;

  // Personalizar texto com desafios ativos se houver
  const activeChallenges = profile?.weeklyChallenges?.filter(c => !c.completed) || [];
  const primaryChallenge = activeChallenges[0];

  const challengeMorningBody = primaryChallenge
    ? `Desafio ativo: "${primaryChallenge.title}". Seu progresso: ${primaryChallenge.current}/${primaryChallenge.target}! Vamos conquistar os ${primaryChallenge.rewardPoints} pontos!`
    : 'Seus desafios de hidratação, proteínas e treinos de hoje estão disponíveis. Venha bater sua meta!';

  const challengeEveningBody = primaryChallenge
    ? `Como foram seus hábitos hoje? Registre sua alimentação e conclua o desafio "${primaryChallenge.title}" para manter seu streak!`
    : 'Revise suas metas nutricionais e registros de água do dia antes de descansar!';

  const challenges: ScheduledChallengePayload[] = [
    {
      id: 'morning-challenge',
      title: 'Desafio do Dia NutriAI 🎯',
      time: morningChallengeTime,
      body: challengeMorningBody
    },
    {
      id: 'evening-review',
      title: 'Revisão Noturna de Metas 🏆',
      time: eveningChallengeTime,
      body: challengeEveningBody
    }
  ];

  return {
    mealAlertsEnabled,
    challengeAlertsEnabled,
    meals,
    challenges
  };
}

/**
 * Envia as regras de agendamento para o Service Worker ativo via postMessage
 */
export async function syncSchedulesToServiceWorker(profile: UserProfile | null): Promise<boolean> {
  const payload = buildSchedulePayload(profile);

  // Armazena no localStorage como redundância local
  safeSet('nutri-notification-schedules', JSON.stringify(payload));

  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    if (registration && registration.active) {
      // Registra Periodic Background Sync se suportado pelo navegador
      if ('periodicSync' in registration) {
        try {
          await (registration as any).periodicSync.register('nutriai-periodic-alerts', {
            minInterval: 15 * 60 * 1000 // 15 minutos
          });
        } catch (syncErr) {
          // Normal em navegadores sem permissão explícita de PWA instalada
        }
      }

      registration.active.postMessage({
        type: 'SCHEDULE_NOTIFICATIONS',
        payload
      });
      console.log('[PushScheduler] Agendamento enviado ao Service Worker ativo:', payload);
      return true;
    } else if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'SCHEDULE_NOTIFICATIONS',
        payload
      });
      return true;
    }
  } catch (err) {
    console.warn('[PushScheduler] Falha ao comunicar com o Service Worker:', err);
  }

  return false;
}

/**
 * Dispara uma notificação nativa imediata de teste utilizando o Service Worker
 */
export async function triggerNativeTestNotification(
  title: string = 'NutriAI - Teste de Notificação Nativa 🥗',
  body: string = 'Seus alertas de refeições e desafios estão funcionando perfeitamente via Service Worker!'
): Promise<boolean> {
  // Solicita permissão se ainda não foi decidida
  if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') return false;
  }

  playSfx('notification');
  vibrate([100, 50, 150]);

  // Tenta via Service Worker Registration (Push nativo em background)
  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.ready;
      if (registration && registration.showNotification) {
        await registration.showNotification(title, {
          body,
          icon: '/pwa-192x192.png',
          badge: '/icon-192.png',
          vibrate: [200, 100, 200],
          tag: `test-manual-${Date.now()}`,
          data: { url: '/?tab=profile', test: true },
          actions: [
            { action: 'open', title: 'Abrir App' },
            { action: 'dismiss', title: 'Fechar' }
          ]
        } as any);

        // Envia também para o Service Worker atualizar seu ciclo
        if (registration.active) {
          registration.active.postMessage({
            type: 'TEST_PUSH_NOTIFICATION',
            payload: { title, body }
          });
        }
        return true;
      }
    } catch (swErr) {
      console.warn('[PushScheduler] Fallback de notificação fora do Service Worker:', swErr);
    }
  }

  // Fallback padrão se Service Worker indisponível
  if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body,
        icon: '/pwa-192x192.png'
      });
      return true;
    } catch (e) {
      console.warn('[PushScheduler] Fallback Notification falhou:', e);
    }
  }

  return false;
}
