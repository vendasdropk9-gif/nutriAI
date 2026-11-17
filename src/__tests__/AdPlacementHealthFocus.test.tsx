import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AdPlacement, selectContextualAdForProfile } from '../components/AdPlacement';
import {
  HEALTH_FOCUS_STORAGE_KEY,
  MUTED_TRACKING_LOG_KEY,
  NUTRI_PROFILE_STORAGE_KEY,
  recordHiddenAdCategoryEvent,
  formatHealthFocusPromptContext,
  loadLocalHealthFocusProfile,
  loadMutedTrackingLog,
} from '../lib/healthFocusEngine';
import { UserProfile } from '../types';

const baseProfile: UserProfile = {
  name: 'Marina Costa',
  goals: 'Emagrecimento sustentável',
  restrictions: [],
  allergies: [],
  equipment: [],
  interests: ['fast food', 'alimentacao saudavel', 'suplementacao'],
};

describe('AdPlacement Hidden Health Focus Tracking & Async Profile Refinement', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('captures mute event via hidden callback, records locally, and silently updates Health Focus asynchronously', async () => {
    localStorage.setItem(NUTRI_PROFILE_STORAGE_KEY, JSON.stringify(baseProfile));
    const onHiddenTrack = vi.fn();
    const onHealthFocusChange = vi.fn();

    render(
      <AdPlacement
        placementId="hf-mute-test"
        format="banner"
        forceFallback={true}
        profile={baseProfile}
        onHiddenCategoryTrack={onHiddenTrack}
        onHealthFocusChange={onHealthFocusChange}
      />
    );

    fireEvent.click(screen.getByTestId('ad-settings-toggle-btn'));
    fireEvent.click(screen.getByTestId('mute-category-fast_food'));

    await waitFor(() => {
      expect(onHiddenTrack).toHaveBeenCalledTimes(1);
    });

    const [recordedEvent, updatedFocus] = onHiddenTrack.mock.calls[0];
    expect(recordedEvent.category).toBe('fast_food');
    expect(recordedEvent.action).toBe('mute');
    expect(recordedEvent.placementId).toBe('hf-mute-test');

    expect(onHealthFocusChange).toHaveBeenCalledWith(updatedFocus);
    expect(updatedFocus.deprioritizedCategories).toContain('fast_food');
    expect(updatedFocus.categoryWeights['fast_food']).toBe(0);
    expect(updatedFocus.deprioritizedKeywords).toContain('ultraprocessados');
    expect(updatedFocus.focusLabel).toContain('sem ultraprocessados/fast food');

    // Verify local persistence across tracking log, healthFocus storage, and nutri-profile
    const log = loadMutedTrackingLog();
    expect(log.some((e) => e.category === 'fast_food' && e.action === 'mute')).toBe(true);

    const savedFocus = loadLocalHealthFocusProfile();
    expect(savedFocus.deprioritizedCategories).toContain('fast_food');

    const updatedStoredProfile = JSON.parse(localStorage.getItem(NUTRI_PROFILE_STORAGE_KEY) || '{}');
    expect(updatedStoredProfile.healthFocus.deprioritizedCategories).toContain('fast_food');
  });

  it('captures hide/dismiss event ("Dispensar") and gradually deprioritizes repeated hidden categories', async () => {
    const onHiddenTrack = vi.fn();

    const { rerender } = render(
      <AdPlacement
        placementId="hf-hide-test-1"
        format="banner"
        forceFallback={true}
        profile={{
          ...baseProfile,
          interests: ['fast food'],
        }}
        onHiddenCategoryTrack={onHiddenTrack}
      />
    );

    const dismissBtn = screen.getByRole('button', { name: /Dispensar anúncio/i });
    fireEvent.click(dismissBtn);

    await waitFor(() => {
      expect(onHiddenTrack).toHaveBeenCalledTimes(1);
    });

    expect(onHiddenTrack.mock.calls[0][0].action).toBe('hide');
    const firstCategory = onHiddenTrack.mock.calls[0][0].category;
    expect(onHiddenTrack.mock.calls[0][1].categoryWeights[firstCategory]).toBeLessThan(1);

    // Simulate a second hide on the same category -> automatically adds to deprioritizedCategories
    const secondFocus = await recordHiddenAdCategoryEvent({
      category: firstCategory,
      action: 'hide',
      placementId: 'hf-hide-test-2',
      profile: baseProfile,
    });

    expect(secondFocus.deprioritizedCategories).toContain(firstCategory);

    // Re-verify stored log count
    const rawLog = JSON.parse(localStorage.getItem(MUTED_TRACKING_LOG_KEY) || '[]');
    expect(rawLog.length).toBeGreaterThanOrEqual(2);

    rerender(<div />);
  });

  it('deprioritizes similar ad types in selectContextualAdForProfile when Health Focus flags a category', async () => {
    const refinedFocus = await recordHiddenAdCategoryEvent({
      category: 'fast_food',
      action: 'mute',
      placementId: 'hf-ranking-test',
      profile: baseProfile,
    });

    const userWithFocus: UserProfile = {
      ...baseProfile,
      interests: ['fast food', 'organicos'],
      healthFocus: refinedFocus,
    };

    const result = selectContextualAdForProfile(userWithFocus, 'hf-ranking-slot', [], refinedFocus);
    expect(result.ad.category).not.toBe('fast_food');
    expect(result.ad.category).toBe('organic');

    // Also ensure unmuting restores neutral priority
    const restoredFocus = await recordHiddenAdCategoryEvent({
      category: 'fast_food',
      action: 'unmute',
      placementId: 'hf-ranking-test',
      profile: baseProfile,
    });
    expect(restoredFocus.deprioritizedCategories).not.toContain('fast_food');
    expect(restoredFocus.categoryWeights['fast_food']).toBe(1);
  });

  it('builds AI recommendation directive from Health Focus so AI avoids deprioritized categories', async () => {
    const focus = await recordHiddenAdCategoryEvent({
      category: 'supplements',
      action: 'mute',
      placementId: 'hf-ai-test',
      profile: baseProfile,
    });

    const profileWithFocus: UserProfile = {
      ...baseProfile,
      mutedAdCategories: ['supplements'],
      healthFocus: focus,
    };

    const promptSnippet = formatHealthFocusPromptContext(profileWithFocus);
    expect(promptSnippet).toContain('Health Focus');
    expect(promptSnippet).toContain('supplements');
    expect(promptSnippet).toContain('Despriorizar');

    const storedFocusRaw = localStorage.getItem(HEALTH_FOCUS_STORAGE_KEY);
    expect(storedFocusRaw).toBeTruthy();
  });
});
