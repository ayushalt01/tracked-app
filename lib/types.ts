export type MicroKey =
  | 'fiber' | 'sugar' | 'sodium' | 'potassium' | 'calcium' | 'iron' | 'vitaminC';

export type Micros = Record<MicroKey, number>;

/** One food component the AI identified in the photo. */
export type MealItem = {
  name: string;
  /** Estimated portion, as the model phrased it — "120 g", "1 cup", "2 slices". */
  amount: string;
  calories: number;
};

export type Goals = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
} & Micros;

export type WeightUnit = 'lb' | 'kg';

export type Profile = {
  name: string;
  dietPlan: string;
  weightUnit: WeightUnit;
};

/** One bodyweight reading, one per local calendar day. */
export type WeightEntry = {
  id: string;
  /** YYYY-MM-DD in the user's timezone. */
  dateISO: string;
  kg: number;
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
  /** Per-component breakdown behind the totals below. */
  items: MealItem[];
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
} & Micros;

/** One entry in the correction conversation on the Result screen. */
export type RefineTurn =
  | { role: 'user'; text: string }
  | { role: 'model'; text: string; analysis: Analysis };

/** Held between a successful AI call and "Log This Meal". */
export type PendingScan = {
  analysis: Analysis;
  /** Data URL of the meal photo, or null when logged by text or barcode. */
  photo: string | null;
  /** Where the estimate came from, shown as the eyebrow on the result screen. */
  source?: 'photo' | 'text' | 'barcode';
};

export type AppState = {
  profile: Profile;
  goals: Goals;
  notifications: boolean;
  meals: Meal[];
  weights: WeightEntry[];
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
  weight_unit: WeightUnit | null;
};

export type WeightRow = {
  id: string;
  user_id: string;
  logged_on: string;
  weight_kg: number | string;
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
