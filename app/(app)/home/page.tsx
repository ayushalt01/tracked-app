'use client';

import { useRouter } from 'next/navigation';

import { Frame } from '@/components/Shell';
import { MealRow } from '@/components/MealRow';
import { Avatar, EmptyState, MacroRow, SectionTitle } from '@/components/ui';
import { greeting, sumMeals, todayISO } from '@/lib/data';
import { mealsOnDay, useApp } from '@/lib/store';

export default function HomeScreen() {
  const router = useRouter();
  const { state } = useApp();

  const todaysMeals = mealsOnDay(state.meals, todayISO());
  const totals = sumMeals(todaysMeals);
  const remaining = Math.max(0, state.goals.calories - totals.calories);

  return (
    <Frame active="home">
      <div style={{ padding: '16px 20px 0 20px' }}>
        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 15, lineHeight: '22px', fontWeight: 400, color: 'var(--text-secondary)' }}>
              {greeting()}
            </div>
            <div style={{ fontSize: 24, lineHeight: '36px', fontWeight: 700, color: 'var(--text-primary)' }}>
              {state.profile.dietPlan}
            </div>
          </div>
          <button
            onClick={() => router.push('/settings')}
            aria-label="Settings"
            style={{ border: 0, background: 'none', padding: 0, cursor: 'pointer', borderRadius: '50%' }}
          >
            <Avatar size={48} initial={(state.profile.name.charAt(0) || 'A').toUpperCase()} />
          </button>
        </div>

        {/* Calorie hero card */}
        <div
          style={{
            marginTop: 24,
            background: 'var(--accent-200)',
            borderRadius: 'var(--radius-xl)',
            padding: 24,
          }}
        >
          <div style={{ fontSize: 20, lineHeight: '30px', fontWeight: 700, color: 'var(--gray-600)' }}>
            Calories
          </div>
          <div style={{ fontSize: 34, lineHeight: '51px', fontWeight: 700, color: 'var(--gray-600)' }}>
            {remaining.toLocaleString()}{' '}
            <span style={{ fontSize: 17, lineHeight: '24px', fontWeight: 400 }}>kcal left</span>
          </div>
          <div style={{ marginTop: 8, fontSize: 15, lineHeight: '22px', fontWeight: 400, color: '#232220' }}>
            {totals.calories.toLocaleString()} of {state.goals.calories.toLocaleString()} kcal logged today
          </div>
        </div>

        {/* Macro row */}
        <MacroRow
          protein={Math.round(totals.protein)}
          carbs={Math.round(totals.carbs)}
          fat={Math.round(totals.fat)}
        />

        <SectionTitle
          right={
            <button
              onClick={() => router.push('/scan')}
              style={{
                border: 0,
                background: 'none',
                color: 'var(--primary-100)',
                fontWeight: 600,
                fontSize: 15,
                cursor: 'pointer',
                padding: 0,
              }}
            >
              + Add meal
            </button>
          }
        >
          Today&rsquo;s Meals
        </SectionTitle>

        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {todaysMeals.length === 0 && (
            <EmptyState>No meals logged yet. Scan a photo to add one.</EmptyState>
          )}
          {todaysMeals.map((meal) => (
            <MealRow key={meal.id} meal={meal} />
          ))}
        </div>
      </div>
    </Frame>
  );
}
