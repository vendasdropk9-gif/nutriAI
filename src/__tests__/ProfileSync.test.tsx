import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useProfileSync } from '../lib/profileSync';
import { 
  getPendingOfflineMutations, 
  queueOfflineMutation, 
  clearPendingOfflineMutations, 
  flushOfflineMutations 
} from '../lib/offlineSyncEngine';
import { 
  saveOfflineAction, 
  getPendingOfflineActions, 
  syncOfflineActionsWithFirebase,
} from '../lib/offline-data-sync';
import { User } from 'firebase/auth';
import { UserProfile } from '../types';

// Captured callbacks from mocked Firestore
let onSnapshotCallback: ((snap: any) => void) | null = null;
let onSnapshotErrorCallback: ((err: any) => void) | null = null;
const mockUnsubscribe = vi.fn();
const mockSetDoc = vi.fn().mockResolvedValue(undefined);
const mockGetDocs = vi.fn().mockResolvedValue({ docs: [] });
const mockAddDoc = vi.fn().mockResolvedValue({ id: 'mock-doc-id' });

// Mock idb to test offline storage fallback reliability
vi.mock('idb', () => ({
  openDB: vi.fn().mockRejectedValue(new Error('IndexedDB fallback to localStorage')),
}));

// Mock both firebase/firestore and lib/firebase
vi.mock('firebase/firestore', () => ({
  collection: vi.fn((_db, ...parts) => ({ path: parts.join('/'), isCollection: true })),
  doc: vi.fn((_db, ...parts) => ({ path: parts.join('/'), id: parts[parts.length - 1], isDoc: true })),
  getDoc: vi.fn().mockResolvedValue({ exists: () => false, data: () => null }),
  getDocs: (...args: any[]) => mockGetDocs(...args),
  setDoc: (...args: any[]) => mockSetDoc(...args),
  addDoc: (...args: any[]) => mockAddDoc(...args),
  updateDoc: vi.fn().mockResolvedValue(undefined),
  onSnapshot: vi.fn((_ref, onNext, onError) => {
    onSnapshotCallback = onNext;
    onSnapshotErrorCallback = onError;
    return mockUnsubscribe;
  }),
  serverTimestamp: vi.fn(() => '2026-10-26T12:00:00.000Z'),
}));

vi.mock('../lib/firebase', () => ({
  db: { type: 'mock-firestore' },
  collection: vi.fn((_db, ...parts) => ({ path: parts.join('/') })),
  doc: vi.fn((_db, ...parts) => ({ path: parts.join('/'), id: parts[parts.length - 1] })),
  getDocs: (...args: any[]) => mockGetDocs(...args),
  setDoc: (...args: any[]) => mockSetDoc(...args),
  addDoc: (...args: any[]) => mockAddDoc(...args),
  updateDoc: vi.fn().mockResolvedValue(undefined),
  onSnapshot: vi.fn((_ref, onNext, onError) => {
    onSnapshotCallback = onNext;
    onSnapshotErrorCallback = onError;
    return mockUnsubscribe;
  }),
  serverTimestamp: vi.fn(() => '2026-10-26T12:00:00.000Z'),
}));

vi.mock('../lib/bootManager', () => ({
  withTimeout: vi.fn((promise, _ms, fallback) => {
    return Promise.resolve(promise).catch(() => fallback);
  }),
}));

vi.mock('../lib/sensory', () => ({
  playSfx: vi.fn(),
  vibrate: vi.fn(),
}));

