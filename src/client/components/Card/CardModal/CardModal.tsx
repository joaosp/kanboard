import { useEffect, useRef, useState } from 'react';
import { useUiStore } from '../../../stores/ui';
import { useCardsStore } from '../../../stores/cards';
import { useBoardsStore } from '../../../stores/boards';
import { useLabelsStore } from '../../../stores/labels';
import { Modal } from '../../shared/Modal/Modal';
import { Button } from '../../shared/Button/Button';
import { Spinner } from '../../shared/Spinner/Spinner';
import { LabelChip } from '../../Label/LabelChip/LabelChip';
import { LabelPickerPopover } from '../../Label/LabelPickerPopover/LabelPickerPopover';
import { Card, Label } from '../../../types';
import styles from './CardModal.module.css';

const EMPTY_LABELS: Label[] = [];

export function CardModal() {
  const activeModal = useUiStore((s) => s.activeModal);
  const closeModal = useUiStore((s) => s.closeModal);
  const openModal = useUiStore((s) => s.openModal);
  const { fetchCard, updateCard, deleteCard, isLoading } = useCardsStore();
  const currentBoard = useBoardsStore((s) => s.currentBoard);
  const boardId = currentBoard?.id ?? null;
  const labelsForBoard = useLabelsStore((s) => (boardId ? s.byBoard[boardId] : undefined));
  const boardLabels = labelsForBoard ?? EMPTY_LABELS;
  const fetchLabels = useLabelsStore((s) => s.fetchLabels);
  const attachLabel = useLabelsStore((s) => s.attachLabel);
  const detachLabel = useLabelsStore((s) => s.detachLabel);

  const [card, setCard] = useState<Card | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [pendingDetachId, setPendingDetachId] = useState<string | null>(null);
  const addLabelButtonRef = useRef<HTMLButtonElement | null>(null);

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

  useEffect(() => {
    if (boardId && boardLabels.length === 0) {
      fetchLabels(boardId).catch(() => {
        /* error surfaces via toast */
      });
    }
  }, [boardId, boardLabels.length, fetchLabels]);

  // Keep the local card state (specifically card.labels) in sync with the
  // board refetch triggered after attach/detach.
  useEffect(() => {
    if (!cardId || !currentBoard) return;
    for (const list of currentBoard.lists ?? []) {
      for (const c of list.cards ?? []) {
        if (c.id === cardId) {
          setCard((prev) => (prev ? { ...prev, labels: c.labels ?? [] } : prev));
          return;
        }
      }
    }
  }, [cardId, currentBoard]);

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

  const attachedLabelIds = (card?.labels ?? []).map((l) => l.id);

  const handleAttach = async (labelId: string) => {
    if (!boardId || !card) return;
    await attachLabel(boardId, card.id, labelId);
  };

  const handleDetach = async (labelId: string) => {
    if (!boardId || !card) return;
    setPendingDetachId(labelId);
    try {
      await detachLabel(boardId, card.id, labelId);
    } finally {
      setPendingDetachId(null);
    }
  };

  const handleOpenManager = () => {
    if (!boardId) return;
    setIsPickerOpen(false);
    openModal(`labels:${boardId}`);
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
          <div className={styles.field} data-testid="card-modal-labels">
            <label className={styles.label}>Labels</label>
            <div className={styles.labelRow}>
              {(card.labels ?? []).map((label) => (
                <LabelChip
                  key={label.id}
                  label={label}
                  variant="solid"
                  size="sm"
                  testIdPrefix="card-modal-label"
                  isPending={pendingDetachId === label.id}
                  onRemove={() => {
                    void handleDetach(label.id);
                  }}
                />
              ))}
              <div className={styles.addLabelWrapper}>
                <button
                  ref={addLabelButtonRef}
                  type="button"
                  className={styles.addLabelButton}
                  onClick={() => setIsPickerOpen((v) => !v)}
                  data-testid="card-modal-add-label"
                >
                  + Add label
                </button>
                {isPickerOpen && boardId && (
                  <LabelPickerPopover
                    attachedLabelIds={attachedLabelIds}
                    labels={boardLabels}
                    onAttach={handleAttach}
                    onDetach={handleDetach}
                    onClose={() => setIsPickerOpen(false)}
                    onOpenManager={handleOpenManager}
                    anchorRef={addLabelButtonRef}
                  />
                )}
              </div>
            </div>
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
