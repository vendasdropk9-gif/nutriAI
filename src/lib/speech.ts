import { textToSpeech } from './gemini';
import { translateSpeechText } from './speechTranslator';

export interface SpeechOptions {
  voice?: string;
  lang?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
  model?: string;
  emotion?: string;
  style?: string;
  onEnded?: () => void;
  onError?: (error: any) => void;
}

const VOLUME_STORAGE_KEY = 'nutri_ai_voice_volume';

export const getVoiceVolume = (): number => {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return 1.0;
  try {
    const saved = localStorage.getItem(VOLUME_STORAGE_KEY);
    if (saved !== null) {
      const parsed = parseFloat(saved);
      if (!isNaN(parsed) && parsed >= 0 && parsed <= 1) {
        return parsed;
      }
    }
  } catch (e) {}
  return 1.0;
};

export const setVoiceVolume = (volume: number): void => {
  const clamped = Math.max(0, Math.min(1, volume));
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(VOLUME_STORAGE_KEY, clamped.toString());
    } catch (e) {}
  }
  if (activeAudio) {
    try {
      activeAudio.volume = clamped;
    } catch (e) {}
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('app:voice-volume-changed', { detail: clamped }));
  }
};

/**
 * Automatically detects and resolves the active locale based on:
 * 1. Explicitly requested lang parameter
 * 2. Stored user language preference (localStorage / i18n)
 * 3. Browser locale (navigator.language / navigator.languages)
 * 4. Fallback default ('pt-BR')
 */
export const resolveAutoLocale = (requestedLang?: string): string => {
  let raw = 'pt-BR';
  if (requestedLang && requestedLang.trim()) {
    raw = requestedLang.trim();
  } else if (typeof localStorage !== 'undefined') {
    try {
      const saved = localStorage.getItem('nutriai_language') || localStorage.getItem('i18nextLng');
      if (saved && saved.trim()) {
        raw = saved.trim();
      }
    } catch (e) {}
  } else if (typeof window !== 'undefined' && typeof navigator !== 'undefined') {
    if (navigator.language && navigator.language.trim()) {
      raw = navigator.language.trim();
    } else if (navigator.languages && navigator.languages.length > 0 && navigator.languages[0]) {
      raw = navigator.languages[0].trim();
    }
  }

  const clean = raw.toLowerCase();
  if (clean.startsWith('pt')) return 'pt-BR';
  if (clean.includes('gb') || clean.includes('uk')) return 'en-GB';
  if (clean.includes('au') || clean.includes('australia')) return 'en-AU';
  if (clean.startsWith('en')) return 'en-US';
  return 'pt-BR';
};

let activeAudio: HTMLAudioElement | null = null;
let currentSpeechId = 0;

// Pre-unlock HTML5 Audio on user click for iOS/Safari/Chrome autoplay restrictions
export const unlockAudio = () => {
  try {
    if (typeof window !== 'undefined') {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        const ctx = new AudioContextClass();
        if (ctx.state === 'suspended') {
          ctx.resume();
        }
      }
      const dummyAudio = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA');
      dummyAudio.volume = 0.01;
      dummyAudio.play().then(() => {
        dummyAudio.pause();
      }).catch(() => {});
    }
  } catch (e) {}
};

/**
 * Instantly interrupts and stops any active speech or audio playback.
 */
export const stopSpeech = () => {
  currentSpeechId++;
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch (e) {}
  }
  if (activeAudio) {
    try {
      activeAudio.pause();
      activeAudio.currentTime = 0;
      activeAudio.onended = null;
      activeAudio.onerror = null;
      activeAudio = null;
    } catch (e) {}
  }
};

/**
 * Web Speech API browser-native speech synthesis engine.
 * Reads recipe instructions and steps aloud in real-time, respecting the user's selected language.
 */
