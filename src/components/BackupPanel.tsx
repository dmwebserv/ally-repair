import { useRef, useState } from 'react';
import type { SyncStatus } from '../App';
import { downloadBackup, importBackup } from '../lib/backup';
import { CLOUD_SYNC_ENABLED, pullBackup } from '../lib/cloudSync';
import { saveProfile, shortId, type DeviceProfile } from '../lib/profile';
import { IconCloudDown, IconUpload, IconX } from './icons';

interface Props {
  onClose: () => void;
  onImported: () => void;
  syncStatus: SyncStatus;
  onSyncNow: () => void;
  profile: DeviceProfile;
  onProfileChange: (profile: DeviceProfile) => void;
}

const SYNC_LABEL: Record<SyncStatus, string> = {
  idle: 'Not synced yet',
  syncing: 'Syncing…',
  synced: 'Synced to GitHub',
  error: "Sync failed — tap 'Sync now' to retry",
};

export default function BackupPanel({
  onClose,
  onImported,
  syncStatus,
  onSyncNow,
  profile,
  onProfileChange,
}: Props) {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cloudLoading, setCloudLoading] = useState(false);
  const [name, setName] = useState(profile.name);
  const [code, setCode] = useState('');
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    downloadBackup();
    setError(null);
    setMessage('Backup file downloaded.');
  };

  const applyImport = (text: string) => {
    const result = importBackup(text);
    if (!result.changed) {
      setMessage('Nothing new to import — this data is already here.');
    } else {
      const parts: string[] = [];
      if (result.entriesAdded > 0) {
        parts.push(
          `${result.entriesAdded} entr${result.entriesAdded === 1 ? 'y' : 'ies'} across ${result.daysAffected} day${result.daysAffected === 1 ? '' : 's'}`,
        );
      }
      if (result.favoritesAdded > 0) {
        parts.push(`${result.favoritesAdded} favorite${result.favoritesAdded === 1 ? '' : 's'}`);
      }
      setMessage(parts.length > 0 ? `Added ${parts.join(', plus ')}.` : 'Restored.');
      onImported();
    }
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setMessage(null);
    try {
      applyImport(await file.text());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import failed.');
    }
  };

  const handleRestoreFromCloud = async () => {
    setError(null);
    setMessage(null);
    setCloudLoading(true);
    try {
      const content = await pullBackup();
      if (!content) {
        setMessage('No cloud backup found yet — nothing to restore.');
      } else {
        applyImport(content);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not reach the cloud backup.');
    } finally {
      setCloudLoading(false);
    }
  };

  const handleSaveName = () => {
    const trimmed = name.trim() || 'My log';
    if (trimmed === profile.name) {
      setName(trimmed);
      return;
    }
    const updated = { ...profile, name: trimmed };
    saveProfile(updated);
    onProfileChange(updated);
    setName(trimmed);
    setError(null);
    setMessage('Profile name saved.');
  };

  const handleCopyCode = async () => {
    setError(null);
    try {
      await navigator.clipboard.writeText(profile.id);
      setCopied(true);
      setMessage('Sync code copied — paste it on your other device to link it.');
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Could not copy automatically — the full code is in any backup file you download.');
    }
  };

  const handleAdoptCode = async () => {
    const id = code.trim();
    setError(null);
    setMessage(null);
    if (!/^[A-Za-z0-9-]{8,64}$/.test(id)) {
      setError('That code doesn’t look right — check it and try again.');
      return;
    }
    if (id === profile.id) {
      setMessage('This device is already linked to that sync code.');
      return;
    }
    const updated = { ...profile, id, needsLegacyMerge: false };
    saveProfile(updated);
    onProfileChange(updated);
    setCode('');
    setCloudLoading(true);
    try {
      const content = await pullBackup();
      if (!content) {
        setMessage(
          'Device linked. No cloud data under that code yet — your next change will back up to it.',
        );
      } else {
        applyImport(content);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Device linked, but the cloud backup could not be reached.');
    } finally {
      setCloudLoading(false);
    }
  };

  return (
    <div className="sheet-overlay visible" onClick={onClose}>
      <div className="sheet-panel" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />
        <div className="sheet-header">
          <h2>Backup & restore</h2>
          <button type="button" className="icon-btn subtle" onClick={onClose} aria-label="Close">
            <IconX />
          </button>
        </div>

        <div className="sheet-scroll backup-scroll">
          <div className="profile-card">
            <label className="profile-name-field">
              <span className="profile-label">This device</span>
              <input
                type="text"
                value={name}
                maxLength={24}
                onChange={(e) => setName(e.target.value)}
                onBlur={handleSaveName}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                }}
              />
            </label>
            {CLOUD_SYNC_ENABLED && (
              <>
                <div className="profile-row">
                  <span className="profile-label">Sync code</span>
                  <button type="button" className="sync-code-btn" onClick={handleCopyCode}>
                    {shortId(profile.id)} · {copied ? 'copied!' : 'copy'}
                  </button>
                </div>
                <div className="profile-row">
                  <input
                    className="sync-code-input"
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="Paste a sync code…"
                    autoCapitalize="off"
                    autoCorrect="off"
                    spellCheck={false}
                  />
                  <button
                    type="button"
                    className="link-btn"
                    onClick={handleAdoptCode}
                    disabled={cloudLoading || !code.trim()}
                  >
                    {cloudLoading ? 'Linking…' : 'Link device'}
                  </button>
                </div>
                <p className="backup-explainer backup-note">
                  Each device backs up to its own private file, so sharing the app never mixes data. To use a
                  second phone, paste this device's sync code there.
                </p>
              </>
            )}
          </div>

          {CLOUD_SYNC_ENABLED ? (
            <>
              <div className={`sync-status-row sync-${syncStatus}`}>
                <span className="sync-dot" />
                <span>{SYNC_LABEL[syncStatus]}</span>
                <button type="button" className="link-btn" onClick={onSyncNow}>
                  Sync now
                </button>
              </div>
              <p className="backup-explainer">
                Every change backs up automatically to this device's own private file in your GitHub repo, a few
                seconds after you make it — so clearing your browser's cache or switching devices can't lose it.
                Restoring from the cloud pulls that back down and merges it in; it never overwrites or deletes
                what's already here.
              </p>
              <button
                type="button"
                className="favorite-add-btn"
                onClick={handleRestoreFromCloud}
                disabled={cloudLoading}
              >
                <IconCloudDown width={17} height={17} />
                {cloudLoading ? 'Checking…' : 'Restore from cloud'}
              </button>
            </>
          ) : (
            <p className="backup-explainer">
              Your data lives only on this device. Download a backup now and then, or if you ever switch phones or
              browsers, use it to bring everything across.
            </p>
          )}

          <button type="button" className="favorite-add-btn" onClick={handleExport}>
            <IconCloudDown width={17} height={17} />
            Download backup file
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            onChange={(e) => {
              handleFile(e.target.files?.[0]);
              e.target.value = '';
            }}
            style={{ display: 'none' }}
          />
          <button type="button" className="favorite-add-btn" onClick={() => fileInputRef.current?.click()}>
            <IconUpload width={17} height={17} />
            Restore from a backup file
          </button>

          <p className="backup-explainer backup-note">
            Importing (from cloud or a file) only ever adds — it's always safe to do more than once.
          </p>

          {message && <p className="scan-success">{message}</p>}
          {error && <p className="scan-error">{error}</p>}
        </div>
      </div>
    </div>
  );
}
