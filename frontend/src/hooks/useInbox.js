/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */
import { useCallback, useEffect, useRef, useState } from 'react';
import { inboxAPI } from '../services/api';

// This feature-owned abstraction has no persistent cache. Every snapshot and
// error belongs to a scope key; cleanup cancels transport and rejects late work.
function useInboxResource(key, fetcher, parse, enabled = true) {
  const [result, setResult] = useState({ key: null, data: null, error: null, loading: false });
  const generation = useRef(0);
  const current = useRef(key);
  current.current = key;
  const controller = useRef(null);
  const refetch = useCallback(async () => {
    if (current.current !== key || !enabled) return;
    const request = ++generation.current;
    controller.current?.abort();
    controller.current = new AbortController();
    setResult(old => ({ key, data: old.key === key ? old.data : null, error: null, loading: true }));
    try {
      const response = await fetcher(controller.current.signal);
      const data = parse(response.data);
      if (current.current === key && generation.current === request) setResult({ key, data, error: null, loading: false });
    } catch (error) {
      if (current.current !== key || generation.current !== request) return;
      const status = error.response?.status;
      setResult(old => ({ key, data: [401, 403, 404].includes(status) ? null : old.data, error, loading: false }));
    }
  }, [key, enabled, fetcher, parse]);
  useEffect(() => {
    refetch();
    const reconnect = () => refetch();
    window.addEventListener('online', reconnect);
    return () => {
      generation.current += 1;
      controller.current?.abort();
      window.removeEventListener('online', reconnect);
    };
  }, [refetch]);
  const matching = result.key === key && enabled;
  return { data: matching ? result.data : null, error: matching ? result.error : null,
    loading: enabled && (!matching || result.loading), refetch };
}

export function parseInboxList(wire) {
  const data = Array.isArray(wire) ? wire : wire?.results;
  if (!Array.isArray(data) || data.some(item => !item || typeof item !== 'object' || !Number.isSafeInteger(item.id))) {
    throw new Error('Invalid inbox response');
  }
  if (!Array.isArray(wire) && (typeof wire.count !== 'number' || ![wire.next, wire.previous].every(v => v === null || typeof v === 'string'))) {
    throw new Error('Invalid inbox pagination');
  }
  return { items: data, count: Array.isArray(wire) ? data.length : wire.count,
    next: Array.isArray(wire) ? null : wire.next, previous: Array.isArray(wire) ? null : wire.previous };
}
const parseThread = wire => {
  if (!wire || !Number.isSafeInteger(wire.id) || !Array.isArray(wire.messages)) throw new Error('Invalid inbox thread');
  return wire;
};
const parseStats = wire => {
  if (!wire || typeof wire !== 'object' || Array.isArray(wire)) throw new Error('Invalid inbox stats');
  return wire;
};
export function useConversations(params, scope = '', enabled = true) {
  const serialized = JSON.stringify(params || {});
  const fetcher = useCallback(signal => inboxAPI.conversations.list(JSON.parse(serialized), signal), [serialized]);
  const result = useInboxResource(`${scope}:${serialized}`, fetcher, parseInboxList, enabled);
  return { ...result, data: result.data?.items || [], pagination: result.data, refreshing: !!result.data && result.loading };
}
export function useConversation(id, scope = '', params = {}) {
  const serialized = JSON.stringify(params);
  const fetcher = useCallback(signal => inboxAPI.conversations.get(id, JSON.parse(serialized), signal), [id, serialized]);
  const result = useInboxResource(`${scope}:${id}:${serialized}`, fetcher, parseThread, !!id);
  return { ...result, data: String(result.data?.id) === String(id) ? result.data : null };
}
export function useReviews(params, scope = '', enabled = true) {
  const serialized = JSON.stringify(params || {});
  const fetcher = useCallback(signal => inboxAPI.reviews.list(JSON.parse(serialized), signal), [serialized]);
  const result = useInboxResource(`${scope}:${serialized}`, fetcher, parseInboxList, enabled);
  return { ...result, data: result.data?.items || [], pagination: result.data };
}
export function useInboxStats(params = {}, scope = '') {
  const serialized = JSON.stringify(params);
  const fetcher = useCallback(signal => inboxAPI.stats(JSON.parse(serialized), signal), [serialized]);
  return useInboxResource(`${scope}:${serialized}`, fetcher, parseStats);
}