export const speakWithWebSpeech = (text: string, options?: SpeechOptions): boolean => {
  if (typeof window === 'undefined' || !('speechSynthesis' in window) || !text || !text.trim()) {
    options?.onEnded?.();
    return false;
  }

  try {
    stopSpeech();
    currentSpeechId++;
    const speechId = currentSpeechId;

    const trimmedText = text.trim();
    const activeLang = resolveAutoLocale(options?.lang);
    const isPt = activeLang.toLowerCase().startsWith('pt');
    const textToSpeak = isPt ? trimmedText : (translateSpeechText(trimmedText, activeLang) || trimmedText);

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = activeLang;

    // Pick a voice that matches target language (e.g. en-US, en-GB, en-AU, pt-BR)
    const voices = window.speechSynthesis.getVoices();
    if (voices && voices.length > 0) {
      if (isPt) {
        const femalePt = voices.find(v => (v.lang.toLowerCase().includes('pt') || v.lang.toLowerCase().includes('br')) && /luciana|maria|leticia|fernanda|helena|francisca|female|mulher|google português/i.test(v.name));
        const ptBr = voices.find(v => v.lang.replace('_', '-').toLowerCase() === 'pt-br');
        const anyPt = voices.find(v => v.lang.toLowerCase().startsWith('pt'));
        utterance.voice = femalePt || ptBr || anyPt || null;
      } else {
        const exactMatch = voices.find(v => v.lang.replace('_', '-').toLowerCase() === activeLang.toLowerCase());
        const prefixMatch = voices.find(v => v.lang.toLowerCase().startsWith(activeLang.slice(0, 2).toLowerCase()));
        if (exactMatch) {
          utterance.voice = exactMatch;
        } else if (prefixMatch) {
          utterance.voice = prefixMatch;
        }
      }
    }

    const targetVolume = typeof options?.volume === 'number'
      ? Math.max(0, Math.min(1, options.volume))
      : getVoiceVolume();
    utterance.volume = targetVolume;
    utterance.rate = options?.rate || 1.0;
    utterance.pitch = options?.pitch || 1.0;

    utterance.onend = () => {
      if (speechId === currentSpeechId) {
        options?.onEnded?.();
      }
    };

    utterance.onerror = (e) => {
      console.warn("Web Speech API synthesis error:", e);
      if (speechId === currentSpeechId) {
        options?.onError?.(e);
        options?.onEnded?.();
      }
    };

    window.speechSynthesis.speak(utterance);
    return true;
  } catch (err) {
    console.warn("Web Speech API speak exception:", err);
    options?.onError?.(err);
    options?.onEnded?.();
    return false;
  }
};

/**
 * Centralized Voice Synthesis engine powered exclusively by gemini-3.8-flash-tts.
 * Automatically resolves browser locale and synthesizes high-fidelity 24kHz audio.
 */
