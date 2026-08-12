import { render, screen } from '@testing-library/react';
import { Text } from './Text.js';

describe('Text', () => {
  it('renders with the requested element and content', () => {
    render(
      <Text as="h1" size="xl">
        Storefront
      </Text>,
    );
    const heading = screen.getByRole('heading', {
      level: 1,
      name: 'Storefront',
    });
    expect(heading).toBeInTheDocument();
  });
});
