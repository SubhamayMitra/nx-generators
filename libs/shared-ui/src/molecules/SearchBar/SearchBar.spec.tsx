import { render, screen, fireEvent } from '@testing-library/react';
import { SearchBar } from './SearchBar.js';

describe('SearchBar', () => {
  it('calls onSearch with the trimmed query on submit', () => {
    const onSearch = jest.fn();
    render(<SearchBar onSearch={onSearch} />);

    fireEvent.change(screen.getByLabelText('Search'), {
      target: { value: '  coats  ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));

    expect(onSearch).toHaveBeenCalledWith('coats');
  });
});
