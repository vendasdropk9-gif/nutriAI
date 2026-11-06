import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SmartMealPlannerModal } from '../components/SmartMealPlannerModal';
import { Recipe, MealPlan, UserProfile } from '../types';

// Mock Language Context
vi.mock('../contexts/LanguageContext', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback || key,
    language: 'pt-BR'
  })
}));

// Mock Sensory Lib
vi.mock('../lib/sensory', () => ({
  playSfx: vi.fn(),
  vibrate: vi.fn()
}));

const mockRecipes: Recipe[] = [
  {
    id: 'rec-1',
    name: 'Omelete Proteico com Espinafre',
    description: 'Café saudável e proteico',
    prepTime: '15 min',
    ingredients: ['Ovos', 'Espinafre'],
    instructions: ['Bater ovos', 'Cozinhar'],
    nutrition: { calories: 320, protein: 28, carbs: 4, fat: 18 }
  },
  {
    id: 'rec-2',
    name: 'Frango Grelhado com Quinoa',
    description: 'Almoço equilibrado e nutritivo',
    prepTime: '25 min',
    ingredients: ['Peito de frango', 'Quinoa'],
    instructions: ['Grelhar frango', 'Servir com quinoa'],
    nutrition: { calories: 520, protein: 45, carbs: 40, fat: 12 }
  }
];

const mockMealPlan: MealPlan = {
  'Segunda-feira': {
    date: 'Segunda-feira',
    meals: {
      breakfast: mockRecipes[0]
    }
  }
};

describe('SmartMealPlannerModal Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when isOpen is false', () => {
    const handleClose = vi.fn();
    const handleUpdatePlan = vi.fn();

    render(
      <SmartMealPlannerModal
        isOpen={false}
        onClose={handleClose}
        savedRecipes={mockRecipes}
        mealPlan={mockMealPlan}
        onUpdatePlan={handleUpdatePlan}
      />
    );

    expect(screen.queryByTestId('smart-meal-planner-modal')).toBeNull();
  });

  it('renders modal header, recipe bank, and 7-day weekly calendar grid when isOpen is true', () => {
    const handleClose = vi.fn();
    const handleUpdatePlan = vi.fn();

    render(
      <SmartMealPlannerModal
        isOpen={true}
        onClose={handleClose}
        savedRecipes={mockRecipes}
        mealPlan={mockMealPlan}
        onUpdatePlan={handleUpdatePlan}
      />
    );

    // Header title
    expect(screen.getByText('Smart Meal Planner')).toBeDefined();
    expect(screen.getByText(/Arraste & Solte/i)).toBeDefined();

    // Recipe bank & planned items
    expect(screen.getAllByText('Omelete Proteico com Espinafre')[0]).toBeDefined();
    expect(screen.getByText('Frango Grelhado com Quinoa')).toBeDefined();

    // 7-day headers
    expect(screen.getByText('Segunda-feira')).toBeDefined();
    expect(screen.getByText('Terça-feira')).toBeDefined();
    expect(screen.getByText('Domingo')).toBeDefined();
  });

  it('triggers onUpdatePlan when assigned via quick add popover', async () => {
    const handleClose = vi.fn();
    const handleUpdatePlan = vi.fn();

    render(
      <SmartMealPlannerModal
        isOpen={true}
        onClose={handleClose}
        savedRecipes={mockRecipes}
        mealPlan={mockMealPlan}
        onUpdatePlan={handleUpdatePlan}
      />
    );

    // Click "+ Agendar" on the second recipe
    const agendarBtns = screen.getAllByText('+ Agendar');
    fireEvent.click(agendarBtns[1]);

    // Select "Terça-feira -> Almoço"
    const lunchBtn = screen.getAllByText(/Almoço/i)[0];
    fireEvent.click(lunchBtn);

    expect(handleUpdatePlan).toHaveBeenCalledWith('Segunda-feira', 'lunch', 'rec-2', mockRecipes[1]);
  });

  it('auto fills plan with AI when clicking Preencher com IA button', async () => {
    const handleClose = vi.fn();
    const handleUpdatePlan = vi.fn();

    render(
      <SmartMealPlannerModal
        isOpen={true}
        onClose={handleClose}
        savedRecipes={mockRecipes}
        mealPlan={mockMealPlan}
        onUpdatePlan={handleUpdatePlan}
      />
    );

    const autoFillBtn = screen.getByText('Preencher com IA');
    fireEvent.click(autoFillBtn);

    await waitFor(() => {
      expect(handleUpdatePlan).toHaveBeenCalled();
    }, { timeout: 1500 });
  });
});
