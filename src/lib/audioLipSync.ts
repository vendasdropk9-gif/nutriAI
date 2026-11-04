import avatarGlobalStore, { MaluEmotionType } from './avatarGlobalState';

export interface LipSyncData {
  audioVolume: number;
  mouthOpen: number;
  mouthSpread: number;
  isSpeaking: boolean;
}

let audioContext: AudioContext | null = null;
let analyser: AnalyserNode | null = null;
let currentSourceNode: MediaElementAudioSourceNode | null = null;
let activeAudioElement: HTMLAudioElement | null = null;
let animFrameId: number | null = null;
let proceduralIntervalId: any = null;

// WeakMap to prevent recreating MediaElementAudioSourceNode on the same Audio element (which throws DOMException)
const sourceNodeCache = new WeakMap<HTMLAudioElement, MediaElementAudioSourceNode>();

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioCtxClass) return null;

  if (!audioContext || audioContext.state === 'closed') {
    try {
      audioContext = new AudioCtxClass();
    } catch (e) {
      console.warn('[AudioLipSync] AudioContext initialization failed:', e);
      return null;
    }
  }

  if (audioContext.state === 'suspended') {
    audioContext.resume().catch(() => {});
  }

  return audioContext;
}

/**
 * Heuristically and semantically detects Malu's emotional state from Gemini response text
 */
export function detectMaluEmotionFromText(text: string): MaluEmotionType {
  if (!text || typeof text !== 'string') return 'neutral';
  const lower = text.toLowerCase();

  // Motivating keywords & emojis (fitness, progress, goals, determination)
  const motivatingKeywords = [
    'vamos lá', 'vamos la', 'força', 'você consegue', 'voce consegue', 'foco', 'meta', 'disciplina',
    'evoluir', 'suor', 'resultado', 'conquistar', 'acredito', 'determinação', 'determinacao',
    'treino', 'cardio', 'hipertrofia', 'energia', 'bora', 'rumo ao', 'não desista', 'nao desista',
    'persista', 'campeão', 'campeã', 'desafio', 'supere', 'superação',
    '💪', '🔥', '🏋️', '⚡', '🏆', '🎯', 'crush it', 'keep going', 'you got this', 'let\'s go'
  ];
  if (motivatingKeywords.some(kw => lower.includes(kw))) {
    return 'motivating';
  }

  // Thoughtful keywords & emojis (analysis, scientific balance, reflection, planning)
  const thoughtfulKeywords = [
    'analisando', 'interessante', 'vamos analisar', 'vejamos', 'recomendo avaliar', 'considere',
    'estudos mostram', 'científico', 'cientifico', 'pesquisas', 'importante notar', 'estratégia',
    'estrategia', 'equilíbrio', 'equilibrio', 'déficit', 'deficit', 'ponderar', 'calorias', 'macronutrientes',
    'metabolismo', 'termogênese', 'hormonal', 'reflita', 'avaliação', 'orientação',
    '🤔', '💡', '🧠', '📊', 'considering', 'research', 'analysis', 'let me analyze'
  ];
  if (thoughtfulKeywords.some(kw => lower.includes(kw))) {
    return 'thoughtful';
  }

  // Happy keywords & emojis (praise, warmth, celebration, greetings, delicious healthy food)
  const happyKeywords = [
    'parabéns', 'parabens', 'ótimo', 'otimo', 'maravilha', 'delícia', 'delicia', 'feliz', 'adorei', 'adoro',
    'gostei', 'bom dia', 'boa tarde', 'boa noite', 'excelente', 'fantástico', 'fantastico', 'que bom',
    'com certeza', 'adoraria', 'alegria', 'sorriso', 'bem-vindo', 'bem-vinda', 'obrigada',
    '💚', '😄', '😊', '🎉', '✨', '🥰', 'great', 'wonderful', 'happy', 'glad', 'awesome'
  ];
  if (happyKeywords.some(kw => lower.includes(kw))) {
    return 'happy';
  }

  return 'neutral';
}

