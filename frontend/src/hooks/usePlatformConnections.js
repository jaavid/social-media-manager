import { useCallback, useEffect, useState } from 'react';
import { getConnectionStatus } from '../services/platforms';

export default function usePlatformConnections(clientId) {
  const [status, setStatus] = useState({});
  const [loading, setLoading] = useState(Boolean(clientId));

  const refetch = useCallback(async () => {
    if (!clientId) {
      setStatus({});
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setStatus(await getConnectionStatus(clientId));
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => { refetch(); }, [refetch]);
  return { status, loading, refetch };
}
