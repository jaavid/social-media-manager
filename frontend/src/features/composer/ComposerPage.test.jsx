import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ComposerPage from './ComposerPage';
import { composerAPI } from '../../services/api';
import { usePostQueues } from '../../hooks/useComposer';
import { setLanguage } from '../../i18n';
import toast from '../../components/ui/toast';

const mockNavigate = jest.fn();
let mockId;
let mockUser = { id: 1, client_id: 7 };
jest.mock('../../core/navigation', () => ({
  useAppNavigate: () => mockNavigate,
  useAppParams: () => ({ id: mockId }),
  useAppLocation: () => ({ pathname: globalThis.window.location.pathname }),
}));
jest.mock('../../core/session', () => ({ useSession: () => ({ user: mockUser }) }));
jest.mock('../../hooks/usePlatformConnections', () => ({ __esModule: true, default: () => ({ status: {} }) }));
jest.mock('../../hooks/useComposer', () => ({
  useComposerPost: () => ({ data: null, loading: false }),
  usePostQueues: jest.fn(),
}));
jest.mock('../../services/platforms', () => {
  const platforms = [{ key: 'facebook', labels: { default: 'Facebook' }, maxText: 5000, color: 'blue', authType: 'oauth' }];
  return { getPlatformRegistry: () => platforms, connectedPlatforms: () => platforms };
});
jest.mock('../../services/api', () => ({
  composerAPI: { posts: { create: jest.fn(), update: jest.fn(), publishNow: jest.fn(), schedule: jest.fn(), addToQueue: jest.fn() } },
  socialAccountsAPI: { list: jest.fn(async () => ({ data: [] })) },
}));
jest.mock('../../components/ui/toast', () => ({ success: jest.fn(), error: jest.fn() }));
jest.mock('../../components/ai/AIWriteButton', () => () => null);

const queue = { id: 11, client: 7, name: 'Evening Facebook', platforms: ['facebook'], is_active: true };
function compose() {
  render(<ComposerPage />);
  fireEvent.click(screen.getByRole('button', { name: 'Facebook', pressed: false }));
  fireEvent.change(screen.getAllByRole('textbox').find(input => input.tagName === 'TEXTAREA'), { target: { value: 'Keep this content' } });
}
function chooseQueue() {
  fireEvent.click(screen.getByRole('button', { name: 'Add to Queue' }));
  fireEvent.change(screen.getByLabelText('Destination queue'), { target: { value: '11' } });
}
function submitQueue() {
  fireEvent.click(screen.getAllByRole('button', { name: 'Add to Queue' })[0]);
}
beforeEach(() => {
  jest.clearAllMocks();
  window.sessionStorage.clear();
  mockId = undefined;
  mockUser = { id: 1, client_id: 7 };
  window.history.replaceState({}, '', '/dashboard/analytics/composer');
  setLanguage('en');
  usePostQueues.mockReturnValue({ data: [queue], loading: false, error: null });
  composerAPI.posts.create.mockResolvedValue({ data: { id: 900 } });
  composerAPI.posts.update.mockResolvedValue({ data: { id: 900 } });
  composerAPI.posts.addToQueue.mockResolvedValue({ data: { id: 1 } });
  composerAPI.posts.publishNow.mockResolvedValue({ data: { status: 'queued' } });
});

test('queue requires explicit selection and only enqueues after the draft is saved', async () => {
  let complete;
  composerAPI.posts.addToQueue.mockImplementationOnce(() => new Promise(resolve => { complete = resolve; }));
  compose();
  fireEvent.click(screen.getByRole('button', { name: 'Add to Queue' }));
  expect(screen.queryByRole('button', { name: 'Publish Now' })).not.toBeInTheDocument();
  expect(screen.getAllByRole('button', { name: 'Add to Queue' })[0]).toBeDisabled();
  fireEvent.change(screen.getByLabelText('Destination queue'), { target: { value: '11' } });
  submitQueue();
  await waitFor(() => expect(composerAPI.posts.addToQueue).toHaveBeenCalledWith(900, 11));
  expect(toast.success).not.toHaveBeenCalled();
  expect(mockNavigate).not.toHaveBeenCalled();
  complete({ data: { id: 1 } });
  await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Added to queue'));
  expect(composerAPI.posts.create).toHaveBeenCalledWith(expect.objectContaining({ content: 'Keep this content', target_platforms: ['facebook'] }));
  expect(composerAPI.posts.publishNow).not.toHaveBeenCalled();
  expect(composerAPI.posts.schedule).not.toHaveBeenCalled();
});

