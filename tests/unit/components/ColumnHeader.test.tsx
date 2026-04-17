import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

vi.mock('../../../src/client/components/Column/ColumnHeader/ColumnHeader.module.css', () => ({
  default: { header: 'h', left: 'l', name: 'n', count: 'c', deleteButton: 'd' },
}));

const { deleteListApi, fetchBoard } = vi.hoisted(() => ({
  deleteListApi: vi.fn(),
  fetchBoard: vi.fn(),
}));

vi.mock('../../../src/client/api/lists', () => ({ deleteListApi }));

vi.mock('../../../src/client/stores/boards', () => ({
  useBoardsStore: ((sel: (s: { fetchBoard: typeof fetchBoard }) => unknown) =>
    sel({ fetchBoard })) as never,
}));

import { ColumnHeader } from '../../../src/client/components/Column/ColumnHeader/ColumnHeader';

function renderWithBoardId(list: object, boardId: string | undefined) {
  return render(
    <MemoryRouter initialEntries={[boardId ? `/boards/${boardId}` : '/boards']}>
      <Routes>
        <Route path="/boards/:boardId" element={<ColumnHeader list={list as never} />} />
        <Route path="/boards" element={<ColumnHeader list={list as never} />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ColumnHeader', () => {
  beforeEach(() => {
    deleteListApi.mockReset();
    deleteListApi.mockResolvedValue(undefined);
    fetchBoard.mockReset();
  });

  it('renders the list name and card count', () => {
    renderWithBoardId({ id: 'l-1', name: 'Todo', cards: [{ id: 'c-1' }, { id: 'c-2' }] }, 'b-1');
    expect(screen.getByText('Todo')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('shows 0 when cards are missing', () => {
    renderWithBoardId({ id: 'l-1', name: 'Todo' }, 'b-1');
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('deletes the list and refetches the board on click', async () => {
    renderWithBoardId({ id: 'l-1', name: 'Todo', cards: [] }, 'b-1');
    fireEvent.click(screen.getByTestId('delete-list-button'));
    await waitFor(() => {
      expect(deleteListApi).toHaveBeenCalledWith('l-1');
      expect(fetchBoard).toHaveBeenCalledWith('b-1');
    });
  });

  it('does not refetch when there is no boardId param', async () => {
    renderWithBoardId({ id: 'l-1', name: 'Todo', cards: [] }, undefined);
    fireEvent.click(screen.getByTestId('delete-list-button'));
    await waitFor(() => {
      expect(deleteListApi).toHaveBeenCalledWith('l-1');
    });
    expect(fetchBoard).not.toHaveBeenCalled();
  });
});
