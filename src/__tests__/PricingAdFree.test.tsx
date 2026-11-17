import React, { useState } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';

const { setDocMock, docMock, serverTimestampMock, mockAuth } = vi.hoisted(() => ({
  setDocMock: vi.fn().mockResolvedValue(undefined),
  docMock: vi.fn((_db: any, col: string, id: string) => ({ path: `${col}/${id}` })),
  serverTimestampMock: vi.fn(() => 'mock-server-timestamp'),
  mockAuth: {
    currentUser: {
      uid: 'user-pricing-123',
      email: 'vip@nutriai.com',
      emailVerified: true,
      isAnonymous: false,
      tenantId: null,
      providerData: [],
    },
  },
}));

vi.mock('../lib/firebase', () => ({
  db: { type: 'firestore-mock' },
  auth: mockAuth,
  doc: docMock,
  setDoc: setDocMock,
  collection: vi.fn((_db: any, col: string) => ({ path: col })),
  getDoc: vi.fn().mockResolvedValue({ exists: () => false, data: () => null }),
  addDoc: vi.fn().mockResolvedValue({ id: 'mock-log' }),
  increment: vi.fn((val: number) => val),
  serverTimestamp: serverTimestampMock,
}));

vi.mock('../lib/speech', () => ({
  speak: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../components/CheckoutModal', () => ({
  CheckoutModal: ({ isOpen, plan, billingCycle, onSuccess, onClose }: any) => {
    if (!isOpen) return null;
    return (
      <div data-testid="mock-checkout-modal">
        <span>{plan?.name}</span>
        <button
          type="button"
          data-testid="confirm-mock-checkout-btn"
          onClick={async () => {
            await onSuccess?.(plan.id, billingCycle);
            onClose?.();
          }}
        >
          Confirmar Pagamento
        </button>
      </div>
    );
  },
}));

vi.mock('../components/PWAInstallButton', () => ({
  PWAInstallButton: () => <div data-testid="mock-pwa-install" />,
}));

import { Pricing } from '../components/Pricing';
import { AdPlacement } from '../components/AdPlacement';
import { UserProfile } from '../types';

