import { UserProfile, WorkoutLog } from '../types';

export interface HydrationAnalysis {
  temperature: number;
  apparentTemperature?: number;
  maxTemperatureToday?: number;
  locationName?: string;
  latitude?: number;
  longitude?: number;
  isHighHeat: boolean; // temperature > 30 || maxTemperatureToday > 30
  suggestedHeatWaterBonus: number; // e.g. +500ml or +750ml
  heatSuggestionMessage?: string;
  climateCondition: 'quente' | 'moderado' | 'frio' | 'calor_extremo';
  hasWorkoutToday: boolean;
  workoutIntensity?: string;
  recommendedIntervalMinutes: number;
  recommendedWaterTotal: number;
  pushTitle: string;
  pushMessage: string;
  geolocationStatus?: 'granted' | 'prompt' | 'denied' | 'unsupported' | 'simulated';
}

const TEST_HIGH_HEAT_STORAGE_KEY = 'nutri_test_high_heat_temperature';

export function getTestHighHeatTemperature(): number | null {
  if (typeof window === 'undefined') return null;
  try {
    const val = localStorage.getItem(TEST_HIGH_HEAT_STORAGE_KEY);
    if (val !== null) {
      const parsed = parseFloat(val);
      if (!isNaN(parsed)) return parsed;
    }
  } catch (e) {}
  return null;
}

export function setTestHighHeatTemperature(temp: number | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (temp === null) {
      localStorage.removeItem(TEST_HIGH_HEAT_STORAGE_KEY);
    } else {
      localStorage.setItem(TEST_HIGH_HEAT_STORAGE_KEY, temp.toString());
    }
    window.dispatchEvent(new CustomEvent('nutri:heat-temperature-changed', { detail: temp }));
  } catch (e) {}
}

function formatLocationFromTimezone(tz?: string, lat?: number, lon?: number): string {
  if (!tz) return lat && lon ? `${lat.toFixed(1)}°, ${lon.toFixed(1)}°` : 'Sua Região';
  const clean = tz.split('/').pop()?.replace(/_/g, ' ') || 'Sua Região';
  const mapping: Record<string, string> = {
    'Sao Paulo': 'São Paulo, SP',
    'Rio de Janeiro': 'Rio de Janeiro, RJ',
    'Brasilia': 'Brasília, DF',
    'Belo Horizonte': 'Belo Horizonte, MG',
    'Salvador': 'Salvador, BA',
    'Fortaleza': 'Fortaleza, CE',
    'Recife': 'Recife, PE',
    'Curitiba': 'Curitiba, PR',
    'Porto Alegre': 'Porto Alegre, RS',
    'Manaus': 'Manaus, AM',
    'Belem': 'Belém, PA',
    'Goiania': 'Goiânia, GO',
    'Campinas': 'Campinas, SP',
    'Cuiaba': 'Cuiabá, MT',
    'Campo Grande': 'Campo Grande, MS',
    'Natal': 'Natal, RN',
    'Maceio': 'Maceió, AL',
    'Teresina': 'Teresina, PI',
    'Florianopolis': 'Florianópolis, SC',
    'Vitoria': 'Vitória, ES'
  };
  return mapping[clean] || clean;
}

