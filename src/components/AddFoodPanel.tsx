import { useEffect, useRef, useState } from 'react';
import type { FoodEntry } from '../lib/types';
import { scanNutritionLabel, type ScanStatus } from '../lib/ocr';
import { AI_SCAN_ENABLED, scanWithAI } from '../lib/aiScan';
import { IconCamera, IconKeyboard, IconX } from './icons';

interface Props {
  onAdd: (entry: FoodEntry) => void;
}

const emptyForm = {
  name: '',
  calories: '',
  protein: '',
  carbs: '',
  fat: '',
  servings: '1',
};

export default function AddFoodPanel({ onAdd }: Props) {
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [scanning, setScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState<ScanStatus | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      const id = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(id);
    }
  }, [open]);

  const reset = () => {
    setForm(emptyForm);
    setImagePreview(null);
    setScanError(null);
    setScanStatus(null);
  };

  const close = () => {
    setVisible(false);
    setTimeout(() => {
      setOpen(false);
      reset();
    }, 220);
  };

  const openManual = () => {
    reset();
    setOpen(true);
    setTimeout(() => nameInputRef.current?.focus(), 260);
  };

  const openScanner = () => {
    photoInputRef.current?.click();
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    reset();
    setOpen(true);
    setImagePreview(URL.createObjectURL(file));
    setScanning(true);

    const applyParsed = (parsed: { calories?: number; protein?: number; carbs?: number; fat?: number }, name?: string | null) => {
      setForm((f) => ({
        ...f,
        name: name ? name : f.name,
        calories: parsed.calories !== undefined ? String(parsed.calories) : f.calories,
        protein: parsed.protein !== undefined ? String(parsed.protein) : f.protein,
        carbs: parsed.carbs !== undefined ? String(parsed.carbs) : f.carbs,
        fat: parsed.fat !== undefined ? String(parsed.fat) : f.fat,
      }));
    };

    if (AI_SCAN_ENABLED) {
      setScanStatus({ attempt: 1, totalAttempts: 1, pct: 0 });
      try {
        const { parsed, name } = await scanWithAI(file);
        if (parsed.calories === undefined && parsed.protein === undefined && parsed.carbs === undefined && parsed.fat === undefined) {
          setScanError("Couldn't find nutrition info in that photo. You can still fill it in below.");
        }
        applyParsed(parsed, name);
      } catch {
        setScanError('AI scan failed, trying on-device scan…');
        try {
          const { parsed } = await scanNutritionLabel(file, setScanStatus);
          if (!parsed.calories && !parsed.protein && !parsed.carbs && !parsed.fat) {
            setScanError("Couldn't read this label. You can still fill it in below.");
          } else {
            setScanError(null);
          }
          applyParsed(parsed);
        } catch {
          setScanError('Scan failed. You can still enter the values manually below.');
        }
      } finally {
        setScanning(false);
      }
      return;
    }

    try {
      const { parsed } = await scanNutritionLabel(file, setScanStatus);
      if (!parsed.calories && !parsed.protein && !parsed.carbs && !parsed.fat) {
        setScanError("Couldn't read this label. You can still fill it in below.");
      }
      applyParsed(parsed);
    } catch {
      setScanError('Scan failed. You can still enter the values manually below.');
    } finally {
      setScanning(false);
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const calories = parseFloat(form.calories);
    if (Number.isNaN(calories)) return;
    const entry: FoodEntry = {
      id: crypto.randomUUID(),
      name: form.name.trim(),
      calories,
      protein: form.protein ? parseFloat(form.protein) : undefined,
      carbs: form.carbs ? parseFloat(form.carbs) : undefined,
      fat: form.fat ? parseFloat(form.fat) : undefined,
      servings: form.servings ? parseFloat(form.servings) || 1 : 1,
      loggedAt: new Date().toISOString(),
    };
    onAdd(entry);
    close();
  };

  return (
    <>
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => {
          handleFile(e.target.files?.[0]);
          e.target.value = '';
        }}
        style={{ display: 'none' }}
      />

      <div className="add-food-row">
        <button type="button" className="add-food-btn primary" onClick={openScanner}>
          <IconCamera width={19} height={19} />
          Scan label
        </button>
        <button type="button" className="add-food-btn secondary" onClick={openManual}>
          <IconKeyboard width={19} height={19} />
          Type it in
        </button>
      </div>

      {open && (
        <div className={`sheet-overlay ${visible ? 'visible' : ''}`} onClick={close}>
          <div className="sheet-panel" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-handle" />
            <div className="sheet-header">
              <h2>Log food</h2>
              <button type="button" className="icon-btn subtle" onClick={close} aria-label="Close">
                <IconX />
              </button>
            </div>

            <div className="sheet-scroll">
              {imagePreview && (
                <div className="photo-mode">
                  <img src={imagePreview} alt="Nutrition label" className="photo-preview" />
                  {scanning && (
                    <div className="scan-status">
                      <span className="scan-spinner" />
                      {AI_SCAN_ENABLED
                        ? 'Reading label…'
                        : `Reading label${
                            scanStatus && scanStatus.totalAttempts > 1 && scanStatus.attempt > 1
                              ? ` (trying another angle, ${scanStatus.attempt}/${scanStatus.totalAttempts})…`
                              : `… ${scanStatus?.pct ?? 0}%`
                          }`}
                    </div>
                  )}
                  {!scanning && scanError && <p className="scan-error">{scanError}</p>}
                  {!scanning && !scanError && <p className="scan-success">Found it — check the numbers below.</p>}
                </div>
              )}

              <form className="food-form" onSubmit={submit} id="food-form">
                <label>
                  Food name
                  <input
                    ref={nameInputRef}
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. Greek yogurt"
                  />
                </label>
                <div className="form-grid">
                  <label>
                    Calories
                    <input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      required
                      value={form.calories}
                      onChange={(e) => setForm((f) => ({ ...f, calories: e.target.value }))}
                    />
                  </label>
                  <label>
                    Servings
                    <input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step="0.25"
                      value={form.servings}
                      onChange={(e) => setForm((f) => ({ ...f, servings: e.target.value }))}
                    />
                  </label>
                  <label>
                    Protein (g)
                    <input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      value={form.protein}
                      onChange={(e) => setForm((f) => ({ ...f, protein: e.target.value }))}
                    />
                  </label>
                  <label>
                    Carbs (g)
                    <input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      value={form.carbs}
                      onChange={(e) => setForm((f) => ({ ...f, carbs: e.target.value }))}
                    />
                  </label>
                  <label>
                    Fat (g)
                    <input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      value={form.fat}
                      onChange={(e) => setForm((f) => ({ ...f, fat: e.target.value }))}
                    />
                  </label>
                </div>
                {!imagePreview && (
                  <button type="button" className="link-btn" onClick={openScanner}>
                    or scan a label instead
                  </button>
                )}
              </form>
            </div>

            <div className="sheet-footer">
              <button type="submit" form="food-form" className="save-btn">
                Add to today
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
