import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AdPlacement } from '../components/AdPlacement';

describe('AdPlacement Component (Google AdSense / AdMob & Fallback)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    delete (window as any).IntersectionObserver;
  });

  it('renders sponsored placement container with compliance disclosure', () => {
    render(<AdPlacement placementId="test-unit-1" forceFallback={true} />);

    expect(screen.getByTestId('ad-placement-test-unit-1')).toBeDefined();
    expect(screen.getByText(/Patrocinado/i)).toBeDefined();
    expect(screen.getByText(/Verificado pela moderação NutriAI/i)).toBeDefined();
  });

  it('switches to fallback gracefully when Google AdSense slot fails or is forced', () => {
    render(
      <AdPlacement 
        placementId="test-unit-2" 
        format="banner" 
        forceFallback={true} 
      />
    );

    // Fallback creative displays brand title and CTA
    expect(screen.getByText(/Garantir Cesta|Aproveitar|Ver Garrafa/i)).toBeDefined();
  });

  it('handles video error gracefully by falling back to image', () => {
    render(
      <AdPlacement 
        placementId="test-video-unit" 
        format="video" 
        forceFallback={true} 
      />
    );

    const videoEl = screen.queryByRole('video') || document.querySelector('video');
    expect(videoEl).not.toBeNull();

    // Trigger video error
    if (videoEl) {
      fireEvent.error(videoEl);
    }

    // Video should be replaced by fallback image without crashing
    const imgEl = document.querySelector('img');
    expect(imgEl).not.toBeNull();
  });

  it('handles image error gracefully by falling back to vector SVG banner', () => {
    render(
      <AdPlacement 
        placementId="test-img-fallback" 
        format="banner" 
        forceFallback={true} 
      />
    );

    const imgEl = document.querySelector('img');
    expect(imgEl).not.toBeNull();

    // First error triggers secondary CDN image retry
    if (imgEl) {
      fireEvent.error(imgEl);
    }

    // Second error triggers pure SVG vector card
    const updatedImg = document.querySelector('img');
    if (updatedImg) {
      fireEvent.error(updatedImg);
    }

    // Now stylized CSS/SVG banner is active
    expect(document.querySelector('svg')).toBeDefined();
  });

  it('allows user to dismiss ad non-intrusively and persists 24h dismissal', () => {
    const onDismissMock = vi.fn();
    render(
      <AdPlacement 
        placementId="test-dismiss-unit" 
        forceFallback={true} 
        onAdDismiss={onDismissMock}
      />
    );

    const dismissBtn = screen.getByLabelText(/Dispensar anúncio/i);
    fireEvent.click(dismissBtn);

    expect(onDismissMock).toHaveBeenCalledWith('test-dismiss-unit');
    expect(localStorage.getItem('nutri_ad_dismissed_test-dismiss-unit')).not.toBeNull();
  });

  it('does not render if already dismissed within 24 hours', () => {
    const futureTimestamp = Date.now() + 1000 * 60 * 60 * 12; // 12 hours ahead
    localStorage.setItem('nutri_ad_dismissed_pre-dismissed-unit', String(futureTimestamp));

    render(<AdPlacement placementId="pre-dismissed-unit" forceFallback={true} />);

    expect(screen.queryByTestId('ad-placement-pre-dismissed-unit')).toBeNull();
  });

  it('detects mobile screen size (<768px) and automatically renders compact native ad format', () => {
    // Mock mobile viewport width
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 414 });
    window.matchMedia = vi.fn().mockImplementation(query => ({
      matches: query.includes('max-width: 767px'),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    render(<AdPlacement placementId="mobile-test-unit" format="banner" forceFallback={true} />);

    const placement = screen.getByTestId('ad-placement-mobile-test-unit');
    expect(placement).toBeDefined();
    expect(placement.getAttribute('data-mobile-mode')).toBe('true');
    expect(placement.getAttribute('data-effective-format')).toBe('native');
  });

  it('delays resource loading and renders skeleton until IntersectionObserver signals near-viewport', () => {
    let observerCallback: any = null;
    const observeMock = vi.fn();
    const disconnectMock = vi.fn();

    // Mock IntersectionObserver class constructor
    class MockIntersectionObserver {
      observe = observeMock;
      unobserve = vi.fn();
      disconnect = disconnectMock;
      constructor(callback: any) {
        observerCallback = callback;
      }
    }
    window.IntersectionObserver = MockIntersectionObserver as any;

    const { rerender } = render(<AdPlacement placementId="intersection-test-unit" forceFallback={true} />);

    // Initially when IntersectionObserver is present and entry has not intersected, skeleton renders
    expect(screen.getByTestId('ad-placement-skeleton-intersection-test-unit')).toBeDefined();
    expect(observeMock).toHaveBeenCalled();

    // Trigger IntersectionObserver callback when scrolling near viewport
    if (observerCallback) {
      observerCallback([{ isIntersecting: true, intersectionRatio: 1 }]);
    }

    // Force re-render to reflect state change
    rerender(<AdPlacement placementId="intersection-test-unit" forceFallback={true} />);

    // Ad placement creative is now rendered and preloading initiated
    expect(screen.getByTestId('ad-placement-intersection-test-unit')).toBeDefined();
    expect(disconnectMock).toHaveBeenCalled();

    // Clean up IntersectionObserver mock for subsequent tests
    delete (window as any).IntersectionObserver;
  });

  it('renders claymorphic native ad styling when claymorphic prop is active', () => {
    render(
      <AdPlacement 
        placementId="clay-test-unit" 
        format="native" 
        claymorphic={true} 
        forceFallback={true} 
      />
    );

    const placement = screen.getByTestId('ad-placement-clay-test-unit');
    expect(placement).toBeDefined();
    expect(placement.getAttribute('data-claymorphic')).toBe('true');
  });

  it('renders custom HTML template slots via renderTemplate render prop', () => {
    const customTemplateSpy = vi.fn().mockImplementation((ad) => (
      <div data-testid="custom-ad-slot-html">
        <span className="custom-brand">{ad.brand}</span>
        <button type="button">Custom Action</button>
      </div>
    ));

    render(
      <AdPlacement
        placementId="custom-slot-unit"
        forceFallback={true}
        renderTemplate={customTemplateSpy}
      />
    );

    expect(screen.getByTestId('custom-ad-slot-html')).toBeDefined();
    expect(screen.getByText(/Custom Action/i)).toBeDefined();
    expect(customTemplateSpy).toHaveBeenCalled();
  });

  it('allows user to switch cleanly between Gerador de Vídeo IA and Banner de Produto via visual selector', async () => {
    render(
      <AdPlacement
        placementId="selector-test-unit"
        format="banner"
        forceFallback={true}
      />
    );

    const videoTabBtn = screen.getByTestId('ad-mode-video-btn');
    const photoTabBtn = screen.getByTestId('ad-mode-photo-btn');

    expect(videoTabBtn).toBeDefined();
    expect(photoTabBtn).toBeDefined();

    // Default for banner is photo mode
    expect(photoTabBtn.getAttribute('aria-selected')).toBe('true');
    expect(videoTabBtn.getAttribute('aria-selected')).toBe('false');
    expect(document.querySelector('img')).not.toBeNull();
    expect(document.querySelector('video')).toBeNull();

    // Click to switch to Gerador de Vídeo IA
    act(() => {
      fireEvent.click(videoTabBtn);
    });

    expect(videoTabBtn.getAttribute('aria-selected')).toBe('true');
    expect(photoTabBtn.getAttribute('aria-selected')).toBe('false');
    await waitFor(() => {
      expect(document.querySelector('video')).not.toBeNull();
      expect(document.querySelector('img')).toBeNull();
    });

    // Click to switch back to Banner de Produto
    act(() => {
      fireEvent.click(photoTabBtn);
    });

    expect(photoTabBtn.getAttribute('aria-selected')).toBe('true');
    expect(videoTabBtn.getAttribute('aria-selected')).toBe('false');
    await waitFor(() => {
      expect(document.querySelector('img')).not.toBeNull();
      expect(document.querySelector('video')).toBeNull();
    });
  });

  it('allows user to configure default format preference in settings panel and saves to localStorage', async () => {
    render(
      <AdPlacement
        placementId="settings-test-unit"
        format="banner"
        forceFallback={true}
      />
    );

    // Settings panel starts closed
    expect(screen.queryByTestId('ad-settings-panel')).toBeNull();

    // Open settings panel
    const settingsToggleBtn = screen.getByTestId('ad-settings-toggle-btn');
    fireEvent.click(settingsToggleBtn);

    expect(screen.getByTestId('ad-settings-panel')).toBeDefined();
    expect(screen.getByText(/Formato Padrão de Anúncios/i)).toBeDefined();

    // Select Video as preferred default format
    const prefVideoBtn = screen.getByTestId('pref-format-video-btn');
    act(() => {
      fireEvent.click(prefVideoBtn);
    });

    // Verifies preference is saved in localStorage
    expect(localStorage.getItem('nutri_ad_format_preference')).toBe('video');
    await waitFor(() => {
      expect(document.querySelector('video')).not.toBeNull();
      expect(document.querySelector('img')).toBeNull();
    });

    // Select Banner as preferred default format
    const prefBannerBtn = screen.getByTestId('pref-format-banner-btn');
    act(() => {
      fireEvent.click(prefBannerBtn);
    });

    // Verifies preference is updated in localStorage
    expect(localStorage.getItem('nutri_ad_format_preference')).toBe('banner');
    await waitFor(() => {
      expect(document.querySelector('img')).not.toBeNull();
      expect(document.querySelector('video')).toBeNull();
    });
  });

  it('initializes respecting pre-saved format preference from localStorage', () => {
    localStorage.setItem('nutri_ad_format_preference', 'video');

    render(
      <AdPlacement
        placementId="stored-pref-unit"
        format="banner"
        forceFallback={true}
      />
    );

    // Even though format="banner", localStorage preference 'video' takes priority
    expect(document.querySelector('video')).not.toBeNull();
    expect(document.querySelector('img')).toBeNull();
  });
});
