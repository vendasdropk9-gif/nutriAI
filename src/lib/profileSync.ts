import { useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { supabase, isSupabaseConfigured } from './supabase';
import { UserProfile, IntakeLog, ProgressLog, HydrationLog, WorkoutLog, SleepLog, EmotionalLog, FastingLog, BloodPressureLog, BodyMonitorLog, Note } from '../types';

// Serialization helpers to translate between PostgreSQL snake_case and TypeScript camelCase

function mapProfileToDb(profile: any, userId: string) {
  return {
    id: userId,
    name: profile.name || 'Novo Usuário',
    email: profile.email || '',
    photo_url: profile.photoURL || null,
    language: profile.language || 'pt',
    preferences: profile.preferences || 'Sem preferências gravadas',
    restrictions: profile.restrictions || [],
    allergies: profile.allergies || [],
    goals: profile.goals || 'Me alimentar melhor',
    equipment: profile.equipment || [],
    weight: profile.weight !== undefined ? Number(profile.weight) : null,
    height: profile.height !== undefined ? Number(profile.height) : null,
    age: profile.age !== undefined ? Number(profile.age) : null,
    activity_level: profile.activityLevel || null,
    gender: profile.gender || null,
    target_weight: profile.targetWeight !== undefined ? Number(profile.targetWeight) : null,
    skin_tone: profile.skinTone || null,
    hair_color: profile.hairColor || null,
    body_type: profile.bodyType || null,
    metabolism: profile.metabolism || null,
    routine: profile.routine || null,
    water_goal: profile.waterGoal !== undefined ? Number(profile.waterGoal) : 2000,
    water_reminder_enabled: profile.waterReminderEnabled !== undefined ? profile.waterReminderEnabled : true,
    water_reminder_interval_minutes: profile.waterReminderIntervalMinutes !== undefined ? Number(profile.waterReminderIntervalMinutes) : 60,
    water_reminder_start_hour: profile.waterReminderStartHour !== undefined ? Number(profile.waterReminderStartHour) : 8,
    water_reminder_end_hour: profile.waterReminderEndHour !== undefined ? Number(profile.waterReminderEndHour) : 22,
    points: profile.points !== undefined ? Number(profile.points) : 0,
    streak: profile.streak !== undefined ? Number(profile.streak) : 0,
    last_active_date: profile.lastActiveDate || null,
    badges: profile.badges || [],
  };
}

function mapDbToProfile(dbRow: any): Partial<UserProfile> {
  return {
    id: dbRow.id,
    name: dbRow.name,
    email: dbRow.email,
    photoURL: dbRow.photo_url,
    language: dbRow.language || 'pt',
    preferences: dbRow.preferences,
    restrictions: dbRow.restrictions || [],
    allergies: dbRow.allergies || [],
    goals: dbRow.goals,
    equipment: dbRow.equipment || [],
    weight: dbRow.weight ? Number(dbRow.weight) : undefined,
    height: dbRow.height ? Number(dbRow.height) : undefined,
    age: dbRow.age ? Number(dbRow.age) : undefined,
    activityLevel: dbRow.activity_level,
    gender: dbRow.gender,
    targetWeight: dbRow.target_weight ? Number(dbRow.target_weight) : undefined,
    skinTone: dbRow.skin_tone,
    hairColor: dbRow.hair_color,
    bodyType: dbRow.body_type,
    metabolism: dbRow.metabolism,
    routine: dbRow.routine,
    waterGoal: dbRow.water_goal ? Number(dbRow.water_goal) : undefined,
    waterReminderEnabled: dbRow.water_reminder_enabled,
    waterReminderIntervalMinutes: dbRow.water_reminder_interval_minutes,
    waterReminderStartHour: dbRow.water_reminder_start_hour,
    waterReminderEndHour: dbRow.water_reminder_end_hour,
    points: dbRow.points ? Number(dbRow.points) : 0,
    streak: dbRow.streak ? Number(dbRow.streak) : 0,
    lastActiveDate: dbRow.last_active_date,
    badges: dbRow.badges || [],
  };
}

function mapIntakeLogToDb(log: any, userId: string) {
  return {
    id: log.id || crypto.randomUUID(),
    user_id: userId,
    date: log.date,
    meal_id: log.mealId || '',
    recipe_name: log.recipeName || '',
    planned_calories: log.planned?.calories || 0,
    planned_protein: log.planned?.protein || 0,
    planned_carbs: log.planned?.carbs || 0,
    planned_fat: log.planned?.fat || 0,
    actual_calories: log.actual?.calories || 0,
    actual_protein: log.actual?.protein || 0,
    actual_carbs: log.actual?.carbs || 0,
    actual_fat: log.actual?.fat || 0,
    adjusted: log.adjusted || false,
  };
}

function mapDbToIntakeLog(row: any): IntakeLog {
  return {
    id: row.id,
    date: row.date,
    mealId: row.meal_id,
    recipeName: row.recipe_name,
    planned: {
      calories: Number(row.planned_calories),
      protein: Number(row.planned_protein),
      carbs: Number(row.planned_carbs),
      fat: Number(row.planned_fat),
    },
    actual: {
      calories: Number(row.actual_calories),
      protein: Number(row.actual_protein),
      carbs: Number(row.actual_carbs),
      fat: Number(row.actual_fat),
    },
    adjusted: row.adjusted,
  };
}

function mapProgressLogToDb(log: any, userId: string) {
  return {
    id: log.id || crypto.randomUUID(),
    user_id: userId,
    date: log.date,
    weight: Number(log.weight),
    body_fat: log.bodyFat !== undefined ? Number(log.bodyFat) : null,
    notes: log.notes || null,
  };
}

function mapDbToProgressLog(row: any): ProgressLog {
  return {
    id: row.id,
    date: row.date,
    weight: Number(row.weight),
    bodyFat: row.body_fat ? Number(row.body_fat) : undefined,
    notes: row.notes,
  };
}

function mapHydrationLogToDb(log: any, userId: string) {
  return {
    id: log.id || crypto.randomUUID(),
    user_id: userId,
    date: log.date,
    amount: Number(log.amount),
    source: log.source || 'Filtrada',
  };
}

function mapDbToHydrationLog(row: any): HydrationLog {
  return {
    id: row.id,
    date: row.date,
    amount: Number(row.amount),
    source: row.source,
  };
}

function mapWorkoutLogToDb(log: any, userId: string) {
  return {
    id: log.id || crypto.randomUUID(),
    user_id: userId,
    date: log.date,
    completed: log.completed || false,
    duration_minutes: Number(log.durationMinutes),
    intensity: log.intensity || 'Moderado',
  };
}

function mapDbToWorkoutLog(row: any): WorkoutLog {
  return {
    id: row.id,
    date: row.date,
    completed: row.completed,
    durationMinutes: Number(row.duration_minutes),
    intensity: row.intensity as any,
  };
}

function mapSleepLogToDb(log: any, userId: string) {
  return {
    id: log.id || crypto.randomUUID(),
    user_id: userId,
    date: log.date,
    duration_hours: Number(log.durationHours),
    quality: log.quality || 'Bom',
  };
}

function mapDbToSleepLog(row: any): SleepLog {
  return {
    id: row.id,
    date: row.date,
    durationHours: Number(row.duration_hours),
    quality: row.quality as any,
  };
}

function mapEmotionalLogToDb(log: any, userId: string) {
  return {
    id: log.id || crypto.randomUUID(),
    user_id: userId,
    date: log.date,
    mood: log.mood,
    trigger: log.trigger || null,
    meal_type: log.mealType || null,
  };
}

function mapDbToEmotionalLog(row: any): EmotionalLog {
  return {
    id: row.id,
    date: row.date,
    mood: row.mood,
    trigger: row.trigger,
    mealType: row.meal_type,
  };
}

function mapFastingLogToDb(log: any, userId: string) {
  return {
    id: log.id || crypto.randomUUID(),
    user_id: userId,
    date: log.date,
    duration_hours: Number(log.durationHours),
  };
}

function mapDbToFastingLog(row: any): FastingLog {
  return {
    id: row.id,
    date: row.date,
    durationHours: Number(row.duration_hours),
  };
}

function mapBloodPressureLogToDb(log: any, userId: string) {
  return {
    id: log.id || crypto.randomUUID(),
    user_id: userId,
    date: log.date,
    systolic: Number(log.systolic),
    diastolic: Number(log.diastolic),
    bpm: Number(log.bpm),
    notes: log.notes || null,
  };
}

function mapDbToBloodPressureLog(row: any): BloodPressureLog {
  return {
    id: row.id,
    date: row.date,
    systolic: Number(row.systolic),
    diastolic: Number(row.diastolic),
    bpm: Number(row.bpm),
    notes: row.notes,
    userId: row.user_id,
  };
}

function mapBodyMonitorLogToDb(log: any, userId: string) {
  return {
    id: log.id || crypto.randomUUID(),
    user_id: userId,
    date: log.date,
    heart_rate: Number(log.heartRate),
    stress_level: Number(log.stressLevel),
    fatigue_level: Number(log.fatigueLevel),
    anxiety_level: Number(log.anxietyLevel),
    notes: log.notes || null,
    facial_scan_consent: log.facialScanConsent || false,
    finger_scan_consent: log.fingerScanConsent || false,
    status: log.status || 'normal',
  };
}

function mapDbToBodyMonitorLog(row: any): BodyMonitorLog {
  return {
    id: row.id,
    date: row.date,
    heartRate: Number(row.heart_rate),
    stressLevel: Number(row.stress_level),
    fatigueLevel: Number(row.fatigue_level),
    anxietyLevel: Number(row.anxiety_level),
    notes: row.notes,
    facialScanConsent: row.facial_scan_consent,
    fingerScanConsent: row.finger_scan_consent,
    status: row.status as any,
    userId: row.user_id,
  };
}

function mapNoteToDb(note: any, userId: string) {
  return {
    id: note.id || crypto.randomUUID(),
    user_id: userId,
    title: note.title,
    content: note.content,
    category: note.category || null,
    tags: note.tags || [],
  };
}

function mapDbToNote(row: any): Note {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    content: row.content,
    category: row.category,
    tags: row.tags || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function useProfileSync(
  user: User | null,
  localProfile: UserProfile | null,
  setLocalProfile: React.Dispatch<React.SetStateAction<UserProfile | null>>
) {
  const [isSyncing, setIsSyncing] = useState(false);

  // Load from Supabase on mount/user change
  useEffect(() => {
    if (!user || !isSupabaseConfigured) return;

    // Check if it is a local simulated user
    const isLocalUser = user.uid.startsWith('local-user-') || user.email?.includes('local');
    if (isLocalUser) {
      return;
    }

    const fetchProfileAndLogs = async () => {
      try {
        setIsSyncing(true);
        // Fetch profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.uid)
          .maybeSingle();

        if (profileError) {
          console.error('Error fetching Supabase profile:', profileError.message);
          return;
        }

        if (profileData) {
          const currentProfile = mapDbToProfile(profileData) as UserProfile;

          // Fetch all sub-collections in parallel using Supabase
          const [
            intakeLogsRes,
            progressLogsRes,
            hydrationLogsRes,
            workoutLogsRes,
            sleepLogsRes,
            emotionalLogsRes,
            fastingLogsRes,
            bloodPressureLogsRes,
            bodyMonitorLogsRes,
            notesRes,
          ] = await Promise.all([
            supabase.from('intake_logs').select('*').eq('user_id', user.uid),
            supabase.from('progress_logs').select('*').eq('user_id', user.uid),
            supabase.from('hydration_logs').select('*').eq('user_id', user.uid),
            supabase.from('workout_logs').select('*').eq('user_id', user.uid),
            supabase.from('sleep_logs').select('*').eq('user_id', user.uid),
            supabase.from('emotional_logs').select('*').eq('user_id', user.uid),
            supabase.from('fasting_logs').select('*').eq('user_id', user.uid),
            supabase.from('blood_pressure_logs').select('*').eq('user_id', user.uid),
            supabase.from('body_monitor_logs').select('*').eq('user_id', user.uid),
            supabase.from('notes').select('*').eq('user_id', user.uid),
          ]);

          currentProfile.intakeLogs = (intakeLogsRes.data || []).map(mapDbToIntakeLog);
          currentProfile.progressLogs = (progressLogsRes.data || []).map(mapDbToProgressLog);
          currentProfile.hydrationLogs = (hydrationLogsRes.data || []).map(mapDbToHydrationLog);
          currentProfile.workoutLogs = (workoutLogsRes.data || []).map(mapDbToWorkoutLog);
          currentProfile.sleepLogs = (sleepLogsRes.data || []).map(mapDbToSleepLog);
          currentProfile.emotionalLogs = (emotionalLogsRes.data || []).map(mapDbToEmotionalLog);
          currentProfile.fastingLogs = (fastingLogsRes.data || []).map(mapDbToFastingLog);
          currentProfile.bloodPressureLogs = (bloodPressureLogsRes.data || []).map(mapDbToBloodPressureLog);
          currentProfile.bodyMonitorLogs = (bodyMonitorLogsRes.data || []).map(mapDbToBodyMonitorLog);
          currentProfile.notes = (notesRes.data || []).map(mapDbToNote);

          setLocalProfile(currentProfile);
        } else {
          // Profile does not exist yet, create it
          const initialProfile: UserProfile = {
            name: user.displayName || localProfile?.name || 'Novo Usuário',
            email: user.email || '',
            goals: localProfile?.goals || 'Me alimentar melhor',
            preferences: 'Sem preferências gravadas',
            restrictions: localProfile?.restrictions || [],
            allergies: localProfile?.allergies || [],
            equipment: localProfile?.equipment || [],
            points: localProfile?.points || 0,
            streak: 0,
          };

          const dbProfile = mapProfileToDb(initialProfile, user.uid);
          const { error: insertError } = await supabase.from('profiles').insert(dbProfile);

          if (insertError) {
            console.error('Error creating profile in Supabase:', insertError.message);
          } else {
            setLocalProfile({
              ...initialProfile,
              id: user.uid,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              intakeLogs: [],
              progressLogs: [],
              hydrationLogs: [],
              workoutLogs: [],
              sleepLogs: [],
              emotionalLogs: [],
              fastingLogs: [],
              bloodPressureLogs: [],
              bodyMonitorLogs: [],
              notes: [],
            });
          }
        }
      } catch (err) {
        console.error('Supabase fetching/syncing catch error:', err);
      } finally {
        setIsSyncing(false);
      }
    };

    fetchProfileAndLogs();
  }, [user]);

  // Sync to Supabase when profile updates
  const syncToFirestore = async (newProfile: UserProfile) => {
    if (!user || !isSupabaseConfigured) return;
    const isLocalUser = user.uid.startsWith('local-user-') || user.email?.includes('local');
    if (isLocalUser) return;

    setIsSyncing(true);
    try {
      // 1. Update/Upsert the profiles row
      const dbProfile = mapProfileToDb(newProfile, user.uid);
      const { error: upsertError } = await supabase
        .from('profiles')
        .upsert(dbProfile);

      if (upsertError) {
        console.error('Error upserting Supabase profile:', upsertError.message);
      }

      // 2. Upsert sub-collections
      const syncSub = async (items: any[], tableName: string, mapper: (item: any, userId: string) => any) => {
        if (!items || items.length === 0) return;
        const dbRows = items.map(item => mapper(item, user.uid));
        
        // Execute upsert in chunks or fully
        const { error: subError } = await supabase
          .from(tableName)
          .upsert(dbRows);

        if (subError) {
          console.error(`Error upserting ${tableName} in Supabase:`, subError.message);
        }
      };

      await Promise.all([
        syncSub(newProfile.intakeLogs || [], 'intake_logs', mapIntakeLogToDb),
        syncSub(newProfile.progressLogs || [], 'progress_logs', mapProgressLogToDb),
        syncSub(newProfile.hydrationLogs || [], 'hydration_logs', mapHydrationLogToDb),
        syncSub(newProfile.workoutLogs || [], 'workout_logs', mapWorkoutLogToDb),
        syncSub(newProfile.sleepLogs || [], 'sleep_logs', mapSleepLogToDb),
        syncSub(newProfile.emotionalLogs || [], 'emotional_logs', mapEmotionalLogToDb),
        syncSub(newProfile.fastingLogs || [], 'fasting_logs', mapFastingLogToDb),
        syncSub(newProfile.bloodPressureLogs || [], 'blood_pressure_logs', mapBloodPressureLogToDb),
        syncSub(newProfile.bodyMonitorLogs || [], 'body_monitor_logs', mapBodyMonitorLogToDb),
        syncSub(newProfile.notes || [], 'notes', mapNoteToDb),
      ]);
    } catch (err) {
      console.error('Failed to sync to Supabase:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  return { isSyncing, syncToFirestore };
}
