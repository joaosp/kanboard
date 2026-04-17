import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../../../src/client/components/Column/ColumnView/ColumnView.module.css', () => ({
  default: { column: 'col', cards: 'cards', footer: 'footer' },
}));
vi.mock('../../../src/client/components/Column/ColumnHeader/ColumnHeader.module.css', () => ({
  default: { header: 'h', left: 'l', name: 'n', count: 'c', deleteButton: 'd' },
}));
vi.mock('../../../src/client/components/Card/CardItem/CardItem.module.css', () => ({
  default: { card: 'card', labelStrip: 'ls', overflow: 'ov', title: 't' },
}));
vi.mock('../../../src/client/components/Column/AddCardForm/AddCardForm.module.css', () => ({
  default: { form: 'form', input: 'input' },
}));
vi.mock('../../../src/client/components/shared/Button/Button.module.css', () => ({
  default: { button: 'b', primary: 'p', secondary: 's', sm: 'sm', md: 'md' },
}));
vi.mock('../../../src/client/components/Label/LabelChip/LabelChip.module.css', () => ({
  default: { chip: 'c', solid: 's', outline: 'o', sm: 'sm', md: 'md', red: 'r' },
}));

vi.mock('../../../src/client/api/lists', () => ({ deleteListApi: vi.fn() }));

vi.mock('../../../src/client/stores/ui', () => ({
  useUiStore: () => ({ openModal: vi.fn() }),
}));

vi.mock('../../../src/client/stores/boards', () => ({
  useBoardsStore: () => ({ fetchBoard: vi.fn() }),
}));

vi.mock('../../../src/client/stores/cards', () => ({
  useCardsStore: () => ({ createCard: vi.fn() }),
}));

import { ColumnView } from '../../../src/client/components/Column/ColumnView/ColumnView';

const mkCard = (id: string, title: string, position: number) => ({
  id,
  listId: 'l-1',
  title,
  description: null,
  position,
  createdAt: '2024-01-01',
  updatedAt: '2024-01-01',
});

describe('ColumnView', () => {
  function renderView(list: object) {
    return render(
      <MemoryRouter>
        <ColumnView list={list as never} />
      </MemoryRouter>,
    );
  }

  it('renders header, cards, and add-card form', () => {
    const list = { id: 'l-1', boardId: 'b-1', name: 'Todo', position: 0, cards: [mkCard('c-1', 'A', 0)] };
    renderView(list);
    expect(screen.getByTestId('column-header')).toBeInTheDocument();
    expect(screen.getByTestId('add-card-form')).toBeInTheDocument();
    expect(screen.getAllByTestId('card-item')).toHaveLength(1);
  });

  it('sorts cards by position', () => {
    const list = {
      id: 'l-1',
      boardId: 'b-1',
      name: 'Todo',
      position: 0,
      cards: [mkCard('c-a', 'Third', 3), mkCard('c-b', 'First', 1), mkCard('c-c', 'Second', 2)],
    };
    renderView(list);
    const titles = screen.getAllByTestId('card-item').map((el) => el.textContent);
    expect(titles).toEqual(['First', 'Second', 'Third']);
  });

  it('handles missing cards array gracefully', () => {
    renderView({ id: 'l-1', boardId: 'b-1', name: 'Todo', position: 0 });
    expect(screen.queryAllByTestId('card-item')).toHaveLength(0);
  });
});
