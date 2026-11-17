import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const mockSetDoc = vi.fn().mockResolvedValue(undefined);
const mockAddDoc = vi.fn().mockResolvedValue({ id: 'mock-log-id' });
const mockGetDoc = vi.fn().mockResolvedValue({ exists: () => false, data: () => null });
const mockDoc = vi.fn((_db, col, id) => ({ path: `${col}/${id}` }));
const mockCollection = vi.fn((_db, col) => ({ path: col }));
const mockIncrement = vi.fn((n: number) => ({ __op: 'increment', value: n }));
const mockServerTimestamp = vi.fn(() => ({ __op: 'serverTimestamp' }));

vi.mock('../lib/firebase', () => ({
  db: { __isMockDb: true },
  auth: {
    currentUser: { uid: 'test-user-123' },
  },
  doc: (...args: any[]) => (mockDoc as any)(...args),
  collection: (...args: any[]) => (mockCollection as any)(...args),
  getDoc: (...args: any[]) => (mockGetDoc as any)(...args),
  setDoc: (...args: any[]) => (mockSetDoc as any)(...args),
  addDoc: (...args: any[]) => (mockAddDoc as any)(...args),
  increment: (n: number) => mockIncrement(n),
  serverTimestamp: () => mockServerTimestamp(),
}));

import { AdPlacement } from '../components/AdPlacement';
import { evaluateABPerformance } from '../hooks/useAdABTest';

