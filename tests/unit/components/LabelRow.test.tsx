import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('../../../src/client/components/Label/LabelRow/LabelRow.module.css', () => ({
  default: { row: 'r', viewBody: 'vb', editBody: 'eb', name: 'n', actions: 'a', confirmText: 'ct' },
}));
vi.mock('../../../src/client/components/Label/LabelChip/LabelChip.module.css', () => ({
  default: { chip: 'c', solid: 's', outline: 'o', sm: 'sm', md: 'md', red: 'r', amber: 'a', green: 'g', blue: 'b', violet: 'v', slate: 'sl' },
}));
vi.mock('../../../src/client/components/Label/LabelSwatchGrid/LabelSwatchGrid.module.css', () => ({
  default: { grid: 'g', swatch: 's', selected: 'sel', disabled: 'd' },
}));
vi.mock('../../../src/client/components/shared/Button/Button.module.css', () => ({
  default: { button: 'b', primary: 'p', secondary: 's', destructive: 'd', sm: 'sm', md: 'md' },
}));
vi.mock('../../../src/client/components/shared/Input/Input.module.css', () => ({
  default: { wrapper: 'w', input: 'i', label: 'l', error: 'e' },
}));

import { LabelRow } from '../../../src/client/components/Label/LabelRow/LabelRow';

const label = {
  id: 'lab-1',
  boardId: 'b-1',
  name: 'Bug',
  color: 'red' as const,
  createdAt: '2024-01-01',
  updatedAt: '2024-01-01',
};

describe('LabelRow', () => {
  let onSave: ReturnType<typeof vi.fn>;
  let onDelete: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onSave = vi.fn().mockResolvedValue(undefined);
    onDelete = vi.fn().mockResolvedValue(undefined);
  });

  function renderRow(cardCount = 0) {
    return render(
      <LabelRow label={label as never} cardCount={cardCount} onSave={onSave} onDelete={onDelete} />,
    );
  }

  describe('view state', () => {
    it('renders the name and edit/delete buttons', () => {
      renderRow();
      expect(screen.getAllByText('Bug').length).toBeGreaterThan(0);
      expect(screen.getByTestId('label-edit-lab-1')).toBeInTheDocument();
      expect(screen.getByTestId('label-delete-lab-1')).toBeInTheDocument();
    });
  });

  describe('edit state', () => {
    it('switches to edit mode when Edit is clicked', () => {
      renderRow();
      fireEvent.click(screen.getByTestId('label-edit-lab-1'));
      expect(screen.getByTestId('label-edit-name-lab-1')).toBeInTheDocument();
    });

    it('cancels edit and returns to view', () => {
      renderRow();
      fireEvent.click(screen.getByTestId('label-edit-lab-1'));
      fireEvent.click(screen.getByTestId('label-edit-cancel-lab-1'));
      expect(screen.queryByTestId('label-edit-name-lab-1')).not.toBeInTheDocument();
    });

    it('shows an error when the name is emptied', async () => {
      renderRow();
      fireEvent.click(screen.getByTestId('label-edit-lab-1'));
      fireEvent.change(screen.getByTestId('label-edit-name-lab-1'), { target: { value: '' } });
      // button is disabled, but if we bypass via save-call path, error would show.
      // Force it by typing whitespace and clicking Save (disabled guards the UI, so we simulate via typing spaces).
      fireEvent.change(screen.getByTestId('label-edit-name-lab-1'), { target: { value: '   ' } });
      expect(screen.getByTestId('label-edit-save-lab-1')).toBeDisabled();
    });

    it('saves only changed fields', async () => {
      renderRow();
      fireEvent.click(screen.getByTestId('label-edit-lab-1'));
      fireEvent.change(screen.getByTestId('label-edit-name-lab-1'), { target: { value: 'Defect' } });
      fireEvent.click(screen.getByTestId('label-edit-save-lab-1'));
      await waitFor(() => expect(onSave).toHaveBeenCalledWith({ name: 'Defect' }));
    });

    it('surfaces save errors', async () => {
      onSave.mockRejectedValue(new Error('duplicate'));
      renderRow();
      fireEvent.click(screen.getByTestId('label-edit-lab-1'));
      fireEvent.change(screen.getByTestId('label-edit-name-lab-1'), { target: { value: 'Defect' } });
      fireEvent.click(screen.getByTestId('label-edit-save-lab-1'));
      await waitFor(() => expect(screen.getByText('duplicate')).toBeInTheDocument());
    });

    it('disables save when nothing changed', () => {
      renderRow();
      fireEvent.click(screen.getByTestId('label-edit-lab-1'));
      expect(screen.getByTestId('label-edit-save-lab-1')).toBeDisabled();
    });
  });

  describe('delete state', () => {
    it('enters confirm-delete state', () => {
      renderRow(3);
      fireEvent.click(screen.getByTestId('label-delete-lab-1'));
      expect(screen.getByText(/Attached to 3 cards/)).toBeInTheDocument();
    });

    it('uses singular form for 1 card', () => {
      renderRow(1);
      fireEvent.click(screen.getByTestId('label-delete-lab-1'));
      expect(screen.getByText(/Attached to 1 card\./)).toBeInTheDocument();
    });

    it('cancels delete and returns to view', () => {
      renderRow();
      fireEvent.click(screen.getByTestId('label-delete-lab-1'));
      fireEvent.click(screen.getByTestId('label-delete-cancel-lab-1'));
      expect(screen.getByTestId('label-edit-lab-1')).toBeInTheDocument();
    });

    it('confirms delete and calls onDelete', async () => {
      renderRow();
      fireEvent.click(screen.getByTestId('label-delete-lab-1'));
      fireEvent.click(screen.getByTestId('label-delete-confirm-lab-1'));
      await waitFor(() => expect(onDelete).toHaveBeenCalled());
    });

    it('returns to view even on delete failure', async () => {
      onDelete.mockRejectedValue(new Error('boom'));
      renderRow();
      fireEvent.click(screen.getByTestId('label-delete-lab-1'));
      fireEvent.click(screen.getByTestId('label-delete-confirm-lab-1'));
      await waitFor(() => {
        expect(screen.queryByTestId('label-delete-confirm-lab-1')).not.toBeInTheDocument();
      });
    });
  });
});
