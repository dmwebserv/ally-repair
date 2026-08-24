import { IconFlame } from './icons';

interface Props {
  consumed: number;
  goal: number;
}

const SIZE = 176;
const STROKE = 14;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function CalorieRing({ consumed, goal }: Props) {
  const pct = goal > 0 ? Math.min(1, consumed / goal) : 0;
  const remaining = goal - consumed;
  const over = remaining < 0;
  const offset = CIRCUMFERENCE * (1 - pct);

  return (
    <div className="ring-card">
      <div className="ring-wrap">
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="ring-svg">
          <defs>
            <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="var(--accent-2)" />
              <stop offset="100%" stopColor="var(--accent)" />
            </linearGradient>
          </defs>
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            className="ring-track"
            strokeWidth={STROKE}
            fill="none"
          />
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            stroke={over ? 'var(--bad)' : 'url(#ringGradient)'}
            strokeWidth={STROKE}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={offset}
            className="ring-fill"
            transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
          />
        </svg>
        <div className="ring-center">
          <IconFlame className={`ring-icon ${over ? 'over' : ''}`} />
          <span className={`ring-number ${over ? 'over' : ''}`}>{Math.abs(Math.round(remaining))}</span>
          <span className="ring-label">{over ? 'over goal' : 'remaining'}</span>
        </div>
      </div>

      <div className="ring-stats">
        <div className="ring-stat">
          <span className="ring-stat-value">{Math.round(consumed)}</span>
          <span className="ring-stat-label">consumed</span>
        </div>
        <div className="ring-stat-divider" />
        <div className="ring-stat">
          <span className="ring-stat-value">{goal}</span>
          <span className="ring-stat-label">goal</span>
        </div>
      </div>
    </div>
  );
}
