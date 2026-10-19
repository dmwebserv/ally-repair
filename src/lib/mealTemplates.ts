import type { FoodEntry, MealTemplate } from './types';
const KEY = 'nutrilog:meal-templates';
export function getMealTemplates(): MealTemplate[] {
  try { const value = JSON.parse(localStorage.getItem(KEY) ?? '[]'); return Array.isArray(value) ? value : []; } catch { return []; }
}
function save(items: MealTemplate[]): void { localStorage.setItem(KEY, JSON.stringify(items)); }
export function addMealTemplate(name: string, entries: FoodEntry[]): MealTemplate[] {
  const template: MealTemplate = { id: crypto.randomUUID(), name: name.trim(), entries: entries.map((entry) => ({ ...entry, id: crypto.randomUUID(), loggedAt: new Date().toISOString() })) };
  const all = [...getMealTemplates(), template]; save(all); return all;
}
export function removeMealTemplate(id: string): MealTemplate[] { const items = getMealTemplates().filter((item) => item.id !== id); save(items); return items; }
export function mergeMealTemplates(incoming: MealTemplate[]): number {
  const all = getMealTemplates(); let count = 0;
  incoming.forEach((item) => { if (!all.some((current) => current.name.trim().toLowerCase() === item.name.trim().toLowerCase())) { all.push(item); count++; } });
  if (count) save(all); return count;
}
