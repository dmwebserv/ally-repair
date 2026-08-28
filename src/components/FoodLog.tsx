import { useRef, useState } from 'react';
import type { FoodEntry } from '../lib/types';
import { IconTrash } from './icons';

interface Props {
  entries: FoodEntry[];
  onRemove: (entry: FoodEntry) => void;
  onEdit: (entry: FoodEntry) => void;
}

const SWIPE_THRESHOLD = 72;

function FoodEntryRow({ entry, onRemove, onEdit }: { entry: FoodEntry; onRemove: (e: FoodEntry) => void; onEdit: (e: FoodEntry) => void }) {
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

  const mult = entry.servings || 1;

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
            {Math.round(entry.calories * mult)} cal
            {entry.protein ? ` · ${Math.round(entry.protein * mult)}g P` : ''}
            {entry.carbs ? ` · ${Math.round(entry.carbs * mult)}g C` : ''}
            {entry.fat ? ` · ${Math.round(entry.fat * mult)}g F` : ''}
          </span>
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

export default function FoodLog({ entries, onRemove, onEdit }: Props) {
  if (entries.length === 0) {
    return (
      <div className="empty-state">
        <p>Nothing logged yet today.</p>
        <span>Scan, look up, or type in your first item above.</span>
      </div>
    );
  }

  return (
    <ul className="food-log">
      {entries.map((entry) => (
        <FoodEntryRow key={entry.id} entry={entry} onRemove={onRemove} onEdit={onEdit} />
      ))}
    </ul>
  );
}
