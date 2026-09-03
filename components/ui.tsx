'use client';

import type { CSSProperties, ReactNode } from 'react';

export const macroColors = {
  protein: 'var(--macro-protein)',
  carbs: 'var(--macro-carbs)',
  fat: 'var(--macro-fat)',
} as const;

// ------------------------------------------------------------------ Button --

type ButtonProps = {
  variant?: 'primary' | 'outline';
  size?: 'lg' | 'md';
  children: ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit';
  disabled?: boolean;
  style?: CSSProperties;
};

export function Button({
  variant = 'primary',
  size = 'lg',
  children,
  onClick,
  type = 'button',
  disabled,
  style,
}: ButtonProps) {
  const base: CSSProperties = {
    width: '100%',
    height: size === 'lg' ? 56 : 48,
    borderRadius: 'var(--radius-md)',
    fontSize: 17,
    lineHeight: '24px',
    fontWeight: 600,
    cursor: disabled ? 'default' : 'pointer',
    opacity: disabled ? 0.55 : 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'opacity var(--duration-base) var(--ease-standard)',
  };

  const skin: CSSProperties =
    variant === 'primary'
      ? { background: 'var(--primary-100)', color: '#fff', border: 0 }
      : { background: 'transparent', color: '#fff', border: '1px solid #fff' };

  return (
    <button type={type} onClick={onClick} disabled={disabled} style={{ ...base, ...skin, ...style }}>
      {children}
    </button>
  );
}

// ------------------------------------------------------------------ Toggle --

export function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      onClick={onChange}
      style={{
        width: 52,
        height: 32,
        borderRadius: 'var(--radius-pill)',
        border: 0,
        padding: 3,
        cursor: 'pointer',
        background: on ? 'var(--primary-100)' : 'var(--gray-400)',
        display: 'flex',
        justifyContent: on ? 'flex-end' : 'flex-start',
        alignItems: 'center',
        transition: 'background var(--duration-base) var(--ease-standard)',
      }}
    >
      <span
        style={{
          width: 26,
          height: 26,
          borderRadius: '50%',
          background: '#fff',
          display: 'block',
          transition: 'transform var(--duration-base) var(--ease-standard)',
        }}
      />
    </button>
  );
}

// --------------------------------------------------------------- MacroCard --

export function MacroCard({
  label,
  value,
  unit,
  color,
}: {
  label: string;
  value: number | string;
  unit: string;
  color: string;
}) {
  return (
    <div
      style={{
        background: color,
        borderRadius: 'var(--radius-lg)',
        padding: 16,
        color: 'var(--gray-600)',
      }}
    >
      <div style={{ fontSize: 15, lineHeight: '22px', fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 20, lineHeight: '30px', fontWeight: 700 }}>
        {value}
        {unit}
      </div>
    </div>
  );
}

export function MacroRow({
  protein,
  carbs,
  fat,
  marginTop = 16,
}: {
  protein: number;
  carbs: number;
  fat: number;
  marginTop?: number;
}) {
  return (
    <div style={{ marginTop, display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
      <MacroCard label="Protein" value={protein} unit="g" color={macroColors.protein} />
      <MacroCard label="Carbs" value={carbs} unit="g" color={macroColors.carbs} />
      <MacroCard label="Fat" value={fat} unit="g" color={macroColors.fat} />
    </div>
  );
}

// ------------------------------------------------------------- ProgressBar --

export function ProgressBar({ pct, color }: { pct: number; color?: string }) {
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <div
      style={{
        width: '100%',
        height: 6,
        borderRadius: 'var(--radius-pill)',
        background: 'rgba(255,255,255,0.12)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          width: clamped + '%',
          height: '100%',
          background: color || 'var(--primary-100)',
          borderRadius: 'var(--radius-pill)',
        }}
      />
    </div>
  );
}

// ------------------------------------------------------------ SectionTitle --

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 24,
      }}
    >
      <div style={{ fontSize: 18, lineHeight: '27px', fontWeight: 600, color: 'var(--text-primary)' }}>
        {children}
      </div>
      {right}
    </div>
  );
}

// ------------------------------------------------------------------ Avatar --

export function Avatar({ size, initial }: { size: number; initial: string }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: '50%',
        background: '#E9E9E7',
        color: '#8A8A85',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: Math.round(size * 0.375),
        fontWeight: 500,
        lineHeight: 1,
        userSelect: 'none',
      }}
    >
      {initial}
    </div>
  );
}

// -------------------------------------------------------------- Empty card --

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        padding: '24px 16px',
        textAlign: 'center',
        color: 'var(--text-secondary)',
        fontSize: 15,
        background: 'var(--gray-500)',
        borderRadius: 'var(--radius-lg)',
      }}
    >
      {children}
    </div>
  );
}
