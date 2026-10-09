import React from 'react';
import { render, act } from '@testing-library/react';
import { RealtimeProvider, useRealtime } from './useRealtime';
let mockTransitioning = false;
let mockUser = { id: 1, role: 'client', workspace_id: 42 };
jest.mock('../core/session', () => ({ useSession: () => ({ user: mockUser, transitioning: mockTransitioning, status: mockUser ? 'authenticated' : 'anonymous' }) }));
test('latest listener, identity cleanup and reconnect', () => {
  jest.useFakeTimers();
  const sockets = [];
  const original = global.WebSocket;
  global.WebSocket = class {
    static OPEN = 1;
    constructor() { this.readyState = 1; this.send = jest.fn(); this.close = jest.fn(); sockets.push(this); }
  };
  const first = jest.fn(), second = jest.fn();
  function Consumer({ callback }) { useRealtime(callback); return null; }
  const tree = callback => <RealtimeProvider><Consumer callback={callback} /></RealtimeProvider>;
  const view = render(tree(first));
  act(() => sockets[0].onmessage({ data: JSON.stringify({ type: 'event' }) }));
  expect(first).toHaveBeenCalledTimes(1);
  view.rerender(tree(second));
  act(() => sockets[0].onmessage({ data: JSON.stringify({ type: 'event' }) }));
  expect(second).toHaveBeenCalledTimes(1);
  act(() => { sockets[0].onclose({ code: 1006 }); jest.advanceTimersByTime(1000); });
  expect(sockets).toHaveLength(2);
  mockTransitioning = true;
  view.rerender(tree(second));
  act(() => { sockets[1].onmessage({ data: JSON.stringify({ type: 'event' }) }); jest.advanceTimersByTime(30000); });
  expect(second).toHaveBeenCalledTimes(1);
  expect(sockets[1].close).toHaveBeenCalledTimes(1);
  mockTransitioning = false;
  mockUser = { id: 2, role: 'client', workspace_id: 7 };
  view.rerender(tree(second));
  expect(sockets).toHaveLength(3);
  act(() => sockets[1].onmessage({ data: JSON.stringify({ type: 'obsolete' }) }));
  expect(second).toHaveBeenCalledTimes(1);
  act(() => sockets[2].onmessage({ data: JSON.stringify({ type: 'current' }) }));
  expect(second).toHaveBeenCalledTimes(2);
  mockUser = null;
  view.rerender(tree(second));
  act(() => sockets[2].onmessage({ data: JSON.stringify({ type: 'logged-out' }) }));
  expect(second).toHaveBeenCalledTimes(2);
  expect(sockets[2].close).toHaveBeenCalledTimes(1);
  view.unmount();
  global.WebSocket = original;
  jest.useRealTimers();
});