/**
 * Attaches real-time Web Audio Analyser to an HTMLAudioElement during TTS playback
 */
export function attachAudioLipSync(audio: HTMLAudioElement) {
  if (typeof window === 'undefined') return;
  detachAudioLipSync();

  activeAudioElement = audio;
  avatarGlobalStore.setSpeaking(true);
  avatarGlobalStore.setMaluLipSync({ isSpeaking: true });

  const ctx = getAudioContext();
  if (!ctx) {
    startProceduralFallback(audio);
    return;
  }

  try {
    if (!analyser) {
      analyser = ctx.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.45;
    }

    let source = sourceNodeCache.get(audio);
    if (!source) {
      source = ctx.createMediaElementSource(audio);
      sourceNodeCache.set(audio, source);
    }
    currentSourceNode = source;

    // Connect source to analyser, and analyser to speakers
    try {
      source.disconnect();
    } catch (e) {}
    source.connect(analyser);
    analyser.connect(ctx.destination);

    const freqData = new Uint8Array(analyser.frequencyBinCount);
    const timeData = new Uint8Array(analyser.fftSize);

    const updateLoop = () => {
      if (!activeAudioElement || activeAudioElement.paused || activeAudioElement.ended) {
        detachAudioLipSync();
        return;
      }

      analyser?.getByteFrequencyData(freqData);
      analyser?.getByteTimeDomainData(timeData);

      // 1. RMS Amplitude for volume
      let sumSquares = 0;
      for (let i = 0; i < timeData.length; i++) {
        const val = (timeData[i] - 128) / 128;
        sumSquares += val * val;
      }
      const rawRms = Math.sqrt(sumSquares / timeData.length);
      const audioVolume = Math.min(1.0, Math.max(0, rawRms * 2.8));

      // 2. Frequency bands: Low (vowel mouth aperture 100-800Hz) vs Mid-High (mouth spread/consonants)
      let lowEnergy = 0;
      let midHighEnergy = 0;
      const binCount = freqData.length;
      const lowBinEnd = Math.floor(binCount * 0.35);

      for (let i = 0; i < lowBinEnd; i++) {
        lowEnergy += freqData[i];
      }
      for (let i = lowBinEnd; i < binCount; i++) {
        midHighEnergy += freqData[i];
      }

      lowEnergy = lowEnergy / (lowBinEnd * 255);
      midHighEnergy = midHighEnergy / ((binCount - lowBinEnd) * 255);

      // Noise gate
      const gateThreshold = 0.04;
      let mouthOpen = 0;
      let mouthSpread = 0.2;

      if (audioVolume > gateThreshold) {
        // Mouth aperture driven by volume and vowel energy
        mouthOpen = Math.min(1.0, Math.max(0, (audioVolume - gateThreshold) * 1.5 + lowEnergy * 0.6));
        // Mouth width/spread driven by mid-high frequency formants
        mouthSpread = Math.min(1.0, Math.max(0, 0.15 + midHighEnergy * 0.85));
      }

      avatarGlobalStore.setMaluLipSync({
        audioVolume,
        mouthOpen,
        mouthSpread,
        isSpeaking: true
      });

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('malu:lipsync', {
          detail: { audioVolume, mouthOpen, mouthSpread, isSpeaking: true }
        }));
      }

      animFrameId = requestAnimationFrame(updateLoop);
    };

    animFrameId = requestAnimationFrame(updateLoop);

    audio.addEventListener('ended', onAudioEnd);
    audio.addEventListener('pause', onAudioEnd);
    audio.addEventListener('error', onAudioEnd);

  } catch (err) {
    console.warn('[AudioLipSync] Web Audio connect error, falling back to procedural envelope:', err);
    startProceduralFallback(audio);
  }
}

function onAudioEnd() {
  detachAudioLipSync();
}

/**
 * Procedural fallback for audio elements when Web Audio MediaElementSource is restricted
 */
