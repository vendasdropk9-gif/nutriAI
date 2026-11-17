import { openDB, IDBPDatabase } from 'idb';
import { UserProfile } from '../types';
import { safeGet, safeSet } from './storage';

const DB_NAME = 'NutriAIProfileSettingsDB';
const STORE_NAME = 'user_data';
const DB_VERSION = 1;
const LEGACY_STORAGE_KEY = 'nutriai_offline_profile_backup';
const CACHE_META_KEY = 'nutriai_offline_profile_meta';

export interface ProfileCacheMetadata {
  userId?: string;
  cachedAt: string;
  hasGoals: boolean;
  hasMealPlan: boolean;
}

let dbPromise: Promise<IDBPDatabase> | null = null;

export function getProfileDB(): Promise<IDBPDatabase> | null {
  if (typeof window === 'undefined' || typeof indexedDB === 'undefined') return null;
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

function getUserStorageKey(uid?: string): string {
  return uid ? `${LEGACY_STORAGE_KEY}_${uid}` : LEGACY_STORAGE_KEY;
}

/**
 * Synchronously caches user profile (including goals and mealPlan) into durable browser storage
 * for zero-latency offline startup reads.
 */
export function saveCachedProfileSync(profile: UserProfile, uid?: string): void {
  const targetUid = uid || profile.id;
  const cachedPayload: UserProfile = {
    ...profile,
    updatedAt: profile.updatedAt || new Date().toISOString(),
  };

  try {
    const serialized = JSON.stringify(cachedPayload);
    safeSet(LEGACY_STORAGE_KEY, serialized);
    if (targetUid) {
      safeSet(getUserStorageKey(targetUid), serialized);
    }

    const meta: ProfileCacheMetadata = {
      userId: targetUid,
      cachedAt: new Date().toISOString(),
      hasGoals: Boolean(profile.goals),
      hasMealPlan: Boolean(profile.mealPlan && Object.keys(profile.mealPlan).length > 0),
    };
    safeSet(CACHE_META_KEY, JSON.stringify(meta));
  } catch (err) {
    console.warn('[ProfileStorageIDB] Failed synchronous profile cache write:', err);
  }
}

/**
 * Synchronously loads cached user profile (including goals and mealPlan) for immediate offline availability.
 */
export function loadCachedProfileSync(uid?: string): UserProfile | null {
  try {
    if (uid) {
      const userRaw = safeGet(getUserStorageKey(uid));
      if (userRaw) {
        return JSON.parse(userRaw) as UserProfile;
      }
    }
    const raw = safeGet(LEGACY_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as UserProfile;
      if (!uid || !parsed.id || parsed.id === uid) {
        return parsed;
      }
    }
  } catch {
    // ignore malformed storage entry
  }
  return null;
}

export function getProfileCacheMetadata(): ProfileCacheMetadata | null {
  try {
    const raw = safeGet(CACHE_META_KEY);
    return raw ? (JSON.parse(raw) as ProfileCacheMetadata) : null;
  } catch {
    return null;
  }
}

/**
 * Saves NutriAI profile settings, goals, mealPlan, and history to IndexedDB & persistent fallback storage.
 */
export async function saveProfileToIndexedDB(profile: UserProfile, uid?: string): Promise<void> {
  const targetUid = uid || profile.id;
  saveCachedProfileSync(profile, targetUid);

  try {
    const db = await getProfileDB();
    if (db) {
      await db.put(STORE_NAME, profile, 'current_profile');
      if (targetUid) {
        await db.put(STORE_NAME, profile, `profile_${targetUid}`);
      }
    }
  } catch (err) {
    console.warn('[ProfileStorageIDB] Failed to save profile to IndexedDB:', err);
  }
}

/**
 * Loads NutriAI profile settings, goals, and mealPlan from IndexedDB with per-user & localStorage fallback.
 */
export async function loadProfileFromIndexedDB(uid?: string): Promise<UserProfile | null> {
  try {
    const db = await getProfileDB();
    if (db) {
      if (uid) {
        const userProfile = await db.get(STORE_NAME, `profile_${uid}`);
        if (userProfile) return userProfile;
      }
      const profile = await db.get(STORE_NAME, 'current_profile');
      if (profile && (!uid || !profile.id || profile.id === uid)) {
        return profile;
      }
    }
  } catch (err) {
    console.warn('[ProfileStorageIDB] Failed to load profile from IndexedDB:', err);
  }

  return loadCachedProfileSync(uid);
}
