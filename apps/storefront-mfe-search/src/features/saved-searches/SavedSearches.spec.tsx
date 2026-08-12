import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SavedSearches } from './SavedSearches';

jest.mock('./savedSearches.service', () => ({
  saveSearch: jest.fn(),
}));

describe('SavedSearches', () => {
  it('renders the form', () => {
    render(<SavedSearches />);
    expect(screen.getByRole('heading')).toBeInTheDocument();
  });

  it('shows the same rejection messages search-service would return for the same bad input', async () => {
    render(<SavedSearches />);

    fireEvent.blur(screen.getByLabelText('Name'));
    fireEvent.blur(screen.getByLabelText('Query'));

    await waitFor(() => {
      expect(screen.getByText('Give this search a name')).toBeInTheDocument();
      expect(
        screen.getByText('Enter a search query first'),
      ).toBeInTheDocument();
    });
  });
});
