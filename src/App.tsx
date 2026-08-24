import { useEffect, useMemo, useState } from 'react';
import './App.css';
import AddFoodPanel from './components/AddFoodPanel';
import DateNav from './components/DateNav';
import FoodLog from './components/FoodLog';
import GoalSetting from './components/GoalSetting';
import ProgressBar from './components/ProgressBar';
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
        <h1>NutriLog</h1>
        <GoalSetting goal={settings.calorieGoal} onSave={handleGoalSave} />
      </header>

      <DateNav date={date} onChange={setDate} />

      <ProgressBar consumed={totals.calories} goal={settings.calorieGoal} />

      <div className="macro-row">
        <span>{Math.round(totals.protein)}g protein</span>
        <span>{Math.round(totals.carbs)}g carbs</span>
        <span>{Math.round(totals.fat)}g fat</span>
      </div>

      <AddFoodPanel onAdd={handleAdd} />

      <FoodLog entries={log.entries} onRemove={handleRemove} />

      <WeekSummary goal={settings.calorieGoal} refreshKey={refreshKey} />

      <footer className="app-footer">
        <p>Everything stays on this device — no account, no server, no cost.</p>
      </footer>
    </div>
  );
}

export default App;
