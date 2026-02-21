import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SyncStatusIndicator } from './SyncStatusIndicator';

describe('SyncStatusIndicator', () => {
  it('renders nothing when idle', () => {
    const { container } = render(
      <SyncStatusIndicator state="idle" pendingCount={0} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders syncing state with "Saving..."', () => {
    render(<SyncStatusIndicator state="syncing" pendingCount={1} />);
    const status = screen.getByRole('status');
    expect(status).toBeInTheDocument();
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(screen.getByText('Saving...')).toBeInTheDocument();
  });

  it('renders syncing state with count when multiple mutations', () => {
    render(<SyncStatusIndicator state="syncing" pendingCount={3} />);
    expect(screen.getByText('Saving (3)')).toBeInTheDocument();
  });

  it('renders synced state with "Saved"', () => {
    render(<SyncStatusIndicator state="synced" pendingCount={0} />);
    const status = screen.getByRole('status');
    expect(status).toBeInTheDocument();
    expect(screen.getByText('Saved')).toBeInTheDocument();
  });

  it('renders error state with "Sync failed"', () => {
    render(<SyncStatusIndicator state="error" pendingCount={0} />);
    const status = screen.getByRole('status');
    expect(status).toBeInTheDocument();
    expect(screen.getByText('Sync failed')).toBeInTheDocument();
  });

  it('has correct accessibility attributes', () => {
    render(<SyncStatusIndicator state="syncing" pendingCount={1} />);
    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).toHaveAttribute('data-testid', 'sync-status');
  });
});
