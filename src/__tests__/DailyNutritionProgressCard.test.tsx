import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DailyNutritionProgressCard } from '../components/DailyNutritionProgressCard';
import { UserProfile, IntakeLog } from '../types';

vi.mock('../lib/sensory', () => ({
  playSfx: vi.fn(),
  vibrate: vi.fn(),
}));

describe('DailyNutritionProgressCard Component', () => {
  const today = new Date().toISOString().split('T')[0];

  const mockIntakeLogs: IntakeLog[] = [
    {
      id: 'log-1',
      date: `${today}T08:30:00.000Z`,
      mealId: 'breakfast',
      recipeName: 'Ovos Mexidos com Torrada',
      planned: { calories: 350, protein: 25, carbs: 30, fat: 12 },
      actual: { calories: 350, protein: 25, carbs: 30, fat: 12 },
      adjusted: false,
    },
    {
      id: 'log-2',
      date: `${today}T12:45:00.000Z`,
      mealId: 'lunch',
      recipeName: 'Frango Grelhado com Quinoa e Legumes',
      planned: { calories: 550, protein: 50, carbs: 45, fat: 14 },
      actual: { calories: 550, protein: 50, carbs: 45, fat: 14 },
      adjusted: false,
    },
  ];

  const mockProfile: UserProfile = {
    name: 'Juliana Fit',
    weight: 65,
    height: 168,
    goals: 'Hipertrofia e definição',
    restrictions: [],
    allergies: [],
    equipment: [],
    intakeLogs: mockIntakeLogs,
    masterPlan: {
      dailyCalories: 1900,
      macros: {
        protein: 130,
        carbs: 210,
        fat: 55,
      },
      workoutFocus: 'Pernas e Core',
      nutritionFocus: 'Hipertrofia limpa',
      adaptiveNotes: 'Boa recuperação',
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders macronutrient goals retrieved from user profile masterPlan', () => {
    render(<DailyNutritionProgressCard profile={mockProfile} />);

    // Total today's intake: protein 25+50=75g, carbs 30+45=75g, fat 12+14=26g
    expect(screen.getByText('Metas Diárias de Macronutrientes')).toBeDefined();
    
    // Check protein info (75g / 130g)
    expect(screen.getByText(/Meta do plano: 130g/)).toBeDefined();
    // Check carbs info (75g / 210g)
    expect(screen.getByText(/Meta do plano: 210g/)).toBeDefined();
    // Check fat info (26g / 55g)
    expect(screen.getByText(/Meta do plano: 55g/)).toBeDefined();
  });

  it('calculates and displays today consumed amounts correctly', () => {
    render(<DailyNutritionProgressCard profile={mockProfile} />);

    // Total calories consumed = 350 + 550 = 900
    expect(screen.getByText('900')).toBeDefined();
    expect(screen.getByText(/\/ 1900 kcal/)).toBeDefined();

    // Check remaining amounts:
    // Protein remaining: 130 - 75 = 55g
    expect(screen.getByText('Restam 55g')).toBeDefined();
    // Carbs remaining: 210 - 75 = 135g
    expect(screen.getByText('Restam 135g')).toBeDefined();
    // Fat remaining: 55 - 26 = 29g
    expect(screen.getByText('Restam 29g')).toBeDefined();
  });

  it('switches between concentric rings view and individual nutrient cards view', () => {
    render(<DailyNutritionProgressCard profile={mockProfile} />);

    // Click 'Por Nutriente'
    const detailedButton = screen.getByText('Por Nutriente');
    fireEvent.click(detailedButton);

    // In 'Por Nutriente' view mode, short labels (PROT, CARB, GORD) appear inside mini circles
    expect(screen.getByText('PROT')).toBeDefined();
    expect(screen.getByText('CARB')).toBeDefined();
    expect(screen.getByText('GORD')).toBeDefined();

    // Switch back to 'Anel Triplo'
    const concentricButton = screen.getByText('Anel Triplo');
    fireEvent.click(concentricButton);
    expect(screen.getByText('900')).toBeDefined();
  });

  it('handles null profile gracefully with smart adaptive fallback values', () => {
    render(<DailyNutritionProgressCard profile={null} />);

    expect(screen.getByText('Metas Diárias de Macronutrientes')).toBeDefined();
    expect(screen.getByTestId('daily-calories-consumed').textContent?.trim()).toBe('0');
  });

  it('calls onNavigate callback when navigation buttons are clicked', () => {
    const onNavigateMock = vi.fn();
    render(<DailyNutritionProgressCard profile={mockProfile} onNavigate={onNavigateMock} />);

    const scanButton = screen.getByText('Escanear Refeição');
    fireEvent.click(scanButton);
    expect(onNavigateMock).toHaveBeenCalledWith('analyzer');

    const adjustButton = screen.getByText('Ajustar Metas');
    fireEvent.click(adjustButton);
    expect(onNavigateMock).toHaveBeenCalledWith('coach');
  });
});
