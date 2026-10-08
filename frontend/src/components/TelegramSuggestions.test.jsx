import { act, fireEvent, render, screen } from '@testing-library/react';
import { AxiosError } from 'axios';
import { onlineManager } from '@tanstack/react-query';
import TelegramSuggestions from './TelegramSuggestions';
import api from '../services/api';
let mockUser;
jest.mock('@/core/session', () => ({ useSession: () => ({ user: mockUser, status: 'authenticated' }) }));
jest.mock('../i18n', () => ({ useLanguage: () => ({ tr: value => value, t: key => key }) }));
jest.mock('../services/api', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() } }));
const row = (account = 10) => ({ id: account, client: 7, account, account_name: 'Public account', sender_name: 'Public sender', content: `Public proposal ${account}`, media: {}, proposal: {}, state: 'received', provider_state: 'pending', draft: null, created_at: '2026-10-08T10:00:00Z', updated_at: '2026-10-08T10:00:00Z' });
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };
beforeEach(() => { jest.resetAllMocks(); onlineManager.setOnline(true); mockUser = { id: 1, client_id: 7, workspace_id: 7 }; api.get.mockResolvedValue({ data: [row()] }); });
afterEach(() => onlineManager.setOnline(true));
const setup = account => render(<TelegramSuggestions workspaceId={7} accountId={account} />);
test('failed initial read is visible and never silently disappears as empty', async () => {
  api.get.mockRejectedValue(new Error('offline'));
  setup(10);
  await screen.findByText('connections.failed');
  expect(screen.queryByText('suggestions.empty')).not.toBeInTheDocument();
});
test('account switch immediately suppresses old rows and ignores a delayed old read', async () => {
  const second = deferred();
  api.get.mockResolvedValueOnce({ data: [row()] }).mockImplementationOnce(() => second.promise);
  const view = setup(10);
  await screen.findByText('Public proposal 10');
  view.rerender(<TelegramSuggestions workspaceId={7} accountId={11} />);
  expect(screen.queryByText('Public proposal 10')).not.toBeInTheDocument();
  await act(async () => second.resolve({ data: [row(11)] }));
  await screen.findByText('Public proposal 11');
});
test('valid decision acknowledgment survives failed refresh and cannot be posted again', async () => {
  api.post.mockResolvedValue({ status: 200, data: { ...row(), state: 'accepted_as_draft', draft: 17, updated_at: '2026-10-08T10:01:00Z' } });
  setup(10);
  await screen.findByText('Public proposal 10');
  api.get.mockRejectedValueOnce(new Error('offline'));
  fireEvent.click(screen.getByRole('button', { name: 'Copy to draft' }));
  await screen.findByRole('link', { name: 'Open editable draft' });
  expect(api.post).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole('button', { name: 'Copy to draft' })).not.toBeInTheDocument();
  expect(screen.getByText('Public proposal 10')).toBeInTheDocument();
});
test('same-turn duplicate decisions are stopped before HTTP', async () => {
  const pending = deferred(); api.post.mockImplementation(() => pending.promise);
  setup(10); await screen.findByText('Public proposal 10');
  const button = screen.getByRole('button', { name: 'Copy to draft' });
  act(() => { fireEvent.click(button); fireEvent.click(button); });
  expect(api.post).toHaveBeenCalledTimes(1);
});
test('malformed reader is a failure, not empty', async () => {
  api.get.mockResolvedValue({ data: { results: [null] } });
  setup(10);
  await screen.findByText('connections.failed');
});
test('offline reader waits for reconnect without replaying a decision', async () => {
  onlineManager.setOnline(false);
  setup(10);
  await screen.findByText('recovery.offline');
  expect(api.get).not.toHaveBeenCalled();
  act(() => onlineManager.setOnline(true));
  await screen.findByText('Public proposal 10');
  expect(api.post).not.toHaveBeenCalled();
});

test('a delayed earlier reader cannot overwrite a newer decision acknowledgment', async () => {
  const old = deferred();
  setup(10); await screen.findByText('Public proposal 10');
  api.get.mockImplementationOnce(() => old.promise).mockResolvedValueOnce({ data: [{ ...row(), content: 'Latest public fixture', state: 'accepted_as_draft', draft: 17, updated_at: '2026-10-08T10:01:00Z' }] });
  // Begin a background read, then acknowledge a decision and its new read.
  act(() => onlineManager.setOnline(false));
  act(() => onlineManager.setOnline(true));
  api.post.mockResolvedValue({ status: 200, data: { ...row(), content: 'Latest public fixture', state: 'accepted_as_draft', draft: 17, updated_at: '2026-10-08T10:01:00Z' } });
  fireEvent.click(screen.getByRole('button', { name: 'Copy to draft' }));
  await screen.findByText('Latest public fixture');
  await act(async () => old.resolve({ data: [row()] }));
  expect(screen.queryByText('Public proposal 10')).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Open editable draft' })).toBeInTheDocument();
  expect(api.post).toHaveBeenCalledTimes(1);
});
test.each([401, 403, 404, 429, 503])('initial HTTP %s is never empty', async status => {
  const error = new AxiosError('Fixture failure'); error.response = { status, data: { detail: 'private fixture body' } };
  api.get.mockRejectedValue(error); setup(10);
  await screen.findByText([401, 403].includes(status) ? 'connections.forbidden' : status === 404 ? 'recovery.notFound' : 'connections.failed');
  expect(screen.queryByText('suggestions.empty')).not.toBeInTheDocument();
  expect(screen.queryByText('private fixture body')).not.toBeInTheDocument();
});
test('malformed decision acknowledgment stays unknown and cannot replay', async () => {
  setup(10); await screen.findByText('Public proposal 10'); api.post.mockResolvedValue({ status: 200, data: {} });
  fireEvent.click(screen.getByRole('button', { name: 'Copy to draft' }));
  await screen.findByText('suggestions.unknown');
  fireEvent.click(screen.getByRole('button', { name: 'Copy to draft' }));
  expect(api.post).toHaveBeenCalledTimes(1);
});
