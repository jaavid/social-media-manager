import { connectionFixture, connectionAccount } from '../src/services/__fixtures__/connections';
export function legacyComposerConnections(workspaceId = 7, platform = 'facebook') {
  const wire = connectionFixture(workspaceId);
  const provider = wire.providers[0];
  provider.key = platform;
  provider.titles = { en: platform === 'telegram' ? 'Telegram' : 'Facebook', fa: platform === 'telegram' ? 'تلگرام' : 'فیس‌بوک' };
  provider.capabilities = { ...provider.capabilities, publish_image: 'supported', publish_video: 'supported', scheduling: 'supported', inbox: 'supported', comments: platform === 'telegram' ? 'not_available' : 'supported' };
  const mode = name => ({ capability: 'publish_text', constraints: { max_characters: 4096 }, ui_extension: platform === 'telegram' ? 'telegram_composer' : '' });
  provider.contract.publishing_modes = platform === 'telegram' ? Object.fromEntries(['text', 'image', 'video', 'carousel', 'album', 'rich', 'poll'].map(m => [m, mode(m)])) : { text: mode('text') };
  if (platform === 'telegram') provider.contract.ui_extensions = ['telegram_composer', 'telegram_engagement'];
  provider.accounts = [{ ...connectionAccount(workspaceId), id: workspaceId, name: platform === 'telegram' ? 'News' : 'First account' }];
  return wire;
}
export async function mockComposerConnections(page, workspaceId = 7, platform = 'facebook') {
  await page.route(`**/api/workspaces/${workspaceId}/connections/**`, route => route.fulfill({ json: legacyComposerConnections(workspaceId, platform) }));
}
