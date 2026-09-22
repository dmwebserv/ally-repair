import { hasAnyLogs } from './storage';

const PROFILE_KEY = 'nutrilog:profile';

/**
 * Identifies this device/browser install. Each install gets its own id, so
 * cloud backups stay separate per person — sharing the app link with a
 * friend can never mix their data with yours.
 */
export interface DeviceProfile {
  id: string;
  name: string;
  /**
   * Captured once, at the moment the profile is created: did this device
   * already hold logs? Only true for installs that predate profiles (i.e.
   * the original owner's device), which is what makes the one-time legacy
   * cloud-backup migration safe to run automatically.
   */
  needsLegacyMerge: boolean;
  createdAt: string;
}

function randomId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }
}

export function getProfile(): DeviceProfile | null {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<DeviceProfile>;
    if (!parsed || typeof parsed.id !== 'string' || !parsed.id) return null;
    return {
      id: parsed.id,
      name: typeof parsed.name === 'string' && parsed.name ? parsed.name : 'My log',
      needsLegacyMerge: Boolean(parsed.needsLegacyMerge),
      createdAt: typeof parsed.createdAt === 'string' ? parsed.createdAt : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

/** Returns the existing profile, creating (and persisting) one on first run. Idempotent. */
export function ensureProfile(): DeviceProfile {
  const existing = getProfile();
  if (existing) return existing;
  const profile: DeviceProfile = {
    id: randomId(),
    name: 'My log',
    needsLegacyMerge: hasAnyLogs(),
    createdAt: new Date().toISOString(),
  };
  saveProfile(profile);
  return profile;
}

export function saveProfile(profile: DeviceProfile): void {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export function clearLegacyMergeFlag(): DeviceProfile {
  const profile = ensureProfile();
  if (profile.needsLegacyMerge) {
    profile.needsLegacyMerge = false;
    saveProfile(profile);
  }
  return profile;
}

/** Short human-friendly rendering of a profile id, e.g. `a1b2…c3d4`. */
export function shortId(id: string): string {
  return id.length > 9 ? `${id.slice(0, 4)}…${id.slice(-4)}` : id;
}
