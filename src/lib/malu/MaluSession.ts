import { MaluFeature } from './MaluCatalog';

export interface MaluSessionState {
  lastFeatureId?: string;
  lastIntent?: string;
  pendingFeature?: MaluFeature;
  missingDataQueue?: string[];
  collectedData: Record<string, any>;
  lastInteractionTime: number;
}

const SESSION_KEY = 'nutri_ai_malu_session_state';

export const getMaluSessionState = (): MaluSessionState => {
  if (typeof window === 'undefined') return { collectedData: {}, lastInteractionTime: Date.now() };
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {}
  return { collectedData: {}, lastInteractionTime: Date.now() };
};

export const saveMaluSessionState = (state: Partial<MaluSessionState>) => {
  if (typeof window === 'undefined') return;
  try {
    const current = getMaluSessionState();
    const updated = { ...current, ...state, lastInteractionTime: Date.now() };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(updated));
  } catch (e) {}
};

export const clearMaluSessionState = () => {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch (e) {}
};
