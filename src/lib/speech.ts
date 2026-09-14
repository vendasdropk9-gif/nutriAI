
import { textToSpeech } from './gemini';

export interface SpeechOptions {
  voice?: string;
  lang?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
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

let activeAudio: HTMLAudioElement | null = null;
let activeUtterance: SpeechSynthesisUtterance | null = null;
let speechResumeInterval: any = null;
let currentSpeechId = 0;

// Pre-unlock audio on user click for iOS/Safari/Chrome autoplay restrictions
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
    }
  } catch (e) {}
};

export const stopSpeech = () => {
  currentSpeechId++;
  if (speechResumeInterval) {
    clearInterval(speechResumeInterval);
    speechResumeInterval = null;
  }
  activeUtterance = null;
  if (activeAudio) {
    try {
      activeAudio.pause();
      activeAudio.onended = null;
      activeAudio.onerror = null;
      activeAudio = null;
    } catch (e) {}
  }
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch (e) {}
  }
};

export const speak = async (text: string, options?: SpeechOptions) => {
  if (!text || !text.trim()) {
    options?.onEnded?.();
    return { method: 'none' as const };
  }

  const trimmedText = text.trim();
  const lower = trimmedText.toLowerCase();

  // Active language resolution
  const activeLang = options?.lang || (typeof localStorage !== 'undefined' ? localStorage.getItem('nutriai_language') || localStorage.getItem('i18nextLng') : null) || 'pt-BR';
  const isPt = activeLang.toLowerCase().startsWith('pt');

  // Stop any and all previous audio/speech instantly to prevent overlapping voices
  stopSpeech();

  currentSpeechId++;
  const speechId = currentSpeechId;

  try {
    // 0. Pre-cached authentic Malu (Aoede) recordings ONLY for exact standalone brand sound ("Nutri AI" only)
    let audioUrl: string | null = null;
    const cleanLower = lower.replace(/[!.,?]/g, '').trim();

    if (isPt && (cleanLower === 'nutri ai' || cleanLower === 'nutriai')) {
      audioUrl = '/audio/nutri_ai_malu.wav';
    } else {
      // For all full sentences, thank-you notes, greetings with names, recipes, advice:
      // Synthesize through high-fidelity Gemini Aoede engine so every sentence is read in full!
      audioUrl = await textToSpeech(trimmedText, activeLang);
    }
    
    // If another speech request arrived in the meantime, abort immediately
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
        console.warn("Audio element playback error, attempting localized browser fallback:", e);
        if (activeAudio === audio) {
          activeAudio = null;
        }
        fallbackSpeak(trimmedText, { ...options, lang: activeLang });
      };
      
      try {
        await audio.play();
        return { method: 'gemini' as const, audio };
      } catch (playErr) {
        console.warn("Audio play blocked or interrupted:", playErr);
        if (activeAudio === audio) {
          activeAudio = null;
        }
        return fallbackSpeak(trimmedText, { ...options, lang: activeLang });
      }
    } else {
      // Backend returned null - try localized browser fallback in active language
      return fallbackSpeak(trimmedText, { ...options, lang: activeLang });
    }
  } catch (error) {
    if (speechId !== currentSpeechId) return { method: 'none' as const };
    console.warn("TTS playback encountered error:", error);
    return fallbackSpeak(trimmedText, { ...options, lang: activeLang });
  }
};

export const fallbackSpeak = (text: string, options?: SpeechOptions) => {
  const activeLang = options?.lang || (typeof localStorage !== 'undefined' ? localStorage.getItem('nutriai_language') || localStorage.getItem('i18nextLng') : null) || 'pt-BR';
  const normLang = activeLang.toLowerCase().replace('_', '-');
  const basePrefix = normLang.split('-')[0];

  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    const voices = window.speechSynthesis.getVoices();
    
    // 1. Exact match with preferred female/natural voice for the selected language
    let matchedVoice = voices.find(v => {
      const vLang = v.lang.toLowerCase().replace('_', '-');
      const vName = v.name.toLowerCase();
      return (vLang === normLang) && (vName.includes('natural') || vName.includes('neural') || vName.includes('online') || vName.includes('female') || vName.includes('google') || vName.includes('siri') || vName.includes('maria') || vName.includes('samantha') || vName.includes('monica') || vName.includes('victoria'));
    }) || voices.find(v => v.lang.toLowerCase().replace('_', '-').startsWith(normLang));

    // 2. Base prefix match (e.g., 'es', 'en', 'fr', 'de', 'it', 'zh', 'ja', 'ko', 'hi', 'ar', 'tr', 'pt')
    if (!matchedVoice) {
      matchedVoice = voices.find(v => {
        const vLang = v.lang.toLowerCase().replace('_', '-');
        const vName = v.name.toLowerCase();
        return (vLang.startsWith(basePrefix)) && (vName.includes('natural') || vName.includes('neural') || vName.includes('online') || vName.includes('female') || vName.includes('google'));
      }) || voices.find(v => v.lang.toLowerCase().replace('_', '-').startsWith(basePrefix));
    }

    if (matchedVoice || voices.length > 0) {
      return executeBrowserTTS(text, { ...options, lang: activeLang }, matchedVoice || voices[0]);
    }
  }

  options?.onEnded?.();
  return { method: 'none' as const };
};

const executeBrowserTTS = (text: string, options?: SpeechOptions, selectedVoice?: SpeechSynthesisVoice) => {
  if (!('speechSynthesis' in window)) {
    options?.onError?.("Not supported");
    options?.onEnded?.();
    return { method: 'none' as const };
  }

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  activeUtterance = utterance;

  utterance.lang = options?.lang || 'pt-BR';
  utterance.rate = options?.rate ?? 1.0; 
  utterance.pitch = options?.pitch ?? 1.0; 
  const browserVolume = typeof options?.volume === 'number' 
    ? Math.max(0, Math.min(1, options.volume)) 
    : getVoiceVolume();
  utterance.volume = browserVolume;

  if (selectedVoice) {
    utterance.voice = selectedVoice;
  }

  const cleanupUtterance = () => {
    if (speechResumeInterval) {
      clearInterval(speechResumeInterval);
      speechResumeInterval = null;
    }
    if (activeUtterance === utterance) {
      activeUtterance = null;
    }
  };

  utterance.onend = () => {
    cleanupUtterance();
    options?.onEnded?.();
  };
  
  utterance.onerror = (e) => {
    cleanupUtterance();
    options?.onError?.(e);
    options?.onEnded?.();
  };

  // Chromium Web Speech API Keep-Alive: Chrome pauses or stops long utterances (>15s)
  // or garbage collects them unless kept in module reference and pulsed periodically.
  if (speechResumeInterval) {
    clearInterval(speechResumeInterval);
  }
  speechResumeInterval = setInterval(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
        window.speechSynthesis.pause();
        window.speechSynthesis.resume();
      }
    }
  }, 4000);

  try {
    window.speechSynthesis.speak(utterance);
    return { method: 'browser' as const, utterance };
  } catch (e) {
    cleanupUtterance();
    console.warn("Browser TTS failed:", e);
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
