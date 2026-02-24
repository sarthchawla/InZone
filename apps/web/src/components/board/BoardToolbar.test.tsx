import { describe, it, expect, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { render } from '../../test/utils';
import { BoardToolbar } from './BoardToolbar';

function renderToolbar(overrides = {}) {
  const defaultProps = {
    search: '',
    onSearchChange: vi.fn(),
    filters: { priorities: [] as string[], labelIds: [] as string[] },
    onTogglePriority: vi.fn(),
    onClearFilters: vi.fn(),
    hasActiveFilters: false,
    density: 'comfortable' as const,
    onToggleDensity: vi.fn(),
  };
  const props = { ...defaultProps, ...overrides };
  render(<BoardToolbar {...props} />);
  return props;
}

describe('BoardToolbar', () => {
  it('renders toolbar with search, filter, and density buttons', () => {
    renderToolbar();
    expect(screen.getByTestId('board-toolbar')).toBeInTheDocument();
    expect(screen.getByTestId('search-toggle')).toBeInTheDocument();
    expect(screen.getByTestId('filter-toggle')).toBeInTheDocument();
    expect(screen.getByTestId('density-toggle')).toBeInTheDocument();
  });

  it('opens search input when search button is clicked', () => {
    renderToolbar();
    fireEvent.click(screen.getByTestId('search-toggle'));
    expect(screen.getByTestId('board-search')).toBeInTheDocument();
  });

  it('calls onSearchChange when typing in search', () => {
    const onSearchChange = vi.fn();
    renderToolbar({ onSearchChange });
    fireEvent.click(screen.getByTestId('search-toggle'));
    fireEvent.change(screen.getByTestId('board-search'), { target: { value: 'test' } });
    expect(onSearchChange).toHaveBeenCalledWith('test');
  });

  it('closes search and clears when close button clicked', () => {
    const onSearchChange = vi.fn();
    renderToolbar({ onSearchChange });
    fireEvent.click(screen.getByTestId('search-toggle'));
    fireEvent.click(screen.getByTestId('search-close'));
    expect(onSearchChange).toHaveBeenCalledWith('');
    expect(screen.queryByTestId('board-search')).not.toBeInTheDocument();
  });

  it('opens filter dropdown when filter button is clicked', () => {
    renderToolbar();
    fireEvent.click(screen.getByTestId('filter-toggle'));
    expect(screen.getByTestId('filter-dropdown')).toBeInTheDocument();
  });

  it('calls onTogglePriority when a priority checkbox is clicked', () => {
    const onTogglePriority = vi.fn();
    renderToolbar({ onTogglePriority });
    fireEvent.click(screen.getByTestId('filter-toggle'));
    const highCheckbox = screen.getByLabelText('High');
    fireEvent.click(highCheckbox);
    expect(onTogglePriority).toHaveBeenCalledWith('HIGH');
  });

  it('closes filter dropdown when backdrop is clicked', () => {
    renderToolbar();
    fireEvent.click(screen.getByTestId('filter-toggle'));
    expect(screen.getByTestId('filter-dropdown')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('filter-backdrop'));
    expect(screen.queryByTestId('filter-dropdown')).not.toBeInTheDocument();
  });

  it('calls onToggleDensity when density button is clicked', () => {
    const onToggleDensity = vi.fn();
    renderToolbar({ onToggleDensity });
    fireEvent.click(screen.getByTestId('density-toggle'));
    expect(onToggleDensity).toHaveBeenCalledOnce();
  });

  it('shows filter chips when filters are active', () => {
    renderToolbar({
      hasActiveFilters: true,
      filters: { priorities: ['HIGH', 'LOW'], labelIds: [] },
    });
    expect(screen.getByText('High')).toBeInTheDocument();
    expect(screen.getByText('Low')).toBeInTheDocument();
    expect(screen.getByText('Clear all')).toBeInTheDocument();
  });

  it('calls onClearFilters when Clear all is clicked', () => {
    const onClearFilters = vi.fn();
    renderToolbar({
      hasActiveFilters: true,
      filters: { priorities: ['HIGH'], labelIds: [] },
      onClearFilters,
    });
    fireEvent.click(screen.getByText('Clear all'));
    expect(onClearFilters).toHaveBeenCalledOnce();
  });

  it('does not show filter chips when no active filters', () => {
    renderToolbar();
    expect(screen.queryByText('Clear all')).not.toBeInTheDocument();
  });
});
