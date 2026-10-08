/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */

/** Server-rendered structured data; React removes it with the owning route. */
export default function JsonLd({ id, data }) {
  if (!data) return null;
  // Escape '<' so feature-provided content cannot close the JSON script tag.
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  return <script id={`jsonld-${id}`} type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}

// ── shared site identity ──────────────────────────────────────────────
const PUBLIC_SITE_ORIGIN = (process.env.NEXT_PUBLIC_SITE_URL || 'https://socialstats.app').replace(/\/$/, '');
const SITE = {
  name: 'راوینتا',
  url: PUBLIC_SITE_ORIGIN,
  logo: `${PUBLIC_SITE_ORIGIN}/screenshot.png`,
  sameAs: [
    'https://github.com/cbsshekhawat18-lab/social-stats-social-media-manager',
  ],
};

const ORG_NODE = {
  '@type': 'Organization',
  '@id': `${SITE.url}/#organization`,
  name: SITE.name,
  url: SITE.url,
  logo: SITE.logo,
  sameAs: SITE.sameAs,
};


// ── builders ──────────────────────────────────────────────────────────
export function buildOrganization() {
  return {
    '@context': 'https://schema.org',
    ...ORG_NODE,
    foundingDate: '2024',
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'IN',
      addressLocality: 'Bengaluru',
      addressRegion: 'Karnataka',
    },
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer support',
      url: 'https://github.com/cbsshekhawat18-lab/social-stats-social-media-manager/issues',
      availableLanguage: ['fa'],
    },
  };
}

export function buildWebSite() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE.url}/#website`,
    url: SITE.url,
    name: SITE.name,
    inLanguage: 'fa-IR',
    publisher: { '@id': `${SITE.url}/#organization` },
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: `${SITE.url}/blog?q={search_term_string}` },
      'query-input': 'required name=search_term_string',
    },
  };
}

export function buildBreadcrumbs(items) {
  // items: [{ name, url }] — root → leaf
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: it.url,
    })),
  };
}

export function buildArticle({ title, description, slug, datePublished, dateModified, authorName, image }) {
  const url = `${SITE.url}/blog/${slug}`;
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    url,
    datePublished,
    dateModified: dateModified || datePublished,
    author: { '@type': 'Person', name: authorName },
    publisher: ORG_NODE,
    image: image || SITE.logo,
  };
}

export function buildSoftwareApplication({ name, description, image, ratingValue, ratingCount }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: name ? `Ravinta — ${name}` : 'Ravinta',
    description,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web, iOS, Android',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'INR',
      url: SITE.url,
    },
    image: image || SITE.logo,
    publisher: ORG_NODE,
    ...(ratingValue && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue,
        ratingCount,
        bestRating: 5,
        worstRating: 1,
      },
    }),
  };
}

export function buildFAQ(items) {
  // items: [{ question, answer }]
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((it) => ({
      '@type': 'Question',
      name: it.question,
      acceptedAnswer: { '@type': 'Answer', text: it.answer },
    })),
  };
}

export function buildLocalBusiness({ name, slug, description, location, rating, founded }) {
  const url = `${SITE.url}/agencies/${slug}`;
  return {
    '@context': 'https://schema.org',
    '@type': 'ProfessionalService',
    name,
    description,
    url,
    foundingDate: String(founded),
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'IN',
      addressLocality: location,
    },
    ...(rating && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: rating.score,
        ratingCount: rating.count,
        bestRating: 5,
        worstRating: 1,
      },
    }),
  };
}

export const SITE_URL = SITE.url;
