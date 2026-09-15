import { saveToCache, loadFromCache } from '../lib/idbCache';

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
      // Check if already in cache using idb
      // We pass undefined for expectedEtag here because we just want to know if *any* valid version exists
      const exists = await loadFromCache(url);
      if (!exists) {
        const response = await fetch(url);
        if (response.ok) {
          const etag = response.headers.get('ETag') || undefined;
          const buffer = await response.arrayBuffer();
          await saveToCache(url, buffer, etag);
          loadedCount++;
        }
      }
    } catch (err) {
      console.warn(`[PreloadWorker] Failed to preload ${url}`, err);
    }
  }
  
  self.postMessage({ status: 'done', preloaded: loadedCount, total: urls.length });
};
