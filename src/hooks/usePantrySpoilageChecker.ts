import { useEffect, useCallback } from 'react';
import { collection, getDocs, db, auth } from '../lib/firebase';
import { UserProfile, PantryItem } from '../types';
import { playSfx, vibrate } from '../lib/sensory';

/**
 * Calculates remaining days until item expiration
 */
export function calculatePantryDaysRemaining(expDateStr?: string): number {
  if (!expDateStr) return 999;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expDate = new Date(expDateStr);
  expDate.setHours(0, 0, 0, 0);
  const diffTime = expDate.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Dispatches a native push notification and service worker notification for expiring pantry items
 */
export async function sendPantryExpirationNotification(
  expiringItems: PantryItem[], 
  options: { force?: boolean } = {}
): Promise<boolean> {
  if (!expiringItems || expiringItems.length === 0) return false;

  const count = expiringItems.length;
  const firstItem = expiringItems[0]?.name || 'Item da cozinha';
  const title = `Alerta de Validade (${count} ${count > 1 ? 'itens' : 'item'}) ⚠️`;
  const body = count === 1
    ? `"${firstItem}" vence em breve! Consuma ou prepare uma receita para evitar o desperdício.`
    : `"${firstItem}" e mais ${count - 1} item(ns) estão prestes a vencer na sua despensa.`;

  // Check rate limiting (at most once every 6 hours unless forced)
  const lastAlertTime = Number(localStorage.getItem('nutri_last_pantry_alert_time') || 0);
  const now = Date.now();
  const MIN_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours

  if (!options.force && now - lastAlertTime < MIN_INTERVAL_MS) {
    return false;
  }

  localStorage.setItem('nutri_last_pantry_alert_time', String(now));

  // Audio/sensory feedback
  try {
    playSfx('notification');
    vibrate([150, 80, 150]);
  } catch (e) {}

  // 1. Dispatch in-app custom event for banner/toast
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('app:pantryExpiringAlert', {
      detail: {
        items: expiringItems,
        count,
        title,
        body
      }
    }));
  }

  // 2. Send via Service Worker
  let swSent = false;
  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.ready;
      if (registration && registration.active) {
        registration.active.postMessage({
          type: 'SCHEDULE_PANTRY_NOTIFICATIONS',
          payload: {
            items: expiringItems,
            title,
            body
          }
        });
        swSent = true;
      }
      
      if (registration && registration.showNotification && Notification.permission === 'granted') {
        await registration.showNotification(title, {
          body,
          icon: '/pwa-192x192.png',
          badge: '/icon-192.png',
          vibrate: [200, 100, 200],
          tag: `pantry-spoilage-${now}`,
          data: { url: '/?tab=pantry', type: 'pantry_spoilage' },
          actions: [
            { action: 'open_pantry', title: 'Ver Despensa 🛒' },
            { action: 'dismiss', title: 'Fechar' }
          ]
        } as any);
        return true;
      }
    } catch (swErr) {
      console.warn('[PantrySpoilageChecker] Service Worker notification notice:', swErr);
    }
  }

  // 3. Fallback to native window Notification API
  if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body,
        icon: '/pwa-192x192.png'
      });
      return true;
    } catch (nErr) {
      console.warn('[PantrySpoilageChecker] Fallback Notification notice:', nErr);
    }
  }

  return swSent;
}

/**
 * Performs a comprehensive pantry spoilage check across Firestore and localStorage
 */
export async function checkPantrySpoilage(
  profile: UserProfile | null, 
  options: { force?: boolean } = {}
): Promise<PantryItem[]> {
  const userId = auth.currentUser?.uid || profile?.id;
  let items: PantryItem[] = [];

  // Check localStorage first
  try {
    const local = localStorage.getItem('nutri_pantry_items');
    if (local) {
      const parsed = JSON.parse(local);
      if (Array.isArray(parsed)) {
        items = parsed;
      }
    }
  } catch (e) {}

  // Merge with Firestore if user is authenticated
  if (auth.currentUser && userId) {
    try {
      const snapshot = await getDocs(collection(db, `users/${userId}/pantryItems`));
      if (!snapshot.empty) {
        const firestoreItems = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as PantryItem[];
        
        // Merge without duplicates
        const seenIds = new Set(firestoreItems.map(i => i.id));
        const nonDuplicateLocal = items.filter(i => !seenIds.has(i.id));
        items = [...firestoreItems, ...nonDuplicateLocal];
      }
    } catch (firestoreErr) {
      console.warn('[PantrySpoilageChecker] Firestore fetch notice:', firestoreErr);
    }
  }

  if (items.length === 0) return [];

  // Filter items expiring in <= 3 days (and not already expired > 1 day ago)
  const expiringItems = items.filter(item => {
    if (!item.expirationDate) return false;
    const days = calculatePantryDaysRemaining(item.expirationDate);
    // Include items expiring between today and in 3 days, or expired today
    return days >= -1 && days <= 3;
  });

  if (expiringItems.length > 0) {
    await sendPantryExpirationNotification(expiringItems, options);
  }

  return expiringItems;
}

/**
 * React hook that periodically checks for nearing-expiration pantry items
 * and triggers push notifications to minimize food waste.
 */
export const usePantrySpoilageChecker = (profile: UserProfile | null) => {
  const runCheck = useCallback(() => {
    checkPantrySpoilage(profile).catch(() => {});
  }, [profile]);

  useEffect(() => {
    // 1. Initial check on mount
    runCheck();

    // 2. Check whenever user switches back to the tab
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        runCheck();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    // 3. Periodic check every 45 minutes
    const interval = setInterval(runCheck, 45 * 60 * 1000);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      clearInterval(interval);
    };
  }, [runCheck]);
};
