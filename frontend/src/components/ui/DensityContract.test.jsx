import React from 'react';
import { render, screen } from '@testing-library/react';
import Card from './Card';
import AILoading from '../ai/AILoading';

jest.mock('../../i18n', () => ({
  useLanguage: () => ({ tr: (value) => value }),
}));

describe('density-aware shared components', () => {
  it('applies the density-backed padding utility to real Card instances', () => {
    render(<Card data-testid="density-card" padding="md">Content</Card>);
    expect(screen.getByTestId('density-card').className)
      .toContain('p-[var(--density-card-md)]');
  });

  it.each(['inline', 'dots', 'shimmer'])('preserves AI loading classes for %s', (variant) => {
    const { container } = render(
      <AILoading variant={variant} className="consumer-marker" label="Working" />,
    );
    const root = container.firstElementChild;
    expect(root).toHaveClass('consumer-marker');
    expect(root).toHaveAttribute('role', 'status');
    if (variant === 'shimmer') expect(root).toHaveClass('relative', 'overflow-hidden');
  });
});
