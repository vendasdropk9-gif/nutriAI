
import { textToSpeech } from './gemini';

interface SpeechOptions {
  voice?: string;
  rate?: number;
  pitch?: number;
  onEnded?: () => void;
  onError?: (error: any) => void;
}

let currentAudio: HTMLAudioElement | null = null;
let currentSpeechId = 0;

export const speak = async (text: string, options?: SpeechOptions) => {
  currentSpeechId++;
  const speechId = currentSpeechId;

  // Stop any currently playing speech globally
  stopSpeech();

  // Set default rate to 1.0 for natural Gemini voice tone
  const speechOptions = {
    rate: 1.0,
    pitch: 1.0,
    ...options
  };

  try {
    // 1. Try Gemini TTS API
    const audioUrl = await textToSpeech(text);
    
    if (speechId !== currentSpeechId) return { method: 'none' as const };

    if (audioUrl) {
      // audioUrl is now expected to be a blob: or data: URL
      const url = audioUrl.startsWith('data:') || audioUrl.startsWith('blob:') 
        ? audioUrl 
        : `data:audio/wav;base64,${audioUrl}`;
      const audio = new Audio(url);
      currentAudio = audio;
      
      // We don't adjust the playback rate for Gemini TTS by default so it stays natural
      if (options?.rate) {
         audio.playbackRate = options.rate;
      }

      if (options?.onEnded) {
        audio.onended = () => {
          if (currentAudio === audio) {
            currentAudio = null;
          }
          options.onEnded?.();
        };
      } else {
        audio.onended = () => {
          if (currentAudio === audio) {
            currentAudio = null;
          }
        };
      }
      
      await audio.play();
      return { method: 'gemini' as const, audio };
    }
  } catch (error) {
    if (speechId !== currentSpeechId) return { method: 'none' as const };
    console.warn("Gemini TTS failed, falling back to Browser TTS:", error);
  }

  // 2. Fallback to Browser Speech Synthesis
  if (speechId !== currentSpeechId) return { method: 'none' as const };
  return fallbackSpeak(text, speechOptions);
};

export const fallbackSpeak = (text: string, options?: SpeechOptions) => {
  // First try Google Translate TTS for a much more natural fallback
  try {
    const url = `https://translate.googleapis.com/translate_tts?ie=UTF-8&client=tw-ob&tl=pt-BR&q=${encodeURIComponent(text)}`;
    const audio = new Audio(url);
    
    if (options?.rate) audio.playbackRate = options.rate;
    if (options?.pitch) {
      // Audio pitch shifting isn't natively supported easily via Audio object without 
      // AudioContext, but it's okay, the Google Translate voice is already female/natural.
    }
    
    currentAudio = audio;
    
    audio.onended = () => {
      if (currentAudio === audio) currentAudio = null;
      options?.onEnded?.();
    };
    
    audio.onerror = () => {
      // Fallback to speechSynthesis if Translate TTS fails (e.g. adblocker, network)
      executeBrowserTTS(text, options);
    };

    audio.play().catch(e => {
        console.warn("Could not play translate tts:", e);
        executeBrowserTTS(text, options);
    });

    return { method: 'fallback_url' as const, audio };
  } catch (err) {
    executeBrowserTTS(text, options);
    return { method: 'browser' as const };
  }
};

const executeBrowserTTS = (text: string, options?: SpeechOptions) => {
  if (!('speechSynthesis' in window)) {
    console.error("Browser does not support SpeechSynthesis");
    options?.onError?.("Not supported");
    return;
  }

  // Cancel any ongoing speech
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'pt-BR';
  utterance.rate = options?.rate ?? 0.85; // Slower for smoother, softer speech
  utterance.pitch = options?.pitch ?? 1.15; // Slightly higher for a "friendlier/female" tone
  utterance.volume = 0.5; // Softer volume

  // Try to find a female voice
  const voices = window.speechSynthesis.getVoices();
  const femaleVoice = voices.find(v => 
    (v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('luciana') || v.name.toLowerCase().includes('valeria') || v.name.toLowerCase().includes('google')) && 
    v.lang.includes('pt-BR')
  ) || voices.find(v => v.lang.includes('pt-BR'));

  if (femaleVoice) {
    utterance.voice = femaleVoice;
  }

  if (options?.onEnded) {
    utterance.onend = options.onEnded;
  }
  
  if (options?.onError) {
    utterance.onerror = (e) => options.onError?.(e);
  }

  window.speechSynthesis.speak(utterance);
  return { method: 'browser' as const, utterance };
};

export const playAudioUrl = async (url: string, options?: SpeechOptions) => {
  stopSpeech();
  
  try {
    const audio = new Audio(url);
    currentAudio = audio;
    
    if (options?.rate) {
        audio.playbackRate = options.rate;
    }

    if (options?.onEnded) {
      audio.onended = () => {
        if (currentAudio === audio) {
          currentAudio = null;
        }
        options.onEnded?.();
      };
    } else {
      audio.onended = () => {
        if (currentAudio === audio) {
          currentAudio = null;
        }
      };
    }
    
    await audio.play();
    return audio;
  } catch(e) {
    console.error("Failed to play audio url", e);
    return null;
  }
};

export const stopSpeech = () => {
  window.speechSynthesis.cancel();
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }
};
