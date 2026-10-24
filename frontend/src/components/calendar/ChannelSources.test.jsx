import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ChannelSources from './ChannelSources';
import { calendarAPI } from '../../services/domains/publishing';

jest.mock('../../services/domains/publishing', () => ({ calendarAPI: {
  getSources: jest.fn(), addSource: jest.fn(), syncSource: jest.fn(), removeSource: jest.fn(),
} }));
jest.mock('../../i18n', () => ({ useLanguage: () => ({ isPersian: false, formatDate: value => value }) }));

beforeEach(() => { jest.clearAllMocks(); });

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

test('does not permit syncing until a server reader session is configured', async () => {
  calendarAPI.getSources.mockResolvedValue({ data: [{ id: 2, username: 'example', reader_ready: false }] });
  render(<ChannelSources clientId={1} onRefresh={jest.fn()} selectedSource="" onSelectSource={jest.fn()} />);
  await waitFor(() => expect(screen.getByRole('button', { name: 'Sync posts' })).toBeDisabled());
  expect(screen.getByText(/Reader session required/)).toBeInTheDocument();
});
