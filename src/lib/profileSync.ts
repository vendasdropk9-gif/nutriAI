import { useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { db, doc, getDoc, setDoc, updateDoc, collection, getDocs, onSnapshot, serverTimestamp } from './firebase';
import { UserProfile, IntakeLog, ProgressLog, HydrationLog, WorkoutLog, SleepLog, EmotionalLog, FastingLog, BloodPressureLog, BodyMonitorLog, Note } from '../types';

export function useProfileSync(
  user: User | null,
  localProfile: UserProfile | null,
  setLocalProfile: React.Dispatch<React.SetStateAction<UserProfile | null>>
) {
  const [isSyncing, setIsSyncing] = useState(false);

  // Load from Firestore on mount/user change
  useEffect(() => {
    if (!user) return;

    // Check if it is a local simulated user
    const isLocalUser = user.uid.startsWith('local-user-') || user.email?.includes('local');
    if (isLocalUser) return;

    let unsubscribeSnapshot: (() => void) | null = null;

    const fetchProfileAndLogs = async () => {
      try {
        setIsSyncing(true);
        const userDocRef = doc(db, 'users', user.uid);
        
        // Listen to live profile updates
        unsubscribeSnapshot = onSnapshot(userDocRef, async (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            
            // Fetch subcollections from Firestore
            const fetchSubcollection = async (subName: string) => {
              try {
                const subRef = collection(db, 'users', user.uid, subName);
                const querySnap = await getDocs(subRef);
                return querySnap.docs.map(d => ({ id: d.id, ...d.data() }));
              } catch (e) {
                console.warn(`Could not load subcollection ${subName}:`, e);
                return [];
              }
            };

            const [
              intakeLogs,
              progressLogs,
              hydrationLogs,
              workoutLogs,
              sleepLogs,
              emotionalLogs,
              fastingLogs,
              bloodPressureLogs,
              bodyMonitorLogs,
              notes
            ] = await Promise.all([
              fetchSubcollection('intakeLogs'),
              fetchSubcollection('progressLogs'),
              fetchSubcollection('hydrationLogs'),
              fetchSubcollection('workoutLogs'),
              fetchSubcollection('sleepLogs'),
              fetchSubcollection('emotionalLogs'),
              fetchSubcollection('fastingLogs'),
              fetchSubcollection('bloodPressureLogs'),
              fetchSubcollection('bodyMonitorLogs'),
              fetchSubcollection('notes')
            ]);

            const remoteProfile: UserProfile = {
              id: user.uid,
              name: data.displayName || data.name || user.displayName || 'Usuário NutriAI',
              firstName: data.firstName || '',
              lastName: data.lastName || '',
              email: data.email || user.email || '',
              phone: data.phone || '',
              photoURL: data.photoURL || user.photoURL || null,
              birthDate: data.birthDate || '',
              gender: data.gender || 'Não informado',
              weight: data.weight !== undefined && data.weight !== null ? Number(data.weight) : undefined,
              targetWeight: data.targetWeight !== undefined && data.targetWeight !== null ? Number(data.targetWeight) : undefined,
              height: data.height !== undefined && data.height !== null ? Number(data.height) : undefined,
              age: data.age !== undefined && data.age !== null ? Number(data.age) : undefined,
              activityLevel: data.activityLevel || '',
              skinTone: data.skinTone || '',
              hairColor: data.hairColor || '',
              bodyType: data.bodyType || undefined,
              metabolism: data.metabolism || undefined,
              routine: data.routine || '',
              waterGoal: data.waterGoal !== undefined && data.waterGoal !== null ? Number(data.waterGoal) : 2500,
              waterReminderEnabled: data.waterReminderEnabled ?? true,
              waterReminderIntervalMinutes: data.waterReminderIntervalMinutes ?? 60,
              goals: data.goals || data.objective || 'Alimentação saudável e longevidade',
              plan: data.plan || 'Free',
              isPremium: data.plan === 'Premium' || data.isPremium === true,
              subscriptionStatus: data.subscriptionStatus || 'active',
              language: data.language || 'pt-BR',
              country: data.country || 'Brasil',
              biometricsEnabled: data.biometricsEnabled || false,
              biometricType: data.biometricType || null,
              createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt || new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              lastAccessAt: new Date().toISOString(),
              preferences: data.preferences || '',
              restrictions: Array.isArray(data.restrictions) ? data.restrictions : [],
              allergies: Array.isArray(data.allergies) ? data.allergies : [],
              equipment: Array.isArray(data.equipment) ? data.equipment : [],
              points: data.points ? Number(data.points) : 0,
              streak: data.streak ? Number(data.streak) : 0,
              badges: Array.isArray(data.badges) ? data.badges : [],
              pointsHistory: Array.isArray(data.pointsHistory) ? data.pointsHistory : [],
              cart: Array.isArray(data.cart) ? data.cart : [],
              favorites: Array.isArray(data.favorites) ? data.favorites : [],
              savedRecipes: Array.isArray(data.savedRecipes) ? data.savedRecipes : [],
              intakeLogs: (intakeLogs && intakeLogs.length > 0 ? intakeLogs : data.intakeLogs || []) as IntakeLog[],
              progressLogs: (progressLogs && progressLogs.length > 0 ? progressLogs : data.progressLogs || []) as ProgressLog[],
              hydrationLogs: (hydrationLogs && hydrationLogs.length > 0 ? hydrationLogs : data.hydrationLogs || []) as HydrationLog[],
              workoutLogs: (workoutLogs && workoutLogs.length > 0 ? workoutLogs : data.workoutLogs || []) as WorkoutLog[],
              sleepLogs: (sleepLogs && sleepLogs.length > 0 ? sleepLogs : data.sleepLogs || []) as SleepLog[],
              emotionalLogs: (emotionalLogs && emotionalLogs.length > 0 ? emotionalLogs : data.emotionalLogs || []) as EmotionalLog[],
              fastingLogs: (fastingLogs && fastingLogs.length > 0 ? fastingLogs : data.fastingLogs || []) as FastingLog[],
              bloodPressureLogs: (bloodPressureLogs && bloodPressureLogs.length > 0 ? bloodPressureLogs : data.bloodPressureLogs || []) as BloodPressureLog[],
              bodyMonitorLogs: (bodyMonitorLogs && bodyMonitorLogs.length > 0 ? bodyMonitorLogs : data.bodyMonitorLogs || []) as BodyMonitorLog[],
              notes: (notes && notes.length > 0 ? notes : data.notes || []) as Note[]
            };

            setLocalProfile(remoteProfile);
          } else {
            // Profile does not exist in Firestore yet, create it!
            const names = (user.displayName || '').split(' ');
            const firstName = names[0] || 'Usuário';
            const lastName = names.slice(1).join(' ') || '';

            const initialData = {
              uid: user.uid,
              name: user.displayName || 'Usuário NutriAI',
              firstName,
              lastName,
              displayName: user.displayName || 'Usuário NutriAI',
              email: user.email || '',
              phone: '',
              photoURL: user.photoURL || null,
              birthDate: '',
              gender: 'Não informado',
              weight: localProfile?.weight || null,
              height: localProfile?.height || null,
              goals: localProfile?.goals || 'Alimentação saudável e longevidade',
              plan: 'Free',
              isPremium: false,
              subscriptionStatus: 'active',
              language: 'pt-BR',
              country: 'Brasil',
              biometricsEnabled: false,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
              lastAccessAt: serverTimestamp(),
              preferences: 'Sem preferências gravadas',
              restrictions: localProfile?.restrictions || [],
              allergies: localProfile?.allergies || [],
              equipment: localProfile?.equipment || [],
              points: 100,
              streak: 1
            };

            await setDoc(userDocRef, initialData);

            setLocalProfile({
              id: user.uid,
              name: initialData.name,
              firstName: initialData.firstName,
              lastName: initialData.lastName,
              email: initialData.email,
              photoURL: initialData.photoURL,
              goals: initialData.goals,
              restrictions: initialData.restrictions || [],
              allergies: initialData.allergies || [],
              equipment: initialData.equipment || [],
              plan: 'Free',
              isPremium: false,
              subscriptionStatus: 'active',
              language: 'pt-BR',
              country: 'Brasil',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              points: 100,
              streak: 1,
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
            });
          }
          setIsSyncing(false);
        }, (err) => {
          console.error("Firestore onSnapshot error:", err);
          setIsSyncing(false);
        });

      } catch (err) {
        console.error('Firestore profile sync fetch error:', err);
        setIsSyncing(false);
      }
    };

    fetchProfileAndLogs();

    return () => {
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
      }
    };
  }, [user]);

  // Sync profile changes back to Firestore
  const syncToFirestore = async (newProfile: UserProfile) => {
    if (!user) return;
    const isLocalUser = user.uid.startsWith('local-user-') || user.email?.includes('local');
    if (isLocalUser) return;

    setIsSyncing(true);
    try {
      const userDocRef = doc(db, 'users', user.uid);
      const names = (newProfile.name || '').split(' ');
      
      const payload: Record<string, any> = {
        uid: user.uid,
        name: newProfile.name || 'Usuário NutriAI',
        firstName: newProfile.firstName || names[0] || '',
        lastName: newProfile.lastName || names.slice(1).join(' ') || '',
        displayName: newProfile.name || 'Usuário NutriAI',
        email: newProfile.email || user.email || '',
        phone: newProfile.phone || '',
        photoURL: newProfile.photoURL || user.photoURL || null,
        birthDate: newProfile.birthDate || '',
        gender: newProfile.gender || 'Não informado',
        weight: newProfile.weight !== undefined && newProfile.weight !== null ? Number(newProfile.weight) : null,
        targetWeight: newProfile.targetWeight !== undefined && newProfile.targetWeight !== null ? Number(newProfile.targetWeight) : null,
        height: newProfile.height !== undefined && newProfile.height !== null ? Number(newProfile.height) : null,
        age: newProfile.age !== undefined && newProfile.age !== null ? Number(newProfile.age) : null,
        activityLevel: newProfile.activityLevel || '',
        skinTone: newProfile.skinTone || '',
        hairColor: newProfile.hairColor || '',
        bodyType: newProfile.bodyType || null,
        metabolism: newProfile.metabolism || null,
        routine: newProfile.routine || '',
        waterGoal: newProfile.waterGoal !== undefined && newProfile.waterGoal !== null ? Number(newProfile.waterGoal) : 2500,
        waterReminderEnabled: newProfile.waterReminderEnabled ?? true,
        waterReminderIntervalMinutes: newProfile.waterReminderIntervalMinutes ?? 60,
        goals: newProfile.goals || 'Alimentação saudável e longevidade',
        plan: newProfile.plan || (newProfile.isPremium ? 'Premium' : 'Free'),
        isPremium: newProfile.plan === 'Premium' || newProfile.isPremium === true,
        subscriptionStatus: newProfile.subscriptionStatus || 'active',
        language: newProfile.language || 'pt-BR',
        country: newProfile.country || 'Brasil',
        biometricsEnabled: newProfile.biometricsEnabled || false,
        biometricType: newProfile.biometricType || null,
        updatedAt: serverTimestamp(),
        lastAccessAt: serverTimestamp(),
        preferences: newProfile.preferences || '',
        restrictions: newProfile.restrictions || [],
        allergies: newProfile.allergies || [],
        equipment: newProfile.equipment || [],
        points: newProfile.points || 0,
        streak: newProfile.streak || 0,
        badges: newProfile.badges || [],
        cart: newProfile.cart || [],
        favorites: newProfile.favorites || [],
        savedRecipes: newProfile.savedRecipes || []
      };

      await setDoc(userDocRef, payload, { merge: true });

      // Save subcollections to Firestore subcollections
      const saveSubcollection = async (subName: string, items: any[]) => {
        if (!items || items.length === 0) return;
        for (const item of items) {
          const itemId = item.id || crypto.randomUUID();
          const itemRef = doc(db, 'users', user.uid, subName, itemId);
          await setDoc(itemRef, { ...item, id: itemId, userId: user.uid, updatedAt: serverTimestamp() }, { merge: true });
        }
      };

      await Promise.all([
        saveSubcollection('intakeLogs', newProfile.intakeLogs || []),
        saveSubcollection('progressLogs', newProfile.progressLogs || []),
        saveSubcollection('hydrationLogs', newProfile.hydrationLogs || []),
        saveSubcollection('workoutLogs', newProfile.workoutLogs || []),
        saveSubcollection('sleepLogs', newProfile.sleepLogs || []),
        saveSubcollection('emotionalLogs', newProfile.emotionalLogs || []),
        saveSubcollection('fastingLogs', newProfile.fastingLogs || []),
        saveSubcollection('bloodPressureLogs', newProfile.bloodPressureLogs || []),
        saveSubcollection('bodyMonitorLogs', newProfile.bodyMonitorLogs || []),
        saveSubcollection('notes', newProfile.notes || [])
      ]);

    } catch (err) {
      console.error('Failed to sync profile to Firestore:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  return { isSyncing, syncToFirestore };
}
