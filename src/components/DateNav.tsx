import { addDays, displayDate, todayKey } from '../lib/date';
import { IconChevronLeft, IconChevronRight } from './icons';

interface Props {
  date: string;
  onChange: (date: string) => void;
}

export default function DateNav({ date, onChange }: Props) {
  const isToday = date === todayKey();

  return (
    <div className="date-nav">
      <button
        type="button"
        className="icon-btn round"
        onClick={() => onChange(addDays(date, -1))}
        aria-label="Previous day"
      >
        <IconChevronLeft />
      </button>
      <div className="date-label">
        <strong>{displayDate(date)}</strong>
        {!isToday && (
          <button type="button" className="link-btn" onClick={() => onChange(todayKey())}>
            back to today
          </button>
        )}
      </div>
      <button
        type="button"
        className="icon-btn round"
        onClick={() => onChange(addDays(date, 1))}
        aria-label="Next day"
        disabled={isToday}
      >
        <IconChevronRight />
      </button>
    </div>
  );
}
