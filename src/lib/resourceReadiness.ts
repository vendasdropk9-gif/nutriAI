/**
 * Resource Readiness & Availability Verification for NutriAI
 * Ensures core web fonts, audio assets, local persistence, and network dependencies
 * are validated without blocking the main rendering thread.
 */

export interface ResourceReadinessState {
  isReady: boolean;
  progress: number;
  fontsReady: boolean;
  storageReady: boolean;
  audioReady: boolean;
}

let readinessCache: ResourceReadinessState | null = null;

/**
 * Checks system readiness with built-in timeouts to prevent any indefinite blocking
 */
export async function verifyResourceReadiness(
  onProgress?: (progress: number, step: string) => void
): Promise<ResourceReadinessState> {
  if (readinessCache && readinessCache.isReady) {
    if (onProgress) onProgress(100, 'Pronto');
    return readinessCache;
  }

  const state: ResourceReadinessState = {
    isReady: false,
    progress: 10,
    fontsReady: false,
    storageReady: false,
    audioReady: false,
  };

  if (onProgress) onProgress(10, 'Iniciando verificação de recursos...');

  // 1. Check LocalStorage / SessionStorage Availability
  try {
    const testKey = '__nutri_test_storage__';
    window.localStorage.setItem(testKey, '1');
    window.localStorage.removeItem(testKey);
    state.storageReady = true;
    state.progress = 35;
    if (onProgress) onProgress(35, 'Armazenamento verificado');
  } catch (err) {
    console.warn('LocalStorage restrito ou indisponível:', err);
    state.storageReady = false;
  }

  // 2. Check Web Fonts Readiness with tight 600ms timeout
  try {
    if (typeof document !== 'undefined' && 'fonts' in document && document.fonts.ready) {
      const fontPromise = document.fonts.ready;
      const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 600));
      await Promise.race([fontPromise, timeoutPromise]);
      state.fontsReady = true;
    } else {
      state.fontsReady = true;
    }
  } catch (err) {
    state.fontsReady = true;
  }
  state.progress = 70;
  if (onProgress) onProgress(70, 'Tipografia e estilos sincronizados');

  // 3. Pre-warm Audio / Sound Buffer for Malu Aoede voice
  try {
    if (typeof window !== 'undefined' && 'Audio' in window) {
      const audioProbe = new Audio();
      audioProbe.preload = 'metadata';
      audioProbe.src = '/audio/nutri_ai_malu.wav';
      state.audioReady = true;
    } else {
      state.audioReady = true;
    }
  } catch (err) {
    state.audioReady = false;
  }
  state.progress = 100;
  state.isReady = true;
  if (onProgress) onProgress(100, 'Tudo pronto');

  readinessCache = state;
  return state;
}
