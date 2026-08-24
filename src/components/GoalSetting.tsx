import { useState } from 'react';
import { IconCheck, IconPencil, IconX } from './icons';

interface Props {
  goal: number;
  onSave: (goal: number) => void;
}

export default function GoalSetting({ goal, onSave }: Props) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(goal));

  if (!editing) {
    return (
      <button
        type="button"
        className="goal-edit-trigger"
        onClick={() => {
          setValue(String(goal));
          setEditing(true);
        }}
      >
        <IconPencil width={14} height={14} />
        Goal
      </button>
    );
  }

  const submit = () => {
    const num = parseInt(value, 10);
    if (!Number.isNaN(num) && num > 0) {
      onSave(num);
    }
    setEditing(false);
  };

  return (
    <form
      className="goal-form"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <input
        id="goal-input"
        type="number"
        min={1}
        inputMode="numeric"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        autoFocus
      />
      <button type="submit" className="icon-btn confirm" aria-label="Save goal">
        <IconCheck width={16} height={16} />
      </button>
      <button type="button" className="icon-btn" onClick={() => setEditing(false)} aria-label="Cancel">
        <IconX width={16} height={16} />
      </button>
    </form>
  );
}
