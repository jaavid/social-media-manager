import { publishingModes } from '@/lib/composer';
import { connectionFixture } from '@/services/__fixtures__/connections';
import { connectedPlatforms, getPlatformRegistry, registerPlatform } from '../../services/platforms';

jest.mock('../../services/botChannels', () => ({
  botChannelsAPI: {
    status: jest.fn(() => Promise.resolve({ data: {} })),
    connect: jest.fn(),
    disconnect: jest.fn(),
  },
}));
jest.mock('../ApiConnectivityPanel', () => () => null);

describe('metadata-driven platform UI', () => {
  test('a registry fixture creates a compatible composer option', () => {
    const fixture = {
      key: 'fixture_network',
      labels: { default: 'Fixture Network', short: 'Fixture' },
      category: 'regional',
      authType: 'api_credentials',
      capabilities: ['image'],
      color: '#654321',
      order: 15,
      connection: {
        help: 'Fixture connection help.',
        fields: [{ key: 'api_key', label: 'API key', placeholder: 'key', required: true }],
      },
    };
    const unregister = registerPlatform(fixture);

    try {
      const options = connectedPlatforms(
        getPlatformRegistry(),
        { __connectionState: 'ready', fixture_network: { status: 'active' } },
        'image'
      );
      expect(options.some(p => p.key === 'fixture_network')).toBe(true);
      const provider = connectionFixture().providers[0];
      expect(publishingModes(provider).text.capability).toBe('publish_text');
      provider.capabilities.publish_text = 'not_available';
      expect(publishingModes(provider)).toEqual({});
    } finally {
      unregister();
    }
  });

  test('unknown connection state preserves compatible targets while a known empty state filters them', () => {
    const registry = getPlatformRegistry();
    expect(connectedPlatforms(registry, { __connectionState: 'pending' }, 'image').length).toBeGreaterThan(0);
    expect(connectedPlatforms(registry, { __connectionState: 'ready' }, 'image')).toHaveLength(0);
  });
});
