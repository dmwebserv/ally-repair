import type { DayLog, FoodEntry, UserSettings } from './types';

const SETTINGS_KEY = 'nutrilog:settings';
const LOG_PREFIX = 'nutrilog:log:';

const DEFAULT_SETTINGS: UserSettings = {
  calorieGoal: 2000,
};

export function getSettings(): UserSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: UserSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function getDayLog(date: string): DayLog {
  try {
    const raw = localStorage.getItem(LOG_PREFIX + date);
    if (!raw) return { date, entries: [] };
    const parsed = JSON.parse(raw) as DayLog;
    return { date, entries: parsed.entries ?? [] };
  } catch {
    return { date, entries: [] };
  }
}

export function saveDayLog(log: DayLog): void {
  localStorage.setItem(LOG_PREFIX + log.date, JSON.stringify(log));
}

export function addEntry(date: string, entry: FoodEntry): DayLog {
  const log = getDayLog(date);
  const updated: DayLog = { date, entries: [...log.entries, entry] };
  saveDayLog(updated);
  return updated;
}

export function removeEntry(date: string, entryId: string): DayLog {
  const log = getDayLog(date);
  const updated: DayLog = {
    date,
    entries: log.entries.filter((e) => e.id !== entryId),
  };
  saveDayLog(updated);
  return updated;
}

export function dayTotals(log: DayLog) {
  return log.entries.reduce(
    (acc, e) => {
      const mult = e.servings || 1;
      acc.calories += e.calories * mult;
      acc.protein += (e.protein ?? 0) * mult;
      acc.carbs += (e.carbs ?? 0) * mult;
      acc.fat += (e.fat ?? 0) * mult;
      return acc;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
}
