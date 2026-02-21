import { describe, it, expect } from 'vitest';
import { render } from '../../test/utils';
import { ProgressBar } from './ProgressBar';

describe('ProgressBar', () => {
  it('renders without crashing', () => {
    const { container } = render(<ProgressBar value={50} />);
    expect(container.querySelector('.bg-surface-2')).toBeInTheDocument();
  });

  it('clamps value to 0 when given a negative value', () => {
    const { container } = render(<ProgressBar value={-10} />);
    const inner = container.querySelector('.bg-accent') as HTMLElement;
    expect(inner.style.width).toBe('0%');
  });

  it('clamps value to 100 when given a value over 100', () => {
    const { container } = render(<ProgressBar value={150} />);
    const inner = container.querySelector('.bg-accent') as HTMLElement;
    expect(inner.style.width).toBe('100%');
  });

  it('sets correct width for a normal value', () => {
    const { container } = render(<ProgressBar value={42} />);
    const inner = container.querySelector('.bg-accent') as HTMLElement;
    expect(inner.style.width).toBe('42%');
  });

  it('applies custom className to the outer container', () => {
    const { container } = render(<ProgressBar value={50} className="my-custom" />);
    expect(container.querySelector('.my-custom')).toBeInTheDocument();
  });
});
