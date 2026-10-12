import { UserProfile, WorkoutLog } from '../types';

export interface HydrationAnalysis {
  temperature: number;
  climateCondition: 'quente' | 'moderado' | 'frio';
  hasWorkoutToday: boolean;
  workoutIntensity?: string;
  recommendedIntervalMinutes: number;
  recommendedWaterTotal: number;
  pushTitle: string;
  pushMessage: string;
}

export async function analyzeSmartHydration(profile: UserProfile | null): Promise<HydrationAnalysis> {
  let temperature = 28; // Default warm Brazilian climate
  let climateCondition: 'quente' | 'moderado' | 'frio' = 'quente';

  // Try fetching real geolocation weather if possible
  try {
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      await new Promise<void>((resolve) => {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            try {
              const { latitude, longitude } = pos.coords;
              const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m`);
              const data = await res.json();
              if (data?.current?.temperature_2m !== undefined) {
                temperature = data.current.temperature_2m;
              }
            } catch (e) {
              // fallback
            }
            resolve();
          },
          () => resolve(),
          { timeout: 3000 }
        );
      });
    }
  } catch (e) {
    // ignore
  }

  if (temperature >= 27) {
    climateCondition = 'quente';
  } else if (temperature <= 20) {
    climateCondition = 'frio';
  } else {
    climateCondition = 'moderado';
  }

  // Check today's workout logs
  const todayStr = new Date().toISOString().split('T')[0];
  const workoutLogs = profile?.workoutLogs || [];
  const todayWorkout = workoutLogs.find(log => log.date && log.date.startsWith(todayStr) && log.completed);

  // Calculate base water target (35ml per kg) + weather bonus + workout bonus
  const baseWeight = profile?.weight || 70;
  let recommendedWaterTotal = Math.round(baseWeight * 35);

  let intervalMinutes = 60; // Base interval

  if (climateCondition === 'quente') {
    recommendedWaterTotal += 500;
    intervalMinutes -= 15; // Drink more frequently
  } else if (climateCondition === 'frio') {
    intervalMinutes += 10;
  }

  if (todayWorkout) {
    recommendedWaterTotal += todayWorkout.durationMinutes > 30 ? 600 : 300;
    intervalMinutes -= 15; // More frequent during workout days
    if (intervalMinutes < 30) intervalMinutes = 30; // Minimum interval
  }

  // Build smart notification copy
  let pushTitle = "💧 Pausa Inteligente de Hidratação";
  let pushMessage = `Clima atual: ${Math.round(temperature)}°C (${climateCondition}).`;

  if (todayWorkout) {
    pushMessage += ` Com base no seu treino de hoje (${todayWorkout.intensity}, ${todayWorkout.durationMinutes}min), seu corpo exige reposição hídrica acelerada! Beba um copo de água agora.`;
  } else if (climateCondition === 'quente') {
    pushMessage += ` Devido ao calor, o intervalo recomendado foi ajustado para cada ${intervalMinutes} minutos. Mantenha-se hidratado!`;
  } else {
    pushMessage += ` Mantenha sua meta diária em dia para máxima energia e foco.`;
  }

  return {
    temperature: Math.round(temperature),
    climateCondition,
    hasWorkoutToday: !!todayWorkout,
    workoutIntensity: todayWorkout?.intensity,
    recommendedIntervalMinutes: intervalMinutes,
    recommendedWaterTotal,
    pushTitle,
    pushMessage
  };
}
