import { useMemo, useState } from 'react';
import type { FoodEntry, FoodStat } from '../lib/types';
import { getQuickAddFoods, toFoodEntry } from '../lib/favorites';
import { IconPencil } from './icons';
import ManageFavorites from './ManageFavorites';

interface Props {
  refreshKey: number;
  onQuickAdd: (entry: FoodEntry) => void;
}

export default function FavoritesRow({ refreshKey, onQuickAdd }: Props) {
  const [manageOpen, setManageOpen] = useState(false);
  const [manageRefresh, setManageRefresh] = useState(0);
  const foods = useMemo(() => getQuickAddFoods(), [refreshKey, manageRefresh]); // eslint-disable-line react-hooks/exhaustive-deps

  if (foods.length === 0 && !manageOpen) return null;

  return (
    <div className="favorites-section">
      <div className="favorites-header">
        <h2 className="section-title">Quick add</h2>
        <button type="button" className="icon-btn subtle" onClick={() => setManageOpen(true)} aria-label="Manage favorites">
          <IconPencil width={15} height={15} />
        </button>
      </div>
      {foods.length > 0 && (
        <div className="favorites-row">
          {foods.map((stat: FoodStat) => (
            <button key={stat.id} type="button" className="favorite-chip" onClick={() => onQuickAdd(toFoodEntry(stat))}>
              <span className="favorite-chip-name">{stat.name}</span>
              <span className="favorite-chip-cal">{Math.round(stat.calories * (stat.servings || 1))} cal</span>
            </button>
          ))}
        </div>
      )}
      {manageOpen && (
        <ManageFavorites
          onClose={() => setManageOpen(false)}
          onChange={() => setManageRefresh((k) => k + 1)}
        />
      )}
    </div>
  );
}
