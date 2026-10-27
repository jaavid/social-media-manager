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
  const title = entry.seoTitle || entry.title || entry.name || entry.company || slug;
  const description = entry.seoDescription || entry.description || entry.heroSubtitle || entry.excerpt || entry.headline || entry.subtitle || '';
  // Fictional marketing records must not acquire the status of real customers
  // or verified agencies when their native Next metadata is generated.
  if (family === 'customers' || family === 'agencies') {
    return {
      title: `سناریوی نمایشی — ${title}`,
      description: 'این صفحه نمونه‌ای فرضی برای نمایش کاربرد راوینتاست؛ نام اشخاص، نظرها، رتبه‌ها و نتایج، دادهٔ واقعی یا تأییدشدهٔ مشتریان نیستند.',
    };
  }
  return { title, description };
}
