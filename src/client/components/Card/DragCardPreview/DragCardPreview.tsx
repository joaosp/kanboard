import { Card } from '../../../types';
import { LabelChip } from '../../Label/LabelChip/LabelChip';
import styles from './DragCardPreview.module.css';

interface DragCardPreviewProps {
  card: Card;
}

const MAX_VISIBLE_CHIPS = 3;

export function DragCardPreview({ card }: DragCardPreviewProps) {
  const labels = card.labels ?? [];
  const visibleLabels = labels.slice(0, MAX_VISIBLE_CHIPS);
  const overflowCount = labels.length - visibleLabels.length;

  return (
    <div className={styles.preview} data-testid="drag-overlay">
      <div data-testid={`drag-overlay-card-${card.id}`}>
        {labels.length > 0 && (
          <div className={styles.labelStrip}>
            {visibleLabels.map((label) => (
              <LabelChip key={label.id} label={label} variant="solid" size="sm" />
            ))}
            {overflowCount > 0 && (
              <span className={styles.overflow} aria-label={`${overflowCount} more labels`}>
                +{overflowCount}
              </span>
            )}
          </div>
        )}
        <span className={styles.title}>{card.title}</span>
      </div>
    </div>
  );
}
