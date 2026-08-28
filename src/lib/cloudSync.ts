import { buildBackup } from './backup';

export const CLOUD_SYNC_ENABLED = Boolean(import.meta.env.VITE_SCAN_API_URL);

function backupUrl(): string {
  const base = (import.meta.env.VITE_SCAN_API_URL ?? '').replace(/\/$/, '');
  return `${base}/backup`;
}

function authHeaders(): Record<string, string> {
  return import.meta.env.VITE_SCAN_SECRET ? { 'X-App-Secret': import.meta.env.VITE_SCAN_SECRET } : {};
}

export async function pushBackup(): Promise<void> {
  const data = buildBackup();
  const res = await fetch(backupUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ data }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Cloud sync failed (${res.status})`);
  }
}

export async function pullBackup(): Promise<string | null> {
  const res = await fetch(backupUrl(), { headers: authHeaders() });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Cloud fetch failed (${res.status})`);
  }
  const data = await res.json();
  return data.exists ? data.content : null;
}
