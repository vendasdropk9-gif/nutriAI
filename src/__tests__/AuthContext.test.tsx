import React from 'react';
import { render, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { User } from 'firebase/auth';

// Setup mocks for firebase/auth and firebase module
let authStateCallback: ((user: User | null) => void) | null = null;
let authErrorCallback: ((error: any) => void) | null = null;
const mockSignOut = vi.fn().mockResolvedValue(undefined);

vi.mock('../lib/firebase', () => ({
  auth: { currentUser: null },
}));

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({ currentUser: null })),
  onAuthStateChanged: vi.fn((_auth, onNext, onError) => {
    authStateCallback = onNext;
    authErrorCallback = onError;
    return vi.fn(); // unsubscribe
  }),
  signOut: (...args: any[]) => mockSignOut(...args),
}));

// Test consumer component to read AuthContext state
const TestConsumer: React.FC<{ onRender?: (auth: ReturnType<typeof useAuth>) => void }> = ({ onRender }) => {
  const auth = useAuth();
  if (onRender) onRender(auth);
  return (
    <div>
      <div data-testid="user-id">{auth.user?.uid || 'no-user'}</div>
      <div data-testid="user-email">{auth.user?.email || 'no-email'}</div>
      <div data-testid="user-name">{auth.user?.displayName || 'no-name'}</div>
      <div data-testid="is-local">{String(auth.isLocal)}</div>
      <div data-testid="loading">{String(auth.loading)}</div>
      <button onClick={() => auth.loginLocally('Test Offline User', 'offline@nutriai.com')}>Login Local</button>
      <button onClick={() => auth.logoutLocally()}>Logout Local</button>
    </div>
  );
};

