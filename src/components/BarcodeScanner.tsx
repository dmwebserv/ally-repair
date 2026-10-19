import { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import type { IScannerControls } from '@zxing/browser';
import { IconX } from './icons';

interface Props {
  onDetected: (code: string) => void;
  onClose: () => void;
}

export default function BarcodeScanner({ onDetected, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const detectedRef = useRef(onDetected);
  useEffect(() => { detectedRef.current = onDetected; }, [onDetected]);

  useEffect(() => {
    let controls: IScannerControls | undefined;
    let cancelled = false;
    const reader = new BrowserMultiFormatReader();

    reader
      .decodeFromConstraints(
        { video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } } },
        videoRef.current ?? undefined,
        (result, _err, frameControls) => {
          if (cancelled || !result) return;
          frameControls.stop();
          detectedRef.current(result.getText());
        },
      )
      .then((c) => {
        if (cancelled) {
          c.stop();
        } else {
          controls = c;
          const video = videoRef.current;
          const track = video?.srcObject instanceof MediaStream ? video.srcObject.getVideoTracks()[0] : undefined;
          if (track) {
            const capabilities = track.getCapabilities() as MediaTrackCapabilities & { focusMode?: string[] };
            if (capabilities.focusMode?.includes('continuous')) {
              void track.applyConstraints({ advanced: [{ focusMode: 'continuous' } as MediaTrackConstraintSet] }).catch(() => {});
            }
          }
        }
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't access the camera. Check camera permissions and try again.");
      });

    return () => {
      cancelled = true;
      controls?.stop();
    };
  }, []);

  return (
    <div className="scanner-overlay">
      <video ref={videoRef} className="scanner-video" muted playsInline />
      <div className="scanner-frame" />
      <button type="button" className="scanner-close" onClick={onClose} aria-label="Cancel">
        <IconX />
      </button>
      <div className="scanner-hint">{error ?? 'Point the camera at a barcode'}</div>
    </div>
  );
}
