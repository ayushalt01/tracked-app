import 'server-only';

import type { Analysis, MealItem } from './types';

/** Gemini's free tier. Overridable via GEMINI_MODEL. */
export const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

// Three attempts, plus backoff, has to fit inside the route's maxDuration.
const ATTEMPT_TIMEOUT_MS = 25_000;
const MAX_ATTEMPTS = 3;
const RETRY_BACKOFF_MS = 1_500;

const ITEMS_FIELD = '"items": [{"name": string, "amount": string, "calories": number}], ';

const SCHEMA =
  '{"name": string, "description": string, ' + ITEMS_FIELD +
  '"calories": number, "protein": number, "carbs": number, "fat": number, "fiber": number, "sugar": number, "sodium": number, "potassium": number, "calcium": number, "iron": number, "vitaminC": number}';

const ITEMS_RULE = [
  '"items" is the breakdown behind your totals: one entry per distinct food component you can',
  'identify, with "amount" as the estimated portion in the most natural unit ("120 g", "1 cup",',
  '"2 slices", "1 tbsp") and "calories" for that component alone. List sauces, dressings and',
  'cooking oil as their own entries. The item calories must add up to the "calories" total.',
].join('\n');

const UNITS =
  'Units: calories in kcal; protein, carbs, fat, fiber, sugar in grams; sodium, potassium, calcium in milligrams; iron in milligrams; vitaminC in milligrams.';

export const ANALYZE_PROMPT = [
  'You are a nutrition estimation assistant. Look at this photo of a meal and estimate its nutrition.',
  '',
  'Work carefully before answering:',
  '1. First ask whether this is a recognisable standard or branded item (a chain-restaurant menu item,',
  '   a packaged product, a classic dish at its usual serving size). If it is, use that item\'s known',
  '   published nutrition values, adjusted only if the visible portion clearly differs. Published values',
  '   beat estimating a familiar item from its parts.',
  '2. Otherwise, identify every distinct component you can see (protein, starch, vegetables, sauces,',
  '   oils, drinks) and estimate each one\'s portion in grams, using visible references for scale —',
  '   plate and bowl diameters, cutlery, hands, cans and glasses — then sum them.',
  '3. Either way, account for cooking fats and dressings even when they are not directly visible.',
  '',
  'Respond with ONLY valid JSON (no markdown fences, no commentary) matching exactly this schema:',
  SCHEMA,
  UNITS,
  ITEMS_RULE,
  '"name" should be a short (2-5 word) title for the dish. "description" should be one short sentence',
  'describing the dish.',
  'If the photo does not show food, still return the schema with zeros, an empty "items" array and',
  'name "Not a meal".',
].join('\n');

export const DESCRIBE_PROMPT = [
  'You are a nutrition estimation assistant. The user has described what they ate in their own',
  'words. Estimate its nutrition.',
  '',
  'Work carefully before answering:',
  '1. If they named a recognisable standard or branded item, use its known published nutrition',
  '   values at the portion they described.',
  '2. Otherwise break the description into components and estimate each portion in grams, using',
  '   any quantities or sizes they gave. Where they did not specify a portion, assume one typical',
  '   adult serving and say so in the description.',
  '3. Account for cooking fats and dressings implied by the preparation they described.',
  '',
  'Respond with ONLY valid JSON (no markdown fences, no commentary) matching exactly this schema:',
  SCHEMA,
  UNITS,
  ITEMS_RULE,
  '"name" should be a short (2-5 word) title for what they ate. "description" should be one short',
  'sentence stating the portions you assumed.',
  'If the text does not describe food, return the schema with zeros and name "Not a meal".',
].join('\n');

const REFINE_SCHEMA =
  '{"reply": string, "name": string, "description": string, ' + ITEMS_FIELD +
  '"calories": number, "protein": number, "carbs": number, "fat": number, "fiber": number, "sugar": number, "sodium": number, "potassium": number, "calcium": number, "iron": number, "vitaminC": number}';

