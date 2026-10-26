import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PrintRecipe } from '../components/PrintRecipe';
import * as recipePrinter from '../lib/recipePrinter';
import { Recipe } from '../types';

const mockRecipe: Recipe = {
  id: 'recipe-test-1',
  name: 'Salmão Grelhado com Aspargos',
  title: 'Salmão Grelhado com Aspargos',
  description: 'Um prato leve, rico em ômega-3 e proteínas de alto valor biológico.',
  prepTime: '25 min',
  difficulty: 'Fácil',
  calories: 420,
  protein: 38,
  carbs: 8,
  fat: 18,
  ingredients: [
    '200g de filé de salmão fresco',
    '1 maço de aspargos verdes',
    '1 colher de sopa de azeite de oliva extra virgem',
    'Sal marinho e pimenta-do-reino a gosto',
    'Fatias de limão siciliano'
  ],
  instructions: [
    'Tempere o filé de salmão com sal, pimenta e raspas de limão.',
    'Aqueça uma frigideira antiaderente com o azeite em fogo médio.',
    'Grelhe os aspargos por 4 minutos até ficarem macios e reserve.',
    'Sele o salmão por cerca de 3 a 4 minutos de cada lado até dourar.',
    'Sirva imediatamente com os aspargos e rodelas de limão.'
  ],
  nutrition: {
    calories: 420,
    protein: 38,
    carbs: 8,
    fat: 18,
    fiber: 3
  },
  image: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288'
};

vi.mock('../lib/recipePrinter', () => ({
  printRecipe: vi.fn(),
  generatePrintableRecipeContentHtml: vi.fn(() => '<div>Print Content HTML</div>'),
  getRecipePrintCss: vi.fn(() => '@media print { body { color: black; } }'),
}));

vi.mock('../lib/sensory', () => ({
  playSfx: vi.fn(),
  vibrate: vi.fn(),
}));

describe('PrintRecipe Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders default button variant with printer icon and label', () => {
    render(<PrintRecipe recipe={mockRecipe} />);
    
    const button = screen.getByRole('button');
    expect(button).toBeDefined();
    expect(button.textContent).toContain('Imprimir Receita');
  });

  it('renders custom label when provided', () => {
    render(<PrintRecipe recipe={mockRecipe} label="Imprimir Ficha Técnica" />);
    
    expect(screen.getByText('Imprimir Ficha Técnica')).toBeDefined();
  });

  it('renders icon variant with proper accessible title and compact styling', () => {
    render(<PrintRecipe recipe={mockRecipe} variant="icon" title="Imprimir Salmão" />);
    
    const button = screen.getByTitle('Imprimir Salmão');
    expect(button).toBeDefined();
    expect(button.querySelector('svg')).toBeDefined();
  });

  it('renders badge variant', () => {
    render(<PrintRecipe recipe={mockRecipe} variant="badge" label="A4 Print" />);
    
    expect(screen.getByText('A4 Print')).toBeDefined();
  });

  it('opens PrintPreviewModal when clicked in default preview mode', () => {
    render(<PrintRecipe recipe={mockRecipe} showPreviewModal={true} />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);

    // Modal title should appear
    expect(screen.getByText('Imprimir Receita Limpa')).toBeDefined();
    expect(screen.getByText('Formato otimizado para papel A4, economia de tinta e modo culinária')).toBeDefined();
  });

  it('invokes direct printRecipe utility when showPreviewModal is false', () => {
    const printSpy = vi.spyOn(recipePrinter, 'printRecipe');
    const onPrintMock = vi.fn();

    render(
      <PrintRecipe
        recipe={mockRecipe}
        showPreviewModal={false}
        servingsMultiplier={2}
        onPrint={onPrintMock}
      />
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(printSpy).toHaveBeenCalled();
    const callArgs = printSpy.mock.calls[0];
    expect(callArgs[0]).toEqual(mockRecipe);
    expect(callArgs[1]?.servingsMultiplier).toBe(2);
    expect(onPrintMock).toHaveBeenCalled();
  });
});