describe('AdPlacement Telemetry, Conversion Context & 50% Viewability', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    mockGetDoc.mockResolvedValue({ exists: () => false, data: () => null });
    delete (window as any).IntersectionObserver;
  });

  it('logs impression to Firestore ONLY when IntersectionObserver reports >= 50% visibility', async () => {
    const observers: Array<{
      callback: IntersectionObserverCallback;
      options?: IntersectionObserverInit;
      disconnect: ReturnType<typeof vi.fn>;
    }> = [];

    class MockIntersectionObserver {
      disconnect = vi.fn();
      observe = vi.fn();
      unobserve = vi.fn();
      constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
        observers.push({ callback, options, disconnect: this.disconnect });
      }
    }
    window.IntersectionObserver = MockIntersectionObserver as any;

    render(
      <AdPlacement
        placementId="nutri-tab-market"
        conversionContext="market"
        format="banner"
        forceFallback={true}
        forceVariant="A"
        profile={null}
      />
    );

    // 1. Pre-viewport observer created first; no telemetry recorded yet
    expect(observers.length).toBe(1);
    expect(mockSetDoc).not.toHaveBeenCalled();
    expect(mockAddDoc).not.toHaveBeenCalled();

    // 2. Enter pre-viewport margin -> creative mounts -> 50% impression observer created
    act(() => {
      observers[0].callback(
        [{ isIntersecting: true, intersectionRatio: 0.05 } as IntersectionObserverEntry],
        {} as IntersectionObserver
      );
    });

    expect(screen.getByTestId('ad-placement-nutri-tab-market')).toBeDefined();
    expect(observers.length).toBe(2);
    expect(observers[1].options?.threshold).toEqual([0.5, 0.6, 0.75, 0.9, 1.0]);

    // 3. Partial visibility (< 50%, e.g. 0.3) must NOT log an impression
    act(() => {
      observers[1].callback(
        [{ isIntersecting: true, intersectionRatio: 0.3 } as IntersectionObserverEntry],
        {} as IntersectionObserver
      );
    });

    expect(mockSetDoc).not.toHaveBeenCalled();
    expect(mockAddDoc).not.toHaveBeenCalled();

    // 4. >= 50% visibility (e.g. 0.73 = 73%) MUST record exact visibilidade_percentual: 73
    await act(async () => {
      observers[1].callback(
        [{ isIntersecting: true, intersectionRatio: 0.73 } as IntersectionObserverEntry],
        {} as IntersectionObserver
      );
    });

    expect(observers[1].disconnect).toHaveBeenCalled();
    // Expect writes to adTelemetry/global and adABTests/nutri_ad_ab_v1
    expect(mockSetDoc).toHaveBeenCalledTimes(2);
    expect(mockSetDoc.mock.calls[0][1]).toMatchObject({
      bannerLoads: { __op: 'increment', value: 1 },
      totalImpressions: { __op: 'increment', value: 1 },
      conversionContext: 'market',
      lastAdType: 'Banner',
      visibilidade_percentual: 73,
      abVariant: 'A',
      byContext: {
        market: {
          bannerLoads: { __op: 'increment', value: 1 },
          impressions: { __op: 'increment', value: 1 },
        },
      },
    });

    expect(mockAddDoc).toHaveBeenCalledTimes(1);
    expect(mockAddDoc.mock.calls[0][1]).toMatchObject({
      eventType: 'impression',
      adType: 'Banner',
      format: 'banner',
      placementId: 'nutri-tab-market',
      conversionContext: 'market',
      visibilidade_percentual: 73,
      abVariant: 'A',
      userId: 'test-user-123',
      timestamp: { __op: 'serverTimestamp' },
    });
    expect(mockAddDoc.mock.calls[0][1]).not.toHaveProperty('visibilityThreshold');
  });

  it('records conversionContext ("generator") for Vídeo impressions', async () => {
    render(
      <AdPlacement
        placementId="nutri-tab-generator"
        conversionContext="generator"
        format="video"
        forceFallback={true}
        forceVariant="B"
        profile={null}
      />
    );

    const aside = screen.getByTestId('ad-placement-nutri-tab-generator');
    expect(aside.getAttribute('data-conversion-context')).toBe('generator');

    await waitFor(() => {
      expect(mockSetDoc).toHaveBeenCalledTimes(2);
    });

    expect(mockSetDoc.mock.calls[0][1]).toMatchObject({
      videoLoads: { __op: 'increment', value: 1 },
      totalImpressions: { __op: 'increment', value: 1 },
      conversionContext: 'generator',
      lastAdType: 'Vídeo',
      abVariant: 'B',
      byContext: {
        generator: {
          videoLoads: { __op: 'increment', value: 1 },
          impressions: { __op: 'increment', value: 1 },
        },
      },
    });

    expect(mockAddDoc).toHaveBeenCalledTimes(1);
    expect(mockAddDoc.mock.calls[0][1]).toMatchObject({
      eventType: 'impression',
      adType: 'Vídeo',
      format: 'video',
      conversionContext: 'generator',
      visibilidade_percentual: 100,
      abVariant: 'B',
    });
  });

  it('logs real user click interaction with adType (Vídeo vs Banner), conversionContext and timestamp, without triggering on UI controls', async () => {
    render(
      <AdPlacement
        placementId="nutri-tab-market"
        conversionContext="market"
        format="banner"
        forceFallback={true}
        forceVariant="A"
        profile={null}
      />
    );

    await waitFor(() => {
      expect(mockSetDoc).toHaveBeenCalled();
    });

    // Clear initial impression calls
    mockSetDoc.mockClear();
    mockAddDoc.mockClear();

    // 1. Clicking settings/mode controls must NOT trigger an ad click telemetry log
    fireEvent.click(screen.getByTestId('ad-settings-toggle-btn'));
    expect(mockSetDoc).not.toHaveBeenCalled();
    expect(mockAddDoc).not.toHaveBeenCalled();

    // 2. Clicking the CTA link in Banner mode logs exactly 1 Banner click
    const ctaLink = screen.getByRole('link');
    await act(async () => {
      fireEvent.click(ctaLink);
    });

    expect(mockSetDoc).toHaveBeenCalledTimes(2);
    expect(mockSetDoc.mock.calls[0][1]).toMatchObject({
      bannerClicks: { __op: 'increment', value: 1 },
      totalClicks: { __op: 'increment', value: 1 },
      conversionContext: 'market',
      lastClickedAdType: 'Banner',
      lastClickTimestamp: { __op: 'serverTimestamp' },
      byContext: {
        market: {
          bannerClicks: { __op: 'increment', value: 1 },
          clicks: { __op: 'increment', value: 1 },
        },
      },
    });

    expect(mockAddDoc).toHaveBeenCalledTimes(1);
    expect(mockAddDoc.mock.calls[0][1]).toMatchObject({
      eventType: 'click',
      adType: 'Banner',
      format: 'banner',
      conversionContext: 'market',
      placementId: 'nutri-tab-market',
      userId: 'test-user-123',
      timestamp: { __op: 'serverTimestamp' },
    });

    // 3. Switch to Vídeo mode (control click must not log ad click), then click ad body -> logs Vídeo click
    mockSetDoc.mockClear();
    mockAddDoc.mockClear();

    await act(async () => {
      fireEvent.click(screen.getByTestId('ad-mode-video-btn'));
    });

    // Switching mode changes format and logs new impression, NOT a click
    expect(mockAddDoc).toHaveBeenCalledTimes(1);
    expect(mockAddDoc.mock.calls[0][1]).toMatchObject({
      eventType: 'impression',
      adType: 'Vídeo',
    });

    mockSetDoc.mockClear();
    mockAddDoc.mockClear();

    await act(async () => {
      fireEvent.click(screen.getByTestId('ad-placement-nutri-tab-market'));
    });

    expect(mockSetDoc).toHaveBeenCalledTimes(2);
    expect(mockSetDoc.mock.calls[0][1]).toMatchObject({
      videoClicks: { __op: 'increment', value: 1 },
      totalClicks: { __op: 'increment', value: 1 },
      lastClickedAdType: 'Vídeo',
      lastClickTimestamp: { __op: 'serverTimestamp' },
    });

    expect(mockAddDoc).toHaveBeenCalledTimes(1);
    expect(mockAddDoc.mock.calls[0][1]).toMatchObject({
      eventType: 'click',
      adType: 'Vídeo',
      format: 'video',
      conversionContext: 'market',
      timestamp: { __op: 'serverTimestamp' },
    });
  });
});

