import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { TimezoneCookie } from '@/components/TimezoneCookie';
import { AppStateProvider } from '@/lib/store';
import { FALLBACK_TIME_ZONE, stateFromRows, todayInTimeZone } from '@/lib/data';
import { createClient } from '@/lib/supabase/server';
import type { GoalsRow, MealRow, ProfileRow } from '@/lib/types';

export const dynamic = 'force-dynamic';

/**
 * How much history the app keeps in memory. Home needs today and the Analysis
 * chart needs 7 days, but its "Meal History" list shows everything it is
 * given — so this is the real bound on that list. Kept to a season so the
 * payload stays small on a phone.
 */
const HISTORY_DAYS = 90;

/** Validates the browser-supplied timezone before handing it to Intl. */
function resolveTimeZone(value: string | undefined): string {
  if (!value) return FALLBACK_TIME_ZONE;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value });
    return value;
  } catch {
    return FALLBACK_TIME_ZONE;
  }
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const cookieStore = await cookies();
  const timeZone = resolveTimeZone(cookieStore.get('tracked_tz')?.value);

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
      .limit(1000),
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

  const initial = stateFromRows(profile, goals, (mealsRes.data ?? []) as MealRow[], timeZone);

  return (
    <AppStateProvider
      initial={initial}
      userId={user.id}
      email={user.email ?? ''}
      timeZone={timeZone}
      today={todayInTimeZone(timeZone)}
    >
      <TimezoneCookie />
      {children}
    </AppStateProvider>
  );
}
