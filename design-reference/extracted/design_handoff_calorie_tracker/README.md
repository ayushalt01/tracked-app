# Handoff: Tracked — AI Calorie & Macro Scanner

## Overview
A mobile app for logging meals by photo. The user snaps or uploads a picture of their food, Claude Vision estimates calories, macros (protein/carbs/fat) and micronutrients, the user confirms, and it's logged against daily goals. Includes a home dashboard, a 7-day analysis view, and settings for goals/profile.

Target stack for the real build: **Next.js on Vercel** (frontend + API routes) + **Supabase** (Postgres for meals/users/goals, Supabase Auth for login, optionally Supabase Storage for meal photos). Ship as a **PWA** (installable to a phone home screen via manifest + service worker) — no App Store needed.

## About the Design Files
The files in this bundle (`Tracked - Meal Scanner.html` + its `app-*.jsx`/`app-*.js` support files) are **design references built as an HTML/React-in-browser prototype** — they demonstrate intended look, layout, and interaction, and currently run entirely client-side with no real backend (state persists only to the browser's localStorage, and the AI call runs directly from the browser). They are **not production code to copy as-is**. The task is to **recreate this design in a real Next.js + Supabase app**, replacing the client-only state and direct AI call with a proper backend: Supabase for persistence/auth, and a server-side API route that calls Claude (keeping the API key off the client).

## Fidelity
**High-fidelity.** Colors, typography, spacing, radii and component styling are final and pull from the bound "Tracked" design system (see Design Tokens below). Recreate pixel-accurately using the values listed here.

## Design System
This design is built on the "Tracked" design system (Space Grotesk type, dark app surface, flat-fill cards, 12–24px radii, 428×926 mobile canvas). The prototype's supporting files import the system's compiled bundle and CSS tokens from `_ds/` — that folder is **not included** in this handoff (it's an internal design-system asset, not app code). Rebuild the visual primitives (buttons, bottom nav, status bar chrome, macro cards) using the token values below; do not try to load `_ds_bundle.js` in the real app.

## Color Theme (custom overrides on top of the base design system)
The base design system ships an orange/purple palette; this app overrides it with a nutrition-themed palette, set as CSS custom properties:

```css
--primary-100: oklch(58% 0.15 148);   /* fresh green — primary actions, active nav icon, links */
--accent-200:  oklch(91% 0.06 148);   /* soft green — hero "Calories" card background */
--accent-400:  oklch(42% 0.13 148);   /* deep green — link hover */

/* Macro card fills — distinct food-associated hues, all light with dark text */
protein: oklch(78% 0.09 25);   /* coral/red — meat association */
carbs:   oklch(82% 0.12 80);   /* golden/amber — grain association */
fat:     oklch(80% 0.11 95);   /* warm yellow — butter association */
```

Base design-system tokens still in use (dark app chrome):
```css
--gray-600: #121212;   /* app background */
--gray-500: #232220;   /* elevated cards, list rows */
--gray-400: #2F2F2F;   /* nav pill background */
--gray-100: #FFFFFF;   /* primary text on dark */
--text-secondary: #C3C3C3;
--message-error: #C93838;   /* over-goal chart bars */
--surface-scan: #1A1F16;    /* scan screen background */
```
Font: **Space Grotesk** (400/500/600/700) for all product text; SF Pro only for OS-style chrome (status bar). Radii: 12px buttons/inputs, 16px macro tiles, 24px hero/analysis cards, 100px pill nav.

## Screens / Views

### 1. Home (dashboard)
- **Purpose**: Daily overview — remaining calories, macro totals, today's logged meals.
- **Layout**: 428×926 mobile canvas, 20px side gutters, scrollable content area below a 47px status bar, floating pill nav overlapping the bottom.
- **Header row**: greeting text ("Good Morning" / "Good Afternoon" / "Good Evening" by time of day, `--text-secondary`, 15/22) above the user's diet-plan name (24/36, 700, white). 48px circular avatar (initial letter) top-right, tappable → Settings.
- **Calorie hero card**: full-width, `--accent-200` fill, 24px radius, 24px padding. "Calories" label (20/30, 700, dark). Big number = `goal - loggedToday`, suffixed "kcal left" (34/51 number, 17/24 suffix). Below: "{logged} of {goal} kcal logged today" (15/22, dark).
- **Macro row**: 3-column grid, 12px gap. Each `MacroCard`: label (15/22, 600) + value+unit (20/30, 700), 16px radius, 16px padding, colored per Design Tokens (protein/carbs/fat), dark text.
- **"Today's Meals" section header**: title (18/27, 600, white) + right-aligned "+ Add meal" link (green, 600, 15px) → navigates to Scan.
- **Meal list**: rows in `--gray-500` cards, 12px radius, 12px padding, flex row: 48×48 rounded-12 photo thumbnail (or gray placeholder if none), name (15/22, 600, white, truncates) + time (13/19, secondary) stacked, calorie count right-aligned (15/22, 700, white). Empty state: centered gray message "No meals logged yet. Scan a photo to add one."

### 2. Scan
- **Purpose**: Capture/select a meal photo and trigger AI analysis.
- **Layout**: background `--surface-scan`. Back button (circular, translucent dark, arrow-left icon) + "Scan Your Meal" title (20/30, 700, white) in header row.
- **Photo frame**: square, full-width, 24px radius, dashed 1px translucent-white border, centered camera icon + "Add a photo of your meal" placeholder when empty; shows captured/selected image once chosen (object-fit cover).
- **Analyzing overlay**: on top of the photo frame once a file is picked — dark 55%-opacity scrim, centered spinner (32px, white, 0.8s linear rotation) + "Analyzing your meal…" (15/22, white).
- **Error state**: red-tinted (`rgba(201,56,56,.15)`) message box below the frame if the AI call fails; primary button label switches to "Try Again."
- **Actions** (bottom, stacked 12px gap): primary button "Take Photo" (opens native camera capture input), outline button "Choose from Gallery" (opens file picker, no capture attr).
- **Behavior**: on file select → read as data URL → show preview immediately → set phase to "analyzing" → call AI → on success navigate to Result screen with `{analysis, photo}`; on failure show inline error and let user retry.

### 3. Scan Result
- **Purpose**: Review AI-estimated nutrition, edit the meal name, expand micronutrients, confirm log.
- **Layout**: 320px-tall photo header, `linear-gradient(180deg, transparent 40%, rgba(0,0,0,.75) 100%)` scrim over the bottom of the photo. Back/retake button top-left. Over the scrim: "AI ESTIMATED" eyebrow label (12px, uppercase, letter-spacing 0.5, green accent, 600) + editable meal-name text input (24/36, 700, white, transparent background, borderless) pre-filled from the AI response.
- **Below the photo**: optional AI-written one-line description (15/22, secondary). Then the same Calorie hero card and 3-column macro row as Home, populated from the AI response for this single meal (no "left"/goal framing — just the raw estimated values).
- **Micronutrients (expandable)**: tappable row — "Micronutrients" title (18/27, 600) + chevron icon that rotates 90° when open (200ms). When expanded: `--gray-500` panel, 16px radius, 16px padding, list of 7 nutrients (Fiber g, Sugar g, Sodium mg, Potassium mg, Calcium mg, Iron mg, Vitamin C mg), each row = label+value / "% DV" line (13/19) over a 6px pill progress bar (green fill, translucent-white track) sized to `value / dailyGoal`.
- **CTA**: full-width primary button "Log This Meal" — on tap, builds a meal record (id, timestamp, date, name, photo, rounded macro/micro values) and appends it to state, then returns to Home.

### 4. Analysis
- **Purpose**: Trends over the last 7 days + full meal history.
- **Layout**: title "Analysis" (24/36, 700). Below: a `--gray-500` card (24px radius, 20px padding) titled "Calories, last 7 days" (15/22, secondary) containing a 7-bar column chart, 140px tall — each bar is `--primary-100` green, or `--message-error` red if that day's total exceeded the calorie goal; day-of-week label (Sun–Sat) under each bar.
- **"Daily Average" section**: same 3-column macro-card row, showing protein/carbs/fat averaged over days that had at least one meal logged.
- **"Meal History" section**: meals grouped by date descending, most recent first. Group heading = "Today" / "Yesterday" / weekday abbreviation (13px, uppercase, secondary, 600). Under each heading, meal rows identical to Home's list rows but with an added "P:{x}g C:{y}g F:{z}g" macro summary appended to the time string. Empty state matches Home's.

### 5. Settings
- **Purpose**: Edit profile name, daily goals, notification preference; clear logged data.
- **Layout**: title "Settings" (24/36, 700). Profile card (`--gray-500`, 24px radius): 56px avatar + editable name field (underline input, 17/24, 600, white).
- **"Daily Goals" card**: 2-column grid of 4 numeric inputs (Calories kcal, Protein g, Carbs g, Fat g) — each a labeled number field (`--gray-500` fill for the outer card, `--gray-400` bordered input, 12px radius, white text). "Save Changes" primary button below, label flips to "Saved" for 1.5s after a successful save.
- **"Preferences" row**: "Meal Reminders" label + a Toggle switch (on/off), bound to a `notifications` boolean.
- **"Data" section**: outline button "Clear Logged Meals" — wipes all meal history (used for demo/testing; consider a confirm dialog in production).

## Interactions & Behavior
- **Navigation**: bottom pill nav, centered horizontally, floating 34px above the bottom edge, 4 icon buttons (Home, Analysis, Scan/AI, Settings) in a `--gray-400` pill; active icon gets a filled `--primary-100` circular background and switches to its "-fill" icon variant.
- **Routing**: single-page client-side route state (`home | scan | result | analysis | settings`); Scan → on successful analysis → Result; Result → "Log This Meal" or back → Home.
- **Persistence (prototype)**: all state (profile, goals, notifications, meals) is saved to `localStorage` on every change and reloaded on mount. **In the real app, replace this with Supabase**: a `meals` table (user_id, name, photo_url, calories, protein, carbs, fat, fiber, sugar, sodium, potassium, calcium, iron, vitamin_c, logged_at), a `profiles` table (user_id, name, diet_plan, notifications_enabled), and a `goals` table or columns on `profiles` (calorie/macro/micro targets). Use Supabase Auth for login instead of a single local profile.
- **AI call (prototype)**: browser calls `window.claude.complete(...)` directly with the image as base64 and a fixed prompt asking for strict JSON back (schema: name, description, calories, protein, carbs, fat, fiber, sugar, sodium, potassium, calcium, iron, vitaminC). **In the real app, move this server-side**: a Next.js API route (e.g. `/api/analyze-meal`) that accepts the uploaded image, calls the Claude API with your own API key (stored as a Vercel env var), and returns the parsed JSON — never call a model API with a secret key from the client.
- **Photo storage**: prototype keeps photos as inline base64 data URLs in memory/localStorage. Real app should upload to Supabase Storage and store the resulting URL on the meal row.
- **Micronutrient panel**: client-side expand/collapse, animated via a CSS `transform: rotate()` transition on the chevron (no height animation currently — consider adding for polish).
- **Loading/error states**: Scan screen shows a spinner overlay while awaiting the AI response, and an inline red error message + "Try Again" button label if the call throws (e.g. bad JSON, network failure).

## State Management (prototype shape — mirror conceptually in the real app)
```js
{
  profile: { name: string, dietPlan: string },
  goals: { calories, protein, carbs, fat, fiber, sugar, sodium, potassium, calcium, iron, vitaminC },
  notifications: boolean,
  meals: [{ id, ts, dateISO, name, photo, calories, protein, carbs, fat, micros: {...} }]
}
```
Route state: `'home' | 'scan' | 'result' | 'analysis' | 'settings'`, plus a transient `pendingScan: { analysis, photo }` held between a successful AI call and the user confirming "Log This Meal" (discard on retake/back).

## Assets
No custom images — meal "photos" are whatever the user captures/uploads at runtime (no bundled photo assets). Icons come from the Tracked design system's icon set (camera, arrow-left, chevron/arrow, home/analysis/settings/ai nav glyphs, both outline and "-fill" active variants). Recreate these from an icon library that matches a ~1.5px rounded-stroke line style, or request the source SVGs from the design system if pixel-identical icons are required.

## Screenshots
See `screenshots/` — `01-home.png`, `02-scan.png`, `03-analysis.png`, `04-settings.png`.

## Files
- `Tracked - Meal Scanner.html` — entry point, loads React/Babel + all app-*.jsx files
- `app-main.jsx` — root component, routing, state wiring
- `app-data.js` — localStorage load/save, date/greeting helpers (plain JS, no JSX)
- `app-shared.jsx` — shared primitives: phone frame, bottom nav, macro card, progress bar, section title, back button, color tokens (`macroColors`)
- `app-home.jsx` — Home dashboard screen
- `app-scan.jsx` — Scan capture screen + Scan Result screen + the Claude Vision prompt/call (`analyzeMealPhoto`)
- `app-analysis.jsx` — Analysis/trends screen
- `app-settings.jsx` — Settings screen
