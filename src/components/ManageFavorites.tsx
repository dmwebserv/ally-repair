import { useState } from 'react';
import type { FoodStat } from '../lib/types';
import { addManualFavorite, deleteFoodStat, getFoodStats, pinFood, updateFoodStat } from '../lib/favorites';
import { IconCheck, IconPencil, IconPlus, IconTrash, IconX } from './icons';

interface Props {
  onClose: () => void;
  onChange: () => void;
}

interface EditForm {
  name: string;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
  servings: string;
}

function statToForm(s: FoodStat): EditForm {
  return {
    name: s.name,
    calories: String(s.calories),
    protein: s.protein !== undefined ? String(s.protein) : '',
    carbs: s.carbs !== undefined ? String(s.carbs) : '',
    fat: s.fat !== undefined ? String(s.fat) : '',
    servings: String(s.servings || 1),
  };
}

const emptyForm: EditForm = { name: '', calories: '', protein: '', carbs: '', fat: '', servings: '1' };

function EditRow({ form, setForm, onSave, onCancel }: { form: EditForm; setForm: (f: EditForm) => void; onSave: () => void; onCancel: () => void }) {
  return (
    <div className="favorite-edit-row">
      <input
        className="favorite-edit-name"
        placeholder="Food name"
        value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value })}
      />
      <div className="favorite-edit-grid">
        <input type="number" inputMode="decimal" step="any" placeholder="cal" value={form.calories} onChange={(e) => setForm({ ...form, calories: e.target.value })} />
        <input type="number" inputMode="decimal" step="any" placeholder="P" value={form.protein} onChange={(e) => setForm({ ...form, protein: e.target.value })} />
        <input type="number" inputMode="decimal" step="any" placeholder="C" value={form.carbs} onChange={(e) => setForm({ ...form, carbs: e.target.value })} />
        <input type="number" inputMode="decimal" step="any" placeholder="F" value={form.fat} onChange={(e) => setForm({ ...form, fat: e.target.value })} />
        <input type="number" inputMode="decimal" step="any" min={0} placeholder="srv" value={form.servings} onChange={(e) => setForm({ ...form, servings: e.target.value })} />
      </div>
      <div className="favorite-edit-actions">
        <button type="button" className="icon-btn confirm" onClick={onSave} aria-label="Save">
          <IconCheck width={15} height={15} />
        </button>
        <button type="button" className="icon-btn" onClick={onCancel} aria-label="Cancel">
          <IconX width={15} height={15} />
        </button>
      </div>
    </div>
  );
}

export default function ManageFavorites({ onClose, onChange }: Props) {
  const [stats, setStats] = useState<FoodStat[]>(() => getFoodStats());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditForm>(emptyForm);
  const [adding, setAdding] = useState(false);
  const [addForm, setAddForm] = useState<EditForm>(emptyForm);

  const sorted = [...stats].sort((a, b) => (a.pinned === b.pinned ? b.useCount - a.useCount : a.pinned ? -1 : 1));

  const refresh = () => {
    setStats(getFoodStats());
    onChange();
  };

  const startEdit = (s: FoodStat) => {
    setEditingId(s.id);
    setEditForm(statToForm(s));
  };

  const saveEdit = (id: string) => {
    const calories = parseFloat(editForm.calories);
    if (!editForm.name.trim() || Number.isNaN(calories)) return;
    updateFoodStat({
      id,
      name: editForm.name.trim(),
      calories,
      protein: editForm.protein ? parseFloat(editForm.protein) : undefined,
      carbs: editForm.carbs ? parseFloat(editForm.carbs) : undefined,
      fat: editForm.fat ? parseFloat(editForm.fat) : undefined,
      servings: parseFloat(editForm.servings) || 1,
      useCount: stats.find((s) => s.id === id)?.useCount ?? 0,
      lastUsedAt: stats.find((s) => s.id === id)?.lastUsedAt ?? new Date().toISOString(),
      pinned: stats.find((s) => s.id === id)?.pinned ?? true,
    });
    setEditingId(null);
    refresh();
  };

  const saveNew = () => {
    const calories = parseFloat(addForm.calories);
    if (!addForm.name.trim() || Number.isNaN(calories)) return;
    addManualFavorite({
      name: addForm.name.trim(),
      calories,
      protein: addForm.protein ? parseFloat(addForm.protein) : undefined,
      carbs: addForm.carbs ? parseFloat(addForm.carbs) : undefined,
      fat: addForm.fat ? parseFloat(addForm.fat) : undefined,
      servings: parseFloat(addForm.servings) || 1,
    });
    setAddForm(emptyForm);
    setAdding(false);
    refresh();
  };

  return (
    <div className="sheet-overlay visible" onClick={onClose}>
      <div className="sheet-panel" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />
        <div className="sheet-header">
          <h2>Manage favorites</h2>
          <button type="button" className="icon-btn subtle" onClick={onClose} aria-label="Close">
            <IconX />
          </button>
        </div>

        <div className="sheet-scroll">
          {!adding ? (
            <button type="button" className="favorite-add-btn" onClick={() => setAdding(true)}>
              <IconPlus width={16} height={16} />
              Add a favorite manually
            </button>
          ) : (
            <EditRow form={addForm} setForm={setAddForm} onSave={saveNew} onCancel={() => setAdding(false)} />
          )}

          {sorted.length === 0 && !adding && (
            <p className="empty-state-text">
              No favorites yet. Foods you log 3 or more times show up here automatically, or add one manually above.
            </p>
          )}

          <ul className="favorite-list">
            {sorted.map((s) =>
              editingId === s.id ? (
                <li key={s.id}>
                  <EditRow form={editForm} setForm={setEditForm} onSave={() => saveEdit(s.id)} onCancel={() => setEditingId(null)} />
                </li>
              ) : (
                <li key={s.id} className="favorite-list-item">
                  <div className="food-entry-main">
                    <span className="food-name">
                      {s.name}
                      {s.pinned && <span className="favorite-pinned-badge">pinned</span>}
                    </span>
                    <span className="food-meta">
                      {Math.round(s.calories)} cal
                      {s.protein ? ` · ${Math.round(s.protein)}g P` : ''}
                      {s.carbs ? ` · ${Math.round(s.carbs)}g C` : ''}
                      {s.fat ? ` · ${Math.round(s.fat)}g F` : ''}
                      {!s.pinned ? ` · used ${s.useCount}×` : ''}
                    </span>
                  </div>
                  <div className="favorite-list-actions">
                    {!s.pinned && (
                      <button type="button" className="icon-btn subtle" onClick={() => { pinFood(s.id, true); refresh(); }} aria-label="Pin">
                        <IconPlus width={15} height={15} />
                      </button>
                    )}
                    <button type="button" className="icon-btn subtle" onClick={() => startEdit(s)} aria-label="Edit">
                      <IconPencil width={15} height={15} />
                    </button>
                    <button type="button" className="icon-btn subtle" onClick={() => { deleteFoodStat(s.id); refresh(); }} aria-label="Delete">
                      <IconTrash width={15} height={15} />
                    </button>
                  </div>
                </li>
              ),
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
