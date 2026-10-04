'use client';
import { RealtimeProvider } from '../../hooks/useRealtime';
import RealtimeBridge from '../../components/RealtimeBridge';

export default function PrivateRuntime({ children }) {
  return <RealtimeProvider><RealtimeBridge />{children}</RealtimeProvider>;
}
