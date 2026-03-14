import { describe, it, expect } from 'vitest';
import { render } from '../../test/utils';
import { AppFooter } from './AppFooter';

describe('AppFooter', () => {
  it('renders the version string', () => {
    const { getByText } = render(<AppFooter />);
    expect(getByText(/InZone v\d+\.\d+\.\d+/)).toBeInTheDocument();
  });

  it('displays the test version', () => {
    const { container } = render(<AppFooter />);
    expect(container.textContent).toContain('InZone v0.0.0-test');
  });
});
