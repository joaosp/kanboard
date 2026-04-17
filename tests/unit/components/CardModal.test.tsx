import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('../../../src/client/components/Card/CardModal/CardModal.module.css', () => ({
  default: {
    content: 'c',
    field: 'f',
    label: 'l',
    titleInput: 'ti',
    labelRow: 'lr',
    addLabelWrapper: 'alw',
    addLabelButton: 'alb',
    description: 'd',
    meta: 'm',
    actions: 'a',
  },
}));
vi.mock('../../../src/client/components/shared/Modal/Modal.module.css', () => ({
  default: { overlay: 'o', modal: 'm', header: 'h', title: 't', closeButton: 'cb' },
}));
vi.mock('../../../src/client/components/shared/Button/Button.module.css', () => ({
  default: { button: 'b', primary: 'p', secondary: 's', destructive: 'd', sm: 'sm', md: 'md' },
}));
vi.mock('../../../src/client/components/shared/Spinner/Spinner.module.css', () => ({
  default: { spinner: 's', lg: 'lg', md: 'md', sm: 'sm' },
}));
vi.mock('../../../src/client/components/Label/LabelChip/LabelChip.module.css', () => ({
  default: { chip: 'c', solid: 's', outline: 'o', sm: 'sm', md: 'md', red: 'r', amber: 'a', green: 'g', blue: 'b', violet: 'v', slate: 'sl' },
}));

// Stub out LabelPickerPopover (simpler testing surface)
vi.mock('../../../src/client/components/Label/LabelPickerPopover/LabelPickerPopover', () => ({
  LabelPickerPopover: () => <div data-testid="label-picker" />,
}));

const { fetchCard, updateCard, deleteCard, fetchLabels, attachLabel, detachLabel, openModal, closeModal } =
  vi.hoisted(() => ({
    fetchCard: vi.fn(),
    updateCard: vi.fn(),
    deleteCard: vi.fn(),
    fetchLabels: vi.fn(),
    attachLabel: vi.fn(),
    detachLabel: vi.fn(),
    openModal: vi.fn(),
    closeModal: vi.fn(),
  }));

let uiState = { activeModal: 'card:c-1' as string | null, openModal, closeModal };
vi.mock('../../../src/client/stores/ui', () => ({
  useUiStore: ((sel?: (s: typeof uiState) => unknown) =>
    sel ? sel(uiState) : uiState) as never,
}));

let cardsState = { fetchCard, updateCard, deleteCard, createCard: vi.fn(), isLoading: false };
vi.mock('../../../src/client/stores/cards', () => ({
  useCardsStore: ((sel?: (s: typeof cardsState) => unknown) =>
    sel ? sel(cardsState) : cardsState) as never,
}));

let boardsState = { currentBoard: { id: 'b-1', lists: [] } as { id: string; lists: unknown[] } | null };
vi.mock('../../../src/client/stores/boards', () => ({
  useBoardsStore: ((sel?: (s: typeof boardsState) => unknown) =>
    sel ? sel(boardsState) : boardsState) as never,
}));

let labelsState = {
  byBoard: {} as Record<string, unknown[]>,
  fetchLabels,
  attachLabel,
  detachLabel,
};
vi.mock('../../../src/client/stores/labels', () => ({
  useLabelsStore: ((sel?: (s: typeof labelsState) => unknown) =>
    sel ? sel(labelsState) : labelsState) as never,
}));

import { CardModal } from '../../../src/client/components/Card/CardModal/CardModal';

const mockCard = {
  id: 'c-1',
  listId: 'l-1',
  title: 'Hello',
  description: 'World',
  position: 0,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-02T00:00:00Z',
  labels: [{ id: 'lab-1', boardId: 'b-1', name: 'Bug', color: 'red', createdAt: '2024-01-01', updatedAt: '2024-01-01' }],
};

function setup() {
  const rootDiv = document.createElement('div');
  rootDiv.id = 'root';
  document.body.appendChild(rootDiv);
  return {
    cleanup: () => document.body.removeChild(rootDiv),
    ...render(<CardModal />),
  };
}