test('enqueue failure preserves content, mode, selection and reuses the saved draft on retry', async () => {
  composerAPI.posts.addToQueue.mockRejectedValueOnce(new Error('offline'));
  compose();
  chooseQueue();
  submitQueue();
  await waitFor(() => expect(toast.error).toHaveBeenCalled());
  expect(screen.getByDisplayValue('Keep this content')).toBeVisible();
  expect(screen.getByLabelText('Destination queue')).toHaveValue('11');
  expect(mockNavigate).not.toHaveBeenCalled();
  expect(toast.success).not.toHaveBeenCalled();
  submitQueue();
  await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Added to queue'));
  expect(composerAPI.posts.create).toHaveBeenCalledTimes(1);
  expect(composerAPI.posts.update).toHaveBeenCalledWith(900, expect.objectContaining({ content: 'Keep this content' }));
  expect(composerAPI.posts.publishNow).not.toHaveBeenCalled();
  expect(composerAPI.posts.schedule).not.toHaveBeenCalled();
});

test.each([
  { data: [], loading: false, error: null },
  { data: [queue], loading: true, error: null },
  { data: [queue], loading: false, error: new Error('forbidden') },
  { data: [{ ...queue, client: 8 }], loading: false, error: null },
  { data: [{ ...queue, platforms: ['instagram'] }], loading: false, error: null },
])('unavailable queues cannot trigger any post action: %j', async state => {
  usePostQueues.mockReturnValue(state);
  compose();
  fireEvent.click(screen.getByRole('button', { name: 'Add to Queue' }));
  expect(screen.getAllByRole('button', { name: 'Add to Queue' })[0]).toBeDisabled();
  submitQueue();
  expect(composerAPI.posts.create).not.toHaveBeenCalled();
  expect(composerAPI.posts.publishNow).not.toHaveBeenCalled();
  expect(composerAPI.posts.schedule).not.toHaveBeenCalled();
});

test('existing posts enqueue via update', async () => {
  mockId = '900';
  compose();
  chooseQueue();
  submitQueue();
  await waitFor(() => expect(composerAPI.posts.addToQueue).toHaveBeenCalledWith(900, 11));
  expect(composerAPI.posts.create).not.toHaveBeenCalled();
  expect(composerAPI.posts.update).toHaveBeenCalledWith('900', expect.any(Object));
});

test('switching back to Now retains the independent publish action', async () => {
  compose();
  chooseQueue();
  fireEvent.click(screen.getByRole('button', { name: 'Now' }));
  fireEvent.click(screen.getByRole('button', { name: 'Publish Now' }));
  await waitFor(() => expect(composerAPI.posts.publishNow).toHaveBeenCalledWith(900));
  expect(composerAPI.posts.addToQueue).not.toHaveBeenCalled();
});

test.each(['dashboard', 'admin'])('saving a new draft keeps the %s composer route', async prefix => {
  window.history.replaceState({}, '', `/${prefix}/analytics/composer`);
  compose();
  fireEvent.click(screen.getByRole('button', { name: 'Save Draft' }));
  await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith(`/${prefix}/analytics/composer/900`, { replace: true }));
});

test('unsaved draft survives unmount and reload while another workspace stays empty', async () => {
  const view = render(<ComposerPage />);
  const textarea = screen.getAllByRole('textbox').find(input => input.tagName === 'TEXTAREA');
  fireEvent.change(textarea, { target: { value: 'Unsaved recoverable draft' } });
  view.unmount();
  const restored = render(<ComposerPage />);
  expect(screen.getAllByRole('textbox').find(input => input.tagName === 'TEXTAREA')).toHaveValue('Unsaved recoverable draft');
  restored.unmount();
  mockUser = { id: 1, client_id: 8 };
  render(<ComposerPage />);
  expect(screen.getAllByRole('textbox').find(input => input.tagName === 'TEXTAREA')).toHaveValue('');
});

test('successful save clears recovery and no longer warns on unload', async () => {
  compose();
  fireEvent.click(screen.getByRole('button', { name: 'Save Draft' }));
  await waitFor(() => expect(composerAPI.posts.create).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(window.sessionStorage.length).toBe(0));
  const event = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(event);
  expect(event.defaultPrevented).toBe(false);
});
