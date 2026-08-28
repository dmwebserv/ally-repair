import { useRef, useState } from 'react';
import type { SyncStatus } from '../App';
import { downloadBackup, importBackup } from '../lib/backup';
import { CLOUD_SYNC_ENABLED, pullBackup } from '../lib/cloudSync';
import { IconCloudDown, IconUpload, IconX } from './icons';

interface Props {
  onClose: () => void;
  onImported: () => void;
  syncStatus: SyncStatus;
  onSyncNow: () => void;
}

const SYNC_LABEL: Record<SyncStatus, string> = {
  idle: 'Not synced yet',
  syncing: 'Syncing…',
  synced: 'Synced to GitHub',
  error: "Sync failed — tap 'Sync now' to retry",
};

export default function BackupPanel({ onClose, onImported, syncStatus, onSyncNow }: Props) {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cloudLoading, setCloudLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    downloadBackup();
    setError(null);
    setMessage('Backup file downloaded.');
  };

  const applyImport = (text: string) => {
    const result = importBackup(text);
    if (result.entriesAdded === 0 && result.favoritesAdded === 0) {
      setMessage('Nothing new to import — this data is already here.');
    } else {
      setMessage(
        `Added ${result.entriesAdded} entr${result.entriesAdded === 1 ? 'y' : 'ies'} across ${result.daysAffected} day${result.daysAffected === 1 ? '' : 's'}${result.favoritesAdded ? `, plus ${result.favoritesAdded} favorite${result.favoritesAdded === 1 ? '' : 's'}` : ''}.`,
      );
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
                Every change backs up automatically to a private file in your GitHub repo, a few seconds after you
                make it — so clearing your browser's cache or switching devices can't lose it. Restoring from the
                cloud pulls that back down and merges it in; it never overwrites or deletes what's already here.
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
