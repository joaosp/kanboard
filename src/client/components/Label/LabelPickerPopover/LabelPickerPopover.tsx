import { RefObject, useEffect, useMemo, useRef, useState } from 'react';
import { Label } from '../../../types';
import { Input } from '../../shared/Input/Input';
import { Spinner } from '../../shared/Spinner/Spinner';
import { LabelChip } from '../LabelChip/LabelChip';
import styles from './LabelPickerPopover.module.css';

interface LabelPickerPopoverProps {
  attachedLabelIds: string[];
  labels: Label[];
  onAttach: (labelId: string) => Promise<void>;
  onDetach: (labelId: string) => Promise<void>;
  onClose: () => void;
  onOpenManager: () => void;
  anchorRef: RefObject<HTMLButtonElement | null>;
}

export function LabelPickerPopover({
  attachedLabelIds,
  labels,
  onAttach,
  onDetach,
  onClose,
  onOpenManager,
  anchorRef,
}: LabelPickerPopoverProps) {
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const [query, setQuery] = useState('');
  const [pendingId, setPendingId] = useState<string | null>(null);

  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Capture-phase + stopImmediatePropagation so the surrounding Modal's
        // document-level Escape listener never fires. Escape with the popover
        // open closes ONLY the popover; Escape with the popover closed falls
        // through to the Modal as usual.
        e.stopImmediatePropagation();
        e.stopPropagation();
        onClose();
        anchorRef.current?.focus();
      }
    };
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (popoverRef.current?.contains(target)) return;
      if (anchorRef.current?.contains(target)) return;
      onClose();
    };
    document.addEventListener('keydown', handleKey, true);
    document.addEventListener('mousedown', handleClick);
    return () => {
      document.removeEventListener('keydown', handleKey, true);
      document.removeEventListener('mousedown', handleClick);
    };
  }, [onClose, anchorRef]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return labels;
    return labels.filter((l) => l.name.toLowerCase().includes(q));
  }, [labels, query]);

  const attachedSet = useMemo(() => new Set(attachedLabelIds), [attachedLabelIds]);

  const handleToggle = async (label: Label) => {
    const isAttached = attachedSet.has(label.id);
    setPendingId(label.id);
    try {
      if (isAttached) {
        await onDetach(label.id);
      } else {
        await onAttach(label.id);
      }
    } catch {
      /* error surfaces via toast in store */
    } finally {
      setPendingId(null);
    }
  };

  return (
    <div
      ref={popoverRef}
      className={styles.popover}
      role="dialog"
      aria-modal="false"
      aria-label="Attach labels"
      data-testid="label-picker-popover"
    >
      <Input
        ref={searchRef}
        placeholder="Search labels..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        data-testid="label-picker-search"
      />
      <div className={styles.list}>
        {filtered.length === 0 ? (
          <p className={styles.empty}>
            {labels.length === 0
              ? 'No labels yet.'
              : `No labels match "${query}".`}
          </p>
        ) : (
          filtered.map((label) => {
            const isAttached = attachedSet.has(label.id);
            const isPending = pendingId === label.id;
            return (
              <button
                key={label.id}
                type="button"
                role="menuitemcheckbox"
                aria-checked={isAttached}
                className={styles.row}
                onClick={() => handleToggle(label)}
                disabled={isPending}
                data-testid={`label-picker-row-${label.id}`}
              >
                <span className={styles.checkbox} aria-hidden="true">
                  {isPending ? <Spinner size="sm" /> : isAttached ? '\u2713' : ''}
                </span>
                <LabelChip label={label} size="sm" testIdPrefix="label-picker-chip" />
              </button>
            );
          })
        )}
      </div>
      <button
        type="button"
        className={styles.manageLink}
        onClick={onOpenManager}
        data-testid="label-picker-manage"
      >
        Manage labels&hellip;
      </button>
    </div>
  );
}
