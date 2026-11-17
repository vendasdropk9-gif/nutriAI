import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../lib/sensory', () => ({
  playSfx: vi.fn(),
  vibrate: vi.fn(),
}));

vi.mock('../lib/speech', () => ({
  speak: vi.fn(),
  stopSpeech: vi.fn(),
}));

import { WaterRemindersModal } from '../components/WaterRemindersModal';

describe('WaterRemindersModal Component', () => {
  const mockProfile = {
    name: 'Teste Usuário',
    restrictions: [],
    allergies: [],
    goals: 'Hidratação',
    equipment: [],
    waterPushSchedule: {
      enabled: true,
      circadianSyncEnabled: true,
      mode: 'circadian_adaptive' as const,
      intervalMinutes: 90,
      customTimes: ['08:00', '12:00', '18:00'],
      startHour: '07:00',
      endHour: '21:30',
      sunriseOffsetMinutes: 20,
      sunsetTaperMinutes: 90,
      quietHoursEnabled: true,
      quietHoursStart: '22:00',
      quietHoursEnd: '06:30',
      targetSipMl: 250,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <WaterRemindersModal
        isOpen={false}
        onClose={vi.fn()}
        profile={mockProfile}
        onUpdateConfig={vi.fn()}
        addNotification={vi.fn()}
        updateProfile={vi.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders modal title and water schedule panel when isOpen is true', () => {
    render(
      <WaterRemindersModal
        isOpen={true}
        onClose={vi.fn()}
        profile={mockProfile}
        onUpdateConfig={vi.fn()}
        addNotification={vi.fn()}
        updateProfile={vi.fn()}
      />
    );

    expect(screen.getByText('Gerenciar Lembretes de Água')).toBeDefined();
    expect(screen.getByText('Sincronização com Ritmo Circadiano')).toBeDefined();
    expect(screen.getByTestId('water-push-scheduler-panel')).toBeDefined();
  });

  it('calls onClose when close button is clicked', () => {
    const handleClose = vi.fn();
    render(
      <WaterRemindersModal
        isOpen={true}
        onClose={handleClose}
        profile={mockProfile}
        onUpdateConfig={vi.fn()}
        addNotification={vi.fn()}
        updateProfile={vi.fn()}
      />
    );

    const closeBtn = screen.getByTitle('Fechar modal');
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('provides 1-touch snooze buttons for 15 and 30 minutes with Aoede voice ID inside the modal', () => {
    const handleUpdateConfig = vi.fn();
    const handleUpdateProfile = vi.fn();
    const handleAddNotification = vi.fn();

    render(
      <WaterRemindersModal
        isOpen={true}
        onClose={vi.fn()}
        profile={mockProfile}
        onUpdateConfig={handleUpdateConfig}
        addNotification={handleAddNotification}
        updateProfile={handleUpdateProfile}
      />
    );

    const snooze15 = screen.getByTitle('Adiar próximo lembrete de água em 15 minutos com um toque');
    const snooze30 = screen.getByTitle('Adiar próximo lembrete de água em 30 minutos com um toque');

    expect(snooze15).toBeDefined();
    expect(snooze30).toBeDefined();
    expect(snooze15.getAttribute('data-malu-voice-id')).toBe('Aoede');
    expect(snooze30.getAttribute('data-malu-voice-id')).toBe('Aoede');

    fireEvent.click(snooze15);
    expect(handleUpdateConfig).toHaveBeenCalled();
    expect(handleUpdateProfile).toHaveBeenCalled();
    expect(handleAddNotification).toHaveBeenCalledWith(expect.objectContaining({
      title: '⏰ Lembrete de Água Adiado!',
      message: expect.stringContaining('15 minutos'),
      type: 'info',
    }));
  });
});
