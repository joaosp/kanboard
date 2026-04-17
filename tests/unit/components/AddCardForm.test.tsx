import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('../../../src/client/components/Column/AddCardForm/AddCardForm.module.css', () => ({
  default: { form: 'form', input: 'input' },
}));
vi.mock('../../../src/client/components/shared/Button/Button.module.css', () => ({
  default: { button: 'button', primary: 'primary', sm: 'sm', md: 'md' },
}));

const createCard = vi.fn();
vi.mock('../../../src/client/stores/cards', () => ({
  useCardsStore: ((sel: (s: { createCard: typeof createCard }) => unknown) =>
    sel({ createCard })) as never,
}));

import { AddCardForm } from '../../../src/client/components/Column/AddCardForm/AddCardForm';

describe('AddCardForm', () => {
  beforeEach(() => {
    createCard.mockReset();
    createCard.mockResolvedValue(undefined);
  });

  it('submits the trimmed title and clears the input', async () => {
    render(<AddCardForm listId="list-1" />);

    const input = screen.getByTestId('add-card-input');
    fireEvent.change(input, { target: { value: '  Ship it  ' } });
    fireEvent.submit(screen.getByTestId('add-card-form'));

    await waitFor(() => {
      expect(createCard).toHaveBeenCalledWith('list-1', { title: 'Ship it' });
    });
    expect((input as HTMLInputElement).value).toBe('');
  });

  it('does not submit when the title is empty', () => {
    render(<AddCardForm listId="list-1" />);
    fireEvent.submit(screen.getByTestId('add-card-form'));
    expect(createCard).not.toHaveBeenCalled();
  });

  it('does not submit when the title is only whitespace', () => {
    render(<AddCardForm listId="list-1" />);
    fireEvent.change(screen.getByTestId('add-card-input'), { target: { value: '   ' } });
    fireEvent.submit(screen.getByTestId('add-card-form'));
    expect(createCard).not.toHaveBeenCalled();
  });
});
