import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HabitTracker } from '../components/HabitTracker';
import { UserProfile } from '../types';

// Mock Language Context
vi.mock('../contexts/LanguageContext', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback || key,
    language: 'pt-BR'
  })
}));

// Mock Sensory & Speech Libs
vi.mock('../lib/speech', () => ({ playAudioUrl: vi.fn() }));
vi.mock('../lib/sensory', () => ({ playSfx: vi.fn(), vibrate: vi.fn() }));
vi.mock('../lib/gemini', () => ({
  textToSpeech: vi.fn().mockResolvedValue(null),
  generateHabitsInsight: vi.fn().mockResolvedValue('Insight test'),
  getWaterQualityAdvice: vi.fn().mockResolvedValue('Advice test')
}));

const mockProfile: UserProfile = {
  name: 'Test Runner',
  streak: 3,
  highestStreak: 5,
  points: 800,
  restrictions: [],
  allergies: [],
  goals: 'Saúde e disciplina',
  equipment: [],
  hydrationLogs: [],
  sleepLogs: [],
  fastingLogs: [],
  workoutLogs: []
};

describe('HabitTracker Speed-Dial Floating Action Button (FAB)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders FAB speed dial trigger button in HabitTracker', () => {
    render(
      <HabitTracker 
        profile={mockProfile} 
        onUpdateProfile={vi.fn()} 
      />
    );

    const fabTrigger = screen.getByTestId('habit-speed-dial-trigger');
    expect(fabTrigger).toBeDefined();
  });

  it('opens speed dial menu on click and displays quick actions', () => {
    render(
      <HabitTracker 
        profile={mockProfile} 
        onUpdateProfile={vi.fn()} 
      />
    );

    const fabTrigger = screen.getByTestId('habit-speed-dial-trigger');
    fireEvent.click(fabTrigger);

    // Quick action buttons should be visible
    expect(screen.getByText(/Beber Água/i)).toBeDefined();
    expect(screen.getByText(/Registra Caminhada/i)).toBeDefined();
    expect(screen.getByText(/⏱️ Jejum/i)).toBeDefined();
    expect(screen.getByText(/Registrar Sono/i)).toBeDefined();
  });

  it('logs quick water activity (+250ml) when clicking quick water action', () => {
    const handleUpdateProfile = vi.fn();
    const handleAwardPoints = vi.fn();

    render(
      <HabitTracker 
        profile={mockProfile} 
        onUpdateProfile={handleUpdateProfile} 
        onAwardPoints={handleAwardPoints}
      />
    );

    // Open FAB
    fireEvent.click(screen.getByTestId('habit-speed-dial-trigger'));

    // Click "Beber Água (+250ml)"
    const waterBtn = screen.getByText(/Beber Água/i);
    fireEvent.click(waterBtn);

    // Profile updated with new hydration log
    expect(handleUpdateProfile).toHaveBeenCalledWith(
      expect.objectContaining({
        hydrationLogs: expect.arrayContaining([
          expect.objectContaining({ amount: 250 })
        ])
      })
    );
  });

  it('logs quick walk activity (+20 min) when clicking quick walk action', () => {
    const handleUpdateProfile = vi.fn();
    const handleAwardPoints = vi.fn();
    const handleNotification = vi.fn();

    render(
      <HabitTracker 
        profile={mockProfile} 
        onUpdateProfile={handleUpdateProfile} 
        onAwardPoints={handleAwardPoints}
        addNotification={handleNotification}
      />
    );

    // Open FAB
    fireEvent.click(screen.getByTestId('habit-speed-dial-trigger'));

    // Click "Registra Caminhada (+20m)"
    const walkBtn = screen.getByText(/Registra Caminhada/i);
    fireEvent.click(walkBtn);

    // Profile updated with new workout log
    expect(handleUpdateProfile).toHaveBeenCalledWith(
      expect.objectContaining({
        workoutLogs: expect.arrayContaining([
          expect.objectContaining({ durationMinutes: 20 })
        ])
      })
    );

    expect(handleAwardPoints).toHaveBeenCalledWith(25, expect.any(String));
  });
});
