'use client';

import { useState } from 'react';

import { Button, InlineNumber, macroColors } from '@/components/ui';
import { fmtTime } from '@/lib/data';
import { useApp } from '@/lib/store';
import type { Meal } from '@/lib/types';

const MACROS = [
  { key: 'protein', label: 'Protein', color: macroColors.protein },
  { key: 'carbs', label: 'Carbs', color: macroColors.carbs },
  { key: 'fat', label: 'Fat', color: macroColors.fat },
] as const;

/**
 * Correcting or removing a meal that is already logged. Opens over the screen
 * that owns it; the caller renders it as the Frame's overlay so it sits above
 * the bottom nav.
 */
export function MealSheet({ meal, onClose }: { meal: Meal; onClose: () => void }) {
  const { updateMeal, deleteMeal, timeZone } = useApp();

  const [name, setName] = useState(meal.name);
  const [values, setValues] = useState({
    calories: meal.calories,
    protein: meal.protein,
    carbs: meal.carbs,
    fat: meal.fat,
  });
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setBusy(true);
    setError(null);
    try {
      await updateMeal(meal.id, { name, ...values });
      onClose();
    } catch (err) {
      setBusy(false);
      setError(err instanceof Error ? err.message : 'Could not save this meal.');
    }
  }

  async function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 4000);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await deleteMeal(meal);
      onClose();
    } catch (err) {
      setBusy(false);
      setError(err instanceof Error ? err.message : 'Could not delete this meal.');
    }
  }

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 40,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
      }}
    >
      <button
        aria-label="Close"
        onClick={onClose}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0,0,0,0.55)',
          border: 0,
          padding: 0,
          cursor: 'pointer',
        }}
      />

      <div
        role="dialog"
        aria-label="Edit meal"
        style={{
          position: 'relative',
          background: 'var(--gray-600)',
          borderTopLeftRadius: 'var(--radius-xl)',
          borderTopRightRadius: 'var(--radius-xl)',
          padding: '20px 20px 28px 20px',
          boxShadow: '0 -8px 32px rgba(0,0,0,0.5)',
          maxHeight: '90%',
          overflowY: 'auto',
        }}
      >
        <div
          style={{
            width: 40,
            height: 4,
            borderRadius: 2,
            background: 'var(--gray-400)',
            margin: '0 auto 16px auto',
          }}
        />

        <div style={{ fontSize: 13, lineHeight: '19px', color: 'var(--text-secondary)' }}>
          Logged at {fmtTime(meal.ts, timeZone)}
        </div>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-label="Meal name"
          style={{
            width: '100%',
            boxSizing: 'border-box',
            marginTop: 4,
            background: 'transparent',
            border: 0,
            borderBottom: '1px solid var(--gray-400)',
            color: '#fff',
            fontSize: 24,
            lineHeight: '36px',
            fontWeight: 700,
            padding: '2px 0',
            outline: 'none',
          }}
        />

        <div
          style={{
            marginTop: 16,
            background: 'var(--accent-200)',
            borderRadius: 'var(--radius-xl)',
            padding: 20,
          }}
        >
          <div style={{ fontSize: 20, lineHeight: '30px', fontWeight: 700, color: 'var(--gray-600)' }}>
            Calories
          </div>
          <div style={{ fontSize: 34, lineHeight: '51px', fontWeight: 700, color: 'var(--gray-600)' }}>
            <InlineNumber
              value={values.calories}
              onChange={(v) => setValues({ ...values, calories: v })}
              label="Calories"
              underline="rgba(18,18,18,0.3)"
            />{' '}
            <span style={{ fontSize: 17, lineHeight: '24px', fontWeight: 400 }}>kcal</span>
          </div>
        </div>

        <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
          {MACROS.map(({ key, label, color }) => (
            <div
              key={key}
              style={{
                background: color,
                borderRadius: 'var(--radius-lg)',
                padding: 16,
                color: 'var(--gray-600)',
              }}
            >
              <div style={{ fontSize: 15, lineHeight: '22px', fontWeight: 600 }}>{label}</div>
              <div style={{ fontSize: 20, lineHeight: '30px', fontWeight: 700 }}>
                <InlineNumber
                  value={values[key]}
                  onChange={(v) => setValues({ ...values, [key]: v })}
                  label={label}
                  underline="rgba(18,18,18,0.3)"
                />
                g
              </div>
            </div>
          ))}
        </div>

        {error && (
          <div
            style={{
              marginTop: 16,
              padding: 12,
              borderRadius: 'var(--radius-md)',
              background: 'rgba(201,56,56,0.15)',
              color: '#FF3E3E',
              fontSize: 13,
              lineHeight: '19px',
            }}
          >
            {error}
          </div>
        )}

        <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Button size="md" onClick={handleSave} disabled={busy}>
            Save Changes
          </Button>
          <Button size="md" variant="outline" onClick={handleDelete} disabled={busy}>
            {confirmDelete ? 'Tap again to delete' : 'Delete Meal'}
          </Button>
        </div>
      </div>
    </div>
  );
}
