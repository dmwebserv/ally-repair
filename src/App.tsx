import { useEffect, useMemo, useState } from 'react';
import './App.css';
import AddFoodPanel from './components/AddFoodPanel';
import CalorieRing from './components/CalorieRing';
import DateNav from './components/DateNav';
import FoodLog from './components/FoodLog';
import GoalSetting from './components/GoalSetting';
import WeekSummary from './components/WeekSummary';
import { todayKey } from './lib/date';
import { addEntry, dayTotals, getDayLog, getSettings, removeEntry, saveSettings } from './lib/storage';
import type { FoodEntry } from './lib/types';

function App() {
  const [date, setDate] = useState(todayKey());
  const [settings, setSettings] = useState(getSettings());
  const [log, setLog] = useState(getDayLog(date));
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    setLog(getDayLog(date));
  }, [date]);

  const totals = useMemo(() => dayTotals(log), [log]);

  const handleAdd = (entry: FoodEntry) => {
    const updated = addEntry(date, entry);
    setLog(updated);
    setRefreshKey((k) => k + 1);
  };

  const handleRemove = (id: string) => {
    const updated = removeEntry(date, id);
    setLog(updated);
    setRefreshKey((k) => k + 1);
  };

  const handleGoalSave = (goal: number) => {
    const updated = { ...settings, calorieGoal: goal };
    setSettings(updated);
    saveSettings(updated);
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          <span className="brand-mark" />
          <h1>NutriLog</h1>
        </div>
        <GoalSetting goal={settings.calorieGoal} onSave={handleGoalSave} />
      </header>

      <DateNav date={date} onChange={setDate} />

      <CalorieRing consumed={totals.calories} goal={settings.calorieGoal} />

      <div className="macro-row">
        <div className="macro-pill">
          <span className="macro-dot protein" />
          <span className="macro-value">{Math.round(totals.protein)}g</span>
          <span className="macro-key">protein</span>
        </div>
        <div className="macro-pill">
          <span className="macro-dot carbs" />
          <span className="macro-value">{Math.round(totals.carbs)}g</span>
          <span className="macro-key">carbs</span>
        </div>
        <div className="macro-pill">
          <span className="macro-dot fat" />
          <span className="macro-value">{Math.round(totals.fat)}g</span>
          <span className="macro-key">fat</span>
        </div>
      </div>

      <AddFoodPanel onAdd={handleAdd} />

      <section className="log-section">
        <h2 className="section-title">Today's log</h2>
        <FoodLog entries={log.entries} onRemove={handleRemove} />
      </section>

      <WeekSummary goal={settings.calorieGoal} refreshKey={refreshKey} />

      <footer className="app-footer">
        <p>Everything stays on this device — no account, no server, no cost.</p>
      </footer>
    </div>
  );
}

export default App;
