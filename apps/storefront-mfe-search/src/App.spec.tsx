import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { App } from './App';

describe('App', () => {
  it('renders standalone with its own router, layout, and Apollo Client', async () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    );
    expect(await screen.findByText(/No features yet/)).toBeInTheDocument();
  });
});
