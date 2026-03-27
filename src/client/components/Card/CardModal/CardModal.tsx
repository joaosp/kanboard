import { useEffect, useState } from 'react';
import { useUiStore } from '../../../stores/ui';
import { useCardsStore } from '../../../stores/cards';
import { Modal } from '../../shared/Modal/Modal';
import { Button } from '../../shared/Button/Button';
import { Spinner } from '../../shared/Spinner/Spinner';
import { Card } from '../../../types';
import styles from './CardModal.module.css';

export function CardModal() {
  const { activeModal, closeModal } = useUiStore();
  const { fetchCard, updateCard, deleteCard, isLoading } = useCardsStore();
  const [card, setCard] = useState<Card | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const cardId = activeModal?.startsWith('card:') ? activeModal.slice(5) : null;

  useEffect(() => {
    if (cardId) {
      fetchCard(cardId).then((c) => {
        setCard(c);
        setTitle(c.title);
        setDescription(c.description ?? '');
      });
    }
  }, [cardId, fetchCard]);

  const handleSave = async () => {
    if (!card) return;
    await updateCard(card.id, {
      title: title.trim(),
      description: description.trim() || null,
    });
    closeModal();
  };

  const handleDelete = async () => {
    if (!card) return;
    await deleteCard(card.id);
    closeModal();
  };

  return (
    <Modal isOpen={!!cardId} onClose={closeModal} title="Card Details">
      {!card && isLoading ? (
        <Spinner />
      ) : card ? (
        <div className={styles.content}>
          <div className={styles.field}>
            <label className={styles.label}>Title</label>
            <input
              className={styles.titleInput}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              data-testid="card-modal-title"
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Description</label>
            <textarea
              className={styles.description}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a description..."
              data-testid="card-modal-description"
            />
          </div>
          <div className={styles.meta}>
            <p>List: {card.listId}</p>
            <p>Created: {new Date(card.createdAt).toLocaleDateString()}</p>
            <p>Updated: {new Date(card.updatedAt).toLocaleDateString()}</p>
          </div>
          <div className={styles.actions}>
            <Button variant="destructive" onClick={handleDelete} data-testid="card-modal-delete">
              Delete
            </Button>
            <Button onClick={handleSave} isLoading={isLoading} data-testid="card-modal-save">
              Save
            </Button>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