describe('ProfileSync - Data Integrity & Offline-to-Online Transitions', () => {
  const mockUser: User = {
    uid: 'user-transition-123',
    email: 'atleta@nutriai.com',
    displayName: 'Carlos Atleta',
  } as unknown as User;

  const mockLocalProfile: UserProfile = {
    id: 'user-transition-123',
    name: 'Carlos Atleta',
    firstName: 'Carlos',
    lastName: 'Atleta',
    email: 'atleta@nutriai.com',
    weight: 78.5,
    height: 180,
    goals: 'Ganho de massa muscular',
    restrictions: ['Glúten'],
    allergies: ['Amendoim'],
    equipment: ['Halteres', 'Kettlebell'],
    plan: 'Free',
    isPremium: false,
    subscriptionStatus: 'active',
    language: 'pt-BR',
    country: 'Brazil',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    points: 150,
    streak: 3,
    intakeLogs: [],
    progressLogs: [],
    hydrationLogs: [],
    workoutLogs: [],
    sleepLogs: [],
    emotionalLogs: [],
    fastingLogs: [],
    bloodPressureLogs: [],
    bodyMonitorLogs: [],
    notes: []
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    clearPendingOfflineMutations();
    onSnapshotCallback = null;
    onSnapshotErrorCallback = null;
    mockGetDocs.mockResolvedValue({ docs: [] });
    mockSetDoc.mockResolvedValue(undefined);
  });

  describe('useProfileSync Hook', () => {
    it('creates remote profile preserving offline local data when newly going online', async () => {
      let currentProfile: UserProfile | null = { ...mockLocalProfile };
      const setLocalProfile = vi.fn((updater) => {
        if (typeof updater === 'function') {
          currentProfile = updater(currentProfile);
        } else {
          currentProfile = updater;
        }
      });

      renderHook(() => useProfileSync(mockUser, currentProfile, setLocalProfile));

      // Simulate Firestore doc snapshot indicating user doc does not exist yet (first online transition)
      await act(async () => {
        if (onSnapshotCallback) {
          await onSnapshotCallback({
            exists: () => false,
            data: () => null,
          });
        }
      });

      // Verify setDoc was called with initial data preserving local draft attributes
      expect(mockSetDoc).toHaveBeenCalled();
      const firstSetDocCall = mockSetDoc.mock.calls[0];
      const initialPayload = firstSetDocCall[1];

      expect(initialPayload.uid).toBe('user-transition-123');
      expect(initialPayload.weight).toBe(78.5);
      expect(initialPayload.height).toBe(180);
      expect(initialPayload.goals).toBe('Ganho de massa muscular');
      expect(initialPayload.restrictions).toEqual(['Glúten']);
      expect(initialPayload.allergies).toEqual(['Amendoim']);
      expect(initialPayload.equipment).toEqual(['Halteres', 'Kettlebell']);
      expect(setLocalProfile).toHaveBeenCalled();
    });

    it('merges remote profile into local profile without losing user logs and settings', async () => {
      let currentProfile: UserProfile | null = { ...mockLocalProfile };
      const setLocalProfile = vi.fn((newProfile) => {
        currentProfile = newProfile;
      });

      // Mock subcollection retrieval
      mockGetDocs.mockResolvedValue({
        docs: [{ id: 'intake-1', data: () => ({ mealName: 'Almoço Fit', calories: 650 }) }]
      });

      renderHook(() => useProfileSync(mockUser, currentProfile, setLocalProfile));

      const remoteData = {
        displayName: 'Carlos Atleta Silva',
        email: 'atleta@nutriai.com',
        weight: 79.2,
        height: 180,
        waterGoal: 3000,
        plan: 'Premium',
        isPremium: true,
        points: 450,
        streak: 12,
        restrictions: ['Glúten', 'Lactose'],
      };

      await act(async () => {
        if (onSnapshotCallback) {
          await onSnapshotCallback({
            exists: () => true,
            data: () => remoteData,
          });
        }
      });

      expect(setLocalProfile).toHaveBeenCalled();
      const reconciledProfile = setLocalProfile.mock.calls[0][0];
      expect(reconciledProfile.name).toBe('Carlos Atleta Silva');
      expect(reconciledProfile.weight).toBe(79.2);
      expect(reconciledProfile.waterGoal).toBe(3000);
      expect(reconciledProfile.isPremium).toBe(true);
      expect(reconciledProfile.streak).toBe(12);
      expect(reconciledProfile.restrictions).toEqual(['Glúten', 'Lactose']);
    });

    it('handles network idle stream disconnects and renewals gracefully', async () => {
      const consoleDebugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
      let currentProfile: UserProfile | null = { ...mockLocalProfile };
      const setLocalProfile = vi.fn();

      const { result } = renderHook(() => useProfileSync(mockUser, currentProfile, setLocalProfile));

      // Simulate Firestore stream reset / idle disconnect
      act(() => {
        if (onSnapshotErrorCallback) {
          onSnapshotErrorCallback({ message: 'Disconnecting idle stream' });
        }
      });

      // Hook sync state should reset gracefully and not crash
      expect(result.current.isSyncing).toBe(false);
      consoleDebugSpy.mockRestore();
    });

    it('syncToFirestore sends complete profile payload and subcollections with merge: true', async () => {
      let currentProfile: UserProfile | null = { ...mockLocalProfile };
      const setLocalProfile = vi.fn();

      const { result } = renderHook(() => useProfileSync(mockUser, currentProfile, setLocalProfile));

      const updatedProfile: UserProfile = {
        ...mockLocalProfile,
        weight: 77.8,
        waterGoal: 2800,
        hydrationLogs: [
          { id: 'water-1', amount: 500, timestamp: '2026-10-26T09:00:00.000Z' } as any
        ],
        notes: [
          { id: 'note-1', title: 'Ajuste de Treino', content: 'Mais foco em pernas', date: '2026-10-26' } as any
        ]
      };

      await act(async () => {
        await result.current.syncToFirestore(updatedProfile);
      });

      expect(mockSetDoc).toHaveBeenCalled();
      // Should have saved main profile doc with merge: true
      const mainProfileCall = mockSetDoc.mock.calls.find(call => call[0].path === 'users/user-transition-123');
      expect(mainProfileCall).toBeTruthy();
      expect(mainProfileCall[1].weight).toBe(77.8);
      expect(mainProfileCall[1].waterGoal).toBe(2800);
      expect(mainProfileCall[2]).toEqual({ merge: true });

      // Should have saved subcollections (hydrationLogs, notes)
      const hydrationCall = mockSetDoc.mock.calls.find(call => call[0].path.includes('hydrationLogs'));
      expect(hydrationCall).toBeTruthy();
      expect(hydrationCall[1].amount).toBe(500);

      const notesCall = mockSetDoc.mock.calls.find(call => call[0].path.includes('notes'));
      expect(notesCall).toBeTruthy();
      expect(notesCall[1].title).toBe('Ajuste de Treino');
    });
  });

  describe('Offline Queue & Mutation Engine Integrity', () => {
    it('queues offline mutations and preserves them in localStorage', () => {
      expect(getPendingOfflineMutations()).toHaveLength(0);

      const mutation = queueOfflineMutation('log_meal', {
        name: 'Omelete de Claras',
        calories: 220,
        time: '08:00',
      });

      expect(mutation.id).toBeDefined();
      expect(mutation.type).toBe('log_meal');
      expect(mutation.data.name).toBe('Omelete de Claras');

      const queued = getPendingOfflineMutations();
      expect(queued).toHaveLength(1);
      expect(queued[0].data.calories).toBe(220);
    });

    it('flushes pending offline mutations when network connectivity resumes', async () => {
      queueOfflineMutation('update_water', { amount: 350 });
      queueOfflineMutation('update_vital', { bloodPressure: '120/80' });

      expect(getPendingOfflineMutations()).toHaveLength(2);

      const flushedCount = await flushOfflineMutations();
      expect(flushedCount).toBe(2);
      expect(getPendingOfflineMutations()).toHaveLength(0);
    });

    it('handles offline action storage fallback and flushes to Firebase upon online transition', async () => {
      // Mock navigator.onLine as false during action creation
      Object.defineProperty(navigator, 'onLine', { value: false, configurable: true, writable: true });

      const actionId = await saveOfflineAction(
        'log_intake',
        'intakeLogs',
        'create',
        { food: 'Frango com Batata Doce', calories: 480 },
        'intake-doc-123'
      );

      expect(actionId).toBeDefined();

      const pending = await getPendingOfflineActions();
      expect(pending.length).toBeGreaterThan(0);
      const action = pending.find(a => a.id === actionId);
      expect(action?.data.food).toBe('Frango com Batata Doce');

      // Now simulate transitioning back online
      Object.defineProperty(navigator, 'onLine', { value: true, configurable: true, writable: true });

      const synced = await syncOfflineActionsWithFirebase();
      expect(synced).toBeGreaterThanOrEqual(1);

      // Verify setDoc was called with merge option and syncedAt timestamp
      expect(mockSetDoc).toHaveBeenCalled();
      const lastCall = mockSetDoc.mock.calls[mockSetDoc.mock.calls.length - 1];
      expect(lastCall[1].food).toBe('Frango com Batata Doce');
      expect(lastCall[1].syncedAt).toBeDefined();

      // Action should be cleared from pending list
      const remaining = await getPendingOfflineActions();
      expect(remaining.find(a => a.id === actionId)).toBeUndefined();
    });
  });
});
