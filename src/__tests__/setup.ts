import { beforeEach, vi } from 'vitest';

// Polyfill AudioContext for tests
class MockAudioContext {
  state = 'running';
  currentTime = 0;
  sampleRate = 44100;
  destination = {};
  createOscillator() {
    return {
      type: 'sine',
      frequency: {
        setValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    };
  }
  createGain() {
    return {
      gain: {
        setValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
    };
  }
  createBuffer() {
    return {
      getChannelData: () => new Float32Array(100),
    };
  }
  createBufferSource() {
    return {
      buffer: null,
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    };
  }
  createBiquadFilter() {
    return {
      type: 'highpass',
      frequency: { value: 1000 },
      connect: vi.fn(),
    };
  }
  resume() {
    return Promise.resolve();
  }
}

(window as any).AudioContext = MockAudioContext;
(window as any).webkitAudioContext = MockAudioContext;

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock navigator.vibrate
if (typeof navigator !== 'undefined') {
  (navigator as any).vibrate = vi.fn();
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  vi.clearAllMocks();
});
