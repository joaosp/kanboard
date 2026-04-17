import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../../../src/client/components/Board/BoardList/BoardList.module.css', () => ({
  default: { container: 'c', header: 'h', title: 't', grid: 'g', loading: 'l' },
}));
vi.mock('../../../src/client/components/Board/BoardCard/BoardCard.module.css', () => ({
  default: { card: 'c', name: 'n', meta: 'm' },
}));
vi.mock('../../../src/client/components/Board/CreateBoardModal/CreateBoardModal.module.css', () => ({
  default: { form: 'f', actions: 'a' },
}));
vi.mock('../../../src/client/components/shared/Button/Button.module.css', () => ({
  default: { button: 'b', primary: 'p', secondary: 's', sm: 'sm', md: 'md' },
}));
vi.mock('../../../src/client/components/shared/Input/Input.module.css', () => ({
  default: { wrapper: 'w', input: 'i', label: 'l' },
}));
vi.mock('../../../src/client/components/shared/Modal/Modal.module.css', () => ({
  default: { overlay: 'o', modal: 'm', header: 'h', title: 't', close: 'c' },
}));
vi.mock('../../../src/client/components/shared/Spinner/Spinner.module.css', () => ({
  default: { spinner: 's', lg: 'lg', md: 'md', sm: 'sm' },
}));

const { fetchBoards, openModal, createBoard } = vi.hoisted(() => ({
  fetchBoards: vi.fn(),
  openModal: vi.fn(),
  createBoard: vi.fn(),
}));

let boardsState = {
  boards: [] as Array<{ id: string; name: string }>,
  isLoading: false,
  fetchBoards,
  createBoard,
};

let uiState = {
  activeModal: null as string | null,
  openModal,
  closeModal: vi.fn(),
};

vi.mock('../../../src/client/stores/boards', () => ({
  useBoardsStore: ((sel?: (s: typeof boardsState) => unknown) =>
    sel ? sel(boardsState) : boardsState) as never,
}));

vi.mock('../../../src/client/stores/ui', () => ({
  useUiStore: ((sel?: (s: typeof uiState) => unknown) =>
    sel ? sel(uiState) : uiState) as never,
}));

import { BoardList } from '../../../src/client/components/Board/BoardList/BoardList';

describe('BoardList', () => {
  let rootDiv: HTMLDivElement;

  beforeEach(() => {
    rootDiv = document.createElement('div');
    rootDiv.id = 'root';
    document.body.appendChild(rootDiv);

    fetchBoards.mockClear();
    openModal.mockClear();
    boardsState = { boards: [], isLoading: false, fetchBoards, createBoard };
    uiState = { activeModal: null, openModal, closeModal: vi.fn() };
  });

  afterEach(() => {
    document.body.removeChild(rootDiv);
  });

  it('calls fetchBoards on mount', async () => {
    render(
      <MemoryRouter>
        <BoardList />
      </MemoryRouter>,
    );
    await waitFor(() => expect(fetchBoards).toHaveBeenCalled());
  });

  it('renders a spinner while loading and no boards', () => {
    boardsState = { boards: [], isLoading: true, fetchBoards, createBoard };
    render(
      <MemoryRouter>
        <BoardList />
      </MemoryRouter>,
    );
    expect(screen.queryByText('My Boards')).not.toBeInTheDocument();
  });

  it('renders all boards from the store', () => {
    boardsState = {
      boards: [
        { id: 'b-1', name: 'Alpha' },
        { id: 'b-2', name: 'Beta' },
      ],
      isLoading: false,
      fetchBoards,
      createBoard,
    };
    render(
      <MemoryRouter>
        <BoardList />
      </MemoryRouter>,
    );
    expect(screen.getAllByTestId('board-card')).toHaveLength(2);
  });

  it('opens the create-board modal on button click', () => {
    render(
      <MemoryRouter>
        <BoardList />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByTestId('create-board-button'));
    expect(openModal).toHaveBeenCalledWith('createBoard');
  });
});
