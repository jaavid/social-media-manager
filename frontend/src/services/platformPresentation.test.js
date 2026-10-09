import catalogue from './platformCatalogue.generated.json';
import { legacyPlatformMap, platformOptions } from './platformPresentation';
import { hydratePlatformRegistry, PLATFORMS, PLATFORM_LIST } from './platforms';

it('includes Bale in publishing and scheduling but keeps planned Eitaa disabled', () => {
  expect(platformOptions('publish').map(p => p.key)).toContain('bale');
  expect(platformOptions('scheduling').map(p => p.key)).toContain('bale');
  expect(platformOptions('publish').map(p => p.key)).not.toContain('eitaa');
  expect(legacyPlatformMap().eitaa.label).toBe('Eitaa');
});
it('a new API manifest supplies presentation, modes and limits without a frontend map', () => {
  const provider = { key: 'new_network', titles: { en: 'New network', fa: 'جدید' }, category: 'general_social',
    capabilities: { publish_text: 'supported', analytics: 'planned' },
    contract: { brand: { color: '#123456' }, publishing_modes: { text: { constraints: { max_characters: 123 } } } } };
  expect(platformOptions('publish', [provider])[0]).toMatchObject({ key: provider.key, color: '#123456', limit: 123 });
  expect(platformOptions('analytics', [provider])).toEqual([]);
  try {
    hydratePlatformRegistry({ ...catalogue, platforms: [...catalogue.platforms, provider] });
    expect(PLATFORM_LIST).toContain(provider.key);
    expect(PLATFORMS[provider.key]).toMatchObject({ color: '#123456', maxText: 123, types: ['text'] });
  } finally { hydratePlatformRegistry(catalogue); }
});
