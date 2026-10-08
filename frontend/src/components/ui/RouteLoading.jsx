import { enMessages, faMessages } from '@/i18n/messages';
/** Static fallback: usable before any feature/session/i18n provider initializes. */
export default function RouteLoading() {
  return <section role="status" aria-busy="true" className="space-y-4 p-6">
    <span className="sr-only">{faMessages['recovery.loading']} / {enMessages['recovery.loading']}</span>
    <div aria-hidden="true" className="h-8 w-1/2 rounded bg-muted" />
    <div aria-hidden="true" className="grid gap-4 md:grid-cols-3">{[1, 2, 3].map(id => <div key={id} className="h-32 rounded border border-border bg-muted" />)}</div>
  </section>;
}
