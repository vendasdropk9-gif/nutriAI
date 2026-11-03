import { openDB, IDBPDatabase } from 'idb';
import { UserProfile } from '../types';

const DB_NAME = 'NutriAIProfileSettingsDB';
const STORE_NAME = 'user_data';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase> | null = null;

export function getProfileDB(): Promise<IDBPDatabase> | null {
  if (typeof window === 'undefined') return null;
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      },
    });
  }
  return dbPromise;
}

/**
 * Saves NutriAI profile settings and Weekly Report history (intakeLogs, etc.) to IndexedDB for robust offline access.
 */
export async function saveProfileToIndexedDB(profile: UserProfile): Promise<void> {
  try {
    const db = await getProfileDB();
    if (db) {
      await db.put(STORE_NAME, profile, 'current_profile');
      localStorage.setItem('nutriai_offline_profile_backup', JSON.stringify(profile));
    }
  } catch (err) {
    console.warn('[ProfileStorageIDB] Failed to save profile to IndexedDB:', err);
  }
}

/**
 * Loads NutriAI profile settings and Weekly Report history from IndexedDB with localStorage fallback.
 */
export async function loadProfileFromIndexedDB(): Promise<UserProfile | null> {
  try {
    const db = await getProfileDB();
    if (db) {
      const profile = await db.get(STORE_NAME, 'current_profile');
      if (profile) return profile;
    }
  } catch (err) {
    console.warn('[ProfileStorageIDB] Failed to load profile from IndexedDB:', err);
  }

  try {
    const raw = localStorage.getItem('nutriai_offline_profile_backup');
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    // ignore
  }

  return null;
}
