import { AxiosError } from 'axios';
import { act, render, renderHook, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReadState, useAccountRead } from './accountRecovery';
import { setLanguage } from '@/i18n';

function setup(identity = [1, 7]) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  const read = jest.fn().mockResolvedValue({ data: { name: 'public fixture' } });
  const hook = renderHook(({ enabled, scope }) => useAccountRead('fixture', scope, enabled, read, value => value), {
    wrapper, initialProps: { enabled: false, scope: identity },
  });
  return { client, read, ...hook };
}
beforeEach(() => setLanguage('en'));
test('disabled reader suppresses warm data without fetching or claiming denial', async () => {
  const { client, read, result, rerender } = setup();
  act(() => client.setQueryData(['account-recovery', 'fixture', [1, 7]], { name: 'warm fixture' }));
  expect(result.current.denied).toBe(false);
  expect(result.current.data).toBeUndefined();
  expect(result.current.query.data).toBeUndefined();
  render(<ReadState resource={result.current} refresh={result.current.query.refetch} />);
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
  await act(() => result.current.query.refetch());
  expect(read).not.toHaveBeenCalled();
  rerender({ enabled: true, scope: [1, 8] });
  await waitFor(() => expect(result.current.data).toEqual({ name: 'public fixture' }));
  expect(read).toHaveBeenCalledTimes(1);
});
test.each([401, 403, 404])('enabled HTTP %s is an actual denial and hides cached data', async status => {
  const { read, result, rerender } = setup();
  read.mockRejectedValue(new AxiosError('fixture rejected', undefined, undefined, undefined, { status, data: {}, headers: {} }));
  rerender({ enabled: true, scope: [1, 7] });
  await waitFor(() => expect(result.current.denied).toBe(true));
  expect(result.current.data).toBeUndefined();
});
