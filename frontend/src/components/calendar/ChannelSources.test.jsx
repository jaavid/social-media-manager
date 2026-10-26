import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import ChannelSources from './ChannelSources';
import { calendarAPI } from '../../services/domains/publishing';

jest.mock('../../services/domains/publishing', () => ({ calendarAPI: {
  getSources: jest.fn(), addSource: jest.fn(), syncSource: jest.fn(), removeSource: jest.fn(),
} }));
jest.mock('../../i18n', () => ({ useLanguage: () => ({ isPersian: false, formatDate: value => value, t: key => key }) }));

beforeEach(() => { jest.clearAllMocks(); });

test('switching workspace clears source and form state and ignores the old response', async () => {
  let finishOld;
  calendarAPI.getSources.mockImplementation(({ client_id }) => client_id === 1
    ? new Promise(resolve => { finishOld = resolve; })
    : Promise.resolve({ data: [{ id: 22, username: 'newbrand' }] }));
  const props = { onRefresh: jest.fn(), selectedSource: '', onSelectSource: jest.fn() };
  const view = render(<ChannelSources {...props} clientId={1} />);
  fireEvent.change(screen.getByLabelText('Username or profile URL'), { target: { value: '@oldbrand' } });
  view.rerender(<ChannelSources {...props} clientId={2} />);
  expect(screen.getByLabelText('Username or profile URL')).toHaveValue('');
  expect(await screen.findByRole('option', { name: '@newbrand' })).toBeInTheDocument();
  await act(async () => finishOld({ data: [{ id: 11, username: 'oldbrand' }] }));
  expect(screen.queryByRole('option', { name: '@oldbrand' })).not.toBeInTheDocument();
  expect(props.onRefresh).not.toHaveBeenCalled();
});

test('explains a completed Bright Data collection with no posts as unconfirmed content', async () => {
  calendarAPI.getSources.mockResolvedValue({ data: [{
    id: 2, username: 'example', provider: 'brightdata', reader_ready: false,
    sync_status: 'error', error_code: 'brightdata_empty_result',
  }] });
  render(<ChannelSources clientId={1} onRefresh={jest.fn()} selectedSource="" onSelectSource={jest.fn()} />);
  expect(await screen.findByText(/Bright Data returned no posts; content collection was not confirmed/)).toBeInTheDocument();
});

test('allows a public profile and explains the required reader session', async () => {
  calendarAPI.getSources.mockResolvedValue({ data: [] });
  calendarAPI.addSource.mockResolvedValue({ data: {} });
  const refresh = jest.fn();
  render(<ChannelSources clientId={1} onRefresh={refresh} selectedSource="" onSelectSource={jest.fn()} />);
  fireEvent.change(screen.getByLabelText('Username or profile URL'), { target: { value: '@example' } });
  fireEvent.click(screen.getByRole('button', { name: 'Add channel' }));
  await waitFor(() => expect(calendarAPI.addSource).toHaveBeenCalledWith({ client: 1, platform: 'instagram', username: '@example' }));
  await waitFor(() => expect(refresh).toHaveBeenCalled());
});

test('allows anonymous sync without a reader session', async () => {
  calendarAPI.getSources.mockResolvedValue({ data: [{ id: 2, username: 'example', reader_ready: false }] });
  render(<ChannelSources clientId={1} onRefresh={jest.fn()} selectedSource="" onSelectSource={jest.fn()} />);
  await waitFor(() => expect(screen.getByRole('button', { name: 'Sync posts' })).toBeEnabled());
  expect(screen.getByText(/Anonymous public access/)).toBeInTheDocument();
});

test('adds a named competitor in the selected brand', async () => {
  calendarAPI.getSources.mockResolvedValue({ data: [] });
  calendarAPI.addSource.mockResolvedValue({ data: {} });
  render(<ChannelSources clientId={7} onRefresh={jest.fn()} selectedSource="" onSelectSource={jest.fn()} />);
  fireEvent.click(screen.getByRole('checkbox', { name: 'Track as competitor' }));
  fireEvent.change(screen.getByLabelText('Competitor name'), { target: { value: 'Rival' } });
  fireEvent.change(screen.getByLabelText('Username or profile URL'), { target: { value: '@rival' } });
  fireEvent.click(screen.getByRole('button', { name: 'Add competitor' }));
  await waitFor(() => expect(calendarAPI.addSource).toHaveBeenCalledWith({
    client: 7, platform: 'instagram', username: '@rival', competitor_name: 'Rival',
  }));
});
