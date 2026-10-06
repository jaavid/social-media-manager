'use client';
import { useEffect, useRef } from 'react';
import { enMessages, faMessages } from '@/i18n/messages';
const copy = (key) => `${faMessages[key]} / ${enMessages[key]}`;

// The fallback intentionally has no theme, session, query or i18n provider dependency.
export default function RouteFailure({ reset, referenceId }) {
  const heading = useRef(null);
  useEffect(() => {
    heading.current?.focus();
  }, []);
  return (
    <section role="alert" className="mx-auto max-w-xl p-6 text-start">
      <h1 ref={heading} tabIndex={-1} className="text-xl font-semibold">
        {copy('state.fallback.title')}
      </h1>
      <p className="my-4">{copy('state.fallback.description')}</p>
      <button
        type="button"
        onClick={reset}
        className="rounded-md border border-current px-4 py-2 focus-visible:outline-2"
      >
        {copy('state.fallback.retry')}
      </button>
      {referenceId && (
        <p className="mt-4">
          <span>{copy('state.fallback.reference')}</span> <bdi>{referenceId}</bdi>
        </p>
      )}
    </section>
  );
}
