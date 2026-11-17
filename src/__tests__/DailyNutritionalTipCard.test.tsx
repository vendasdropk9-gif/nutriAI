import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../lib/sensory', () => ({
  playSfx: vi.fn(),
  vibrate: vi.fn(),
}));

vi.mock('../lib/speech', () => ({
  speak: vi.fn(),
  stopSpeech: vi.fn(),
}));

vi.mock('../lib/firebase', () => ({
  auth: { currentUser: { uid: 'user-teste-123' } },
  db: {},
}));

vi.mock('firebase/firestore', () => ({
  doc: vi.fn((_db, ...parts) => ({ path: parts.join('/') })),
  getDoc: vi.fn().mockResolvedValue({
    exists: () => true,
    data: () => ({
      name: 'Maria Santos',
      goals: 'Hipertrofia Muscular',
      weight: 65,
      macroTargets: {
        protein: 130,
        carbs: 195,
        fat: 55,
        calories: 1800,
      },
    }),
  }),
  setDoc: vi.fn().mockResolvedValue(undefined),
  serverTimestamp: vi.fn(() => 'MOCK_TIMESTAMP'),
}));

import { DailyNutritionalTipCard } from '../components/DailyNutritionalTipCard';
import { speak } from '../lib/speech';

describe('DailyNutritionalTipCard Component', () => {
  const mockProfile: any = {
    id: 'user-teste-123',
    name: 'Maria Santos',
    goals: 'Hipertrofia Muscular',
    weight: 65,
    restrictions: ['Sem Lactose'],
    macroTargets: {
      protein: 130,
      carbs: 195,
      fat: 55,
      calories: 1800,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders Dica Nutricional do Dia, Firestore badge, and personalized macro target pills', async () => {
    render(<DailyNutritionalTipCard profile={mockProfile} />);

    await waitFor(() => {
      expect(screen.getByText('Dica Nutricional do Dia')).toBeDefined();
    });

    expect(screen.getByText('Firestore')).toBeDefined();
    expect(screen.getByText(/Proteína:/i)).toBeDefined();
    expect(screen.getByText(/Carbos:/i)).toBeDefined();
    expect(screen.getByText(/Gorduras:/i)).toBeDefined();
  });

  it('suggests personalized foods tailored to the user profile and restrictions', async () => {
    render(<DailyNutritionalTipCard profile={mockProfile} />);

    await waitFor(() => {
      expect(screen.getByText(/Alimentos Sugeridos para Alcançar Essa Meta/i)).toBeDefined();
    });

    // Check that at least one recommended food is rendered
    expect(screen.getByText(/Peito de Frango/i)).toBeDefined();
  });

  it('has data-malu-voice-id="Aoede" on speech button and speaks tip with voice Aoede', async () => {
    render(<DailyNutritionalTipCard profile={mockProfile} />);

    await waitFor(() => {
      expect(screen.getByText('Dica Nutricional do Dia')).toBeDefined();
    });

    const speakBtn = screen.getByTitle(/Ouvir Dica Nutricional do Dia com a voz da Malu \(Aoede\)/i);
    expect(speakBtn).toBeDefined();
    expect(speakBtn.getAttribute('data-malu-voice-id')).toBe('Aoede');

    fireEvent.click(speakBtn);
    expect(speak).toHaveBeenCalledWith(
      expect.stringContaining('Dica Nutricional do Dia'),
      expect.objectContaining({ voice: 'Aoede', lang: 'pt-BR' })
    );
  });

  it('invokes onNavigate to recipes generator when clicking the recipe action button', async () => {
    const handleNavigate = vi.fn();
    render(<DailyNutritionalTipCard profile={mockProfile} onNavigate={handleNavigate} />);

    await waitFor(() => {
      expect(screen.getByText('Ver Receitas com esses Macros')).toBeDefined();
    });

    const actionBtn = screen.getByText('Ver Receitas com esses Macros');
    fireEvent.click(actionBtn);
    expect(handleNavigate).toHaveBeenCalledWith('generator');
  });
});
