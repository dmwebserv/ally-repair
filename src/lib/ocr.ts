import { createWorker, type Worker } from 'tesseract.js';
import { prepareImage } from './image';
import type { ParsedNutrition } from './types';

let workerPromise: Promise<Worker> | null = null;
let currentProgressHandler: ((pct: number) => void) | undefined;

function getWorker(): Promise<Worker> {
  if (!workerPromise) {
    workerPromise = createWorker('eng', undefined, {
      workerPath: `${import.meta.env.BASE_URL}tesseract/worker.min.js`,
      corePath: `${import.meta.env.BASE_URL}tesseract/tesseract-core-lstm.wasm.js`,
      logger: (m) => {
        if (m.status === 'recognizing text') {
          currentProgressHandler?.(Math.round(m.progress * 100));
        }
      },
    });
  }
  return workerPromise;
}

async function recognizeText(image: File | Blob, onProgress?: (pct: number) => void): Promise<string> {
  const worker = await getWorker();
  currentProgressHandler = onProgress;
  try {
    const { data } = await worker.recognize(image, { rotateAuto: true }, { text: true });
    return data.text ?? '';
  } finally {
    currentProgressHandler = undefined;
  }
}

const SERVING_MARKER = /per\s*(serving|pouch|portion|container|bar|pack|piece|100\s*g)/i;

function pickValue(matches: number[], text: string): number | undefined {
  if (matches.length === 0) return undefined;
  if (matches.length > 1 && SERVING_MARKER.test(text)) return matches[matches.length - 1];
  return matches[0];
}

function allGlobalMatches(text: string, pattern: RegExp): number[] {
  const re = new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`);
  const out: number[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const n = parseFloat(m[1]);
    if (!Number.isNaN(n)) out.push(n);
  }
  return out;
}

function keywordPair(text: string, keywordSource: string): number[] {
  const re = new RegExp(
    `${keywordSource}[^0-9]{0,15}(\\d{1,4}(?:\\.\\d+)?)\\s*g?\\s*(\\d{1,4}(?:\\.\\d+)?)?\\s*g?`,
    'i',
  );
  const m = text.match(re);
  if (!m) return [];
  const out = [parseFloat(m[1])];
  if (m[2]) out.push(parseFloat(m[2]));
  return out;
}

function firstNonEmpty(...groups: number[][]): number[] {
  for (const g of groups) {
    if (g.length > 0) return g;
  }
  return [];
}

export function parseNutritionLabel(rawText: string): ParsedNutrition {
  const flat = rawText.replace(/\n/g, ' ').replace(/\s+/g, ' ');

  const calorieMatches = [
    ...allGlobalMatches(flat, /(\d{1,4}(?:\.\d+)?)\s*k?cal\b/i),
    ...allGlobalMatches(flat, /calories?[^0-9]{0,15}(\d{1,4}(?:\.\d+)?)/i),
  ];
  const calories = pickValue(calorieMatches, flat);

  const fat = pickValue(firstNonEmpty(keywordPair(flat, 'total\\s*fat'), keywordPair(flat, '\\bfat')), flat);

  const carbs = pickValue(
    firstNonEmpty(keywordPair(flat, 'total\\s*carb\\w*'), keywordPair(flat, 'carbohydrate\\w*')),
    flat,
  );

  const protein = pickValue(keywordPair(flat, 'protein'), flat);

  return { calories, protein, carbs, fat };
}

export interface ScanStatus {
  attempt: number;
  totalAttempts: number;
  pct: number;
}

export interface ScanResult {
  parsed: ParsedNutrition;
  rawText: string;
}

const ROTATIONS = [0, 90, 270, 180];

export async function scanNutritionLabel(
  file: File | Blob,
  onStatus?: (s: ScanStatus) => void,
): Promise<ScanResult> {
  let last: ScanResult = { parsed: {}, rawText: '' };

  for (let i = 0; i < ROTATIONS.length; i++) {
    const rotation = ROTATIONS[i];
    const image = await prepareImage(file, rotation);
    const text = await recognizeText(image, (pct) =>
      onStatus?.({ attempt: i + 1, totalAttempts: ROTATIONS.length, pct }),
    );
    const parsed = parseNutritionLabel(text);
    last = { parsed, rawText: text };
    if (parsed.calories !== undefined) return last;
  }

  return last;
}
