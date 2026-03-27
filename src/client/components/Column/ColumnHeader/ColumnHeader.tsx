import { useParams } from 'react-router-dom';
import { deleteListApi } from '../../../api/lists';
import { useBoardsStore } from '../../../stores/boards';
import { List } from '../../../types';
import styles from './ColumnHeader.module.css';

interface ColumnHeaderProps {
  list: List;
}

export function ColumnHeader({ list }: ColumnHeaderProps) {
  const { boardId } = useParams<{ boardId: string }>();
  const fetchBoard = useBoardsStore((s) => s.fetchBoard);

  const handleDelete = async () => {
    await deleteListApi(list.id);
    if (boardId) fetchBoard(boardId);
  };

  return (
    <div className={styles.header} data-testid="column-header">
      <div className={styles.left}>
        <span className={styles.name}>{list.name}</span>
        <span className={styles.count}>{list.cards?.length ?? 0}</span>
      </div>
      <button
        className={styles.deleteButton}
        onClick={handleDelete}
        data-testid="delete-list-button"
      >
        &times;
      </button>
    </div>
  );
}
