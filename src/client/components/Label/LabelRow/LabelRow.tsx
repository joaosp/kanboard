import { useState } from 'react';
import { Label, LabelColor } from '../../../types';
import { Button } from '../../shared/Button/Button';
import { Input } from '../../shared/Input/Input';
import { LabelChip } from '../LabelChip/LabelChip';
import { LabelSwatchGrid } from '../LabelSwatchGrid/LabelSwatchGrid';
import styles from './LabelRow.module.css';

type RowState = 'view' | 'edit' | 'confirmDelete';

interface LabelRowProps {
  label: Label;
  cardCount: number;
  onSave: (patch: { name?: string; color?: LabelColor }) => Promise<void>;
  onDelete: () => Promise<void>;
}

export function LabelRow({ label, cardCount, onSave, onDelete }: LabelRowProps) {
  const [state, setState] = useState<RowState>('view');
  const [editName, setEditName] = useState(label.name);
  const [editColor, setEditColor] = useState<LabelColor>(label.color);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const startEdit = () => {
    setEditName(label.name);
    setEditColor(label.color);
    setEditError(null);
    setState('edit');
  };

  const cancelEdit = () => {
    setEditError(null);
    setState('view');
  };

  const handleSave = async () => {
    const trimmed = editName.trim();
    if (!trimmed) {
      setEditError('Name is required.');
      return;
    }
    const patch: { name?: string; color?: LabelColor } = {};
    if (trimmed !== label.name) patch.name = trimmed;
    if (editColor !== label.color) patch.color = editColor;
    if (patch.name === undefined && patch.color === undefined) {
      setState('view');
      return;
    }
    setIsSaving(true);
    setEditError(null);
    try {
      await onSave(patch);
      setState('view');
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Could not save label.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete();
      setState('view');
    } catch {
      setState('view');
    } finally {
      setIsDeleting(false);
    }
  };

  const saveDisabled =
    !editName.trim() ||
    isSaving ||
    (editName.trim() === label.name && editColor === label.color);

  if (state === 'edit') {
    return (
      <div className={styles.row} data-testid={`label-row-${label.id}`}>
        <div className={styles.editBody}>
          <LabelChip label={label} size="sm" />
          <Input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            error={editError ?? undefined}
            disabled={isSaving}
            data-testid={`label-edit-name-${label.id}`}
          />
          <LabelSwatchGrid
            selectedColor={editColor}
            onSelect={setEditColor}
            disabled={isSaving}
            idPrefix={`edit-${label.id}`}
          />
        </div>
        <div className={styles.actions}>
          <Button
            variant="secondary"
            size="sm"
            onClick={cancelEdit}
            disabled={isSaving}
            data-testid={`label-edit-cancel-${label.id}`}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            isLoading={isSaving}
            disabled={saveDisabled}
            data-testid={`label-edit-save-${label.id}`}
          >
            Save
          </Button>
        </div>
      </div>
    );
  }

  if (state === 'confirmDelete') {
    return (
      <div className={styles.row} data-testid={`label-row-${label.id}`}>
        <p className={styles.confirmText}>
          Delete &ldquo;{label.name}&rdquo;? Attached to {cardCount} {cardCount === 1 ? 'card' : 'cards'}.
        </p>
        <div className={styles.actions}>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setState('view')}
            disabled={isDeleting}
            data-testid={`label-delete-cancel-${label.id}`}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            isLoading={isDeleting}
            data-testid={`label-delete-confirm-${label.id}`}
          >
            Delete
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.row} data-testid={`label-row-${label.id}`}>
      <div className={styles.viewBody}>
        <LabelChip label={label} size="sm" />
        <span className={styles.name}>{label.name}</span>
      </div>
      <div className={styles.actions}>
        <Button
          variant="secondary"
          size="sm"
          onClick={startEdit}
          data-testid={`label-edit-${label.id}`}
        >
          Edit
        </Button>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => setState('confirmDelete')}
          data-testid={`label-delete-${label.id}`}
        >
          Delete
        </Button>
      </div>
    </div>
  );
}
