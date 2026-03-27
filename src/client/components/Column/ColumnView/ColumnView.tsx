import { List } from '../../../types';
import { ColumnHeader } from '../ColumnHeader/ColumnHeader';
import { CardItem } from '../../Card/CardItem/CardItem';
import { AddCardForm } from '../AddCardForm/AddCardForm';
import styles from './ColumnView.module.css';

interface ColumnViewProps {
  list: List;
}

export function ColumnView({ list }: ColumnViewProps) {
  const sortedCards = [...(list.cards ?? [])].sort((a, b) => a.position - b.position);

  return (
    <div className={styles.column} data-testid="column">
      <ColumnHeader list={list} />
      <div className={styles.cards}>
        {sortedCards.map((card) => (
          <CardItem key={card.id} card={card} />
        ))}
      </div>
      <div className={styles.footer}>
        <AddCardForm listId={list.id} />
      </div>
    </div>
  );
}
