import { render, screen } from '@testing-library/react';
import { AppShellTemplate } from './AppShellTemplate.js';

describe('AppShellTemplate', () => {
  it('renders header, content, and an optional footer', () => {
    render(
      <AppShellTemplate header={<div>Header</div>} footer={<div>Footer</div>}>
        <div>Content</div>
      </AppShellTemplate>,
    );

    expect(screen.getByText('Header')).toBeInTheDocument();
    expect(screen.getByText('Content')).toBeInTheDocument();
    expect(screen.getByText('Footer')).toBeInTheDocument();
  });

  it('omits the footer element when none is provided', () => {
    const { container } = render(
      <AppShellTemplate header={<div>Header</div>}>
        <div>Content</div>
      </AppShellTemplate>,
    );
    expect(container.querySelector('footer')).toBeNull();
  });
});
