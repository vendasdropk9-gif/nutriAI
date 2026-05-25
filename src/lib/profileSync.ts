import { useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, onSnapshot, serverTimestamp, collection, query, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { handleFirestoreError, OperationType } from './firebaseUtils';
import { UserProfile, IntakeLog, ProgressLog, HydrationLog, WorkoutLog, SleepLog, EmotionalLog, FastingLog } from '../types';

export function useProfileSync(user: User | null, localProfile: UserProfile | null, setLocalProfile: React.Dispatch<React.SetStateAction<UserProfile | null>>) {
  const [isSyncing, setIsSyncing] = useState(false);

  // Load from Firestore on mount/user change
  useEffect(() => {
    if (!user) return;

    // Check if it is a local simulated user
    const isLocalUser = user.uid.startsWith('local-user-') || user.email?.includes('local');
    if (isLocalUser) {
      return;
    }

    const userRef = doc(db, 'users', user.uid);
    let subUnsubs: (() => void)[] = [];
    
    const unsubscribe = onSnapshot(userRef, async (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        let currentProfile = data as UserProfile;
        
        // Listen to subcollections
        const listenSub = (colName: string, fieldName: keyof UserProfile) => {
          return onSnapshot(collection(userRef, colName), (snaps) => {
            const items = snaps.docs.map(d => ({ id: d.id, ...d.data() }));
            setLocalProfile(prev => {
              if (!prev) return prev;
              return { ...prev, [fieldName]: items };
            });
          }, (error) => {
             try { handleFirestoreError(error, OperationType.GET, `users/${user.uid}/${colName}`); } catch(e) {}
          });
        };
        
        // Only attach if they haven't been
        if (subUnsubs.length === 0) {
          subUnsubs.push(listenSub('intakeLogs', 'intakeLogs'));
          subUnsubs.push(listenSub('progressLogs', 'progressLogs'));
          subUnsubs.push(listenSub('hydrationLogs', 'hydrationLogs'));
          subUnsubs.push(listenSub('workoutLogs', 'workoutLogs'));
          subUnsubs.push(listenSub('sleepLogs', 'sleepLogs'));
          subUnsubs.push(listenSub('emotionalLogs', 'emotionalLogs'));
          subUnsubs.push(listenSub('fastingLogs', 'fastingLogs'));
        }

        // We fetch initially instead of waiting for the subsnapshot to fire so there's no flicker
        try {
          const fetchSub = async (colName: string) => {
            const res = await getDocs(collection(userRef, colName));
            return res.docs.map(d => ({ id: d.id, ...d.data() }));
          };
          currentProfile.intakeLogs = await fetchSub('intakeLogs') as IntakeLog[];
          currentProfile.progressLogs = await fetchSub('progressLogs') as ProgressLog[];
          currentProfile.hydrationLogs = await fetchSub('hydrationLogs') as HydrationLog[];
          currentProfile.workoutLogs = await fetchSub('workoutLogs') as WorkoutLog[];
          currentProfile.sleepLogs = await fetchSub('sleepLogs') as SleepLog[];
          currentProfile.emotionalLogs = await fetchSub('emotionalLogs') as EmotionalLog[];
          currentProfile.fastingLogs = await fetchSub('fastingLogs') as FastingLog[];
        } catch (e) {
          console.error("Error fetching subcollections", e);
        }

        setLocalProfile(currentProfile);

      } else {
        // Create user profile document conforming to rules
        const newProfile: Partial<UserProfile> = {
          name: user.displayName || localProfile?.name || 'Novo Usuário',
          email: user.email || '',
          goals: localProfile?.goals || 'Me alimentar melhor',
          preferences: 'Sem preferências gravadas',
          restrictions: localProfile?.restrictions || [],
          allergies: localProfile?.allergies || [],
          points: localProfile?.points || 0,
          streak: 0,
          createdAt: serverTimestamp() as any,
          updatedAt: serverTimestamp() as any,
        };

        const createInitialDoc = async () => {
          try {
            await setDoc(userRef, newProfile);
          } catch (err) {
            try { handleFirestoreError(err, OperationType.CREATE, `users/${user.uid}`); } catch(e) {}
          }
        };
        createInitialDoc();
      }
    }, (error) => {
        try { handleFirestoreError(error, OperationType.GET, `users/${user.uid}`); } catch(e) {}
    });

    return () => {
      unsubscribe();
      subUnsubs.forEach(u => u());
    };
  }, [user]);

  // Sync to Firestore whenever profile changes
  const syncToFirestore = async (newProfile: UserProfile) => {
    if (!user) return;
    const isLocalUser = user.uid.startsWith('local-user-') || user.email?.includes('local');
    if (isLocalUser) return;

    setIsSyncing(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      const snap = await getDoc(userRef);
      
      const { 
        intakeLogs, 
        progressLogs, 
        hydrationLogs, 
        workoutLogs, 
        sleepLogs, 
        emotionalLogs, 
        fastingLogs, 
        email, 
        createdAt, 
        role, 
        ...updatable 
      } = newProfile as any;
      
      if (snap.exists()) {
        await updateDoc(userRef, {
          ...updatable,
          updatedAt: serverTimestamp()
        });
      } else {
        await setDoc(userRef, {
          ...updatable,
          email: user.email || '',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
      
      // Handle subcollections (write missing ones)
      const syncSub = async (items: any[], colName: string) => {
        if (!items) return;
        const colRef = collection(userRef, colName);
        for (const item of items) {
          if (!item.id || item.id.startsWith('_client')) continue; // Skip temporary ones if we want, or generate correct ids
          const docRef = doc(colRef, item.id || crypto.randomUUID());
          const itemSnap = await getDoc(docRef);
          if (!itemSnap.exists()) {
             await setDoc(docRef, { ...item, userId: user.uid, createdAt: serverTimestamp() });
          }
        }
      };

      await syncSub(intakeLogs, 'intakeLogs');
      await syncSub(progressLogs, 'progressLogs');
      await syncSub(hydrationLogs, 'hydrationLogs');
      await syncSub(workoutLogs, 'workoutLogs');
      await syncSub(sleepLogs, 'sleepLogs');
      await syncSub(emotionalLogs, 'emotionalLogs');
      await syncSub(fastingLogs, 'fastingLogs');

    } catch (error) {
      try { handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`); } catch(e) {}
    } finally {
      setIsSyncing(false);
    }
  };

  return { isSyncing, syncToFirestore };
}

