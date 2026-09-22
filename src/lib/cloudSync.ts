import { buildBackup } from './backup';
import { ensureProfile } from './profile';

export const CLOUD_SYNC_ENABLED = Boolean(import.meta.env.VITE_SCAN_API_URL);

function backupUrl(profileId: string | null): string {
  const base = (import.meta.env.VITE_SCAN_API_URL ?? '').replace(/\/$/, '');
  const params = profileId ? `?profile=${encodeURIComponent(profileId)}` : '';
  return `${base}/backup${params}`;
}

function authHeaders(): Record<string, string> {
  return import.meta.env.VITE_SCAN_SECRET ? { 'X-App-Secret': import.meta.env.VITE_SCAN_SECRET } : {};
}

async function throwIfNotOk(res: Response, fallback: string): Promise<void> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `${fallback} (${res.status})`);
  }
}

export async function pushBackup(): Promise<void> {
  const profile = ensureProfile();
  const data = buildBackup();
  const res = await fetch(backupUrl(profile.id), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ data }),
  });
  await throwIfNotOk(res, 'Cloud sync failed');
}

export async function pullBackup(): Promise<string | null> {
  const profile = ensureProfile();
  const res = await fetch(backupUrl(profile.id), { headers: authHeaders() });
  await throwIfNotOk(res, 'Cloud fetch failed');
  const data = await res.json();
  return data.exists ? data.content : null;
}

/**
 * Reads the original single-file backup from before per-device profiles
 * existed. Used only for the one-time automatic migration on the owner's
 * device — never called with a profile attached, so it can never leak one
 * person's legacy data into another person's log.
 */
export async function pullLegacyBackup(): Promise<string | null> {
  const res = await fetch(backupUrl(null), { headers: authHeaders() });
  await throwIfNotOk(res, 'Cloud fetch failed');
  const data = await res.json();
  return data.exists ? data.content : null;
}
