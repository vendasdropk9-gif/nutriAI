import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth, googleProvider } from './firebase';
import { Recipe, MealPlan } from '../types';

let cachedAccessToken: string | null = null;

/**
 * Trigger OAuth sign-in with Google asking for Calendar events scope.
 */
export async function googleSignInWithCalendar(): Promise<string> {
  const provider = new GoogleAuthProvider();
  provider.addScope('https://www.googleapis.com/auth/calendar.events');
  
  // Set custom parameters to ensure prompt
  provider.setCustomParameters({
    prompt: 'consent'
  });

  try {
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Não foi possível obter o token de acesso do Google.');
    }
    cachedAccessToken = credential.accessToken;
    return cachedAccessToken;
  } catch (err: any) {
    console.error('Erro na autenticação do Google Calendar:', err);
    throw err;
  }
}

export function getCalendarAccessToken(): string | null {
  return cachedAccessToken;
}

export function setCalendarAccessToken(token: string | null) {
  cachedAccessToken = token;
}

export interface SyncMealOptions {
  dateStr: string; // YYYY-MM-DD
  timeStr: string; // HH:MM
  mealTypeLabel: string; // e.g. "Café da Manhã", "Almoço", "Lanche", "Jantar"
  recipe: Recipe;
  reminderMinutes?: number; // default 15
}

/**
 * Creates a single Google Calendar event for a scheduled meal.
 */
export async function syncMealToCalendar(
  options: SyncMealOptions,
  accessToken: string
): Promise<{ success: boolean; eventId?: string; htmlLink?: string; error?: string }> {
  const { dateStr, timeStr, mealTypeLabel, recipe, reminderMinutes = 15 } = options;

  // Build ISO start and end datetime
  const [hours, minutes] = timeStr.split(':').map(Number);
  const startDate = new Date(`${dateStr}T${timeStr.padStart(5, '0')}:00`);
  if (isNaN(startDate.getTime())) {
    throw new Error(`Data/Hora inválida: ${dateStr} ${timeStr}`);
  }

  const endDate = new Date(startDate.getTime() + 30 * 60 * 1000); // 30 min duration

  const summary = `🍽️ NutriAI: ${mealTypeLabel} - ${recipe.name || recipe.title || 'Refeição'}`;

  let description = `Refeição Agendada via NutriAI App\n\n`;
  description += `📖 Receita: ${recipe.name || recipe.title}\n`;
  if (recipe.description) {
    description += `📝 ${recipe.description}\n\n`;
  }

  const cal = recipe.nutrition?.calories ?? recipe.calories;
  const prot = recipe.nutrition?.protein ?? recipe.protein;
  const carbs = recipe.nutrition?.carbs ?? recipe.carbs;
  const fat = recipe.nutrition?.fat ?? recipe.fat;

  if (cal || prot || carbs || fat) {
    description += `⚡ Informações Nutricionais:\n`;
    if (cal) description += `• Calorias: ${cal} kcal\n`;
    if (prot) description += `• Proteínas: ${prot}g\n`;
    if (carbs) description += `• Carboidratos: ${carbs}g\n`;
    if (fat) description += `• Gorduras: ${fat}g\n`;
    description += `\n`;
  }

  if (recipe.ingredients && recipe.ingredients.length > 0) {
    description += `🛒 Ingredientes Necessários:\n`;
    recipe.ingredients.slice(0, 10).forEach(ing => {
      description += `- ${ing}\n`;
    });
    if (recipe.ingredients.length > 10) {
      description += `... e mais ${recipe.ingredients.length - 10} ingredientes.\n`;
    }
  }

  const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Sao_Paulo';

  const eventBody: any = {
    summary,
    description,
    start: {
      dateTime: startDate.toISOString(),
      timeZone: userTimeZone
    },
    end: {
      dateTime: endDate.toISOString(),
      timeZone: userTimeZone
    },
    reminders: {
      useDefault: false,
      overrides: reminderMinutes > 0 ? [{ method: 'popup', minutes: reminderMinutes }] : []
    }
  };

  try {
    const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(eventBody)
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error?.message || 'Erro ao comunicar com Google Calendar API');
    }

    return {
      success: true,
      eventId: data.id,
      htmlLink: data.htmlLink
    };
  } catch (err: any) {
    console.error('Erro ao criar evento no Google Calendar:', err);
    return {
      success: false,
      error: err.message || String(err)
    };
  }
}

export interface WeekDayMealItem {
  dayName: string; // 'Segunda-feira', etc.
  dateStr: string; // YYYY-MM-DD
  mealType: 'breakfast' | 'lunch' | 'snack' | 'dinner';
  mealTypeLabel: string;
  timeStr: string;
  recipe: Recipe;
}

/**
 * Calculates calendar dates for the days of the week starting from weekStartDate.
 */
export function getDatesForMealPlanWeek(weekStartDate: string): Record<string, string> {
  const start = new Date(weekStartDate);
  const datesMap: Record<string, string> = {};
  const dayNames = [
    'Segunda-feira',
    'Terça-feira',
    'Quarta-feira',
    'Quinta-feira',
    'Sexta-feira',
    'Sábado',
    'Domingo'
  ];

  dayNames.forEach((dName, index) => {
    const d = new Date(start);
    d.setDate(start.getDate() + index);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    datesMap[dName] = `${yyyy}-${mm}-${dd}`;
  });

  return datesMap;
}

export const DEFAULT_MEAL_TIMES: Record<string, string> = {
  breakfast: '08:00',
  lunch: '12:30',
  snack: '16:00',
  dinner: '19:30'
};

export const DEFAULT_MEAL_LABELS: Record<string, string> = {
  breakfast: 'Café da Manhã',
  lunch: 'Almoço',
  snack: 'Lanche',
  dinner: 'Jantar'
};

/**
 * Syncs an array of meals to Google Calendar in bulk.
 */
export async function syncEntireMealPlanToCalendar(
  items: WeekDayMealItem[],
  reminderMinutes: number,
  accessToken: string,
  onProgress?: (index: number, total: number) => void
): Promise<{ successCount: number; failureCount: number; links: string[] }> {
  let successCount = 0;
  let failureCount = 0;
  const links: string[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (onProgress) onProgress(i + 1, items.length);

    const res = await syncMealToCalendar(
      {
        dateStr: item.dateStr,
        timeStr: item.timeStr,
        mealTypeLabel: item.mealTypeLabel,
        recipe: item.recipe,
        reminderMinutes
      },
      accessToken
    );

    if (res.success) {
      successCount++;
      if (res.htmlLink) links.push(res.htmlLink);
    } else {
      failureCount++;
    }
  }

  return { successCount, failureCount, links };
}
