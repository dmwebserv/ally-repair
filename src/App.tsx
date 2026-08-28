import { useEffect, useMemo, useRef, useState } from 'react';
import './App.css';
import AddFoodPanel from './components/AddFoodPanel';
import CalorieRing from './components/CalorieRing';
import DateNav from './components/DateNav';
import FavoritesRow from './components/FavoritesRow';
import FoodLog from './components/FoodLog';
import GoalSetting from './components/GoalSetting';
import WeekSummary from './components/WeekSummary';
import { todayKey } from './lib/date';
import { pinByEntry, recordFoodUse } from './lib/favorites';
import {
  addEntry,
  dayTotals,
  getDayLog,
  getSettings,
  removeEntry,
  saveSettings,
  updateEntry,
} from './lib/storage';
import type { FoodEntry, UserSettings } from './lib/types';

interface Toast {
  entry: FoodEntry;
  date: string;
}

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
  const toastTimeout = useRef<number | null>(null);

  useEffect(() => {
    setLog(getDayLog(date));
  }, [date]);

  const totals = useMemo(() => dayTotals(log), [log]);

  const handleAdd = (entry: FoodEntry, favorite: boolean) => {
    const updated = addEntry(date, entry);
    setLog(updated);
    setRefreshKey((k) => k + 1);
    recordFoodUse(entry);
    if (favorite) pinByEntry(entry);
  };

  const handleQuickAdd = (entry: FoodEntry) => {
    const updated = addEntry(date, entry);
    setLog(updated);
    setRefreshKey((k) => k + 1);
    recordFoodUse(entry);
  };

  const handleSaveEdit = (entry: FoodEntry) => {
    const updated = updateEntry(date, entry);
    setLog(updated);
    setRefreshKey((k) => k + 1);
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
    toastTimeout.current = window.setTimeout(() => {
      setToast(null);
      toastTimeout.current = null;
    }, 5000);
  };

  const handleUndo = () => {
    if (!toast) return;
    clearToastTimeout();
    const updated = addEntry(toast.date, toast.entry);
    if (toast.date === date) setLog(updated);
    setRefreshKey((k) => k + 1);
    setToast(null);
  };

  const handleSettingsSave = (updated: UserSettings) => {
    setSettings(updated);
    saveSettings(updated);
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          <img src={`${import.meta.env.BASE_URL}icon-192.png`} alt="" className="brand-mark" />
          <h1>NutriLog</h1>
        </div>
        <GoalSetting settings={settings} onSave={handleSettingsSave} />
      </header>

      <DateNav date={date} onChange={setDate} />

      <CalorieRing consumed={totals.calories} goal={settings.calorieGoal} />

      <div className="macro-row">
        <div className="macro-pill">
          <div className="macro-pill-top">
            <span className="macro-dot protein" />
            <span className="macro-value">{Math.round(totals.protein)}g</span>
          </div>
          <span className="macro-key">protein{settings.proteinGoal ? ` / ${settings.proteinGoal}g` : ''}</span>
          {macroPct(totals.protein, settings.proteinGoal) !== null && (
            <div className="macro-pill-track">
              <div className="macro-pill-fill protein" style={{ width: `${macroPct(totals.protein, settings.proteinGoal)}%` }} />
            </div>
          )}
        </div>
        <div className="macro-pill">
          <div className="macro-pill-top">
            <span className="macro-dot carbs" />
            <span className="macro-value">{Math.round(totals.carbs)}g</span>
          </div>
          <span className="macro-key">carbs{settings.carbsGoal ? ` / ${settings.carbsGoal}g` : ''}</span>
          {macroPct(totals.carbs, settings.carbsGoal) !== null && (
            <div className="macro-pill-track">
              <div className="macro-pill-fill carbs" style={{ width: `${macroPct(totals.carbs, settings.carbsGoal)}%` }} />
            </div>
          )}
        </div>
        <div className="macro-pill">
          <div className="macro-pill-top">
            <span className="macro-dot fat" />
            <span className="macro-value">{Math.round(totals.fat)}g</span>
          </div>
          <span className="macro-key">fat{settings.fatGoal ? ` / ${settings.fatGoal}g` : ''}</span>
          {macroPct(totals.fat, settings.fatGoal) !== null && (
            <div className="macro-pill-track">
              <div className="macro-pill-fill fat" style={{ width: `${macroPct(totals.fat, settings.fatGoal)}%` }} />
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

      <WeekSummary goal={settings.calorieGoal} refreshKey={refreshKey} />

      <footer className="app-footer">
        <p>Everything stays on this device — no account, no server, no cost.</p>
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
