import { useEffect, useMemo, useRef, useState } from 'react';
import './App.css';
import AddFoodPanel from './components/AddFoodPanel';
import BackupPanel from './components/BackupPanel';
import CalendarView from './components/CalendarView';
import CalorieRing from './components/CalorieRing';
import DateNav from './components/DateNav';
import FavoritesRow from './components/FavoritesRow';
import FoodLog from './components/FoodLog';
import GoalSetting from './components/GoalSetting';
import WeekSummary from './components/WeekSummary';
import MealTemplates from './components/MealTemplates';
import FoodSearch from './components/FoodSearch';
import type { CatalogFood } from './lib/barcode';
import { IconCloudDown, IconDumbbell } from './components/icons';
import { importBackup } from './lib/backup';
import { CLOUD_SYNC_ENABLED, pullLegacyBackup, pushBackup } from './lib/cloudSync';
import { addDays, todayKey } from './lib/date';
import { pinByEntry, recordFoodUse } from './lib/favorites';
import { clearLegacyMergeFlag, ensureProfile, type DeviceProfile } from './lib/profile';
import { applyTheme, getTheme, applyAppearanceMode, getAppearanceMode } from './lib/theme';
import {
  addEntry,
  dayTotals,
  effectiveGoals,
  getDayLog,
  getSettings,
  removeEntry,
  saveSettings,
  saveDayLog,
  setGymDay,
  updateEntry,
} from './lib/storage';
import type { FoodEntry, UserSettings } from './lib/types';

interface Toast {
  entry: FoodEntry;
  date: string;
}

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error';

function macroPct(value: number, goal?: number): number | null {
  if (!goal) return null;
  return Math.min(100, (value / goal) * 100);
}

