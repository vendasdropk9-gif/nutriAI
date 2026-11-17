import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const { mockSpeak, mockStopSpeech } = vi.hoisted(() => ({
  mockSpeak: vi.fn().mockResolvedValue(undefined),
  mockStopSpeech: vi.fn(),
}));

vi.mock('../lib/speech', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/speech')>();
  return {
    ...actual,
    speak: mockSpeak,
    stopSpeech: mockStopSpeech,
    getVoiceVolume: () => 1,
    setVoiceVolume: vi.fn(),
    unlockAudio: vi.fn(),
  };
});

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

import { MALU_VOICE_ID, MALU_VOICE_ATTR } from '../lib/maluVoice';
import { VoicePlayButton } from '../components/VoicePlayButton';
import { MaluVoiceTestView } from '../components/MaluVoiceTestView';
import { DailyWorkoutTipCard } from '../components/DailyWorkoutTipCard';
import { RecipeStepTimer } from '../components/RecipeStepTimer';
import { HandsFreeListeningStatusBar } from '../components/HandsFreeListeningStatusBar';
import { HandsFreeVoiceSensitivitySettings } from '../components/HandsFreeVoiceSensitivitySettings';
import { HandsFreeVoiceCommandsPanel } from '../components/HandsFreeVoiceCommandsPanel';
import { HandsFreeGestureDetector } from '../components/HandsFreeGestureDetector';
import { GlobalSearch } from '../components/GlobalSearch';
import { CameraAlertModal } from '../components/CameraAlertModal';

