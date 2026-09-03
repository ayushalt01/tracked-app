import { redirect } from 'next/navigation';

import { AppStateProvider } from '@/lib/store';
import { stateFromRows } from '@/lib/data';
import { createClient } from '@/lib/supabase/server';
import type { GoalsRow, MealRow, ProfileRow } from '@/lib/types';

export const dynamic = 'force-dynamic';

/** Meals older than this are not needed by Home (today) or Analysis (7 days). */
const HISTORY_DAYS = 30;

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const since = new Date();
  since.setDate(since.getDate() - HISTORY_DAYS);

  const [profileRes, goalsRes, mealsRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle(),
    supabase.from('goals').select('*').eq('user_id', user.id).maybeSingle(),
    supabase
      .from('meals')
      .select('*')
      .eq('user_id', user.id)
      .gte('logged_at', since.toISOString())
      .order('logged_at', { ascending: false })
      .limit(500),
  ]);

  let profile = profileRes.data as ProfileRow | null;
  let goals = goalsRes.data as GoalsRow | null;

  // Self-heal for accounts created before the bootstrap trigger existed.
  if (!profile) {
    const { data } = await supabase
      .from('profiles')
      .insert({
        user_id: user.id,
        name: (user.user_metadata?.name as string) || user.email?.split('@')[0] || 'Friend',
        diet_plan: (user.user_metadata?.diet_plan as string) || 'My Plan',
      })
      .select()
      .single();
    profile = data as ProfileRow | null;
  }
  if (!goals) {
    const { data } = await supabase.from('goals').insert({ user_id: user.id }).select().single();
    goals = data as GoalsRow | null;
  }

  const initial = stateFromRows(profile, goals, (mealsRes.data ?? []) as MealRow[]);

  return (
    <AppStateProvider initial={initial} userId={user.id} email={user.email ?? ''}>
      {children}
    </AppStateProvider>
  );
}
