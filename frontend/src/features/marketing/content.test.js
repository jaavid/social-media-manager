import { contentMetadata, marketingContent } from './content';

test('native route metadata is derived directly from each authored content family', () => {
  for (const [family, pages] of Object.entries(marketingContent)) {
    for (const [slug, page] of Object.entries(pages)) {
      expect(contentMetadata(family, slug)).toEqual({
        title: page.seoTitle || page.title || page.name || slug,
        description: page.seoDescription || page.description || page.heroSubtitle || page.excerpt || page.headline || page.subtitle || '',
      });
    }
  }
});

test('unknown and inherited slugs cannot resolve as authored content', () => {
  for (const family of Object.keys(marketingContent)) {
    for (const slug of ['missing-content', 'toString', '__proto__', 'constructor']) {
      expect(contentMetadata(family, slug)).toBeNull();
    }
  }
});
