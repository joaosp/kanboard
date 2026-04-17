import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('../../../src/client/components/Card/CardItem/CardItem.module.css', () => ({
  default: { card: 'card', labelStrip: 'ls', overflow: 'ov', title: 't' },
}));
vi.mock('../../../src/client/components/Label/LabelChip/LabelChip.module.css', () => ({
  default: {
    chip: 'chip',
    solid: 'solid',
    outline: 'o',
    sm: 'sm',
    md: 'md',
    red: 'red',
    amber: 'amber',
    green: 'green',
    blue: 'blue',
    violet: 'violet',
    slate: 'slate',
  },
}));

const { openModal } = vi.hoisted(() => ({ openModal: vi.fn() }));

vi.mock('../../../src/client/stores/ui', () => ({
  useUiStore: ((sel: (s: { openModal: typeof openModal }) => unknown) =>
    sel({ openModal })) as never,
}));

import { CardItem } from '../../../src/client/components/Card/CardItem/CardItem';

const base = {
  id: 'c-1',
  listId: 'l-1',
  title: 'Buy milk',
  description: null,
  position: 0,
  createdAt: '2024-01-01',
  updatedAt: '2024-01-01',
};

function makeLabel(id: string, name: string, color = 'red') {
  return { id, boardId: 'b-1', name, color, createdAt: '2024-01-01', updatedAt: '2024-01-01' };
}

describe('CardItem', () => {
  beforeEach(() => {
    openModal.mockClear();
  });

  it('opens the modal with the card id on click', () => {
    render(<CardItem card={base as never} />);
    fireEvent.click(screen.getByTestId('card-item'));
    expect(openModal).toHaveBeenCalledWith('card:c-1');
  });

  it('does not render the label strip when there are no labels', () => {
    render(<CardItem card={base as never} />);
    expect(screen.queryByTestId('card-label-strip')).not.toBeInTheDocument();
  });

  it('renders all labels when three or fewer', () => {
    const card = {
      ...base,
      labels: [makeLabel('l-1', 'Bug'), makeLabel('l-2', 'Urgent'), makeLabel('l-3', 'Blocked')],
    };
    render(<CardItem card={card as never} />);
    expect(screen.getByTestId('card-label-strip')).toBeInTheDocument();
    expect(screen.queryByTestId('card-label-overflow')).not.toBeInTheDocument();
  });

  it('caps visible labels at 3 and shows an overflow count', () => {
    const card = {
      ...base,
      labels: [
        makeLabel('l-1', 'A'),
        makeLabel('l-2', 'B'),
        makeLabel('l-3', 'C'),
        makeLabel('l-4', 'D'),
        makeLabel('l-5', 'E'),
      ],
    };
    render(<CardItem card={card as never} />);
    expect(screen.getByTestId('card-label-overflow')).toHaveTextContent('+2');
  });
});
