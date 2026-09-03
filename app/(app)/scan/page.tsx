'use client';

/* eslint-disable @next/next/no-img-element */
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import { BackButton, Frame } from '@/components/Shell';
import { Button } from '@/components/ui';
import { IcCamera } from '@/components/icons';
import { prepareImage } from '@/lib/image';
import { clearPendingScan, setPendingScan } from '@/lib/pending';
import type { Analysis } from '@/lib/types';

type Phase = 'idle' | 'analyzing' | 'error';

async function analyzeMealPhoto(blob: Blob): Promise<Analysis> {
  const form = new FormData();
  form.append('image', blob, 'meal.jpg');

  const res = await fetch('/api/analyze-meal', { method: 'POST', body: form });
  const payload = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(payload?.error || 'Could not analyze this photo.');
  }
  return payload as Analysis;
}

export default function ScanScreen() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const galleryInput = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-picking the same file after an error
    if (!file) return;

    setError(null);
    try {
      const { dataUrl, blob } = await prepareImage(file);
      setPreview(dataUrl);
      setPhase('analyzing');

      const analysis = await analyzeMealPhoto(blob);
      setPendingScan({ analysis, photo: dataUrl });
      router.push('/result');
    } catch (err) {
      setPhase('error');
      setError(err instanceof Error ? err.message : 'Could not analyze this photo.');
    }
  }

  return (
    <Frame bg="var(--surface-scan)" active="scan" fill>
      <div style={{ padding: '16px 20px 0 20px', display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <BackButton
            dark
            onClick={() => {
              clearPendingScan();
              router.push('/home');
            }}
          />
          <div style={{ fontSize: 20, lineHeight: '30px', fontWeight: 700, color: '#fff' }}>
            Scan Your Meal
          </div>
        </div>

        {/* Photo frame */}
        <div
          style={{
            marginTop: 24,
            width: '100%',
            aspectRatio: '1 / 1',
            borderRadius: 'var(--radius-xl)',
            border: '1px dashed rgba(255,255,255,0.3)',
            background: 'rgba(255,255,255,0.03)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            position: 'relative',
            flexShrink: 0,
          }}
        >
          {preview ? (
            <img src={preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 12,
                color: 'var(--text-secondary)',
              }}
            >
              <IcCamera size={40} />
              <div style={{ fontSize: 15, lineHeight: '22px' }}>Add a photo of your meal</div>
            </div>
          )}

          {phase === 'analyzing' && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(0,0,0,0.55)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 12,
                color: '#fff',
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  border: '3px solid rgba(255,255,255,0.25)',
                  borderTopColor: '#fff',
                  animation: 'tracked-spin 0.8s linear infinite',
                }}
              />
              <div style={{ fontSize: 15, lineHeight: '22px' }}>Analyzing your meal…</div>
            </div>
          )}
        </div>

        {phase === 'error' && (
          <div
            style={{
              marginTop: 16,
              padding: 12,
              borderRadius: 'var(--radius-md)',
              background: 'rgba(201,56,56,0.15)',
              color: '#FF3E3E',
              fontSize: 13,
              lineHeight: '19px',
            }}
          >
            {error}
          </div>
        )}

        <div style={{ marginTop: 'auto', paddingBottom: 118, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Button
            disabled={phase === 'analyzing'}
            onClick={() => cameraInput.current?.click()}
          >
            {phase === 'error' ? 'Try Again' : 'Take Photo'}
          </Button>
          <Button
            variant="outline"
            disabled={phase === 'analyzing'}
            onClick={() => galleryInput.current?.click()}
          >
            Choose from Gallery
          </Button>
        </div>

        <input
          ref={cameraInput}
          type="file"
          accept="image/*"
          capture="environment"
          style={{ display: 'none' }}
          onChange={handleFile}
        />
        <input
          ref={galleryInput}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleFile}
        />
      </div>
    </Frame>
  );
}
