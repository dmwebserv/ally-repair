import type { ParsedNutrition } from './types';

export interface BarcodeResult {
  parsed: ParsedNutrition;
  name: string | null;
  perHundredGrams: boolean;
}

interface OffNutriments {
  'energy-kcal_serving'?: number;
  'energy-kcal_100g'?: number;
  proteins_serving?: number;
  proteins_100g?: number;
  carbohydrates_serving?: number;
  carbohydrates_100g?: number;
  fat_serving?: number;
  fat_100g?: number;
}

interface OffResponse {
  status: number;
  product?: {
    product_name?: string;
    nutriments?: OffNutriments;
  };
}

async function fetchProduct(code: string): Promise<OffResponse['product'] | null> {
  const res = await fetch(
    `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=product_name,nutriments`,
  );
  if (!res.ok) throw new Error(`Lookup failed (${res.status})`);
  const data: OffResponse = await res.json();
  return data.status === 1 && data.product ? data.product : null;
}

/**
 * Barcode scanners disagree on whether a 12-digit UPC-A code gets a leading
 * zero to become a 13-digit EAN — Open Food Facts is usually indexed by
 * EAN-13, so try the raw scan first, then the other form as a fallback.
 */
function candidateCodes(code: string): string[] {
  const trimmed = code.trim();
  const candidates = [trimmed];
  if (/^\d{12}$/.test(trimmed)) candidates.push(`0${trimmed}`);
  if (/^0\d{12}$/.test(trimmed)) candidates.push(trimmed.slice(1));
  return candidates;
}

export async function lookupBarcode(code: string): Promise<BarcodeResult | null> {
  let product: OffResponse['product'] | null = null;
  for (const candidate of candidateCodes(code)) {
    product = await fetchProduct(candidate);
    if (product) break;
  }
  if (!product) return null;

  const n = product.nutriments ?? {};
  const hasServing = n['energy-kcal_serving'] !== undefined;

  const pick = (servingKey: keyof OffNutriments, hundredKey: keyof OffNutriments) =>
    hasServing ? n[servingKey] : n[hundredKey];

  const calories = pick('energy-kcal_serving', 'energy-kcal_100g');
  const protein = pick('proteins_serving', 'proteins_100g');
  const carbs = pick('carbohydrates_serving', 'carbohydrates_100g');
  const fat = pick('fat_serving', 'fat_100g');

  if (calories === undefined && protein === undefined && carbs === undefined && fat === undefined) {
    return null;
  }

  return {
    parsed: { calories, protein, carbs, fat },
    name: product.product_name || null,
    perHundredGrams: !hasServing,
  };
}
