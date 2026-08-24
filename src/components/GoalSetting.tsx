import { useState } from 'react';

interface Props {
  goal: number;
  onSave: (goal: number) => void;
}

export default function GoalSetting({ goal, onSave }: Props) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(goal));

  if (!editing) {
    return (
      <button type="button" className="link-btn" onClick={() => { setValue(String(goal)); setEditing(true); }}>
        edit daily goal
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
      <label htmlFor="goal-input">Daily calorie goal</label>
      <input
        id="goal-input"
        type="number"
        min={1}
        inputMode="numeric"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        autoFocus
      />
      <button type="submit">Save</button>
      <button type="button" className="link-btn" onClick={() => setEditing(false)}>
        cancel
      </button>
    </form>
  );
}
