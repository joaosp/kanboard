import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// CSS modules — each factory gets its own proxy so class access is non-throwing
vi.mock(
  '../../../src/client/components/Label/LabelManagerModal/LabelManagerModal.module.css',
  () => ({ default: new Proxy({}, { get: (_t, p) => String(p) }) }),
);
vi.mock(
  '../../../src/client/components/Label/LabelRow/LabelRow.module.css',
  () => ({ default: new Proxy({}, { get: (_t, p) => String(p) }) }),
);
vi.mock(
  '../../../src/client/components/Label/LabelChip/LabelChip.module.css',
  () => ({ default: new Proxy({}, { get: (_t, p) => String(p) }) }),
);
vi.mock(
  '../../../src/client/components/Label/LabelSwatchGrid/LabelSwatchGrid.module.css',
  () => ({ default: new Proxy({}, { get: (_t, p) => String(p) }) }),
);
vi.mock('../../../src/client/components/shared/Modal/Modal.module.css', () => ({
  default: new Proxy({}, { get: (_t, p) => String(p) }),
}));
vi.mock('../../../src/client/components/shared/Button/Button.module.css', () => ({
  default: new Proxy({}, { get: (_t, p) => String(p) }),
}));
vi.mock('../../../src/client/components/shared/Input/Input.module.css', () => ({
  default: new Proxy({}, { get: (_t, p) => String(p) }),
}));
vi.mock('../../../src/client/components/shared/Spinner/Spinner.module.css', () => ({
  default: new Proxy({}, { get: (_t, p) => String(p) }),
}));

// API mocked at the api boundary so the labels store code path is real
vi.mock('../../../src/client/api/labels', () => ({
  fetchBoardLabelsApi: vi.fn(),
  createLabelApi: vi.fn(),
  updateLabelApi: vi.fn(),
  deleteLabelApi: vi.fn(),
  attachLabelApi: vi.fn(),
  detachLabelApi: vi.fn(),
}));

// Stub the board store so post-mutation fetchBoard is a noop. The component
// accesses the store both via selector hooks and via .getState().fetchBoard.
vi.mock('../../../src/client/stores/boards', () => {
  const stableState = { currentBoard: null };
  const fetchBoard = vi.fn().mockResolvedValue(undefined);
  const hook = <T,>(selector: (s: typeof stableState) => T): T => selector(stableState);
  return {
    useBoardsStore: Object.assign(hook, {
      getState: () => ({ fetchBoard, currentBoard: null }),
    }),
  };
});

import { LabelManagerModal } from '../../../src/client/components/Label/LabelManagerModal/LabelManagerModal';
import {
  fetchBoardLabelsApi,
  createLabelApi,
} from '../../../src/client/api/labels';
import { useLabelsStore } from '../../../src/client/stores/labels';
import { useUiStore } from '../../../src/client/stores/ui';
import type { Label } from '../../../src/client/types';

const BOARD_ID = 'board-1';

function makeLabel(overrides: Partial<Label> = {}): Label {
  return {
    id: 'label-1',
    boardId: BOARD_ID,
    name: 'Bug',
    color: 'red',
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
    ...overrides,
  };
}

describe('LabelManagerModal', () => {
  let rootDiv: HTMLDivElement;

  beforeEach(() => {
    rootDiv = document.createElement('div');
    rootDiv.id = 'root';
    document.body.appendChild(rootDiv);
    useLabelsStore.setState({ byBoard: {}, isLoadingByBoard: {}, errorByBoard: {} });
    useUiStore.setState({ activeModal: `labels:${BOARD_ID}`, toasts: [] });
    vi.clearAllMocks();
  });

  afterEach(() => {
    document.body.removeChild(rootDiv);
  });

  it('renders empty state when the board has no labels', async () => {
    vi.mocked(fetchBoardLabelsApi).mockResolvedValue({ data: [] });

    render(<LabelManagerModal boardId={BOARD_ID} />);

    await waitFor(() => {
      expect(fetchBoardLabelsApi).toHaveBeenCalledWith(BOARD_ID);
    });
    expect(
      await screen.findByText(/No labels on this board yet/i),
    ).toBeInTheDocument();
    expect(screen.getByTestId('label-manager-modal')).toBeInTheDocument();
    expect(screen.getByTestId('label-create-name')).toBeInTheDocument();
    expect(screen.getByTestId('label-create-submit')).toBeInTheDocument();
  });

  it('renders a row for each existing label', async () => {
    const label = makeLabel();
    vi.mocked(fetchBoardLabelsApi).mockResolvedValue({ data: [label] });

    render(<LabelManagerModal boardId={BOARD_ID} />);

    expect(await screen.findByTestId(`label-row-${label.id}`)).toBeInTheDocument();
    expect(screen.getByTestId(`label-edit-${label.id}`)).toBeInTheDocument();
    expect(screen.getByTestId(`label-delete-${label.id}`)).toBeInTheDocument();
  });

  it('submits the create form and clears inputs on success', async () => {
    vi.mocked(fetchBoardLabelsApi).mockResolvedValue({ data: [] });
    const created = makeLabel({ id: 'new-1', name: 'Bug', color: 'red' });
    vi.mocked(createLabelApi).mockResolvedValue({ data: created });

    render(<LabelManagerModal boardId={BOARD_ID} />);

    await waitFor(() => expect(fetchBoardLabelsApi).toHaveBeenCalled());

    const nameInput = screen.getByTestId('label-create-name') as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: 'Bug' } });

    // swatch for red in create form
    fireEvent.click(screen.getByTestId('label-swatch-create-red'));

    const submit = screen.getByTestId('label-create-submit');
    expect(submit).not.toBeDisabled();

    fireEvent.click(submit);

    await waitFor(() => {
      expect(createLabelApi).toHaveBeenCalledWith(BOARD_ID, { name: 'Bug', color: 'red' });
    });
    await waitFor(() => {
      expect((nameInput as HTMLInputElement).value).toBe('');
    });
  });

  it('shows inline duplicate-name error when create fails with 400', async () => {
    vi.mocked(fetchBoardLabelsApi).mockResolvedValue({ data: [] });
    vi.mocked(createLabelApi).mockRejectedValue(
      new Error('A label named "Bug" already exists on this board.'),
    );

    render(<LabelManagerModal boardId={BOARD_ID} />);

    await waitFor(() => expect(fetchBoardLabelsApi).toHaveBeenCalled());

    fireEvent.change(screen.getByTestId('label-create-name'), {
      target: { value: 'Bug' },
    });
    fireEvent.click(screen.getByTestId('label-swatch-create-red'));
    fireEvent.click(screen.getByTestId('label-create-submit'));

    expect(await screen.findByText(/already exists on this board/i)).toBeInTheDocument();
  });

  it('disables the create submit button until name + color are set', async () => {
    vi.mocked(fetchBoardLabelsApi).mockResolvedValue({ data: [] });

    render(<LabelManagerModal boardId={BOARD_ID} />);

    await waitFor(() => expect(fetchBoardLabelsApi).toHaveBeenCalled());

    const submit = screen.getByTestId('label-create-submit');
    expect(submit).toBeDisabled();

    fireEvent.change(screen.getByTestId('label-create-name'), {
      target: { value: 'Bug' },
    });
    expect(submit).toBeDisabled();

    fireEvent.click(screen.getByTestId('label-swatch-create-amber'));
    expect(submit).not.toBeDisabled();
  });
});
