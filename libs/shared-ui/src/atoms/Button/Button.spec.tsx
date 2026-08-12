import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './Button.js';

describe('Button', () => {
  it('renders its children and responds to clicks', () => {
    const onClick = jest.fn();
    render(<Button onClick={onClick}>Save search</Button>);

    const button = screen.getByRole('button', { name: 'Save search' });
    fireEvent.click(button);

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('cannot be clicked while disabled', () => {
    const onClick = jest.fn();
    render(
      <Button onClick={onClick} disabled>
        Save search
      </Button>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Save search' }));
    expect(onClick).not.toHaveBeenCalled();
  });
});
