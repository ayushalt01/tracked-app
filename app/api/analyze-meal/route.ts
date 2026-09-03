import { NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';
import type { Analysis } from '@/lib/types';

export const runtime = 'nodejs';
// Three attempts at ~15s each, plus backoff, has to fit inside this budget.
export const maxDuration = 60;

const ATTEMPT_TIMEOUT_MS = 15_000;
const MAX_ATTEMPTS = 3;
const RETRY_BACKOFF_MS = 1_500;

/** Gemini's free tier. Overridable via GEMINI_MODEL. */
const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

/**
 * 2.5 Flash reasons before answering by default. The schema here is fixed, so
 * that budget is better spent on the answer — it also removes the risk of the
 * JSON being cut off by maxOutputTokens. Gemini 3 models use `thinkingLevel`
 * instead and reject this field, so only send it to the 2.5 family.
 */
const DISABLE_THINKING = MODEL.includes('2.5');
const MAX_BYTES = 6 * 1024 * 1024;

const PROMPT = [
  'You are a nutrition estimation assistant. Look at this photo of a meal and estimate its nutrition.',
  'Respond with ONLY valid JSON (no markdown fences, no commentary) matching exactly this schema:',
  '{"name": string, "description": string, "calories": number, "protein": number, "carbs": number, "fat": number, "fiber": number, "sugar": number, "sodium": number, "potassium": number, "calcium": number, "iron": number, "vitaminC": number}',
  'Units: calories in kcal; protein, carbs, fat, fiber, sugar in grams; sodium, potassium, calcium in milligrams; iron in milligrams; vitaminC in milligrams.',
  'Estimate realistic values based on the visible portion size. "name" should be a short (2-5 word) title for the dish.',
  '"description" should be a single short sentence describing the dish.',
  'If the photo does not show food, still return the schema with zeros and name "Not a meal".',
].join('\n');

const NUMERIC_FIELDS = [
  'calories', 'protein', 'carbs', 'fat', 'fiber', 'sugar',
  'sodium', 'potassium', 'calcium', 'iron', 'vitaminC',
] as const;

/** Tolerates fenced or chatty output and pulls the JSON object out of it. */
function parseAiJson(text: string): unknown {
  let t = text.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) t = fence[1].trim();
  const start = t.indexOf('{');
  const end = t.lastIndexOf('}');
  if (start >= 0 && end > start) t = t.slice(start, end + 1);
  return JSON.parse(t);
}

function toNumber(value: unknown): number {
  const n = typeof value === 'number' ? value : parseFloat(String(value ?? ''));
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 10) / 10;
}

/** Coerces the model's output into the exact Analysis shape the app expects. */
function normalize(raw: unknown): Analysis {
  const o = (raw ?? {}) as Record<string, unknown>;
  const out = {
    name: String(o.name ?? '').trim().slice(0, 80) || 'Meal',
    description: String(o.description ?? '').trim().slice(0, 200),
  } as Analysis;
  for (const key of NUMERIC_FIELDS) out[key] = toNumber(o[key]);
  return out;
}

export async function POST(request: Request) {
  // Signed-in users only — this route spends a shared API quota.
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'GEMINI_API_KEY is not configured on the server.' },
      { status: 500 },
    );
  }

  let base64: string;
  let mimeType: string;

  try {
    const form = await request.formData();
    const image = form.get('image');
    if (!(image instanceof File)) {
      return NextResponse.json({ error: 'No image uploaded.' }, { status: 400 });
    }
    if (image.size > MAX_BYTES) {
      return NextResponse.json({ error: 'That photo is too large.' }, { status: 413 });
    }
    mimeType = image.type || 'image/jpeg';
    if (!mimeType.startsWith('image/')) {
      return NextResponse.json({ error: 'That file is not an image.' }, { status: 400 });
    }
    base64 = Buffer.from(await image.arrayBuffer()).toString('base64');
  } catch {
    return NextResponse.json({ error: 'Could not read the uploaded photo.' }, { status: 400 });
  }

  const body = JSON.stringify({
    contents: [
      {
        role: 'user',
        parts: [
          { inline_data: { mime_type: mimeType, data: base64 } },
          { text: PROMPT },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: 2048,
      responseMimeType: 'application/json',
      ...(DISABLE_THINKING ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
    },
  });

  let response: Response | null = null;
  let lastStatus = 0;

  // The free tier returns 503 ("high demand") on image requests often enough
  // that a single attempt regularly surfaces as a failed scan for the user.
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    if (attempt > 1) await new Promise((r) => setTimeout(r, RETRY_BACKOFF_MS));

    try {
      response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
          body,
          signal: AbortSignal.timeout(ATTEMPT_TIMEOUT_MS),
        },
      );
    } catch {
      // Network failure or the attempt timed out — retry if there is budget.
      response = null;
      lastStatus = 504;
      continue;
    }

    if (response.ok) break;

    lastStatus = response.status;
    const detail = await response.text().catch(() => '');
    console.error('Gemini error', response.status, detail.slice(0, 500));
    response = null;

    // Server-side capacity errors are worth another go. A 429 is not: the free
    // tier's per-minute quota will not have refilled inside the retry window,
    // and re-asking only spends more of it.
    if (![500, 502, 503].includes(lastStatus)) break;
  }

  if (!response) {
    const message =
      lastStatus === 429
        ? 'Analysis limit reached for now. Try again in a minute.'
        : lastStatus === 503 || lastStatus === 504
          ? 'The analysis service is busy right now. Try again.'
          : 'The analysis service could not process this photo.';
    return NextResponse.json({ error: message }, { status: 502 });
  }

  let text: string;
  try {
    const payload = await response.json();
    const parts = payload?.candidates?.[0]?.content?.parts;
    text = Array.isArray(parts)
      ? parts.map((p: { text?: string }) => p?.text ?? '').join('')
      : '';
    if (!text.trim()) throw new Error('empty response');
  } catch {
    return NextResponse.json({ error: 'The analysis came back empty.' }, { status: 502 });
  }

  try {
    return NextResponse.json(normalize(parseAiJson(text)));
  } catch {
    return NextResponse.json(
      { error: 'Could not read the nutrition estimate. Try another photo.' },
      { status: 502 },
    );
  }
}
