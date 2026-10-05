import { act, renderHook, waitFor } from '@testing-library/react';
import { useConversation } from './useInbox';
import { useWhatsAppThread } from './useWhatsApp';
import { inboxAPI, whatsappAPI } from '../services/api';

jest.mock('../services/api', () => ({
  inboxAPI: { conversations: { get: jest.fn() } },
  whatsappAPI: { inbox: { thread: jest.fn() } },
}));

beforeEach(() => jest.clearAllMocks());

describe.each([
  ['unified', useConversation, inboxAPI.conversations.get, id => ({ id })],
  ['WhatsApp', useWhatsAppThread, whatsappAPI.inbox.thread, id => ({ contact: { id } })],
])('%s conversation identity', (_name, useThread, get, data) => {
  test('a late response for A never replaces B; an old refetch cannot load A again', async () => {
    let finishA;
    get.mockImplementation(id => id === 1 ? new Promise(resolve => { finishA = resolve; }) : Promise.resolve({ data: data(2) }));
    const { result, rerender } = renderHook(({ id }) => useThread(id), { initialProps: { id: 1 } });
    await waitFor(() => expect(get).toHaveBeenCalledWith(1));
    const oldRefetch = result.current.refetch;
    rerender({ id: 2 });
    expect(result.current.data).toBeNull();
    await waitFor(() => expect(result.current.data).toEqual(data(2)));
    await act(async () => finishA({ data: data(1) }));
    expect(result.current.data).toEqual(data(2));
    await act(async () => oldRefetch());
    expect(get).toHaveBeenCalledTimes(2);
  });

  test('clearing selection hides previous data immediately and ignores pending responses', async () => {
    let finish;
    get.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    const { result, rerender } = renderHook(({ id }) => useThread(id), { initialProps: { id: 1 } });
    await waitFor(() => expect(get).toHaveBeenCalledWith(1));
    rerender({ id: null });
    expect(result.current.data).toBeNull();
    await act(async () => finish({ data: data(1) }));
    expect(result.current.data).toBeNull();
    expect(result.current.loading).toBe(false);
  });
});
