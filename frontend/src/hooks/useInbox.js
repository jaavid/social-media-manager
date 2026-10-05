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

export function useConversations(params) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refetch = useCallback(async () => {
    try {
      setLoading(true);
      const res = await inboxAPI.conversations.list(params);
      setData(res.data?.results || res.data || []);
      setError(null);
    } catch (e) { setError(e); }
    finally    { setLoading(false); }
  // eslint-disable-next-line
  }, [JSON.stringify(params || {})]);

  useEffect(() => { refetch(); }, [refetch]);
  return { data, loading, error, refetch };
}

export function useConversation(id) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const currentId = useRef(id);
  const requestId = useRef(0);

  const refetch = useCallback(async () => {
    if (currentId.current !== id) return;
    const request = ++requestId.current;
    await Promise.resolve();
    if (request !== requestId.current || currentId.current !== id) return;
    if (!id) { setData(null); setLoading(false); return; }
    try {
      setLoading(true);
      const res = await inboxAPI.conversations.get(id);
      if (request === requestId.current && currentId.current === id) setData(res.data);
    } catch {
      if (request === requestId.current && currentId.current === id) setData(null);
    } finally {
      if (request === requestId.current && currentId.current === id) setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    currentId.current = id;
    refetch();
    return () => { currentId.current = null; };
  }, [id, refetch]);
  return { data: String(data?.id) === String(id) ? data : null, loading, refetch };
}

export function useReviews(params) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    try {
      setLoading(true);
      const res = await inboxAPI.reviews.list(params);
      setData(res.data?.results || res.data || []);
    } finally { setLoading(false); }
  // eslint-disable-next-line
  }, [JSON.stringify(params || {})]);

  useEffect(() => { refetch(); }, [refetch]);
  return { data, loading, refetch };
}

export function useInboxStats() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    try {
      setLoading(true);
      const res = await inboxAPI.stats();
      setData(res.data);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { refetch(); }, [refetch]);
  return { data, loading, refetch };
}
