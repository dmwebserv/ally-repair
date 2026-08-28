import { prepareImage } from './image';
import type { ParsedNutrition } from './types';

export const AI_SCAN_ENABLED = Boolean(import.meta.env.VITE_SCAN_API_URL);

interface AiScanResponse {
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  name: string | null;
  estimated: boolean;
  error?: string;
}

export interface AiScanResult {
  parsed: ParsedNutrition;
  name: string | null;
  estimated: boolean;
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export async function scanWithAI(file: File | Blob): Promise<AiScanResult> {
  const apiUrl = import.meta.env.VITE_SCAN_API_URL;
  if (!apiUrl) throw new Error('AI scan is not configured');

  const resized = await prepareImage(file, 0, 1400);
  const dataUrl = await blobToDataUrl(resized);

  const res = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(import.meta.env.VITE_SCAN_SECRET ? { 'X-App-Secret': import.meta.env.VITE_SCAN_SECRET } : {}),
    },
    body: JSON.stringify({ image: dataUrl }),
  });

  const data: AiScanResponse = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error || `AI scan failed (${res.status})`);
  }

  return {
    parsed: {
      calories: data.calories ?? undefined,
      protein: data.protein ?? undefined,
      carbs: data.carbs ?? undefined,
      fat: data.fat ?? undefined,
    },
    name: data.name,
    estimated: Boolean(data.estimated),
  };
}
