import type { AppState, Goals, Meal, MealRow, GoalsRow, MicroKey, ProfileRow } from './types';

export const DEFAULT_GOALS: Goals = {
  calories: 2000, protein: 150, carbs: 220, fat: 65,
  fiber: 30, sugar: 50, sodium: 2300, potassium: 3500,
  calcium: 1000, iron: 18, vitaminC: 90,
};

export const MICRO_DEFS: { key: MicroKey; label: string; unit: string }[] = [
  { key: 'fiber', label: 'Fiber', unit: 'g' },
  { key: 'sugar', label: 'Sugar', unit: 'g' },
  { key: 'sodium', label: 'Sodium', unit: 'mg' },
  { key: 'potassium', label: 'Potassium', unit: 'mg' },
  { key: 'calcium', label: 'Calcium', unit: 'mg' },
  { key: 'iron', label: 'Iron', unit: 'mg' },
  { key: 'vitaminC', label: 'Vitamin C', unit: 'mg' },
];

/**
 * Every date in this app is a *calendar day in the user's timezone*, never the
 * runtime's. The server renders in UTC on Vercel while the phone is on local
 * time, so deriving a day from `new Date()` on both sides puts an evening meal
 * on tomorrow for the server and today for the phone — and it vanishes from
 * the daily count. The timezone is carried from the browser in a cookie and
 * threaded through every helper below.
 */
export const FALLBACK_TIME_ZONE = 'UTC';

/** The YYYY-MM-DD calendar date of an instant, in the given timezone. */
export function isoInTimeZone(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '01';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

export function todayInTimeZone(timeZone: string): string {
  return isoInTimeZone(new Date(), timeZone);
}

/** Local-calendar date key for a Date, using the runtime's own timezone. */
export function isoFromDate(d: Date): string {
  return (
    d.getFullYear() +
    '-' + String(d.getMonth() + 1).padStart(2, '0') +
    '-' + String(d.getDate()).padStart(2, '0')
  );
}

/** Shifts a YYYY-MM-DD key by whole days without touching local time. */
export function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const shifted = new Date(Date.UTC(y, m - 1, d) + days * 86_400_000);
  return (
    shifted.getUTCFullYear() +
    '-' + String(shifted.getUTCMonth() + 1).padStart(2, '0') +
    '-' + String(shifted.getUTCDate()).padStart(2, '0')
  );
}

export function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
}

export function fmtTime(ts: number, timeZone: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(ts));
}

/** Weekday for a YYYY-MM-DD key — parsed as UTC so it cannot drift. */
export function dayLabel(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getUTCDay()];
}

/** The 7 calendar days ending on `today`, oldest first. */
export function last7DaysFrom(today: string): string[] {
  const out: string[] = [];
  for (let i = 6; i >= 0; i--) out.push(addDays(today, -i));
  return out;
}

export function sumMeals(meals: Meal[]) {
  return meals.reduce(
    (acc, m) => {
      acc.calories += m.calories || 0;
      acc.protein += m.protein || 0;
      acc.carbs += m.carbs || 0;
      acc.fat += m.fat || 0;
      return acc;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
}

// ------------------------------------------------------------- row mappers --

export function mealFromRow(row: MealRow, timeZone: string): Meal {
  const ts = new Date(row.logged_at).getTime();
  return {
    id: row.id,
    ts,
    dateISO: isoInTimeZone(new Date(ts), timeZone),
    name: row.name,
    description: row.description,
    photo: row.photo_url,
    calories: row.calories,
    protein: row.protein,
    carbs: row.carbs,
    fat: row.fat,
    micros: {
      fiber: row.fiber,
      sugar: row.sugar,
      sodium: row.sodium,
      potassium: row.potassium,
      calcium: row.calcium,
      iron: row.iron,
      vitaminC: row.vitamin_c,
    },
  };
}

export function goalsFromRow(row: GoalsRow | null): Goals {
  if (!row) return { ...DEFAULT_GOALS };
  return {
    calories: row.calories,
    protein: row.protein,
    carbs: row.carbs,
    fat: row.fat,
    fiber: row.fiber,
    sugar: row.sugar,
    sodium: row.sodium,
    potassium: row.potassium,
    calcium: row.calcium,
    iron: row.iron,
    vitaminC: row.vitamin_c,
  };
}

export function goalsToRow(goals: Goals) {
  return {
    calories: goals.calories,
    protein: goals.protein,
    carbs: goals.carbs,
    fat: goals.fat,
    fiber: goals.fiber,
    sugar: goals.sugar,
    sodium: goals.sodium,
    potassium: goals.potassium,
    calcium: goals.calcium,
    iron: goals.iron,
    vitamin_c: goals.vitaminC,
  };
}

export function stateFromRows(
  profile: ProfileRow | null,
  goals: GoalsRow | null,
  meals: MealRow[],
  timeZone: string,
): AppState {
  return {
    profile: {
      name: profile?.name ?? 'Friend',
      dietPlan: profile?.diet_plan ?? 'My Plan',
    },
    goals: goalsFromRow(goals),
    notifications: profile?.notifications_enabled ?? true,
    meals: meals.map((row) => mealFromRow(row, timeZone)),
  };
}