describe('Pricing Ad-Free Experience & AdPlacement Suppression', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    setDocMock.mockResolvedValue(undefined);
    mockAuth.currentUser = {
      uid: 'user-pricing-123',
      email: 'vip@nutriai.com',
      emailVerified: true,
      isAnonymous: false,
      tenantId: null,
      providerData: [],
    };
  });

  it('persists isPremium: true in Firestore users/{uid} when checkout succeeds and surfaces Ad-Free plan features', async () => {
    const onUpgradeSuccess = vi.fn();
    const onPremiumStatusChange = vi.fn();

    render(
      <Pricing
        profile={{
          id: 'user-pricing-123',
          name: 'Lucas Mendes',
          restrictions: [],
          allergies: [],
          goals: 'Emagrecimento',
          equipment: [],
          isPremium: false,
          plan: 'Free',
        }}
        onUpgradeSuccess={onUpgradeSuccess}
        onPremiumStatusChange={onPremiumStatusChange}
      />
    );

    const adFreeBadges = screen.getAllByText(/Experiência 100% sem anúncios \(Ad-Free\)/i);
    expect(adFreeBadges.length).toBeGreaterThanOrEqual(2);

    const adFreeCard = screen.getByTestId('pricing-ad-free-card');
    expect(adFreeCard.getAttribute('data-is-premium')).toBe('false');

    fireEvent.click(screen.getByTestId('activate-ad-free-btn'));
    expect(screen.getByTestId('mock-checkout-modal')).toBeDefined();

    fireEvent.click(screen.getByTestId('confirm-mock-checkout-btn'));

    await waitFor(() => {
      expect(docMock).toHaveBeenCalledWith(expect.anything(), 'users', 'user-pricing-123');
      expect(setDocMock).toHaveBeenCalledWith(
        { path: 'users/user-pricing-123' },
        expect.objectContaining({
          isPremium: true,
          plan: 'Premium',
          subscriptionStatus: 'active',
          adFree: true,
          activePlanId: 'premium',
          billingCycle: 'annual',
          updatedAt: 'mock-server-timestamp',
        }),
        { merge: true }
      );
      expect(onPremiumStatusChange).toHaveBeenCalledWith(true);
      expect(onUpgradeSuccess).toHaveBeenCalledWith('premium', 'annual');
    });

    expect(screen.getByTestId('pricing-vip-active-banner')).toBeDefined();
    expect(screen.getByTestId('pricing-ad-free-card').getAttribute('data-is-premium')).toBe('true');
  });

  it('allows toggling isPremium off in Firestore and logs structured Firestore errors on write failure', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const onPremiumStatusChange = vi.fn();

    const { rerender } = render(
      <Pricing
        profile={{
          id: 'user-pricing-123',
          name: 'Lucas Mendes',
          restrictions: [],
          allergies: [],
          goals: 'Emagrecimento',
          equipment: [],
          isPremium: true,
          plan: 'Premium',
        }}
        onPremiumStatusChange={onPremiumStatusChange}
      />
    );

    expect(screen.getByTestId('pricing-vip-active-banner')).toBeDefined();

    // Pause Ad-Free -> writes isPremium: false to Firestore
    fireEvent.click(screen.getByTestId('toggle-ad-free-btn'));

    await waitFor(() => {
      expect(setDocMock).toHaveBeenCalledWith(
        { path: 'users/user-pricing-123' },
        expect.objectContaining({
          isPremium: false,
          plan: 'Free',
          subscriptionStatus: 'inactive',
          adFree: false,
        }),
        { merge: true }
      );
      expect(onPremiumStatusChange).toHaveBeenCalledWith(false);
    });

    // Simulate Firestore permission error on re-activation failure
    setDocMock.mockRejectedValueOnce(new Error('Missing or insufficient permissions.'));
    rerender(
      <Pricing
        profile={{
          id: 'user-pricing-123',
          name: 'Lucas Mendes',
          restrictions: [],
          allergies: [],
          goals: 'Emagrecimento',
          equipment: [],
          isPremium: true,
          plan: 'Premium',
        }}
        onPremiumStatusChange={onPremiumStatusChange}
      />
    );

    fireEvent.click(screen.getByTestId('toggle-ad-free-btn'));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeDefined();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Firestore Error: ',
        expect.stringContaining('"operationType":"update"')
      );
    });

    consoleErrorSpy.mockRestore();
  });

  it('automatically removes visible AdPlacement ads when Pricing updates profile.isPremium to true', async () => {
    function IntegrationHarness() {
      const [profile, setProfile] = useState<UserProfile>({
        id: 'user-pricing-123',
        name: 'Clara Oliveira',
        restrictions: [],
        allergies: [],
        goals: 'Saúde',
        equipment: [],
        isPremium: false,
        plan: 'Free',
      });

      return (
        <div>
          <Pricing
            profile={profile}
            onPremiumStatusChange={(nextIsPremium) =>
              setProfile((prev) => ({
                ...prev,
                isPremium: nextIsPremium,
                plan: nextIsPremium ? 'Premium' : 'Free',
                subscriptionStatus: nextIsPremium ? 'active' : 'inactive',
              }))
            }
          />
          <AdPlacement
            placementId="nutri-tab-generator"
            format="banner"
            forceFallback={true}
            profile={profile}
          />
        </div>
      );
    }

    render(<IntegrationHarness />);

    // Initially AdPlacement renders normally for non-premium user
    expect(screen.getByTestId('ad-placement-nutri-tab-generator')).toBeDefined();

    // User activates Ad-Free checkout inside Pricing
    fireEvent.click(screen.getByTestId('activate-ad-free-btn'));
    fireEvent.click(screen.getByTestId('confirm-mock-checkout-btn'));

    // AdPlacement is automatically removed once isPremium becomes true
    await waitFor(() => {
      expect(screen.queryByTestId('ad-placement-nutri-tab-generator')).toBeNull();
    });
  });
});
