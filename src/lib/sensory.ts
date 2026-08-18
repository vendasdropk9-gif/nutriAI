// Audio Context Singleton that safely resumes only after a user gesture
let sharedAudioCtx: AudioContext | null = null;
let userHasInteracted = false;

if (typeof window !== 'undefined') {
  const markInteraction = () => {
    userHasInteracted = true;
    if (sharedAudioCtx && sharedAudioCtx.state === 'suspended') {
      sharedAudioCtx.resume().catch(() => {});
    }
    window.removeEventListener('pointerdown', markInteraction);
    window.removeEventListener('keydown', markInteraction);
    window.removeEventListener('touchstart', markInteraction);
  };
  window.addEventListener('pointerdown', markInteraction, { passive: true });
  window.addEventListener('keydown', markInteraction, { passive: true });
  window.addEventListener('touchstart', markInteraction, { passive: true });
}

const getSafeAudioContext = (): AudioContext | null => {
  if (typeof window === 'undefined') return null;
  if (!userHasInteracted) return null; // Don't trigger browser autoplay warning before user gesture

  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return null;
    if (!sharedAudioCtx) {
      sharedAudioCtx = new AudioContextClass();
    }
    if (sharedAudioCtx.state === 'suspended') {
      sharedAudioCtx.resume().catch(() => {});
      return null;
    }
    return sharedAudioCtx;
  } catch (e) {
    return null;
  }
};

export const playSfx = (type: 'tap' | 'success' | 'notification' | 'pop' | 'crystal' | 'scratch' | 'confetti') => {
  try {
    const ctx = getSafeAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    const now = ctx.currentTime;

    if (type === 'scratch') {
      // Noise/scratch-like sound using buffer
      const bufferSize = ctx.sampleRate * 0.1; // 100ms
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      
      const filter = ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 1000;
      
      noise.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      gainNode.gain.setValueAtTime(0.05, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      
      noise.start(now);
      return;
    } else if (type === 'crystal') {
      // "ta-ré" cristalino
      osc.type = 'sine';
      
      // First note "ta"
      osc.frequency.setValueAtTime(1200, now);
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.05, now + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      
      // Second note "ré"
      const osc2 = ctx.createOscillator();
      const gainNode2 = ctx.createGain();
      osc2.type = 'triangle';
      osc2.connect(gainNode2);
      gainNode2.connect(ctx.destination);
      
      osc2.frequency.setValueAtTime(1800, now + 0.1); // Higher pitch for "ré"
      gainNode2.gain.setValueAtTime(0, now + 0.1);
      gainNode2.gain.linearRampToValueAtTime(0.05, now + 0.12);
      gainNode2.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      
      osc.start(now);
      osc.stop(now + 0.1);
      osc2.start(now + 0.1);
      osc2.stop(now + 0.5);
      return;
    } else if (type === 'tap') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.exponentialRampToValueAtTime(600, now + 0.05);
      gainNode.gain.setValueAtTime(0.1, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
      osc.start(now);
      osc.stop(now + 0.05);
    } else if (type === 'pop') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(800, now + 0.1);
      gainNode.gain.setValueAtTime(0.1, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
    } else if (type === 'success') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.setValueAtTime(600, now + 0.1);
      gainNode.gain.setValueAtTime(0.1, now);
      gainNode.gain.linearRampToValueAtTime(0, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    } else if (type === 'notification') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(500, now);
      osc.frequency.setValueAtTime(750, now + 0.15);
      gainNode.gain.setValueAtTime(0.1, now);
      gainNode.gain.linearRampToValueAtTime(0, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    } else if (type === 'confetti') {
      // Confetti burst sound synthesis: main blast + multiple crackles + falling shimmer
      
      // 1. MAIN BLAST (explosion/pop)
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(280, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.25);
      gainNode.gain.setValueAtTime(0.2, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.start(now);
      osc.stop(now + 0.3);

      // 2. MULTIPLE CRACKLES (mimics flying debris / little bursting poppers)
      const cracklesCount = 12;
      for (let i = 0; i < cracklesCount; i++) {
        const delay = 0.05 + Math.random() * 0.35; // scheduled between 50ms and 400ms
        const cOsc = ctx.createOscillator();
        const cGain = ctx.createGain();
        
        cOsc.type = Math.random() > 0.4 ? 'sine' : 'triangle';
        const startFreq = 1000 + Math.random() * 1500;
        cOsc.frequency.setValueAtTime(startFreq, now + delay);
        cOsc.frequency.exponentialRampToValueAtTime(startFreq / 2, now + delay + 0.04);
        
        cGain.gain.setValueAtTime(0, now);
        cGain.gain.setValueAtTime(0.04 + Math.random() * 0.06, now + delay);
        cGain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.04);
        
        cOsc.connect(cGain);
        cGain.connect(ctx.destination);
        
        cOsc.start(now + delay);
        cOsc.stop(now + delay + 0.05);
      }

      // 3. SHIMMING / WHISTLING TAIL (falling glitter sound)
      const shimmerCount = 3;
      const baseFreqs = [2200, 3100, 4400];
      baseFreqs.forEach((freq, idx) => {
        const sOsc = ctx.createOscillator();
        const sGain = ctx.createGain();
        
        sOsc.type = 'sine';
        sOsc.frequency.setValueAtTime(freq, now);
        
        // Add subtle pitch glide for whistling falling effect
        sOsc.frequency.linearRampToValueAtTime(freq * 0.85, now + 0.8);
        
        sGain.gain.setValueAtTime(0, now);
        sGain.gain.linearRampToValueAtTime(0.015, now + 0.05);
        sGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5 + idx * 0.15);
        
        sOsc.connect(sGain);
        sGain.connect(ctx.destination);
        
        sOsc.start(now);
        sOsc.stop(now + 0.8);
      });
      return;
    }
  } catch (e) {
    // Ignore context errors
  }
};

export const vibrate = (pattern: number | number[]) => {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      navigator.vibrate(pattern);
    } catch(e) {}
  }
};
