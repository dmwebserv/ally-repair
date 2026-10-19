import { useEffect, useState } from 'react';
import type { FoodEntry, MealTemplate } from '../lib/types';
import { addMealTemplate, getMealTemplates, removeMealTemplate } from '../lib/mealTemplates';

interface Props { entries: FoodEntry[]; onApply: (entries: FoodEntry[]) => void; }
export default function MealTemplates({ entries, onApply }: Props) {
  const [templates, setTemplates] = useState<MealTemplate[]>(getMealTemplates);
  const [meal, setMeal] = useState('breakfast');
  const [open, setOpen] = useState(false);
  useEffect(() => { setTemplates(getMealTemplates()); }, [open]);
  const saveCurrent = () => {
    const group = entries.filter((entry) => entry.meal === meal);
    if (!group.length) { window.alert(`There are no ${meal} entries to save.`); return; }
    const name = window.prompt(`Name this ${meal} template:`);
    if (!name?.trim()) return;
    setTemplates(addMealTemplate(name, group));
  };
  return <section className="templates-card">
    <div className="templates-head"><h2>Meal templates</h2><button type="button" className="link-btn" onClick={() => setOpen((value) => !value)}>{open ? 'Hide' : 'Show'}</button></div>
    {open && <><div className="template-save-row"><label>Save meal <select value={meal} onChange={(e) => setMeal(e.target.value)}><option>breakfast</option><option>lunch</option><option>dinner</option><option>snack</option></select></label><button type="button" className="entry-action" onClick={saveCurrent}>Save current meal</button></div>
    {templates.length ? <div className="template-list">{templates.map((template) => <div className="template-item" key={template.id}><button type="button" onClick={() => onApply(template.entries)}><strong>{template.name}</strong><small>{template.entries.length} foods</small></button><button type="button" className="entry-action" aria-label={`Delete ${template.name}`} onClick={() => setTemplates(removeMealTemplate(template.id))}>Remove</button></div>)}</div> : <p className="food-search-empty">Save a logged meal to make it quick to reuse.</p>}</>}
  </section>;
}