describe('AuthContext - Data Integrity & Offline/Online Transitions', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    authStateCallback = null;
    authErrorCallback = null;
    mockSignOut.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('restores cached user from localStorage immediately when offline', async () => {
    const cachedUser = {
      uid: 'cached-user-123',
      email: 'cached@nutriai.com',
      displayName: 'Cached Offline User',
      emailVerified: true,
      providerData: [{ providerId: 'password', email: 'cached@nutriai.com', uid: 'cached-user-123' }],
    };
    localStorage.setItem('nutri-local-session-user', JSON.stringify(cachedUser));

    let renderedAuth: any;
    render(
      <AuthProvider>
        <TestConsumer onRender={(auth) => { renderedAuth = auth; }} />
      </AuthProvider>
    );

    expect(renderedAuth.user?.uid).toBe('cached-user-123');
    expect(renderedAuth.user?.displayName).toBe('Cached Offline User');
    expect(renderedAuth.isLocal).toBe(true);
    expect(renderedAuth.loading).toBe(false);
  });

  it('safely recovers when localStorage session has corrupted JSON and falls back without crashing', async () => {
    localStorage.setItem('nutri-local-session-user', '{invalid-json:broken');

    let renderedAuth: any;
    render(
      <AuthProvider>
        <TestConsumer onRender={(auth) => { renderedAuth = auth; }} />
      </AuthProvider>
    );

    // Advance timer past the 1000ms sandbox/offline timeout
    act(() => {
      vi.advanceTimersByTime(1100);
    });

    expect(renderedAuth.loading).toBe(false);
    expect(renderedAuth.user?.uid).toBe('guest-direct-user');
    expect(renderedAuth.isLocal).toBe(true);
  });

  it('falls back to default guest user when offline and Firebase auth hangs/times out', async () => {
    let renderedAuth: any;
    render(
      <AuthProvider>
        <TestConsumer onRender={(auth) => { renderedAuth = auth; }} />
      </AuthProvider>
    );

    // Before timeout, should be loading
    expect(renderedAuth.loading).toBe(true);

    // Simulate network hung / offline timeout (1000ms fallback)
    act(() => {
      vi.advanceTimersByTime(1100);
    });

    expect(renderedAuth.loading).toBe(false);
    expect(renderedAuth.user?.uid).toBe('guest-direct-user');
    expect(renderedAuth.user?.email).toBe('usuario@nutriai.com');
    expect(renderedAuth.isLocal).toBe(true);
  });

  it('transitions from offline local guest to online Firebase user seamlessly', async () => {
    let renderedAuth: any;
    render(
      <AuthProvider>
        <TestConsumer onRender={(auth) => { renderedAuth = auth; }} />
      </AuthProvider>
    );

    // Initially timeout triggers offline guest
    act(() => {
      vi.advanceTimersByTime(1100);
    });
    expect(renderedAuth.user?.uid).toBe('guest-direct-user');
    expect(renderedAuth.isLocal).toBe(true);

    // Now connection is restored and Firebase auth responds with online user
    const onlineFirebaseUser = {
      uid: 'firebase-user-999',
      email: 'verified.online@nutriai.com',
      displayName: 'NutriAI Online User',
      emailVerified: true,
      providerData: [],
    } as unknown as User;

    act(() => {
      if (authStateCallback) {
        authStateCallback(onlineFirebaseUser);
      }
    });

    expect(renderedAuth.user?.uid).toBe('firebase-user-999');
    expect(renderedAuth.user?.email).toBe('verified.online@nutriai.com');
    expect(renderedAuth.isLocal).toBe(false);
    expect(renderedAuth.loading).toBe(false);
    // Local session should be cleared to keep online state pristine
    expect(localStorage.getItem('nutri-local-session-user')).toBeNull();
  });

  it('persists credentials when logging in locally while offline', async () => {
    let renderedAuth: any;
    render(
      <AuthProvider>
        <TestConsumer onRender={(auth) => { renderedAuth = auth; }} />
      </AuthProvider>
    );

    act(() => {
      renderedAuth.loginLocally('Carlos Nutri', 'carlos@exemplo.com');
    });

    expect(renderedAuth.user?.displayName).toBe('Carlos Nutri');
    expect(renderedAuth.user?.email).toBe('carlos@exemplo.com');
    expect(renderedAuth.isLocal).toBe(true);

    // Verify localStorage has the serialized session for offline durability
    const rawStored = localStorage.getItem('nutri-local-session-user');
    expect(rawStored).toBeTruthy();
    const parsed = JSON.parse(rawStored!);
    expect(parsed.displayName).toBe('Carlos Nutri');
    expect(parsed.email).toBe('carlos@exemplo.com');
    expect(parsed.uid).toMatch(/^local-user-/);
  });

  it('clears session and triggers firebase signOut on logoutLocally', async () => {
    let renderedAuth: any;
    render(
      <AuthProvider>
        <TestConsumer onRender={(auth) => { renderedAuth = auth; }} />
      </AuthProvider>
    );

    act(() => {
      renderedAuth.loginLocally('Carlos Nutri', 'carlos@exemplo.com');
    });
    expect(localStorage.getItem('nutri-local-session-user')).toBeTruthy();

    await act(async () => {
      await renderedAuth.logoutLocally();
    });

    expect(renderedAuth.user).toBeNull();
    expect(renderedAuth.isLocal).toBe(false);
    expect(localStorage.getItem('nutri-local-session-user')).toBeNull();
    expect(mockSignOut).toHaveBeenCalled();
  });

  it('handles Firebase auth initialization errors gracefully without crashing the app', async () => {
    let renderedAuth: any;
    render(
      <AuthProvider>
        <TestConsumer onRender={(auth) => { renderedAuth = auth; }} />
      </AuthProvider>
    );

    act(() => {
      if (authErrorCallback) {
        authErrorCallback(new Error('Network offline or DNS error'));
      }
    });

    expect(renderedAuth.loading).toBe(false);
    expect(renderedAuth.user?.uid).toBe('guest-direct-user');
    expect(renderedAuth.isLocal).toBe(true);
  });
});
