import type { FoodEntry } from '../lib/types';

interface Props {
  entries: FoodEntry[];
  onRemove: (id: string) => void;
}

export default function FoodLog({ entries, onRemove }: Props) {
  if (entries.length === 0) {
    return <p className="empty-state">Nothing logged yet today.</p>;
  }

  return (
    <ul className="food-log">
      {entries.map((entry) => {
        const mult = entry.servings || 1;
        return (
          <li key={entry.id} className="food-entry">
            <div className="food-entry-main">
              <span className="food-name">{entry.name || 'Unnamed food'}</span>
              <span className="food-meta">
                {entry.servings !== 1 ? `${entry.servings}× · ` : ''}
                {Math.round(entry.calories * mult)} cal
                {entry.protein ? ` · ${Math.round(entry.protein * mult)}g protein` : ''}
                {entry.carbs ? ` · ${Math.round(entry.carbs * mult)}g carbs` : ''}
                {entry.fat ? ` · ${Math.round(entry.fat * mult)}g fat` : ''}
              </span>
            </div>
            <button
              type="button"
              className="remove-btn"
              onClick={() => onRemove(entry.id)}
              aria-label={`Remove ${entry.name}`}
            >
              ×
            </button>
          </li>
        );
      })}
    </ul>
  );
}
