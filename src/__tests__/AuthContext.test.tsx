import React from 'react';
import { render, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { User } from 'firebase/auth';

// Setup mocks for firebase/auth and firebase module
let authStateCallback: ((user: User | null) => void) | null = null;
const mockSignOut = vi.fn().mockResolvedValue(undefined);
const mockSignInWithPopup = vi.fn().mockResolvedValue({ user: { uid: 'google-user-123', email: 'test@gmail.com' } });
const mockSignInWithEmailAndPassword = vi.fn().mockResolvedValue({ user: { uid: 'email-user-123', email: 'test@nutriai.com' } });
const mockCreateUserWithEmailAndPassword = vi.fn().mockResolvedValue({ user: { uid: 'new-user-123', email: 'new@nutriai.com' } });

vi.mock('../lib/firebase', () => ({
  auth: { currentUser: null },
  signInWithGoogle: () => mockSignInWithPopup(),
}));

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({ currentUser: null })),
  onAuthStateChanged: vi.fn((_auth, onNext) => {
    authStateCallback = onNext;
    return vi.fn(); // unsubscribe
  }),
  signOut: (...args: any[]) => mockSignOut(...args),
  signInWithEmailAndPassword: (...args: any[]) => mockSignInWithEmailAndPassword(...args),
  createUserWithEmailAndPassword: (...args: any[]) => mockCreateUserWithEmailAndPassword(...args),
}));

// Test consumer component to read AuthContext state
const TestConsumer: React.FC<{ onRender?: (auth: ReturnType<typeof useAuth>) => void }> = ({ onRender }) => {
  const auth = useAuth();
  if (onRender) onRender(auth);
  return (
    <div>
      <div data-testid="user-id">{auth.user?.uid || 'no-user'}</div>
      <div data-testid="user-email">{auth.user?.email || 'no-email'}</div>
      <div data-testid="loading">{String(auth.loading)}</div>
      <button onClick={() => auth.signInWithGoogle()}>Login Google</button>
      <button onClick={() => auth.signInWithEmail('test@nutriai.com', 'password123')}>Login Email</button>
      <button onClick={() => auth.signUpWithEmail('new@nutriai.com', 'password123')}>Signup Email</button>
      <button onClick={() => auth.logout()}>Logout</button>
    </div>
  );
};

describe('AuthContext - Firebase Authentication Flow', () => {
  beforeEach(() => {
    authStateCallback = null;
    mockSignOut.mockClear();
    mockSignInWithPopup.mockClear();
    mockSignInWithEmailAndPassword.mockClear();
    mockCreateUserWithEmailAndPassword.mockClear();
  });

  it('starts in loading state and resolves user from onAuthStateChanged', () => {
    let renderedAuth: any;
    render(
      <AuthProvider>
        <TestConsumer onRender={(auth) => { renderedAuth = auth; }} />
      </AuthProvider>
    );

    expect(renderedAuth.loading).toBe(true);

    const mockFirebaseUser = {
      uid: 'user-xyz',
      email: 'user@example.com',
      displayName: 'Example User',
    } as unknown as User;

    act(() => {
      if (authStateCallback) {
        authStateCallback(mockFirebaseUser);
      }
    });

    expect(renderedAuth.loading).toBe(false);
    expect(renderedAuth.user?.uid).toBe('user-xyz');
    expect(renderedAuth.user?.email).toBe('user@example.com');
  });

  it('signs out and calls firebase signOut on logout', async () => {
    let renderedAuth: any;
    render(
      <AuthProvider>
        <TestConsumer onRender={(auth) => { renderedAuth = auth; }} />
      </AuthProvider>
    );

    act(() => {
      if (authStateCallback) {
        authStateCallback({ uid: 'logged-in-user' } as unknown as User);
      }
    });

    expect(renderedAuth.user?.uid).toBe('logged-in-user');

    await act(async () => {
      await renderedAuth.logout();
    });

    expect(renderedAuth.user).toBeNull();
    expect(mockSignOut).toHaveBeenCalled();
  });

  it('supports Google authentication', async () => {
    let renderedAuth: any;
    render(
      <AuthProvider>
        <TestConsumer onRender={(auth) => { renderedAuth = auth; }} />
      </AuthProvider>
    );

    await act(async () => {
      await renderedAuth.signInWithGoogle();
    });

    expect(mockSignInWithPopup).toHaveBeenCalled();
  });

  it('supports email authentication and signup', async () => {
    let renderedAuth: any;
    render(
      <AuthProvider>
        <TestConsumer onRender={(auth) => { renderedAuth = auth; }} />
      </AuthProvider>
    );

    await act(async () => {
      await renderedAuth.signInWithEmail('test@nutriai.com', 'password123');
      await renderedAuth.signUpWithEmail('new@nutriai.com', 'password123');
    });

    expect(mockSignInWithEmailAndPassword).toHaveBeenCalled();
    expect(mockCreateUserWithEmailAndPassword).toHaveBeenCalled();
  });
});
