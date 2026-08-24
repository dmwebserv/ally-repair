import type { FoodEntry } from '../lib/types';
import { IconTrash } from './icons';

interface Props {
  entries: FoodEntry[];
  onRemove: (id: string) => void;
}

export default function FoodLog({ entries, onRemove }: Props) {
  if (entries.length === 0) {
    return (
      <div className="empty-state">
        <p>Nothing logged yet today.</p>
        <span>Tap "Log food" to add your first item.</span>
      </div>
    );
  }

  return (
    <ul className="food-log">
      {entries.map((entry) => {
        const mult = entry.servings || 1;
        return (
          <li key={entry.id} className="food-entry">
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
              onClick={() => onRemove(entry.id)}
              aria-label={`Remove ${entry.name}`}
            >
              <IconTrash width={17} height={17} />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
