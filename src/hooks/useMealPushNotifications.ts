import { useEffect, useRef } from 'react';
import { UserProfile } from '../types';

const defaultMealTimes = {
  breakfast: { hour: 8, minute: 0, label: 'Café da Manhã' },
  lunch: { hour: 12, minute: 30, label: 'Almoço' },
  snack: { hour: 16, minute: 0, label: 'Lanche' },
  dinner: { hour: 19, minute: 30, label: 'Jantar' },
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

const PROACTIVE_TIPS = [
  "Você bebeu pouca água hoje.",
  "Sua ingestão de proteínas está abaixo da meta.",
  "Que tal uma caminhada de 20 minutos?",
  "Há frutas na sua geladeira que podem estragar em breve."
];

export function useMealPushNotifications(profile: UserProfile | null, addNotification: (notif: { title: string; message: string; type: any }) => void) {
  const notifiedMeals = useRef<Set<string>>(new Set());
  const proactiveNotified = useRef(false);

  useEffect(() => {
    try {
      // Request permission on mount
      if ('Notification' in window && typeof Notification !== 'undefined' && Notification.permission === 'default') {
        Notification.requestPermission().catch(() => {});
      }
    } catch (e) {
      console.warn('Notification API not supported or blocked in this environment:', e);
    }
  }, []);

  useEffect(() => {
    if (!profile) return;

    // Simulate AI Proactive Assistant Notification
    const proactiveInterval = setInterval(() => {
       if (!proactiveNotified.current && Math.random() > 0.5) {
          const randomTip = PROACTIVE_TIPS[Math.floor(Math.random() * PROACTIVE_TIPS.length)];
          addNotification({
            title: 'Assistente Proativo 🤖',
            message: randomTip,
            type: 'info'
          });
          sendPushNotification('Assistente Proativo 🤖', randomTip);
          proactiveNotified.current = true;
       }
    }, 45000); // Check every 45s, send once per session roughly

    return () => clearInterval(proactiveInterval);
  }, [profile]);

  useEffect(() => {
    if (!profile || !profile.mealPlan) return;

    const interval = setInterval(() => {
      const now = new Date();
      const currentDayName = DAYS_OF_WEEK[now.getDay()];
      const dayPlan = profile.mealPlan![currentDayName]?.meals;

      if (!dayPlan) return;

      Object.entries(defaultMealTimes).forEach(([mealKey, timeObj]) => {
        const hasMealPlanned = !!dayPlan[mealKey as keyof typeof dayPlan];
        
        if (hasMealPlanned) {
          const isTime = now.getHours() === timeObj.hour && now.getMinutes() === timeObj.minute;
          const notificationKey = `${now.toDateString()}-${mealKey}`;

          if (isTime && !notifiedMeals.current.has(notificationKey)) {
            // It's time for the meal!
            const recipeName = dayPlan[mealKey as keyof typeof dayPlan]?.name || 'sua refeição';
            
            sendPushNotification(
              `Hora do ${timeObj.label}! 🍲`,
              `Está na hora de preparar: ${recipeName}. Bom apetite!`
            );
            
            addNotification({
              title: `Hora do ${timeObj.label}! 🍲`,
              message: `Está na hora de preparar: ${recipeName}. Bom apetite!`,
              type: 'info'
            });
            
            notifiedMeals.current.add(notificationKey);
          }
        }
      });
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [profile]);
}

function sendPushNotification(title: string, body: string) {
  try {
    if ('Notification' in window && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: '/icon.png', // Fallback, assuming there might be an icon
      });
    } else {
      console.log('Push notification (fallback):', title, body);
    }
  } catch (e) {
    console.log('Push notification (fallback - blocked):', title, body, e);
  }
}
