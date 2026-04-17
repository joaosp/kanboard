import { LabelColor } from '../../../types';
import { Spinner } from '../../shared/Spinner/Spinner';
import styles from './LabelChip.module.css';

interface LabelChipProps {
  label: { id: string; name: string; color: LabelColor };
  variant?: 'solid' | 'outline';
  size?: 'sm' | 'md';
  onRemove?: () => void;
  onClick?: () => void;
  isPending?: boolean;
  isSelected?: boolean;
  testIdPrefix?: string;
}

export function LabelChip({
  label,
  variant = 'solid',
  size = 'sm',
  onRemove,
  onClick,
  isPending = false,
  isSelected = false,
  testIdPrefix = 'card-label-chip',
}: LabelChipProps) {
  const testId = `${testIdPrefix}-${label.id}`;
  const removeTestId = `${testIdPrefix}-remove-${label.id}`;
  const ariaLabel = `${label.name} label`;
  const className = [
    styles.chip,
    styles[variant],
    styles[size],
    isPending ? styles.pending : '',
  ]
    .filter(Boolean)
    .join(' ');

  if (onClick) {
    return (
      <button
        type="button"
        className={className}
        data-color={label.color}
        onClick={onClick}
        aria-label={ariaLabel}
        aria-pressed={isSelected}
        data-testid={testId}
      >
        <span className={styles.name}>{label.name}</span>
      </button>
    );
  }

  return (
    <span
      className={className}
      data-color={label.color}
      aria-label={ariaLabel}
      data-testid={testId}
    >
      <span className={styles.name}>{label.name}</span>
      {onRemove && (
        <button
          type="button"
          className={styles.remove}
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          aria-label={`Remove ${label.name} label`}
          data-testid={removeTestId}
          disabled={isPending}
        >
          {isPending ? <Spinner size="sm" /> : <span aria-hidden="true">&times;</span>}
        </button>
      )}
    </span>
  );
}
