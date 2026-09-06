'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { createClient } from '@/lib/supabase/client';
import { goalsToRow, mealFromRow, MICRO_DEFS, weightFromRow } from '@/lib/data';
import { dataUrlToBlob } from '@/lib/image';
import type { AppState, Analysis, Goals, Meal, MealRow, Profile, WeightRow } from '@/lib/types';

type Ctx = {
  state: AppState;
  userId: string;
  email: string;
  /** IANA zone the user is in; all day and time formatting uses it. */
  timeZone: string;
  /** Today's YYYY-MM-DD in `timeZone`, resolved once on the server. */
  today: string;
  logMeal: (analysis: Analysis, name: string, photoDataUrl: string | null) => Promise<void>;
  repeatMeal: (meal: Meal) => Promise<void>;
  updateMeal: (id: string, patch: MealEdit) => Promise<void>;
  deleteMeal: (meal: Meal) => Promise<void>;
  saveProfileAndGoals: (profile: Profile, goals: Goals) => Promise<void>;
  logWeight: (kg: number, dateISO: string) => Promise<void>;
  setNotifications: (on: boolean) => Promise<void>;
  clearMeals: () => Promise<void>;
  signOut: () => Promise<void>;
};

/** The fields a logged meal can be corrected to after the fact. */
export type MealEdit = {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

const AppContext = createContext<Ctx | null>(null);

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside <AppStateProvider>');
  return ctx;
}

