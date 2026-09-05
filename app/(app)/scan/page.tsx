'use client';

/* eslint-disable @next/next/no-img-element */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import { BackButton, Frame } from '@/components/Shell';
import { Segmented } from '@/components/Segmented';
import { Button, EmptyState, InlineNumber } from '@/components/ui';
import { IcCamera } from '@/components/icons';
import { prepareImage } from '@/lib/image';
import { clearPendingScan, setPendingScan } from '@/lib/pending';
import { useApp } from '@/lib/store';
import type { Analysis, Meal, PendingScan } from '@/lib/types';

type Tab = 'photo' | 'describe' | 'barcode' | 'recent';
type Phase = 'idle' | 'working' | 'error';

const TABS: { key: Tab; label: string }[] = [
  { key: 'photo', label: 'Photo' },
  { key: 'describe', label: 'Describe' },
  { key: 'barcode', label: 'Barcode' },
  { key: 'recent', label: 'Recent' },
];

const NAV_CLEARANCE = 118;

type Product = {
  barcode: string;
  name: string;
  quantity: string | null;
  servingSize: string | null;
  servingGrams: number | null;
  per100g: Record<string, number>;
};

function Spinner({ size = 32 }: { size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        border: '3px solid rgba(255,255,255,0.25)',
        borderTopColor: '#fff',
        animation: 'tracked-spin 0.8s linear infinite',
      }}
    />
  );
}

function ErrorBox({ children }: { children: React.ReactNode }) {
  return (
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
      {children}
    </div>
  );
}

