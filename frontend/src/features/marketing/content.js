import { productPages } from './productPages';
import { solutionPages } from './solutionPages';
import STUDIES from './caseStudies';
import POSTS from './blogPosts';
import AGENCIES from './agencyProfiles';

/** The same authored content drives pages, static params and metadata. */
export const marketingContent = {
  product: productPages,
  solutions: solutionPages,
  customers: STUDIES,
  blog: Object.fromEntries(POSTS.map(post => [post.slug, post])),
  agencies: AGENCIES,
};
export function contentMetadata(family, slug) {
  const entries = marketingContent[family];
  if (!entries || !Object.hasOwn(entries, slug)) return null;
  const entry = entries[slug];
  return {
    title: entry.seoTitle || entry.title || entry.name || slug,
    description: entry.seoDescription || entry.description || entry.heroSubtitle || entry.excerpt || entry.headline || entry.subtitle || '',
  };
}