export function AppStateProvider({
  initial,
  userId,
  email,
  timeZone,
  today,
  children,
}: {
  initial: AppState;
  userId: string;
  email: string;
  timeZone: string;
  today: string;
  children: React.ReactNode;
}) {
  const [state, setState] = useState<AppState>(initial);
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  // The server is the source of truth: adopt a fresh `initial` whenever the
  // layout re-renders (router.refresh(), a navigation, the timezone cookie
  // landing). Without this the provider would keep its first snapshot forever
  // and, after a timezone correction, filter today's meals against stale
  // day keys. This is React's documented adjust-state-during-render pattern —
  // it re-renders immediately instead of flashing the wrong numbers.
  const [serverState, setServerState] = useState(initial);
  if (serverState !== initial) {
    setServerState(initial);
    setState(initial);
  }

  const logMeal = useCallback(
    async (analysis: Analysis, name: string, photoDataUrl: string | null) => {
      // 1. Photo → Supabase Storage, so the meal row carries a durable URL.
      //    Text and barcode entries have no photo and skip this entirely.
      let photoUrl: string | null = null;
      try {
        if (!photoDataUrl) throw new Error('no photo');
        const blob = dataUrlToBlob(photoDataUrl);
        const ext = blob.type === 'image/png' ? 'png' : 'jpg';
        const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error } = await supabase.storage
          .from('meal-photos')
          .upload(path, blob, { contentType: blob.type, upsert: false });
        if (!error) {
          photoUrl = supabase.storage.from('meal-photos').getPublicUrl(path).data.publicUrl;
        }
      } catch {
        // Photo upload is best-effort — the meal still logs without it.
      }

      // 2. Meal row, with every value rounded as in the prototype.
      const micros = MICRO_DEFS.reduce<Record<string, number>>((acc, d) => {
        acc[d.key === 'vitaminC' ? 'vitamin_c' : d.key] = Math.round(analysis[d.key] || 0);
        return acc;
      }, {});

      const { data, error } = await supabase
        .from('meals')
        .insert({
          user_id: userId,
          name,
          description: analysis.description || null,
          photo_url: photoUrl,
          calories: Math.round(analysis.calories || 0),
          protein: Math.round(analysis.protein || 0),
          carbs: Math.round(analysis.carbs || 0),
          fat: Math.round(analysis.fat || 0),
          ...micros,
          logged_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw new Error(error.message);

      const meal: Meal = mealFromRow(data as MealRow, timeZone);
      setState((s) => ({ ...s, meals: [meal, ...s.meals] }));
      router.refresh();
    },
    [router, supabase, userId, timeZone],
  );

  const repeatMeal = useCallback(
    async (meal: Meal) => {
      const { data, error } = await supabase
        .from('meals')
        .insert({
          user_id: userId,
          name: meal.name,
          description: meal.description,
          photo_url: meal.photo,
          calories: meal.calories,
          protein: meal.protein,
          carbs: meal.carbs,
          fat: meal.fat,
          fiber: meal.micros.fiber,
          sugar: meal.micros.sugar,
          sodium: meal.micros.sodium,
          potassium: meal.micros.potassium,
          calcium: meal.micros.calcium,
          iron: meal.micros.iron,
          vitamin_c: meal.micros.vitaminC,
          logged_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw new Error(error.message);

      setState((s) => ({ ...s, meals: [mealFromRow(data as MealRow, timeZone), ...s.meals] }));
      router.refresh();
    },
    [router, supabase, userId, timeZone],
  );

  const updateMeal = useCallback(
    async (id: string, patch: MealEdit) => {
      const clean = {
        name: patch.name.trim() || 'Meal',
        calories: Math.max(0, Math.round(patch.calories)),
        protein: Math.max(0, Math.round(patch.protein)),
        carbs: Math.max(0, Math.round(patch.carbs)),
        fat: Math.max(0, Math.round(patch.fat)),
      };

      setState((s) => ({
        ...s,
        meals: s.meals.map((m) => (m.id === id ? { ...m, ...clean } : m)),
      }));

      const { error } = await supabase.from('meals').update(clean).eq('id', id).eq('user_id', userId);
      if (error) throw new Error(error.message);
      router.refresh();
    },
    [router, supabase, userId],
  );

  const deleteMeal = useCallback(
    async (meal: Meal) => {
      setState((s) => ({ ...s, meals: s.meals.filter((m) => m.id !== meal.id) }));

      const { error } = await supabase.from('meals').delete().eq('id', meal.id).eq('user_id', userId);
      if (error) throw new Error(error.message);

      // Drop the photo too, so deleting a meal does not leave the storage
      // bucket filling up with files nothing points at — unless a repeated
      // meal still points at the same file.
      const path = meal.photo?.split('/storage/v1/object/public/meal-photos/')[1];
      if (path) {
        const { count } = await supabase
          .from('meals')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('photo_url', meal.photo);
        if (!count) {
          await supabase.storage.from('meal-photos').remove([decodeURIComponent(path)]);
        }
      }

      router.refresh();
    },
    [router, supabase, userId],
  );

  const logWeight = useCallback(
    async (kg: number, dateISO: string) => {
      // One reading per day: weighing twice replaces, it does not stack.
      const { data, error } = await supabase
        .from('weights')
        .upsert(
          { user_id: userId, logged_on: dateISO, weight_kg: Math.round(kg * 100) / 100 },
          { onConflict: 'user_id,logged_on' },
        )
        .select()
        .single();

      if (error) throw new Error(error.message);

      const entry = weightFromRow(data as WeightRow);
      setState((s) => ({
        ...s,
        weights: [entry, ...s.weights.filter((w) => w.dateISO !== entry.dateISO)],
      }));
      router.refresh();
    },
    [router, supabase, userId],
  );

  const saveProfileAndGoals = useCallback(
    async (profile: Profile, goals: Goals) => {
      setState((s) => ({ ...s, profile, goals }));

      const [{ error: pErr }, { error: gErr }] = await Promise.all([
        supabase
          .from('profiles')
          .update({
            name: profile.name,
            diet_plan: profile.dietPlan,
            weight_unit: profile.weightUnit,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId),
        supabase
          .from('goals')
          .update({ ...goalsToRow(goals), updated_at: new Date().toISOString() })
          .eq('user_id', userId),
      ]);

      if (pErr || gErr) throw new Error(pErr?.message || gErr?.message);
      router.refresh();
    },
    [router, supabase, userId],
  );

  const setNotifications = useCallback(
    async (on: boolean) => {
      setState((s) => ({ ...s, notifications: on }));
      await supabase.from('profiles').update({ notifications_enabled: on }).eq('user_id', userId);
      router.refresh();
    },
    [router, supabase, userId],
  );

  const clearMeals = useCallback(async () => {
    setState((s) => ({ ...s, meals: [] }));
    await supabase.from('meals').delete().eq('user_id', userId);
    router.refresh();
  }, [router, supabase, userId]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    router.replace('/login');
    router.refresh();
  }, [router, supabase]);

  const value = useMemo<Ctx>(
    () => ({
      state, userId, email, timeZone, today,
      logMeal, repeatMeal, updateMeal, deleteMeal, logWeight,
      saveProfileAndGoals, setNotifications, clearMeals, signOut,
    }),
    [state, userId, email, timeZone, today, logMeal, repeatMeal, updateMeal, deleteMeal,
     logWeight, saveProfileAndGoals, setNotifications, clearMeals, signOut],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

/** Meals on a given local calendar day, newest first. */
export function mealsOnDay(meals: Meal[], iso: string): Meal[] {
  return meals.filter((m) => m.dateISO === iso).sort((a, b) => b.ts - a.ts);
}
