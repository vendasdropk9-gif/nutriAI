import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
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
});
