import type { NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/session';

/**
 * Refreshes the Supabase auth cookie on every request and redirects signed-out
 * visitors to /login. (Next 16's replacement for the `middleware` convention.)
 */
export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Everything except Next internals, the PWA shell files and image assets —
     * the service worker and manifest must stay reachable while signed out.
     */
    '/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|icons/|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
