import { render, screen } from '@testing-library/react';
import { CheckoutSummary } from './CheckoutSummary';

describe('CheckoutSummary', () => {
  it('renders', () => {
    render(<CheckoutSummary />);
    expect(screen.getByRole('heading')).toBeInTheDocument();
  });
});