export default function ScanScreen() {
  const router = useRouter();
  const { state, repeatMeal } = useApp();

  const [tab, setTab] = useState<Tab>('photo');
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState<string | null>(null);

  // Photo
  const [preview, setPreview] = useState<string | null>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const galleryInput = useRef<HTMLInputElement>(null);

  // Describe
  const [description, setDescription] = useState('');

  // Barcode
  const videoRef = useRef<HTMLVideoElement>(null);
  const stopScan = useRef<(() => void) | null>(null);
  const [scanning, setScanning] = useState(false);
  const [product, setProduct] = useState<Product | null>(null);
  const [grams, setGrams] = useState(100);

  // Recent
  const [repeating, setRepeating] = useState<string | null>(null);

  const handOff = useCallback(
    (scan: PendingScan) => {
      setPendingScan(scan);
      router.push('/result');
    },
    [router],
  );

  const endScan = useCallback(() => {
    stopScan.current?.();
    stopScan.current = null;
    setScanning(false);
  }, []);

  // Releasing the camera when leaving the screen matters: iOS keeps the
  // recording indicator on and the stream alive otherwise.
  useEffect(() => () => endScan(), [endScan]);

  function switchTab(next: Tab) {
    if (next !== 'barcode') endScan();
    setTab(next);
    setPhase('idle');
    setError(null);
  }

  async function analyzePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setError(null);
    try {
      const { dataUrl, blob } = await prepareImage(file);
      setPreview(dataUrl);
      setPhase('working');

      const form = new FormData();
      form.append('image', blob, 'meal.jpg');
      const res = await fetch('/api/analyze-meal', { method: 'POST', body: form });
      const payload = await res.json().catch(() => null);
      if (!res.ok) throw new Error(payload?.error || 'Could not analyze this photo.');

      handOff({ analysis: payload as Analysis, photo: dataUrl, source: 'photo' });
    } catch (err) {
      setPhase('error');
      setError(err instanceof Error ? err.message : 'Could not analyze this photo.');
    }
  }

  async function analyzeDescription() {
    const text = description.trim();
    if (!text || phase === 'working') return;

    setPhase('working');
    setError(null);
    try {
      const form = new FormData();
      form.append('text', text);
      const res = await fetch('/api/analyze-meal', { method: 'POST', body: form });
      const payload = await res.json().catch(() => null);
      if (!res.ok) throw new Error(payload?.error || 'Could not estimate that.');

      handOff({ analysis: payload as Analysis, photo: null, source: 'text' });
    } catch (err) {
      setPhase('error');
      setError(err instanceof Error ? err.message : 'Could not estimate that.');
    }
  }

  async function lookUpBarcode(barcode: string) {
    setPhase('working');
    setError(null);
    try {
      const res = await fetch(`/api/product?barcode=${encodeURIComponent(barcode)}`);
      const payload = await res.json().catch(() => null);
      if (!res.ok) throw new Error(payload?.error || 'Could not look that up.');

      const found = payload as Product;
      setProduct(found);
      setGrams(found.servingGrams && found.servingGrams > 0 ? Math.round(found.servingGrams) : 100);
      setPhase('idle');
    } catch (err) {
      setPhase('error');
      setError(err instanceof Error ? err.message : 'Could not look that up.');
    }
  }

  async function startScan() {
    setError(null);
    setProduct(null);
    try {
      // Loaded on demand — the decoder is large and only this tab needs it.
      const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType }] = await Promise.all([
        import('@zxing/browser'),
        import('@zxing/library'),
      ]);

      const hints = new Map();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [
        BarcodeFormat.EAN_13, BarcodeFormat.EAN_8,
        BarcodeFormat.UPC_A, BarcodeFormat.UPC_E,
      ]);

      const reader = new BrowserMultiFormatReader(hints);
      setScanning(true);

      const controls = await reader.decodeFromVideoDevice(
        undefined,
        videoRef.current ?? undefined,
        (result) => {
          if (!result) return;
          const code = result.getText();
          endScan();
          lookUpBarcode(code);
        },
      );
      stopScan.current = () => controls.stop();
    } catch {
      setScanning(false);
      setError('Could not start the camera. Check camera permission for this site.');
    }
  }

  function useProduct() {
    if (!product) return;
    const factor = grams / 100;
    const scale = (v: number) => Math.round(v * factor * 10) / 10;
    const p = product.per100g;

    const analysis: Analysis = {
      name: product.name.slice(0, 80),
      description: `${grams} g${product.quantity ? ` of ${product.quantity}` : ''}, from the label`,
      items: [{ name: product.name.slice(0, 60), amount: `${grams} g`, calories: scale(p.calories) }],
      calories: scale(p.calories),
      protein: scale(p.protein),
      carbs: scale(p.carbs),
      fat: scale(p.fat),
      fiber: scale(p.fiber),
      sugar: scale(p.sugar),
      sodium: scale(p.sodium),
      potassium: scale(p.potassium),
      calcium: scale(p.calcium),
      iron: scale(p.iron),
      vitaminC: scale(p.vitaminC),
    };
    handOff({ analysis, photo: null, source: 'barcode' });
  }

  async function logAgain(meal: Meal) {
    if (repeating) return;
    setRepeating(meal.id);
    setError(null);
    try {
      await repeatMeal(meal);
      router.push('/home');
    } catch (err) {
      setRepeating(null);
      setError(err instanceof Error ? err.message : 'Could not log that again.');
    }
  }

  // Most recent entry per distinct meal name — you re-log a meal, not an instance.
  const recent: Meal[] = [];
  for (const meal of [...state.meals].sort((a, b) => b.ts - a.ts)) {
    if (!recent.some((m) => m.name.toLowerCase() === meal.name.toLowerCase())) recent.push(meal);
    if (recent.length >= 12) break;
  }

  return (
    <Frame bg="var(--surface-scan)" active="scan" fill>
      <div
        style={{
          padding: '16px 20px 0 20px',
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100%',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <BackButton
            dark
            onClick={() => {
              clearPendingScan();
              router.push('/home');
            }}
          />
          <div style={{ fontSize: 20, lineHeight: '30px', fontWeight: 700, color: '#fff' }}>
            Add a Meal
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <Segmented options={TABS} value={tab} onChange={switchTab} />
        </div>

        {/* ---------------------------------------------------------- PHOTO */}
        {tab === 'photo' && (
          <>
            <div
              style={{
                marginTop: 20,
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

              {phase === 'working' && (
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
                  <Spinner />
                  <div style={{ fontSize: 15, lineHeight: '22px' }}>Analyzing your meal…</div>
                </div>
              )}
            </div>

            {phase === 'error' && <ErrorBox>{error}</ErrorBox>}

            <div
              style={{
                marginTop: 'auto',
                paddingBottom: NAV_CLEARANCE,
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}
            >
              <Button disabled={phase === 'working'} onClick={() => cameraInput.current?.click()}>
                {phase === 'error' ? 'Try Again' : 'Take Photo'}
              </Button>
              <Button
                variant="outline"
                disabled={phase === 'working'}
                onClick={() => galleryInput.current?.click()}
              >
                Choose from Gallery
              </Button>
            </div>

            <input ref={cameraInput} type="file" accept="image/*" capture="environment"
              style={{ display: 'none' }} onChange={analyzePhoto} />
            <input ref={galleryInput} type="file" accept="image/*"
              style={{ display: 'none' }} onChange={analyzePhoto} />
          </>
        )}

        {/* ------------------------------------------------------- DESCRIBE */}
        {tab === 'describe' && (
          <div style={{ marginTop: 20, paddingBottom: NAV_CLEARANCE }}>
            <div style={{ fontSize: 15, lineHeight: '22px', color: 'var(--text-secondary)' }}>
              Say what you ate and roughly how much. Quicker than a photo for snacks and drinks.
            </div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="two scrambled eggs, two slices of toast with butter, black coffee"
              rows={4}
              disabled={phase === 'working'}
              aria-label="What you ate"
              style={{
                marginTop: 12,
                width: '100%',
                boxSizing: 'border-box',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.14)',
                borderRadius: 'var(--radius-md)',
                padding: '14px 16px',
                color: '#fff',
                fontFamily: 'inherit',
                fontSize: 15,
                lineHeight: '22px',
                outline: 'none',
                resize: 'none',
              }}
            />
            {phase === 'error' && <ErrorBox>{error}</ErrorBox>}
            <div style={{ marginTop: 12 }}>
              <Button disabled={phase === 'working' || !description.trim()} onClick={analyzeDescription}>
                {phase === 'working' ? 'Estimating…' : 'Estimate Nutrition'}
              </Button>
            </div>
          </div>
        )}

        {/* -------------------------------------------------------- BARCODE */}
        {tab === 'barcode' && (
          <div style={{ marginTop: 20, paddingBottom: NAV_CLEARANCE }}>
            {!product && (
              <>
                <div
                  style={{
                    width: '100%',
                    aspectRatio: '4 / 3',
                    borderRadius: 'var(--radius-xl)',
                    border: '1px dashed rgba(255,255,255,0.3)',
                    background: 'rgba(0,0,0,0.35)',
                    overflow: 'hidden',
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <video
                    ref={videoRef}
                    playsInline
                    muted
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      display: scanning ? 'block' : 'none',
                    }}
                  />
                  {!scanning && phase !== 'working' && (
                    <div
                      style={{
                        color: 'var(--text-secondary)',
                        fontSize: 15,
                        textAlign: 'center',
                        padding: '0 24px',
                      }}
                    >
                      Point the camera at the barcode on the packet
                    </div>
                  )}
                  {phase === 'working' && <Spinner />}
                  {scanning && (
                    <div
                      style={{
                        position: 'absolute',
                        left: '8%',
                        right: '8%',
                        top: '50%',
                        height: 2,
                        background: 'var(--primary-100)',
                        boxShadow: '0 0 12px var(--primary-100)',
                      }}
                    />
                  )}
                </div>

                {phase === 'error' && <ErrorBox>{error}</ErrorBox>}

                <div style={{ marginTop: 12 }}>
                  <Button onClick={scanning ? endScan : startScan}>
                    {scanning ? 'Stop Scanning' : 'Scan Barcode'}
                  </Button>
                </div>
              </>
            )}

            {product && (
              <div>
                <div
                  style={{
                    background: 'var(--gray-500)',
                    borderRadius: 'var(--radius-lg)',
                    padding: 16,
                  }}
                >
                  <div style={{ fontSize: 12, letterSpacing: 0.5, textTransform: 'uppercase', color: 'var(--accent-200)', fontWeight: 600 }}>
                    From the label
                  </div>
                  <div style={{ marginTop: 4, fontSize: 18, lineHeight: '27px', fontWeight: 700, color: '#fff' }}>
                    {product.name}
                  </div>
                  <div style={{ marginTop: 2, fontSize: 13, lineHeight: '19px', color: 'var(--text-secondary)' }}>
                    {Math.round(product.per100g.calories)} kcal per 100 g
                    {product.servingSize ? ` · serving ${product.servingSize}` : ''}
                  </div>

                  <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 8, color: '#fff', fontSize: 17 }}>
                    <span style={{ color: 'var(--text-secondary)', fontSize: 15 }}>Amount</span>
                    <InlineNumber
                      value={grams}
                      onChange={setGrams}
                      label="Grams"
                      underline="rgba(255,255,255,0.3)"
                    />
                    <span>g</span>
                  </div>

                  <div style={{ marginTop: 12, fontSize: 15, lineHeight: '22px', color: '#fff' }}>
                    = <strong>{Math.round((product.per100g.calories * grams) / 100)} kcal</strong>
                    <span style={{ color: 'var(--text-secondary)' }}>
                      {'  '}· P {Math.round((product.per100g.protein * grams) / 100)}g
                      {'  '}C {Math.round((product.per100g.carbs * grams) / 100)}g
                      {'  '}F {Math.round((product.per100g.fat * grams) / 100)}g
                    </span>
                  </div>
                </div>

                <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <Button onClick={useProduct}>Continue</Button>
                  <Button variant="outline" onClick={() => { setProduct(null); setPhase('idle'); }}>
                    Scan Another
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ---------------------------------------------------------- RECENT */}
        {tab === 'recent' && (
          <div style={{ marginTop: 20, paddingBottom: NAV_CLEARANCE }}>
            <div style={{ fontSize: 15, lineHeight: '22px', color: 'var(--text-secondary)' }}>
              Tap to log it again, right now. No photo, no waiting.
            </div>
            {error && <ErrorBox>{error}</ErrorBox>}
            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {recent.length === 0 && <EmptyState>Nothing logged yet. Scan a meal first.</EmptyState>}
              {recent.map((meal) => (
                <button
                  key={meal.id}
                  onClick={() => logAgain(meal)}
                  disabled={repeating !== null}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    background: 'var(--gray-500)',
                    borderRadius: 'var(--radius-md)',
                    padding: 12,
                    border: 0,
                    width: '100%',
                    textAlign: 'left',
                    cursor: repeating ? 'default' : 'pointer',
                    opacity: repeating && repeating !== meal.id ? 0.5 : 1,
                  }}
                >
                  {meal.photo ? (
                    <img src={meal.photo} alt="" style={{ width: 48, height: 48, borderRadius: 12, objectFit: 'cover', flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--gray-400)', flexShrink: 0 }} />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, lineHeight: '22px', fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {meal.name}
                    </div>
                    <div style={{ fontSize: 13, lineHeight: '19px', color: 'var(--text-secondary)' }}>
                      P:{meal.protein}g C:{meal.carbs}g F:{meal.fat}g
                    </div>
                  </div>
                  <div style={{ fontSize: 15, lineHeight: '22px', fontWeight: 700, color: '#fff', whiteSpace: 'nowrap' }}>
                    {repeating === meal.id ? 'Logging…' : `${meal.calories} kcal`}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </Frame>
  );
}
