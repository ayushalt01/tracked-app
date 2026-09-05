'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const COOKIE = 'tracked_tz';

function readCookie(name: string): string | null {
  return (
    document.cookie
      .split('; ')
      .find((c) => c.startsWith(`${name}=`))
      ?.slice(name.length + 1) ?? null
  );
}

/**
 * Tells the server which timezone the user is in.
 *
 * The server renders in UTC on Vercel; without this it would put an evening
 * meal on the following calendar day and drop it from "today". Set once, then
 * refresh so the current page re-renders with the right day boundaries.
 */
export function TimezoneCookie() {
  const router = useRouter();

  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!tz || readCookie(COOKIE) === encodeURIComponent(tz)) return;

    document.cookie = `${COOKIE}=${encodeURIComponent(tz)}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  }, [router]);

  return null;
}