function App() {
  const [date, setDate] = useState(todayKey());
  const [settings, setSettings] = useState(getSettings());
  const [log, setLog] = useState(getDayLog(date));
  const [refreshKey, setRefreshKey] = useState(0);
  const [editingEntry, setEditingEntry] = useState<FoodEntry | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [backupOpen, setBackupOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [profile, setProfile] = useState<DeviceProfile>(() => ensureProfile());
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const toastTimeout = useRef<number | null>(null);
  const syncTimeout = useRef<number | null>(null);
  const dateRef = useRef(date);
  dateRef.current = date;
  const migratedRef = useRef(false);

  useEffect(() => {
    setLog(getDayLog(date));
  }, [date]);

  useEffect(() => {
    const online = () => setIsOnline(true);
    const offline = () => setIsOnline(false);
    window.addEventListener('online', online); window.addEventListener('offline', offline);
    return () => { window.removeEventListener('online', online); window.removeEventListener('offline', offline); };
  }, []);

  // Per-device accent colour: apply on mount and keep the theme-color meta
  // tinted correctly when the OS colour scheme flips.
  useEffect(() => {
    applyTheme(getTheme());
    applyAppearanceMode(getAppearanceMode());
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onSchemeChange = () => { applyTheme(getTheme()); applyAppearanceMode(getAppearanceMode()); };
    mq.addEventListener('change', onSchemeChange);
    return () => mq.removeEventListener('change', onSchemeChange);
  }, []);

  const totals = useMemo(() => dayTotals(log), [log]);
  const goals = useMemo(() => effectiveGoals(settings, log.isGymDay), [settings, log.isGymDay]);

  const syncNow = () => {
    if (!CLOUD_SYNC_ENABLED) return;
    if (syncTimeout.current !== null) {
      window.clearTimeout(syncTimeout.current);
      syncTimeout.current = null;
    }
    setSyncStatus('syncing');
    pushBackup()
      .then(() => setSyncStatus('synced'))
      .catch(() => setSyncStatus('error'));
  };

  const scheduleSync = () => {
    if (!CLOUD_SYNC_ENABLED) return;
    if (syncTimeout.current !== null) window.clearTimeout(syncTimeout.current);
    syncTimeout.current = window.setTimeout(() => {
      syncTimeout.current = null;
      syncNow();
    }, 4000);
  };

  useEffect(() => {
    if (!CLOUD_SYNC_ENABLED) return;
    const flush = () => {
      if (syncTimeout.current === null) return;
      syncNow();
    };
    document.addEventListener('visibilitychange', flush);
    window.addEventListener('pagehide', flush);
    return () => {
      document.removeEventListener('visibilitychange', flush);
      window.removeEventListener('pagehide', flush);
    };
  }, []);

  // One-time migration onto per-device cloud backups. Only runs on installs
  // that already held logs when profiles were introduced (i.e. the owner's
  // device) — a friend opening the shared link starts with a fresh profile
  // and never touches the legacy backup.
  useEffect(() => {
    if (!CLOUD_SYNC_ENABLED || migratedRef.current) return;
    migratedRef.current = true;
    if (!ensureProfile().needsLegacyMerge) return;
    setSyncStatus('syncing');
    pullLegacyBackup()
      .then((content) => {
        if (content) {
          try {
            importBackup(content);
          } catch {
            // Corrupt legacy backup: carry on with the intact local data.
          }
        }
      })
      .catch(() => {
        // Offline or unreachable: local data is intact; normal sync covers it later.
      })
      .finally(() => {
        setProfile(clearLegacyMergeFlag());
        setLog(getDayLog(dateRef.current));
        setSettings(getSettings());
        setRefreshKey((k) => k + 1);
        pushBackup()
          .then(() => setSyncStatus('synced'))
          .catch(() => setSyncStatus('error'));
      });
  }, []);

  const handleAdd = (entry: FoodEntry, favorite: boolean) => {
    const updated = addEntry(date, entry);
    setLog(updated);
    setRefreshKey((k) => k + 1);
    recordFoodUse(entry);
    if (favorite) pinByEntry(entry);
    scheduleSync();
  };

  const handleCopyYesterday = () => {
    const previous = getDayLog(addDays(date, -1));
    if (!previous.entries.length) return;
    if (!window.confirm(`Copy ${previous.entries.length} food${previous.entries.length === 1 ? '' : 's'} from the previous day?`)) return;
    const updated = getDayLog(date);
    const copies = previous.entries.map((entry) => ({ ...entry, id: crypto.randomUUID(), loggedAt: new Date().toISOString() }));
    const next = { ...updated, entries: [...updated.entries, ...copies] };
    saveDayLog(next);
    setLog(next);
    setRefreshKey((k) => k + 1);
    copies.forEach(recordFoodUse);
    scheduleSync();
  };

  const handleAddToToday = (entry: FoodEntry) => {
    const today = todayKey();
    const copy = { ...entry, id: crypto.randomUUID(), loggedAt: new Date().toISOString() };
    const updated = addEntry(today, copy);
    if (date === today) setLog(updated);
    setRefreshKey((k) => k + 1);
    recordFoodUse(copy);
    scheduleSync();
  };

  const handleAddCatalogFood = (food: CatalogFood) => {
    const entry: FoodEntry = {
      id: crypto.randomUUID(), name: food.name, calories: food.parsed.calories ?? 0,
      protein: food.parsed.protein, carbs: food.parsed.carbs, fat: food.parsed.fat,
      servings: 1, grams: 100, per100g: true, barcode: food.code ?? undefined,
      loggedAt: new Date().toISOString(),
    };
    handleAddToToday(entry);
  };

  const handleQuickAdd = (entry: FoodEntry) => {
    const updated = addEntry(date, entry);
    setLog(updated);
    setRefreshKey((k) => k + 1);
    recordFoodUse(entry);
    scheduleSync();
  };

  const handleDuplicate = (entry: FoodEntry) => {
    const copy = { ...entry, id: crypto.randomUUID(), loggedAt: new Date().toISOString() };
    const updated = addEntry(date, copy);
    setLog(updated);
    setRefreshKey((k) => k + 1);
    recordFoodUse(copy);
    scheduleSync();
  };

  const handleMove = (entry: FoodEntry, targetDate: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) { window.alert('Please enter a date as YYYY-MM-DD.'); return; }
    const parsed = new Date(`${targetDate}T12:00:00`);
    if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== targetDate) { window.alert('That date is not valid.'); return; }
    if (targetDate === date) return;
    const source = getDayLog(date);
    const moved = source.entries.find((item) => item.id === entry.id);
    if (!moved) return;
    saveDayLog({ ...source, entries: source.entries.filter((item) => item.id !== entry.id) });
    const destination = getDayLog(targetDate);
    saveDayLog({ ...destination, entries: [...destination.entries, moved] });
    setLog(getDayLog(date));
    setRefreshKey((k) => k + 1);
    scheduleSync();
  };

  const handleSaveEdit = (entry: FoodEntry) => {
    const updated = updateEntry(date, entry);
    setLog(updated);
    setRefreshKey((k) => k + 1);
    scheduleSync();
  };

  const clearToastTimeout = () => {
    if (toastTimeout.current !== null) {
      window.clearTimeout(toastTimeout.current);
      toastTimeout.current = null;
    }
  };

  const handleDelete = (entry: FoodEntry, entryDate: string = date) => {
    const updated = removeEntry(entryDate, entry.id);
    if (entryDate === date) setLog(updated);
    setRefreshKey((k) => k + 1);

    clearToastTimeout();
    setToast({ entry, date: entryDate });
    // Defer the sync until the undo window closes, so an "oops" doesn't cost a round trip.
    toastTimeout.current = window.setTimeout(() => {
      setToast(null);
      toastTimeout.current = null;
      scheduleSync();
    }, 5000);
  };

  const handleUndo = () => {
    if (!toast) return;
    clearToastTimeout();
    const updated = addEntry(toast.date, toast.entry);
    if (toast.date === date) setLog(updated);
    setRefreshKey((k) => k + 1);
    setToast(null);
    scheduleSync();
  };

  const handleSettingsSave = (updated: UserSettings) => {
    setSettings(updated);
    saveSettings(updated);
    scheduleSync();
  };

  const handleToggleGymDay = () => {
    const updated = setGymDay(date, !log.isGymDay);
    setLog(updated);
    scheduleSync();
  };

  const handleImported = () => {
    setLog(getDayLog(date));
    setSettings(getSettings());
    setRefreshKey((k) => k + 1);
    scheduleSync();
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          <img src={`${import.meta.env.BASE_URL}icon-192.png`} alt="" className="brand-mark" />
          <h1>NutriLog</h1>
        </div>
        <div className="header-actions">
          <button
            type="button"
            className={`icon-btn sync-${syncStatus}`}
            onClick={() => setBackupOpen(true)}
            aria-label="Backup and restore"
          >
            <IconCloudDown width={16} height={16} />
          </button>
          <GoalSetting settings={settings} onSave={handleSettingsSave} />
        </div>
      </header>

      {backupOpen && (
        <BackupPanel
          onClose={() => setBackupOpen(false)}
          onImported={handleImported}
          syncStatus={syncStatus}
          onSyncNow={syncNow}
          profile={profile}
          onProfileChange={setProfile}
        />
      )}

      {calendarOpen && (
        <CalendarView
          settings={settings}
          selected={date}
          refreshKey={refreshKey}
          onSelect={(d) => {
            setDate(d);
            setCalendarOpen(false);
          }}
          onClose={() => setCalendarOpen(false)}
        />
      )}

      {!isOnline && <div className="offline-banner" role="status">Offline — logs stay on this device; barcode lookup and cloud backup need internet.</div>}

      <DateNav date={date} onChange={setDate} onOpenCalendar={() => setCalendarOpen(true)} />

      <button
        type="button"
        className={`gym-day-toggle ${log.isGymDay ? 'active' : ''}`}
        onClick={handleToggleGymDay}
      >
        <IconDumbbell width={15} height={15} />
        Gym day
      </button>

      <CalorieRing consumed={totals.calories} goal={goals.calorieGoal} />

      <div className="macro-row">
        <div className="macro-pill">
          <div className="macro-pill-top">
            <span className="macro-dot protein" />
            <span className="macro-value">{goals.proteinGoal ? `${Math.max(0, Math.round(goals.proteinGoal - totals.protein))}g left` : `${Math.round(totals.protein)}g`}</span>
          </div>
          <span className="macro-key">{goals.proteinGoal ? `${Math.round(totals.protein)}g eaten${totals.protein > goals.proteinGoal ? ` · ${Math.round(totals.protein-goals.proteinGoal)}g over` : ''}` : 'protein eaten · no goal'}</span>
          {macroPct(totals.protein, goals.proteinGoal) !== null && (
            <div className="macro-pill-track">
              <div className="macro-pill-fill protein" style={{ width: `${macroPct(totals.protein, goals.proteinGoal)}%` }} />
            </div>
          )}
        </div>
        <div className="macro-pill">
          <div className="macro-pill-top">
            <span className="macro-dot carbs" />
            <span className="macro-value">{goals.carbsGoal ? `${Math.max(0, Math.round(goals.carbsGoal - totals.carbs))}g left` : `${Math.round(totals.carbs)}g`}</span>
          </div>
          <span className="macro-key">{goals.carbsGoal ? `${Math.round(totals.carbs)}g eaten${totals.carbs > goals.carbsGoal ? ` · ${Math.round(totals.carbs-goals.carbsGoal)}g over` : ''}` : 'carbs eaten · no goal'}</span>
          {macroPct(totals.carbs, goals.carbsGoal) !== null && (
            <div className="macro-pill-track">
              <div className="macro-pill-fill carbs" style={{ width: `${macroPct(totals.carbs, goals.carbsGoal)}%` }} />
            </div>
          )}
        </div>
        <div className="macro-pill">
          <div className="macro-pill-top">
            <span className="macro-dot fat" />
            <span className="macro-value">{goals.fatGoal ? `${Math.max(0, Math.round(goals.fatGoal - totals.fat))}g left` : `${Math.round(totals.fat)}g`}</span>
          </div>
          <span className="macro-key">{goals.fatGoal ? `${Math.round(totals.fat)}g eaten${totals.fat > goals.fatGoal ? ` · ${Math.round(totals.fat-goals.fatGoal)}g over` : ''}` : 'fat eaten · no goal'}</span>
          {macroPct(totals.fat, goals.fatGoal) !== null && (
            <div className="macro-pill-track">
              <div className="macro-pill-fill fat" style={{ width: `${macroPct(totals.fat, goals.fatGoal)}%` }} />
            </div>
          )}
        </div>
      </div>

      <FavoritesRow refreshKey={refreshKey} onQuickAdd={handleQuickAdd} />
      <FoodSearch refreshKey={refreshKey} onAddHistory={handleAddToToday} onAddCatalog={handleAddCatalogFood} />

      <AddFoodPanel
        onAdd={handleAdd}
        editingEntry={editingEntry}
        onSaveEdit={handleSaveEdit}
        onDeleteEdit={(entry) => handleDelete(entry)}
        onEditDone={() => setEditingEntry(null)}
      />

      <section className="log-section">
        <div className="log-title-row"><h2 className="section-title">Food log</h2><button type="button" className="link-btn" onClick={handleCopyYesterday}>Copy yesterday</button></div>
        <FoodLog entries={log.entries} onRemove={(entry) => handleDelete(entry)} onEdit={setEditingEntry} onDuplicate={handleDuplicate} onMove={handleMove} onAddToToday={handleAddToToday} isViewingToday={date === todayKey()} />
      </section>

      <MealTemplates entries={log.entries} onApply={(entries) => {
        const copies = entries.map((entry) => ({ ...entry, id: crypto.randomUUID(), loggedAt: new Date().toISOString() }));
        const updated = { ...getDayLog(date), entries: [...getDayLog(date).entries, ...copies] };
        saveDayLog(updated); setLog(updated); setRefreshKey((k) => k + 1); copies.forEach(recordFoodUse); scheduleSync();
      }} />

      <WeekSummary settings={settings} refreshKey={refreshKey} />

      <footer className="app-footer">
        <p>
          {CLOUD_SYNC_ENABLED
            ? 'Backed up automatically to your private GitHub repo.'
            : 'Everything stays on this device — no account, no server, no cost.'}
        </p>
      </footer>

      {toast && (
        <div className="undo-toast">
          <span>Deleted "{toast.entry.name || 'food'}"</span>
          <button type="button" onClick={handleUndo}>
            Undo
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
