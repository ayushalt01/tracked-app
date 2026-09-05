'use client';

/** Segmented control for choosing how to log a meal. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { key: T; label: string }[];
  value: T;
  onChange: (key: T) => void;
}) {
  return (
    <div
      role="tablist"
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${options.length}, 1fr)`,
        gap: 4,
        padding: 4,
        background: 'rgba(255,255,255,0.06)',
        borderRadius: 'var(--radius-md)',
      }}
    >
      {options.map((o) => {
        const active = o.key === value;
        return (
          <button
            key={o.key}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.key)}
            style={{
              padding: '8px 0',
              borderRadius: 9,
              border: 0,
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600,
              background: active ? 'var(--primary-100)' : 'transparent',
              color: active ? '#fff' : 'var(--text-secondary)',
              transition: 'background var(--duration-base) var(--ease-standard)',
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
