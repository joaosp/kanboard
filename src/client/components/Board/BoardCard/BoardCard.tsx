import { useNavigate } from 'react-router-dom';
import { Board } from '../../../types';
import styles from './BoardCard.module.css';

interface BoardCardProps {
  board: Board;
}

export function BoardCard({ board }: BoardCardProps) {
  const navigate = useNavigate();

  return (
    <div
      className={styles.card}
      onClick={() => navigate(`/boards/${board.id}`)}
      data-testid="board-card"
    >
      <span className={styles.name}>{board.name}</span>
      <span className={styles.meta}>
        {board.members?.length ?? 0} member{(board.members?.length ?? 0) !== 1 ? 's' : ''}
      </span>
    </div>
  );
}
