import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '../../test/utils';
import { ThemeToggle } from './ThemeToggle';

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', async () => {
  const actual = await vi.importActual<typeof import('framer-motion')>('framer-motion');
  return {
    ...actual,
    useReducedMotion: () => true,
  };
});

describe('ThemeToggle', () => {
  it('renders the toggle button', () => {
    render(<ThemeToggle />);
    const button = screen.getByTestId('theme-toggle');
    expect(button).toBeInTheDocument();
  });

  it('has correct aria-label for light mode', () => {
    render(<ThemeToggle />);
    const button = screen.getByTestId('theme-toggle');
    expect(button).toHaveAttribute('aria-label', 'Switch to dark mode');
  });

  it('toggles theme on click', () => {
    render(<ThemeToggle />);
    const button = screen.getByTestId('theme-toggle');
    // Initially light mode
    expect(button).toHaveAttribute('aria-label', 'Switch to dark mode');
    fireEvent.click(button);
    // After click should be dark mode
    expect(button).toHaveAttribute('aria-label', 'Switch to light mode');
  });

  it('toggles back to light mode on second click', () => {
    render(<ThemeToggle />);
    const button = screen.getByTestId('theme-toggle');
    fireEvent.click(button); // light -> dark
    fireEvent.click(button); // dark -> light
    expect(button).toHaveAttribute('aria-label', 'Switch to dark mode');
  });
});
