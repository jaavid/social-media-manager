import { render, screen } from '@testing-library/react';
import ConnectedAccounts from './ConnectedAccounts';
import { PlatformChoices } from '../../pages/composer/ComposerPage';
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
  test('a registry fixture creates its category, connection card and compatible composer option', () => {
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
      render(<ConnectedAccounts clientId={42} status={{ fixture_network: { status: 'active' } }} />);
      expect(screen.getByRole('region', { name: 'regional' })).toHaveTextContent('Fixture Network');

      const options = connectedPlatforms(
        getPlatformRegistry(),
        { fixture_network: { status: 'active' } },
        'image'
      );
      render(<PlatformChoices platforms={options} />);
      expect(screen.getByRole('button', { name: 'Fixture Network' })).toBeInTheDocument();
    } finally {
      unregister();
    }
  });
});
