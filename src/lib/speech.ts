
import { textToSpeech } from './gemini';

export interface SpeechOptions {
  voice?: string;
  rate?: number;
  pitch?: number;
  onEnded?: () => void;
  onError?: (error: any) => void;
}

let currentAudio: HTMLAudioElement | null = null;
let currentSpeechId = 0;

export const speak = async (text: string, options?: SpeechOptions) => {
  if (!text || !text.trim()) return { method: 'none' as const };

  currentSpeechId++;
  const speechId = currentSpeechId;

  // Stop any currently playing speech globally
  stopSpeech();

  try {
    // 1. Fetch high-fidelity Malu (Aoede / Brazilian Portuguese natural voice) from backend
    const audioUrl = await textToSpeech(text);
    
    if (speechId !== currentSpeechId) return { method: 'none' as const };

    if (audioUrl) {
      const url = audioUrl.startsWith('data:') || audioUrl.startsWith('blob:') || audioUrl.startsWith('http')
        ? audioUrl 
        : `data:audio/wav;base64,${audioUrl}`;

      const audio = new Audio(url);
      currentAudio = audio;
      
      if (options?.rate) {
        audio.playbackRate = options.rate;
      }

      audio.onended = () => {
        if (currentAudio === audio) {
          currentAudio = null;
        }
        options?.onEnded?.();
      };

      audio.onerror = (e) => {
        console.warn("Audio element playback error:", e);
        if (currentAudio === audio) currentAudio = null;
        options?.onEnded?.();
      };
      
      await audio.play();
      return { method: 'gemini' as const, audio };
    }
  } catch (error) {
    if (speechId !== currentSpeechId) return { method: 'none' as const };
    console.warn("TTS playback encountered error:", error);
  }

  // If audio generation was cancelled or unavailable, gracefully complete callback
  if (speechId !== currentSpeechId) return { method: 'none' as const };
  return fallbackSpeak(text, options);
};

export const fallbackSpeak = (text: string, options?: SpeechOptions) => {
  // Only attempt native speech synthesis if a high-quality natural voice is available
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    const voices = window.speechSynthesis.getVoices();
    const naturalVoice = voices.find(v => {
      const nameLower = v.name.toLowerCase();
      const isPtBr = v.lang.replace('_', '-').startsWith('pt-BR') || v.lang.startsWith('pt');
      if (!isPtBr) return false;
      return (nameLower.includes('natural') || nameLower.includes('neural') || nameLower.includes('online')) &&
             (nameLower.includes('maria') || nameLower.includes('francisca') || nameLower.includes('female') || nameLower.includes('mulher'));
    });

    if (naturalVoice) {
      return executeBrowserTTS(text, options, naturalVoice);
    }
  }

  options?.onEnded?.();
  return { method: 'none' as const };
};

const executeBrowserTTS = (text: string, options?: SpeechOptions, selectedVoice?: SpeechSynthesisVoice) => {
  if (!('speechSynthesis' in window)) {
    options?.onError?.("Not supported");
    return;
  }

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'pt-BR';
  utterance.rate = options?.rate ?? 1.0; 
  utterance.pitch = options?.pitch ?? 1.0; 
  utterance.volume = 1.0;

  if (selectedVoice) {
    utterance.voice = selectedVoice;
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

export const playAudioUrl = async (urlOrBase64: string, options?: SpeechOptions) => {
  if (!urlOrBase64) return null;
  stopSpeech();
  
  try {
    const validUrl = urlOrBase64.startsWith('data:') || urlOrBase64.startsWith('blob:') || urlOrBase64.startsWith('http')
      ? urlOrBase64
      : `data:audio/wav;base64,${urlOrBase64}`;

    const audio = new Audio(validUrl);
    currentAudio = audio;
    
    if (options?.rate) {
      audio.playbackRate = options.rate;
    }

    audio.onended = () => {
      if (currentAudio === audio) {
        currentAudio = null;
      }
      options?.onEnded?.();
    };

    audio.onerror = (err) => {
      console.warn("playAudioUrl error:", err);
      if (currentAudio === audio) {
        currentAudio = null;
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

export const stopSpeech = () => {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
  if (currentAudio) {
    try {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    } catch(e) {}
    currentAudio = null;
  }
};
