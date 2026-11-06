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

// Mock Audio & Sensory Libs
vi.mock('../lib/speech', () => ({ playAudioUrl: vi.fn() }));
vi.mock('../lib/sensory', () => ({ playSfx: vi.fn(), vibrate: vi.fn() }));
vi.mock('../lib/gemini', () => ({
  textToSpeech: vi.fn().mockResolvedValue(null),
  generateHabitsInsight: vi.fn().mockResolvedValue('Insight test'),
  getWaterQualityAdvice: vi.fn().mockResolvedValue('Advice test')
}));

const mockProfile: UserProfile = {
  name: 'Test Runner',
  streak: 5,
  highestStreak: 7,
  points: 1250,
  restrictions: [],
  allergies: [],
  goals: 'Manter disciplina',
  equipment: [],
  hydrationLogs: [
    { id: '1', date: new Date().toISOString(), amount: 500, source: 'Filtrada' }
  ],
  sleepLogs: [],
  fastingLogs: []
};

describe('HabitTracker & Profile Streak Counter Gamification', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('renders visual streak counter banner prominently in HabitTracker', () => {
    const handleUpdateProfile = vi.fn();
    const handleAwardPoints = vi.fn();

    render(
      <HabitTracker 
        profile={mockProfile} 
        onUpdateProfile={handleUpdateProfile}
        onAwardPoints={handleAwardPoints}
      />
    );

    // Verify streak counter banner exists
    const streakBanner = screen.getByTestId('habit-streak-counter');
    expect(streakBanner).toBeDefined();

    // Verify streak count and text are displayed
    expect(screen.getByText(/5 Dias Consecutivos/i)).toBeDefined();
    expect(screen.getByText(/Recorde pessoal:/i)).toBeDefined();
    expect(screen.getByText(/Constância da Semana/i)).toBeDefined();
  });

  it('triggers streak bonus points when logging hydration habit', () => {
    const handleUpdateProfile = vi.fn();
    const handleAwardPoints = vi.fn();
    const handleNotification = vi.fn();

    render(
      <HabitTracker 
        profile={{
          ...mockProfile,
          lastStreakDate: '2026-11-04' // Yesterday log
        }} 
        onUpdateProfile={handleUpdateProfile}
        onAwardPoints={handleAwardPoints}
        addNotification={handleNotification}
      />
    );

    // Click 250ml water preset button
    const addWaterBtn = screen.getByText('250ml');
    fireEvent.click(addWaterBtn);

    // Profile updated with incremented streak
    expect(handleUpdateProfile).toHaveBeenCalledWith(
      expect.objectContaining({
        streak: expect.any(Number)
      })
    );

    // Points awarded for habit + streak bonus
    expect(handleAwardPoints).toHaveBeenCalled();
  });
});
