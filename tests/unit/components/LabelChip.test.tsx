import { render, screen, fireEvent } from '@testing-library/react';
import { LabelChip } from '../../../src/client/components/Label/LabelChip/LabelChip';

vi.mock('../../../src/client/components/Label/LabelChip/LabelChip.module.css', () => ({
  default: {
    chip: 'chip',
    solid: 'solid',
    outline: 'outline',
    sm: 'sm',
    md: 'md',
    pending: 'pending',
    name: 'name',
    remove: 'remove',
  },
}));

vi.mock('../../../src/client/components/shared/Spinner/Spinner.module.css', () => ({
  default: { spinner: 'spinner', sm: 'sm', md: 'md', lg: 'lg' },
}));

const baseLabel = {
  id: 'label-1',
  name: 'Bug',
  color: 'red' as const,
};

describe('LabelChip', () => {
  it('renders the label name', () => {
    render(<LabelChip label={baseLabel} />);
    expect(screen.getByText('Bug')).toBeInTheDocument();
    expect(screen.getByTestId('card-label-chip-label-1')).toBeInTheDocument();
  });

  it('renders solid variant by default', () => {
    render(<LabelChip label={baseLabel} />);
    const chip = screen.getByTestId('card-label-chip-label-1');
    expect(chip.className).toContain('solid');
  });

  it('renders outline variant when requested', () => {
    render(<LabelChip label={baseLabel} variant="outline" />);
    const chip = screen.getByTestId('card-label-chip-label-1');
    expect(chip.className).toContain('outline');
  });

  it('uses the testIdPrefix for testid attributes', () => {
    render(<LabelChip label={baseLabel} testIdPrefix="card-modal-label" />);
    expect(screen.getByTestId('card-modal-label-label-1')).toBeInTheDocument();
  });

  it('fires onRemove when the remove button is clicked', () => {
    const onRemove = vi.fn();
    render(
      <LabelChip label={baseLabel} testIdPrefix="card-modal-label" onRemove={onRemove} />,
    );
    fireEvent.click(screen.getByTestId('card-modal-label-remove-label-1'));
    expect(onRemove).toHaveBeenCalledOnce();
  });

  it('does not render remove button when onRemove is not provided', () => {
    render(<LabelChip label={baseLabel} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders as a button when onClick is provided and fires it', () => {
    const onClick = vi.fn();
    render(<LabelChip label={baseLabel} onClick={onClick} testIdPrefix="filter-label-toggle" />);
    fireEvent.click(screen.getByTestId('filter-label-toggle-label-1'));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('shows pending state with spinner when isPending', () => {
    const onRemove = vi.fn();
    render(
      <LabelChip
        label={baseLabel}
        testIdPrefix="card-modal-label"
        onRemove={onRemove}
        isPending
      />,
    );
    const removeBtn = screen.getByTestId('card-modal-label-remove-label-1');
    expect(removeBtn).toBeDisabled();
    expect(screen.getByTestId('spinner')).toBeInTheDocument();
  });

  it('carries data-color attribute for CSS palette mapping', () => {
    render(<LabelChip label={{ ...baseLabel, color: 'blue' }} />);
    const chip = screen.getByTestId('card-label-chip-label-1');
    expect(chip.getAttribute('data-color')).toBe('blue');
  });

  it('supports overflow rendering alongside a strip', () => {
    const { container } = render(
      <div data-testid="card-label-strip">
        <LabelChip label={{ id: 'a', name: 'Bug', color: 'red' }} />
        <LabelChip label={{ id: 'b', name: 'Urg', color: 'amber' }} />
        <LabelChip label={{ id: 'c', name: 'Des', color: 'green' }} />
        <span data-testid="card-label-overflow">+2</span>
      </div>,
    );
    expect(screen.getByTestId('card-label-strip')).toBeInTheDocument();
    expect(screen.getByTestId('card-label-overflow')).toHaveTextContent('+2');
    expect(container.querySelectorAll('[data-testid^="card-label-chip-"]').length).toBe(3);
  });
});
