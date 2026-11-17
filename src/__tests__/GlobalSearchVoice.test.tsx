import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('../lib/sensory', () => ({
  playSfx: vi.fn(),
  vibrate: vi.fn(),
}));

vi.mock('../contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'pt-BR', setLanguage: vi.fn() }),
  useTranslation: () => ({ t: (_k: string, fallback?: string) => fallback || _k }),
}));

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ user: null }),
}));

vi.mock('../lib/firebase', () => ({
  db: {},
  doc: vi.fn(),
  setDoc: vi.fn().mockResolvedValue(undefined),
  onSnapshot: vi.fn(() => () => {}),
}));

import { GlobalSearch, extractVoiceSearchQuery } from '../components/GlobalSearch';
import { matchVoiceTabCommand } from '../hooks/useVoiceTabNavigator';

class MockSpeechRecognition {
  static instances: MockSpeechRecognition[] = [];

  lang = '';
  interimResults = false;
  continuous = false;
  maxAlternatives = 1;
  onstart: (() => void) | null = null;
  onresult: ((event: any) => void) | null = null;
  onerror: ((event: any) => void) | null = null;
  onend: (() => void) | null = null;

  start = vi.fn(() => {
    this.onstart?.();
  });
  stop = vi.fn(() => {
    this.onend?.();
  });
  abort = vi.fn();

  constructor() {
    MockSpeechRecognition.instances.push(this);
  }
}

