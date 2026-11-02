import React from 'react';
import { render, screen } from '@testing-library/react';
import PageHeader from './PageHeader';

jest.mock('../../core/navigation', () => ({
  useAppNavigate: () => jest.fn(),
}));
jest.mock('../../i18n', () => ({
  useLanguage: () => ({ tr: value => value, isPersian: false }),
}));

describe('PageHeader shared action contract', () => {
  it('renders both legacy action and actions slots rather than silently dropping one', () => {
    const { container } = render(
      <PageHeader title="Publishing" sticky={false}
        action={<button type="button">Create</button>}
        actions={<button type="button">Filters</button>} />,
    );
    expect(screen.getByRole('heading', { level: 1, name: 'Publishing' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Filters' })).toBeInTheDocument();
    expect(container.querySelectorAll('button')).toHaveLength(2);
  });

  it('keeps a single existing action compatible', () => {
    render(<PageHeader title="Calendar" actions={<button type="button">Refresh</button>} />);
    expect(screen.getByRole('button', { name: 'Refresh' })).toBeInTheDocument();
  });

  it('renders no empty action wrapper when both slots are absent', () => {
    const { container } = render(<PageHeader title="Overview" />);
    expect(screen.getByRole('heading', { name: 'Overview' })).toBeInTheDocument();
    expect(container.querySelectorAll('button')).toHaveLength(0);
  });
});
