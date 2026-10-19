import { useEffect, useMemo, useState } from 'react';
import type { FoodEntry } from '../lib/types';
import { listDayLogs } from '../lib/storage';
import { searchOpenFoodFacts, type CatalogFood } from '../lib/barcode';

interface Props {
  refreshKey: number;
  onAddHistory: (entry: FoodEntry) => void;
  onAddCatalog: (food: CatalogFood) => void;
}

export default function FoodSearch({ refreshKey, onAddHistory, onAddCatalog }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [source, setSource] = useState<'history' | 'catalog'>('history');
  const [catalog, setCatalog] = useState<CatalogFood[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const history = useMemo(() => {
    const q = query.trim().toLocaleLowerCase();
    if (q.length < 2) return [];
    return listDayLogs().flatMap((log) => log.entries.map((entry) => ({ entry, date: log.date })))
      .filter(({ entry }) => `${entry.name} ${entry.note ?? ''}`.toLocaleLowerCase().includes(q))
      .sort((a, b) => b.entry.loggedAt.localeCompare(a.entry.loggedAt)).slice(0, 30);
  }, [query, refreshKey]);

  useEffect(() => {
    if (source !== 'catalog' || query.trim().length < 2) { setCatalog([]); setLoading(false); setError(''); return; }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setLoading(true); setError('');
      searchOpenFoodFacts(query.trim(), controller.signal).then(setCatalog).catch(() => {
        if (controller.signal.aborted) return;
        setCatalog([]); setError(navigator.onLine ? 'Online product search is unavailable right now.' : 'Connect to the internet to search Open Food Facts.');
      }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    }, 350);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [query, source]);

  return <section className="food-search-card">
    <button type="button" className="food-search-heading" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
      <span><strong>Find a food</strong><small>Search your log or Open Food Facts</small></span><span aria-hidden="true">{open ? '−' : '+'}</span>
    </button>
    {open && <div className="food-search-content">
      <label className="food-search-label" htmlFor="food-search-query">Food name</label>
      <input id="food-search-query" className="food-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="e.g. porridge, chicken salad" />
      <div className="food-search-tabs" role="tablist" aria-label="Food search source">
        <button type="button" role="tab" aria-selected={source === 'history'} className={source === 'history' ? 'selected' : ''} onClick={() => setSource('history')}>My history</button>
        <button type="button" role="tab" aria-selected={source === 'catalog'} className={source === 'catalog' ? 'selected' : ''} onClick={() => setSource('catalog')}>Open Food Facts</button>
      </div>
      <p className="food-search-privacy">{source === 'history' ? 'Search stays on this device and includes your previous log entries.' : 'Your search text is sent to Open Food Facts. Results are community-submitted; check values before logging.'}</p>
      {query.trim().length < 2 ? <p className="food-search-empty">Type at least two characters to search.</p> : source === 'history' ? (
        history.length ? <ul className="food-search-results">{history.map(({ entry, date }, index) => <li key={`${date}-${entry.id}-${index}`}><div><strong>{entry.name || 'Unnamed food'}</strong><small>{date} · {Math.round(entry.calories * (entry.servings || 1) * (entry.per100g && entry.grams !== undefined ? entry.grams / 100 : 1))} kcal{entry.meal ? ` · ${entry.meal}` : ''}</small></div><button type="button" className="search-add-btn" onClick={() => onAddHistory(entry)}>Add to today</button></li>)}</ul> : <p className="food-search-empty">No matching foods in your log yet.</p>
      ) : loading ? <p className="food-search-empty" role="status">Searching Open Food Facts…</p> : error ? <p className="food-search-empty" role="status">{error}</p> : catalog.length ? <ul className="food-search-results">{catalog.map((food, index) => <li key={`${food.code ?? food.name}-${index}`}><div><strong>{food.name}</strong><small>{food.parsed.calories !== undefined ? `${Math.round(food.parsed.calories)} kcal` : 'Calories unavailable'} · per 100 g</small></div><button type="button" className="search-add-btn" onClick={() => onAddCatalog(food)}>Add to today</button></li>)}</ul> : <p className="food-search-empty">No matching products found.</p>}
    </div>}
  </section>;
}
