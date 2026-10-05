import fixture from './__fixtures__/platformExample.json';
import {
  connectedPlatforms, getPlatformRegistry, hydratePlatformRegistry,
  platformHasCapability, supportsMedia,
} from './platforms';

let previous;
beforeEach(() => {
  previous = getPlatformRegistry().map(item => ({
    ...item,
    capabilities: item.capabilityStatuses,
    titles: { fa: item.labels.fa, en: item.labels.en },
    auth_type: item.auth_type,
  }));
});
afterEach(() => hydratePlatformRegistry({ categories: fixture.categories, platforms: previous }));

test('a new backend manifest enters Connected Accounts and Composer selectors through API hydration', () => {
  const platforms = hydratePlatformRegistry(fixture);
  const example = platforms.find(item => item.key === 'contract_example');
  expect(example.labels.en).toBe('Contract example');
  expect(platformHasCapability(example, 'connect')).toBe(true);
  expect(platformHasCapability(example, 'publish')).toBe(true);
  expect(supportsMedia(example, 'text')).toBe(true);
  expect(supportsMedia(example, 'video')).toBe(false);
  const connected = { __connectionState: 'ready', contract_example: { status: 'active' } };
  expect(connectedPlatforms(platforms, connected, 'text')).toEqual([example]);
  expect(connectedPlatforms(platforms, connected, 'video')).toEqual([]);
  expect(connectedPlatforms(platforms, { __connectionState: 'ready' }, 'text')).toEqual([]);
});

test('planned capabilities in a new manifest remain disabled', () => {
  const row = fixture.platforms[0];
  const platforms = hydratePlatformRegistry({ ...fixture, platforms: [{
    ...row, capabilities: { ...row.capabilities, publish_text: 'planned' },
  }] });
  expect(platformHasCapability(platforms[0], 'publish')).toBe(false);
  expect(supportsMedia(platforms[0], 'text')).toBe(false);
});
