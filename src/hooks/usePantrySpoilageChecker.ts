import { useEffect } from 'react';
import { collection, getDocs, where, query } from '../lib/firebase';
import { UserProfile } from '../types';

export const usePantrySpoilageChecker = (profile: UserProfile | null) => {
  useEffect(() => {
    if (!profile || !profile.id) return;

    const checkSpoilage = async () => {
      try {
        const fridgeRef = collection(null, 'fridgeItems'); // Assumed path based on firebase.ts
        // Query to get items for this user.
        // Assuming fridgeItems have a userId field
        const q = query(fridgeRef, where('userId', '==', profile.id));
        const snapshot = await getDocs(q);
        
        const fridgeItems = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as any[];

        const expiringItems = fridgeItems.filter(item => {
          if (!item.expirationDate) return false;
          const exp = new Date(item.expirationDate);
          const now = new Date();
          const twoDaysFromNow = new Date();
          twoDaysFromNow.setDate(now.getDate() + 2);
          return exp <= twoDaysFromNow && exp > now;
        });

        if (expiringItems.length > 0 && 'serviceWorker' in navigator) {
          const registration = await navigator.serviceWorker.ready;
          if (registration.active) {
            registration.active.postMessage({
              type: 'SCHEDULE_PANTRY_NOTIFICATIONS',
              payload: expiringItems
            });
          }
        }
      } catch (err) {
        console.error('Error checking pantry spoilage:', err);
      }
    };

    // Check on mount
    checkSpoilage();

    // Check periodically? Maybe not necessary if it just runs on app load/active
    // Or set an interval
    const interval = setInterval(checkSpoilage, 1000 * 60 * 60); // Check every hour
    return () => clearInterval(interval);
  }, [profile]);
};
