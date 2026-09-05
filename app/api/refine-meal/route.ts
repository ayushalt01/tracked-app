import { NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';
import {
  ANALYZE_PROMPT, callGemini, GeminiError, normalizeAnalysis, parseAiJson, REFINE_PROMPT,
  type GeminiTurn,
} from '@/lib/gemini';
import { readImageUpload } from '@/lib/upload';
import type { Analysis, RefineTurn } from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 90;

const MAX_NOTE_CHARS = 500;
const MAX_HISTORY_TURNS = 12;

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: 'Could not read the request.' }, { status: 400 });

  const image = await readImageUpload(form.get('image'));
  if ('error' in image) return NextResponse.json({ error: image.error }, { status: image.status });

  const note = String(form.get('note') ?? '').trim().slice(0, MAX_NOTE_CHARS);
  if (!note) return NextResponse.json({ error: 'Say what needs correcting.' }, { status: 400 });

  let current: Analysis;
  let history: RefineTurn[];
  try {
    current = normalizeAnalysis(JSON.parse(String(form.get('current') ?? '{}')));
    const raw = JSON.parse(String(form.get('history') ?? '[]'));
    history = (Array.isArray(raw) ? raw : []).slice(-MAX_HISTORY_TURNS);
  } catch {
    return NextResponse.json({ error: 'Could not read the current estimate.' }, { status: 400 });
  }

  // Replay the conversation so the model sees the photo, its own last numbers,
  // and every correction so far before applying this one.
  const contents: GeminiTurn[] = [
    {
      role: 'user',
      parts: [
        { inline_data: { mime_type: image.mimeType, data: image.base64 } },
        { text: ANALYZE_PROMPT },
      ],
    },
  ];

  for (const turn of history) {
    if (turn.role === 'user' && typeof turn.text === 'string') {
      contents.push({ role: 'user', parts: [{ text: turn.text.slice(0, MAX_NOTE_CHARS) }] });
    } else if (turn.role === 'model' && turn.analysis) {
      contents.push({
        role: 'model',
        parts: [{ text: JSON.stringify(normalizeAnalysis(turn.analysis)) }],
      });
    }
  }

  // The estimate on screen right now — it may have been hand-edited since the
  // last model turn, so it is authoritative, not the history.
  contents.push({ role: 'model', parts: [{ text: JSON.stringify(current) }] });
  contents.push({ role: 'user', parts: [{ text: `${REFINE_PROMPT}\n\nUser correction: ${note}` }] });

  try {
    const text = await callGemini(contents);
    const raw = parseAiJson(text) as Record<string, unknown>;
    const analysis = normalizeAnalysis(raw);
    const reply = String(raw.reply ?? '').trim().slice(0, 300) || 'Updated the estimate.';
    return NextResponse.json({ analysis, reply });
  } catch (err) {
    if (err instanceof GeminiError) {
      return NextResponse.json({ error: err.userMessage }, { status: 502 });
    }
    return NextResponse.json({ error: 'Could not apply that correction.' }, { status: 502 });
  }
}
