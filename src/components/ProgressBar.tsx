interface Props {
  consumed: number;
  goal: number;
}

export default function ProgressBar({ consumed, goal }: Props) {
  const pct = goal > 0 ? Math.min(100, (consumed / goal) * 100) : 0;
  const remaining = goal - consumed;
  const over = remaining < 0;

  return (
    <div className="progress-card">
      <div className="progress-numbers">
        <div>
          <span className="big-number">{Math.round(consumed)}</span>
          <span className="label">consumed</span>
        </div>
        <div>
          <span className={`big-number ${over ? 'over' : 'under'}`}>
            {Math.abs(Math.round(remaining))}
          </span>
          <span className="label">{over ? 'over goal' : 'remaining'}</span>
        </div>
        <div>
          <span className="big-number">{goal}</span>
          <span className="label">goal</span>
        </div>
      </div>
      <div className="progress-track">
        <div
          className={`progress-fill ${over ? 'over' : ''}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