describe('AdPlacement A/B Testing System (Formats, Styles & Firestore Performance)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    mockGetDoc.mockResolvedValue({ exists: () => false, data: () => null });
    delete (window as any).IntersectionObserver;
  });

  it('assigns sticky A/B variant and applies distinct format & style configurations (Variant A: Banner Clássico vs Variant B: Vídeo Claymorphic)', () => {
    const { unmount } = render(
      <AdPlacement
        placementId="ab-format-style-test"
        experimentId="exp_format_style_1"
        abTestMode="both"
        forceVariant="A"
        forceFallback={true}
        profile={null}
      />
    );

    const asideA = screen.getByTestId('ad-placement-ab-format-style-test');
    expect(asideA.getAttribute('data-ab-experiment')).toBe('exp_format_style_1');
    expect(asideA.getAttribute('data-ab-variant')).toBe('A');
    expect(asideA.getAttribute('data-ab-style')).toBe('standard');
    expect(asideA.getAttribute('data-claymorphic')).toBe('false');
    expect(document.querySelector('img')).not.toBeNull();
    expect(document.querySelector('video')).toBeNull();

    unmount();

    render(
      <AdPlacement
        placementId="ab-format-style-test"
        experimentId="exp_format_style_1"
        abTestMode="both"
        forceVariant="B"
        forceFallback={true}
        profile={null}
      />
    );

    const asideB = screen.getByTestId('ad-placement-ab-format-style-test');
    expect(asideB.getAttribute('data-ab-variant')).toBe('B');
    expect(asideB.getAttribute('data-ab-style')).toBe('claymorphic');
    expect(asideB.getAttribute('data-claymorphic')).toBe('true');
    expect(document.querySelector('video')).not.toBeNull();
    expect(document.querySelector('img')).toBeNull();
  });

  it('persists A/B clicks and visibility ratio in Firestore and computes bestPerformingVariant', async () => {
    const observers: Array<{ callback: IntersectionObserverCallback }> = [];
    class MockIntersectionObserver {
      disconnect = vi.fn();
      observe = vi.fn();
      unobserve = vi.fn();
      constructor(callback: IntersectionObserverCallback) {
        observers.push({ callback });
      }
    }
    window.IntersectionObserver = MockIntersectionObserver as any;

    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        experimentId: 'nutri_feed_ab_v1',
        variants: {
          A: {
            id: 'A',
            label: 'Variante A • Banner Clássico',
            format: 'banner',
            style: 'standard',
            impressions: 10,
            clicks: 1,
            visibilityRatioSum: 6.0, // 60% avg visibility, 10% CTR
          },
          B: {
            id: 'B',
            label: 'Variante B • Vídeo Claymorphic',
            format: 'video',
            style: 'claymorphic',
            impressions: 10,
            clicks: 3,
            visibilityRatioSum: 9.0, // 90% avg visibility, 30% CTR
          },
        },
      }),
    });

    render(
      <AdPlacement
        placementId="nutri-tab-market"
        conversionContext="market"
        experimentId="nutri_feed_ab_v1"
        abTestMode="both"
        forceVariant="B"
        forceFallback={true}
        profile={null}
      />
    );

    // Mount from skeleton -> observe 50%+ visibility with 0.85 ratio
    act(() => {
      observers[0].callback(
        [{ isIntersecting: true, intersectionRatio: 0.1 } as IntersectionObserverEntry],
        {} as IntersectionObserver
      );
    });

    await act(async () => {
      observers[1].callback(
        [{ isIntersecting: true, intersectionRatio: 0.85 } as IntersectionObserverEntry],
        {} as IntersectionObserver
      );
    });

    await waitFor(() => {
      const abDocCalls = mockSetDoc.mock.calls.filter(
        (call) => call[0]?.path === 'adABTests/nutri_feed_ab_v1'
      );
      expect(abDocCalls.length).toBeGreaterThanOrEqual(2);
    });

    const abImpressionCall = mockSetDoc.mock.calls.find(
      (call) => call[0]?.path === 'adABTests/nutri_feed_ab_v1' && call[1]?.variants?.B?.impressions
    );
    expect(abImpressionCall).toBeDefined();
    expect(abImpressionCall![1]).toMatchObject({
      experimentId: 'nutri_feed_ab_v1',
      conversionContext: 'market',
      variants: {
        B: {
          id: 'B',
          format: 'video',
          style: 'claymorphic',
          impressions: { __op: 'increment', value: 1 },
          visibilityRatioSum: { __op: 'increment', value: 0.85 },
        },
      },
    });
    expect(mockAddDoc.mock.calls[0][1]).toMatchObject({
      eventType: 'impression',
      visibilidade_percentual: 85,
      visibilityRatio: 0.85,
    });

    const abWinnerCall = mockSetDoc.mock.calls.find(
      (call) => call[0]?.path === 'adABTests/nutri_feed_ab_v1' && call[1]?.bestPerformingVariant
    );
    expect(abWinnerCall).toBeDefined();
    expect(abWinnerCall![1]).toMatchObject({
      bestPerformingVariant: 'B',
      winnerByClicks: 'B',
      winnerByVisibility: 'B',
      metricsSummary: {
        A: { ctr: 10, avgVisibility: 0.6, impressions: 10, clicks: 1 },
        B: { ctr: 30, avgVisibility: 0.9, impressions: 10, clicks: 3 },
      },
    });

    // Trigger real click on Variant B CTA -> verifies click increment on adABTests
    mockSetDoc.mockClear();
    await act(async () => {
      fireEvent.click(screen.getByRole('link'));
    });

    await waitFor(() => {
      const abClickCall = mockSetDoc.mock.calls.find(
        (call) => call[0]?.path === 'adABTests/nutri_feed_ab_v1' && call[1]?.variants?.B?.clicks
      );
      expect(abClickCall).toBeDefined();
      expect(abClickCall![1].variants.B.clicks).toEqual({ __op: 'increment', value: 1 });
    });

    // Open settings panel -> displays live A/B comparison and winner badge
    await act(async () => {
      fireEvent.click(screen.getByTestId('ad-settings-toggle-btn'));
    });

    expect(screen.getByTestId('ad-ab-test-panel')).toBeDefined();
    await waitFor(() => {
      expect(screen.getByTestId('ad-ab-metrics-summary')).toBeDefined();
      expect(screen.getByText(/Melhor Desempenho/i)).toBeDefined();
    });
  });

  it('evaluates A/B winner accurately for clicks, visibility, and ties', () => {
    const aWins = evaluateABPerformance({
      A: { impressions: 20, clicks: 5, visibilityRatioSum: 18 },
      B: { impressions: 20, clicks: 2, visibilityRatioSum: 12 },
    });
    expect(aWins.winnerByClicks).toBe('A');
    expect(aWins.winnerByVisibility).toBe('A');
    expect(aWins.bestPerformingVariant).toBe('A');

    const tied = evaluateABPerformance({
      A: { impressions: 10, clicks: 2, visibilityRatioSum: 8 },
      B: { impressions: 10, clicks: 2, visibilityRatioSum: 8 },
    });
    expect(tied.winnerByClicks).toBe('tie');
    expect(tied.winnerByVisibility).toBe('tie');
    expect(tied.bestPerformingVariant).toBe('tie');
  });
});

