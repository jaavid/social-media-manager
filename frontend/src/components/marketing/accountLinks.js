// Keep account runtime out of anonymous marketing prefetches.
export function accountLink(to) {
  return typeof to === 'string' && /^\/(?:login|signup|auth|oauth|marketplace|dashboard|admin|u|agency|pending)(?:\/|$)/.test(to);
}
