import type { FoodEntry, FoodStat } from './types';

const FAVORITES_KEY = 'nutrilog:favorites';
const AUTO_TRACK_THRESHOLD = 3;

export function getFoodStats(): FoodStat[] {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveFoodStats(stats: FoodStat[]): void {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(stats));
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

/** Call whenever a food is logged, so frequency-based suggestions stay current. */
export function recordFoodUse(entry: FoodEntry): void {
  const name = entry.name.trim();
  if (!name) return;
  const key = normalizeName(name);
  const stats = getFoodStats();
  const existing = stats.find((s) => normalizeName(s.name) === key);

  if (existing) {
    existing.calories = entry.calories;
    existing.protein = entry.protein;
    existing.carbs = entry.carbs;
    existing.fat = entry.fat;
    existing.servings = entry.servings;
    existing.useCount += 1;
    existing.lastUsedAt = entry.loggedAt;
  } else {
    stats.push({
      id: crypto.randomUUID(),
      name,
      calories: entry.calories,
      protein: entry.protein,
      carbs: entry.carbs,
      fat: entry.fat,
      servings: entry.servings,
      useCount: 1,
      lastUsedAt: entry.loggedAt,
      pinned: false,
    });
  }
  saveFoodStats(stats);
}

export function pinFood(id: string, pinned: boolean): FoodStat[] {
  const stats = getFoodStats();
  const updated = stats.map((s) => (s.id === id ? { ...s, pinned } : s));
  saveFoodStats(updated);
  return updated;
}

export function updateFoodStat(stat: FoodStat): FoodStat[] {
  const stats = getFoodStats();
  const updated = stats.map((s) => (s.id === stat.id ? stat : s));
  saveFoodStats(updated);
  return updated;
}

export function deleteFoodStat(id: string): FoodStat[] {
  const stats = getFoodStats();
  const updated = stats.filter((s) => s.id !== id);
  saveFoodStats(updated);
  return updated;
}

/** Pins the food matching this entry's name, creating a stat record for it if none exists yet. */
export function pinByEntry(entry: FoodEntry): void {
  const key = normalizeName(entry.name);
  if (!key) return;
  const stats = getFoodStats();
  const existing = stats.find((s) => normalizeName(s.name) === key);
  if (existing) {
    existing.pinned = true;
  } else {
    stats.push({
      id: crypto.randomUUID(),
      name: entry.name.trim(),
      calories: entry.calories,
      protein: entry.protein,
      carbs: entry.carbs,
      fat: entry.fat,
      servings: entry.servings,
      useCount: 0,
      lastUsedAt: entry.loggedAt,
      pinned: true,
    });
  }
  saveFoodStats(stats);
}

export function addManualFavorite(input: Omit<FoodStat, 'id' | 'useCount' | 'lastUsedAt' | 'pinned'>): FoodStat[] {
  const stats = getFoodStats();
  stats.push({
    ...input,
    id: crypto.randomUUID(),
    useCount: 0,
    lastUsedAt: new Date().toISOString(),
    pinned: true,
  });
  saveFoodStats(stats);
  return stats;
}

/** Pinned favorites first, then frequently-used foods, most relevant first. */
export function getQuickAddFoods(limit = 10): FoodStat[] {
  const stats = getFoodStats();
  const pinned = stats.filter((s) => s.pinned).sort((a, b) => b.lastUsedAt.localeCompare(a.lastUsedAt));
  const frequent = stats
    .filter((s) => !s.pinned && s.useCount >= AUTO_TRACK_THRESHOLD)
    .sort((a, b) => b.useCount - a.useCount || b.lastUsedAt.localeCompare(a.lastUsedAt));
  return [...pinned, ...frequent].slice(0, limit);
}

export function toFoodEntry(stat: FoodStat): FoodEntry {
  return {
    id: crypto.randomUUID(),
    name: stat.name,
    calories: stat.calories,
    protein: stat.protein,
    carbs: stat.carbs,
    fat: stat.fat,
    servings: stat.servings,
    loggedAt: new Date().toISOString(),
  };
}
