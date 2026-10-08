import './ValueBar.css';

interface ValueBarProps {
  value: number;
  maxAbsValue?: number;
  showNumber?: boolean;
  size?: 'normal' | 'mini';
}

export const ValueBar = ({
  value,
  maxAbsValue = 10,
  showNumber = true,
  size = 'normal',
}: ValueBarProps) => {
  const numVal = Number(value) || 0;
  const isPositive = numVal > 0;
  const isNegative = numVal < 0;

  const effectiveMax = maxAbsValue > 0 ? maxAbsValue : 10;
  const ratio = Math.min(1, Math.abs(numVal) / effectiveMax);
  const barWidth = ratio * 50; // max 50% from center to either side

  const formattedValue = isPositive ? `+${numVal}` : `${numVal}`;
  const colorVar = isNegative ? 'var(--neg)' : isPositive ? 'var(--pos)' : 'var(--ink3)';

  return (
    <span className={`dict-vb-wrap dict-vb-wrap--${size}`}>
      {showNumber && (
        <span
          className="mono dict-vb-num"
          style={{ color: colorVar }}
        >
          {formattedValue}
        </span>
      )}
      <span className="dict-vb-track" title={`Valor: ${formattedValue} (máx: ±${effectiveMax})`}>
        <span className="dict-vb-center-mark" />
        {isPositive && (
          <span
            className="dict-vb-fill"
            style={{
              left: '50%',
              width: `${barWidth}%`,
              background: 'var(--pos)',
            }}
          />
        )}
        {isNegative && (
          <span
            className="dict-vb-fill"
            style={{
              right: '50%',
              width: `${barWidth}%`,
              background: 'var(--neg)',
            }}
          />
        )}
        {!isPositive && !isNegative && (
          <span
            className="dict-vb-fill"
            style={{
              left: 'calc(50% - 1px)',
              width: '2px',
              background: 'var(--ink3)',
            }}
          />
        )}
      </span>
    </span>
  );
};
