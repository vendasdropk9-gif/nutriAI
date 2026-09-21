import { playSfx, vibrate } from './sensory';

export interface PendingMutation {
  id: string;
  type: 'log_meal' | 'update_pantry' | 'update_water' | 'update_vital';
  data: any;
  createdAt: number;
}

const STORAGE_KEY = 'nutriai_pending_offline_mutations';

export function getPendingOfflineMutations(): PendingMutation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function queueOfflineMutation(type: PendingMutation['type'], data: any): PendingMutation {
  const mutation: PendingMutation = {
    id: `mutation_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    type,
    data,
    createdAt: Date.now()
  };

  const current = getPendingOfflineMutations();
  const next = [...current, mutation];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));

  playSfx('tap');
  vibrate(10);

  // Dispatch custom window event
  window.dispatchEvent(new CustomEvent('nutri:offline-mutations-updated', { detail: next }));

  return mutation;
}

export function clearPendingOfflineMutations(): void {
  localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent('nutri:offline-mutations-updated', { detail: [] }));
}

export async function flushOfflineMutations(): Promise<number> {
  const pending = getPendingOfflineMutations();
  if (pending.length === 0) return 0;

  // Process queued items (simulating network sync to Firestore)
  await new Promise(resolve => setTimeout(resolve, 800));

  clearPendingOfflineMutations();

  playSfx('success');
  vibrate([20, 100, 20]);

  return pending.length;
}
