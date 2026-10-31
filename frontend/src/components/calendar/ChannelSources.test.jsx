import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import ChannelSources from './ChannelSources';
import { calendarAPI } from '../../services/domains/publishing';
import toast from '../ui/toast';
jest.mock('../ui/toast', () => ({ __esModule: true, default: { error: jest.fn(), success: jest.fn() } }));

jest.mock('../../services/domains/publishing', () => ({ calendarAPI: {
  getSources: jest.fn(), addSource: jest.fn(), syncSource: jest.fn(), removeSource: jest.fn(),
} }));
jest.mock('../../i18n', () => ({ useLanguage: () => ({ isPersian: false, formatDate: value => value, t: key => key }) }));

beforeEach(() => { jest.clearAllMocks(); });
function expandSources() {
  fireEvent.click(screen.getByRole('button', { name: /Tracked channels/ }));
}

test('switching workspace clears source and form state and ignores the old response', async () => {
  let finishOld;
  calendarAPI.getSources.mockImplementation(({ client_id }) => client_id === 1
    ? new Promise(resolve => { finishOld = resolve; })
    : Promise.resolve({ data: [{ id: 22, username: 'newbrand' }] }));
  const props = { onRefresh: jest.fn(), selectedSource: '', onSelectSource: jest.fn() };
  const view = render(<ChannelSources {...props} clientId={1} />);
  expandSources();
  fireEvent.change(screen.getByLabelText('Username or profile URL'), { target: { value: '@oldbrand' } });
  view.rerender(<ChannelSources {...props} clientId={2} />);
  expect(screen.getByLabelText('Username or profile URL')).toHaveValue('');
  expandSources();
  expect(await screen.findByRole('option', { name: '@newbrand' })).toBeInTheDocument();
  await act(async () => finishOld({ data: [{ id: 11, username: 'oldbrand' }] }));
  expect(screen.queryByRole('option', { name: '@oldbrand' })).not.toBeInTheDocument();
  expect(props.onRefresh).not.toHaveBeenCalled();
});

test('hides provider and sync error diagnostics in user-facing calendar', async () => {
  calendarAPI.getSources.mockResolvedValue({ data: [{
    id: 2, username: 'example', provider: 'brightdata', reader_ready: false,
    sync_status: 'error', error_code: 'brightdata_empty_result',
  }] });
  render(<ChannelSources clientId={1} onRefresh={jest.fn()} selectedSource="" onSelectSource={jest.fn()} />);
  await waitFor(() => expect(document.body.textContent).toContain('@example'));
  expect(screen.queryByText(/Bright Data|Sync stopped|collection was not confirmed/)).not.toBeInTheDocument();
});

test('allows a public profile and explains the required reader session', async () => {
  calendarAPI.getSources.mockResolvedValue({ data: [] });
  calendarAPI.addSource.mockResolvedValue({ data: {} });
  const refresh = jest.fn();
  render(<ChannelSources clientId={1} onRefresh={refresh} selectedSource="" onSelectSource={jest.fn()} />);
  expandSources();
  fireEvent.change(screen.getByLabelText('Username or profile URL'), { target: { value: '@example' } });
  fireEvent.click(screen.getByRole('button', { name: 'Add channel' }));
  await waitFor(() => expect(calendarAPI.addSource).toHaveBeenCalledWith({ client: 1, platform: 'instagram', username: '@example' }));
  await waitFor(() => expect(refresh).toHaveBeenCalled());
});

test('allows anonymous sync without a reader session', async () => {
  calendarAPI.getSources.mockResolvedValue({ data: [{ id: 2, username: 'example', reader_ready: false }] });
  render(<ChannelSources clientId={1} onRefresh={jest.fn()} selectedSource="" onSelectSource={jest.fn()} />);
  await waitFor(() => expect(screen.getByRole('button', { name: 'Sync posts' })).toBeEnabled());
  expect(screen.queryByText(/Anonymous public access/)).not.toBeInTheDocument();
});

test('adds a named competitor in the selected brand', async () => {
  calendarAPI.getSources.mockResolvedValue({ data: [] });
  calendarAPI.addSource.mockResolvedValue({ data: {} });
  render(<ChannelSources clientId={7} onRefresh={jest.fn()} selectedSource="" onSelectSource={jest.fn()} />);
  expandSources();
  fireEvent.click(screen.getByRole('checkbox', { name: 'Competitor' }));
  fireEvent.change(screen.getByLabelText('Competitor name'), { target: { value: 'Rival' } });
  expandSources();
  fireEvent.change(screen.getByLabelText('Username or profile URL'), { target: { value: '@rival' } });
  fireEvent.click(screen.getByRole('button', { name: 'Add competitor' }));
  await waitFor(() => expect(calendarAPI.addSource).toHaveBeenCalledWith({
    client: 7, platform: 'instagram', username: '@rival', competitor_name: 'Rival',
  }));
});

test('load failure is a toast, not an inline error', async () => {
  calendarAPI.getSources.mockRejectedValue(new Error('offline'));
  render(<ChannelSources clientId={1} onRefresh={jest.fn()} selectedSource="" onSelectSource={jest.fn()} />);
  await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Could not load channels.'));
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

test('action success with reload failure shows an accurate notification', async () => {
  calendarAPI.getSources.mockResolvedValueOnce({ data: [] }).mockRejectedValueOnce(new Error('reload failed'));
  calendarAPI.addSource.mockResolvedValue({ data: {} });
  render(<ChannelSources clientId={1} onRefresh={jest.fn()} selectedSource="" onSelectSource={jest.fn()} />);
  expandSources();
  fireEvent.change(screen.getByLabelText('Username or profile URL'), { target: { value: '@example' } });
  fireEvent.click(screen.getByRole('button', { name: 'Add channel' }));
  await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Channel added.'));
  await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Action completed, but the list could not refresh.'));
  expect(toast.error).not.toHaveBeenCalledWith('Operation failed.');
});

test('tracked sources are compact by default and open with an accessible control', async () => {
  calendarAPI.getSources.mockResolvedValue({ data: [{ id: 5, username: 'example' }] });
  render(<ChannelSources clientId={1} onRefresh={jest.fn()} selectedSource="" onSelectSource={jest.fn()} />);
  expect(screen.getByRole('button', { name: /Tracked channels/ })).toHaveAttribute('aria-expanded', 'false');
  expect(screen.queryByLabelText('Username or profile URL')).not.toBeInTheDocument();
  expandSources();
  expect(screen.getByRole('button', { name: /Tracked channels/ })).toHaveAttribute('aria-expanded', 'true');
  expect(screen.getByLabelText('Username or profile URL')).toBeInTheDocument();
});
