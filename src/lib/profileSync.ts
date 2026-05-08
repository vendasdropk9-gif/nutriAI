import { useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { UserProfile, IntakeLog, ProgressLog, HydrationLog, WorkoutLog } from '../types';

export function useProfileSync(user: User | null, localProfile: UserProfile | null, setLocalProfile: React.Dispatch<React.SetStateAction<UserProfile | null>>) {
  const [isSyncing, setIsSyncing] = useState(false);

  // Load from Supabase on mount/user change
  useEffect(() => {
    if (!user || !supabase) return;

    const fetchProfile = async () => {
      try {
        const { data, error } = await supabase.from('users').select('*').eq('id', user.id).single();
        if (error && error.code === 'PGRST116') {
          // No profile found, create one
          const newProfile = {
            id: user.id,
            name: localProfile?.name || 'Novo Usuário',
            email: user.email || '',
            goals: localProfile?.goals || 'Me alimentar melhor',
            preferences: 'Sem preferências gravadas',
            restrictions: localProfile?.restrictions || [],
            allergies: localProfile?.allergies || [],
            points: localProfile?.points || 0,
            streak: 0,
            roles: 'user'
          };
          await supabase.from('users').insert(newProfile);
          setLocalProfile(newProfile as unknown as UserProfile);
        } else if (data) {
          // Fetch sub-data using queries
          const profileData = data as any;
          const fetchSub = async (table: string) => {
            const { data: subData } = await supabase.from(table).select('*').eq('user_id', user.id);
            return subData || [];
          };

          profileData.intakeLogs = await fetchSub('intake_logs');
          profileData.progressLogs = await fetchSub('progress_logs');
          profileData.hydrationLogs = await fetchSub('hydration_logs');
          profileData.workoutLogs = await fetchSub('workout_logs');

          setLocalProfile(profileData as UserProfile);
        }
      } catch (e) {
        console.error("Profile sync error: ", e);
      }
    };

    fetchProfile();

    // Listen to changes
    const channel = supabase.channel('user_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users', filter: `id=eq.${user.id}` }, payload => {
        setLocalProfile(prev => prev ? { ...prev, ...payload.new } : payload.new as any);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Sync to Supabase whenever profile changes
  const syncToFirestore = async (newProfile: UserProfile) => {
    if (!user || !supabase) return;
    setIsSyncing(true);
    try {
      const { intakeLogs, progressLogs, hydrationLogs, workoutLogs, email, createdAt, roles, ...updatable } = newProfile as any;
      
      await supabase.from('users').update({
        name: updatable.name,
        goals: updatable.goals,
        preferences: updatable.preferences,
        restrictions: updatable.restrictions,
        allergies: updatable.allergies,
        points: updatable.points,
        streak: updatable.streak,
        masterPlan: updatable.masterPlan,
        bodyType: updatable.bodyType,
        metabolism: updatable.metabolism,
        routine: updatable.routine,
        updated_at: new Date().toISOString()
      }).eq('id', user.id);
      
      // Upsert logs ideally would use upsert or tracking, simplified for now:
      const syncSub = async (items: any[], table: string) => {
        if (!items || items.length === 0) return;
        const toInsert = items.map(item => ({ ...item, user_id: user.id }));
        await supabase.from(table).upsert(toInsert);
      };

      await syncSub(intakeLogs, 'intake_logs');
      await syncSub(progressLogs, 'progress_logs');
      await syncSub(hydrationLogs, 'hydration_logs');
      await syncSub(workoutLogs, 'workout_logs');

    } catch (error) {
      console.error("Sync error:", error);
    } finally {
      setIsSyncing(false);
    }
  };

  return { isSyncing, syncToFirestore };
}


