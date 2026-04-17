import { useEffect, useMemo, useState, FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type Announcements,
  type DragCancelEvent,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { useBoardsStore } from '../../../stores/boards';
import { useCardsStore } from '../../../stores/cards';
import { useUiStore } from '../../../stores/ui';
import { useLabelFilterStore } from '../../../stores/labelFilter';
import { createListApi } from '../../../api/lists';
import { Card } from '../../../types';
import { BoardHeader } from '../BoardHeader/BoardHeader';
import { ColumnView } from '../../Column/ColumnView/ColumnView';
import { CardModal } from '../../Card/CardModal/CardModal';
import { DragCardPreview } from '../../Card/DragCardPreview/DragCardPreview';
import { LabelManagerModal } from '../../Label/LabelManagerModal/LabelManagerModal';
import { LabelFilterBar } from '../../Label/LabelFilterBar/LabelFilterBar';
import { Spinner } from '../../shared/Spinner/Spinner';
import { Button } from '../../shared/Button/Button';
import { Input } from '../../shared/Input/Input';
import styles from './BoardView.module.css';

const EMPTY_SELECTION: string[] = [];

export function BoardView() {
  const { boardId } = useParams<{ boardId: string }>();
  const { currentBoard, isLoading, fetchBoard } = useBoardsStore();
  const activeModal = useUiStore((s) => s.activeModal);
  const selectedLabelIds =
    useLabelFilterStore((s) => (boardId ? s.selectedByBoard[boardId] : undefined)) ??
    EMPTY_SELECTION;
  const [newListName, setNewListName] = useState('');
  const [activeCard, setActiveCard] = useState<Card | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );

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

  // Lookup helpers used by drag handlers + announcements. Memoised against the
  // unfiltered board so that label filtering never alters target positions.
  const cardsById = useMemo(() => {
    const map = new Map<string, { card: Card; listId: string }>();
    for (const list of currentBoard?.lists ?? []) {
      for (const c of list.cards ?? []) {
        map.set(c.id, { card: c, listId: list.id });
      }
    }
    return map;
  }, [currentBoard]);

  const listsById = useMemo(() => {
    const map = new Map<string, { name: string; cards: Card[] }>();
    for (const list of currentBoard?.lists ?? []) {
      const cards = [...(list.cards ?? [])].sort((a, b) => a.position - b.position);
      map.set(list.id, { name: list.name, cards });
    }
    return map;
  }, [currentBoard]);

  function resolveDropTarget(overId: string, activeCardId: string): { listId: string; position: number } | null {
    // Empty-list drop zones are registered with id `empty-${listId}`.
    if (overId.startsWith('empty-')) {
      const listId = overId.slice('empty-'.length);
      if (!listsById.has(listId)) return null;
      return { listId, position: 0 };
    }

    // Sortable nodes are registered with the card id. Figure out which list owns it
    // and where the dragging card should be inserted. dnd-kit's sortable contract
    // lands the dragged card at the target index regardless of drag direction,
    // which matches arrayMove semantics — same logic for same-list and cross-list.
    const targetInfo = cardsById.get(overId);
    if (!targetInfo) return null;
    const list = listsById.get(targetInfo.listId);
    if (!list) return null;
    const targetIndex = list.cards.findIndex((c) => c.id === overId);
    if (targetIndex < 0) return null;

    // Silence unused-var lint for activeCardId — kept in signature so callers pass
    // the source id uniformly, and for future heuristics (e.g. above/below split).
    void activeCardId;
    return { listId: targetInfo.listId, position: targetIndex };
  }

  const handleDragStart = (event: DragStartEvent) => {
    const id = String(event.active.id);
    const info = cardsById.get(id);
    if (info) setActiveCard(info.card);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const activeId = String(event.active.id);
    const overId = event.over ? String(event.over.id) : null;
    setActiveCard(null);
    if (!overId) return;

    const sourceInfo = cardsById.get(activeId);
    if (!sourceInfo) return;

    const resolved = resolveDropTarget(overId, activeId);
    if (!resolved) return;

    // No-op: identical drop position in the same list.
    if (resolved.listId === sourceInfo.listId && resolved.position === sourceInfo.card.position) {
      return;
    }

    try {
      await useCardsStore.getState().moveCard(activeId, {
        listId: resolved.listId,
        position: resolved.position,
        sourceListId: sourceInfo.listId,
      });
    } catch {
      // Store already reverted the optimistic update and surfaced a toast.
    }
  };

  const handleDragCancel = (_event: DragCancelEvent) => {
    setActiveCard(null);
  };

  const announcements: Announcements = {
    onDragStart: ({ active }) => {
      const info = cardsById.get(String(active.id));
      const title = info?.card.title ?? 'card';
      return `Picked up card ${title}.`;
    },
    onDragOver: ({ active, over }) => {
      const sourceInfo = cardsById.get(String(active.id));
      const title = sourceInfo?.card.title ?? 'card';
      if (!over) return `Card ${title} is no longer over a drop target.`;
      const overId = String(over.id);
      const resolved = resolveDropTarget(overId, String(active.id));
      if (!resolved) return `Card ${title} is over an unknown target.`;
      const listName = listsById.get(resolved.listId)?.name ?? 'list';
      return `Card ${title} is over position ${resolved.position + 1} in ${listName}.`;
    },
    onDragEnd: ({ active, over }) => {
      const sourceInfo = cardsById.get(String(active.id));
      const title = sourceInfo?.card.title ?? 'card';
      if (!over) return `Card ${title} was dropped on no target.`;
      const resolved = resolveDropTarget(String(over.id), String(active.id));
      if (!resolved) return `Card ${title} was dropped on an unknown target.`;
      const listName = listsById.get(resolved.listId)?.name ?? 'list';
      return `Card ${title} dropped in ${listName} at position ${resolved.position + 1}.`;
    },
    onDragCancel: ({ active }) => {
      const info = cardsById.get(String(active.id));
      const title = info?.card.title ?? 'card';
      return `Dropping cancelled. Card ${title} returned to original position.`;
    },
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

  const selectedSet = new Set(selectedLabelIds);
  const filteredLists =
    selectedSet.size === 0
      ? sortedLists
      : sortedLists.map((list) => ({
          ...list,
          cards: (list.cards ?? []).filter((card) =>
            (card.labels ?? []).some((l) => selectedSet.has(l.id)),
          ),
        }));

  return (
    <div className={styles.container}>
      <BoardHeader board={currentBoard} />
      {boardId && <LabelFilterBar boardId={boardId} />}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
        accessibility={{ announcements }}
      >
        <div className={styles.columns} data-testid="board-dnd-context">
          {filteredLists.map((list) => (
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
        <DragOverlay>
          {activeCard ? <DragCardPreview card={activeCard} /> : null}
        </DragOverlay>
      </DndContext>
      {activeModal?.startsWith('card:') && <CardModal />}
      {boardId && activeModal === `labels:${boardId}` && (
        <LabelManagerModal boardId={boardId} />
      )}
    </div>
  );
}
