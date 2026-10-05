import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import slugs from './lib/marketing-slugs.json';
import { isPublicRoute } from './i18n/public-routes';

// Validate only authored public slugs before dynamic root streaming can commit
// HTTP 200. This is unrelated to API forwarding or identity authorization.
export function proxy(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-socialstats-return-to', request.nextUrl.pathname + request.nextUrl.search);
  requestHeaders.set('x-socialstats-public-language', isPublicRoute(request.nextUrl.pathname) ? 'fa' : '');
  const [, family, slug] = request.nextUrl.pathname.split('/');
  const known = slugs[family as keyof typeof slugs];
  let decoded = slug;
  try { decoded = decodeURIComponent(slug || ''); } catch { decoded = ''; }
  if (known && slug && !known.includes(decoded)) {
    return NextResponse.rewrite(new URL('/unknown-marketing-content', request.url), { status: 404, request: { headers: requestHeaders } });
  }
  return NextResponse.next({ request: { headers: requestHeaders } });
}
export const config = { matcher: ['/((?!api|_next|.*\\.(?:png|jpe?g|gif|svg|ico|webp|avif|woff2?|css|js|json|txt|xml)$).*)'] };
