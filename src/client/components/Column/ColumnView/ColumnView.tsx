import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { List } from '../../../types';
import { ColumnHeader } from '../ColumnHeader/ColumnHeader';
import { CardItem } from '../../Card/CardItem/CardItem';
import { AddCardForm } from '../AddCardForm/AddCardForm';
import { EmptyDropZone } from '../EmptyDropZone/EmptyDropZone';
import styles from './ColumnView.module.css';

interface ColumnViewProps {
  list: List;
}

export function ColumnView({ list }: ColumnViewProps) {
  const sortedCards = [...(list.cards ?? [])].sort((a, b) => a.position - b.position);

  return (
    <div className={styles.column} data-testid="column">
      <ColumnHeader list={list} />
      <SortableContext
        items={sortedCards.map((c) => c.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className={styles.cards} data-testid={`column-droppable-${list.id}`}>
          {sortedCards.length === 0 && <EmptyDropZone listId={list.id} />}
          {sortedCards.map((card) => (
            <CardItem key={card.id} card={card} />
          ))}
        </div>
      </SortableContext>
      <div className={styles.footer}>
        <AddCardForm listId={list.id} />
      </div>
    </div>
  );
}
