'use client';

/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';

import { BackButton, Frame } from '@/components/Shell';
import { Button, InlineNumber, MacroRow, ProgressBar, SectionTitle } from '@/components/ui';
import { IcChevron } from '@/components/icons';
import { MICRO_DEFS } from '@/lib/data';
import { dataUrlToBlob } from '@/lib/image';
import {
  clearPendingScan,
  getPendingScan,
  getPendingScanServerSnapshot,
  subscribePendingScan,
} from '@/lib/pending';
import { useApp } from '@/lib/store';
import type { Analysis, RefineTurn } from '@/lib/types';

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

  // Corrections layer over the AI's estimate — from hand edits or from refine.
  const [corrected, setCorrected] = useState<Analysis | null>(null);
  const [editedName, setEditedName] = useState<string | null>(null);
  const [turns, setTurns] = useState<RefineTurn[]>([]);
  const [note, setNote] = useState('');
  const [refining, setRefining] = useState(false);
  const [microOpen, setMicroOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const leaving = useRef(false);
  const chatEnd = useRef<HTMLDivElement>(null);

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

  const values = corrected ?? pending.analysis;
  const name = editedName ?? values.name ?? 'Meal';

  function setField(key: keyof Analysis, value: number) {
    setCorrected({ ...values, [key]: value });
  }

  function retake() {
    leaving.current = true;
    clearPendingScan();
    router.replace('/scan');
  }

  async function sendCorrection() {
    const text = note.trim();
    if (!text || refining || !pending) return;

    setRefining(true);
    setError(null);
    setNote('');
    const sent: RefineTurn[] = [...turns, { role: 'user', text }];
    setTurns(sent);

    try {
      const form = new FormData();
      form.append('image', dataUrlToBlob(pending.photo), 'meal.jpg');
      form.append('note', text);
      form.append('current', JSON.stringify(values));
      form.append('history', JSON.stringify(turns));

      const res = await fetch('/api/refine-meal', { method: 'POST', body: form });
      const payload = await res.json().catch(() => null);
      if (!res.ok) throw new Error(payload?.error || 'Could not apply that correction.');

      setCorrected(payload.analysis as Analysis);
      setEditedName(null); // let a re-identified dish rename itself
      setTurns([...sent, { role: 'model', text: payload.reply, analysis: payload.analysis }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not apply that correction.');
      setTurns(turns); // drop the unanswered message so it can be retried
      setNote(text);
    } finally {
      setRefining(false);
      requestAnimationFrame(() => chatEnd.current?.scrollIntoView({ behavior: 'smooth' }));
    }
  }

  async function handleLog() {
    if (!pending || saving) return;
    setSaving(true);
    setError(null);
    try {
      await logMeal({ ...values, name }, name.trim() || 'Meal', pending.photo);
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
        {values.description && (
          <div style={{ fontSize: 15, lineHeight: '22px', color: 'var(--text-secondary)' }}>
            {values.description}
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
            <InlineNumber
              value={Math.round(values.calories || 0)}
              onChange={(v) => setField('calories', v)}
              label="Calories"
              underline="rgba(18,18,18,0.3)"
            />{' '}
            <span style={{ fontSize: 17, lineHeight: '24px', fontWeight: 400 }}>kcal</span>
          </div>
        </div>

        <MacroRow
          protein={Math.round(values.protein || 0)}
          carbs={Math.round(values.carbs || 0)}
          fat={Math.round(values.fat || 0)}
          onChange={(key, v) => setField(key, v)}
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
              const val = Math.round(values[d.key] || 0);
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
                      {d.label}:{' '}
                      <InlineNumber
                        value={val}
                        onChange={(v) => setField(d.key, v)}
                        label={d.label}
                        underline="rgba(255,255,255,0.3)"
                      />
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

        {/* Correction chat */}
        <SectionTitle>Not quite right?</SectionTitle>
        <div
          style={{
            marginTop: 12,
            background: 'var(--gray-500)',
            borderRadius: 'var(--radius-lg)',
            padding: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          {turns.length === 0 && !refining && (
            <div style={{ fontSize: 13, lineHeight: '19px', color: 'var(--text-secondary)' }}>
              Tell me what&rsquo;s off and I&rsquo;ll re-estimate — portion size, a missed ingredient,
              how it was cooked. You can also tap any number above to set it yourself.
            </div>
          )}

          {turns.map((turn, i) => (
            <div
              key={i}
              style={{
                alignSelf: turn.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '85%',
                padding: '8px 12px',
                borderRadius: 12,
                fontSize: 13,
                lineHeight: '19px',
                background: turn.role === 'user' ? 'var(--primary-100)' : 'rgba(255,255,255,0.07)',
                color: turn.role === 'user' ? '#fff' : 'var(--text-primary)',
              }}
            >
              {turn.text}
            </div>
          ))}

          {refining && (
            <div
              style={{
                alignSelf: 'flex-start',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 13,
                color: 'var(--text-secondary)',
              }}
            >
              <span
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: '50%',
                  border: '2px solid rgba(255,255,255,0.25)',
                  borderTopColor: '#fff',
                  animation: 'tracked-spin 0.8s linear infinite',
                  display: 'inline-block',
                }}
              />
              Re-estimating…
            </div>
          )}
          <div ref={chatEnd} />

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  sendCorrection();
                }
              }}
              placeholder="e.g. it was 2 eggs, no oil"
              aria-label="Correction"
              disabled={refining}
              style={{
                flex: 1,
                minWidth: 0,
                background: 'var(--gray-600)',
                border: '1px solid var(--gray-400)',
                borderRadius: 'var(--radius-md)',
                padding: '10px 12px',
                color: '#fff',
                fontSize: 15,
                outline: 'none',
              }}
            />
            <button
              onClick={sendCorrection}
              disabled={refining || !note.trim()}
              style={{
                flexShrink: 0,
                height: 40,
                padding: '0 16px',
                borderRadius: 'var(--radius-md)',
                border: 0,
                background: 'var(--primary-100)',
                color: '#fff',
                fontSize: 15,
                fontWeight: 600,
                opacity: refining || !note.trim() ? 0.5 : 1,
                cursor: refining || !note.trim() ? 'default' : 'pointer',
              }}
            >
              Send
            </button>
          </div>
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

        <div style={{ marginTop: 24, paddingBottom: 8 }}>
          <Button onClick={handleLog} disabled={saving}>
            {saving ? 'Logging…' : 'Log This Meal'}
          </Button>
        </div>
      </div>
    </Frame>
  );
}
