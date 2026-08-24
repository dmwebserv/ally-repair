export function formatDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function todayKey(): string {
  return formatDate(new Date());
}

export function addDays(dateKey: string, delta: number): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + delta);
  return formatDate(date);
}

export function displayDate(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const today = todayKey();
  const yesterday = addDays(today, -1);
  const tomorrow = addDays(today, 1);
  if (dateKey === today) return 'Today';
  if (dateKey === yesterday) return 'Yesterday';
  if (dateKey === tomorrow) return 'Tomorrow';
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}