function startProceduralFallback(audio: HTMLAudioElement) {
  let phase = 0;

  const loop = () => {
    if (!activeAudioElement || activeAudioElement.paused || activeAudioElement.ended) {
      detachAudioLipSync();
      return;
    }

    phase += 0.28;
    // Syllabic rhythm at ~4Hz with organic speech cadence
    const baseWave = Math.sin(phase) * 0.5 + 0.5;
    const secondaryWave = Math.sin(phase * 2.3) * 0.25;
    const syllabicMouth = Math.max(0, Math.min(1, baseWave + secondaryWave));

    const audioVolume = syllabicMouth * 0.75;
    const mouthOpen = syllabicMouth * 0.85;
    const mouthSpread = 0.3 + Math.sin(phase * 1.7) * 0.25;

    avatarGlobalStore.setMaluLipSync({
      audioVolume,
      mouthOpen,
      mouthSpread,
      isSpeaking: true
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('malu:lipsync', {
        detail: { audioVolume, mouthOpen, mouthSpread, isSpeaking: true }
      }));
    }

    animFrameId = requestAnimationFrame(loop);
  };

  animFrameId = requestAnimationFrame(loop);

  audio.addEventListener('ended', onAudioEnd);
  audio.addEventListener('pause', onAudioEnd);
  audio.addEventListener('error', onAudioEnd);
}

/**
 * Rhythmic procedural lip-sync for Web Speech API SpeechSynthesisUtterance
 */
export function startSpeechUtteranceLipSync(utterance: SpeechSynthesisUtterance) {
  detachAudioLipSync();
  avatarGlobalStore.setSpeaking(true);
  avatarGlobalStore.setMaluLipSync({ isSpeaking: true });

  let phase = 0;
  let active = true;

  const loop = () => {
    if (!active) return;

    phase += 0.32;
    const baseWave = Math.sin(phase) * 0.5 + 0.5;
    const secondaryWave = Math.sin(phase * 2.1) * 0.3;
    const syllabicMouth = Math.max(0, Math.min(1, baseWave + secondaryWave));

    const audioVolume = syllabicMouth * 0.7;
    const mouthOpen = syllabicMouth * 0.8;
    const mouthSpread = 0.35 + Math.sin(phase * 1.5) * 0.25;

    avatarGlobalStore.setMaluLipSync({
      audioVolume,
      mouthOpen,
      mouthSpread,
      isSpeaking: true
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('malu:lipsync', {
        detail: { audioVolume, mouthOpen, mouthSpread, isSpeaking: true }
      }));
    }

    animFrameId = requestAnimationFrame(loop);
  };

  animFrameId = requestAnimationFrame(loop);

  const prevOnEnd = utterance.onend;
  const prevOnError = utterance.onerror;

  utterance.onend = (e) => {
    active = false;
    detachAudioLipSync();
    prevOnEnd?.call(utterance, e);
  };

  utterance.onerror = (e) => {
    active = false;
    detachAudioLipSync();
    prevOnError?.call(utterance, e);
  };
}

/**
 * Cleanly detaches audio analyzer and smoothly ramps mouth back to resting state
 */
export function detachAudioLipSync() {
  if (animFrameId !== null) {
    cancelAnimationFrame(animFrameId);
    animFrameId = null;
  }
  if (proceduralIntervalId) {
    clearInterval(proceduralIntervalId);
    proceduralIntervalId = null;
  }

  if (activeAudioElement) {
    activeAudioElement.removeEventListener('ended', onAudioEnd);
    activeAudioElement.removeEventListener('pause', onAudioEnd);
    activeAudioElement.removeEventListener('error', onAudioEnd);
    activeAudioElement = null;
  }

  avatarGlobalStore.setSpeaking(false);
  avatarGlobalStore.setMaluLipSync({
    audioVolume: 0,
    mouthOpen: 0,
    mouthSpread: 0.1,
    isSpeaking: false
  });

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('malu:lipsync', {
      detail: { audioVolume: 0, mouthOpen: 0, mouthSpread: 0.1, isSpeaking: false }
    }));
  }
}
