import { render, screen } from '@testing-library/react';

vi.mock('../../../src/client/components/Card/DragCardPreview/DragCardPreview.module.css', () => ({
  default: { preview: 'preview', labelStrip: 'ls', overflow: 'ov', title: 't' },
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
    purple: 'purple',
    slate: 'slate',
  },
}));

import { DragCardPreview } from '../../../src/client/components/Card/DragCardPreview/DragCardPreview';

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

describe('DragCardPreview', () => {
  it('renders the card title', () => {
    render(<DragCardPreview card={base as never} />);
    expect(screen.getByText('Buy milk')).toBeInTheDocument();
  });

  it('renders with the drag-overlay testid on the root', () => {
    render(<DragCardPreview card={base as never} />);
    expect(screen.getByTestId('drag-overlay')).toBeInTheDocument();
  });

  it('renders the inner card testid for a specific card id', () => {
    render(<DragCardPreview card={base as never} />);
    expect(screen.getByTestId('drag-overlay-card-c-1')).toBeInTheDocument();
  });

  it('renders labels when present', () => {
    const card = {
      ...base,
      labels: [makeLabel('l-1', 'Bug'), makeLabel('l-2', 'Urgent')],
    };
    render(<DragCardPreview card={card as never} />);
    expect(screen.getByLabelText('Bug label')).toBeInTheDocument();
    expect(screen.getByLabelText('Urgent label')).toBeInTheDocument();
  });

  it('shows overflow count when labels exceed the visible cap', () => {
    const card = {
      ...base,
      labels: [
        makeLabel('l-1', 'A'),
        makeLabel('l-2', 'B'),
        makeLabel('l-3', 'C'),
        makeLabel('l-4', 'D'),
      ],
    };
    render(<DragCardPreview card={card as never} />);
    expect(screen.getByText('+1')).toBeInTheDocument();
  });

  it('has no onClick handler on the root element', () => {
    const { container } = render(<DragCardPreview card={base as never} />);
    const root = container.querySelector('[data-testid="drag-overlay"]');
    expect(root).not.toBeNull();
    // onclick is null on DOM nodes with no handler attached
    expect((root as HTMLElement).onclick).toBeNull();
  });
});
