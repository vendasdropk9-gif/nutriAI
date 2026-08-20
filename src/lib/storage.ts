export const clearNonEssentialCaches = (): void => {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key && (
        key.startsWith('tts_') || 
        key.startsWith('audio_') || 
        key.startsWith('cache_') || 
        key.includes('audio') ||
        key.includes('cache')
      )) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(k => window.localStorage.removeItem(k));
  } catch (e) {
    // Ignore storage errors
  }
};

export const safeGet = (key: string): string | null => {
  try {
    return window.localStorage.getItem(key);
  } catch (e) {
    return null;
  }
};

export const safeSet = (key: string, value: string): void => {
  try {
    window.localStorage.setItem(key, value);
  } catch (e) {
    // On quota error, clear non-essential cached media and retry
    clearNonEssentialCaches();
    try {
      window.localStorage.setItem(key, value);
    } catch (retryErr) {
      // If still full, silently absorb quota error to prevent crashing UI
    }
  }
};

export const safeRemove = (key: string): void => {
  try {
    window.localStorage.removeItem(key);
  } catch (e) {}
};