describe('Malu speech ID ("Aoede") on audio-interacting buttons', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('defines canonical MALU_VOICE_ID and data-malu-voice-id attribute as "Aoede"', () => {
    expect(MALU_VOICE_ID).toBe('Aoede');
    expect(MALU_VOICE_ATTR['data-malu-voice-id']).toBe('Aoede');
  });

  it('VoicePlayButton renders data-malu-voice-id="Aoede" and invokes speak with voice Aoede', () => {
    const { container } = render(<VoicePlayButton text="Olá, esta é a Malu!" />);
    const btn = container.querySelector('button');
    expect(btn).not.toBeNull();
    expect(btn?.getAttribute('data-malu-voice-id')).toBe('Aoede');

    fireEvent.click(btn!);
    expect(mockSpeak).toHaveBeenCalledTimes(1);
    expect(mockSpeak.mock.calls[0][1]).toEqual(
      expect.objectContaining({
        voice: 'Aoede',
      })
    );
  });

  it('MaluVoiceTestView buttons all carry data-malu-voice-id="Aoede" and trigger Aoede voice', () => {
    render(<MaluVoiceTestView />);
    const buttons = screen.getAllByRole('button', { name: /ouvir/i });
    expect(buttons.length).toBeGreaterThanOrEqual(3);

    buttons.forEach((btn) => {
      expect(btn.getAttribute('data-malu-voice-id')).toBe('Aoede');
    });

    fireEvent.click(buttons[0]);
    expect(mockSpeak).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ voice: 'Aoede' })
    );
  });

  it('DailyWorkoutTipCard audio button carries data-malu-voice-id="Aoede" and uses Aoede', () => {
    render(<DailyWorkoutTipCard profile={null} onNavigate={vi.fn()} />);
    const btn = screen.getByTitle(/Ouvir com Malu/i);
    expect(btn.getAttribute('data-malu-voice-id')).toBe('Aoede');

    fireEvent.click(btn);
    expect(mockSpeak).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ voice: 'Aoede' })
    );
  });

  it('RecipeStepTimer sound toggle button carries data-malu-voice-id="Aoede"', () => {
    render(<RecipeStepTimer stepText="Cozinhe por 5 minutos" stepIndex={0} recipeName="Omelete" />);
    const openBtn = screen.getByRole('button', { name: /Timer:/i });
    fireEvent.click(openBtn);

    const muteBtn = screen.getByTitle(/Desativar som/i);
    expect(muteBtn.getAttribute('data-malu-voice-id')).toBe('Aoede');
  });

  it('Hands-Free subcomponents attach data-malu-voice-id="Aoede" to voice/audio control buttons', () => {
    const { container: statusContainer } = render(
      <HandsFreeListeningStatusBar
        isListening={true}
        isSpeaking={false}
        isPaused={false}
        pauseReason={null}
        currentAudioLevel={45}
        voiceSensitivity={35}
        onOpenSettings={vi.fn()}
        onOpenCommandsGuide={vi.fn()}
      />
    );
    statusContainer.querySelectorAll('button').forEach((btn) => {
      expect(btn.getAttribute('data-malu-voice-id')).toBe('Aoede');
    });

    const { container: sensContainer } = render(
      <HandsFreeVoiceSensitivitySettings
        voiceSensitivity={35}
        onSensitivityChange={vi.fn()}
        currentAudioLevel={20}
        onSimulateCommand={vi.fn()}
      />
    );
    const pauseTestBtn = within(sensContainer).getByRole('button', { name: /"PAUSA"/i });
    expect(pauseTestBtn.getAttribute('data-malu-voice-id')).toBe('Aoede');
    expect(sensContainer.querySelectorAll('button[data-malu-voice-id="Aoede"]').length).toBeGreaterThanOrEqual(6);

    render(
      <HandsFreeVoiceCommandsPanel
        isOpen={true}
        onClose={vi.fn()}
        onSimulateCommand={vi.fn()}
      />
    );
    const cmdTestBtns = screen.getAllByRole('button', { name: /Testar/i });
    expect(cmdTestBtns.length).toBeGreaterThanOrEqual(1);
    cmdTestBtns.forEach((btn) => {
      expect(btn.getAttribute('data-malu-voice-id')).toBe('Aoede');
    });

    render(
      <HandsFreeGestureDetector
        isActive={true}
        isEnabled={false}
        isSpeaking={true}
        onToggleEnabled={vi.fn()}
        onGestureDetected={vi.fn()}
      />
    );
    expect(screen.getByRole('button', { name: /Simular Aceno/i }).getAttribute('data-malu-voice-id')).toBe('Aoede');
    expect(screen.getByRole('button', { name: /Ligar Sensor/i }).getAttribute('data-malu-voice-id')).toBe('Aoede');
  });

  it('GlobalSearch voice buttons and CameraAlertModal audio buttons expose data-malu-voice-id="Aoede"', () => {
    render(<GlobalSearch activeTab="assistant360" onNavigate={vi.fn()} isDarkMode={true} />);
    expect(screen.getByTestId('global-search-voice-btn').getAttribute('data-malu-voice-id')).toBe('Aoede');
    expect(screen.getByTestId('global-search-voice-btn-mobile').getAttribute('data-malu-voice-id')).toBe('Aoede');

    render(
      <CameraAlertModal
        alert={{
          id: 'alert-1',
          ruleId: 'rule-1',
          ruleName: 'Movimento',
          cameraId: 'cam-1',
          cameraName: 'Câmera Entrada',
          location: 'Entrada',
          severity: 'warning',
          title: 'Movimento detectado',
          description: 'Movimento detectado na cozinha',
          timestamp: new Date().toISOString(),
          timeAgo: 'Agora',
          status: 'pending',
          confidenceScore: 95,
          isRead: false,
        }}
        isOpen={true}
        onClose={vi.fn()}
        onResolve={vi.fn()}
      />
    );
    expect(screen.getByRole('button', { name: /Acionar Sirene/i }).getAttribute('data-malu-voice-id')).toBe('Aoede');
    expect(screen.getByRole('button', { name: /Silenciar Câmera/i }).getAttribute('data-malu-voice-id')).toBe('Aoede');
  });

  it('enforces data-malu-voice-id="Aoede" across all primary audio-interacting components', () => {
    const criticalComponents = [
      'LiveAssistant.tsx',
      'SmartChat.tsx',
      'RecipeCard.tsx',
      'WeeklyReport.tsx',
      'Assistant360.tsx',
      'KitchenModeModal.tsx',
      'PersonalTrainer.tsx',
      'FeedbackSystem.tsx',
      'PartnerBanner.tsx',
      'AdPlacement.tsx',
      'AiCoachTipsCard.tsx',
      'AiCookingAdvisor.tsx',
      'Malu3DAvatar.tsx',
      'SplashScreen.tsx',
      'Generator.tsx',
      'PantryScanner.tsx',
      'QuickDishes.tsx',
      'ShoppingListView.tsx',
      'Profile.tsx',
      'WelcomeTour.tsx',
      'WellnessHub.tsx',
    ];

    for (const fileName of criticalComponents) {
      const fullPath = path.resolve(process.cwd(), 'src/components', fileName);
      const src = fs.readFileSync(fullPath, 'utf8');
      expect(src, `${fileName} should declare data-malu-voice-id`).toContain('data-malu-voice-id');
      expect(src, `${fileName} should reference Aoede`).toContain('Aoede');
    }
  });
});
