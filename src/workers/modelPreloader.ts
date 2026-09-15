const DB_NAME = 'NutriAIGLTFCache';
const STORE_NAME = 'models';
const DB_VERSION = 1;

function getDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      return reject(new Error('IndexedDB not supported'));
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
}

async function saveToIDB(url: string, arrayBuffer: ArrayBuffer): Promise<void> {
  try {
    const db = await getDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(arrayBuffer, url);
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('Worker IDB Save Error:', err);
  }
}

async function loadFromIDB(url: string): Promise<ArrayBuffer | null> {
  try {
    const db = await getDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(url);
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('Worker IDB Load Error:', err);
    return null;
  }
}

self.onmessage = async (e: MessageEvent) => {
  const { urls } = e.data;
  
  if (!urls || !Array.isArray(urls)) {
    self.postMessage({ status: 'error', error: 'Invalid URLs array' });
    return;
  }

  let loadedCount = 0;

  for (const url of urls) {
    if (!url) continue;
    try {
      // Check if already in cache
      const exists = await loadFromIDB(url);
      if (!exists) {
        const response = await fetch(url);
        if (response.ok) {
          const buffer = await response.arrayBuffer();
          await saveToIDB(url, buffer);
          loadedCount++;
        }
      }
    } catch (err) {
      console.warn(`[PreloadWorker] Failed to preload ${url}`, err);
    }
  }
  
  self.postMessage({ status: 'done', preloaded: loadedCount, total: urls.length });
};
