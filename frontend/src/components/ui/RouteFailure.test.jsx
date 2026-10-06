import { fireEvent, render, screen } from '@testing-library/react';
import RouteFailure from './RouteFailure';
import ErrorBoundary from './ErrorBoundary';
test('native fallback renders and focuses without application providers', () => {
  const reset = jest.fn();
  render(<RouteFailure reset={reset} />);
  expect(screen.getByRole('heading')).toHaveFocus();
  fireEvent.click(screen.getByRole('button'));
  expect(reset).toHaveBeenCalledTimes(1);
});
test('local render failure preserves outer chrome and only reports a safe incident', () => {
  const report = jest.fn();
  const log = jest.spyOn(console, 'error').mockImplementation(() => {});
  function Broken() {
    throw new Error('private editor contents and access_token');
  }
  try {
    render(
      <>
        <header>Outer shell</header>
        <ErrorBoundary onError={report}>
          <Broken />
        </ErrorBoundary>
      </>,
    );
    expect(screen.getByText('Outer shell')).toBeVisible();
    expect(screen.getByRole('alert')).toBeVisible();
    expect(screen.queryByText(/private editor/)).not.toBeInTheDocument();
    expect(report.mock.calls[0][0]).toEqual({ name: 'RenderError' });
    expect(report.mock.calls[0][1]).toBeNull();
  } finally {
    log.mockRestore();
  }
});
