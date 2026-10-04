/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */
import { apiBaseUrl, websocketUrl } from '../lib/runtime/config';
import { useSession } from '../core/session';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { invalidateSession } from '../lib/auth/session';

/**
 * Real-time event bus over WebSocket.
 *
 * Mounts once at the root (RealtimeProvider). Connects to ws[s]://host/ws/realtime/ using the HttpOnly session cookie
 * when a validated identity is present; reconnects with exponential backoff;
 * pings every 30s to keep the socket warm.
 *
 * Consumers register via `useRealtime((event) => ...)` — the callback fires
 * for every inbound event. Each event has shape:
 *   { type: 'inbox.new_message' | 'composer.post_published' | ... ,
 *     client_id: <int>,
 *     data: { ... } }
 *
 * The hook also exposes `status` ('connecting' | 'open' | 'closed') so UIs
 * can show a connection indicator if desired.
 */

const RealtimeCtx = createContext({
  status: 'closed',
  subscribe: () => () => {},
});

const PING_INTERVAL_MS = 30_000;
const RECONNECT_BASE_MS = 1_000;
const RECONNECT_MAX_MS = 30_000;


function wsBaseURL() {
  const explicit = websocketUrl();
  if (explicit) return explicit.replace(/\/$/, '');

  const api = apiBaseUrl();
  try {
    const u = new URL(api);
    const proto = u.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${proto}//${u.host}`;
  } catch {
    if (typeof window !== 'undefined' && window.location?.host) {
      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      return `${proto}//${window.location.host}`;
    }
    return 'ws://localhost:8000';
  }
}


export function RealtimeProvider({ children }) {
  const { user } = useSession();
  const identity = user ? JSON.stringify([user.id, user.role, user.workspace_id, user.client_id]) : null;
  const [status, setStatus] = useState('closed');
  const subscribers = useRef(new Set());
  const subscribe = useCallback((cb) => {
    subscribers.current.add(cb);
    return () => subscribers.current.delete(cb);
  }, []);
  useEffect(() => {
    if (!identity) return;
    let active = true;
    let socket;
    let timer;
    let ping;
    let attempt = 0;
    function reconnect() {
      timer = setTimeout(connect, Math.min(RECONNECT_BASE_MS * 2 ** attempt++, RECONNECT_MAX_MS));
    }
    function connect() {
      if (!active) return;
      setStatus('connecting');
      try { socket = new WebSocket(`${wsBaseURL()}/ws/realtime/`); }
      catch { reconnect(); return; }
      socket.onopen = () => {
        if (!active) return;
        attempt = 0;
        setStatus('open');
        ping = setInterval(() => {
          if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: 'ping' }));
        }, PING_INTERVAL_MS);
      };
      socket.onmessage = event => {
        if (!active) return;
        try {
          const data = JSON.parse(event.data);
          if (data?.type) for (const callback of subscribers.current) callback(data);
        } catch { /* Malformed messages and individual subscribers cannot break the transport. */ }
      };
      socket.onclose = event => {
        clearInterval(ping);
        if (!active) return;
        setStatus('closed');
        if (event.code === 4401) { invalidateSession(); return; }
        if (event.code !== 4403) reconnect();
      };
    }
    connect();
    return () => { active = false; clearTimeout(timer); clearInterval(ping); socket?.close(); };
  }, [identity]);
  const value = useMemo(() => ({ status: identity ? status : 'closed', subscribe }), [status, identity, subscribe]);
  return <RealtimeCtx.Provider value={value}>{children}</RealtimeCtx.Provider>;
}


export function useRealtime(callback) {
  const ctx = useContext(RealtimeCtx);
  const cbRef = useRef(callback);
  useEffect(() => { cbRef.current = callback; }, [callback]);

  useEffect(() => {
    if (typeof callback !== 'function') return;
    return ctx.subscribe((event) => cbRef.current?.(event));
  }, [ctx, callback]);

  return { status: ctx.status };
}