export async function analyzeSmartHydration(profile: UserProfile | null): Promise<HydrationAnalysis> {
  let temperature = 28; // Default warm climate
  let apparentTemperature: number | undefined;
  let maxTemperatureToday: number | undefined;
  let locationName: string | undefined = 'Sua Região';
  let latitude: number | undefined;
  let longitude: number | undefined;
  let geolocationStatus: HydrationAnalysis['geolocationStatus'] = 'unsupported';

  // Check if a simulated/test temperature is set in localStorage
  const testTemp = getTestHighHeatTemperature();
  const isSimulated = testTemp !== null;

  if (isSimulated) {
    temperature = testTemp;
    apparentTemperature = testTemp + 2;
    maxTemperatureToday = Math.max(testTemp, testTemp + 1);
    locationName = 'Modo Teste (Simulação de Calor)';
    geolocationStatus = 'simulated';
  } else {
    // Try fetching real geolocation weather from Open-Meteo
    try {
      if (typeof navigator !== 'undefined' && navigator.geolocation) {
        geolocationStatus = 'prompt';
        await new Promise<void>((resolve) => {
          navigator.geolocation.getCurrentPosition(
            async (pos) => {
              geolocationStatus = 'granted';
              try {
                latitude = pos.coords.latitude;
                longitude = pos.coords.longitude;
                const res = await fetch(
                  `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,apparent_temperature&daily=temperature_2m_max&timezone=auto`
                );
                const data = await res.json();
                if (data?.current?.temperature_2m !== undefined) {
                  temperature = data.current.temperature_2m;
                }
                if (data?.current?.apparent_temperature !== undefined) {
                  apparentTemperature = data.current.apparent_temperature;
                }
                if (Array.isArray(data?.daily?.temperature_2m_max) && data.daily.temperature_2m_max.length > 0) {
                  maxTemperatureToday = data.daily.temperature_2m_max[0];
                }
                if (data?.timezone) {
                  locationName = formatLocationFromTimezone(data.timezone, latitude, longitude);
                }
              } catch (e) {
                // Network or parse fallback
              }
              resolve();
            },
            () => {
              geolocationStatus = 'denied';
              resolve();
            },
            { timeout: 4000, enableHighAccuracy: false }
          );
        });
      }
    } catch (e) {
      // Fallback to defaults
    }
  }

  // Determine High Heat threshold (> 30°C)
  const effectiveMaxOrCurrent = Math.max(temperature, maxTemperatureToday ?? temperature);
  const isHighHeat = temperature > 30 || (maxTemperatureToday !== undefined && maxTemperatureToday > 30);

  let climateCondition: 'quente' | 'moderado' | 'frio' | 'calor_extremo' = 'quente';
  if (isHighHeat || temperature >= 32) {
    climateCondition = 'calor_extremo';
  } else if (temperature >= 26) {
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

  // Calculate base water target (35ml per kg)
  const baseWeight = profile?.weight || 70;
  let recommendedWaterTotal = Math.round(baseWeight * 35);
  let intervalMinutes = 60; // Base interval in minutes

  // Bonus for High Heat (>30°C) based on geolocation forecast
  const suggestedHeatWaterBonus = isHighHeat ? (effectiveMaxOrCurrent >= 34 ? 750 : 500) : 0;

  if (isHighHeat) {
    recommendedWaterTotal += suggestedHeatWaterBonus;
    intervalMinutes = Math.max(30, intervalMinutes - 20); // Drink more frequently during severe heat
  } else if (climateCondition === 'quente') {
    recommendedWaterTotal += 350;
    intervalMinutes -= 10;
  } else if (climateCondition === 'frio') {
    intervalMinutes += 10;
  }

  // Additional bonus for workouts
  if (todayWorkout) {
    recommendedWaterTotal += todayWorkout.durationMinutes > 30 ? 600 : 300;
    intervalMinutes = Math.max(25, intervalMinutes - 15);
  }

  // Build smart notification copy and heat advisory
  let pushTitle = "💧 Pausa Inteligente de Hidratação";
  let pushMessage = `Clima atual: ${Math.round(temperature)}°C (${climateCondition}).`;
  let heatSuggestionMessage: string | undefined;

  if (isHighHeat) {
    pushTitle = `☀️ Alerta de Calor Local (${Math.round(effectiveMaxOrCurrent)}°C > 30°C)`;
    heatSuggestionMessage = `Previsão local em ${locationName} indica temperaturas elevadas de ${Math.round(temperature)}°C (com máxima de ${Math.round(effectiveMaxOrCurrent)}°C). Em dias acima de 30°C, a perda hídrica por transpiração aumenta significativamente. Sugerimos elevar sua ingestão em +${suggestedHeatWaterBonus}ml hoje e beber água a cada ${intervalMinutes} minutos!`;
    pushMessage = heatSuggestionMessage;
  } else if (todayWorkout) {
    pushMessage += ` Com base no seu treino de hoje (${todayWorkout.intensity}, ${todayWorkout.durationMinutes}min), seu corpo exige reposição hídrica acelerada! Beba um copo de água agora.`;
  } else if (climateCondition === 'quente') {
    pushMessage += ` Devido ao calor, o intervalo recomendado foi ajustado para cada ${intervalMinutes} minutos. Mantenha-se hidratado!`;
  } else {
    pushMessage += ` Mantenha sua meta diária em dia para máxima energia e foco.`;
  }

  return {
    temperature: Math.round(temperature),
    apparentTemperature: apparentTemperature !== undefined ? Math.round(apparentTemperature) : undefined,
    maxTemperatureToday: maxTemperatureToday !== undefined ? Math.round(maxTemperatureToday) : undefined,
    locationName,
    latitude,
    longitude,
    isHighHeat,
    suggestedHeatWaterBonus,
    heatSuggestionMessage,
    climateCondition,
    hasWorkoutToday: !!todayWorkout,
    workoutIntensity: todayWorkout?.intensity,
    recommendedIntervalMinutes: intervalMinutes,
    recommendedWaterTotal,
    pushTitle,
    pushMessage,
    geolocationStatus
  };
}
