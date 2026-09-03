export type MicroKey =
  | 'fiber' | 'sugar' | 'sodium' | 'potassium' | 'calcium' | 'iron' | 'vitaminC';

export type Micros = Record<MicroKey, number>;

export type Goals = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
} & Micros;

export type Profile = {
  name: string;
  dietPlan: string;
};

/** One logged meal, in the prototype's client-side shape. */
export type Meal = {
  id: string;
  ts: number;
  dateISO: string;
  name: string;
  description: string | null;
  photo: string | null;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  micros: Micros;
};

/** Exactly what /api/analyze-meal returns (and what Gemini is asked for). */
export type Analysis = {
  name: string;
  description: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
} & Micros;

/** Held between a successful AI call and "Log This Meal". */
export type PendingScan = {
  analysis: Analysis;
  photo: string;
};

export type AppState = {
  profile: Profile;
  goals: Goals;
  notifications: boolean;
  meals: Meal[];
};

/** Row shapes as stored in Postgres (snake_case). */
export type MealRow = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  photo_url: string | null;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
  potassium: number;
  calcium: number;
  iron: number;
  vitamin_c: number;
  logged_at: string;
};

export type ProfileRow = {
  user_id: string;
  name: string;
  diet_plan: string;
  notifications_enabled: boolean;
};

export type GoalsRow = {
  user_id: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
  potassium: number;
  calcium: number;
  iron: number;
  vitamin_c: number;
};
