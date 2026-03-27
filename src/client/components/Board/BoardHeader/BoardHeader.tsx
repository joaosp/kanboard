import { useState, KeyboardEvent } from 'react';
import { Link } from 'react-router-dom';
import { useBoardsStore } from '../../../stores/boards';
import { Board } from '../../../types';
import styles from './BoardHeader.module.css';

interface BoardHeaderProps {
  board: Board;
}

export function BoardHeader({ board }: BoardHeaderProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(board.name);
  const updateBoard = useBoardsStore((s) => s.updateBoard);

  const handleSave = async () => {
    if (name.trim() && name.trim() !== board.name) {
      await updateBoard(board.id, name.trim());
    } else {
      setName(board.name);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') {
      setName(board.name);
      setIsEditing(false);
    }
  };

  return (
    <div className={styles.header} data-testid="board-header">
      <Link to="/boards" className={styles.backLink} data-testid="back-to-boards">
        &larr; Boards
      </Link>
      <div className={styles.nameContainer}>
        {isEditing ? (
          <input
            className={styles.editInput}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            autoFocus
            data-testid="board-name-input"
          />
        ) : (
          <>
            <h1 className={styles.name} data-testid="board-name">{board.name}</h1>
            <button
              className={styles.editButton}
              onClick={() => setIsEditing(true)}
              data-testid="edit-board-name"
            >
              Edit
            </button>
          </>
        )}
      </div>
    </div>
  );
}
