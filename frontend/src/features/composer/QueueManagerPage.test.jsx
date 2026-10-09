import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import QueueManagerPage from './QueueManagerPage';
import { composerAPI } from '@/services/domains/publishing';
import { setLanguage } from '../../i18n';
import { registerPlatform } from '../../services/platforms';

const mockRefetch = jest.fn();
const queue = { id: 11, name: 'Morning queue', items_count: 0, waiting_count: 0, platforms: ['facebook'] };
jest.mock("./useComposer", () => ({ usePostQueues: () => ({ data: [queue], refetch: mockRefetch, loading: false }) }));
jest.mock('@/services/domains/publishing', () => ({ composerAPI: { queues: { get: jest.fn(), addItems: jest.fn() } } }));
jest.mock('../../components/ui/toast', () => ({ success: jest.fn(), error: jest.fn() }));

beforeEach(() => {
  jest.clearAllMocks();
  window.history.replaceState({}, '', '/admin/analytics/queues');
  setLanguage('en');
  composerAPI.queues.get.mockResolvedValue({ data: queue });
});

test.each(['server failure', 'timeout', 'offline'])('%s keeps the queue form and content available for retry', async failure => {
  composerAPI.queues.addItems.mockRejectedValueOnce(new Error(failure)).mockResolvedValueOnce({ data: {} });
  render(<QueueManagerPage />);
  fireEvent.click(await screen.findByRole('button', { name: 'Add item' }));
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Important unsent content' } });
  fireEvent.click(screen.getByRole('button', { name: 'Add', exact: true }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Your content is preserved');
  expect(screen.getByRole('textbox')).toHaveValue('Important unsent content');
  expect(mockRefetch).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Add', exact: true }));
  await waitFor(() => expect(screen.queryByRole('textbox')).not.toBeInTheDocument());
  expect(composerAPI.queues.addItems.mock.calls).toEqual([[11, [{ content: 'Important unsent content' }]], [11, [{ content: 'Important unsent content' }]]]);
  expect(mockRefetch).toHaveBeenCalledTimes(1);
  expect(composerAPI.queues.get).toHaveBeenCalledTimes(2);
});

test('pending prevents duplicate submission and dismissal', async () => {
  let complete;
  composerAPI.queues.addItems.mockImplementation(() => new Promise(resolve => { complete = resolve; }));
  render(<QueueManagerPage />);
  fireEvent.click(await screen.findByRole('button', { name: 'Add item' }));
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Keep this' } });
  const add = screen.getByRole('button', { name: 'Add', exact: true });
  fireEvent.click(add);
  fireEvent.click(add);
  expect(add).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Close' })).toBeDisabled();
  expect(composerAPI.queues.addItems).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('textbox')).toHaveValue('Keep this');
  await act(async () => complete({ data: {} }));
  await waitFor(() => expect(screen.queryByRole('textbox')).not.toBeInTheDocument());
});

test('queue platform choices come from publish-capable registry metadata', async () => {
  const unregister = registerPlatform({
    key: 'queue_fixture',
    labels: { default: 'Queue Fixture' },
    category: 'regional',
    authType: 'api_credentials',
    capabilities: ['text'],
    connection: { fields: [] },
  });
  try {
    render(<QueueManagerPage />);
    fireEvent.click(screen.getByRole('button', { name: 'New Queue' }));
    expect(screen.getByRole('checkbox', { name: 'Queue Fixture' })).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('facebook, instagram')).not.toBeInTheDocument();
  } finally {
    unregister();
  }
});
