/**
 * Icon set — recreated in the design system's ~1.5px rounded-stroke line
 * style, with solid "-fill" variants for the active bottom-nav slot.
 */
import type { CSSProperties } from 'react';

type IconProps = {
  size?: number;
  style?: CSSProperties;
  className?: string;
};

function Svg({ size = 24, style, className, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

function SolidSvg({ size = 24, style, className, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="none"
      style={style}
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

export const IcHome = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3.5 10.2 12 3.5l8.5 6.7V19a1.5 1.5 0 0 1-1.5 1.5h-3.5V15a1 1 0 0 0-1-1h-3a1 1 0 0 0-1 1v5.5H5A1.5 1.5 0 0 1 3.5 19z" />
  </Svg>
);

export const IcHomeFill = (p: IconProps) => (
  <SolidSvg {...p}>
    <path d="M12 2.7 2.75 10a1 1 0 0 0-.25.66V19A2.5 2.5 0 0 0 5 21.5h4V15a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v6.5h4a2.5 2.5 0 0 0 2.5-2.5v-8.34a1 1 0 0 0-.38-.78z" />
  </SolidSvg>
);

export const IcAnalysis = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 20.5V13" />
    <path d="M12 20.5V4.5" />
    <path d="M19 20.5v-5" />
  </Svg>
);

export const IcAnalysisFill = (p: IconProps) => (
  <SolidSvg {...p}>
    <rect x="3.6" y="12" width="2.8" height="9.2" rx="1.4" />
    <rect x="10.6" y="3.4" width="2.8" height="17.8" rx="1.4" />
    <rect x="17.6" y="14.6" width="2.8" height="6.6" rx="1.4" />
  </SolidSvg>
);

export const IcAi = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3.2l1.9 4.9 4.9 1.9-4.9 1.9-1.9 4.9-1.9-4.9L5.2 10l4.9-1.9z" />
    <path d="M18.3 16.1l.7 1.9 1.9.7-1.9.7-.7 1.9-.7-1.9-1.9-.7 1.9-.7z" />
  </Svg>
);

export const IcAiFill = (p: IconProps) => (
  <SolidSvg {...p}>
    <path d="M12 2.6a.8.8 0 0 1 .75.52l1.79 4.64 4.64 1.79a.8.8 0 0 1 0 1.5l-4.64 1.79-1.79 4.64a.8.8 0 0 1-1.5 0l-1.79-4.64-4.64-1.79a.8.8 0 0 1 0-1.5l4.64-1.79 1.79-4.64A.8.8 0 0 1 12 2.6z" />
    <path d="M18.3 15.4a.7.7 0 0 1 .66.46l.6 1.58 1.58.6a.7.7 0 0 1 0 1.32l-1.58.6-.6 1.58a.7.7 0 0 1-1.32 0l-.6-1.58-1.58-.6a.7.7 0 0 1 0-1.32l1.58-.6.6-1.58a.7.7 0 0 1 .66-.46z" />
  </SolidSvg>
);

export const IcSettings = (p: IconProps) => (
  <Svg {...p}>
    <path d="M10.6 3.2h2.8l.35 2.14a6.6 6.6 0 0 1 1.72 1l2.02-.8 1.4 2.42-1.66 1.4a6.7 6.7 0 0 1 0 1.98l1.66 1.4-1.4 2.42-2.02-.8a6.6 6.6 0 0 1-1.72 1l-.35 2.14h-2.8l-.35-2.14a6.6 6.6 0 0 1-1.72-1l-2.02.8-1.4-2.42 1.66-1.4a6.7 6.7 0 0 1 0-1.98l-1.66-1.4 1.4-2.42 2.02.8a6.6 6.6 0 0 1 1.72-1z" />
    <circle cx="12" cy="12" r="2.6" />
  </Svg>
);

export const IcSettingsFill = (p: IconProps) => (
  <SolidSvg {...p}>
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M10.6 2.4a.8.8 0 0 0-.79.67l-.28 1.7a7.4 7.4 0 0 0-1.1.64l-1.6-.63a.8.8 0 0 0-.98.34l-1.4 2.42a.8.8 0 0 0 .18 1l1.32 1.11a7.5 7.5 0 0 0 0 1.28l-1.32 1.11a.8.8 0 0 0-.18 1l1.4 2.42a.8.8 0 0 0 .98.34l1.6-.63c.35.25.72.46 1.1.64l.28 1.7a.8.8 0 0 0 .79.67h2.8a.8.8 0 0 0 .79-.67l.28-1.7c.38-.18.75-.39 1.1-.64l1.6.63a.8.8 0 0 0 .98-.34l1.4-2.42a.8.8 0 0 0-.18-1l-1.32-1.11a7.5 7.5 0 0 0 0-1.28l1.32-1.11a.8.8 0 0 0 .18-1l-1.4-2.42a.8.8 0 0 0-.98-.34l-1.6.63a7.4 7.4 0 0 0-1.1-.64l-.28-1.7a.8.8 0 0 0-.79-.67zM12 8.6a3.4 3.4 0 1 0 0 6.8 3.4 3.4 0 0 0 0-6.8z"
    />
  </SolidSvg>
);

export const IcCamera = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3.5 8.8A1.8 1.8 0 0 1 5.3 7h1.9a1 1 0 0 0 .83-.45l.74-1.1A1 1 0 0 1 9.6 5h4.8a1 1 0 0 1 .83.45l.74 1.1a1 1 0 0 0 .83.45h1.9a1.8 1.8 0 0 1 1.8 1.8v8.4a1.8 1.8 0 0 1-1.8 1.8H5.3a1.8 1.8 0 0 1-1.8-1.8z" />
    <circle cx="12" cy="12.8" r="3.4" />
  </Svg>
);

export const IcChevronLeft = (p: IconProps) => (
  <Svg {...p}>
    <path d="M14.5 5.5 8 12l6.5 6.5" />
  </Svg>
);

/** Points right at rest; rotated 90° by the caller when a panel is open. */
export const IcChevron = (p: IconProps) => (
  <Svg {...p}>
    <path d="M8.5 4.5 16 12l-7.5 7.5" />
  </Svg>
);
