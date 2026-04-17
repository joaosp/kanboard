import { KeyboardEvent, useRef } from 'react';
import { LABEL_COLORS, LabelColor } from '../../../types';
import styles from './LabelSwatchGrid.module.css';

interface LabelSwatchGridProps {
  selectedColor: LabelColor | null;
  onSelect: (color: LabelColor) => void;
  disabled?: boolean;
  idPrefix: string;
}

const COLOR_LABELS: Record<LabelColor, string> = {
  red: 'Red',
  amber: 'Amber',
  green: 'Green',
  blue: 'Blue',
  purple: 'Purple',
  slate: 'Slate',
};

export function LabelSwatchGrid({
  selectedColor,
  onSelect,
  disabled = false,
  idPrefix,
}: LabelSwatchGridProps) {
  const buttonsRef = useRef<Array<HTMLButtonElement | null>>([]);

  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (disabled) return;
    let nextIndex: number | null = null;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      nextIndex = (index + 1) % LABEL_COLORS.length;
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      nextIndex = (index - 1 + LABEL_COLORS.length) % LABEL_COLORS.length;
    }
    if (nextIndex !== null) {
      e.preventDefault();
      const next = LABEL_COLORS[nextIndex];
      if (next) {
        onSelect(next);
        buttonsRef.current[nextIndex]?.focus();
      }
    }
  };

  return (
    <div
      className={styles.grid}
      role="radiogroup"
      aria-label="Label color"
      data-testid={`${idPrefix}-swatch-grid`}
    >
      {LABEL_COLORS.map((color, index) => {
        const isSelected = selectedColor === color;
        const testId = `label-swatch-${idPrefix}-${color}`;
        return (
          <button
            key={color}
            ref={(el) => {
              buttonsRef.current[index] = el;
            }}
            type="button"
            role="radio"
            aria-checked={isSelected}
            aria-label={COLOR_LABELS[color]}
            tabIndex={isSelected || (!selectedColor && index === 0) ? 0 : -1}
            disabled={disabled}
            data-color={color}
            className={`${styles.swatch} ${isSelected ? styles.selected : ''}`}
            onClick={() => onSelect(color)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            data-testid={testId}
          />
        );
      })}
    </div>
  );
}
