'use client';

import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import {
  IcAi, IcAiFill, IcAnalysis, IcAnalysisFill, IcChevronLeft,
  IcHome, IcHomeFill, IcSettings, IcSettingsFill,
} from './icons';

export type NavKey = 'home' | 'analysis' | 'scan' | 'settings';

// --------------------------------------------------------------- StatusBar --

function StatusBar() {
  // Live clock in the browser preview; hidden once installed (see globals.css).
  const [time, setTime] = useState('9:41');

  useEffect(() => {
    const tick = () => {
      const d = new Date();
      let h = d.getHours() % 12;
      if (h === 0) h = 12;
      setTime(h + ':' + String(d.getMinutes()).padStart(2, '0'));
    };
    tick();
    const id = setInterval(tick, 20_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="statusbar">
      <span>{time}</span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {/* cellular */}
        <svg width="18" height="12" viewBox="0 0 18 12" fill="currentColor" aria-hidden="true">
          <rect x="0" y="8" width="3" height="4" rx="1" />
          <rect x="5" y="5.5" width="3" height="6.5" rx="1" />
          <rect x="10" y="3" width="3" height="9" rx="1" />
          <rect x="15" y="0" width="3" height="12" rx="1" />
        </svg>
        {/* wifi */}
        <svg width="17" height="12" viewBox="0 0 17 12" fill="currentColor" aria-hidden="true">
          <path d="M8.5 11.5 6.2 8.9a3.6 3.6 0 0 1 4.6 0z" />
          <path
            d="M8.5 3.1c2 0 3.9.75 5.3 2.05l1.3-1.45A9.6 9.6 0 0 0 8.5 1.1a9.6 9.6 0 0 0-6.6 2.6l1.3 1.45A7.6 7.6 0 0 1 8.5 3.1z"
          />
          <path
            d="M8.5 6.15c1.2 0 2.3.44 3.15 1.2l1.28-1.42A6.6 6.6 0 0 0 8.5 4.2a6.6 6.6 0 0 0-4.43 1.73L5.35 7.35A4.65 4.65 0 0 1 8.5 6.15z"
          />
        </svg>
        {/* battery */}
        <svg width="26" height="13" viewBox="0 0 26 13" fill="none" aria-hidden="true">
          <rect x="0.5" y="0.5" width="22" height="12" rx="3.5" stroke="currentColor" opacity="0.4" />
          <rect x="2" y="2" width="19" height="9" rx="2.2" fill="currentColor" />
          <path d="M24 4.5v4a2.2 2.2 0 0 0 0-4z" fill="currentColor" opacity="0.5" />
        </svg>
      </span>
    </div>
  );
}

// -------------------------------------------------------------- BottomNav --

const NAV_ITEMS: { key: NavKey; href: string; label: string; Icon: typeof IcHome; Fill: typeof IcHome }[] = [
  { key: 'home', href: '/home', label: 'Home', Icon: IcHome, Fill: IcHomeFill },
  { key: 'analysis', href: '/analysis', label: 'Analysis', Icon: IcAnalysis, Fill: IcAnalysisFill },
  { key: 'scan', href: '/scan', label: 'Scan', Icon: IcAi, Fill: IcAiFill },
  { key: 'settings', href: '/settings', label: 'Settings', Icon: IcSettings, Fill: IcSettingsFill },
];

export function BottomNav({ active }: { active: NavKey }) {
  const router = useRouter();

  return (
    <div
      style={{
        position: 'absolute',
        left: '50%',
        transform: 'translateX(-50%)',
        bottom: 34,
        zIndex: 20,
      }}
    >
      <div
        style={{
          display: 'flex',
          gap: 8,
          padding: 6,
          borderRadius: 'var(--radius-pill)',
          background: 'var(--gray-400)',
          boxShadow: 'var(--shadow-nav)',
        }}
      >
        {NAV_ITEMS.map(({ key, href, label, Icon, Fill }) => {
          const isActive = active === key;
          const Glyph = isActive ? Fill : Icon;
          return (
            <button
              key={key}
              aria-label={label}
              aria-current={isActive ? 'page' : undefined}
              onClick={() => router.push(href)}
              style={{
                width: 54,
                height: 54,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: isActive ? 'var(--primary-100)' : 'var(--gray-300)',
                color: isActive ? '#fff' : 'rgb(41,45,50)',
                border: 0,
                padding: 0,
                cursor: 'pointer',
                transition: 'background var(--duration-base) var(--ease-standard)',
              }}
            >
              <Glyph size={24} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ------------------------------------------------------------- BackButton --

export function BackButton({ onClick, dark }: { onClick: () => void; dark?: boolean }) {
  return (
    <button
      onClick={onClick}
      aria-label="Back"
      style={{
        width: 40,
        height: 40,
        borderRadius: '50%',
        background: dark ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.16)',
        border: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        color: '#fff',
        flexShrink: 0,
      }}
    >
      <IcChevronLeft size={20} />
    </button>
  );
}

// ------------------------------------------------------------------ Frame --

export function PhoneShell({ bg, children }: { bg?: string; children: ReactNode }) {
  return (
    <div className="shell">
      <div className="canvas" style={bg ? { background: bg } : undefined}>
        {children}
      </div>
    </div>
  );
}

export function Frame({
  bg,
  active,
  showNav = true,
  fill = false,
  overlay,
  children,
}: {
  bg?: string;
  active: NavKey;
  showNav?: boolean;
  /** Screen lays itself out to the viewport (Scan) — no trailing nav spacer. */
  fill?: boolean;
  /** Sheets and dialogs, rendered above the scroll area and the nav. */
  overlay?: ReactNode;
  children: ReactNode;
}) {
  return (
    <PhoneShell bg={bg}>
      <StatusBar />
      <div className="scrollarea">
        {children}
        {!fill && <div style={{ height: showNav ? 118 : 24 }} />}
      </div>
      {showNav && <BottomNav active={active} />}
      {overlay}
    </PhoneShell>
  );
}
