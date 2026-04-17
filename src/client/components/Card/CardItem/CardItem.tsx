import { CSSProperties } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useUiStore } from '../../../stores/ui';
import { Card } from '../../../types';
import { LabelChip } from '../../Label/LabelChip/LabelChip';
import styles from './CardItem.module.css';

interface CardItemProps {
  card: Card;
}

const MAX_VISIBLE_CHIPS = 3;

export function CardItem({ card }: CardItemProps) {
  const openModal = useUiStore((s) => s.openModal);
  const labels = card.labels ?? [];
  const visibleLabels = labels.slice(0, MAX_VISIBLE_CHIPS);
  const overflowCount = labels.length - visibleLabels.length;

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
  });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const className = [styles.card, isDragging ? styles.cardGhost : ''].filter(Boolean).join(' ');

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={className}
      onClick={() => openModal(`card:${card.id}`)}
      data-testid="card-item"
      data-draggable-id={`card-draggable-${card.id}`}
    >
      {labels.length > 0 && (
        <div className={styles.labelStrip} data-testid="card-label-strip">
          {visibleLabels.map((label) => (
            <LabelChip key={label.id} label={label} variant="solid" size="sm" />
          ))}
          {overflowCount > 0 && (
            <span
              className={styles.overflow}
              aria-label={`${overflowCount} more labels`}
              data-testid="card-label-overflow"
            >
              +{overflowCount}
            </span>
          )}
        </div>
      )}
      <span className={styles.title}>{card.title}</span>
    </div>
  );
}
