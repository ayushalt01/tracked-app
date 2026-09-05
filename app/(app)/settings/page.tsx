'use client';

import { useState } from 'react';

import { Frame } from '@/components/Shell';
import { Avatar, Button, SectionTitle, Toggle, useNumberDraft } from '@/components/ui';
import { useApp } from '@/lib/store';
import type { Goals } from '@/lib/types';

/** Underlined text field used inside the profile card. */
const underlineField = {
  width: '100%',
  boxSizing: 'border-box' as const,
  background: 'transparent',
  border: 0,
  borderBottom: '1px solid var(--gray-400)',
  color: '#fff',
  fontSize: 17,
  lineHeight: '24px',
  fontWeight: 600,
  padding: '4px 0',
  outline: 'none',
};

function GoalField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div style={{ fontSize: 13, lineHeight: '19px', color: 'var(--text-secondary)', marginBottom: 6 }}>
        {label}
      </div>
      <input
        type="text"
        {...useNumberDraft(value, onChange)}
        style={{
          width: '100%',
          boxSizing: 'border-box',
          background: 'var(--gray-500)',
          border: '1px solid var(--gray-400)',
          borderRadius: 'var(--radius-md)',
          padding: '12px 16px',
          color: '#fff',
          fontSize: 17,
          outline: 'none',
        }}
      />
    </div>
  );
}

export default function SettingsScreen() {
  const { state, email, saveProfileAndGoals, setNotifications, clearMeals, signOut } = useApp();

  const [goals, setGoals] = useState<Goals>(state.goals);
  const [name, setName] = useState(state.profile.name);
  const [dietPlan, setDietPlan] = useState(state.profile.dietPlan);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  async function handleSave() {
    setBusy(true);
    setError(null);
    try {
      await saveProfileAndGoals({ ...state.profile, name, dietPlan }, goals);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your changes.');
    } finally {
      setBusy(false);
    }
  }

  async function handleClear() {
    if (!confirmClear) {
      setConfirmClear(true);
      setTimeout(() => setConfirmClear(false), 4000);
      return;
    }
    setConfirmClear(false);
    await clearMeals();
  }

  return (
    <Frame active="settings">
      <div style={{ padding: '16px 20px 0 20px' }}>
        <div style={{ fontSize: 24, lineHeight: '36px', fontWeight: 700, color: 'var(--text-primary)' }}>
          Settings
        </div>

        {/* Profile */}
        <div
          style={{
            marginTop: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            background: 'var(--gray-500)',
            borderRadius: 'var(--radius-xl)',
            padding: 20,
          }}
        >
          <Avatar size={56} initial={(name.charAt(0) || 'A').toUpperCase()} />
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>Name</div>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                aria-label="Name"
                style={underlineField}
              />
            </div>
            <div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>
                Diet plan
              </div>
              <input
                value={dietPlan}
                onChange={(e) => setDietPlan(e.target.value)}
                aria-label="Diet plan"
                placeholder="Lean Bulk"
                style={underlineField}
              />
            </div>
          </div>
        </div>

        {/* Daily Goals */}
        <SectionTitle>Daily Goals</SectionTitle>
        <div
          style={{
            marginTop: 12,
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
            background: 'var(--gray-500)',
            borderRadius: 'var(--radius-xl)',
            padding: 20,
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <GoalField
              label="Calories (kcal)"
              value={goals.calories}
              onChange={(v) => setGoals({ ...goals, calories: v })}
            />
            <GoalField
              label="Protein (g)"
              value={goals.protein}
              onChange={(v) => setGoals({ ...goals, protein: v })}
            />
            <GoalField
              label="Carbs (g)"
              value={goals.carbs}
              onChange={(v) => setGoals({ ...goals, carbs: v })}
            />
            <GoalField
              label="Fat (g)"
              value={goals.fat}
              onChange={(v) => setGoals({ ...goals, fat: v })}
            />
          </div>

          {error && (
            <div
              style={{
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

          <div style={{ marginTop: 4 }}>
            <Button size="md" onClick={handleSave} disabled={busy}>
              {saved ? 'Saved' : 'Save Changes'}
            </Button>
          </div>
        </div>

        {/* Preferences */}
        <SectionTitle>Preferences</SectionTitle>
        <div
          style={{
            marginTop: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--gray-500)',
            borderRadius: 'var(--radius-lg)',
            padding: '16px 20px',
          }}
        >
          <div style={{ fontSize: 15, lineHeight: '22px', color: 'var(--text-primary)', fontWeight: 500 }}>
            Meal Reminders
          </div>
          <Toggle on={state.notifications} onChange={() => setNotifications(!state.notifications)} />
        </div>

        {/* Data */}
        <SectionTitle>Data</SectionTitle>
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Button size="md" variant="outline" onClick={handleClear}>
            {confirmClear ? 'Tap again to confirm' : 'Clear Logged Meals'}
          </Button>
        </div>

        {/* Account */}
        <SectionTitle>Account</SectionTitle>
        <div style={{ marginTop: 12, marginBottom: 8 }}>
          <div style={{ fontSize: 13, lineHeight: '19px', color: 'var(--text-secondary)', marginBottom: 12 }}>
            Signed in as {email}
          </div>
          <Button size="md" variant="outline" onClick={signOut}>
            Sign Out
          </Button>
        </div>
      </div>
    </Frame>
  );
}
