# Tracked — AI Calorie & Macro Scanner

Photograph a meal, get an AI nutrition estimate, log it against your daily goals.
Next.js (App Router) on Vercel + Supabase (Postgres, Auth, Storage) + Google Gemini,
installable to a phone home screen as a PWA. Everything fits the free tiers.

Recreated from `design-reference/extracted/design_handoff_calorie_tracker/README.md`.

## Setup

### 1. Environment

Copy the template and fill it in — `.env.local` is git-ignored and must never be committed:

```bash
cp .env.local.example .env.local
```

| Variable | Where to get it | Exposed to browser |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API → Project URL | yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | same page → anon / publishable key | yes |
| `SUPABASE_SERVICE_ROLE_KEY` | same page → service_role key | **no** |
| `GEMINI_API_KEY` | https://aistudio.google.com/apikey | **no** |
| `GEMINI_MODEL` | optional; defaults to `gemini-2.5-flash` | **no** |

### 2. Database

Run `supabase/migrations/0001_init.sql` against your project — paste it into the
Supabase SQL editor, or with the CLI:

```bash
supabase db push
```

It creates `profiles`, `goals` and `meals` with row-level security (each user sees
only their own rows), a trigger that seeds a profile + default goals on signup, and
the public `meal-photos` storage bucket with owner-scoped write policies.

### 3. Run

```bash
npm install
npm run dev
```

Sign up at `/login`, then scan a meal.

## Deploying to Vercel

1. Push the repo to GitHub and import it in Vercel (framework auto-detects as Next.js).
2. Add all five environment variables in Project Settings → Environment Variables.
3. In Supabase → Authentication → URL Configuration, add your Vercel URL as a site /
   redirect URL.
4. Deploy, open the URL on your phone, and use **Share → Add to Home Screen** (iOS) or
   **Install app** (Android/Chrome).

## How it fits together

```
app/
  (app)/                  authenticated screens; layout loads state from Supabase
    home/                 daily dashboard — remaining calories, macros, today's meals
    scan/                 four ways to log: photo, text description, barcode, repeat
    result/               AI estimate, editable name, expandable micronutrients
    analysis/             7-day calorie chart, daily averages, meal history
    settings/             profile, daily goals, reminders, clear data, sign out
  api/analyze-meal/       server-only Gemini call, from a photo or a text description
  api/refine-meal/        applies a written correction and re-estimates
  api/product/            barcode lookup against Open Food Facts (free, no key)
  login/                  email + password auth
  offline/                service-worker fallback page
components/               phone shell, bottom nav, macro cards, icons
lib/                      Supabase clients, types, date/macro helpers, app state
proxy.ts                  refreshes the auth cookie, gates screens behind a session
public/manifest.webmanifest, public/sw.js   PWA install + app-shell caching
supabase/migrations/      schema, RLS, storage policies
scripts/generate-icons.mjs  regenerates the PWA icons (`npm run icons`)
```

Photos are downscaled to 1024px in the browser before analysis and upload, which keeps
the Gemini request small and stays inside Supabase's free storage tier.

## Logging a meal

Four ways, because photographing a coffee is silly:

| Method | Cost | When |
| --- | --- | --- |
| **Photo** | one Gemini call | a plated meal you cannot easily describe |
| **Describe** | one Gemini call | snacks and drinks — "two eggs and toast" |
| **Barcode** | no AI at all | packaged food; values come off the label, so they are exact |
| **Recent** | no AI at all | one tap to re-log something you eat often |

Barcode scanning decodes in the browser with `@zxing/browser` (iOS has no
`BarcodeDetector`), then looks the product up in Open Food Facts — free, no API
key, no account.

## Notes on the design reference

- Primary buttons use `--primary-100` (green). The handoff screenshots show the base
  design system's orange button, but its README defines `--primary-100` as the token
  for "primary actions", so the app follows the token.
- The mock status bar is a desktop-preview affordance only. Once installed to a home
  screen the platform draws its own, and the app reserves the safe-area inset instead.
