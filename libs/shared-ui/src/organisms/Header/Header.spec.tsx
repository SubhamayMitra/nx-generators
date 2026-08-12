import { render, screen, fireEvent } from '@testing-library/react';
import { Header } from './Header.js';

describe('Header', () => {
  it('renders nav links and forwards search submissions', () => {
    const onSearch = jest.fn();
    render(
      <Header
        productName="Storefront"
        navLinks={[{ label: 'Search', href: '/search' }]}
        onSearch={onSearch}
      />,
    );

    expect(screen.getByText('Storefront')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Search' })).toHaveAttribute(
      'href',
      '/search',
    );

    fireEvent.change(screen.getByLabelText('Search'), {
      target: { value: 'coats' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));
    expect(onSearch).toHaveBeenCalledWith('coats');
  });
});
