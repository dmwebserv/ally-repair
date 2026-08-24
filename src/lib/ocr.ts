import { createWorker } from 'tesseract.js';
import type { ParsedNutrition } from './types';

export async function recognizeText(
  image: File | Blob,
  onProgress?: (pct: number) => void,
): Promise<string> {
  const worker = await createWorker('eng', undefined, {
    workerPath: '/tesseract/worker.min.js',
    corePath: '/tesseract/tesseract-core-lstm.wasm.js',
    logger: (m) => {
      if (m.status === 'recognizing text' && onProgress) {
        onProgress(Math.round(m.progress * 100));
      }
    },
  });
  try {
    const {
      data: { text },
    } = await worker.recognize(image);
    return text;
  } finally {
    await worker.terminate();
  }
}

function firstMatchNumber(text: string, patterns: RegExp[]): number | undefined {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      const num = parseFloat(match[1]);
      if (!Number.isNaN(num)) return num;
    }
  }
  return undefined;
}

export function parseNutritionLabel(rawText: string): ParsedNutrition {
  const flat = rawText.replace(/\n/g, ' ').replace(/\s+/g, ' ');

  const calories = firstMatchNumber(flat, [
    /calories[^0-9]{0,15}(\d{1,4})/i,
    /amount per serving[^0-9]{0,20}(\d{1,4})/i,
  ]);

  const fat = firstMatchNumber(flat, [
    /total\s*fat[^0-9]{0,15}(\d{1,3}(?:\.\d+)?)\s*g/i,
    /\bfat[^0-9]{0,15}(\d{1,3}(?:\.\d+)?)\s*g/i,
  ]);

  const carbs = firstMatchNumber(flat, [
    /total\s*carb\w*[^0-9]{0,15}(\d{1,3}(?:\.\d+)?)\s*g/i,
    /carbohydrate\w*[^0-9]{0,15}(\d{1,3}(?:\.\d+)?)\s*g/i,
  ]);

  const protein = firstMatchNumber(flat, [/protein[^0-9]{0,15}(\d{1,3}(?:\.\d+)?)\s*g/i]);

  return { calories, protein, carbs, fat };
}
