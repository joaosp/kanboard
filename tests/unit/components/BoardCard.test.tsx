import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../../../src/client/components/Board/BoardCard/BoardCard.module.css', () => ({
  default: { card: 'card', name: 'name', meta: 'meta' },
}));

const navigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => navigate };
});

import { BoardCard } from '../../../src/client/components/Board/BoardCard/BoardCard';

describe('BoardCard', () => {
  beforeEach(() => {
    navigate.mockClear();
  });

  const baseBoard = {
    id: 'b-1',
    name: 'My Board',
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
  };

  it('navigates to the board on click', () => {
    render(
      <MemoryRouter>
        <BoardCard board={baseBoard as never} />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByTestId('board-card'));
    expect(navigate).toHaveBeenCalledWith('/boards/b-1');
  });

  it('pluralizes "members" with multiple members', () => {
    const board = { ...baseBoard, members: [{ userId: 'a' }, { userId: 'b' }] };
    render(
      <MemoryRouter>
        <BoardCard board={board as never} />
      </MemoryRouter>,
    );
    expect(screen.getByText(/2 members/)).toBeInTheDocument();
  });

  it('singularizes with exactly one member', () => {
    const board = { ...baseBoard, members: [{ userId: 'a' }] };
    render(
      <MemoryRouter>
        <BoardCard board={board as never} />
      </MemoryRouter>,
    );
    expect(screen.getByText(/1 member$/)).toBeInTheDocument();
  });

  it('shows 0 members when members is missing', () => {
    render(
      <MemoryRouter>
        <BoardCard board={baseBoard as never} />
      </MemoryRouter>,
    );
    expect(screen.getByText(/0 members/)).toBeInTheDocument();
  });
});
