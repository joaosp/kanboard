import { useEffect, useMemo } from 'react';
import { useLabelsStore } from '../../../stores/labels';
import { useLabelFilterStore } from '../../../stores/labelFilter';
import { Label } from '../../../types';
import { LabelChip } from '../LabelChip/LabelChip';
import styles from './LabelFilterBar.module.css';

interface LabelFilterBarProps {
  boardId: string;
}

const EMPTY_LABELS: Label[] = [];
const EMPTY_SELECTION: string[] = [];

export function LabelFilterBar({ boardId }: LabelFilterBarProps) {
  const labels = useLabelsStore((s) => s.byBoard[boardId]) ?? EMPTY_LABELS;
  const fetchLabels = useLabelsStore((s) => s.fetchLabels);
  const selected =
    useLabelFilterStore((s) => s.selectedByBoard[boardId]) ?? EMPTY_SELECTION;
  const toggle = useLabelFilterStore((s) => s.toggle);
  const clear = useLabelFilterStore((s) => s.clear);
  const pruneDeleted = useLabelFilterStore((s) => s.pruneDeleted);

  useEffect(() => {
    fetchLabels(boardId).catch(() => {
      /* error surfaces via toast in store */
    });
  }, [boardId, fetchLabels]);

  const labelIdsKey = useMemo(() => labels.map((l) => l.id).join(','), [labels]);

  useEffect(() => {
    pruneDeleted(boardId, labelIdsKey ? labelIdsKey.split(',') : []);
  }, [boardId, labelIdsKey, pruneDeleted]);

  if (labels.length === 0) return null;

  const selectedSet = new Set(selected);
  const hasSelection = selected.length > 0;

  return (
    <div
      className={styles.bar}
      role="toolbar"
      aria-label="Filter by label"
      data-testid="label-filter-bar"
    >
      <span className={styles.prefix}>Filter:</span>
      <div className={styles.pills}>
        {labels.map((label) => {
          const isSelected = selectedSet.has(label.id);
          return (
            <LabelChip
              key={label.id}
              label={label}
              variant={isSelected ? 'solid' : 'outline'}
              size="sm"
              isSelected={isSelected}
              onClick={() => toggle(boardId, label.id)}
              testIdPrefix="filter-label-toggle"
            />
          );
        })}
      </div>
      {hasSelection && (
        <button
          type="button"
          className={styles.clearButton}
          onClick={() => clear(boardId)}
          data-testid="clear-label-filter"
        >
          Clear all
        </button>
      )}
    </div>
  );
}
