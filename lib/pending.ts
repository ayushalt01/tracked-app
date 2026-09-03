import type { PendingScan } from './types';

/**
 * The transient scan result, held between a successful AI call and the user
 * confirming "Log This Meal". sessionStorage (not the DB) — it is discarded on
 * retake, on back, and when the tab closes.
 *
 * Exposed as an external store so the Result screen can read it with
 * useSyncExternalStore instead of syncing it into state from an effect.
 */
const KEY = 'tracked_pending_scan';

const listeners = new Set<() => void>();
let cachedRaw: string | null = null;
let cachedValue: PendingScan | null = null;

function emit() {
  listeners.forEach((l) => l());
}

export function subscribePendingScan(onChange: () => void) {
  listeners.add(onChange);
  window.addEventListener('storage', onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener('storage', onChange);
  };
}

/** Stable-identity snapshot: re-parsed only when the stored string changes. */
export function getPendingScan(): PendingScan | null {
  let raw: string | null = null;
  try {
    raw = sessionStorage.getItem(KEY);
  } catch {
    raw = null;
  }

  if (raw !== cachedRaw) {
    cachedRaw = raw;
    try {
      cachedValue = raw ? (JSON.parse(raw) as PendingScan) : null;
    } catch {
      cachedValue = null;
    }
  }
  return cachedValue;
}

/** Server render (and hydration) never has a pending scan. */
export function getPendingScanServerSnapshot(): PendingScan | null {
  return null;
}

export function setPendingScan(scan: PendingScan) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(scan));
  } catch {
    // Quota or private mode — the Result screen will send the user back to Scan.
  }
  emit();
}

export function clearPendingScan() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // ignore
  }
  emit();
}
