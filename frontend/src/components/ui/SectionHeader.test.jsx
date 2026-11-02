import React from 'react';
import { render, screen } from '@testing-library/react';
import SectionHeader from './SectionHeader';

describe('SectionHeader design-system contract', () => {
  test('renders semantic headings without inline layout styles', () => {
    const { container } = render(
      <SectionHeader level={2} title="Connections" description="Manage providers"
        actions={<button type="button">Refresh</button>} />,
    );
    expect(screen.getByRole('heading', { level: 2, name: 'Connections' })).toBeInTheDocument();
    expect(screen.getByText('Manage providers')).toBeInTheDocument();
    expect(container.querySelector('header')).not.toHaveAttribute('style');
    expect(container.querySelector('h2')).not.toHaveAttribute('style');
    expect(screen.getByRole('button', { name: 'Refresh' })).toBeVisible();
  });

  test('centered headers keep actions hidden and use logical alignment', () => {
    const { container } = render(
      <SectionHeader level={1} title="Overview" align="center"
        actions={<button type="button">Hidden</button>} />,
    );
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Overview');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  test('keeps the legacy style override until callers migrate', () => {
    const { container } = render(<SectionHeader title="Legacy" style={{ opacity: 0.8 }} />);
    expect(container.querySelector('header')).toHaveStyle({ opacity: 0.8 });
  });
});
