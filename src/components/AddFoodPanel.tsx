import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import type { FoodEntry } from '../lib/types';
import { scanNutritionLabel, type ScanStatus } from '../lib/ocr';
import { AI_SCAN_ENABLED, scanWithAI } from '../lib/aiScan';
import { lookupBarcode } from '../lib/barcode';
import { findFoodByBarcode, pinByEntry } from '../lib/favorites';
import { IconBarcode, IconCamera, IconKeyboard, IconTrash, IconX } from './icons';

const BarcodeScanner = lazy(() => import('./BarcodeScanner'));

interface Props {
  onAdd: (entry: FoodEntry, favorite: boolean) => void;
  editingEntry: FoodEntry | null;
  onSaveEdit: (entry: FoodEntry) => void;
  onDeleteEdit: (entry: FoodEntry) => void;
  onEditDone: () => void;
}

const emptyForm = {
  name: '',
  calories: '',
  protein: '',
  carbs: '',
  fat: '',
  servings: '1',
  grams: '',
  note: '',
};

export default function AddFoodPanel({ onAdd, editingEntry, onSaveEdit, onDeleteEdit, onEditDone }: Props) {
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [scanning, setScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState<ScanStatus | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanConfidence, setScanConfidence] = useState<number | null>(null);
  const [rawOcrText, setRawOcrText] = useState('');
  const [cropInset, setCropInset] = useState(0);
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [missingOcrFields, setMissingOcrFields] = useState<string[]>([]);
  const previewUrlRef = useRef<string | null>(null);
  const [estimated, setEstimated] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [barcodeMode, setBarcodeMode] = useState(false);
  const [barcodeNote, setBarcodeNote] = useState<string | null>(null);
  const [favorite, setFavorite] = useState(false);
  const [meal, setMeal] = useState('');
  const [pendingBarcode, setPendingBarcode] = useState('');
  const [perHundredGrams, setPerHundredGrams] = useState(false);
  const [editing, setEditing] = useState<FoodEntry | null>(null);
  const [dirty, setDirty] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      const id = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(id);
    }
  }, [open]);


  useEffect(() => () => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
  }, []);

  useEffect(() => {
    if (!editingEntry) return;
    setForm({
      name: editingEntry.name,
      calories: String(editingEntry.calories),
      protein: editingEntry.protein !== undefined ? String(editingEntry.protein) : '',
      carbs: editingEntry.carbs !== undefined ? String(editingEntry.carbs) : '',
      fat: editingEntry.fat !== undefined ? String(editingEntry.fat) : '',
      servings: String(editingEntry.servings || 1),
      grams: editingEntry.grams !== undefined ? String(editingEntry.grams) : '',
      note: editingEntry.note ?? '',
    });
    setImagePreview(null);
    setBarcodeNote(null);
    setScanError(null);
    setEstimated(false);
    setFavorite(false);
    setMeal(editingEntry.meal ?? '');
    setPendingBarcode(editingEntry.barcode ?? '');
    setPerHundredGrams(editingEntry.per100g ?? false);
    setEditing(editingEntry);
    setDirty(false);
    setOpen(true);
  }, [editingEntry]);

  const reset = () => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = null;
    setForm(emptyForm);
    setImagePreview(null);
    setBarcodeNote(null);
    setScanError(null);
    setScanConfidence(null);
    setRawOcrText('');
    setCropInset(0);
    setSourceFile(null);
    setMissingOcrFields([]);
    setScanStatus(null);
    setEstimated(false);
    setFavorite(false);
    setMeal('');
    setPendingBarcode('');
    setPerHundredGrams(false);
    setDirty(false);
  };

  const close = () => {
    if (dirty && !window.confirm('Discard these unsaved food details?')) return;
    setVisible(false);
    setTimeout(() => {
      setOpen(false);
      reset();
      if (editing) {
        setEditing(null);
        onEditDone();
      }
    }, 220);
  };

  const openManual = () => {
    reset();
    setDirty(false);
    setOpen(true);
    setTimeout(() => nameInputRef.current?.focus(), 260);
  };

  const openScanner = () => {
    photoInputRef.current?.click();
  };

  const applyParsed = (
    parsed: { calories?: number; protein?: number; carbs?: number; fat?: number },
    name?: string | null,
  ) => {
    setForm((f) => ({
      ...f,
      name: name ? name : f.name,
      calories: parsed.calories !== undefined ? String(parsed.calories) : f.calories,
      protein: parsed.protein !== undefined ? String(parsed.protein) : f.protein,
      carbs: parsed.carbs !== undefined ? String(parsed.carbs) : f.carbs,
      fat: parsed.fat !== undefined ? String(parsed.fat) : f.fat,
    }));
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    reset();
    setOpen(true);
    setSourceFile(file);
    previewUrlRef.current = URL.createObjectURL(file);
    setImagePreview(previewUrlRef.current);
    setScanning(true);

    if (AI_SCAN_ENABLED) {
      setScanStatus({ attempt: 1, totalAttempts: 1, pct: 0 });
      try {
        const { parsed, name, estimated: isEstimated } = await scanWithAI(file);
        if (parsed.calories === undefined && parsed.protein === undefined && parsed.carbs === undefined && parsed.fat === undefined) {
          setScanError("Couldn't find nutrition info in that photo. You can still fill it in below.");
        }
        setEstimated(isEstimated);
        applyParsed(parsed, name);
        setDirty(true);
      } catch {
        setScanError('AI scan failed, trying on-device scan…');
        try {
          const { parsed, confidence, rawText } = await scanNutritionLabel(file, setScanStatus);
          setScanConfidence(confidence);
          setRawOcrText(rawText);
          setMissingOcrFields(['calories','protein','carbs','fat'].filter((key) => parsed[key as keyof typeof parsed] === undefined));
          if (!parsed.calories && !parsed.protein && !parsed.carbs && !parsed.fat) {
            setScanError("Couldn't read this label. You can still fill it in below.");
          } else {
            setScanError(null);
          }
          applyParsed(parsed);
          setDirty(true);
        } catch {
          setScanError('Scan failed. You can still enter the values manually below.');
        }
      } finally {
        setScanning(false);
      }
      return;
    }

    try {
      const { parsed, confidence, rawText } = await scanNutritionLabel(file, setScanStatus);
      setScanConfidence(confidence);
      setRawOcrText(rawText);
      setMissingOcrFields(['calories','protein','carbs','fat'].filter((key) => parsed[key as keyof typeof parsed] === undefined));
      if (!parsed.calories && !parsed.protein && !parsed.carbs && !parsed.fat) {
        setScanError("Couldn't read this label. You can still fill it in below.");
      }
      applyParsed(parsed);
      setDirty(true);
    } catch {
      setScanError('Scan failed. You can still enter the values manually below.');
    } finally {
      setScanning(false);
    }
  };

  const scanCroppedImage = async () => {
    if (!sourceFile || cropInset === 0) return;
    const bitmap = await createImageBitmap(sourceFile);
    const insetX = Math.round(bitmap.width * cropInset / 100);
    const insetY = Math.round(bitmap.height * cropInset / 100);
    const width = Math.max(1, bitmap.width - insetX * 2);
    const height = Math.max(1, bitmap.height - insetY * 2);
    const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) { bitmap.close(); return; }
    context.drawImage(bitmap, insetX, insetY, width, height, 0, 0, width, height); bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', .92));
    if (blob) await handleFile(new File([blob], sourceFile.name || 'nutrition-label.jpg', { type: 'image/jpeg' }));
  };

  const handleBarcode = async (code: string) => {
    setBarcodeMode(false);
    reset();
    setOpen(true);
    setScanning(true);
    setBarcodeNote(`Barcode ${code}`);
    setPendingBarcode(code);
    const saved = findFoodByBarcode(code);
    if (saved) {
      applyParsed(saved, saved.name);
      setPerHundredGrams(saved.per100g ?? false);
      setForm((f) => ({ ...f, servings: String(saved.servings || 1), grams: saved.grams !== undefined ? String(saved.grams) : '' }));
      setBarcodeNote(`Saved product found: ${saved.name}`);
      setDirty(true);
      setScanning(false);
      return;
    }
    try {
      const result = await lookupBarcode(code);
      if (!result) {
        setScanError('Product not found. You can still enter it manually below.');
      } else {
        applyParsed(result.parsed, result.name);
        setDirty(true);
        setPerHundredGrams(result.perHundredGrams);
        if (result.perHundredGrams) {
          setForm((f) => ({ ...f, grams: '100' }));
          setScanError('Only per-100g values were available — check servings before saving.');
        }
      }
    } catch {
      setScanError('Lookup failed. You can still enter it manually below.');
    } finally {
      setScanning(false);
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const calories = parseFloat(form.calories);
    if (Number.isNaN(calories)) return;
    const base = {
      name: form.name.trim(),
      calories,
      protein: form.protein ? parseFloat(form.protein) : undefined,
      carbs: form.carbs ? parseFloat(form.carbs) : undefined,
      fat: form.fat ? parseFloat(form.fat) : undefined,
      servings: form.servings ? parseFloat(form.servings) || 1 : 1,
      grams: form.grams ? parseFloat(form.grams) : undefined,
      note: form.note.trim() || undefined,
      barcode: pendingBarcode || undefined,
      per100g: perHundredGrams || undefined,
      meal: meal ? meal as FoodEntry['meal'] : undefined,
    };

    setDirty(false);
    if (editing) {
      const entry: FoodEntry = { ...base, id: editing.id, loggedAt: editing.loggedAt };
      if (favorite) pinByEntry(entry);
      onSaveEdit(entry);
    } else {
      const entry: FoodEntry = { ...base, id: crypto.randomUUID(), loggedAt: new Date().toISOString() };
      onAdd(entry, favorite);
    }
    close();
  };

  const handleDelete = () => {
    if (!editing) return;
    onDeleteEdit(editing);
    setDirty(false);
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
          <IconCamera width={18} height={18} />
          Scan
        </button>
        <button type="button" className="add-food-btn secondary" onClick={() => setBarcodeMode(true)}>
          <IconBarcode width={18} height={18} />
          Barcode
        </button>
        <button type="button" className="add-food-btn secondary" onClick={openManual}>
          <IconKeyboard width={18} height={18} />
          Type in
        </button>
      </div>

      {barcodeMode && (
        <Suspense fallback={<div className="scanner-overlay" />}>
          <BarcodeScanner onDetected={handleBarcode} onClose={() => setBarcodeMode(false)} />
        </Suspense>
      )}

      {open && (
        <div className={`sheet-overlay ${visible ? 'visible' : ''}`} onClick={close}>
          <div className="sheet-panel" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-handle" />
            <div className="sheet-header">
              <h2>{editing ? 'Edit food' : 'Log food'}</h2>
              <button type="button" className="icon-btn subtle" onClick={close} aria-label="Close">
                <IconX />
              </button>
            </div>

            <div className="sheet-scroll">
              {(imagePreview || barcodeNote) && (
                <div className="photo-mode">
                  {imagePreview && <img src={imagePreview} alt="Nutrition label preview" className="photo-preview" style={{ clipPath: cropInset ? `inset(${cropInset}%)` : undefined }} />}
                  {barcodeNote && !imagePreview && <p className="scan-success">{barcodeNote}</p>}
                  {scanning && (
                    <div className="scan-status">
                      <span className="scan-spinner" />
                      {AI_SCAN_ENABLED || barcodeNote
                        ? 'Looking it up…'
                        : `Reading label${
                            scanStatus && scanStatus.totalAttempts > 1 && scanStatus.attempt > 1
                              ? ` (trying another angle, ${scanStatus.attempt}/${scanStatus.totalAttempts})…`
                              : `… ${scanStatus?.pct ?? 0}%`
                          }`}
                    </div>
                  )}
                  {!scanning && scanError && <p className="scan-error">{scanError}</p>}
                  {!scanning && !scanError && estimated && (
                    <p className="scan-estimated">~ estimated from photo — check the numbers below</p>
                  )}
                  {!scanning && !scanError && !estimated && imagePreview && (
                    <p className="scan-success">Found it — check the numbers below.</p>
                  )}
                  {!scanning && imagePreview && scanConfidence !== null && <p className="scan-confidence">Text recognition confidence: {Math.round(scanConfidence)}%. Please verify each number against the label.</p>}
                  {!scanning && missingOcrFields.length > 0 && <p className="scan-missing">Not detected: {missingOcrFields.join(', ')}. Check the label and fill in any missing values.</p>}
                  {!scanning && rawOcrText && <details className="ocr-details"><summary>View recognized label text</summary><pre>{rawOcrText}</pre></details>}
                  {!scanning && imagePreview && <div className="crop-tools"><label>Crop edges <input type="range" min="0" max="35" step="1" value={cropInset} onChange={(e) => setCropInset(Number(e.target.value))} /></label><span>{cropInset ? `Trim ${cropInset}% from each edge` : 'Use if the label fills only part of the photo'}</span><button type="button" className="entry-action" disabled={!cropInset} onClick={() => void scanCroppedImage()}>Crop & scan again</button></div>}
                </div>
              )}

              <form className="food-form" onSubmit={submit} onChange={() => setDirty(true)} id="food-form">
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
                      step="any"
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
                      step="any"
                      min={0}
                      value={form.servings}
                      onChange={(e) => setForm((f) => ({ ...f, servings: e.target.value }))}
                    />
                  </label>
                  <label>
                    Protein (g)
                    <input
                      type="number"
                      inputMode="decimal"
                      step="any"
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
                      step="any"
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
                      step="any"
                      min={0}
                      value={form.fat}
                      onChange={(e) => setForm((f) => ({ ...f, fat: e.target.value }))}
                    />
                  </label>
                </div>
                <label>Portion (g{perHundredGrams ? ' · values per 100 g' : ' · optional'})
                  <input type="number" inputMode="decimal" step="any" min={0} placeholder="e.g. 150" value={form.grams} onChange={(e) => setForm((f) => ({ ...f, grams: e.target.value }))} />
                </label>
                <label>Meal (optional)
                  <select value={meal} onChange={(e) => setMeal(e.target.value)}>
                    <option value="">No meal</option><option value="breakfast">Breakfast</option><option value="lunch">Lunch</option><option value="dinner">Dinner</option><option value="snack">Snack</option>
                  </select>
                </label>
                <label>Notes (optional)
                  <textarea rows={2} value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} placeholder="Add a note" />
                </label>
                <label className="favorite-toggle">
                  <input type="checkbox" checked={favorite} onChange={(e) => setFavorite(e.target.checked)} />
                  Save as favorite for quick-add
                </label>
                {!imagePreview && !barcodeNote && !editing && (
                  <button type="button" className="link-btn" onClick={openScanner}>
                    or scan a label / meal instead
                  </button>
                )}
              </form>
            </div>

            <div className="sheet-footer">
              {editing && (
                <button type="button" className="delete-entry-btn" onClick={handleDelete} aria-label="Delete entry">
                  <IconTrash width={16} height={16} />
                </button>
              )}
              <button type="submit" form="food-form" className="save-btn">
                {editing ? 'Save changes' : 'Add food'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
