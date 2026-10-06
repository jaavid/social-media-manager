'use client';
import RouteFailure from '../components/ui/RouteFailure';
export default function GlobalError({ reset }) {
  return <html lang="fa" dir="rtl"><body><RouteFailure reset={reset} /></body></html>;
}
