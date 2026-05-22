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

export function useMealPushNotifications(profile: UserProfile | null, addNotification: (notif: { title: string; message: string; type: any }) => void) {
  const notifiedMeals = useRef<Set<string>>(new Set());

  useEffect(() => {
    // Request permission on mount
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

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
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, {
      body,
      icon: '/icon.png', // Fallback, assuming there might be an icon
    });
  } else {
    console.log('Push notification (fallback):', title, body);
  }
}
