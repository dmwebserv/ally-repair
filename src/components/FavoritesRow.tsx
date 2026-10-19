import { useMemo, useState } from 'react';
import type { FoodEntry, FoodStat } from '../lib/types';
import { getFoodStats, getQuickAddFoods, toFoodEntry } from '../lib/favorites';
import { IconPencil } from './icons';
import ManageFavorites from './ManageFavorites';

interface Props {
  refreshKey: number;
  onQuickAdd: (entry: FoodEntry) => void;
}

export default function FavoritesRow({ refreshKey, onQuickAdd }: Props) {
  const [manageOpen, setManageOpen] = useState(false);
  const [manageRefresh, setManageRefresh] = useState(0);
  const [query, setQuery] = useState('');
  const foods = useMemo(() => getQuickAddFoods(), [refreshKey, manageRefresh]); // eslint-disable-line react-hooks/exhaustive-deps
  const allFoods = useMemo(() => getFoodStats(), [refreshKey, manageRefresh]);
  const recent = useMemo(() => [...allFoods].filter((food) => food.useCount > 0).sort((a, b) => b.lastUsedAt.localeCompare(a.lastUsedAt)).slice(0, 6), [allFoods]);
  const results = useMemo(() => query.trim() ? allFoods.filter((food) => food.name.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 12) : [], [allFoods, query]);

  if (allFoods.length === 0 && !manageOpen) return null;
  const renderChip = (stat: FoodStat) => <button key={stat.id} type="button" className="favorite-chip" onClick={() => onQuickAdd(toFoodEntry(stat))}><span className="favorite-chip-name">{stat.name}</span><span className="favorite-chip-cal">{Math.round(stat.calories * (stat.servings || 1) * (stat.per100g && stat.grams !== undefined ? stat.grams / 100 : 1))} cal</span></button>;

  return (
    <div className="favorites-section">
      <div className="favorites-header">
        <h2 className="section-title">Food library</h2>
        <button type="button" className="icon-btn subtle" onClick={() => setManageOpen(true)} aria-label="Manage favorites"><IconPencil width={15} height={15} /></button>
      </div>
      <input className="food-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search saved foods" aria-label="Search saved foods" />
      {query.trim() ? <div className="favorites-row">{results.length ? results.map(renderChip) : <span className="food-search-empty">No saved foods match that search.</span>}</div> : <>
        {foods.length > 0 && <><h3 className="mini-section-title">Quick add</h3><div className="favorites-row">{foods.map(renderChip)}</div></>}
        {recent.length > 0 && <><h3 className="mini-section-title">Recently logged</h3><div className="favorites-row">{recent.map(renderChip)}</div></>}
      </>}
      {manageOpen && <ManageFavorites onClose={() => setManageOpen(false)} onChange={() => setManageRefresh((k) => k + 1)} />}
    </div>
  );
}
