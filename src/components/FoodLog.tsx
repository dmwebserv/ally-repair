import { useMemo, useRef, useState } from 'react';
import type { FoodEntry } from '../lib/types';
import { IconTrash } from './icons';

interface Props {
  entries: FoodEntry[];
  onRemove: (entry: FoodEntry) => void;
  onEdit: (entry: FoodEntry) => void;
  onDuplicate: (entry: FoodEntry) => void;
  onMove: (entry: FoodEntry, date: string) => void;
  onAddToToday: (entry: FoodEntry) => void;
  isViewingToday: boolean;
}

const SWIPE_THRESHOLD = 72;

function FoodEntryRow({ entry, onRemove, onEdit, onDuplicate, onMove, onAddToToday, isViewingToday }: { entry: FoodEntry; onRemove: (e: FoodEntry) => void; onEdit: (e: FoodEntry) => void; onDuplicate: (e: FoodEntry) => void; onMove: (e: FoodEntry, date: string) => void; onAddToToday: (e: FoodEntry) => void; isViewingToday: boolean }) {
  const [dragX, setDragXState] = useState(0);
  const [dragging, setDraggingState] = useState(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const axisLocked = useRef<'x' | 'y' | null>(null);
  const draggingRef = useRef(false);
  const dragXRef = useRef(0);

  const setDragging = (v: boolean) => {
    draggingRef.current = v;
    setDraggingState(v);
  };

  const setDragX = (v: number) => {
    dragXRef.current = v;
    setDragXState(v);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    startX.current = e.clientX;
    startY.current = e.clientY;
    axisLocked.current = null;
    setDragging(true);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    const dx = e.clientX - startX.current;
    const dy = e.clientY - startY.current;

    if (!axisLocked.current) {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
      axisLocked.current = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
    }
    if (axisLocked.current === 'y') return;

    setDragX(Math.min(0, dx));
  };

  const endDrag = () => {
    setDragging(false);
    if (dragXRef.current < -SWIPE_THRESHOLD) {
      onRemove(entry);
    } else {
      setDragX(0);
    }
    axisLocked.current = null;
  };

  const mult = (entry.servings || 1) * (entry.per100g && entry.grams !== undefined ? entry.grams / 100 : 1);

  return (
    <li className="food-entry-wrap">
      <div className="food-entry-delete-bg">
        <IconTrash width={18} height={18} />
      </div>
      <div
        className="food-entry"
        style={{ transform: `translateX(${dragX}px)`, transition: dragging ? 'none' : 'transform 0.2s ease' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onClick={() => {
          if (Math.abs(dragX) < 4) onEdit(entry);
        }}
      >
        <div className="food-entry-avatar">{(entry.name || '?').slice(0, 1).toUpperCase()}</div>
        <div className="food-entry-main">
          <span className="food-name">{entry.name || 'Unnamed food'}</span>
          <span className="food-meta">
            {entry.servings !== 1 ? `${entry.servings}× · ` : ''}
            {entry.meal ? `${entry.meal} · ` : ''}
            {new Date(entry.loggedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} · {Math.round(entry.calories * mult)} cal
            {entry.protein ? ` · ${Math.round(entry.protein * mult)}g P` : ''}
            {entry.carbs ? ` · ${Math.round(entry.carbs * mult)}g C` : ''}
            {entry.fat ? ` · ${Math.round(entry.fat * mult)}g F` : ''}{entry.grams ? ` · ${entry.grams}g` : ''}{entry.note ? ` · ${entry.note}` : ''}
          </span>
        </div>
        <div className="food-entry-actions">
          {!isViewingToday && <button type="button" className="entry-action add-today-action" onClick={(e) => { e.stopPropagation(); onAddToToday(entry); }}>Add to today</button>}
          <button type="button" className="entry-action" onClick={(e) => { e.stopPropagation(); onDuplicate(entry); }}>Duplicate</button>
          <button type="button" className="entry-action" onClick={(e) => { e.stopPropagation(); const target = window.prompt('Move to date (YYYY-MM-DD):'); if (target) onMove(entry, target); }}>Move</button>
        </div>
        <button
          type="button"
          className="icon-btn subtle"
          onClick={(e) => {
            e.stopPropagation();
            onRemove(entry);
          }}
          aria-label={`Remove ${entry.name}`}
        >
          <IconTrash width={17} height={17} />
        </button>
      </div>
    </li>
  );
}

export default function FoodLog({ entries, onRemove, onEdit, onDuplicate, onMove, onAddToToday, isViewingToday }: Props) {
  const [mealFilter, setMealFilter] = useState('all');
  const [timeSort, setTimeSort] = useState(false);
  const visible = useMemo(() => {
    const filtered = entries.filter((entry) => mealFilter === 'all' || (entry.meal ?? 'unassigned') === mealFilter);
    return timeSort ? [...filtered].sort((a, b) => a.loggedAt.localeCompare(b.loggedAt)) : filtered;
  }, [entries, mealFilter, timeSort]);
  if (entries.length === 0) {
    return <div className="empty-state"><p>Nothing logged yet today.</p><span>Scan, look up, or type in your first item above.</span></div>;
  }
  const meals = ['all', 'breakfast', 'lunch', 'dinner', 'snack', 'unassigned'];
  return (
    <>
      <div className="log-toolbar">
        <label>Meal filter <select value={mealFilter} onChange={(e) => setMealFilter(e.target.value)}>{meals.map((meal) => <option key={meal} value={meal}>{meal === 'all' ? 'All meals' : meal === 'unassigned' ? 'No meal' : meal[0].toUpperCase() + meal.slice(1)}</option>)}</select></label>
        <button type="button" className="link-btn" onClick={() => setTimeSort((sort) => !sort)}>{timeSort ? 'Recent order' : 'Sort by time'}</button>
      </div>
      {visible.length === 0 ? <div className="empty-state"><p>No foods in this meal yet.</p></div> : <ul className="food-log">{visible.map((entry) => <FoodEntryRow key={entry.id} entry={entry} onRemove={onRemove} onEdit={onEdit} onDuplicate={onDuplicate} onMove={onMove} onAddToToday={onAddToToday} isViewingToday={isViewingToday} />)}</ul>}
      <div className="meal-summary-grid">
        {(['breakfast', 'lunch', 'dinner', 'snack'] as const).map((meal) => {
          const group = entries.filter((entry) => entry.meal === meal);
          if (!group.length) return null;
          const total = group.reduce((acc, entry) => { const n = (entry.servings || 1) * (entry.per100g && entry.grams !== undefined ? entry.grams / 100 : 1); acc.cal += entry.calories * n; acc.p += (entry.protein || 0) * n; acc.c += (entry.carbs || 0) * n; acc.f += (entry.fat || 0) * n; return acc; }, { cal: 0, p: 0, c: 0, f: 0 });
          return <div className="meal-summary" key={meal}><strong>{meal[0].toUpperCase() + meal.slice(1)}</strong><span>{Math.round(total.cal)} kcal · P {Math.round(total.p)}g · C {Math.round(total.c)}g · F {Math.round(total.f)}g</span></div>;
        })}
      </div>
    </>
  );
}
