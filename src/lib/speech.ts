
import { textToSpeech } from './gemini';

export interface SpeechOptions {
  voice?: string;
  lang?: string;
  rate?: number;
  pitch?: number;
  onEnded?: () => void;
  onError?: (error: any) => void;
}

let activeAudio: HTMLAudioElement | null = null;
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
    // 0. Pre-cached authentic Malu (Aoede) recordings for instant 0ms playback (PT-BR only)
    let audioUrl: string | null = null;

    if (isPt && (lower === 'nutri ai' || lower === 'nutriai')) {
      audioUrl = '/audio/nutri_ai_malu.wav';
    } else if (isPt && lower.includes('bom dia')) {
      audioUrl = '/audio/greeting_morning_malu.wav';
    } else if (isPt && lower.includes('boa tarde')) {
      audioUrl = '/audio/greeting_afternoon_malu.wav';
    } else if (isPt && lower.includes('boa noite')) {
      audioUrl = '/audio/greeting_evening_malu.wav';
    } else if (isPt && (lower.includes('vou ficar por aqui') || lower.includes('quando precisar') || lower.includes('é só chamar'))) {
      audioUrl = '/audio/goodbye_malu.wav';
    } else if (isPt && (lower.includes('feedback') || lower.includes('agradecer') || lower.includes('muito obrigada'))) {
      audioUrl = '/audio/feedback_thankyou_malu.wav';
    } else {
      // 1. Fetch high-fidelity Malu (Aoede voice in active language) from backend
      audioUrl = await textToSpeech(trimmedText, activeLang);
    }
    
    // If another speech request arrived in the meantime, abort immediately
    if (speechId !== currentSpeechId) return { method: 'none' as const };

    if (audioUrl) {
      let url = audioUrl;
      if (!url.startsWith('data:') && !url.startsWith('blob:') && !url.startsWith('http') && !url.startsWith('/')) {
        if (url.startsWith('SUQz') || url.startsWith('//') || url.startsWith('/+')) {
          url = `data:audio/mp3;base64,${url}`;
        } else {
          url = `data:audio/wav;base64,${url}`;
        }
      }

      const audio = new Audio(url);
      activeAudio = audio;
      
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
  utterance.lang = options?.lang || 'pt-BR';
  utterance.rate = options?.rate ?? 1.0; 
  utterance.pitch = options?.pitch ?? 1.0; 
  utterance.volume = 1.0;

  if (selectedVoice) {
    utterance.voice = selectedVoice;
  }

  if (options?.onEnded) {
    utterance.onend = () => options.onEnded?.();
  }
  
  if (options?.onError) {
    utterance.onerror = (e) => {
      options.onError?.(e);
      options.onEnded?.();
    };
  }

  try {
    window.speechSynthesis.speak(utterance);
    return { method: 'browser' as const, utterance };
  } catch (e) {
    console.warn("Browser TTS failed:", e);
    options?.onEnded?.();
    return { method: 'none' as const };
  }
};

export const playAudioUrl = async (urlOrBase64: string, options?: SpeechOptions) => {
  if (!urlOrBase64) return null;
  stopSpeech();
  
  try {
    const validUrl = urlOrBase64.startsWith('data:') || urlOrBase64.startsWith('blob:') || urlOrBase64.startsWith('http') || urlOrBase64.startsWith('/')
      ? urlOrBase64
      : `data:audio/wav;base64,${urlOrBase64}`;

    const audio = new Audio(validUrl);
    activeAudio = audio;
    
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
