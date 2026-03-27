import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBoardsStore } from '../../../stores/boards';
import { useUiStore } from '../../../stores/ui';
import { Modal } from '../../shared/Modal/Modal';
import { Input } from '../../shared/Input/Input';
import { Button } from '../../shared/Button/Button';
import styles from './CreateBoardModal.module.css';

interface CreateBoardModalProps {
  isOpen: boolean;
}

export function CreateBoardModal({ isOpen }: CreateBoardModalProps) {
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const createBoard = useBoardsStore((s) => s.createBoard);
  const closeModal = useUiStore((s) => s.closeModal);
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsLoading(true);
    try {
      const board = await createBoard(name.trim());
      setName('');
      closeModal();
      navigate(`/boards/${board.id}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setName('');
    closeModal();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Create Board">
      <form className={styles.form} onSubmit={handleSubmit} data-testid="create-board-form">
        <Input
          label="Board Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter board name"
          required
          data-testid="create-board-name"
        />
        <div className={styles.actions}>
          <Button variant="secondary" type="button" onClick={handleClose} data-testid="create-board-cancel">
            Cancel
          </Button>
          <Button type="submit" isLoading={isLoading} data-testid="create-board-submit">
            Create
          </Button>
        </div>
      </form>
    </Modal>
  );
}
