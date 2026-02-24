import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Breadcrumbs } from './Breadcrumbs';

function renderWithRouter(ui: React.ReactElement, initialEntries: string[] = ['/']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      {ui}
    </MemoryRouter>
  );
}

describe('Breadcrumbs', () => {
  it('returns null on the home page', () => {
    const { container } = renderWithRouter(<Breadcrumbs />, ['/']);
    expect(container.innerHTML).toBe('');
  });

  it('shows Home > Board on a board page', () => {
    renderWithRouter(<Breadcrumbs boardName="My Board" />, ['/board/123']);
    const nav = screen.getByTestId('breadcrumbs');
    expect(nav).toBeInTheDocument();
    expect(screen.getByText('My Board')).toBeInTheDocument();
  });

  it('shows fallback "Board" when boardName is not provided', () => {
    renderWithRouter(<Breadcrumbs />, ['/board/123']);
    expect(screen.getByText('Board')).toBeInTheDocument();
  });

  it('shows Home > Settings on settings page', () => {
    renderWithRouter(<Breadcrumbs />, ['/settings']);
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('shows Home > Admin > Invites on admin invites page', () => {
    renderWithRouter(<Breadcrumbs />, ['/admin/invites']);
    expect(screen.getByText('Admin')).toBeInTheDocument();
    expect(screen.getByText('Invites')).toBeInTheDocument();
  });

  it('shows Home > Admin > Users on admin users page', () => {
    renderWithRouter(<Breadcrumbs />, ['/admin/users']);
    expect(screen.getByText('Admin')).toBeInTheDocument();
    expect(screen.getByText('Users')).toBeInTheDocument();
  });

  it('shows Home > Admin > Requests on admin requests page', () => {
    renderWithRouter(<Breadcrumbs />, ['/admin/requests']);
    expect(screen.getByText('Admin')).toBeInTheDocument();
    expect(screen.getByText('Requests')).toBeInTheDocument();
  });

  it('has aria-label for accessibility', () => {
    renderWithRouter(<Breadcrumbs />, ['/settings']);
    const nav = screen.getByTestId('breadcrumbs');
    expect(nav).toHaveAttribute('aria-label', 'Breadcrumb');
  });
});
