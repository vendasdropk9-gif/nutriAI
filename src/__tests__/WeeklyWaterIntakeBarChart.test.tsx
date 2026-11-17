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

// Mock recharts ResponsiveContainer to render children cleanly in test env
vi.mock('recharts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('recharts')>();
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div style={{ width: 500, height: 300 }}>{children}</div>
    ),
  };
});

import { WeeklyWaterIntakeBarChart } from '../components/WeeklyWaterIntakeBarChart';
import { speak } from '../lib/speech';

describe('WeeklyWaterIntakeBarChart Component', () => {
  const mockProfile: any = {
    name: 'Carlos Teste',
    weight: 70,
    waterGoal: 2500,
    hydrationLogs: [
      { id: '1', date: new Date().toISOString(), amount: 1500, source: 'Filtrada' },
      { id: '2', date: new Date(Date.now() - 86400000).toISOString(), amount: 2600, source: 'Mineral' },
      { id: '3', date: new Date(Date.now() - 86400000 * 2).toISOString(), amount: 2500, source: 'Filtrada' }
    ]
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders Weekly Water Intake title, target metric, and 7-day indicators', () => {
    render(<WeeklyWaterIntakeBarChart profile={mockProfile} />);

    expect(screen.getByText('Ingestão de Água Semanal')).toBeDefined();
    expect(screen.getByText('Meta Diária')).toBeDefined();
    expect(screen.getByText('2.500')).toBeDefined();
    expect(screen.getByText('Média Semanal')).toBeDefined();
    expect(screen.getByText('Metas Batidas')).toBeDefined();
  });

  it('provides quick water logging buttons (+250ml, +500ml) that trigger profile update', () => {
    const handleUpdateProfile = vi.fn();
    const handleAddNotification = vi.fn();

    render(
      <WeeklyWaterIntakeBarChart 
        profile={mockProfile} 
        onUpdateProfile={handleUpdateProfile}
        addNotification={handleAddNotification}
      />
    );

    const add250Btn = screen.getByText('+250 ml');
    expect(add250Btn).toBeDefined();
    fireEvent.click(add250Btn);

    expect(handleUpdateProfile).toHaveBeenCalled();
    expect(handleAddNotification).toHaveBeenCalledWith(expect.objectContaining({
      title: '💧 Água Registrada!',
      message: '+250ml adicionados ao seu consumo de hoje.',
      type: 'success'
    }));
  });

  it('has data-malu-voice-id="Aoede" on speech audio button and speaks with Malu Aoede voice', () => {
    render(<WeeklyWaterIntakeBarChart profile={mockProfile} />);

    const speakBtn = screen.getByTitle(/Ouvir análise de hidratação com a voz da Malu \(Aoede\)/i);
    expect(speakBtn).toBeDefined();
    expect(speakBtn.getAttribute('data-malu-voice-id')).toBe('Aoede');

    fireEvent.click(speakBtn);
    expect(speak).toHaveBeenCalledWith(
      expect.stringContaining('resumo da sua hidratação semanal'),
      expect.objectContaining({ voice: 'Aoede', lang: 'pt-BR' })
    );
  });

  it('provides 1-touch snooze buttons for +15 min and +30 min with Aoede voice ID', () => {
    const handleUpdateProfile = vi.fn();
    const handleAddNotification = vi.fn();

    render(
      <WeeklyWaterIntakeBarChart 
        profile={mockProfile} 
        onUpdateProfile={handleUpdateProfile}
        addNotification={handleAddNotification}
      />
    );

    const snooze15Btn = screen.getByTitle(/Adiar próximo lembrete de água em 15 minutos com apenas um toque/i);
    expect(snooze15Btn).toBeDefined();
    expect(snooze15Btn.getAttribute('data-malu-voice-id')).toBe('Aoede');

    const snooze30Btn = screen.getByTitle(/Adiar próximo lembrete de água em 30 minutos com apenas um toque/i);
    expect(snooze30Btn).toBeDefined();
    expect(snooze30Btn.getAttribute('data-malu-voice-id')).toBe('Aoede');

    // Click snooze 15 min
    fireEvent.click(snooze15Btn);
    expect(handleUpdateProfile).toHaveBeenCalled();
    expect(handleAddNotification).toHaveBeenCalledWith(expect.objectContaining({
      title: '⏰ Lembrete de Água Adiado!',
      message: expect.stringContaining('15 minutos'),
      type: 'info'
    }));
    expect(speak).toHaveBeenCalledWith(
      expect.stringContaining('15 minutos'),
      expect.objectContaining({ voice: 'Aoede', lang: 'pt-BR' })
    );

    // Click snooze 30 min
    fireEvent.click(snooze30Btn);
    expect(handleUpdateProfile).toHaveBeenCalled();
    expect(handleAddNotification).toHaveBeenCalledWith(expect.objectContaining({
      title: '⏰ Lembrete de Água Adiado!',
      message: expect.stringContaining('30 minutos'),
      type: 'info'
    }));
    expect(speak).toHaveBeenCalledWith(
      expect.stringContaining('30 minutos'),
      expect.objectContaining({ voice: 'Aoede', lang: 'pt-BR' })
    );
  });

  it('opens the Gerenciar Lembretes de Água modal from quick access button and from toolbar button', () => {
    render(<WeeklyWaterIntakeBarChart profile={mockProfile} />);

    const openModalBtns = screen.getAllByTitle(/Gerenciar Lembretes de Água/i);
    expect(openModalBtns.length).toBeGreaterThanOrEqual(1);
    fireEvent.click(openModalBtns[0]);

    expect(screen.getByText('Gerenciar Lembretes de Água')).toBeDefined();
  });
});
