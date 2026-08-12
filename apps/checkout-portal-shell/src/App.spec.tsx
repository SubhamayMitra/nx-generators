import { render, screen } from '@testing-library/react';

// mf.ts's registerRemotes() runs as a module-load side effect that expects
// the Module Federation runtime instance the rspack plugin injects at
// bundle time — absent under plain Jest. Mocked here since this test
// exercises RootLayout/routing, not federation itself.
jest.mock('@module-federation/runtime', () => ({
  registerRemotes: jest.fn(),
  loadRemote: jest.fn(),
}));

import { App } from './App';

describe('App', () => {
  it('renders the shell chrome and the default route content', async () => {
    render(<App />);
    expect(await screen.findByText('Checkout Portal')).toBeInTheDocument();
    expect(
      await screen.findByText(/Nothing registered yet/),
    ).toBeInTheDocument();
  });
});