describe('AdPlacement Dwell Time Telemetry', () => {
  const originalVisibilityDescriptor = Object.getOwnPropertyDescriptor(document, 'visibilityState');

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    mockGetDoc.mockResolvedValue({ exists: () => false, data: () => null });
    delete (window as any).IntersectionObserver;
  });

  afterEach(() => {
    vi.useRealTimers();
    if (originalVisibilityDescriptor) {
      Object.defineProperty(document, 'visibilityState', originalVisibilityDescriptor);
    } else {
      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        get: () => 'visible',
      });
    }
  });

  it('accumulates dwell time and flushes every 5000ms with visibilidade_percentual and A/B variant metrics', async () => {
    vi.useFakeTimers();

    const observers: Array<{
      callback: IntersectionObserverCallback;
      options?: IntersectionObserverInit;
      disconnect: ReturnType<typeof vi.fn>;
    }> = [];

    class MockIntersectionObserver {
      disconnect = vi.fn();
      observe = vi.fn();
      unobserve = vi.fn();
      constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
        observers.push({ callback, options, disconnect: this.disconnect });
      }
    }
    window.IntersectionObserver = MockIntersectionObserver as any;

    render(
      <AdPlacement
        placementId="nutri-tab-market"
        conversionContext="market"
        experimentId="nutri_feed_ab_v1"
        abTestMode="both"
        forceVariant="B"
        forceFallback={true}
        profile={null}
      />
    );

    act(() => {
      observers[0].callback(
        [{ isIntersecting: true, intersectionRatio: 0.1 } as IntersectionObserverEntry],
        {} as IntersectionObserver
      );
    });

    await act(async () => {
      observers[1].callback(
        [{ isIntersecting: true, intersectionRatio: 0.8 } as IntersectionObserverEntry],
        {} as IntersectionObserver
      );
    });

    // Exit/re-entry observer should be registered once >= 50% visible
    expect(observers.length).toBe(3);
    expect(observers[2].options?.threshold).toEqual([0, 0.5]);

    mockSetDoc.mockClear();
    mockAddDoc.mockClear();

    await act(async () => {
      vi.advanceTimersByTime(5000);
    });

    const aside = screen.getByTestId('ad-placement-nutri-tab-market');
    expect(aside.getAttribute('data-dwell-ms')).toBe('5000');

    expect(mockSetDoc).toHaveBeenCalledWith(
      { path: 'adTelemetry/global' },
      expect.objectContaining({
        totalDwellTimeMs: { __op: 'increment', value: 5000 },
        totalDwellTimeSeconds: { __op: 'increment', value: 5 },
        lastDwellTimeMs: 5000,
        visibilidade_percentual: 80,
        conversionContext: 'market',
        byContext: {
          market: {
            dwellTimeMs: { __op: 'increment', value: 5000 },
          },
        },
        byVariant: {
          B: {
            dwellTimeMs: { __op: 'increment', value: 5000 },
          },
        },
      }),
      { merge: true }
    );

    expect(mockAddDoc).toHaveBeenCalledTimes(1);
    expect(mockAddDoc).toHaveBeenCalledWith(
      { path: 'adTelemetryLogs' },
      expect.objectContaining({
        eventType: 'dwell',
        adType: 'Vídeo',
        format: 'video',
        conversionContext: 'market',
        visibilidade_percentual: 80,
        dwellTimeMs: 5000,
        dwellTimeSeconds: 5,
        dwellFlushReason: 'interval',
      })
    );

    expect(mockSetDoc).toHaveBeenCalledWith(
      { path: 'adABTests/nutri_feed_ab_v1' },
      expect.objectContaining({
        experimentId: 'nutri_feed_ab_v1',
        variants: {
          B: expect.objectContaining({
            dwellTimeMs: { __op: 'increment', value: 5000 },
          }),
        },
      }),
      { merge: true }
    );
  });

  it('pauses and flushes dwell time on visibilitychange hidden, off-screen exit, and dismiss', async () => {
    vi.useFakeTimers();

    const observers: Array<{
      callback: IntersectionObserverCallback;
      options?: IntersectionObserverInit;
      disconnect: ReturnType<typeof vi.fn>;
    }> = [];

    class MockIntersectionObserver {
      disconnect = vi.fn();
      observe = vi.fn();
      unobserve = vi.fn();
      constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
        observers.push({ callback, options, disconnect: this.disconnect });
      }
    }
    window.IntersectionObserver = MockIntersectionObserver as any;

    render(
      <AdPlacement
        placementId="nutri-tab-market"
        conversionContext="market"
        format="banner"
        forceFallback={true}
        forceVariant="A"
        profile={null}
      />
    );

    act(() => {
      observers[0].callback(
        [{ isIntersecting: true, intersectionRatio: 0.1 } as IntersectionObserverEntry],
        {} as IntersectionObserver
      );
    });

    await act(async () => {
      observers[1].callback(
        [{ isIntersecting: true, intersectionRatio: 0.65 } as IntersectionObserverEntry],
        {} as IntersectionObserver
      );
    });

    mockSetDoc.mockClear();
    mockAddDoc.mockClear();

    // 1. Accumulate 3000ms then switch tab to hidden -> flushes 'hidden'
    await act(async () => {
      vi.advanceTimersByTime(3000);
      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        get: () => 'hidden',
      });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(mockAddDoc).toHaveBeenCalledTimes(1);
    expect(mockAddDoc.mock.calls[0][1]).toMatchObject({
      eventType: 'dwell',
      dwellTimeMs: 3000,
      dwellTimeSeconds: 3,
      dwellFlushReason: 'hidden',
      visibilidade_percentual: 65,
    });

    // 2. While hidden, advancing 4000ms must NOT accumulate dwell time
    mockSetDoc.mockClear();
    mockAddDoc.mockClear();

    await act(async () => {
      vi.advanceTimersByTime(4000);
    });
    expect(mockSetDoc).not.toHaveBeenCalled();
    expect(mockAddDoc).not.toHaveBeenCalled();

    // 3. Return tab to visible, stay 2000ms, then scroll below 50% -> flushes 'visibility_exit'
    await act(async () => {
      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        get: () => 'visible',
      });
      document.dispatchEvent(new Event('visibilitychange'));
      vi.advanceTimersByTime(2000);
      observers[2].callback(
        [{ isIntersecting: false, intersectionRatio: 0.2 } as IntersectionObserverEntry],
        {} as IntersectionObserver
      );
    });

    expect(mockAddDoc).toHaveBeenCalledTimes(1);
    expect(mockAddDoc.mock.calls[0][1]).toMatchObject({
      eventType: 'dwell',
      dwellTimeMs: 2000,
      dwellTimeSeconds: 2,
      dwellFlushReason: 'visibility_exit',
      visibilidade_percentual: 65,
    });

    // 4. While off-screen, advancing 3500ms must NOT accumulate dwell time
    mockSetDoc.mockClear();
    mockAddDoc.mockClear();

    await act(async () => {
      vi.advanceTimersByTime(3500);
    });
    expect(mockAddDoc).not.toHaveBeenCalled();

    // 5. Scroll back in at 90% visibility, wait 1500ms, then dismiss -> flushes 'dismiss'
    await act(async () => {
      observers[2].callback(
        [{ isIntersecting: true, intersectionRatio: 0.9 } as IntersectionObserverEntry],
        {} as IntersectionObserver
      );
      vi.advanceTimersByTime(1500);
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Dispensar anúncio' }));
    });

    expect(mockAddDoc).toHaveBeenCalledTimes(1);
    expect(mockAddDoc.mock.calls[0][1]).toMatchObject({
      eventType: 'dwell',
      dwellTimeMs: 1500,
      dwellTimeSeconds: 1.5,
      dwellFlushReason: 'dismiss',
      visibilidade_percentual: 90,
    });
  });

  it('flushes accumulated dwell time on unmount', async () => {
    vi.useFakeTimers();

    const { unmount } = render(
      <AdPlacement
        placementId="nutri-tab-generator"
        conversionContext="generator"
        format="banner"
        forceFallback={true}
        forceVariant="A"
        profile={null}
      />
    );

    mockSetDoc.mockClear();
    mockAddDoc.mockClear();

    await act(async () => {
      vi.advanceTimersByTime(1200);
    });

    act(() => {
      unmount();
    });

    expect(mockAddDoc).toHaveBeenCalledWith(
      { path: 'adTelemetryLogs' },
      expect.objectContaining({
        eventType: 'dwell',
        conversionContext: 'generator',
        dwellTimeMs: 1200,
        dwellTimeSeconds: 1.2,
        dwellFlushReason: 'unmount',
        visibilidade_percentual: 100,
      })
    );
  });
});

