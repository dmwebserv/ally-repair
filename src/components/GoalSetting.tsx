import { useState } from 'react';
import type { UserSettings } from '../lib/types';
import { IconPencil, IconX } from './icons';

interface Props {
  settings: UserSettings;
  onSave: (settings: UserSettings) => void;
}

function toStr(v: number | undefined): string {
  return v !== undefined ? String(v) : '';
}

function toNum(v: string): number | undefined {
  return v ? parseFloat(v) : undefined;
}

export default function GoalSetting({ settings, onSave }: Props) {
  const [open, setOpen] = useState(false);
  const [calorieGoal, setCalorieGoal] = useState(String(settings.calorieGoal));
  const [proteinGoal, setProteinGoal] = useState(toStr(settings.proteinGoal));
  const [carbsGoal, setCarbsGoal] = useState(toStr(settings.carbsGoal));
  const [fatGoal, setFatGoal] = useState(toStr(settings.fatGoal));
  const [gymCalorieGoal, setGymCalorieGoal] = useState(toStr(settings.gymCalorieGoal));
  const [gymProteinGoal, setGymProteinGoal] = useState(toStr(settings.gymProteinGoal));
  const [gymCarbsGoal, setGymCarbsGoal] = useState(toStr(settings.gymCarbsGoal));
  const [gymFatGoal, setGymFatGoal] = useState(toStr(settings.gymFatGoal));

  const openSheet = () => {
    setCalorieGoal(String(settings.calorieGoal));
    setProteinGoal(toStr(settings.proteinGoal));
    setCarbsGoal(toStr(settings.carbsGoal));
    setFatGoal(toStr(settings.fatGoal));
    setGymCalorieGoal(toStr(settings.gymCalorieGoal));
    setGymProteinGoal(toStr(settings.gymProteinGoal));
    setGymCarbsGoal(toStr(settings.gymCarbsGoal));
    setGymFatGoal(toStr(settings.gymFatGoal));
    setOpen(true);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const calories = parseInt(calorieGoal, 10);
    if (Number.isNaN(calories) || calories <= 0) return;
    onSave({
      calorieGoal: calories,
      proteinGoal: toNum(proteinGoal),
      carbsGoal: toNum(carbsGoal),
      fatGoal: toNum(fatGoal),
      gymCalorieGoal: toNum(gymCalorieGoal),
      gymProteinGoal: toNum(gymProteinGoal),
      gymCarbsGoal: toNum(gymCarbsGoal),
      gymFatGoal: toNum(gymFatGoal),
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

              <div className="goals-divider">
                <span>🏋️ Gym day overrides</span>
                <span className="goals-divider-hint">leave blank to use the goal above</span>
              </div>
              <div className="form-grid">
                <label>
                  Calories
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    placeholder="same"
                    value={gymCalorieGoal}
                    onChange={(e) => setGymCalorieGoal(e.target.value)}
                  />
                </label>
                <label>
                  Protein (g)
                  <input
                    type="number"
                    inputMode="decimal"
                    step="any"
                    min={0}
                    placeholder="same"
                    value={gymProteinGoal}
                    onChange={(e) => setGymProteinGoal(e.target.value)}
                  />
                </label>
                <label>
                  Carbs (g)
                  <input
                    type="number"
                    inputMode="decimal"
                    step="any"
                    min={0}
                    placeholder="same"
                    value={gymCarbsGoal}
                    onChange={(e) => setGymCarbsGoal(e.target.value)}
                  />
                </label>
                <label>
                  Fat (g)
                  <input
                    type="number"
                    inputMode="decimal"
                    step="any"
                    min={0}
                    placeholder="same"
                    value={gymFatGoal}
                    onChange={(e) => setGymFatGoal(e.target.value)}
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
