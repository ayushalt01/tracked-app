'use client';

/* eslint-disable @next/next/no-img-element */
import type { Meal } from '@/lib/types';
import { fmtTime } from '@/lib/data';

/** List row shared by Home ("Today's Meals") and Analysis ("Meal History"). */
export function MealRow({ meal, showMacros }: { meal: Meal; showMacros?: boolean }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        background: 'var(--gray-500)',
        borderRadius: 'var(--radius-md)',
        padding: 12,
      }}
    >
      {meal.photo ? (
        <img
          src={meal.photo}
          alt=""
          style={{ width: 48, height: 48, borderRadius: 12, objectFit: 'cover', flexShrink: 0 }}
        />
      ) : (
        <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--gray-400)', flexShrink: 0 }} />
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 15,
            lineHeight: '22px',
            fontWeight: 600,
            color: 'var(--text-primary)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {meal.name}
        </div>
        <div style={{ fontSize: 13, lineHeight: '19px', color: 'var(--text-secondary)' }}>
          {fmtTime(meal.ts)}
          {showMacros && ` · P:${meal.protein}g C:${meal.carbs}g F:${meal.fat}g`}
        </div>
      </div>
      <div
        style={{
          fontSize: 15,
          lineHeight: '22px',
          fontWeight: 700,
          color: 'var(--text-primary)',
          whiteSpace: 'nowrap',
        }}
      >
        {meal.calories} kcal
      </div>
    </div>
  );
}
