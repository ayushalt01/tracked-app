'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { createClient } from '@/lib/supabase/client';
import { goalsToRow, mealFromRow, MICRO_DEFS } from '@/lib/data';
import type { AppState, Analysis, Goals, Meal, MealRow, Profile } from '@/lib/types';

type Ctx = {
  state: AppState;
  userId: string;
  email: string;
  logMeal: (analysis: Analysis, name: string, photoDataUrl: string) => Promise<void>;
  saveProfileAndGoals: (profile: Profile, goals: Goals) => Promise<void>;
  setNotifications: (on: boolean) => Promise<void>;
  clearMeals: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AppContext = createContext<Ctx | null>(null);

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside <AppStateProvider>');
  return ctx;
}

/** Turns a `data:` URL back into a Blob for upload to Supabase Storage. */
function dataUrlToBlob(dataUrl: string): Blob {
  const [header, body] = dataUrl.split(',');
  const mime = /:(.*?);/.exec(header)?.[1] ?? 'image/jpeg';
  const binary = atob(body);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

export function AppStateProvider({
  initial,
  userId,
  email,
  children,
}: {
  initial: AppState;
  userId: string;
  email: string;
  children: React.ReactNode;
}) {
  const [state, setState] = useState<AppState>(initial);
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const logMeal = useCallback(
    async (analysis: Analysis, name: string, photoDataUrl: string) => {
      // 1. Photo → Supabase Storage, so the meal row carries a durable URL.
      let photoUrl: string | null = null;
      try {
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

      const meal: Meal = mealFromRow(data as MealRow);
      setState((s) => ({ ...s, meals: [meal, ...s.meals] }));
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
          .update({ name: profile.name, diet_plan: profile.dietPlan, updated_at: new Date().toISOString() })
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
    () => ({ state, userId, email, logMeal, saveProfileAndGoals, setNotifications, clearMeals, signOut }),
    [state, userId, email, logMeal, saveProfileAndGoals, setNotifications, clearMeals, signOut],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

/** Meals on a given local calendar day, newest first. */
export function mealsOnDay(meals: Meal[], iso: string): Meal[] {
  return meals.filter((m) => m.dateISO === iso).sort((a, b) => b.ts - a.ts);
}
