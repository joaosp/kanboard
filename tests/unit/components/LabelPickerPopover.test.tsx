import { createRef } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock(
  '../../../src/client/components/Label/LabelPickerPopover/LabelPickerPopover.module.css',
  () => ({ default: new Proxy({}, { get: (_t, p) => String(p) }) }),
);
vi.mock(
  '../../../src/client/components/Label/LabelChip/LabelChip.module.css',
  () => ({ default: new Proxy({}, { get: (_t, p) => String(p) }) }),
);
vi.mock('../../../src/client/components/shared/Input/Input.module.css', () => ({
  default: new Proxy({}, { get: (_t, p) => String(p) }),
}));
vi.mock('../../../src/client/components/shared/Spinner/Spinner.module.css', () => ({
  default: new Proxy({}, { get: (_t, p) => String(p) }),
}));

import { LabelPickerPopover } from '../../../src/client/components/Label/LabelPickerPopover/LabelPickerPopover';
import type { Label } from '../../../src/client/types';

const LABELS: Label[] = [
  {
    id: 'l1',
    boardId: 'b1',
    name: 'Bug',
    color: 'red',
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
  },
  {
    id: 'l2',
    boardId: 'b1',
    name: 'Urgent',
    color: 'amber',
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
  },
  {
    id: 'l3',
    boardId: 'b1',
    name: 'Design',
    color: 'blue',
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
  },
];

function setup(overrides: {
  attachedLabelIds?: string[];
  onAttach?: ReturnType<typeof vi.fn>;
  onDetach?: ReturnType<typeof vi.fn>;
  onClose?: ReturnType<typeof vi.fn>;
  onOpenManager?: ReturnType<typeof vi.fn>;
} = {}) {
  const onAttach = overrides.onAttach ?? vi.fn().mockResolvedValue(undefined);
  const onDetach = overrides.onDetach ?? vi.fn().mockResolvedValue(undefined);
  const onClose = overrides.onClose ?? vi.fn();
  const onOpenManager = overrides.onOpenManager ?? vi.fn();
  const anchorRef = createRef<HTMLButtonElement>();
  const attachedLabelIds = overrides.attachedLabelIds ?? [];

  const utils = render(
    <div>
      <button ref={anchorRef} data-testid="anchor">anchor</button>
      <LabelPickerPopover
        attachedLabelIds={attachedLabelIds}
        labels={LABELS}
        onAttach={onAttach}
        onDetach={onDetach}
        onClose={onClose}
        onOpenManager={onOpenManager}
        anchorRef={anchorRef}
      />
    </div>,
  );

  return { ...utils, onAttach, onDetach, onClose, onOpenManager };
}

describe('LabelPickerPopover', () => {
  it('renders a row per label', () => {
    setup();
    expect(screen.getByTestId('label-picker-popover')).toBeInTheDocument();
    expect(screen.getByTestId('label-picker-row-l1')).toBeInTheDocument();
    expect(screen.getByTestId('label-picker-row-l2')).toBeInTheDocument();
    expect(screen.getByTestId('label-picker-row-l3')).toBeInTheDocument();
  });

  it('calls onAttach when an unattached row is clicked', async () => {
    const { onAttach } = setup();
    fireEvent.click(screen.getByTestId('label-picker-row-l1'));
    await waitFor(() => expect(onAttach).toHaveBeenCalledWith('l1'));
  });

  it('calls onDetach when an attached row is clicked', async () => {
    const { onDetach } = setup({ attachedLabelIds: ['l1'] });
    fireEvent.click(screen.getByTestId('label-picker-row-l1'));
    await waitFor(() => expect(onDetach).toHaveBeenCalledWith('l1'));
  });

  it('reflects aria-checked based on attachedLabelIds', () => {
    setup({ attachedLabelIds: ['l2'] });
    expect(screen.getByTestId('label-picker-row-l1').getAttribute('aria-checked')).toBe('false');
    expect(screen.getByTestId('label-picker-row-l2').getAttribute('aria-checked')).toBe('true');
  });

  it('filters rows by search query', () => {
    setup();
    const search = screen.getByTestId('label-picker-search');
    fireEvent.change(search, { target: { value: 'des' } });
    expect(screen.queryByTestId('label-picker-row-l1')).not.toBeInTheDocument();
    expect(screen.queryByTestId('label-picker-row-l2')).not.toBeInTheDocument();
    expect(screen.getByTestId('label-picker-row-l3')).toBeInTheDocument();
  });

  it('shows empty-search message when no labels match', () => {
    setup();
    fireEvent.change(screen.getByTestId('label-picker-search'), {
      target: { value: 'zzzz' },
    });
    expect(screen.getByText(/No labels match/i)).toBeInTheDocument();
  });

  it('calls onClose when Escape is pressed', () => {
    const { onClose } = setup();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('calls onOpenManager when the footer link is clicked', () => {
    const { onOpenManager } = setup();
    fireEvent.click(screen.getByTestId('label-picker-manage'));
    expect(onOpenManager).toHaveBeenCalledOnce();
  });
});
