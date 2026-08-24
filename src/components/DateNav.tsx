import { addDays, displayDate, todayKey } from '../lib/date';

interface Props {
  date: string;
  onChange: (date: string) => void;
}

export default function DateNav({ date, onChange }: Props) {
  return (
    <div className="date-nav">
      <button type="button" onClick={() => onChange(addDays(date, -1))} aria-label="Previous day">
        ‹
      </button>
      <div className="date-label">
        <strong>{displayDate(date)}</strong>
        {date !== todayKey() && (
          <button type="button" className="link-btn" onClick={() => onChange(todayKey())}>
            back to today
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={() => onChange(addDays(date, 1))}
        aria-label="Next day"
        disabled={date === todayKey()}
      >
        ›
      </button>
    </div>
  );
}
