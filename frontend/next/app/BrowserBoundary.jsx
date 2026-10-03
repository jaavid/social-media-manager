'use client';
import dynamic from 'next/dynamic';
// Existing features still include browser-only libraries. Import the provider tree
// only in the browser; server layouts, loading states and metadata stay server-safe.
const BrowserHost = dynamic(() => import('./BrowserHost'), {
  ssr: false, loading: () => <div role="status" aria-busy="true" />,
});
export default function BrowserBoundary({ children }) {
  return <BrowserHost>{children}</BrowserHost>;
}
