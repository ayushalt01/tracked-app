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

/** Local-calendar date key, matching the prototype's `dateISO`. */
export function isoFromDate(d: Date): string {
  return (
    d.getFullYear() +
    '-' + String(d.getMonth() + 1).padStart(2, '0') +
    '-' + String(d.getDate()).padStart(2, '0')
  );
}

export function todayISO(): string {
  return isoFromDate(new Date());
}

export function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
}

export function fmtTime(ts: number): string {
  const d = new Date(ts);
  let h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  return h + ':' + String(m).padStart(2, '0') + ' ' + ampm;
}

export function dayLabel(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];
}

export function last7Days(): string[] {
  const out: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    out.push(isoFromDate(d));
  }
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

export function mealFromRow(row: MealRow): Meal {
  const ts = new Date(row.logged_at).getTime();
  return {
    id: row.id,
    ts,
    dateISO: isoFromDate(new Date(ts)),
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
): AppState {
  return {
    profile: {
      name: profile?.name ?? 'Friend',
      dietPlan: profile?.diet_plan ?? 'My Plan',
    },
    goals: goalsFromRow(goals),
    notifications: profile?.notifications_enabled ?? true,
    meals: meals.map(mealFromRow),
  };
}
