import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { HealthFocusSettingsSection } from '../components/HealthFocusSettingsSection';
import {
  recordHiddenAdCategoryEvent,
  getAdHealthFocusPriorityFactor,
  formatHealthFocusPromptContext,
} from '../lib/healthFocusEngine';
import { UserProfile } from '../types';

const sampleProfile: UserProfile = {
  name: 'Rafael Mendes',
  goals: 'Ganho de massa limpa',
  restrictions: [],
  allergies: [],
  equipment: ['Halteres'],
  mutedAdCategories: ['fast_food', 'supplements'],
};

describe('Profile Health Focus & Muted Ad Categories Settings Section', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('displays muted ad categories and allows unmuting an individual category or all categories', async () => {
    const onSaveProfile = vi.fn();
    const onShowToast = vi.fn();

    render(
      <HealthFocusSettingsSection
        profile={sampleProfile}
        onSaveProfile={onSaveProfile}
        onShowToast={onShowToast}
      />
    );

    expect(screen.getByTestId('profile-health-focus-section')).toBeDefined();
    expect(screen.getByTestId('profile-health-focus-active-badge').textContent).toContain('2 categorias silenciadas');

    const fastFoodToggle = screen.getByTestId('profile-toggle-category-fast_food');
    expect(fastFoodToggle.textContent).toContain('Silenciado');

    fireEvent.click(fastFoodToggle);

    await waitFor(() => {
      expect(onSaveProfile).toHaveBeenCalled();
    });

    const savedAfterToggle = onSaveProfile.mock.calls[onSaveProfile.mock.calls.length - 1][0] as UserProfile;
    expect(savedAfterToggle.mutedAdCategories).not.toContain('fast_food');
    expect(savedAfterToggle.mutedAdCategories).toContain('supplements');

    // Unmute all remaining categories
    fireEvent.click(screen.getByTestId('profile-unmute-all-btn'));
    const savedAfterUnmuteAll = onSaveProfile.mock.calls[onSaveProfile.mock.calls.length - 1][0] as UserProfile;
    expect(savedAfterUnmuteAll.mutedAdCategories).toEqual([]);
  });

  it('allows user to manually tone down AI strictness, customize focus label, and remove restrictive keywords', async () => {
    const refinedFocus = await recordHiddenAdCategoryEvent({
      category: 'supplements',
      action: 'mute',
      placementId: 'profile-override-test',
      profile: sampleProfile,
    });

    const profileWithRestrictiveAI: UserProfile = {
      ...sampleProfile,
      mutedAdCategories: ['supplements'],
      healthFocus: refinedFocus,
    };

    const onSaveProfile = vi.fn();

    render(
      <HealthFocusSettingsSection
        profile={profileWithRestrictiveAI}
        onSaveProfile={onSaveProfile}
      />
    );

    // Switch AI strictness to Flexible
    fireEvent.click(screen.getByTestId('health-focus-strictness-flexible'));
    let latestSaved = onSaveProfile.mock.calls[onSaveProfile.mock.calls.length - 1][0] as UserProfile;
    expect(latestSaved.healthFocus?.strictnessMode).toBe('flexible');

    // Customize Focus Label manually
    const focusInput = screen.getByTestId('profile-health-focus-label-input') as HTMLInputElement;
    fireEvent.change(focusInput, { target: { value: 'Hipertrofia flexível sem restrições rígidas' } });
    fireEvent.click(screen.getByTestId('profile-save-health-focus-btn'));

    latestSaved = onSaveProfile.mock.calls[onSaveProfile.mock.calls.length - 1][0] as UserProfile;
    expect(latestSaved.healthFocus?.focusLabel).toBe('Hipertrofia flexível sem restrições rígidas');

    // Verify flexible mode softens keyword penalties compared to balanced/strict
    const flexibleFactor = getAdHealthFocusPriorityFactor(
      { category: 'organic', title: 'Blend natural com proteina', interests: ['whey'] },
      latestSaved.healthFocus
    );
    expect(flexibleFactor).toBeGreaterThanOrEqual(0.65);
    expect(formatHealthFocusPromptContext(latestSaved)).toContain('Modo Flexível');

    // Remove a specific restrictive keyword manually
    const removeWheyBtn = screen.getByTestId('profile-remove-kw-whey');
    fireEvent.click(removeWheyBtn);
    latestSaved = onSaveProfile.mock.calls[onSaveProfile.mock.calls.length - 1][0] as UserProfile;
    expect(latestSaved.healthFocus?.deprioritizedKeywords).not.toContain('whey');
  });

  it('allows relaxing automatic hide penalties via "Suavizar IA" button', async () => {
    await recordHiddenAdCategoryEvent({
      category: 'fitness',
      action: 'hide',
      placementId: 'test-hide-1',
      profile: sampleProfile,
    });
    const focusWithHide = await recordHiddenAdCategoryEvent({
      category: 'fitness',
      action: 'hide',
      placementId: 'test-hide-2',
      profile: sampleProfile,
    });

    const profileWithHidePenalty: UserProfile = {
      ...sampleProfile,
      mutedAdCategories: ['fast_food'],
      healthFocus: focusWithHide,
    };

    const onSaveProfile = vi.fn();

    render(
      <HealthFocusSettingsSection
        profile={profileWithHidePenalty}
        onSaveProfile={onSaveProfile}
      />
    );

    fireEvent.click(screen.getByTestId('profile-relax-ai-btn'));

    const latestSaved = onSaveProfile.mock.calls[onSaveProfile.mock.calls.length - 1][0] as UserProfile;
    expect(latestSaved.healthFocus?.strictnessMode).toBe('flexible');
    expect(latestSaved.healthFocus?.deprioritizedCategories).not.toContain('fitness');
    // Keeps explicit mute on fast_food unless explicitly unmuted
    expect(latestSaved.mutedAdCategories).toContain('fast_food');
  });
});