describe('CardModal', () => {
  let cleanup: () => void;

  beforeEach(() => {
    vi.clearAllMocks();
    fetchCard.mockResolvedValue(mockCard);
    updateCard.mockResolvedValue(undefined);
    deleteCard.mockResolvedValue(undefined);
    fetchLabels.mockResolvedValue(undefined);
    attachLabel.mockResolvedValue(undefined);
    detachLabel.mockResolvedValue(undefined);
    uiState = { activeModal: 'card:c-1', openModal, closeModal };
    cardsState = { fetchCard, updateCard, deleteCard, createCard: vi.fn(), isLoading: false };
    boardsState = { currentBoard: { id: 'b-1', lists: [] } };
    labelsState = { byBoard: {}, fetchLabels, attachLabel, detachLabel };
  });

  afterEach(() => {
    cleanup?.();
  });

  it('does not render anything when there is no active card', () => {
    uiState = { activeModal: null, openModal, closeModal };
    ({ cleanup } = setup());
    expect(screen.queryByTestId('card-modal-title')).not.toBeInTheDocument();
  });

  it('loads the card on open and populates title/description', async () => {
    ({ cleanup } = setup());
    await waitFor(() => {
      expect(fetchCard).toHaveBeenCalledWith('c-1');
      expect((screen.getByTestId('card-modal-title') as HTMLInputElement).value).toBe('Hello');
    });
    expect((screen.getByTestId('card-modal-description') as HTMLTextAreaElement).value).toBe('World');
  });

  it('fetches labels for the board when none are cached', async () => {
    ({ cleanup } = setup());
    await waitFor(() => expect(fetchLabels).toHaveBeenCalledWith('b-1'));
  });

  it('does not fetch labels when some are already cached', async () => {
    labelsState = {
      byBoard: { 'b-1': [{ id: 'lab-2' }] },
      fetchLabels,
      attachLabel,
      detachLabel,
    };
    ({ cleanup } = setup());
    await waitFor(() => expect(fetchCard).toHaveBeenCalled());
    expect(fetchLabels).not.toHaveBeenCalled();
  });

  it('saves trimmed title + description and closes the modal', async () => {
    ({ cleanup } = setup());
    await waitFor(() => expect(screen.getByTestId('card-modal-title')).toBeInTheDocument());

    fireEvent.change(screen.getByTestId('card-modal-title'), { target: { value: '  New Title ' } });
    fireEvent.change(screen.getByTestId('card-modal-description'), { target: { value: '  Body  ' } });
    fireEvent.click(screen.getByTestId('card-modal-save'));

    await waitFor(() => {
      expect(updateCard).toHaveBeenCalledWith('c-1', { title: 'New Title', description: 'Body' });
      expect(closeModal).toHaveBeenCalled();
    });
  });

  it('saves description as null when emptied', async () => {
    ({ cleanup } = setup());
    await waitFor(() => expect(screen.getByTestId('card-modal-title')).toBeInTheDocument());
    fireEvent.change(screen.getByTestId('card-modal-description'), { target: { value: '   ' } });
    fireEvent.click(screen.getByTestId('card-modal-save'));
    await waitFor(() => {
      expect(updateCard).toHaveBeenCalledWith('c-1', { title: 'Hello', description: null });
    });
  });

  it('deletes the card and closes the modal', async () => {
    ({ cleanup } = setup());
    await waitFor(() => expect(screen.getByTestId('card-modal-title')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('card-modal-delete'));
    await waitFor(() => {
      expect(deleteCard).toHaveBeenCalledWith('c-1');
      expect(closeModal).toHaveBeenCalled();
    });
  });

  it('toggles the label picker when clicking Add label', async () => {
    ({ cleanup } = setup());
    await waitFor(() => expect(screen.getByTestId('card-modal-title')).toBeInTheDocument());

    fireEvent.click(screen.getByTestId('card-modal-add-label'));
    expect(screen.getByTestId('label-picker')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('card-modal-add-label'));
    expect(screen.queryByTestId('label-picker')).not.toBeInTheDocument();
  });

  it('renders the attached labels', async () => {
    ({ cleanup } = setup());
    await waitFor(() => {
      expect(screen.getByTestId('card-modal-labels')).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByText('Bug')).toBeInTheDocument();
    });
  });
});
