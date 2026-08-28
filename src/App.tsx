import { useEffect, useMemo, useRef, useState } from 'react';
import './App.css';
import AddFoodPanel from './components/AddFoodPanel';
import BackupPanel from './components/BackupPanel';
import CalorieRing from './components/CalorieRing';
import DateNav from './components/DateNav';
import FavoritesRow from './components/FavoritesRow';
import FoodLog from './components/FoodLog';
import GoalSetting from './components/GoalSetting';
import WeekSummary from './components/WeekSummary';
import { IconCloudDown, IconDumbbell } from './components/icons';
import { CLOUD_SYNC_ENABLED, pushBackup } from './lib/cloudSync';
import { todayKey } from './lib/date';
import { pinByEntry, recordFoodUse } from './lib/favorites';
import {
  addEntry,
  dayTotals,
  effectiveGoals,
  getDayLog,
  getSettings,
  removeEntry,
  saveSettings,
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
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const toastTimeout = useRef<number | null>(null);
  const syncTimeout = useRef<number | null>(null);

  useEffect(() => {
    setLog(getDayLog(date));
  }, [date]);

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

  const handleAdd = (entry: FoodEntry, favorite: boolean) => {
    const updated = addEntry(date, entry);
    setLog(updated);
    setRefreshKey((k) => k + 1);
    recordFoodUse(entry);
    if (favorite) pinByEntry(entry);
    scheduleSync();
  };

  const handleQuickAdd = (entry: FoodEntry) => {
    const updated = addEntry(date, entry);
    setLog(updated);
    setRefreshKey((k) => k + 1);
    recordFoodUse(entry);
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
        />
      )}

      <DateNav date={date} onChange={setDate} />

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
            <span className="macro-value">{Math.round(totals.protein)}g</span>
          </div>
          <span className="macro-key">protein{goals.proteinGoal ? ` / ${goals.proteinGoal}g` : ''}</span>
          {macroPct(totals.protein, goals.proteinGoal) !== null && (
            <div className="macro-pill-track">
              <div className="macro-pill-fill protein" style={{ width: `${macroPct(totals.protein, goals.proteinGoal)}%` }} />
            </div>
          )}
        </div>
        <div className="macro-pill">
          <div className="macro-pill-top">
            <span className="macro-dot carbs" />
            <span className="macro-value">{Math.round(totals.carbs)}g</span>
          </div>
          <span className="macro-key">carbs{goals.carbsGoal ? ` / ${goals.carbsGoal}g` : ''}</span>
          {macroPct(totals.carbs, goals.carbsGoal) !== null && (
            <div className="macro-pill-track">
              <div className="macro-pill-fill carbs" style={{ width: `${macroPct(totals.carbs, goals.carbsGoal)}%` }} />
            </div>
          )}
        </div>
        <div className="macro-pill">
          <div className="macro-pill-top">
            <span className="macro-dot fat" />
            <span className="macro-value">{Math.round(totals.fat)}g</span>
          </div>
          <span className="macro-key">fat{goals.fatGoal ? ` / ${goals.fatGoal}g` : ''}</span>
          {macroPct(totals.fat, goals.fatGoal) !== null && (
            <div className="macro-pill-track">
              <div className="macro-pill-fill fat" style={{ width: `${macroPct(totals.fat, goals.fatGoal)}%` }} />
            </div>
          )}
        </div>
      </div>

      <FavoritesRow refreshKey={refreshKey} onQuickAdd={handleQuickAdd} />

      <AddFoodPanel
        onAdd={handleAdd}
        editingEntry={editingEntry}
        onSaveEdit={handleSaveEdit}
        onDeleteEdit={(entry) => handleDelete(entry)}
        onEditDone={() => setEditingEntry(null)}
      />

      <section className="log-section">
        <h2 className="section-title">Today's log</h2>
        <FoodLog entries={log.entries} onRemove={(entry) => handleDelete(entry)} onEdit={setEditingEntry} />
      </section>

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
