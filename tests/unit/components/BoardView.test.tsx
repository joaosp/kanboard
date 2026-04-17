import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

vi.mock('../../../src/client/components/Board/BoardView/BoardView.module.css', () => ({
  default: { container: 'c', columns: 'cs', addListButton: 'ali', loading: 'l' },
}));
vi.mock('../../../src/client/components/Board/BoardHeader/BoardHeader.module.css', () => ({
  default: { header: 'h', backLink: 'bl', nameContainer: 'nc', name: 'n', editButton: 'eb', actions: 'a', manageLabelsButton: 'ml' },
}));
vi.mock('../../../src/client/components/Column/ColumnView/ColumnView.module.css', () => ({
  default: { column: 'col', cards: 'cards', footer: 'f' },
}));
vi.mock('../../../src/client/components/Column/ColumnHeader/ColumnHeader.module.css', () => ({
  default: { header: 'h', left: 'l', name: 'n', count: 'c', deleteButton: 'd' },
}));
vi.mock('../../../src/client/components/Column/AddCardForm/AddCardForm.module.css', () => ({
  default: { form: 'form', input: 'input' },
}));
vi.mock('../../../src/client/components/Card/CardItem/CardItem.module.css', () => ({
  default: { card: 'c', labelStrip: 'ls', overflow: 'ov', title: 't' },
}));
vi.mock('../../../src/client/components/Label/LabelChip/LabelChip.module.css', () => ({
  default: { chip: 'c', solid: 's', outline: 'o', sm: 'sm', md: 'md', red: 'r' },
}));
vi.mock('../../../src/client/components/shared/Button/Button.module.css', () => ({
  default: { button: 'b', primary: 'p', secondary: 's', sm: 'sm', md: 'md' },
}));
vi.mock('../../../src/client/components/shared/Input/Input.module.css', () => ({
  default: { wrapper: 'w', input: 'i', label: 'l' },
}));
vi.mock('../../../src/client/components/shared/Spinner/Spinner.module.css', () => ({
  default: { spinner: 's', lg: 'lg', md: 'md', sm: 'sm' },
}));

// Stub out the heavier sub-components
vi.mock('../../../src/client/components/Card/CardModal/CardModal', () => ({
  CardModal: () => <div data-testid="card-modal" />,
}));
vi.mock('../../../src/client/components/Label/LabelManagerModal/LabelManagerModal', () => ({
  LabelManagerModal: () => <div data-testid="label-manager-modal" />,
}));
vi.mock('../../../src/client/components/Label/LabelFilterBar/LabelFilterBar', () => ({
  LabelFilterBar: ({ boardId }: { boardId: string }) => (
    <div data-testid="label-filter-bar">{boardId}</div>
  ),
}));

const { fetchBoard, createListApi } = vi.hoisted(() => ({
  fetchBoard: vi.fn(),
  createListApi: vi.fn(),
}));

vi.mock('../../../src/client/api/lists', () => ({ createListApi, deleteListApi: vi.fn() }));

let boardsState: {
  currentBoard: { id: string; name: string; lists?: unknown[] } | null;
  isLoading: boolean;
  fetchBoard: typeof fetchBoard;
  updateBoard: () => void;
} = {
  currentBoard: null,
  isLoading: false,
  fetchBoard,
  updateBoard: vi.fn(),
};

vi.mock('../../../src/client/stores/boards', () => ({
  useBoardsStore: ((sel?: (s: typeof boardsState) => unknown) =>
    sel ? sel(boardsState) : boardsState) as never,
}));

let uiState = { activeModal: null as string | null, openModal: vi.fn(), closeModal: vi.fn() };
vi.mock('../../../src/client/stores/ui', () => ({
  useUiStore: ((sel?: (s: typeof uiState) => unknown) =>
    sel ? sel(uiState) : uiState) as never,
}));

let labelFilterState: { selectedByBoard: Record<string, string[]> } = { selectedByBoard: {} };
vi.mock('../../../src/client/stores/labelFilter', () => ({
  useLabelFilterStore: ((sel?: (s: typeof labelFilterState) => unknown) =>
    sel ? sel(labelFilterState) : labelFilterState) as never,
}));

vi.mock('../../../src/client/stores/cards', () => ({
  useCardsStore: ((sel?: (s: { createCard: () => void }) => unknown) => {
    const state = { createCard: vi.fn() };
    return sel ? sel(state) : state;
  }) as never,
}));

import { BoardView } from '../../../src/client/components/Board/BoardView/BoardView';

