import { useRef, useState } from 'react';
import { downloadBackup, importBackup } from '../lib/backup';
import { IconCloudDown, IconUpload, IconX } from './icons';

interface Props {
  onClose: () => void;
  onImported: () => void;
}

export default function BackupPanel({ onClose, onImported }: Props) {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    downloadBackup();
    setError(null);
    setMessage('Backup file downloaded.');
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setMessage(null);
    try {
      const text = await file.text();
      const result = importBackup(text);
      if (result.entriesAdded === 0 && result.favoritesAdded === 0) {
        setMessage('Nothing new to import — this data is already here.');
      } else {
        setMessage(
          `Added ${result.entriesAdded} entr${result.entriesAdded === 1 ? 'y' : 'ies'} across ${result.daysAffected} day${result.daysAffected === 1 ? '' : 's'}${result.favoritesAdded ? `, plus ${result.favoritesAdded} favorite${result.favoritesAdded === 1 ? '' : 's'}` : ''}.`,
        );
        onImported();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import failed.');
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
          <p className="backup-explainer">
            Your data lives only on this device. Download a backup now and then, or if you ever switch phones or
            browsers, use it to bring everything across. Importing only adds — it never deletes or overwrites
            anything already here, so it's safe to import the same file twice.
          </p>

          <button type="button" className="favorite-add-btn" onClick={handleExport}>
            <IconCloudDown width={17} height={17} />
            Download backup
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

          {message && <p className="scan-success">{message}</p>}
          {error && <p className="scan-error">{error}</p>}
        </div>
      </div>
    </div>
  );
}
