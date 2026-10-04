import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import slugs from './lib/marketing-slugs.json';

// Validate only authored public slugs before dynamic root streaming can commit
// HTTP 200. This is unrelated to API forwarding or identity authorization.
export function proxy(request: NextRequest) {
  const [, family, slug] = request.nextUrl.pathname.split('/');
  const known = slugs[family as keyof typeof slugs];
  let decoded = slug;
  try { decoded = decodeURIComponent(slug || ''); } catch { decoded = ''; }
  if (known && slug && !known.includes(decoded)) {
    return NextResponse.rewrite(new URL('/unknown-marketing-content', request.url), { status: 404 });
  }
  return NextResponse.next();
}
export const config = { matcher: ['/product/:slug', '/solutions/:slug', '/customers/:slug', '/blog/:slug', '/agencies/:slug'] };