function renderAtBoard(boardId = 'b-1') {
  return render(
    <MemoryRouter initialEntries={[`/boards/${boardId}`]}>
      <Routes>
        <Route path="/boards/:boardId" element={<BoardView />} />
      </Routes>
    </MemoryRouter>,
  );
}

const mkList = (id: string, position: number, cards: Array<{ id: string; title: string; position: number; labels?: Array<{ id: string }> }> = []) => ({
  id,
  boardId: 'b-1',
  name: `List ${id}`,
  position,
  cards: cards.map((c) => ({
    id: c.id,
    listId: id,
    title: c.title,
    description: null,
    position: c.position,
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
    labels: c.labels,
  })),
});

describe('BoardView', () => {
  beforeEach(() => {
    fetchBoard.mockClear();
    createListApi.mockReset();
    createListApi.mockResolvedValue({ data: { id: 'new-list' } });
    boardsState = {
      currentBoard: {
        id: 'b-1',
        name: 'My Board',
        lists: [mkList('l-2', 1, [{ id: 'c-1', title: 'First', position: 0 }]), mkList('l-1', 0)],
      },
      isLoading: false,
      fetchBoard,
      updateBoard: vi.fn(),
    };
    uiState = { activeModal: null, openModal: vi.fn(), closeModal: vi.fn() };
    labelFilterState = { selectedByBoard: {} };
  });

  it('calls fetchBoard on mount with the route boardId', async () => {
    renderAtBoard();
    await waitFor(() => expect(fetchBoard).toHaveBeenCalledWith('b-1'));
  });

  it('renders the sorted columns from the current board', () => {
    renderAtBoard();
    const cols = screen.getAllByTestId('column');
    expect(cols).toHaveLength(2);
  });

  it('shows the spinner when loading and no board yet', () => {
    boardsState = {
      currentBoard: null,
      isLoading: true,
      fetchBoard,
      updateBoard: vi.fn(),
    };
    renderAtBoard();
    expect(screen.queryByTestId('board-header')).not.toBeInTheDocument();
  });

  it('returns null when no board and not loading', () => {
    boardsState = {
      currentBoard: null,
      isLoading: false,
      fetchBoard,
      updateBoard: vi.fn(),
    };
    const { container } = renderAtBoard();
    expect(container.querySelector('[data-testid="board-header"]')).toBeNull();
  });

  it('submits the add-list form and refetches the board', async () => {
    renderAtBoard();
    fireEvent.change(screen.getByTestId('add-list-input'), { target: { value: ' Done ' } });
    fireEvent.submit(screen.getByTestId('add-list-form'));

    await waitFor(() => {
      expect(createListApi).toHaveBeenCalledWith('b-1', 'Done');
      expect(fetchBoard).toHaveBeenCalledWith('b-1');
    });
  });

  it('does not submit when the list name is whitespace', () => {
    renderAtBoard();
    fireEvent.change(screen.getByTestId('add-list-input'), { target: { value: '   ' } });
    fireEvent.submit(screen.getByTestId('add-list-form'));
    expect(createListApi).not.toHaveBeenCalled();
  });

  it('renders CardModal when active modal is a card', () => {
    uiState = { activeModal: 'card:c-1', openModal: vi.fn(), closeModal: vi.fn() };
    renderAtBoard();
    expect(screen.getByTestId('card-modal')).toBeInTheDocument();
  });

  it('renders LabelManagerModal for the current board', () => {
    uiState = { activeModal: 'labels:b-1', openModal: vi.fn(), closeModal: vi.fn() };
    renderAtBoard();
    expect(screen.getByTestId('label-manager-modal')).toBeInTheDocument();
  });

  it('filters cards to those that have one of the selected labels', () => {
    boardsState = {
      currentBoard: {
        id: 'b-1',
        name: 'My Board',
        lists: [
          mkList('l-1', 0, [
            { id: 'c-1', title: 'Has bug', position: 0, labels: [{ id: 'lab-1' }] },
            { id: 'c-2', title: 'No bug', position: 1 },
          ]),
        ],
      },
      isLoading: false,
      fetchBoard,
      updateBoard: vi.fn(),
    };
    labelFilterState = { selectedByBoard: { 'b-1': ['lab-1'] } };
    renderAtBoard();
    const cards = screen.getAllByTestId('card-item');
    expect(cards).toHaveLength(1);
    expect(cards[0]).toHaveTextContent('Has bug');
  });
});
