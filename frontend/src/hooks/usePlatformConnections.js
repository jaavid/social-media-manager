import { useCallback, useEffect, useRef, useState } from 'react';
import { oauthAPI } from '@/services/domains/accounts';
import { botChannelsAPI } from '../services/botChannels';
import { loadPlatformRegistry } from '../services/platforms';

const pendingStatus = () => ({ __connectionState: 'pending' });

async function fetchConnectionStatus(clientId) {
  // Hydrate the canonical metadata before publishing a ready connection snapshot.
  // Components that captured getPlatformRegistry() keep the same array reference,
  // which is updated in-place when the registry payload arrives.
  await loadPlatformRegistry();
  const [oauth, botChannels] = await Promise.all([
    oauthAPI.status(clientId),
    botChannelsAPI.status(clientId),
  ]);
  return {
    __connectionState: 'ready',
    ...(oauth.data || {}),
    ...(botChannels.data || {}),
  };
}

export default function usePlatformConnections(clientId) {
  const [status, setStatus] = useState(pendingStatus);
  const [loading, setLoading] = useState(Boolean(clientId));
  const [loaded, setLoaded] = useState(!clientId);
  const [error, setError] = useState(null);
  const requestId = useRef(0);

  const runRequest = useCallback(async ({ reset = false } = {}) => {
    const currentRequest = ++requestId.current;

    if (!clientId) {
      const empty = { __connectionState: 'ready' };
      setStatus(empty);
      setLoading(false);
      setLoaded(true);
      setError(null);
      return empty;
    }

    if (reset) setStatus(pendingStatus());
    setLoading(true);
    setLoaded(false);
    setError(null);

    try {
      const next = await fetchConnectionStatus(clientId);
      if (currentRequest === requestId.current) {
        setStatus(next);
        setLoaded(true);
      }
      return next;
    } catch (err) {
      if (currentRequest === requestId.current) {
        // Keep a previous known-good snapshot on refresh failure. On the first
        // load the pending snapshot stays in place, so consumers never confuse
        // an unknown status with a disconnected account.
        setError(err);
        setLoaded(true);
      }
      throw err;
    } finally {
      if (currentRequest === requestId.current) setLoading(false);
    }
  }, [clientId]);

  const refetch = useCallback(() => runRequest({ reset: false }), [runRequest]);

  useEffect(() => {
    runRequest({ reset: true }).catch(() => {});
    return () => {
      // Invalidates late responses when the client changes or the consumer unmounts.
      requestId.current += 1;
    };
  }, [runRequest]);

  return { status, loading, loaded, error, refetch };
}
