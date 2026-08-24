import { addDays, todayKey } from '../lib/date';
import { dayTotals, getDayLog } from '../lib/storage';

interface Props {
  goal: number;
  refreshKey: number;
}

function weekdayLabel(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: 'short' });
}

export default function WeekSummary({ goal, refreshKey }: Props) {
  const today = todayKey();
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, -6 + i));

  return (
    <div className="week-summary" key={refreshKey}>
      <h2>Last 7 days</h2>
      <div className="week-bars">
        {days.map((day) => {
          const totals = dayTotals(getDayLog(day));
          const pct = goal > 0 ? Math.min(100, (totals.calories / goal) * 100) : 0;
          const over = totals.calories > goal;
          return (
            <div className="week-bar-col" key={day}>
              <div className="week-bar-track">
                <div
                  className={`week-bar-fill ${over ? 'over' : ''}`}
                  style={{ height: `${pct}%` }}
                  title={`${Math.round(totals.calories)} cal`}
                />
              </div>
              <span className="week-bar-label">{weekdayLabel(day)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
