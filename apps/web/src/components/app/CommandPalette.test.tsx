import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../../test/utils';
import { CommandPalette } from './CommandPalette';

// cmdk calls scrollIntoView which jsdom doesn't implement
beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('CommandPalette', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it('opens on Cmd+K keypress', async () => {
    render(<CommandPalette />);

    // Dialog should not be visible initially
    expect(screen.queryByPlaceholderText('Search commands...')).not.toBeInTheDocument();

    // Press Cmd+K
    fireEvent.keyDown(window, { key: 'k', metaKey: true });

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search commands...')).toBeInTheDocument();
    });
  });

  it('opens on Ctrl+K keypress', async () => {
    render(<CommandPalette />);

    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search commands...')).toBeInTheDocument();
    });
  });

  it('shows navigation items when open', async () => {
    render(<CommandPalette />);

    fireEvent.keyDown(window, { key: 'k', metaKey: true });

    await waitFor(() => {
      expect(screen.getByText('Boards')).toBeInTheDocument();
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });
  });

  it('shows admin items when open', async () => {
    render(<CommandPalette />);

    fireEvent.keyDown(window, { key: 'k', metaKey: true });

    await waitFor(() => {
      expect(screen.getByText('Manage Invites')).toBeInTheDocument();
      expect(screen.getByText('Access Requests')).toBeInTheDocument();
      expect(screen.getByText('Manage Users')).toBeInTheDocument();
    });
  });

  it('shows quick actions when open', async () => {
    render(<CommandPalette />);

    fireEvent.keyDown(window, { key: 'k', metaKey: true });

    await waitFor(() => {
      expect(screen.getByText('Toggle theme')).toBeInTheDocument();
    });
  });

  it('navigates to boards when Boards is selected', async () => {
    render(<CommandPalette />);

    fireEvent.keyDown(window, { key: 'k', metaKey: true });

    await waitFor(() => {
      expect(screen.getByText('Boards')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Boards'));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  it('navigates to settings when Settings is selected', async () => {
    render(<CommandPalette />);

    fireEvent.keyDown(window, { key: 'k', metaKey: true });

    await waitFor(() => {
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Settings'));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/settings');
    });
  });

  it('closes dialog after command selection', async () => {
    render(<CommandPalette />);

    fireEvent.keyDown(window, { key: 'k', metaKey: true });

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search commands...')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Boards'));

    await waitFor(() => {
      expect(screen.queryByPlaceholderText('Search commands...')).not.toBeInTheDocument();
    });
  });

  it('toggles open/close with repeated Cmd+K', async () => {
    render(<CommandPalette />);

    // Open
    fireEvent.keyDown(window, { key: 'k', metaKey: true });
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search commands...')).toBeInTheDocument();
    });

    // Close
    fireEvent.keyDown(window, { key: 'k', metaKey: true });
    await waitFor(() => {
      expect(screen.queryByPlaceholderText('Search commands...')).not.toBeInTheDocument();
    });
  });
});
