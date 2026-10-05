import { render, screen } from '@testing-library/react';

import DataState from './DataState';

it('announces terminal failures as alerts', () => {
  render(<DataState state="error" title="Could not load" description="Try again later" />);

  expect(screen.getByRole('alert')).toHaveAttribute('data-data-state', 'error');
  expect(screen.getByText('Could not load')).toBeInTheDocument();
});

it('marks loading states busy without exposing decorative icons', () => {
  render(<DataState state="loading" title="Loading posts" />);

  expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true');
  expect(screen.getByRole('status').querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
});

it.each(['refreshing', 'offline', 'partial'] as const)(
  'preserves existing content while reporting %s',
  state => {
    render(
      <DataState state={state} title={`${state} notice`}>
        <article>Existing results</article>
      </DataState>,
    );

    expect(screen.getByRole('status')).toHaveAttribute('data-data-state', state);
    expect(screen.getByText('Existing results')).toBeVisible();
  },
);

it('does not retain stale content for a terminal empty state', () => {
  render(
    <DataState state="empty" title="No posts yet">
      <article>Stale result</article>
    </DataState>,
  );

  expect(screen.queryByText('Stale result')).not.toBeInTheDocument();
});
