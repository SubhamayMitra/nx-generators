import { render, screen, fireEvent } from '@testing-library/react';
import { Input } from './Input.js';

describe('Input', () => {
  it('reflects typed values', () => {
    render(<Input aria-label="Search" onChange={() => undefined} />);
    const input = screen.getByLabelText('Search') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'coats' } });
    expect(input.value).toBe('coats');
  });
});
