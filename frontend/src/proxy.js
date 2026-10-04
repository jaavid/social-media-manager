import { NextResponse } from 'next/server';
import content from './core/routes/route-content.json';

// Validate static marketing slugs before rendering starts. A streamed notFound()
// can otherwise show a 404 page with HTTP 200 after the shell is flushed.
export function proxy(request) {
  const [family, slug] = request.nextUrl.pathname.split('/').filter(Boolean);
  if (content[family] && slug && !Object.hasOwn(content[family], slug)) {
    const target = request.nextUrl.clone();
    target.pathname = '/404';
    return NextResponse.rewrite(target, { status: 404 });
  }
  return NextResponse.next();
}
export const config = {
  matcher: ['/product/:slug', '/solutions/:slug', '/customers/:slug', '/blog/:slug', '/agencies/:slug'],
};
