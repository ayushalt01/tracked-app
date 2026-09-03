import { PhoneShell } from '@/components/Shell';

export const metadata = { title: 'Offline — Tracked' };

export default function OfflinePage() {
  return (
    <PhoneShell>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          padding: '0 40px',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 24, lineHeight: '36px', fontWeight: 700, color: 'var(--text-primary)' }}>
          You&rsquo;re offline
        </div>
        <div style={{ fontSize: 15, lineHeight: '22px', color: 'var(--text-secondary)' }}>
          Tracked needs a connection to analyze and log meals. Reconnect and try again.
        </div>
      </div>
    </PhoneShell>
  );
}
