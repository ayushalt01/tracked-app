import { NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';
import {
  ANALYZE_PROMPT, callGemini, DESCRIBE_PROMPT, GeminiError, normalizeAnalysis, parseAiJson,
} from '@/lib/gemini';
import { readImageUpload } from '@/lib/upload';

export const runtime = 'nodejs';
export const maxDuration = 90;

export async function POST(request: Request) {
  // Signed-in users only — this route spends a shared API quota.
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: 'Could not read the upload.' }, { status: 400 });

  // Either a photo or a written description — the output shape is identical.
  const described = String(form.get('text') ?? '').trim().slice(0, 500);
  const hasImage = form.get('image') instanceof File;

  if (!hasImage && !described) {
    return NextResponse.json({ error: 'Add a photo or describe what you ate.' }, { status: 400 });
  }

  let parts;
  if (hasImage) {
    const image = await readImageUpload(form.get('image'));
    if ('error' in image) return NextResponse.json({ error: image.error }, { status: image.status });
    parts = [
      { inline_data: { mime_type: image.mimeType, data: image.base64 } },
      { text: ANALYZE_PROMPT },
    ];
  } else {
    parts = [{ text: `${DESCRIBE_PROMPT}\n\nThe user ate: ${described}` }];
  }

  try {
    const text = await callGemini([{ role: 'user', parts }]);
    return NextResponse.json(normalizeAnalysis(parseAiJson(text)));
  } catch (err) {
    if (err instanceof GeminiError) {
      return NextResponse.json({ error: err.userMessage }, { status: 502 });
    }
    return NextResponse.json(
      { error: 'Could not read the nutrition estimate. Try another photo.' },
      { status: 502 },
    );
  }
}
