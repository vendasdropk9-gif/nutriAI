
import { textToSpeech } from './gemini';

interface SpeechOptions {
  voice?: string;
  rate?: number;
  pitch?: number;
  onEnded?: () => void;
  onError?: (error: any) => void;
}

export const speak = async (text: string, options?: SpeechOptions) => {
  // Set default rate to 1.3 as requested by user
  const speechOptions = {
    rate: 1.3,
    pitch: 1.1,
    ...options
  };

  try {
    // 1. Try Gemini TTS API
    const base64Audio = await textToSpeech(text);
    
    if (base64Audio) {
      const url = `data:audio/wav;base64,${base64Audio}`;
      const audio = new Audio(url);
      
      // Note: Speed/Rate adjustment for HTML5 Audio is possible via playbackRate
      audio.playbackRate = speechOptions.rate;

      if (options?.onEnded) {
        audio.onended = options.onEnded;
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

export const stopSpeech = () => {
  window.speechSynthesis.cancel();
  // We can't easily stop the Audio object from here without a reference, 
  // so developers should handle that with the returned object from speak()
};
