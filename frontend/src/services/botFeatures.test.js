import { featureStatus, hasFeature, getPlatformRegistry, supportsMedia } from './platforms';

test('bot feature gates distinguish supported Telegram features from unavailable Bale features', () => {
  expect(hasFeature('telegram', 'media_group')).toBe(true);
  expect(hasFeature('bale', 'media_group')).toBe(true);
  expect(featureStatus('telegram', 'rich_message')).toBe('supported');
  expect(featureStatus('bale', 'rich_message')).toBe('not_available');
  expect(hasFeature('telegram', 'rich_message')).toBe(true);
  expect(hasFeature('telegram', 'forum_topics', 'channel')).toBe(false);
  expect(hasFeature('telegram', 'streamed_drafts', 'channel')).toBe(false);
  expect(hasFeature('telegram', 'forum_topics', 'forum_supergroup')).toBe(true);
  expect(hasFeature('unknown', 'media_group')).toBe(false);
});

test('advanced composer modes survive registry filtering only for Telegram', () => {
  const rows = getPlatformRegistry();
  const telegram = rows.find(p => p.key === 'telegram');
  const bale = rows.find(p => p.key === 'bale');
  for (const type of ['album', 'rich', 'poll']) {
    expect(supportsMedia(telegram, type)).toBe(true);
    expect(supportsMedia(bale, type)).toBe(false);
  }
});
