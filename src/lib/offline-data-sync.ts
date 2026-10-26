import { openDB, IDBPDatabase } from 'idb';
import { db } from './firebase';
import { collection, addDoc, setDoc, doc } from 'firebase/firestore';
import { playSfx, vibrate } from './sensory';

const DB_NAME = 'NutriAIOfflineSyncDB';
const STORE_NAME = 'offline_actions';
const DB_VERSION = 1;

export interface OfflineAction {
  id?: string;
  type: 'log_intake' | 'save_meal_plan' | 'log_habit' | string;
  targetCollection: string; // e.g. 'intakeLogs', 'mealPlans', 'habitLogs'
  actionType: 'create' | 'update' | 'set';
  documentId?: string;
  data: any;
  timestamp: number;
}

let idbPromise: Promise<IDBPDatabase> | null = null;

export function getOfflineDB(): Promise<IDBPDatabase> | null {
  if (typeof window === 'undefined') return null;
  if (!idbPromise) {
    idbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      },
    });
  }
  return idbPromise;
}

/**
 * Persist user action in IndexedDB when offline (or queue it).
 */
export async function saveOfflineAction(
  type: OfflineAction['type'],
  targetCollection: string,
  actionType: OfflineAction['actionType'],
  data: any,
  documentId?: string
): Promise<string> {
  const actionRecord: OfflineAction = {
    id: `act_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    type,
    targetCollection,
    actionType,
    documentId,
    data,
    timestamp: Date.now(),
  };

  try {
    const database = await getOfflineDB();
    if (database) {
      await database.put(STORE_NAME, actionRecord);
    }
  } catch (err) {
    console.warn('[OfflineDataSync] Failed to save action to IndexedDB:', err);
    try {
      const existing = JSON.parse(localStorage.getItem('nutriai_offline_actions_fallback') || '[]');
      existing.push(actionRecord);
      localStorage.setItem('nutriai_offline_actions_fallback', JSON.stringify(existing));
    } catch (e) {
      // ignore
    }
  }

  playSfx('tap');
  vibrate(15);

  const count = await getPendingOfflineActionsCount();
  window.dispatchEvent(
    new CustomEvent('nutri:offline-actions-updated', {
      detail: count,
    })
  );

  if (typeof navigator !== 'undefined' && navigator.onLine) {
    syncOfflineActionsWithFirebase().catch(() => {});
  }

  return actionRecord.id!;
}

/**
 * Retrieves all pending offline actions from IndexedDB (and fallback).
 */
export async function getPendingOfflineActions(): Promise<OfflineAction[]> {
  try {
    const database = await getOfflineDB();
    if (database) {
      const items = await database.getAll(STORE_NAME);
      return items || [];
    }
  } catch (err) {
    console.warn('[OfflineDataSync] Failed to get pending actions from IDB:', err);
  }

  try {
    const raw = localStorage.getItem('nutriai_offline_actions_fallback');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function getPendingOfflineActionsCount(): Promise<number> {
  const actions = await getPendingOfflineActions();
  return actions.length;
}

/**
 * Removes a synced action from IndexedDB / fallback.
 */
export async function removeOfflineAction(id: string): Promise<void> {
  try {
    const database = await getOfflineDB();
    if (database) {
      await database.delete(STORE_NAME, id);
    }
  } catch (err) {
    console.warn('[OfflineDataSync] Failed to delete action from IDB:', err);
  }

  try {
    const raw = localStorage.getItem('nutriai_offline_actions_fallback');
    if (raw) {
      const parsed: OfflineAction[] = JSON.parse(raw);
      const filtered = parsed.filter(a => a.id !== id);
      localStorage.setItem('nutriai_offline_actions_fallback', JSON.stringify(filtered));
    }
  } catch {
    // ignore
  }
}

/**
 * Automatically synchronizes pending actions with Firebase Firestore when connectivity is detected.
 */
export async function syncOfflineActionsWithFirebase(): Promise<number> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return 0;
  }

  const actions = await getPendingOfflineActions();
  if (actions.length === 0) return 0;

  console.log(`[OfflineDataSync] Starting sync of ${actions.length} offline actions to Firebase...`);
  let syncedCount = 0;

  for (const action of actions) {
    try {
      const colRef = collection(db, action.targetCollection);
      if (action.actionType === 'create') {
        if (action.documentId) {
          const docRef = doc(db, action.targetCollection, action.documentId);
          await setDoc(docRef, { ...action.data, syncedAt: Date.now() }, { merge: true });
        } else {
          await addDoc(colRef, { ...action.data, syncedAt: Date.now() });
        }
      } else if (action.actionType === 'update' || action.actionType === 'set') {
        if (action.documentId) {
          const docRef = doc(db, action.targetCollection, action.documentId);
          await setDoc(docRef, { ...action.data, syncedAt: Date.now() }, { merge: true });
        } else {
          await addDoc(colRef, { ...action.data, syncedAt: Date.now() });
        }
      }

      if (action.id) {
        await removeOfflineAction(action.id);
      }
      syncedCount++;
    } catch (err) {
      console.error(`[OfflineDataSync] Failed to sync action ${action.id}:`, err);
    }
  }

  if (syncedCount > 0) {
    playSfx('success');
    vibrate([20, 80, 20]);
    const count = await getPendingOfflineActionsCount();
    window.dispatchEvent(
      new CustomEvent('nutri:offline-actions-updated', {
        detail: count,
      })
    );
  }

  return syncedCount;
}

// Initialize connectivity observer
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('[OfflineDataSync] Browser online detected. Triggering sync...');
    syncOfflineActionsWithFirebase().catch(err => console.error('Sync error:', err));
  });

  window.addEventListener('offline', () => {
    console.log('[OfflineDataSync] Browser offline detected.');
  });
}
