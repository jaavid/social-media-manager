// Server-only route metadata; never infer deployment origin from browser state.
export function publicMetadata(title, description, path, privateRoute = false) {
  const metadata = { title, description, ...(privateRoute ? { robots: { index: false, follow: false } } : {}) };
  if (privateRoute) return metadata;
  if (!process.env.NEXT_PUBLIC_SITE_URL) return metadata;
  const fullTitle = `${title} · Ravinta`;
  return {
    ...metadata,
    alternates: { canonical: path },
    openGraph: {
      title: fullTitle, description, type: 'website', siteName: 'Ravinta',
      url: path, images: ['/og-image.png'],
    },
    twitter: {
      card: 'summary_large_image', title: fullTitle, description,
      images: ['/og-image.png'],
    },
  };
}
