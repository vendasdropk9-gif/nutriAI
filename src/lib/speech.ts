
import { textToSpeech } from './gemini';

interface SpeechOptions {
  voice?: string;
  rate?: number;
  pitch?: number;
  onEnded?: () => void;
  onError?: (error: any) => void;
}

let currentAudio: HTMLAudioElement | null = null;

export const speak = async (text: string, options?: SpeechOptions) => {
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
    console.warn("Gemini TTS failed, falling back to Browser TTS:", error);
  }

  // 2. Fallback to Browser Speech Synthesis
  return fallbackSpeak(text, speechOptions);
};

export const fallbackSpeak = (text: string, options?: SpeechOptions) => {
  if (!('speechSynthesis' in window)) {
    console.error("Browser does not support SpeechSynthesis");
    options?.onError?.("Not supported");
    return { method: 'none' as const };
  }

  // Cancel any ongoing speech
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'pt-BR';
  utterance.rate = options?.rate ?? 1.3;
  utterance.pitch = options?.pitch ?? 1.1; // Slightly higher for a "friendlier/female" tone

  // Try to find a female voice
  const voices = window.speechSynthesis.getVoices();
  const femaleVoice = voices.find(v => 
    (v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('google')) && 
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
