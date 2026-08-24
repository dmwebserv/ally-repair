import { useEffect, useRef, useState } from 'react';
import type { FoodEntry } from '../lib/types';
import { parseNutritionLabel, recognizeText } from '../lib/ocr';
import { IconCamera, IconImage, IconPlus, IconX } from './icons';

interface Props {
  onAdd: (entry: FoodEntry) => void;
}

type Mode = 'manual' | 'photo';

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
  const [mode, setMode] = useState<Mode>('manual');
  const [form, setForm] = useState(emptyForm);
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanError, setScanError] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const libraryInputRef = useRef<HTMLInputElement>(null);

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
    setScanProgress(0);
    setMode('manual');
  };

  const close = () => {
    setVisible(false);
    setTimeout(() => {
      setOpen(false);
      reset();
    }, 220);
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setScanError(null);
    setImagePreview(URL.createObjectURL(file));
    setScanning(true);
    setScanProgress(0);
    try {
      const text = await recognizeText(file, setScanProgress);
      const parsed = parseNutritionLabel(text);
      if (!parsed.calories && !parsed.protein && !parsed.carbs && !parsed.fat) {
        setScanError("Couldn't find nutrition numbers in that photo. Try a clearer shot, or enter it manually.");
      }
      setForm((f) => ({
        ...f,
        calories: parsed.calories !== undefined ? String(parsed.calories) : f.calories,
        protein: parsed.protein !== undefined ? String(parsed.protein) : f.protein,
        carbs: parsed.carbs !== undefined ? String(parsed.carbs) : f.carbs,
        fat: parsed.fat !== undefined ? String(parsed.fat) : f.fat,
      }));
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

  if (!open) {
    return (
      <button type="button" className="add-food-toggle" onClick={() => setOpen(true)}>
        <IconPlus width={18} height={18} />
        Log food
      </button>
    );
  }

  return (
    <div className={`sheet-overlay ${visible ? 'visible' : ''}`} onClick={close}>
      <div className="sheet-panel" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />
        <div className="sheet-header">
          <h2>Log food</h2>
          <button type="button" className="icon-btn subtle" onClick={close} aria-label="Close">
            <IconX />
          </button>
        </div>

        <div className="tab-row">
          <button
            type="button"
            className={mode === 'manual' ? 'tab active' : 'tab'}
            onClick={() => setMode('manual')}
          >
            Type it in
          </button>
          <button
            type="button"
            className={mode === 'photo' ? 'tab active' : 'tab'}
            onClick={() => setMode('photo')}
          >
            Photo of label
          </button>
        </div>

        <div className="sheet-scroll">
          {mode === 'photo' && (
            <div className="photo-mode">
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => handleFile(e.target.files?.[0])}
                style={{ display: 'none' }}
              />
              <input
                ref={libraryInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => handleFile(e.target.files?.[0])}
                style={{ display: 'none' }}
              />
              <div className="photo-source-row">
                <button type="button" className="photo-source-btn" onClick={() => cameraInputRef.current?.click()}>
                  <IconCamera width={22} height={22} />
                  Take photo
                </button>
                <button type="button" className="photo-source-btn" onClick={() => libraryInputRef.current?.click()}>
                  <IconImage width={22} height={22} />
                  Choose photo
                </button>
              </div>
              {imagePreview && <img src={imagePreview} alt="Nutrition label preview" className="photo-preview" />}
              {scanning && (
                <div className="scan-status">
                  <span className="scan-spinner" />
                  Reading label… {scanProgress}%
                </div>
              )}
              {scanError && <p className="scan-error">{scanError}</p>}
              {!scanning && (form.calories || form.protein || form.carbs || form.fat) && (
                <p className="scan-success">Found numbers below — check them before saving.</p>
              )}
            </div>
          )}

          <form className="food-form" onSubmit={submit} id="food-form">
            <label>
              Food name
              <input
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
          </form>
        </div>

        <div className="sheet-footer">
          <button type="submit" form="food-form" className="save-btn">
            Add to today
          </button>
        </div>
      </div>
    </div>
  );
}
