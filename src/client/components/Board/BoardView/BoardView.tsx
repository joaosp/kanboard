import { useEffect, useState, FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import { useBoardsStore } from '../../../stores/boards';
import { useUiStore } from '../../../stores/ui';
import { createListApi } from '../../../api/lists';
import { BoardHeader } from '../BoardHeader/BoardHeader';
import { ColumnView } from '../../Column/ColumnView/ColumnView';
import { CardModal } from '../../Card/CardModal/CardModal';
import { Spinner } from '../../shared/Spinner/Spinner';
import { Button } from '../../shared/Button/Button';
import { Input } from '../../shared/Input/Input';
import styles from './BoardView.module.css';

export function BoardView() {
  const { boardId } = useParams<{ boardId: string }>();
  const { currentBoard, isLoading, fetchBoard } = useBoardsStore();
  const activeModal = useUiStore((s) => s.activeModal);
  const [newListName, setNewListName] = useState('');

  useEffect(() => {
    if (boardId) {
      fetchBoard(boardId);
    }
  }, [boardId, fetchBoard]);

  const handleAddList = async (e: FormEvent) => {
    e.preventDefault();
    if (!newListName.trim() || !boardId) return;
    await createListApi(boardId, newListName.trim());
    setNewListName('');
    fetchBoard(boardId);
  };

  if (isLoading && !currentBoard) {
    return (
      <div className={styles.loading}>
        <Spinner size="lg" />
      </div>
    );
  }

  if (!currentBoard) return null;

  const sortedLists = [...(currentBoard.lists ?? [])].sort((a, b) => a.position - b.position);

  return (
    <div className={styles.container}>
      <BoardHeader board={currentBoard} />
      <div className={styles.columns}>
        {sortedLists.map((list) => (
          <ColumnView key={list.id} list={list} />
        ))}
        <form onSubmit={handleAddList} className={styles.addListButton} data-testid="add-list-form">
          <Input
            placeholder="New list name..."
            value={newListName}
            onChange={(e) => setNewListName(e.target.value)}
            data-testid="add-list-input"
          />
          <Button
            type="submit"
            variant="secondary"
            size="sm"
            style={{ marginTop: 'var(--space-2)', width: '100%' }}
            data-testid="add-list-button"
          >
            Add List
          </Button>
        </form>
      </div>
      {activeModal?.startsWith('card:') && <CardModal />}
    </div>
  );
}
