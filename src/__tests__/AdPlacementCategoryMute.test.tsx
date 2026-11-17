import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { AdPlacement, selectContextualAdForProfile } from '../components/AdPlacement';
import { KNOWN_AD_CATEGORIES } from '../hooks/useMutedAdCategories';

describe('AdPlacement Category Mute Feature (Health Goals Alignment)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('selectContextualAdForProfile excludes ads from muted categories', () => {
    // Normal selection without muted categories
    const resNormal = selectContextualAdForProfile(null, 'test-placement-1', []);
    expect(resNormal.allMuted).toBe(false);
    expect(resNormal.ad).toBeDefined();

    // With supplements and fast_food muted, selection picks organic, nutrition or fitness
    const resMuted = selectContextualAdForProfile(
      { name: 'User', restrictions: [], allergies: [], goals: 'Saúde', equipment: [], interests: ['suplementos'] },
      'test-placement-1',
      ['supplements', 'fast_food']
    );
    expect(resMuted.ad.category).not.toBe('supplements');
    expect(resMuted.ad.category).not.toBe('fast_food');

    // When all known categories are muted
    const allKnownKeys = KNOWN_AD_CATEGORIES.map(c => c.key);
    const resAllMuted = selectContextualAdForProfile(null, 'test-placement-1', allKnownKeys);
    expect(resAllMuted.allMuted).toBe(true);
  });

  it('renders settings overlay with category mute panel and health goals explanation', () => {
    render(
      <AdPlacement
        placementId="mute-test-1"
        format="banner"
        forceFallback={true}
        profile={{
          name: 'Lucas',
          restrictions: [],
          allergies: [],
          goals: 'Emagrecimento',
          equipment: [],
        }}
      />
    );

    // Open settings overlay
    const settingsToggleBtn = screen.getByTestId('ad-settings-toggle-btn');
    fireEvent.click(settingsToggleBtn);

    // Verify category mute panel exists
    expect(screen.getByTestId('ad-category-mute-panel')).toBeDefined();
    expect(screen.getByText(/Silenciar Categorias de Anúncios \(Metas de Saúde\)/i)).toBeDefined();
    expect(screen.getByText(/Emagrecimento/i)).toBeDefined();

    // Verify Fast Food and Supplements buttons exist
    expect(screen.getByTestId('mute-category-fast_food')).toBeDefined();
    expect(screen.getByTestId('mute-category-supplements')).toBeDefined();
    expect(screen.getByTestId('mute-current-category-btn')).toBeDefined();
  });

  it('allows user to mute a specific category (e.g., Fast Food or Supplements) and persists to localStorage', () => {
    render(
      <AdPlacement
        placementId="mute-test-2"
        format="banner"
        forceFallback={true}
        profile={{
          name: 'Beatriz',
          restrictions: [],
          allergies: [],
          goals: 'Perda de Peso',
          equipment: [],
        }}
      />
    );

    // Open settings overlay
    fireEvent.click(screen.getByTestId('ad-settings-toggle-btn'));

    // Mute Fast Food
    const fastFoodBtn = screen.getByTestId('mute-category-fast_food');
    act(() => {
      fireEvent.click(fastFoodBtn);
    });

    const stored = JSON.parse(localStorage.getItem('nutri_ad_muted_categories') || '[]');
    expect(stored).toContain('fast_food');
    expect(fastFoodBtn.textContent).toContain('Silenciado');

    // Mute Supplements as well
    const supplementsBtn = screen.getByTestId('mute-category-supplements');
    act(() => {
      fireEvent.click(supplementsBtn);
    });

    const updatedStored = JSON.parse(localStorage.getItem('nutri_ad_muted_categories') || '[]');
    expect(updatedStored).toContain('fast_food');
    expect(updatedStored).toContain('supplements');
    expect(supplementsBtn.textContent).toContain('Silenciado');
  });

  it('allows user to mute the currently displayed ad category directly', () => {
    render(
      <AdPlacement
        placementId="mute-test-3"
        format="banner"
        forceFallback={true}
        profile={null}
      />
    );

    // Open settings overlay
    fireEvent.click(screen.getByTestId('ad-settings-toggle-btn'));

    const muteCurrentBtn = screen.getByTestId('mute-current-category-btn');
    expect(muteCurrentBtn).toBeDefined();

    act(() => {
      fireEvent.click(muteCurrentBtn);
    });

    const stored = JSON.parse(localStorage.getItem('nutri_ad_muted_categories') || '[]');
    expect(stored.length).toBeGreaterThan(0);
    const mutedCat = stored[0];
    const categoryToggleBtn = screen.getByTestId(`mute-category-${mutedCat}`);
    expect(categoryToggleBtn.textContent).toContain('Silenciado');
  });

  it('renders all-muted placeholder card when user has muted all categories', () => {
    const allKeys = KNOWN_AD_CATEGORIES.map(c => c.key);
    localStorage.setItem('nutri_ad_muted_categories', JSON.stringify(allKeys));

    render(
      <AdPlacement
        placementId="mute-test-all"
        format="banner"
        forceFallback={true}
        profile={{
          name: 'Carlos',
          restrictions: [],
          allergies: [],
          goals: 'Hipertrofia Limpa',
          equipment: [],
        }}
      />
    );

    expect(screen.getByTestId('ad-all-muted-mute-test-all')).toBeDefined();
    expect(screen.getByText(/Anúncios Silenciados por Meta de Saúde/i)).toBeDefined();
    expect(screen.getByTestId('ad-manage-muted-btn')).toBeDefined();
  });
});
