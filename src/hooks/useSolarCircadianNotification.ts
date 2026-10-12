import { useEffect } from 'react';
import { UserProfile } from '../types';

export const useSolarCircadianNotification = (
  profile: UserProfile | null,
  addNotification: (notif: { title: string; message: string; type: 'info' | 'success' | 'warning' | 'error' | 'point' }) => void,
  updateProfile: (updater: (prev: UserProfile | null) => UserProfile | null) => void
) => {
  useEffect(() => {
    if (!profile?.circadianNotificationConfig?.enabled) return;

    const checkSolarCircadian = async () => {
        if (!navigator.geolocation) return;

        navigator.geolocation.getCurrentPosition(async (position) => {
            const { latitude, longitude } = position.coords;
            try {
                const response = await fetch(`https://api.sunrise-sunset.org/json?lat=${latitude}&lng=${longitude}&formatted=0`);
                const data = await response.json();
                if (data.status === 'OK') {
                    const sunrise = new Date(data.results.sunrise);
                    const now = new Date();
                    
                    // Trigger if it is roughly sunrise time (within 30 mins)
                    const diffMinutes = Math.abs(now.getTime() - sunrise.getTime()) / (1000 * 60);
                    
                    if (diffMinutes < 30) {
                        // Check if we already notified today
                        const today = now.toISOString().split('T')[0];
                        if (profile.circadianNotificationConfig?.lastNotifiedDate === today) return;

                        // Trigger notification
                        addNotification({
                            title: 'Bom Dia Solar! ☀️',
                            message: 'Seu ciclo circadiano está começando. Ajustando a iluminação para um despertar produtivo.',
                            type: 'info'
                        });

                        // Update profile to mark notified
                        updateProfile(prev => prev ? {
                          ...prev,
                          circadianNotificationConfig: {
                            ...prev.circadianNotificationConfig!,
                            lastNotifiedDate: today
                          }
                        } : null);
                        
                        // Adjust interface intensity via CSS variable
                        document.documentElement.style.setProperty('--app-brightness', '1.1');
                        setTimeout(() => {
                            document.documentElement.style.setProperty('--app-brightness', '1.0');
                        }, 5000);
                    }
                }
            } catch (error) {
                console.error("Failed to fetch sun times:", error);
            }
        });
    };

    const interval = setInterval(checkSolarCircadian, 60000 * 15); // Check every 15 mins
    checkSolarCircadian();

    return () => clearInterval(interval);
  }, [profile, addNotification, updateProfile]);
};
