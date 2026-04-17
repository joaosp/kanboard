import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useBoardsStore } from '../../../stores/boards';
import { useLabelsStore } from '../../../stores/labels';
import { useUiStore } from '../../../stores/ui';
import { LabelColor } from '../../../types';
import { Button } from '../../shared/Button/Button';
import { Input } from '../../shared/Input/Input';
import { Modal } from '../../shared/Modal/Modal';
import { Spinner } from '../../shared/Spinner/Spinner';
import { LabelRow } from '../LabelRow/LabelRow';
import { LabelSwatchGrid } from '../LabelSwatchGrid/LabelSwatchGrid';
import type { Label } from '../../../types';
import styles from './LabelManagerModal.module.css';

interface LabelManagerModalProps {
  boardId: string;
}

const EMPTY_LABELS: Label[] = [];

export function LabelManagerModal({ boardId }: LabelManagerModalProps) {
  const closeModal = useUiStore((s) => s.closeModal);
  const currentBoard = useBoardsStore((s) => s.currentBoard);
  const labelsForBoard = useLabelsStore((s) => s.byBoard[boardId]);
  const labels = labelsForBoard ?? EMPTY_LABELS;
  const isLoading = useLabelsStore((s) => s.isLoadingByBoard[boardId] ?? false);
  const fetchLabels = useLabelsStore((s) => s.fetchLabels);
  const createLabel = useLabelsStore((s) => s.createLabel);
  const updateLabel = useLabelsStore((s) => s.updateLabel);
  const deleteLabel = useLabelsStore((s) => s.deleteLabel);

  const [name, setName] = useState('');
  const [color, setColor] = useState<LabelColor | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    fetchLabels(boardId).catch(() => {
      /* error already surfaced via toast */
    });
  }, [boardId, fetchLabels]);

  // Capture the trigger that opened the modal (e.g. manage-labels-button) so
  // we can restore focus when the modal unmounts. Falls back to no-op if the
  // trigger is no longer in the DOM.
  const previousFocusRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    return () => {
      const target = previousFocusRef.current;
      if (target && document.body.contains(target)) {
        target.focus();
      }
    };
  }, []);

  const cardCountByLabelId = useMemo(() => {
    const counts = new Map<string, number>();
    for (const list of currentBoard?.lists ?? []) {
      for (const card of list.cards ?? []) {
        for (const l of card.labels ?? []) {
          counts.set(l.id, (counts.get(l.id) ?? 0) + 1);
        }
      }
    }
    return counts;
  }, [currentBoard]);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setCreateError('Name is required.');
      return;
    }
    if (!color) {
      setCreateError('Pick a color.');
      return;
    }
    setIsCreating(true);
    setCreateError(null);
    try {
      await createLabel(boardId, { name: trimmed, color });
      setName('');
      setColor(null);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Could not create label.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleCancel = () => {
    setName('');
    setColor(null);
    setCreateError(null);
    closeModal();
  };

  const createDisabled = !name.trim() || !color || isCreating;

  return (
    <Modal isOpen onClose={closeModal} title="Manage Labels">
      <div className={styles.body} data-testid="label-manager-modal">
        {isLoading && labels.length === 0 ? (
          <div className={styles.loading}>
            <Spinner size="lg" />
          </div>
        ) : labels.length === 0 ? (
          <p className={styles.empty}>
            No labels on this board yet. Create one below to start tagging cards.
          </p>
        ) : (
          <div className={styles.list}>
            {labels.map((label) => (
              <LabelRow
                key={label.id}
                label={label}
                cardCount={cardCountByLabelId.get(label.id) ?? 0}
                onSave={(patch) => updateLabel(boardId, label.id, patch).then(() => undefined)}
                onDelete={() => deleteLabel(boardId, label.id)}
              />
            ))}
          </div>
        )}

        <form className={styles.createForm} onSubmit={handleCreate}>
          <h3 className={styles.sectionTitle}>New label</h3>
          <Input
            label="Name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (createError) setCreateError(null);
            }}
            placeholder="e.g. Bug"
            error={createError ?? undefined}
            disabled={isCreating}
            data-testid="label-create-name"
          />
          <div className={styles.colorRow}>
            <span className={styles.colorLabel}>Color</span>
            <LabelSwatchGrid
              selectedColor={color}
              onSelect={setColor}
              disabled={isCreating}
              idPrefix="create"
            />
          </div>
          <div className={styles.actions}>
            <Button
              type="button"
              variant="secondary"
              onClick={handleCancel}
              disabled={isCreating}
              data-testid="label-create-cancel"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              isLoading={isCreating}
              disabled={createDisabled}
              data-testid="label-create-submit"
            >
              Create
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