export const speak = async (text: string, options?: SpeechOptions) => {
  if (!text || !text.trim()) {
    options?.onEnded?.();
    return { method: 'none' as const };
  }

  const trimmedText = text.trim();
  const lower = trimmedText.toLowerCase();

  // Automatic Browser Locale Resolution
  const activeLang = resolveAutoLocale(options?.lang);
  const isPt = activeLang.toLowerCase().startsWith('pt');

  // Translate text to target language if not Portuguese
  const textToSpeak = isPt ? trimmedText : (translateSpeechText(trimmedText, activeLang) || trimmedText);

  // Stop any previous speech immediately for instant interruption
  stopSpeech();

  currentSpeechId++;
  const speechId = currentSpeechId;

  try {
    let audioUrl: string | null = null;
    const cleanLower = lower.replace(/[!.,?]/g, '').trim();

    // Standalone brand sound audio
    if (isPt && (cleanLower === 'nutri ai' || cleanLower === 'nutriai')) {
      audioUrl = '/audio/nutri_ai_malu.wav';
    } else {
      // Synthesize through centralized Gemini 3.8 TTS engine
      audioUrl = await textToSpeech(textToSpeak, activeLang, {
        model: options?.model || 'gemini-3.8-flash-tts',
        voiceName: options?.voice || 'Aoede',
        emotion: options?.emotion,
        style: options?.style
      });
    }
    
    // Abort if another speech request arrived in the meantime
    if (speechId !== currentSpeechId) return { method: 'none' as const };

    if (audioUrl) {
      let url = audioUrl;
      const isBase64 = !url.startsWith('data:') && !url.startsWith('blob:') && !url.startsWith('http') && !(url.startsWith('/') && url.length < 200);
      
      if (isBase64) {
        if (url.startsWith('SUQz') || url.startsWith('//') || url.startsWith('/+')) {
          url = `data:audio/mp3;base64,${url}`;
        } else {
          url = `data:audio/wav;base64,${url}`;
        }
      }

      const audio = new Audio(url);
      activeAudio = audio;

      const targetVolume = typeof options?.volume === 'number' 
        ? Math.max(0, Math.min(1, options.volume)) 
        : getVoiceVolume();
      audio.volume = targetVolume;
      
      if (options?.rate) {
        audio.playbackRate = options.rate;
      }

      audio.onended = () => {
        if (activeAudio === audio) {
          activeAudio = null;
        }
        options?.onEnded?.();
      };

      audio.onerror = (e) => {
        console.warn("Gemini TTS audio playback error:", e);
        if (activeAudio === audio) {
          activeAudio = null;
        }
        options?.onError?.(e);
        options?.onEnded?.();
      };
      
      try {
        await audio.play();
        return { method: 'gemini' as const, audio };
      } catch (playErr) {
        console.warn("Audio play blocked or interrupted, attempting WebSpeech fallback:", playErr);
        if (activeAudio === audio) {
          activeAudio = null;
        }
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
          const success = speakWithWebSpeech(textToSpeak, options);
          if (success) return { method: 'webspeech' as const };
        }
        options?.onError?.(playErr);
        options?.onEnded?.();
        return { method: 'none' as const };
      }
    } else {
      console.warn("Centralized TTS returned no audio, attempting WebSpeech fallback");
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        const success = speakWithWebSpeech(textToSpeak, options);
        if (success) return { method: 'webspeech' as const };
      }
      options?.onError?.("TTS generation failed");
      options?.onEnded?.();
      return { method: 'none' as const };
    }
  } catch (error) {
    if (speechId !== currentSpeechId) return { method: 'none' as const };
    console.warn("TTS playback encountered error:", error);
    options?.onError?.(error);
    options?.onEnded?.();
    return { method: 'none' as const };
  }
};

export const playAudioUrl = async (urlOrBase64: string, options?: SpeechOptions) => {
  if (!urlOrBase64) return null;
  stopSpeech();
  
  try {
    let validUrl = urlOrBase64;
    const isBase64 = !validUrl.startsWith('data:') && !validUrl.startsWith('blob:') && !validUrl.startsWith('http') && !(validUrl.startsWith('/') && validUrl.length < 200);
    
    if (isBase64) {
      if (validUrl.startsWith('SUQz') || validUrl.startsWith('//') || validUrl.startsWith('/+')) {
        validUrl = `data:audio/mp3;base64,${validUrl}`;
      } else {
        validUrl = `data:audio/wav;base64,${validUrl}`;
      }
    }

    const audio = new Audio(validUrl);
    activeAudio = audio;

    const targetVolume = typeof options?.volume === 'number' 
      ? Math.max(0, Math.min(1, options.volume)) 
      : getVoiceVolume();
    audio.volume = targetVolume;
    
    if (options?.rate) {
      audio.playbackRate = options.rate;
    }

    audio.onended = () => {
      if (activeAudio === audio) {
        activeAudio = null;
      }
      options?.onEnded?.();
    };

    audio.onerror = (err) => {
      console.warn("playAudioUrl error:", err);
      if (activeAudio === audio) {
        activeAudio = null;
      }
      options?.onEnded?.();
    };
    
    await audio.play();
    return audio;
  } catch(e) {
    console.error("Failed to play audio url:", e);
    options?.onEnded?.();
    return null;
  }
};
