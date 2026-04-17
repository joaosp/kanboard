import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

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
  default: { overlay: 'o', modal: 'm', header: 'h', title: 't', close: 'c', body: 'b' },
}));

const navigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => navigate };
});

const createBoard = vi.fn();
vi.mock('../../../src/client/stores/boards', () => ({
  useBoardsStore: ((sel: (s: { createBoard: typeof createBoard }) => unknown) =>
    sel({ createBoard })) as never,
}));

const closeModal = vi.fn();
vi.mock('../../../src/client/stores/ui', () => ({
  useUiStore: ((sel: (s: { closeModal: typeof closeModal }) => unknown) =>
    sel({ closeModal })) as never,
}));

import { CreateBoardModal } from '../../../src/client/components/Board/CreateBoardModal/CreateBoardModal';

describe('CreateBoardModal', () => {
  let rootDiv: HTMLDivElement;

  beforeEach(() => {
    rootDiv = document.createElement('div');
    rootDiv.id = 'root';
    document.body.appendChild(rootDiv);

    navigate.mockClear();
    createBoard.mockReset();
    closeModal.mockClear();
    createBoard.mockResolvedValue({ id: 'b-1', name: 'My Board' });
  });

  afterEach(() => {
    document.body.removeChild(rootDiv);
  });

  it('renders nothing when closed', () => {
    render(
      <MemoryRouter>
        <CreateBoardModal isOpen={false} />
      </MemoryRouter>,
    );
    expect(screen.queryByTestId('create-board-form')).not.toBeInTheDocument();
  });

  it('creates a board, closes the modal, and navigates on submit', async () => {
    render(
      <MemoryRouter>
        <CreateBoardModal isOpen={true} />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByTestId('create-board-name'), {
      target: { value: '  My Board  ' },
    });
    fireEvent.submit(screen.getByTestId('create-board-form'));

    await waitFor(() => {
      expect(createBoard).toHaveBeenCalledWith('My Board');
      expect(closeModal).toHaveBeenCalled();
      expect(navigate).toHaveBeenCalledWith('/boards/b-1');
    });
  });

  it('does not submit when the name is only whitespace', () => {
    render(
      <MemoryRouter>
        <CreateBoardModal isOpen={true} />
      </MemoryRouter>,
    );
    fireEvent.change(screen.getByTestId('create-board-name'), { target: { value: '   ' } });
    fireEvent.submit(screen.getByTestId('create-board-form'));
    expect(createBoard).not.toHaveBeenCalled();
  });

  it('cancel clears input and closes the modal', () => {
    render(
      <MemoryRouter>
        <CreateBoardModal isOpen={true} />
      </MemoryRouter>,
    );
    fireEvent.change(screen.getByTestId('create-board-name'), { target: { value: 'X' } });
    fireEvent.click(screen.getByTestId('create-board-cancel'));
    expect(closeModal).toHaveBeenCalled();
  });
});
