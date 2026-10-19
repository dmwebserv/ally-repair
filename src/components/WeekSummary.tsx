import { addDays, todayKey } from '../lib/date';
import { dayTotals, effectiveGoals, getDayLog } from '../lib/storage';
import type { UserSettings } from '../lib/types';

interface Props {
  settings: UserSettings;
  refreshKey: number;
}

function weekdayLabel(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: 'short' });
}

export default function WeekSummary({ settings, refreshKey }: Props) {
  const today = todayKey();
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, -6 + i));

  const logged = days.map((day) => ({ day, log: getDayLog(day) })).filter(({ log }) => log.entries.length > 0);
  const avg = logged.length ? logged.reduce((acc, { log }) => { const totals = dayTotals(log); acc.cal += totals.calories; acc.p += totals.protein; acc.c += totals.carbs; acc.f += totals.fat; if (totals.calories <= effectiveGoals(settings, log.isGymDay).calorieGoal) acc.onTarget++; return acc; }, { cal: 0, p: 0, c: 0, f: 0, onTarget: 0 }) : null;

  return (
    <div className="week-summary" key={refreshKey}>
      <h2>Last 7 days</h2>
      <div className="week-bars">
        {days.map((day) => {
          const log = getDayLog(day);
          const totals = dayTotals(log);
          const goal = effectiveGoals(settings, log.isGymDay).calorieGoal;
          const pct = goal > 0 ? Math.min(100, (totals.calories / goal) * 100) : 0;
          const over = totals.calories > goal;
          return (
            <div className={`week-bar-col ${day === today ? 'is-today' : ''}`} key={day}>
              <div className="week-bar-track">
                <div
                  className={`week-bar-fill ${over ? 'over' : ''} ${log.isGymDay ? 'gym' : ''}`}
                  style={{ height: `${Math.max(pct, totals.calories > 0 ? 4 : 0)}%` }}
                  title={`${Math.round(totals.calories)} cal${log.isGymDay ? ' (gym day)' : ''}`}
                />
              </div>
              <span className="week-bar-label">{weekdayLabel(day)}</span>
            </div>
          );
        })}
      </div>
      {avg && <p className="week-macro-summary">Logged-day averages · {Math.round(avg.cal / logged.length)} kcal · Protein {Math.round(avg.p / logged.length)}g · Carbs {Math.round(avg.c / logged.length)}g · Fat {Math.round(avg.f / logged.length)}g <span>{avg.onTarget}/{logged.length} logged days at or under calorie goal</span></p>}
    </div>
  );
}
