import { useState, useEffect } from 'react';
import { UserPresence, PresenceStatus } from '../types';
import { 
  presenceManager, 
  isPresenceActive, 
  getPresenceStatusLabel,
  INITIAL_DEMO_BUYERS 
} from '../lib/presenceService';

export function useAllPresences() {
  const [presences, setPresences] = useState<UserPresence[]>(() => presenceManager.getAllPresences());

  useEffect(() => {
    const unsubscribe = presenceManager.subscribe((list) => {
      setPresences([...list]);
    });
    return () => unsubscribe();
  }, []);

  const activeCount = presences.filter(p => isPresenceActive(p)).length;
  const inactiveCount = presences.length - activeCount;

  return {
    presences,
    activeCount,
    inactiveCount,
    toggleSimulation: (buyerId: string, status?: PresenceStatus) => 
      presenceManager.toggleBuyerPresenceSimulation(buyerId, status)
  };
}

export function useUserPresence(userIdOrNameOrEmail?: string) {
  const [presence, setPresence] = useState<UserPresence | null>(() => 
    presenceManager.getPresenceForUser(userIdOrNameOrEmail)
  );

  useEffect(() => {
    if (!userIdOrNameOrEmail) return;

    const unsubscribe = presenceManager.subscribe(() => {
      const current = presenceManager.getPresenceForUser(userIdOrNameOrEmail);
      setPresence(current ? { ...current } : null);
    });

    return () => unsubscribe();
  }, [userIdOrNameOrEmail]);

  const isActive = isPresenceActive(presence);
  const statusInfo = getPresenceStatusLabel(presence);

  return {
    presence,
    isActive,
    statusInfo
  };
}
