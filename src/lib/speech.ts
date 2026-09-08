
import { textToSpeech } from './gemini';

export interface SpeechOptions {
  voice?: string;
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
};

export const speak = async (text: string, options?: SpeechOptions) => {
  if (!text || !text.trim()) {
    options?.onEnded?.();
    return { method: 'none' as const };
  }

  const trimmedText = text.trim();
  const lower = trimmedText.toLowerCase();

  // Stop any and all previous audio/speech instantly to prevent overlapping voices
  stopSpeech();

  currentSpeechId++;
  const speechId = currentSpeechId;

  try {
    // 0. Pre-cached authentic Malu (Aoede) recordings for instant 0ms single-voice playback
    let audioUrl: string | null = null;

    if (lower === 'nutri ai' || lower === 'nutriai') {
      audioUrl = '/audio/nutri_ai_malu.wav';
    } else if (lower.includes('bom dia')) {
      audioUrl = '/audio/greeting_morning_malu.wav';
    } else if (lower.includes('boa tarde')) {
      audioUrl = '/audio/greeting_afternoon_malu.wav';
    } else if (lower.includes('boa noite')) {
      audioUrl = '/audio/greeting_evening_malu.wav';
    } else if (lower.includes('vou ficar por aqui') || lower.includes('quando precisar') || lower.includes('é só chamar')) {
      audioUrl = '/audio/goodbye_malu.wav';
    } else if (lower.includes('feedback') || lower.includes('agradecer') || lower.includes('muito obrigada')) {
      audioUrl = '/audio/feedback_thankyou_malu.wav';
    } else {
      // 1. Fetch high-fidelity Malu (Aoede / Brazilian Portuguese natural voice) from backend
      audioUrl = await textToSpeech(trimmedText);
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
        console.warn("Audio element playback error:", e);
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
        console.warn("Audio play blocked or interrupted:", playErr);
        if (activeAudio === audio) {
          activeAudio = null;
        }
        options?.onError?.(playErr);
        options?.onEnded?.();
        return { method: 'none' as const };
      }
    } else {
      // Backend returned null - silence (per user rules to avoid mismatched robotic fallback)
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

export const fallbackSpeak = (text: string, options?: SpeechOptions) => {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    const voices = window.speechSynthesis.getVoices();
    const ptVoice =
      voices.find(v => {
        const nameLower = v.name.toLowerCase();
        const isPtBr = v.lang.replace('_', '-').startsWith('pt-BR') || v.lang.startsWith('pt');
        return isPtBr && (nameLower.includes('natural') || nameLower.includes('neural') || nameLower.includes('online') || nameLower.includes('maria') || nameLower.includes('francisca') || nameLower.includes('female') || nameLower.includes('mulher') || nameLower.includes('luciana'));
      }) ||
      voices.find(v => v.lang.replace('_', '-').startsWith('pt-BR') || v.lang.startsWith('pt')) ||
      voices[0];

    if (ptVoice || voices.length > 0) {
      return executeBrowserTTS(text, options, ptVoice);
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
