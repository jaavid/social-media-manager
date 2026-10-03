import { featureStatus, hasFeature } from './platforms';

test('bot feature gates distinguish planned Telegram features from unavailable Bale features', () => {
  expect(hasFeature('telegram', 'media_group')).toBe(true);
  expect(hasFeature('bale', 'media_group')).toBe(true);
  expect(featureStatus('telegram', 'rich_message')).toBe('planned');
  expect(featureStatus('bale', 'rich_message')).toBe('not_available');
  expect(hasFeature('telegram', 'rich_message')).toBe(false);
  expect(hasFeature('telegram', 'forum_topics', 'channel')).toBe(false);
  expect(hasFeature('telegram', 'streamed_drafts', 'channel')).toBe(false);
  expect(hasFeature('telegram', 'forum_topics', 'forum_supergroup')).toBe(false);
  expect(hasFeature('unknown', 'media_group')).toBe(false);
});