export const REFINE_PROMPT = [
  'The user is correcting your estimate. Apply their correction and re-estimate the whole meal,',
  'keeping everything they did not mention as it was. Trust the user over the photo: they were there.',
  '',
  'Respond with ONLY valid JSON (no markdown fences, no commentary) matching exactly this schema:',
  REFINE_SCHEMA,
  UNITS,
  ITEMS_RULE,
  '"reply" is one short sentence, addressed to the user, saying what you changed and why.',
  'Every other field is the full updated estimate, not just the changed parts.',
].join('\n');

const NUMERIC_FIELDS = [
  'calories', 'protein', 'carbs', 'fat', 'fiber', 'sugar',
  'sodium', 'potassium', 'calcium', 'iron', 'vitaminC',
] as const;

/** Tolerates fenced or chatty output and pulls the JSON object out of it. */
export function parseAiJson(text: string): unknown {
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

const MAX_ITEMS = 20;

function normalizeItems(raw: unknown): MealItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .slice(0, MAX_ITEMS)
    .map((entry) => {
      const o = (entry ?? {}) as Record<string, unknown>;
      return {
        name: String(o.name ?? '').trim().slice(0, 60),
        amount: String(o.amount ?? '').trim().slice(0, 30),
        calories: toNumber(o.calories),
      };
    })
    .filter((item) => item.name.length > 0);
}

/** Coerces the model's output into the exact Analysis shape the app expects. */
export function normalizeAnalysis(raw: unknown): Analysis {
  const o = (raw ?? {}) as Record<string, unknown>;
  const out = {
    name: String(o.name ?? '').trim().slice(0, 80) || 'Meal',
    description: String(o.description ?? '').trim().slice(0, 300),
    items: normalizeItems(o.items),
  } as Analysis;
  for (const key of NUMERIC_FIELDS) out[key] = toNumber(o[key]);
  return out;
}

export type GeminiPart =
  | { text: string }
  | { inline_data: { mime_type: string; data: string } };

export type GeminiTurn = { role: 'user' | 'model'; parts: GeminiPart[] };

export class GeminiError extends Error {
  constructor(readonly userMessage: string) {
    super(userMessage);
  }
}

/**
 * One Gemini generateContent call, with retries for the free tier's capacity
 * errors. Returns the raw response text for the caller to parse.
 */
export async function callGemini(contents: GeminiTurn[]): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new GeminiError('GEMINI_API_KEY is not configured on the server.');

  const body = JSON.stringify({
    contents,
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: 4096,
      responseMimeType: 'application/json',
      // Thinking is left ON: it measurably improves portion and macro
      // estimates, and the user would rather wait than get a wrong number.
    },
  });

  let lastStatus = 0;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    if (attempt > 1) await new Promise((r) => setTimeout(r, RETRY_BACKOFF_MS));

    let response: Response;
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
      lastStatus = 504; // network failure or attempt timeout
      continue;
    }

    if (response.ok) {
      const payload = await response.json().catch(() => null);
      const parts = payload?.candidates?.[0]?.content?.parts;
      const text = Array.isArray(parts)
        ? parts.map((p: { text?: string }) => p?.text ?? '').join('')
        : '';
      if (text.trim()) return text;
      throw new GeminiError('The analysis came back empty.');
    }

    lastStatus = response.status;
    const detail = await response.text().catch(() => '');
    console.error('Gemini error', response.status, detail.slice(0, 500));

    // Server-side capacity errors are worth another go. A 429 is not: the free
    // tier's per-minute quota will not have refilled inside the retry window.
    if (![500, 502, 503].includes(lastStatus)) break;
  }

  throw new GeminiError(
    lastStatus === 429
      ? 'Analysis limit reached for now. Try again in a minute.'
      : lastStatus === 503 || lastStatus === 504
        ? 'The analysis service is busy right now. Try again.'
        : 'The analysis service could not process this photo.',
  );
}
