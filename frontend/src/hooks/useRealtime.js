/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { invalidateSession, refreshAccessToken } from '../lib/auth/session';

/**
 * Real-time event bus over WebSocket.
 *
 * Mounts once at the root (RealtimeProvider). Connects to ws[s]://host/ws/realtime/?token=<JWT>
 * when a JWT is present in localStorage; reconnects with exponential backoff;
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
  const explicit = process.env.REACT_APP_WS_URL;
  if (explicit) return explicit.replace(/\/$/, '');

  const api = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';
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
  const [status, setStatus] = useState('closed');
  const subscribers = useRef(new Set());
  const wsRef = useRef(null);
  const reconnectTimer = useRef(null);
  const pingTimer = useRef(null);
  const attempt = useRef(0);
  const connectionGeneration = useRef(0);

  const subscribe = useCallback((cb) => {
    subscribers.current.add(cb);
    return () => subscribers.current.delete(cb);
  }, []);

  const dispatch = useCallback((event) => {
    for (const cb of subscribers.current) {
      try { cb(event); } catch (e) { /* swallow per-subscriber errors */ }
    }
  }, []);

  const close = useCallback(() => {
    connectionGeneration.current += 1;
    if (reconnectTimer.current) { clearTimeout(reconnectTimer.current); reconnectTimer.current = null; }
    if (pingTimer.current) { clearInterval(pingTimer.current); pingTimer.current = null; }
    if (wsRef.current) {
      try { wsRef.current.close(); } catch {}
      wsRef.current = null;
    }
    setStatus('closed');
  }, []);

  const connect = useCallback(() => {
    const token = (typeof localStorage !== 'undefined') ? localStorage.getItem('access_token') : null;
    if (!token) return;

    const generation = ++connectionGeneration.current;
    setStatus('connecting');
    const url = `${wsBaseURL()}/ws/realtime/?token=${encodeURIComponent(token)}`;
    let ws;
    try {
      ws = new WebSocket(url);
    } catch (e) {
      scheduleReconnect();
      return;
    }
    wsRef.current = ws;

    ws.onopen = () => {
      if (connectionGeneration.current !== generation || wsRef.current !== ws) return;
      attempt.current = 0;
      setStatus('open');
      pingTimer.current = setInterval(() => {
        try { ws.send(JSON.stringify({ type: 'ping' })); } catch {}
      }, PING_INTERVAL_MS);
    };

    ws.onmessage = (e) => {
      if (connectionGeneration.current !== generation || wsRef.current !== ws) return;
      try {
        const event = JSON.parse(e.data);
        if (event && event.type) dispatch(event);
      } catch {}
    };

    ws.onclose = async (e) => {
      if (connectionGeneration.current !== generation || wsRef.current !== ws) return;

      if (pingTimer.current) { clearInterval(pingTimer.current); pingTimer.current = null; }
      wsRef.current = null;
      setStatus('closed');

      if (e.code === 4401) {
        try {
          await refreshAccessToken(token);
          if (connectionGeneration.current !== generation) return;
          attempt.current = 0;
          connect();
        } catch {
          if (connectionGeneration.current === generation) {
            invalidateSession({ expectedAccessToken: token });
          }
        }
        return;
      }
      if (e.code === 4403) return;
      if (connectionGeneration.current === generation) scheduleReconnect();
    };

    ws.onerror = () => {
      // onclose will follow; reconnect logic lives there.
    };
  // eslint-disable-next-line
  }, [dispatch]);

  const scheduleReconnect = useCallback(() => {
    if (reconnectTimer.current) return;
    const delay = Math.min(
      RECONNECT_BASE_MS * Math.pow(2, attempt.current),
      RECONNECT_MAX_MS,
    );
    attempt.current += 1;
    reconnectTimer.current = setTimeout(() => {
      reconnectTimer.current = null;
      connect();
    }, delay);
  }, [connect]);

  useEffect(() => {
    connect();
    return () => close();
  // eslint-disable-next-line
  }, []);

  useEffect(() => {
    function onStorage(e) {
      if (e.key === 'access_token') {
        close();
        attempt.current = 0;
        connect();
      }
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  // eslint-disable-next-line
  }, [close, connect]);

  const value = useMemo(() => ({ status, subscribe }), [status, subscribe]);

  return (
    <RealtimeCtx.Provider value={value}>
      {children}
    </RealtimeCtx.Provider>
  );
}


export function useRealtime(callback) {
  const ctx = useContext(RealtimeCtx);
  const cbRef = useRef(callback);
  cbRef.current = callback;

  useEffect(() => {
    if (typeof callback !== 'function') return;
    return ctx.subscribe((event) => cbRef.current?.(event));
  // eslint-disable-next-line
  }, [ctx]);

  return { status: ctx.status };
}
