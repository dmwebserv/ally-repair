import { getSettings, LOG_PREFIX, saveDayLog } from './storage';
import { getFoodStats, mergeFoodStats } from './favorites';
import type { DayLog, FoodStat, UserSettings } from './types';

export interface BackupData {
  exportedAt: string;
  settings: UserSettings;
  favorites: FoodStat[];
  logs: DayLog[];
}

function getAllDayLogs(): DayLog[] {
  const logs: DayLog[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith(LOG_PREFIX)) continue;
    const date = key.slice(LOG_PREFIX.length);
    try {
      const parsed = JSON.parse(localStorage.getItem(key) ?? '');
      if (parsed && Array.isArray(parsed.entries)) {
        logs.push({ date, entries: parsed.entries, isGymDay: parsed.isGymDay });
      }
    } catch {
      // skip a corrupt entry rather than fail the whole export
    }
  }
  return logs.sort((a, b) => a.date.localeCompare(b.date));
}

export function buildBackup(): BackupData {
  return {
    exportedAt: new Date().toISOString(),
    settings: getSettings(),
    favorites: getFoodStats(),
    logs: getAllDayLogs(),
  };
}

export function downloadBackup(): void {
  const data = buildBackup();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `nutrilog-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export interface ImportResult {
  entriesAdded: number;
  daysAffected: number;
  favoritesAdded: number;
  /** True if anything at all changed — entries, favorites, or a day's gym-day flag. */
  changed: boolean;
}

/** Merges an imported backup into what's already stored — never overwrites or removes existing entries. */
export function importBackup(json: string): ImportResult {
  let data: BackupData;
  try {
    data = JSON.parse(json);
  } catch {
    throw new Error('That file is not valid JSON.');
  }
  if (!data || !Array.isArray(data.logs)) {
    throw new Error('That does not look like a NutriLog backup file.');
  }

  let entriesAdded = 0;
  let daysAffected = 0;
  let anyChanged = false;

  for (const incoming of data.logs) {
    const raw = localStorage.getItem(LOG_PREFIX + incoming.date);
    const existing: DayLog = raw ? JSON.parse(raw) : { date: incoming.date, entries: [] };
    const existingIds = new Set(existing.entries.map((e) => e.id));
    const toAdd = (incoming.entries ?? []).filter((e) => !existingIds.has(e.id));
    const isGymDay = existing.isGymDay !== undefined ? existing.isGymDay : incoming.isGymDay;
    const gymDayChanged = isGymDay !== existing.isGymDay;

    if (toAdd.length > 0 || gymDayChanged) {
      saveDayLog({ date: incoming.date, entries: [...existing.entries, ...toAdd], isGymDay });
      anyChanged = true;
    }
    if (toAdd.length > 0) {
      entriesAdded += toAdd.length;
      daysAffected += 1;
    }
  }

  const favoritesAdded = Array.isArray(data.favorites) ? mergeFoodStats(data.favorites) : 0;
  if (favoritesAdded > 0) anyChanged = true;

  return { entriesAdded, daysAffected, favoritesAdded, changed: anyChanged };
}