describe('AdPlacement Non-Blocking Lazy Third-Party Ad Script Loading', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    mockGetDoc.mockResolvedValue({ exists: () => false, data: () => null });
    delete (window as any).IntersectionObserver;
    delete (window as any).requestIdleCallback;
    delete (window as any).cancelIdleCallback;
    delete (window as any).adsbygoogle;
    document
      .querySelectorAll('script[src*="pagead2.googlesyndication.com"]')
      .forEach((el) => el.remove());
  });

  afterEach(() => {
    vi.useRealTimers();
    delete (window as any).requestIdleCallback;
    delete (window as any).cancelIdleCallback;
    delete (window as any).adsbygoogle;
    document
      .querySelectorAll('script[src*="pagead2.googlesyndication.com"]')
      .forEach((el) => el.remove());
  });

  it('defers third-party script injection until near viewport + browser idle and keeps visibility monitoring intact', async () => {
    vi.useFakeTimers();

    const idleQueue: Array<{ id: number; cb: () => void }> = [];
    let nextIdleId = 1;
    const mockCancelIdle = vi.fn((id: number) => {
      const idx = idleQueue.findIndex((item) => item.id === id);
      if (idx !== -1) idleQueue.splice(idx, 1);
    });
    const mockRequestIdle = vi.fn((cb: () => void) => {
      const id = nextIdleId++;
      idleQueue.push({ id, cb });
      return id;
    });
    (window as any).requestIdleCallback = mockRequestIdle;
    (window as any).cancelIdleCallback = mockCancelIdle;

    const observers: Array<{
      callback: IntersectionObserverCallback;
      options?: IntersectionObserverInit;
      disconnect: ReturnType<typeof vi.fn>;
    }> = [];
    class MockIntersectionObserver {
      disconnect = vi.fn();
      observe = vi.fn();
      unobserve = vi.fn();
      constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
        observers.push({ callback, options, disconnect: this.disconnect });
      }
    }
    window.IntersectionObserver = MockIntersectionObserver as any;

    render(
      <AdPlacement
        placementId="nutri-tab-market"
        conversionContext="market"
        forceFallback={false}
        forceVariant="A"
        profile={null}
      />
    );

    // 1. Before entering viewport: zero third-party scripts and zero idle tasks scheduled
    expect(document.querySelector('script[src*="pagead2.googlesyndication.com"]')).toBeNull();
    expect(mockRequestIdle).not.toHaveBeenCalled();

    // 2. Enter pre-viewport margin -> schedules idle task WITHOUT synchronously injecting <script>
    act(() => {
      observers[0].callback(
        [{ isIntersecting: true, intersectionRatio: 0.1 } as IntersectionObserverEntry],
        {} as IntersectionObserver
      );
    });

    const adSlotContainer = screen.getByTestId('adsense-slot-nutri-tab-market');
    expect(adSlotContainer.getAttribute('data-third-party-script-status')).toBe('scheduled');
    expect(document.querySelector('script[src*="pagead2.googlesyndication.com"]')).toBeNull();
    expect(mockRequestIdle).toHaveBeenCalledTimes(1);

    // 3. Even BEFORE the idle third-party script runs/loads, 50%+ visibility & dwell monitoring work intact!
    await act(async () => {
      observers[1].callback(
        [{ isIntersecting: true, intersectionRatio: 0.77 } as IntersectionObserverEntry],
        {} as IntersectionObserver
      );
    });

    expect(mockAddDoc).toHaveBeenCalledWith(
      { path: 'adTelemetryLogs' },
      expect.objectContaining({
        eventType: 'impression',
        visibilidade_percentual: 77,
        conversionContext: 'market',
      })
    );

    // 4. Flush idle task -> injects single async/defer/low-priority third-party <script>
    await act(async () => {
      const task = idleQueue.shift();
      task?.cb();
    });

    const injectedScript = document.querySelector(
      'script[src*="pagead2.googlesyndication.com"]'
    ) as HTMLScriptElement | null;
    expect(injectedScript).not.toBeNull();
    expect(injectedScript!.async).toBe(true);
    expect(injectedScript!.defer).toBe(true);
    expect(injectedScript!.getAttribute('fetchpriority')).toBe('low');
    expect(injectedScript!.getAttribute('data-ad-lazy-script')).toBe('true');
    expect(adSlotContainer.getAttribute('data-third-party-script-status')).toBe('loading');

    // 5. Simulate script load -> schedules adsbygoogle.push on next idle frame without blocking
    await act(async () => {
      injectedScript!.dispatchEvent(new Event('load'));
    });

    expect(adSlotContainer.getAttribute('data-third-party-script-status')).toBe('loaded');
    expect(idleQueue.length).toBe(1);

    await act(async () => {
      const pushTask = idleQueue.shift();
      pushTask?.cb();
    });

    expect(Array.isArray((window as any).adsbygoogle)).toBe(true);
    expect((window as any).adsbygoogle.length).toBe(1);

    // 6. Verify dwell time continued tracking normally alongside lazy script lifecycle
    mockAddDoc.mockClear();
    await act(async () => {
      vi.advanceTimersByTime(5000);
    });

    expect(mockAddDoc).toHaveBeenCalledWith(
      { path: 'adTelemetryLogs' },
      expect.objectContaining({
        eventType: 'dwell',
        dwellTimeMs: 5000,
        visibilidade_percentual: 77,
      })
    );
  });

  it('deduplicates third-party script across placements, handles script errors gracefully, and cancels idle callbacks on unmount', async () => {
    const idleQueue: Array<{ id: number; cb: () => void }> = [];
    let nextIdleId = 1;
    const mockCancelIdle = vi.fn((id: number) => {
      const idx = idleQueue.findIndex((item) => item.id === id);
      if (idx !== -1) idleQueue.splice(idx, 1);
    });
    (window as any).requestIdleCallback = vi.fn((cb: () => void) => {
      const id = nextIdleId++;
      idleQueue.push({ id, cb });
      return id;
    });
    (window as any).cancelIdleCallback = mockCancelIdle;

    // 1. Unmount while script load is still scheduled -> must cancel pending idle callback
    const { unmount: unmountEarly } = render(
      <AdPlacement
        placementId="early-unmount-slot"
        forceFallback={false}
        forceVariant="A"
        profile={null}
      />
    );
    expect(idleQueue.length).toBe(1);
    unmountEarly();
    expect(mockCancelIdle).toHaveBeenCalledWith(1);
    expect(document.querySelectorAll('script[src*="pagead2.googlesyndication.com"]').length).toBe(0);

    // 2. Render two placements and run their idle tasks -> only ONE <script> injected
    render(
      <>
        <AdPlacement placementId="slot-one" forceFallback={false} forceVariant="A" profile={null} />
        <AdPlacement placementId="slot-two" forceFallback={false} forceVariant="A" profile={null} />
      </>
    );

    await act(async () => {
      while (idleQueue.length > 0) {
        idleQueue.shift()?.cb();
      }
    });

    const scripts = document.querySelectorAll('script[src*="pagead2.googlesyndication.com"]');
    expect(scripts.length).toBe(1);

    // 3. Simulate AdBlock/network error on script -> gracefully switches both slots to curated fallback
    await act(async () => {
      scripts[0].dispatchEvent(new Event('error'));
    });

    expect(screen.getByTestId('ad-placement-slot-one')).toBeDefined();
    expect(screen.getByTestId('ad-placement-slot-two')).toBeDefined();
    expect(
      screen.getByTestId('ad-placement-slot-one').getAttribute('data-third-party-script-status')
    ).toBe('error');
  });
});
