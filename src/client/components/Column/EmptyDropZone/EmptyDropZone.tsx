import { useDroppable } from '@dnd-kit/core';
import styles from './EmptyDropZone.module.css';

interface EmptyDropZoneProps {
  listId: string;
}

export function EmptyDropZone({ listId }: EmptyDropZoneProps) {
  const { setNodeRef, isOver } = useDroppable({ id: `empty-${listId}` });
  const className = [styles.zone, isOver ? styles.zoneOver : ''].filter(Boolean).join(' ');

  return (
    <div
      ref={setNodeRef}
      className={className}
      data-testid={`column-empty-drop-${listId}`}
    >
      Drop cards here
    </div>
  );
}
