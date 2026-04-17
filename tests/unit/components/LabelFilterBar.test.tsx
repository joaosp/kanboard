import { act, render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock(
  '../../../src/client/components/Label/LabelFilterBar/LabelFilterBar.module.css',
  () => ({ default: new Proxy({}, { get: (_t, p) => String(p) }) }),
);
vi.mock(
  '../../../src/client/components/Label/LabelChip/LabelChip.module.css',
  () => ({ default: new Proxy({}, { get: (_t, p) => String(p) }) }),
);
vi.mock('../../../src/client/components/shared/Spinner/Spinner.module.css', () => ({
  default: new Proxy({}, { get: (_t, p) => String(p) }),
}));

// Stub the labels store API so fetchLabels does not clobber the labels we
// pre-seed via useLabelsStore.setState. LabelFilterBar invokes fetchLabels on
// mount; the mock echoes back whatever the store currently holds for the board.
vi.mock('../../../src/client/api/labels', () => ({
  fetchBoardLabelsApi: vi.fn(),
  createLabelApi: vi.fn(),
  updateLabelApi: vi.fn(),
  deleteLabelApi: vi.fn(),
  attachLabelApi: vi.fn(),
  detachLabelApi: vi.fn(),
}));

vi.mock('../../../src/client/stores/boards', () => {
  const fetchBoard = vi.fn().mockResolvedValue(undefined);
  const stableState = { currentBoard: null };
  const hook = <T,>(selector: (s: typeof stableState) => T): T => selector(stableState);
  return {
    useBoardsStore: Object.assign(hook, {
      getState: () => ({ fetchBoard, currentBoard: null }),
    }),
  };
});

import { LabelFilterBar } from '../../../src/client/components/Label/LabelFilterBar/LabelFilterBar';
import { useLabelsStore } from '../../../src/client/stores/labels';
import { useLabelFilterStore } from '../../../src/client/stores/labelFilter';
import { useUiStore } from '../../../src/client/stores/ui';
import { fetchBoardLabelsApi } from '../../../src/client/api/labels';
import type { Label } from '../../../src/client/types';

const BOARD_ID = 'board-1';

function makeLabel(overrides: Partial<Label> = {}): Label {
  return {
    id: 'l1',
    boardId: BOARD_ID,
    name: 'Bug',
    color: 'red',
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
    ...overrides,
  };
}

// Helper to render and flush the post-mount fetchLabels promise so React's
// state update doesn't trigger an act() warning.
async function renderAndSettle() {
  const utils = render(<LabelFilterBar boardId={BOARD_ID} />);
  await act(async () => {
    await Promise.resolve();
  });
  return utils;
}

describe('LabelFilterBar', () => {
  beforeEach(() => {
    useLabelsStore.setState({
      byBoard: {},
      isLoadingByBoard: {},
      errorByBoard: {},
    });
    useLabelFilterStore.setState({ selectedByBoard: {} });
    useUiStore.setState({ activeModal: null, toasts: [] });
    vi.mocked(fetchBoardLabelsApi).mockImplementation(async (boardId: string) => ({
      data: useLabelsStore.getState().byBoard[boardId] ?? [],
    }));
  });

  it('returns null when the board has zero labels', async () => {
    const { container } = await renderAndSettle();
    expect(container.firstChild).toBeNull();
    expect(screen.queryByTestId('label-filter-bar')).not.toBeInTheDocument();
  });

  it('renders one pill per label when labels exist', async () => {
    const labels = [
      makeLabel({ id: 'l1', name: 'Bug', color: 'red' }),
      makeLabel({ id: 'l2', name: 'Urgent', color: 'amber' }),
    ];
    useLabelsStore.setState({ byBoard: { [BOARD_ID]: labels } });

    await renderAndSettle();

    expect(screen.getByTestId('label-filter-bar')).toBeInTheDocument();
    expect(screen.getByTestId('filter-label-toggle-l1')).toBeInTheDocument();
    expect(screen.getByTestId('filter-label-toggle-l2')).toBeInTheDocument();
  });

  it('hides "Clear all" until a pill is selected', async () => {
    useLabelsStore.setState({ byBoard: { [BOARD_ID]: [makeLabel()] } });

    await renderAndSettle();

    expect(screen.queryByTestId('clear-label-filter')).not.toBeInTheDocument();
  });

  it('toggles a pill via the filter store when clicked', async () => {
    useLabelsStore.setState({ byBoard: { [BOARD_ID]: [makeLabel()] } });

    await renderAndSettle();

    fireEvent.click(screen.getByTestId('filter-label-toggle-l1'));

    expect(useLabelFilterStore.getState().selectedByBoard[BOARD_ID]).toEqual(['l1']);

    fireEvent.click(screen.getByTestId('filter-label-toggle-l1'));

    expect(useLabelFilterStore.getState().selectedByBoard[BOARD_ID]).toEqual([]);
  });

  it('reflects selected state on pills via aria-pressed', async () => {
    useLabelsStore.setState({ byBoard: { [BOARD_ID]: [makeLabel()] } });
    useLabelFilterStore.setState({ selectedByBoard: { [BOARD_ID]: ['l1'] } });

    await renderAndSettle();

    expect(screen.getByTestId('filter-label-toggle-l1').getAttribute('aria-pressed')).toBe(
      'true',
    );
  });

  it('shows "Clear all" when at least one pill is active and clears the store on click', async () => {
    useLabelsStore.setState({ byBoard: { [BOARD_ID]: [makeLabel()] } });
    useLabelFilterStore.setState({ selectedByBoard: { [BOARD_ID]: ['l1'] } });

    await renderAndSettle();

    const clearButton = screen.getByTestId('clear-label-filter');
    expect(clearButton).toBeInTheDocument();

    fireEvent.click(clearButton);

    expect(useLabelFilterStore.getState().selectedByBoard[BOARD_ID]).toEqual([]);
  });

  it('exposes role="toolbar" with a descriptive aria-label', async () => {
    useLabelsStore.setState({ byBoard: { [BOARD_ID]: [makeLabel()] } });

    await renderAndSettle();

    const bar = screen.getByTestId('label-filter-bar');
    expect(bar.getAttribute('role')).toBe('toolbar');
    expect(bar.getAttribute('aria-label')).toBe('Filter by label');
  });

  it('prunes stale ids from the filter selection on label list change', async () => {
    useLabelsStore.setState({
      byBoard: {
        [BOARD_ID]: [
          makeLabel({ id: 'l1', name: 'Bug' }),
          makeLabel({ id: 'l2', name: 'Urgent' }),
        ],
      },
    });
    useLabelFilterStore.setState({
      selectedByBoard: { [BOARD_ID]: ['l1', 'l2', 'deleted'] },
    });

    await renderAndSettle();

    await waitFor(() => {
      expect(useLabelFilterStore.getState().selectedByBoard[BOARD_ID]).toEqual(['l1', 'l2']);
    });
  });
});
