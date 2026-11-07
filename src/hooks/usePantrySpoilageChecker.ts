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

export const DEFAULT_PANTRY_SPOILAGE_DAYS_THRESHOLD = 3;
export const PANTRY_LEAD_TIME_STORAGE_KEY = 'nutri_pantry_spoilage_lead_days';

/**
 * Gets configured lead time threshold in days (default 3, user can choose 1, 2, 3, 5, etc.)
 */
export function getPantrySpoilageLeadDays(): number {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = localStorage.getItem(PANTRY_LEAD_TIME_STORAGE_KEY);
      if (stored) {
        const parsed = parseInt(stored, 10);
        if (!isNaN(parsed) && parsed > 0 && parsed <= 15) {
          return parsed;
        }
      }
    }
  } catch (e) {}
  return DEFAULT_PANTRY_SPOILAGE_DAYS_THRESHOLD;
}

/**
 * Saves configured lead time threshold in days (e.g. 1, 3, or 5 days)
 */
export function setPantrySpoilageLeadDays(days: number): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(PANTRY_LEAD_TIME_STORAGE_KEY, String(days));
      window.dispatchEvent(new CustomEvent('nutri-pantry-lead-days-changed', { detail: { days } }));
    }
  } catch (e) {}
}

/**
 * Dispatches a native push notification and service worker notification for expiring pantry items,
 * recommending a specific recipe from the QuickDishes catalog to avoid food waste.
 */
export async function sendPantryExpirationNotification(
  expiringItems: PantryItem[], 
  options: { force?: boolean; leadDays?: number } = {}
): Promise<boolean> {
  if (!expiringItems || expiringItems.length === 0) return false;

  const count = expiringItems.length;
  const firstItem = expiringItems[0]?.name || 'Item da cozinha';
  const leadDays = options.leadDays || getPantrySpoilageLeadDays();
  const minDaysRemaining = Math.min(...expiringItems.map(i => calculatePantryDaysRemaining(i.expirationDate)));

  // Pick or recommend a specific Quick Dish recipe from curated catalog
  const suggestedRecipeName = expiringItems.length > 0 && expiringItems[0]?.category?.toLowerCase().includes('carne')
    ? 'Wrap Fit Integral de Frango Desfiado'
    : expiringItems.length > 0 && (expiringItems[0]?.category?.toLowerCase().includes('laticínio') || expiringItems[0]?.name?.toLowerCase().includes('ovo'))
    ? 'Omelete Proteico Gourmet com Vegetais'
    : 'Bowl Colorido com Legumes e Quinoa Real';

  const title = minDaysRemaining <= 0
    ? `⚠️ Atenção: ${firstItem} vence hoje!`
    : `Alerta de Validade (${count} ${count > 1 ? 'itens' : 'item'} a vencer em ≤${leadDays}d) ⏳`;

  const body = count === 1
    ? `"${firstItem}" vence ${minDaysRemaining <= 0 ? 'hoje' : `em ${minDaysRemaining}d`}. Sugestão de receita rápida: prepare "${suggestedRecipeName}" para evitar o desperdício!`
    : `"${firstItem}" e mais ${count - 1} alimento(s) vencem em breve. Prepare "${suggestedRecipeName}" para aproveitá-los!`;

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
        body,
        recommendedRecipe: suggestedRecipeName,
        actionLabel: 'Cozinhar Prato Rápido 🍳'
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
  profileOrOptions?: UserProfile | null | { force?: boolean; leadDays?: number }, 
  maybeOptions?: { force?: boolean; leadDays?: number }
): Promise<PantryItem[]> {
  let profile: UserProfile | null = null;
  let options: { force?: boolean; leadDays?: number } = {};

  if (profileOrOptions && ('force' in (profileOrOptions as any) || 'leadDays' in (profileOrOptions as any))) {
    options = profileOrOptions as { force?: boolean; leadDays?: number };
  } else if (profileOrOptions) {
    profile = profileOrOptions as UserProfile;
    options = maybeOptions || {};
  } else {
    options = maybeOptions || {};
  }

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

  const leadDays = options.leadDays || getPantrySpoilageLeadDays();

  // Filter items expiring in <= leadDays (and not already expired > 1 day ago)
  const expiringItems = items.filter(item => {
    if (!item.expirationDate) return false;
    const days = calculatePantryDaysRemaining(item.expirationDate);
    // Include items expiring between today and leadDays, or expired today
    return days >= -1 && days <= leadDays;
  });

  if (expiringItems.length > 0) {
    await sendPantryExpirationNotification(expiringItems, { ...options, leadDays });
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

    // 3. Listen to lead days changes from Pantry configuration panel
    const handleLeadDaysChanged = () => {
      runCheck();
    };
    window.addEventListener('nutri-pantry-lead-days-changed', handleLeadDaysChanged);

    // 4. Periodic check every 45 minutes
    const interval = setInterval(runCheck, 45 * 60 * 1000);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('nutri-pantry-lead-days-changed', handleLeadDaysChanged);
      clearInterval(interval);
    };
  }, [runCheck]);
};

