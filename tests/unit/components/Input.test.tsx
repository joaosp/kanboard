import { render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { Input } from '../../../src/client/components/shared/Input/Input';

vi.mock('../../../src/client/components/shared/Input/Input.module.css', () => ({
  default: {
    wrapper: 'wrapper',
    label: 'label',
    input: 'input',
    inputError: 'inputError',
    error: 'error',
  },
}));

describe('Input', () => {
  it('renders with label', () => {
    render(<Input label="Email" />);
    expect(screen.getByText('Email')).toBeInTheDocument();
  });

  it('shows error message', () => {
    render(<Input error="This field is required" />);
    expect(screen.getByText('This field is required')).toBeInTheDocument();
  });

  it('forwards ref', () => {
    const ref = createRef<HTMLInputElement>();
    render(<Input ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });
});
