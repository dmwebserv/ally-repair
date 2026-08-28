import { useState } from 'react';
import type { UserSettings } from '../lib/types';
import { IconPencil, IconX } from './icons';

interface Props {
  settings: UserSettings;
  onSave: (settings: UserSettings) => void;
}

export default function GoalSetting({ settings, onSave }: Props) {
  const [open, setOpen] = useState(false);
  const [calorieGoal, setCalorieGoal] = useState(String(settings.calorieGoal));
  const [proteinGoal, setProteinGoal] = useState(settings.proteinGoal !== undefined ? String(settings.proteinGoal) : '');
  const [carbsGoal, setCarbsGoal] = useState(settings.carbsGoal !== undefined ? String(settings.carbsGoal) : '');
  const [fatGoal, setFatGoal] = useState(settings.fatGoal !== undefined ? String(settings.fatGoal) : '');

  const openSheet = () => {
    setCalorieGoal(String(settings.calorieGoal));
    setProteinGoal(settings.proteinGoal !== undefined ? String(settings.proteinGoal) : '');
    setCarbsGoal(settings.carbsGoal !== undefined ? String(settings.carbsGoal) : '');
    setFatGoal(settings.fatGoal !== undefined ? String(settings.fatGoal) : '');
    setOpen(true);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const calories = parseInt(calorieGoal, 10);
    if (Number.isNaN(calories) || calories <= 0) return;
    onSave({
      calorieGoal: calories,
      proteinGoal: proteinGoal ? parseFloat(proteinGoal) : undefined,
      carbsGoal: carbsGoal ? parseFloat(carbsGoal) : undefined,
      fatGoal: fatGoal ? parseFloat(fatGoal) : undefined,
    });
    setOpen(false);
  };

  return (
    <>
      <button type="button" className="goal-edit-trigger" onClick={openSheet}>
        <IconPencil width={14} height={14} />
        Goals
      </button>

      {open && (
        <div className="sheet-overlay visible" onClick={() => setOpen(false)}>
          <div className="sheet-panel" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-handle" />
            <div className="sheet-header">
              <h2>Daily goals</h2>
              <button type="button" className="icon-btn subtle" onClick={() => setOpen(false)} aria-label="Close">
                <IconX />
              </button>
            </div>
            <form className="food-form goals-form" onSubmit={submit}>
              <label>
                Calories
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  required
                  value={calorieGoal}
                  onChange={(e) => setCalorieGoal(e.target.value)}
                  autoFocus
                />
              </label>
              <div className="form-grid">
                <label>
                  Protein (g)
                  <input
                    type="number"
                    inputMode="decimal"
                    step="any"
                    min={0}
                    placeholder="optional"
                    value={proteinGoal}
                    onChange={(e) => setProteinGoal(e.target.value)}
                  />
                </label>
                <label>
                  Carbs (g)
                  <input
                    type="number"
                    inputMode="decimal"
                    step="any"
                    min={0}
                    placeholder="optional"
                    value={carbsGoal}
                    onChange={(e) => setCarbsGoal(e.target.value)}
                  />
                </label>
                <label>
                  Fat (g)
                  <input
                    type="number"
                    inputMode="decimal"
                    step="any"
                    min={0}
                    placeholder="optional"
                    value={fatGoal}
                    onChange={(e) => setFatGoal(e.target.value)}
                  />
                </label>
              </div>
              <button type="submit" className="save-btn">
                Save goals
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
