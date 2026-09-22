import type { DayLog, EffectiveGoals, FoodEntry, UserSettings } from './types';

const SETTINGS_KEY = 'nutrilog:settings';
export const LOG_PREFIX = 'nutrilog:log:';

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
    return { date, entries: parsed.entries ?? [], isGymDay: parsed.isGymDay };
  } catch {
    return { date, entries: [] };
  }
}

/** Every stored day log, oldest first. Skips corrupt entries rather than failing. */
export function listDayLogs(): DayLog[] {
  const logs: DayLog[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith(LOG_PREFIX)) continue;
    const date = key.slice(LOG_PREFIX.length);
    try {
      const parsed = JSON.parse(localStorage.getItem(key) ?? '');
      if (parsed && Array.isArray(parsed.entries)) {
        logs.push({ date, entries: parsed.entries ?? [], isGymDay: parsed.isGymDay });
      }
    } catch {
      // skip a corrupt entry rather than fail the whole listing
    }
  }
  return logs.sort((a, b) => a.date.localeCompare(b.date));
}

/** True if this device holds any day logs at all (used for one-time migration decisions). */
export function hasAnyLogs(): boolean {
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(LOG_PREFIX)) return true;
  }
  return false;
}

export function saveDayLog(log: DayLog): void {
  localStorage.setItem(LOG_PREFIX + log.date, JSON.stringify(log));
}

export function addEntry(date: string, entry: FoodEntry): DayLog {
  const log = getDayLog(date);
  const updated: DayLog = { ...log, entries: [...log.entries, entry] };
  saveDayLog(updated);
  return updated;
}

export function removeEntry(date: string, entryId: string): DayLog {
  const log = getDayLog(date);
  const updated: DayLog = {
    ...log,
    entries: log.entries.filter((e) => e.id !== entryId),
  };
  saveDayLog(updated);
  return updated;
}

export function updateEntry(date: string, entry: FoodEntry): DayLog {
  const log = getDayLog(date);
  const updated: DayLog = {
    ...log,
    entries: log.entries.map((e) => (e.id === entry.id ? entry : e)),
  };
  saveDayLog(updated);
  return updated;
}

export function setGymDay(date: string, isGymDay: boolean): DayLog {
  const log = getDayLog(date);
  const updated: DayLog = { ...log, isGymDay };
  saveDayLog(updated);
  return updated;
}

export function effectiveGoals(settings: UserSettings, isGymDay?: boolean): EffectiveGoals {
  if (!isGymDay) {
    return {
      calorieGoal: settings.calorieGoal,
      proteinGoal: settings.proteinGoal,
      carbsGoal: settings.carbsGoal,
      fatGoal: settings.fatGoal,
    };
  }
  return {
    calorieGoal: settings.gymCalorieGoal ?? settings.calorieGoal,
    proteinGoal: settings.gymProteinGoal ?? settings.proteinGoal,
    carbsGoal: settings.gymCarbsGoal ?? settings.carbsGoal,
    fatGoal: settings.gymFatGoal ?? settings.fatGoal,
  };
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
