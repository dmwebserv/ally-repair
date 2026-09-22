import { useMemo, useState } from 'react';
import { formatDate, todayKey } from '../lib/date';
import { dayTotals, effectiveGoals, listDayLogs } from '../lib/storage';
import type { DayLog, UserSettings } from '../lib/types';
import { IconChevronLeft, IconChevronRight, IconX } from './icons';

interface Props {
  settings: UserSettings;
  selected: string;
  refreshKey: number;
  onSelect: (date: string) => void;
  onClose: () => void;
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** Monday-first grid cells for a month: date keys, padded with nulls to full weeks. */
function monthCells(year: number, month: number): (string | null)[] {
  const leadBlanks = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (string | null)[] = [];
  for (let i = 0; i < leadBlanks; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(formatDate(new Date(year, month, d)));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export default function CalendarView({ settings, selected, refreshKey, onSelect, onClose }: Props) {
  const [selYear, selMonth] = selected.split('-').map(Number);
  const [viewYear, setViewYear] = useState(selYear);
  const [viewMonth, setViewMonth] = useState(selMonth - 1);
  const today = todayKey();
  const [thisYear, thisMonth] = today.split('-').map(Number);
  const atCurrentMonth = viewYear === thisYear && viewMonth === thisMonth - 1;

  const logsByDate = useMemo(() => {
    const map = new Map<string, DayLog>();
    for (const log of listDayLogs()) map.set(log.date, log);
    // refreshKey invalidates the memo whenever entries change
    void refreshKey;
    return map;
  }, [refreshKey]);

  const cells = monthCells(viewYear, viewMonth);
  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });

  const shiftMonth = (delta: number) => {
    const next = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  };

  let daysLogged = 0;
  let calSum = 0;
  let underGoal = 0;
  for (const cell of cells) {
    if (!cell || cell > today) continue;
    const log = logsByDate.get(cell);
    if (!log || log.entries.length === 0) continue;
    const total = dayTotals(log).calories;
    daysLogged += 1;
    calSum += total;
    if (total <= effectiveGoals(settings, log.isGymDay).calorieGoal) underGoal += 1;
  }

  return (
    <div className="sheet-overlay visible" onClick={onClose}>
      <div className="sheet-panel" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />
        <div className="sheet-header">
          <h2>History</h2>
          <button type="button" className="icon-btn subtle" onClick={onClose} aria-label="Close">
            <IconX />
          </button>
        </div>

        <div className="sheet-scroll cal-scroll">
          <div className="cal-nav">
            <button
              type="button"
              className="icon-btn round"
              onClick={() => shiftMonth(-1)}
              aria-label="Previous month"
            >
              <IconChevronLeft />
            </button>
            <div className="cal-month">
              <strong>{monthLabel}</strong>
              {!atCurrentMonth && (
                <button
                  type="button"
                  className="link-btn"
                  onClick={() => {
                    setViewYear(thisYear);
                    setViewMonth(thisMonth - 1);
                  }}
                >
                  back to this month
                </button>
              )}
            </div>
            <button
              type="button"
              className="icon-btn round"
              onClick={() => shiftMonth(1)}
              aria-label="Next month"
              disabled={atCurrentMonth}
            >
              <IconChevronRight />
            </button>
          </div>

          <div className="cal-grid cal-weekdays">
            {WEEKDAYS.map((d) => (
              <span key={d} className="cal-weekday">
                {d}
              </span>
            ))}
          </div>

          <div className="cal-grid">
            {cells.map((cell, i) => {
              if (!cell) return <span key={`blank-${i}`} className="cal-day blank" />;
              const isFuture = cell > today;
              const log = logsByDate.get(cell);
              const hasData = !!log && log.entries.length > 0;
              const calories = hasData ? dayTotals(log!).calories : 0;
              const over = hasData && calories > effectiveGoals(settings, log!.isGymDay).calorieGoal;
              const classNames = [
                'cal-day',
                hasData ? 'has-data' : '',
                over ? 'over' : '',
                cell === today ? 'is-today' : '',
                cell === selected ? 'is-selected' : '',
              ]
                .filter(Boolean)
                .join(' ');
              return (
                <button
                  key={cell}
                  type="button"
                  className={classNames}
                  disabled={isFuture}
                  onClick={() => onSelect(cell)}
                  aria-label={`${cell}${hasData ? `, ${Math.round(calories)} calories` : ''}`}
                >
                  <span className="cal-day-num">{Number(cell.slice(8))}</span>
                  {hasData ? (
                    <span className="cal-day-cal">{Math.round(calories)}</span>
                  ) : (
                    <span className="cal-day-cal empty">·</span>
                  )}
                  {log?.isGymDay && <span className="cal-gym-dot" />}
                </button>
              );
            })}
          </div>

          <p className="cal-summary">
            {daysLogged === 0
              ? 'No logs this month yet.'
              : `${daysLogged} day${daysLogged === 1 ? '' : 's'} logged · avg ${Math.round(
                  calSum / daysLogged,
                ).toLocaleString()} cal · ${underGoal} under goal`}
          </p>
          <p className="backup-explainer backup-note">Tap any day to open it.</p>
        </div>
      </div>
    </div>
  );
}
