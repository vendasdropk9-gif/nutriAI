import { useEffect, useState, useCallback } from 'react';
import { User } from 'firebase/auth';
import { db } from './firebase';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  collection, 
  getDocs, 
  onSnapshot, 
  serverTimestamp 
} from 'firebase/firestore';
import { UserProfile, IntakeLog, ProgressLog, HydrationLog, WorkoutLog, SleepLog, EmotionalLog, FastingLog, BloodPressureLog, BodyMonitorLog, Note } from '../types';
import { withTimeout } from './bootManager';
import {
  saveProfileToIndexedDB,
  loadProfileFromIndexedDB,
  saveCachedProfileSync,
  loadCachedProfileSync,
} from './profileStorageIDB';

export function useProfileSync(
  user: User | null,
  localProfile: UserProfile | null,
  setLocalProfile: React.Dispatch<React.SetStateAction<UserProfile | null>>
) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOfflineCacheActive, setIsOfflineCacheActive] = useState(false);
  const [lastCachedAt, setLastCachedAt] = useState<string | null>(null);

  // Load from Firestore on mount/user change
  useEffect(() => {
    if (!user) return;

    // Check if user is in guest / demo test mode
    if ((user as any)?.isGuest || user?.uid?.startsWith('guest-')) {
      if (!localProfile) {
        setLocalProfile({
          id: user.uid,
          name: user.displayName || 'Usuário de Teste (Demo)',
          firstName: 'Usuário',
          lastName: 'de Teste',
          email: user.email || 'teste@nutriai.app',
          goals: 'Alimentação saudável, hipertrofia e longevidade',
          restrictions: [],
          allergies: [],
          equipment: ['Halteres', 'Elásticos'],
          plan: 'Premium',
          isPremium: true,
          subscriptionStatus: 'active',
          language: 'pt-BR',
          country: 'Brasil',
          points: 750,
          streak: 5,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
      return;
    }

    // Check user ID - ensure valid document path segment
    const userId = user.uid || (user as any).id || 'current-user';

    let unsubscribeSnapshot: (() => void) | null = null;
    let unsubscribeIntakeLogs: (() => void) | null = null;

    const fetchProfileAndLogs = async () => {
      try {
        setIsSyncing(true);

        // 1. Immediate Persistent Cache Hydration (guarantees goals & mealPlan load offline without network wait)
        const syncCached = loadCachedProfileSync(userId);
        if (syncCached) {
          setLocalProfile((prev) => {
            if (!prev) return syncCached;
            const prevHasMealPlan = Boolean(prev.mealPlan && Object.keys(prev.mealPlan).length > 0);
            const cacheHasMealPlan = Boolean(syncCached.mealPlan && Object.keys(syncCached.mealPlan).length > 0);
            if (!prevHasMealPlan && cacheHasMealPlan) {
              return { ...prev, mealPlan: syncCached.mealPlan, goals: prev.goals || syncCached.goals };
            }
            return prev;
          });
          setLastCachedAt(syncCached.updatedAt || new Date().toISOString());
          if (typeof navigator !== 'undefined' && navigator.onLine === false) {
            setIsOfflineCacheActive(true);
          }
        } else {
          loadProfileFromIndexedDB(userId)
            .then((idbCached) => {
              if (!idbCached) return;
              setLocalProfile((prev) => prev || idbCached);
              setLastCachedAt(idbCached.updatedAt || new Date().toISOString());
              if (typeof navigator !== 'undefined' && navigator.onLine === false) {
                setIsOfflineCacheActive(true);
              }
            })
            .catch(() => {});
        }

        const userDocRef = doc(db, 'users', userId);

        // Listen to live intakeLogs subcollection updates for instant cross-device calorie synchronization
        const intakeLogsColRef = collection(db, 'users', userId, 'intakeLogs');
        unsubscribeIntakeLogs = onSnapshot(intakeLogsColRef, (colSnap) => {
          if (colSnap && colSnap.docs) {
            const liveLogs: IntakeLog[] = colSnap.docs.map((d: any) => {
              const data = d.data();
              return {
                id: d.id,
                date: data.date || data.createdAt || new Date().toISOString(),
                mealId: data.mealId || '',
                recipeName: data.recipeName || 'Refeição Registrada',
                photoURL: data.photoURL || undefined,
                planned: data.planned || { calories: 0, protein: 0, carbs: 0, fat: 0 },
                actual: data.actual || { calories: 0, protein: 0, carbs: 0, fat: 0 },
                adjusted: Boolean(data.adjusted),
                mealType: data.mealType || 'lunch',
                userId: data.userId || userId,
                createdAt: data.createdAt || data.date || new Date().toISOString()
              };
            });
            liveLogs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            
            setLocalProfile((prev) => {
              if (!prev) return prev;
              const prevLogs = prev.intakeLogs || [];
              if (prevLogs.length === liveLogs.length && prevLogs.every((l, idx) => l.id === liveLogs[idx]?.id)) {
                return prev;
              }
              return {
                ...prev,
                intakeLogs: liveLogs
              };
            });
          }
        }, (err) => {
          const msg = err?.message || String(err);
          if (
            msg.includes('Disconnecting idle stream') ||
            msg.includes('Timed out waiting for new targets') ||
            msg.includes('CANCELLED')
          ) {
            console.debug("Firestore intakeLogs stream cycle (handled):", err);
          } else {
            console.warn("Firestore intakeLogs onSnapshot error:", err);
          }
        });
        
        // Listen to live profile updates
        unsubscribeSnapshot = onSnapshot(userDocRef, async (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            
            // Fetch subcollections safely with individual 1.5s timeout per query
            const fetchSubcollection = async (subName: string) => {
              try {
                const subRef = collection(db, 'users', user.uid, subName);
                const querySnapPromise = getDocs(subRef);
                const querySnap = await withTimeout<any>(querySnapPromise, 1500, null, `subcol-${subName}`);
                return querySnap && querySnap.docs ? querySnap.docs.map((d: any) => ({ id: d.id, ...d.data() })) : [];
              } catch (e) {
                console.warn(`Could not load subcollection ${subName}:`, e);
                return [];
              }
            };

            const subcolPromise = Promise.all([
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
            ] = await withTimeout(
              subcolPromise, 
              2500, 
              [[], [], [], [], [], [], [], [], [], []],
              'All Profile Subcollections'
            );

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
              waterReminderStartHour: data.waterReminderStartHour ?? localProfile?.waterReminderStartHour,
              waterReminderEndHour: data.waterReminderEndHour ?? localProfile?.waterReminderEndHour,
              hydrationRemindersEnabled: data.hydrationRemindersEnabled ?? localProfile?.hydrationRemindersEnabled,
              hydrationInterval: data.hydrationInterval ?? localProfile?.hydrationInterval,
              chronotype: data.chronotype || localProfile?.chronotype,
              circadianNotificationConfig: data.circadianNotificationConfig || localProfile?.circadianNotificationConfig,
              waterPushSchedule: data.waterPushSchedule || localProfile?.waterPushSchedule,
              mealRemindersEnabled: data.mealRemindersEnabled ?? true,
              mealNotificationTimes: data.mealNotificationTimes || undefined,
              challengeRemindersEnabled: data.challengeRemindersEnabled ?? true,
              challengeReminderTime: data.challengeReminderTime || '09:00',
              challengeReviewTime: data.challengeReviewTime || '19:00',
              goals: data.goals || data.objective || localProfile?.goals || 'Alimentação saudável e longevidade',
              plan: data.plan || 'Free',
              isPremium: data.plan === 'Premium' || data.isPremium === true,
              subscriptionStatus: data.subscriptionStatus || 'active',
              interests: Array.isArray(data.interests) ? data.interests : (localProfile?.interests || []),
              mutedAdCategories: Array.isArray(data.mutedAdCategories) ? data.mutedAdCategories : (localProfile?.mutedAdCategories || []),
              healthFocus: data.healthFocus || localProfile?.healthFocus || undefined,
              language: data.preferred_language || data.language || 'en-US',
              preferred_language: data.preferred_language || data.language || 'en-US',
              country: data.country || 'United States',
              biometricsEnabled: data.biometricsEnabled || false,
              biometricType: data.biometricType || null,
              createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt || new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              lastAccessAt: new Date().toISOString(),
              preferences: data.preferences || '',
              restrictions: Array.isArray(data.restrictions) ? data.restrictions : [],
              allergies: Array.isArray(data.allergies) ? data.allergies : [],
              equipment: Array.isArray(data.equipment) ? data.equipment : [],
              mealPlan: data.mealPlan || localProfile?.mealPlan || {},
              points: data.points ? Number(data.points) : 0,
              streak: data.streak ? Number(data.streak) : 0,
              badges: Array.isArray(data.badges) ? data.badges : [],
              pointsHistory: Array.isArray(data.pointsHistory) ? data.pointsHistory : [],
              cart: Array.isArray(data.cart) ? data.cart : [],
              favorites: Array.isArray(data.favorites) ? data.favorites : [],
              savedRecipes: Array.isArray(data.savedRecipes) ? data.savedRecipes : (localProfile?.savedRecipes || []),
              anatomicalMarkers: Array.isArray(data.anatomicalMarkers) ? data.anatomicalMarkers : [],
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

            // Conflict Resolution: compare local vs remote updatedAt timestamps (Last-Write-Wins)
            const remoteUpdatedAt = data.updatedAt?.toDate ? data.updatedAt.toDate().getTime() : (data.updatedAt ? new Date(data.updatedAt).getTime() : 0);
            const localUpdatedAt = localProfile?.updatedAt ? new Date(localProfile.updatedAt).getTime() : 0;

            if (localProfile && remoteUpdatedAt > 0 && localUpdatedAt > remoteUpdatedAt + 10000) {
              console.log('[NutriAI Sync] Conflito resolvido: Perfil local possui alterações mais recentes que o Firestore. Sincronizando local para remoto.');
              saveCachedProfileSync(localProfile, userId);
              saveProfileToIndexedDB(localProfile, userId).catch(() => {});
              syncToFirestore(localProfile);
            } else {
              saveCachedProfileSync(remoteProfile, userId);
              saveProfileToIndexedDB(remoteProfile, userId).catch(() => {});
              setLastCachedAt(remoteProfile.updatedAt || new Date().toISOString());
              setIsOfflineCacheActive(Boolean(docSnap?.metadata?.fromCache));
              setLocalProfile(remoteProfile);
            }
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
              targetWeight: localProfile?.targetWeight || null,
              height: localProfile?.height || null,
              goals: localProfile?.goals || 'Alimentação saudável e longevidade',
              waterGoal: localProfile?.waterGoal || 2500,
              mealPlan: localProfile?.mealPlan || {},
              plan: 'Free',
              isPremium: false,
              subscriptionStatus: 'active',
              language: 'en-US',
              country: 'United States',
              biometricsEnabled: false,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
              lastAccessAt: serverTimestamp(),
              preferences: 'Sem preferências gravadas',
              restrictions: localProfile?.restrictions || [],
              allergies: localProfile?.allergies || [],
              equipment: localProfile?.equipment || [],
              interests: localProfile?.interests || [],
              anatomicalMarkers: [],
              points: 100,
              streak: 1
            };

            await setDoc(userDocRef, initialData);

            const createdProfile: UserProfile = {
              id: user.uid,
              name: initialData.name,
              firstName: initialData.firstName,
              lastName: initialData.lastName,
              email: initialData.email,
              photoURL: initialData.photoURL,
              weight: initialData.weight ?? undefined,
              targetWeight: initialData.targetWeight ?? undefined,
              height: initialData.height ?? undefined,
              goals: initialData.goals,
              waterGoal: initialData.waterGoal,
              mealPlan: initialData.mealPlan,
              restrictions: initialData.restrictions || [],
              allergies: initialData.allergies || [],
              equipment: initialData.equipment || [],
              interests: initialData.interests || [],
              anatomicalMarkers: [],
              plan: 'Free',
              isPremium: false,
              subscriptionStatus: 'active',
              language: 'en-US',
              country: 'United States',
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
            };
            saveCachedProfileSync(createdProfile, userId);
            saveProfileToIndexedDB(createdProfile, userId).catch(() => {});
            setLocalProfile(createdProfile);
          }
          setIsSyncing(false);
        }, (err) => {
          const msg = err?.message || String(err);
          if (
            msg.includes('Disconnecting idle stream') ||
            msg.includes('Timed out waiting for new targets') ||
            msg.includes('CANCELLED')
          ) {
            console.debug("Firestore onSnapshot stream cycle (handled):", err);
          } else {
            console.error("Firestore onSnapshot error:", err);
            const fallbackCached = loadCachedProfileSync(userId);
            if (fallbackCached) {
              setIsOfflineCacheActive(true);
              setLocalProfile((prev) => prev || fallbackCached);
            } else {
              loadProfileFromIndexedDB(userId)
                .then((idbCached) => {
                  if (idbCached) {
                    setIsOfflineCacheActive(true);
                    setLocalProfile((prev) => prev || idbCached);
                  }
                })
                .catch(() => {});
            }
          }
          setIsSyncing(false);
        });

      } catch (err) {
        console.error('Firestore profile sync fetch error:', err);
        const fallbackCached = loadCachedProfileSync(userId);
        if (fallbackCached) {
          setIsOfflineCacheActive(true);
          setLocalProfile((prev) => prev || fallbackCached);
        }
        setIsSyncing(false);
      }
    };

    fetchProfileAndLogs();

    return () => {
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
      }
      if (unsubscribeIntakeLogs) {
        unsubscribeIntakeLogs();
      }
    };
  }, [user]);

  // Sync profile changes back to Firestore AND Supabase
  const syncToFirestore = useCallback(async (newProfile: UserProfile) => {
    if (!user) return;
    if ((user as any)?.isGuest || user?.uid?.startsWith('guest-')) {
      return;
    }
    const userId = user.uid || (user as any).id || 'current-user';

    setIsSyncing(true);

    // Always persist full profile (including goals & mealPlan) to local IndexedDB/storage cache first
    saveCachedProfileSync(newProfile, userId);
    saveProfileToIndexedDB(newProfile, userId).catch(() => {});
    setLastCachedAt(new Date().toISOString());

    try {
      // 1. Sync to Firestore
      const userDocRef = doc(db, 'users', userId);
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
        waterReminderStartHour: newProfile.waterReminderStartHour ?? null,
        waterReminderEndHour: newProfile.waterReminderEndHour ?? null,
        hydrationRemindersEnabled: newProfile.hydrationRemindersEnabled ?? newProfile.waterReminderEnabled ?? true,
        hydrationInterval: newProfile.hydrationInterval !== undefined ? String(newProfile.hydrationInterval) : null,
        chronotype: newProfile.chronotype || 'intermediate',
        circadianNotificationConfig: newProfile.circadianNotificationConfig || null,
        waterPushSchedule: newProfile.waterPushSchedule || null,
        mealRemindersEnabled: newProfile.mealRemindersEnabled ?? true,
        mealNotificationTimes: newProfile.mealNotificationTimes || null,
        challengeRemindersEnabled: newProfile.challengeRemindersEnabled ?? true,
        challengeReminderTime: newProfile.challengeReminderTime || '09:00',
        challengeReviewTime: newProfile.challengeReviewTime || '19:00',
        goals: newProfile.goals || 'Alimentação saudável e longevidade',
        mealPlan: newProfile.mealPlan || {},
        interests: newProfile.interests || [],
        mutedAdCategories: newProfile.mutedAdCategories || [],
        healthFocus: newProfile.healthFocus || null,
        plan: newProfile.plan || (newProfile.isPremium ? 'Premium' : 'Free'),
        isPremium: newProfile.plan === 'Premium' || newProfile.isPremium === true,
        subscriptionStatus: newProfile.subscriptionStatus || 'active',
        language: newProfile.preferred_language || newProfile.language || 'en-US',
        preferred_language: newProfile.preferred_language || newProfile.language || 'en-US',
        country: newProfile.country || 'United States',
        biometricsEnabled: newProfile.biometricsEnabled || false,
        biometricType: newProfile.biometricType || null,
        updatedAt: serverTimestamp(),
        lastAccessAt: serverTimestamp(),
        preferences: newProfile.preferences || '',
        restrictions: newProfile.restrictions || [],
        allergies: newProfile.allergies || [],
        equipment: newProfile.equipment || [],
        anatomicalMarkers: newProfile.anatomicalMarkers || [],
        points: newProfile.points || 0,
        streak: newProfile.streak || 0,
        badges: newProfile.badges || [],
        cart: newProfile.cart || [],
        favorites: newProfile.favorites || [],
        savedRecipes: newProfile.savedRecipes || []
      };

      await setDoc(userDocRef, payload, { merge: true });

      // 2. Sync to Supabase (if configured)
      const { supabase, isSupabaseConfigured } = await import('./supabase');
      if (isSupabaseConfigured) {
        try {
          const { error: supabaseError } = await supabase
            .from('profiles')
            .upsert({
              id: user.uid,
              email: newProfile.email || user.email,
              name: newProfile.name,
              firstName: newProfile.firstName || names[0],
              lastName: newProfile.lastName || names.slice(1).join(' '),
              anatomical_markers: newProfile.anatomicalMarkers || [],
              updated_at: new Date().toISOString()
            });
          
          if (supabaseError) {
            console.warn('Supabase profile sync error:', supabaseError.message);
          }
        } catch (subErr) {
          console.warn('Supabase sync failed (non-critical):', subErr);
        }
      }

      // 3. Save subcollections to Firestore subcollections
      const saveSubcollection = async (subName: string, items: any[]) => {
        if (!items || items.length === 0) return;
        for (const item of items) {
          const itemId = item.id || crypto.randomUUID();
          const itemRef = doc(db, 'users', user.uid, subName, itemId);
          const sanitizedPayload: any = {
            ...item,
            id: itemId,
            userId: user.uid,
            createdAt: item.createdAt || item.date || new Date().toISOString(),
            updatedAt: serverTimestamp()
          };
          if (subName === 'intakeLogs') {
            sanitizedPayload.recipeName = item.recipeName || 'Refeição Registrada';
            sanitizedPayload.date = item.date || new Date().toISOString();
            sanitizedPayload.planned = item.planned || { calories: 0, protein: 0, carbs: 0, fat: 0 };
            sanitizedPayload.actual = item.actual || { calories: 0, protein: 0, carbs: 0, fat: 0 };
            sanitizedPayload.adjusted = Boolean(item.adjusted);
          }
          await setDoc(itemRef, sanitizedPayload, { merge: true });
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
  }, [user]);

  // Direct single-log mutations for immediate cross-device broadcast
  const logIntakeToFirestore = useCallback(async (log: IntakeLog) => {
    if (!user) return;
    if ((user as any)?.isGuest || user?.uid?.startsWith('guest-')) {
      return;
    }
    const userId = user.uid || (user as any).id || 'current-user';
    const logId = log.id || `intake_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const logRef = doc(db, 'users', userId, 'intakeLogs', logId);

    const payload = {
      id: logId,
      date: log.date || new Date().toISOString(),
      mealId: log.mealId || '',
      recipeName: log.recipeName || 'Refeição Registrada',
      photoURL: (log as any).photoURL || '',
      planned: log.planned || { calories: 0, protein: 0, carbs: 0, fat: 0 },
      actual: log.actual || { calories: 0, protein: 0, carbs: 0, fat: 0 },
      adjusted: Boolean(log.adjusted),
      mealType: log.mealType || 'lunch',
      userId,
      createdAt: (log as any).createdAt || log.date || new Date().toISOString(),
      updatedAt: serverTimestamp()
    };

    await setDoc(logRef, payload, { merge: true });
  }, [user]);

  const deleteIntakeFromFirestore = useCallback(async (logId: string) => {
    if (!user || (user as any)?.isGuest || user?.uid?.startsWith('guest-')) return;
    const userId = user.uid || (user as any).id || 'current-user';
    const logRef = doc(db, 'users', userId, 'intakeLogs', logId);
    await deleteDoc(logRef);
  }, [user]);

  const getCachedUserProfile = useCallback(async () => {
    const uid = user?.uid || (user as any)?.id || localProfile?.id;
    return loadCachedProfileSync(uid) || (await loadProfileFromIndexedDB(uid));
  }, [user, localProfile?.id]);

  return {
    isSyncing,
    isOfflineCacheActive,
    lastCachedAt,
    syncToFirestore,
    logIntakeToFirestore,
    deleteIntakeFromFirestore,
    getCachedUserProfile,
  };
}
