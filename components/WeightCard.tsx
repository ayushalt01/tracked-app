'use client';

import { useState } from 'react';

import { Button, InlineNumber } from '@/components/ui';
import { addDays, kgToUnit, trailingAverage, unitToKg, weeklyRateKg } from '@/lib/data';
import { useApp } from '@/lib/store';
import type { WeightEntry } from '@/lib/types';

const WINDOW_DAYS = 30;
const CHART_W = 380;
const CHART_H = 110;

function fmt(value: number, unit: string) {
  return `${value.toFixed(1)} ${unit}`;
}

/** Weight trend, and the intake that produced it. */
export function WeightCard({ avgCalories }: { avgCalories: number | null }) {
  const { state, today, logWeight } = useApp();
  const unit = state.profile.weightUnit;

  const [draft, setDraft] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const from = addDays(today, -(WINDOW_DAYS - 1));
  const window: WeightEntry[] = state.weights
    .filter((w) => w.dateISO >= from && w.dateISO <= today)
    .sort((a, b) => a.dateISO.localeCompare(b.dateISO));

  const smoothed = trailingAverage(window);
  const rateKg = weeklyRateKg(window);
  const latest = window.at(-1) ?? null;
  const trend = smoothed.at(-1) ?? null;
  const loggedToday = state.weights.find((w) => w.dateISO === today) ?? null;

  const entryValue = draft ?? (loggedToday ? Number(kgToUnit(loggedToday.kg, unit).toFixed(1)) : 0);

  async function save() {
    if (busy || entryValue <= 0) return;
    setBusy(true);
    setError(null);
    try {
      await logWeight(unitToKg(entryValue, unit), today);
      setDraft(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save that.');
    } finally {
      setBusy(false);
    }
  }

  // Chart geometry — smoothed line, with the raw readings behind it as dots.
  const values = smoothed.map((p) => p.kg);
  const min = values.length ? Math.min(...values, ...window.map((w) => w.kg)) : 0;
  const max = values.length ? Math.max(...values, ...window.map((w) => w.kg)) : 1;
  const pad = Math.max(0.3, (max - min) * 0.15);
  const lo = min - pad;
  const hi = max + pad;
  const dayIndex = (iso: string) =>
    Math.round((Date.parse(iso + 'T00:00:00Z') - Date.parse(from + 'T00:00:00Z')) / 86_400_000);
  const x = (iso: string) => (dayIndex(iso) / (WINDOW_DAYS - 1)) * CHART_W;
  const y = (kg: number) => CHART_H - ((kg - lo) / (hi - lo)) * CHART_H;
  const line = smoothed.map((p) => `${x(p.dateISO).toFixed(1)},${y(p.kg).toFixed(1)}`).join(' ');

  return (
    <div
      style={{
        marginTop: 20,
        background: 'var(--gray-500)',
        borderRadius: 'var(--radius-xl)',
        padding: 20,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 15, lineHeight: '22px', color: 'var(--text-secondary)' }}>Weight</div>
        {rateKg !== null && (
          <div style={{ fontSize: 13, lineHeight: '19px', color: 'var(--text-secondary)' }}>
            last {window.length} readings
          </div>
        )}
      </div>

      {trend ? (
        <>
          <div style={{ marginTop: 4, fontSize: 34, lineHeight: '51px', fontWeight: 700, color: 'var(--text-primary)' }}>
            {fmt(kgToUnit(trend.kg, unit), unit)}
            <span style={{ fontSize: 15, fontWeight: 400, color: 'var(--text-secondary)' }}> trend</span>
          </div>
          <div style={{ fontSize: 13, lineHeight: '19px', color: 'var(--text-secondary)' }}>
            {latest && `last reading ${fmt(kgToUnit(latest.kg, unit), unit)}`}
            {rateKg !== null && (
              <>
                {' · '}
                <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                  {rateKg >= 0 ? '+' : '−'}
                  {fmt(Math.abs(kgToUnit(rateKg, unit)), unit)}/week
                </span>
              </>
            )}
            {avgCalories !== null && ` on ${avgCalories.toLocaleString()} kcal/day`}
          </div>

          <svg
            viewBox={`0 0 ${CHART_W} ${CHART_H}`}
            width="100%"
            height={CHART_H}
            style={{ marginTop: 16, display: 'block', overflow: 'visible' }}
            role="img"
            aria-label="Weight trend"
          >
            {window.map((w) => (
              <circle
                key={w.id}
                cx={x(w.dateISO)}
                cy={y(w.kg)}
                r={2.5}
                fill="rgba(255,255,255,0.28)"
              />
            ))}
            {smoothed.length > 1 && (
              <polyline
                points={line}
                fill="none"
                stroke="var(--primary-100)"
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
          </svg>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 12,
              color: 'var(--text-secondary)',
            }}
          >
            <span>{fmt(kgToUnit(lo, unit), unit)}</span>
            <span>{fmt(kgToUnit(hi, unit), unit)}</span>
          </div>
        </>
      ) : (
        <div style={{ marginTop: 8, fontSize: 15, lineHeight: '22px', color: 'var(--text-secondary)' }}>
          Weigh yourself at the same time each day — first thing, before eating — and the trend
          line will tell you whether your intake is working.
        </div>
      )}

      {/* Entry */}
      <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: 'var(--gray-600)',
            border: '1px solid var(--gray-400)',
            borderRadius: 'var(--radius-md)',
            padding: '12px 16px',
            color: '#fff',
            fontSize: 17,
          }}
        >
          <InlineNumber
            value={entryValue}
            onChange={setDraft}
            label="Today's weight"
            underline="rgba(255,255,255,0.3)"
          />
          <span style={{ color: 'var(--text-secondary)' }}>{unit}</span>
        </div>
        <div style={{ flexShrink: 0, width: 96 }}>
          <Button size="md" onClick={save} disabled={busy || entryValue <= 0}>
            {loggedToday && draft === null ? 'Logged' : busy ? '…' : 'Save'}
          </Button>
        </div>
      </div>
      {error && (
        <div style={{ marginTop: 8, fontSize: 13, color: '#FF3E3E' }}>{error}</div>
      )}
    </div>
  );
}
