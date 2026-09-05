import { NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const maxDuration = 20;

/**
 * Barcode lookup against Open Food Facts — a free, key-less, community
 * database of packaged food. Values come off the label, so unlike the vision
 * estimate they are exact for the portion given.
 */
const OFF_ENDPOINT = 'https://world.openfoodfacts.org/api/v2/product';
const FIELDS = [
  'product_name', 'brands', 'quantity', 'serving_size', 'serving_quantity', 'nutriments',
].join(',');

type Nutriments = Record<string, number | string | undefined>;

function num(value: unknown): number {
  const n = typeof value === 'number' ? value : parseFloat(String(value ?? ''));
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

/** kcal per 100g, falling back to kJ when the label only carries energy. */
function caloriesPer100g(n: Nutriments): number {
  const kcal = num(n['energy-kcal_100g']);
  if (kcal > 0) return kcal;
  const kj = num(n['energy_100g']);
  return kj > 0 ? kj / 4.184 : 0;
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const barcode = new URL(request.url).searchParams.get('barcode')?.trim() ?? '';
  if (!/^\d{6,14}$/.test(barcode)) {
    return NextResponse.json({ error: 'That is not a valid barcode.' }, { status: 400 });
  }

  let payload: { status?: number; product?: Record<string, unknown> };
  try {
    const res = await fetch(`${OFF_ENDPOINT}/${barcode}.json?fields=${FIELDS}`, {
      headers: { 'User-Agent': 'Tracked/1.0 (personal calorie tracker)' },
      signal: AbortSignal.timeout(12_000),
    });
    if (res.status === 404) {
      return NextResponse.json({ error: 'No product found for that barcode.' }, { status: 404 });
    }
    if (!res.ok) throw new Error(String(res.status));
    payload = await res.json();
  } catch {
    return NextResponse.json({ error: 'Could not reach the product database.' }, { status: 502 });
  }

  const product = payload.product;
  if (!product || payload.status === 0) {
    return NextResponse.json({ error: 'No product found for that barcode.' }, { status: 404 });
  }

  const n = (product.nutriments ?? {}) as Nutriments;
  const brand = String(product.brands ?? '').split(',')[0].trim();
  const name = String(product.product_name ?? '').trim();
  if (!name) {
    return NextResponse.json({ error: 'That product has no name on record.' }, { status: 404 });
  }

  // Everything is normalised to "per 100 g" so the client can scale to any
  // portion. Open Food Facts stores sodium in grams; the app works in mg.
  return NextResponse.json({
    barcode,
    name: brand ? `${brand} ${name}` : name,
    quantity: String(product.quantity ?? '').trim() || null,
    servingSize: String(product.serving_size ?? '').trim() || null,
    servingGrams: num(product.serving_quantity) || null,
    per100g: {
      calories: caloriesPer100g(n),
      protein: num(n.proteins_100g),
      carbs: num(n.carbohydrates_100g),
      fat: num(n.fat_100g),
      fiber: num(n.fiber_100g),
      sugar: num(n.sugars_100g),
      sodium: num(n.sodium_100g) * 1000,
      potassium: num(n.potassium_100g) * 1000,
      calcium: num(n.calcium_100g) * 1000,
      iron: num(n.iron_100g) * 1000,
      vitaminC: num(n['vitamin-c_100g']) * 1000,
    },
  });
}
