import { openDB, IDBPDatabase } from 'idb';

const DB_NAME = 'NutriAIGLTFCache';
const STORE_NAME = 'models';
const DB_VERSION = 2;
const CACHE_VERSION = 'v1.1.0'; // Application-level cache version. Update to invalidate.

let dbPromise: Promise<IDBPDatabase> | null = null;

/**
 * Initializes and returns the IndexedDB database instance.
 */
export function getCacheDB() {
  if (typeof window === 'undefined') return null; // SSR safety
  
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, newVersion, transaction) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        } else if (oldVersion < 2) {
          // Clear old cache structure during upgrade
          transaction.objectStore(STORE_NAME).clear();
        }
      },
    });
  }
  return dbPromise;
}

/**
 * Saves a 3D model (ArrayBuffer) or texture to the local IndexedDB cache with versioning.
 */
export async function saveToCache(url: string, data: ArrayBuffer, etag?: string): Promise<void> {
  try {
    const db = await getCacheDB();
    if (db) {
      const record = {
        data,
        version: CACHE_VERSION,
        etag: etag || null,
        timestamp: Date.now()
      };
      await db.put(STORE_NAME, record, url);
    }
  } catch (err) {
    console.warn(`[IDBCache] Failed to save ${url} to cache:`, err);
  }
}

/**
 * Retrieves a 3D model or texture from the local IndexedDB cache if the version matches.
 */
export async function loadFromCache(url: string, expectedEtag?: string): Promise<ArrayBuffer | null> {
  try {
    const db = await getCacheDB();
    if (db) {
      const record = await db.get(STORE_NAME, url);
      
      // Handle legacy cache format (raw ArrayBuffer)
      if (record instanceof ArrayBuffer) {
        await db.delete(STORE_NAME, url);
        return null;
      }
      
      if (record && record.data) {
        // Version invalidation
        if (record.version !== CACHE_VERSION) {
          await db.delete(STORE_NAME, url);
          return null;
        }
        
        // ETag invalidation
        if (expectedEtag && record.etag && record.etag !== expectedEtag) {
          await db.delete(STORE_NAME, url);
          return null;
        }
        
        return record.data;
      }
    }
    return null;
  } catch (err) {
    console.warn(`[IDBCache] Failed to load ${url} from cache:`, err);
    return null;
  }
}
