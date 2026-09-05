'use client';

import { Frame } from '@/components/Shell';
import { MealRow } from '@/components/MealRow';
import { EmptyState, MacroRow, SectionTitle } from '@/components/ui';
import { addDays, dayLabel, last7DaysFrom, sumMeals } from '@/lib/data';
import { useApp } from '@/lib/store';
import type { Meal } from '@/lib/types';

const CHART_HEIGHT = 140;

export default function AnalysisScreen() {
  const { state, today } = useApp();

  const days = last7DaysFrom(today);
  const byDay = days.map((iso) => {
    const meals = state.meals.filter((m) => m.dateISO === iso);
    return { iso, meals, totals: sumMeals(meals) };
  });

  const weekTotals = byDay.reduce(
    (acc, d) => {
      acc.calories += d.totals.calories;
      acc.protein += d.totals.protein;
      acc.carbs += d.totals.carbs;
      acc.fat += d.totals.fat;
      acc.days += d.meals.length > 0 ? 1 : 0;
      return acc;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0, days: 0 },
  );
  const activeDays = Math.max(1, weekTotals.days);

  const maxCal = Math.max(state.goals.calories, ...byDay.map((d) => d.totals.calories), 1);

  const yesterday = addDays(today, -1);

  function dateHeading(iso: string) {
    if (iso === today) return 'Today';
    if (iso === yesterday) return 'Yesterday';
    return dayLabel(iso);
  }

  // Meals grouped by date, most recent group (and meal) first.
  const grouped: { iso: string; meals: Meal[] }[] = [];
  for (const meal of [...state.meals].sort((a, b) => b.ts - a.ts)) {
    let group = grouped.find((g) => g.iso === meal.dateISO);
    if (!group) {
      group = { iso: meal.dateISO, meals: [] };
      grouped.push(group);
    }
    group.meals.push(meal);
  }

  return (
    <Frame active="analysis">
      <div style={{ padding: '16px 20px 0 20px' }}>
        <div style={{ fontSize: 24, lineHeight: '36px', fontWeight: 700, color: 'var(--text-primary)' }}>
          Analysis
        </div>

        {/* 7-day calorie chart */}
        <div
          style={{
            marginTop: 20,
            background: 'var(--gray-500)',
            borderRadius: 'var(--radius-xl)',
            padding: 20,
          }}
        >
          <div style={{ fontSize: 15, lineHeight: '22px', color: 'var(--text-secondary)', marginBottom: 16 }}>
            Calories, last 7 days
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: CHART_HEIGHT }}>
            {byDay.map((d) => {
              const h = Math.max(4, (d.totals.calories / maxCal) * CHART_HEIGHT);
              const overGoal = d.totals.calories > state.goals.calories;
              return (
                <div
                  key={d.iso}
                  style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}
                >
                  <div style={{ width: '100%', height: CHART_HEIGHT, display: 'flex', alignItems: 'flex-end' }}>
                    <div
                      title={`${d.totals.calories.toLocaleString()} kcal`}
                      style={{
                        width: '100%',
                        height: h,
                        borderRadius: 6,
                        background: overGoal ? 'var(--message-error)' : 'var(--primary-100)',
                      }}
                    />
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{dayLabel(d.iso)}</div>
                </div>
              );
            })}
          </div>
        </div>

        <SectionTitle>Daily Average</SectionTitle>
        <MacroRow
          marginTop={12}
          protein={Math.round(weekTotals.protein / activeDays)}
          carbs={Math.round(weekTotals.carbs / activeDays)}
          fat={Math.round(weekTotals.fat / activeDays)}
        />

        <SectionTitle>Meal History</SectionTitle>
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 20 }}>
          {grouped.length === 0 && <EmptyState>No meals logged yet.</EmptyState>}
          {grouped.map((group) => (
            <div key={group.iso}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  marginBottom: 8,
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                }}
              >
                {dateHeading(group.iso)}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {group.meals.map((meal) => (
                  <MealRow key={meal.id} meal={meal} showMacros />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Frame>
  );
}
