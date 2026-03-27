import { useEffect } from 'react';
import { useBoardsStore } from '../../../stores/boards';
import { useUiStore } from '../../../stores/ui';
import { BoardCard } from '../BoardCard/BoardCard';
import { CreateBoardModal } from '../CreateBoardModal/CreateBoardModal';
import { Button } from '../../shared/Button/Button';
import { Spinner } from '../../shared/Spinner/Spinner';
import styles from './BoardList.module.css';

export function BoardList() {
  const { boards, isLoading, fetchBoards } = useBoardsStore();
  const { activeModal, openModal } = useUiStore();

  useEffect(() => {
    fetchBoards();
  }, [fetchBoards]);

  if (isLoading && boards.length === 0) {
    return (
      <div className={styles.loading}>
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>My Boards</h1>
        <Button onClick={() => openModal('createBoard')} data-testid="create-board-button">
          Create Board
        </Button>
      </div>
      <div className={styles.grid}>
        {boards.map((board) => (
          <BoardCard key={board.id} board={board} />
        ))}
      </div>
      <CreateBoardModal isOpen={activeModal === 'createBoard'} />
    </div>
  );
}
