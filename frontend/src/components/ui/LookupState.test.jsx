import { render, screen, fireEvent } from '@testing-library/react';
import LookupState from './LookupState';
import { setLanguage } from '@/i18n';
const known = { key: 'facebook', label: 'Known' };
const omitted = { key: 'future_fixture', label: 'Unmapped' };
const resource = rows => ({ data: { platforms: rows }, lookups: { platforms: rows.filter(row => row.key === 'facebook') }, query: { isPending: false, isFetching: false, isError: false, isPaused: false }, failure: {}, denied: false, refetch: jest.fn() });
beforeEach(() => { window.history.replaceState({}, '', '/dashboard/analytics/posts'); setLanguage('en'); });
test('partially mapped reference choices announce the limitation while preserving input', () => {
  const view = render(<><input aria-label="Draft" defaultValue="Synthetic draft" /><LookupState resource={resource([known])} /></>);
  expect(screen.queryByText(/Some provider choices/)).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Draft'), { target: { value: 'Synthetic edited draft' } });
  view.rerender(<><input aria-label="Draft" defaultValue="Synthetic draft" /><LookupState resource={resource([known, omitted])} /></>);
  expect(screen.getByRole('status')).toHaveTextContent('Some provider choices cannot be selected');
  expect(screen.getByLabelText('Draft')).toHaveValue('Synthetic edited draft');
});
test('all omitted reference choices are partial data rather than a genuine empty response', () => {
  render(<LookupState resource={resource([omitted])} />);
  expect(screen.getByRole('status')).toHaveTextContent('Some provider choices cannot be selected');
  expect(screen.queryByText('No reference options were returned. Your existing data is preserved.')).not.toBeInTheDocument();
});
test('denied readers do not announce details about previously omitted choices', () => {
  render(<LookupState resource={{ ...resource([omitted]), data: undefined, lookups: {}, denied: true, failure: { status: 403 } }} />);
  expect(screen.queryByText(/Some provider choices/)).not.toBeInTheDocument();
});

test('a validated empty lookup has an explicit local empty state', () => {
  render(<LookupState resource={resource([])} />);
  expect(screen.getByText('No reference options were returned. Your existing data is preserved.')).toBeInTheDocument();
  expect(screen.queryByText(/This form uses existing compatibility choices/)).not.toBeInTheDocument();
});
test('a failed refresh of an empty snapshot never announces a new empty result', () => {
  const value = resource([]); value.query.isError = true; value.failure = { status: 503 };
  render(<LookupState resource={value} />);
  expect(screen.queryByText('No reference options were returned. Your existing data is preserved.')).not.toBeInTheDocument();
  expect(screen.getByText(/previously loaded data/i)).toBeInTheDocument();
});
