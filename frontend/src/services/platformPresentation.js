import catalogue from './platformCatalogue.generated.json';

export function platformColor(platform) {
  return platform?.contract?.brand?.color || '#64748B';
}
export function legacyPlatformMap(platforms = catalogue.platforms) {
  return Object.fromEntries(platforms.map(p => {
    const modes = p.contract?.publishing_modes || {};
    const limits = Object.values(modes).map(m => m.constraints?.max_characters).filter(Number.isFinite);
    const color = platformColor(p);
    return [p.key, { label: p.titles.en, label_fa: p.titles.fa, shortLabel: p.titles.en,
      color, bg: `${color}15`, types: Object.keys(modes),
      metrics: (p.contract?.analytics?.metrics || []).map(m => m.key),
      maxText: limits.length ? Math.max(...limits) : 5000,
      limit: limits.length ? Math.max(...limits) : 5000,
    }];
  }));
}
export function platformOptions(capability, platforms = catalogue.platforms) {
  return platforms.filter(p => {
    const enabled = key => ['supported', 'beta'].includes(p.capabilities[key]);
    return capability === 'publish' ? ['publish_text', 'publish_image', 'publish_video'].some(enabled) : enabled(capability);
  }).map(p => ({ value: p.key, key: p.key, label: p.titles.en, label_fa: p.titles.fa, color: platformColor(p), limit: legacyPlatformMap([p])[p.key].maxText }));
}
