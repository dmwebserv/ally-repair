import { addDays, displayDate, todayKey } from '../lib/date';
import { IconCalendar, IconChevronLeft, IconChevronRight } from './icons';

interface Props {
  date: string;
  onChange: (date: string) => void;
  onOpenCalendar: () => void;
}

export default function DateNav({ date, onChange, onOpenCalendar }: Props) {
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
        <button type="button" className="date-title-btn" onClick={onOpenCalendar} aria-label="Open calendar">
          <IconCalendar width={15} height={15} />
          <strong>{displayDate(date)}</strong>
        </button>
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
