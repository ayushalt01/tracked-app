'use client';

/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';

import { BackButton, Frame } from '@/components/Shell';
import { Button, MacroRow, ProgressBar } from '@/components/ui';
import { IcChevron } from '@/components/icons';
import { MICRO_DEFS } from '@/lib/data';
import {
  clearPendingScan,
  getPendingScan,
  getPendingScanServerSnapshot,
  subscribePendingScan,
} from '@/lib/pending';
import { useApp } from '@/lib/store';

export default function ResultScreen() {
  const router = useRouter();
  const { state, logMeal } = useApp();

  // The scan is transient state handed over by the Scan screen, so it lives in
  // sessionStorage rather than in React state or the database.
  const pending = useSyncExternalStore(
    subscribePendingScan,
    getPendingScan,
    getPendingScanServerSnapshot,
  );

  const [editedName, setEditedName] = useState<string | null>(null);
  const [microOpen, setMicroOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const leaving = useRef(false);

  // Landing here with no scan at all (a direct link, or a discarded one) means
  // start over. Re-read the store directly: on a reload the hydration render
  // still holds the server snapshot when this effect first runs.
  useEffect(() => {
    if (leaving.current || pending) return;
    if (!getPendingScan()) router.replace('/scan');
  }, [pending, router]);

  if (!pending) {
    return <Frame active="scan"><div /></Frame>;
  }

  const a = pending.analysis;
  const name = editedName ?? a.name ?? 'Meal';

  function retake() {
    leaving.current = true;
    clearPendingScan();
    router.replace('/scan');
  }

  async function handleLog() {
    if (!pending || saving) return;
    setSaving(true);
    setError(null);
    try {
      await logMeal(pending.analysis, name.trim() || 'Meal', pending.photo);
      leaving.current = true;
      clearPendingScan();
      router.push('/home');
    } catch (err) {
      setSaving(false);
      setError(err instanceof Error ? err.message : 'Could not log this meal.');
    }
  }

  return (
    <Frame active="scan">
      {/* Photo header */}
      <div style={{ position: 'relative', width: '100%', height: 320 }}>
        <img src={pending.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(180deg, rgba(0,0,0,0) 40%, rgba(0,0,0,0.75) 100%)',
          }}
        />
        <div style={{ position: 'absolute', top: 16, left: 20 }}>
          <BackButton dark onClick={retake} />
        </div>
        <div style={{ position: 'absolute', bottom: 16, left: 20, right: 20 }}>
          <div
            style={{
              fontSize: 12,
              letterSpacing: 0.5,
              textTransform: 'uppercase',
              color: 'var(--accent-200)',
              fontWeight: 600,
            }}
          >
            AI Estimated
          </div>
          <input
            value={name}
            onChange={(e) => setEditedName(e.target.value)}
            aria-label="Meal name"
            style={{
              background: 'transparent',
              border: 0,
              outline: 0,
              color: '#fff',
              fontSize: 24,
              lineHeight: '36px',
              fontWeight: 700,
              width: '100%',
              padding: 0,
            }}
          />
        </div>
      </div>

      <div style={{ padding: '20px 20px 0 20px' }}>
        {a.description && (
          <div style={{ fontSize: 15, lineHeight: '22px', color: 'var(--text-secondary)' }}>
            {a.description}
          </div>
        )}

        {/* Calorie hero — raw estimate, no goal framing */}
        <div
          style={{
            marginTop: 16,
            background: 'var(--accent-200)',
            borderRadius: 'var(--radius-xl)',
            padding: 24,
          }}
        >
          <div style={{ fontSize: 20, lineHeight: '30px', fontWeight: 700, color: 'var(--gray-600)' }}>
            Calories
          </div>
          <div style={{ fontSize: 34, lineHeight: '51px', fontWeight: 700, color: 'var(--gray-600)' }}>
            {Math.round(a.calories || 0).toLocaleString()}{' '}
            <span style={{ fontSize: 17, lineHeight: '24px', fontWeight: 400 }}>kcal</span>
          </div>
        </div>

        <MacroRow
          protein={Math.round(a.protein || 0)}
          carbs={Math.round(a.carbs || 0)}
          fat={Math.round(a.fat || 0)}
        />

        {/* Micronutrients */}
        <button
          onClick={() => setMicroOpen((v) => !v)}
          aria-expanded={microOpen}
          style={{
            marginTop: 24,
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'none',
            border: 0,
            padding: 0,
            cursor: 'pointer',
          }}
        >
          <div style={{ fontSize: 18, lineHeight: '27px', fontWeight: 600, color: 'var(--text-primary)' }}>
            Micronutrients
          </div>
          <IcChevron
            size={16}
            style={{
              color: 'var(--text-secondary)',
              transform: microOpen ? 'rotate(90deg)' : 'rotate(0deg)',
              transition: 'transform var(--duration-base) var(--ease-standard)',
            }}
          />
        </button>

        {microOpen && (
          <div
            style={{
              marginTop: 12,
              background: 'var(--gray-500)',
              borderRadius: 'var(--radius-lg)',
              padding: 16,
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
            }}
          >
            {MICRO_DEFS.map((d) => {
              const val = Math.round(a[d.key] || 0);
              const goal = state.goals[d.key] || 1;
              return (
                <div key={d.key}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: 13,
                      lineHeight: '19px',
                      color: 'var(--text-primary)',
                      marginBottom: 4,
                    }}
                  >
                    <span>
                      {d.label}: {val}
                      {d.unit}
                    </span>
                    <span style={{ color: 'var(--text-secondary)' }}>
                      {Math.round((val / goal) * 100)}% DV
                    </span>
                  </div>
                  <ProgressBar pct={(val / goal) * 100} />
                </div>
              );
            })}
          </div>
        )}

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

        <div style={{ marginTop: 24, paddingBottom: 8 }}>
          <Button onClick={handleLog} disabled={saving}>
            {saving ? 'Logging…' : 'Log This Meal'}
          </Button>
        </div>
      </div>
    </Frame>
  );
}