describe('GlobalSearch Web Speech API (Voice Search & Tab Navigation)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    MockSpeechRecognition.instances = [];
    (window as any).SpeechRecognition = MockSpeechRecognition;
    delete (window as any).webkitSpeechRecognition;
  });

  afterEach(() => {
    delete (window as any).SpeechRecognition;
    delete (window as any).webkitSpeechRecognition;
  });

  it('initiates a global recipe search via Web Speech API without triggering unintended tab navigation', () => {
    const onNavigate = vi.fn();

    render(
      <GlobalSearch
        activeTab="assistant360"
        onNavigate={onNavigate}
        isDarkMode={true}
        variant="desktop"
      />
    );

    const micBtn = screen.getByTestId('global-search-voice-btn');
    act(() => {
      fireEvent.click(micBtn);
    });

    expect(MockSpeechRecognition.instances.length).toBe(1);
    const recognition = MockSpeechRecognition.instances[0];
    expect(recognition.start).toHaveBeenCalledTimes(1);
    expect(recognition.lang).toBe('pt-BR');
    expect(recognition.interimResults).toBe(true);
    expect(micBtn.getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByTestId('global-search-listening-card')).toBeDefined();

    // Emit finalized speech search result
    act(() => {
      recognition.onresult?.({
        resultIndex: 0,
        results: [
          Object.assign([{ transcript: 'Quero uma receita de panqueca' }], {
            isFinal: true,
          }),
        ],
      });
      recognition.onend?.();
    });

    const input = screen.getByTestId('global-search-input') as HTMLInputElement;
    expect(input.value).toBe('panqueca');
    expect(onNavigate).not.toHaveBeenCalled();
    expect(screen.getByTestId('global-search-voice-status').textContent).toContain('panqueca');
    expect(screen.getAllByText('Panqueca de Banana e Canela').length).toBeGreaterThanOrEqual(1);
  });

  it('waits for final speech result before executing voice tab navigation and routes to the correct tab', () => {
    const onNavigate = vi.fn();
    const appNavSpy = vi.fn();
    window.addEventListener('app:navigate', appNavSpy);

    render(
      <GlobalSearch
        activeTab="assistant360"
        onNavigate={onNavigate}
        isDarkMode={true}
        variant="desktop"
      />
    );

    fireEvent.click(screen.getByTestId('global-search-voice-btn'));
    const recognition = MockSpeechRecognition.instances[0];

    // Interim result should preview cleanly without navigating mid-sentence
    act(() => {
      recognition.onresult?.({
        resultIndex: 0,
        results: [
          Object.assign([{ transcript: 'Malu abrir lista de compras' }], {
            isFinal: false,
          }),
        ],
      });
    });

    expect(onNavigate).not.toHaveBeenCalled();

    // Finalized result executes navigation to shopping tab
    act(() => {
      recognition.onresult?.({
        resultIndex: 0,
        results: [
          Object.assign([{ transcript: 'Malu abrir lista de compras' }], {
            isFinal: true,
          }),
        ],
      });
    });

    expect(onNavigate).toHaveBeenCalledWith('shopping');
    expect(appNavSpy).toHaveBeenCalled();
    window.removeEventListener('app:navigate', appNavSpy);
  });

  it('supports webkitSpeechRecognition fallback and resolves multiple voice tab navigation phrases', () => {
    delete (window as any).SpeechRecognition;
    (window as any).webkitSpeechRecognition = MockSpeechRecognition;

    const onNavigate = vi.fn();
    render(
      <GlobalSearch
        activeTab="assistant360"
        onNavigate={onNavigate}
        isDarkMode={false}
        variant="desktop"
      />
    );

    fireEvent.click(screen.getByTestId('global-search-voice-btn'));
    const recognition = MockSpeechRecognition.instances[0];

    act(() => {
      recognition.onresult?.({
        resultIndex: 0,
        results: [
          Object.assign([{ transcript: 'Ir para planos e preços' }], {
            isFinal: true,
          }),
        ],
      });
    });

    expect(onNavigate).toHaveBeenCalledWith('pricing');

    // Pure matcher checks for additional real App.tsx tabs & natural language parser
    expect(matchVoiceTabCommand('Abrir geladeira inteligente')?.tab).toBe('fridge');
    expect(matchVoiceTabCommand('Ir para cardápio semanal')?.tab).toBe('plan');
    expect(matchVoiceTabCommand('Malu, abrir meu perfil')?.tab).toBe('profile');
    expect(matchVoiceTabCommand('Navegar para personal trainer')?.tab).toBe('trainer');
    expect(matchVoiceTabCommand('Quero receita de aveia')).toBeNull();
    expect(extractVoiceSearchQuery('Quero receita de crepioca', 'pt-BR').cleanedQuery).toBe('crepioca');
  });

  it('displays inline error feedback without window.alert when Web Speech API is unsupported or denied', () => {
    delete (window as any).SpeechRecognition;
    delete (window as any).webkitSpeechRecognition;
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    const { rerender } = render(
      <GlobalSearch
        activeTab="assistant360"
        onNavigate={vi.fn()}
        isDarkMode={true}
        variant="desktop"
      />
    );

    fireEvent.click(screen.getByTestId('global-search-voice-btn'));
    expect(alertSpy).not.toHaveBeenCalled();
    expect(screen.getByTestId('global-search-voice-error').textContent).toContain('Web Speech');

    // Re-enable API and simulate permission denied error
    (window as any).SpeechRecognition = MockSpeechRecognition;
    rerender(
      <GlobalSearch
        activeTab="assistant360"
        onNavigate={vi.fn()}
        isDarkMode={true}
        variant="desktop"
      />
    );

    fireEvent.click(screen.getByTestId('global-search-voice-btn'));
    const recognition = MockSpeechRecognition.instances[0];

    act(() => {
      recognition.onerror?.({ error: 'not-allowed' });
    });

    expect(screen.getByTestId('global-search-voice-error').textContent).toContain(
      'Permissão de microfone negada'
    );
    alertSpy.mockRestore();
  });

  it('supports starting voice recognition directly from the mobile header voice trigger', () => {
    const onNavigate = vi.fn();
    render(
      <GlobalSearch
        activeTab="assistant360"
        onNavigate={onNavigate}
        isDarkMode={true}
        variant="mobile"
      />
    );

    const mobileVoiceBtn = screen.getByTestId('global-search-voice-btn-mobile');
    fireEvent.click(mobileVoiceBtn);

    expect(MockSpeechRecognition.instances.length).toBe(1);
    expect(MockSpeechRecognition.instances[0].start).toHaveBeenCalledTimes(1);
  });
});
