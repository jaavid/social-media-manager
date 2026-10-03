// Server-only route metadata; never infer deployment origin from browser state.
export function publicMetadata(title, description, path) {
  const metadata = { title, description };
  if (!process.env.NEXT_PUBLIC_SITE_URL) return metadata;
  const fullTitle = `${title} · Social Stats`;
  return {
    ...metadata,
    alternates: { canonical: path },
    openGraph: {
      title: fullTitle, description, type: 'website', siteName: 'Social Stats',
      url: path, images: ['/og-image.png'],
    },
    twitter: {
      card: 'summary_large_image', title: fullTitle, description,
      images: ['/og-image.png'],
    },
  };
}
