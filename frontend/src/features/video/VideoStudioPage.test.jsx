import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import VideoStudioPage from './VideoStudioPage';
import { videoAPI } from '@/services/domains/publishing';
let mockWorkspace = 7;
jest.mock('@/core/session', () => ({
  useSession: () => ({ user: { id: 1, role: 'client', workspace_id: mockWorkspace } }),
}));
jest.mock('@/hooks/useData', () => ({
  useWorkspaces: () => ({ workspaces: [], error: null, refetch: jest.fn() }),
}));
jest.mock('@/core/navigation', () => ({ useAppNavigate: () => jest.fn() }));
jest.mock('@/i18n', () => ({ useLanguage: () => ({ t: (key) => key, tr: (value) => value }) }));
jest.mock('@/services/domains/publishing', () => ({ videoAPI: { importFromUrl: jest.fn(), upload: jest.fn() } }));
const media = (workspace) => ({
  id: 1,
  client: workspace,
  file_url: 'https://example.test/video.mp4',
  mime_type: 'video/mp4',
  file_size: 1,
  width: 1920,
  height: 1080,
  duration_seconds: 2,
});
const mount = () =>
  render(
    <QueryClientProvider
      client={
        new QueryClient({
          defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
        })
      }
    >
      <VideoStudioPage />
    </QueryClientProvider>,
  );
beforeEach(() => {
  mockWorkspace = 7;
  jest.clearAllMocks();
});
test('failed media import preserves URL and has no automatic replay or raw error', async () => {
  videoAPI.importFromUrl.mockRejectedValue(new Error('private signed URL'));
  mount();
  const input = screen.getByPlaceholderText('https://example.com/video.mp4');
  fireEvent.change(input, { target: { value: 'https://example.test/keep.mp4' } });
  fireEvent.click(screen.getByRole('button', { name: 'Import', exact: true }));
  await waitFor(() => expect(screen.getByRole('alert')).toHaveFocus());
  expect(input).toHaveValue('https://example.test/keep.mp4');
  expect(videoAPI.importFromUrl).toHaveBeenCalledTimes(1);
  expect(screen.queryByText('private signed URL')).not.toBeInTheDocument();
});
test('obsolete media operation cannot insert an asset into the next workspace', async () => {
  let finish;
  videoAPI.importFromUrl.mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const view = mount();
  fireEvent.change(screen.getByPlaceholderText('https://example.com/video.mp4'), {
    target: { value: 'https://example.test/video.mp4' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Import', exact: true }));
  await waitFor(() => expect(videoAPI.importFromUrl).toHaveBeenCalledTimes(1));
  mockWorkspace = 8;
  view.rerender(
    <QueryClientProvider client={new QueryClient()}>
      <VideoStudioPage />
    </QueryClientProvider>,
  );
  await act(async () => finish({ status: 201, data: media(7) }));
  expect(screen.getByPlaceholderText('https://example.com/video.mp4')).toHaveValue('');
  expect(screen.queryByRole('button', { name: 'Clear video' })).not.toBeInTheDocument();
});
