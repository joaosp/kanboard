import { useUiStore } from '../../../stores/ui';
import { Card } from '../../../types';
import styles from './CardItem.module.css';

interface CardItemProps {
  card: Card;
}

export function CardItem({ card }: CardItemProps) {
  const openModal = useUiStore((s) => s.openModal);

  return (
    <div
      className={styles.card}
      onClick={() => openModal(`card:${card.id}`)}
      data-testid="card-item"
    >
      <span className={styles.title}>{card.title}</span>
    </div>
  );
}
