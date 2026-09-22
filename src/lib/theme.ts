/** Per-device accent colour presets. Stored under THEME_KEY in localStorage —
 *  deliberately a separate key that backup/export code never reads, so a
 *  device's colour choice never lands in (or clobbers anything inside) a backup. */

export interface ThemePreset {
  id: string;
  label: string;
  /** Light-mode accent (also the swatch colour). */
  light: string;
  /** Dark-mode accent. */
  dark: string;
}

export const THEME_KEY = 'nutrilog:theme';
export const DEFAULT_THEME = 'green';

export const THEME_PRESETS: ThemePreset[] = [
  { id: 'green', label: 'Green', light: '#059669', dark: '#34d399' },
  { id: 'blue', label: 'Blue', light: '#2563eb', dark: '#60a5fa' },
  { id: 'purple', label: 'Purple', light: '#7c3aed', dark: '#a78bfa' },
  { id: 'orange', label: 'Orange', light: '#ea580c', dark: '#fb923c' },
  { id: 'pink', label: 'Pink', light: '#db2777', dark: '#f472b6' },
];

export function isThemeId(id: string | null | undefined): id is string {
  return THEME_PRESETS.some((p) => p.id === id);
}

export function getPreset(id: string): ThemePreset {
  return THEME_PRESETS.find((p) => p.id === id) ?? THEME_PRESETS[0];
}

export function getTheme(): string {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    return isThemeId(stored) ? stored : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

/** Applies the theme immediately: data-theme attribute + theme-color meta tint. */
export function applyTheme(id: string): void {
  const root = document.documentElement;
  if (id === DEFAULT_THEME) root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', id);

  const preset = getPreset(id);
  const dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? preset.dark : preset.light);
}

/** Persists for this device and applies right away. Never touches backup data. */
export function setTheme(id: string): void {
  if (!isThemeId(id)) return;
  try {
    localStorage.setItem(THEME_KEY, id);
  } catch {
    // Private mode etc. — still apply for this session.
  }
  applyTheme(id);
}
