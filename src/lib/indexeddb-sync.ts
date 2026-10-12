import { openDB, IDBPDatabase } from 'idb';
import { db } from './firebase';
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { playSfx, vibrate } from './sensory';

const DB_NAME = 'NutriAIOfflineSyncDB';
const STORE_PREFERENCES = 'preferences';
const STORE_DRAFTS = 'mealPlanDrafts';
const STORE_QUEUE = 'syncQueue';
const DB_VERSION = 1;

export interface SyncQueueItem {
  id: string;
  collection: string;
  docId: string;
  data: any;
  timestamp: number;
  attempts: number;
}

let dbPromise: Promise<IDBPDatabase<any>> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(database) {
        if (!database.objectStoreNames.contains(STORE_PREFERENCES)) {
          database.createObjectStore(STORE_PREFERENCES);
        }
        if (!database.objectStoreNames.contains(STORE_DRAFTS)) {
          database.createObjectStore(STORE_DRAFTS);
        }
        if (!database.objectStoreNames.contains(STORE_QUEUE)) {
          database.createObjectStore(STORE_QUEUE, { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
}

export async function saveLocalPreference(key: string, value: any): Promise<void> {
  try {
    const database = await getDB();
    await database.put(STORE_PREFERENCES, value, key);
    playSfx('tap');
  } catch (err) {
    console.warn('IndexedDB savePreference fallback to localStorage', err);
    localStorage.setItem(`pref_${key}`, JSON.stringify(value));
  }
}

export async function getLocalPreference<T>(key: string): Promise<T | null> {
  try {
    const database = await getDB();
    const val = await database.get(STORE_PREFERENCES, key);
    if (val !== undefined) return val;
    const ls = localStorage.getItem(`pref_${key}`);
    return ls ? JSON.parse(ls) : null;
  } catch (err) {
    const ls = localStorage.getItem(`pref_${key}`);
    return ls ? JSON.parse(ls) : null;
  }
}

export async function saveMealPlanDraft(draftId: string, draftData: any): Promise<void> {
  try {
    const database = await getDB();
    await database.put(STORE_DRAFTS, { ...draftData, updatedAt: Date.now() }, draftId);
    
    // Add to sync queue for Firebase consistency
    const queueItem: SyncQueueItem = {
      id: `draft_${draftId}_${Date.now()}`,
      collection: 'mealPlanDrafts',
      docId: draftId,
      data: { ...draftData, updatedAt: serverTimestamp() },
      timestamp: Date.now(),
      attempts: 0,
    };
    await database.put(STORE_QUEUE, queueItem);
    vibrate(30);
    playSfx('success');
    
    if (navigator.onLine) {
      syncQueueWithFirebase().catch(console.error);
    }
  } catch (err) {
    console.error('Error saving meal plan draft in IndexedDB:', err);
  }
}

export async function getMealPlanDrafts(): Promise<any[]> {
  try {
    const database = await getDB();
    return await database.getAll(STORE_DRAFTS);
  } catch (err) {
    console.error('Error retrieving meal plan drafts:', err);
    return [];
  }
}

export async function queueSyncAction(collectionName: string, docId: string, data: any): Promise<void> {
  try {
    const database = await getDB();
    const queueItem: SyncQueueItem = {
      id: `${collectionName}_${docId}_${Date.now()}`,
      collection: collectionName,
      docId,
      data: { ...data, clientUpdatedAt: serverTimestamp() },
      timestamp: Date.now(),
      attempts: 0,
    };
    await database.put(STORE_QUEUE, queueItem);
    if (navigator.onLine) {
      syncQueueWithFirebase().catch(console.error);
    }
  } catch (err) {
    console.error('Error queueing sync action:', err);
  }
}

export async function syncQueueWithFirebase(): Promise<void> {
  if (!navigator.onLine) return;
  try {
    const database = await getDB();
    const tx = database.transaction(STORE_QUEUE, 'readwrite');
    const store = tx.objectStore(STORE_QUEUE);
    const items: SyncQueueItem[] = await store.getAll();

    for (const item of items) {
      try {
        const docRef = doc(collection(db, item.collection), item.docId);
        await setDoc(docRef, item.data, { merge: true });
        // Remove from queue after successful sync
        await database.delete(STORE_QUEUE, item.id);
      } catch (itemErr) {
        console.error(`Failed to sync item ${item.id}:`, itemErr);
        item.attempts += 1;
        if (item.attempts < 5) {
          await database.put(STORE_QUEUE, item);
        }
      }
    }
  } catch (err) {
    console.error('Error during syncQueueWithFirebase:', err);
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    syncQueueWithFirebase().catch(console.error);
  });
}
