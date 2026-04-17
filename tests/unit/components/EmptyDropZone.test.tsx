import { render, screen } from '@testing-library/react';
import { DndContext } from '@dnd-kit/core';

vi.mock('../../../src/client/components/Column/EmptyDropZone/EmptyDropZone.module.css', () => ({
  default: { zone: 'zone', zoneOver: 'zone-over' },
}));

import { EmptyDropZone } from '../../../src/client/components/Column/EmptyDropZone/EmptyDropZone';

function renderWithDnd(ui: React.ReactElement) {
  return render(<DndContext>{ui}</DndContext>);
}

describe('EmptyDropZone', () => {
  it('renders with a testid scoped to the list id', () => {
    renderWithDnd(<EmptyDropZone listId="list-123" />);
    expect(screen.getByTestId('column-empty-drop-list-123')).toBeInTheDocument();
  });

  it('renders prompt text', () => {
    renderWithDnd(<EmptyDropZone listId="list-abc" />);
    expect(screen.getByText(/drop cards here/i)).toBeInTheDocument();
  });
});
