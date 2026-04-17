import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../../../src/client/components/Board/BoardHeader/BoardHeader.module.css', () => ({
  default: {
    header: 'h',
    backLink: 'bl',
    nameContainer: 'nc',
    editInput: 'ei',
    name: 'n',
    editButton: 'eb',
    actions: 'a',
    manageLabelsButton: 'mlb',
  },
}));

const { updateBoard, openModal } = vi.hoisted(() => ({
  updateBoard: vi.fn(),
  openModal: vi.fn(),
}));

vi.mock('../../../src/client/stores/boards', () => ({
  useBoardsStore: ((sel: (s: { updateBoard: typeof updateBoard }) => unknown) =>
    sel({ updateBoard })) as never,
}));

vi.mock('../../../src/client/stores/ui', () => ({
  useUiStore: ((sel: (s: { openModal: typeof openModal }) => unknown) =>
    sel({ openModal })) as never,
}));

import { BoardHeader } from '../../../src/client/components/Board/BoardHeader/BoardHeader';

const board = {
  id: 'b-1',
  name: 'My Board',
  createdAt: '2024-01-01',
  updatedAt: '2024-01-01',
};

describe('BoardHeader', () => {
  beforeEach(() => {
    updateBoard.mockReset();
    updateBoard.mockResolvedValue(undefined);
    openModal.mockClear();
  });

  function renderHeader() {
    return render(
      <MemoryRouter>
        <BoardHeader board={board as never} />
      </MemoryRouter>,
    );
  }

  it('renders board name and edit + manage-labels buttons', () => {
    renderHeader();
    expect(screen.getByTestId('board-name')).toHaveTextContent('My Board');
    expect(screen.getByTestId('edit-board-name')).toBeInTheDocument();
    expect(screen.getByTestId('manage-labels-button')).toBeInTheDocument();
  });

  it('clicking edit swaps in an input with the current name', () => {
    renderHeader();
    fireEvent.click(screen.getByTestId('edit-board-name'));
    expect((screen.getByTestId('board-name-input') as HTMLInputElement).value).toBe('My Board');
  });

  it('saves a new name on blur when changed', async () => {
    renderHeader();
    fireEvent.click(screen.getByTestId('edit-board-name'));
    const input = screen.getByTestId('board-name-input');
    fireEvent.change(input, { target: { value: 'Renamed' } });
    fireEvent.blur(input);
    await waitFor(() => expect(updateBoard).toHaveBeenCalledWith('b-1', 'Renamed'));
  });

  it('does not update when the name is unchanged', async () => {
    renderHeader();
    fireEvent.click(screen.getByTestId('edit-board-name'));
    fireEvent.blur(screen.getByTestId('board-name-input'));
    await waitFor(() => {
      expect(screen.queryByTestId('board-name-input')).not.toBeInTheDocument();
    });
    expect(updateBoard).not.toHaveBeenCalled();
  });

  it('does not update when the name is empty', async () => {
    renderHeader();
    fireEvent.click(screen.getByTestId('edit-board-name'));
    const input = screen.getByTestId('board-name-input');
    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.blur(input);
    await waitFor(() => expect(screen.queryByTestId('board-name-input')).not.toBeInTheDocument());
    expect(updateBoard).not.toHaveBeenCalled();
  });

  it('saves on Enter key', async () => {
    renderHeader();
    fireEvent.click(screen.getByTestId('edit-board-name'));
    const input = screen.getByTestId('board-name-input');
    fireEvent.change(input, { target: { value: 'Renamed' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    await waitFor(() => expect(updateBoard).toHaveBeenCalledWith('b-1', 'Renamed'));
  });

  it('cancels on Escape key', () => {
    renderHeader();
    fireEvent.click(screen.getByTestId('edit-board-name'));
    const input = screen.getByTestId('board-name-input');
    fireEvent.change(input, { target: { value: 'DifferentName' } });
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(screen.queryByTestId('board-name-input')).not.toBeInTheDocument();
    expect(updateBoard).not.toHaveBeenCalled();
  });

  it('manage-labels opens the label modal for the current board', () => {
    renderHeader();
    fireEvent.click(screen.getByTestId('manage-labels-button'));
    expect(openModal).toHaveBeenCalledWith('labels:b-1');
  });
});
