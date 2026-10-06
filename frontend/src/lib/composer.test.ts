import { incompatibilities, scheduledInstant, localInput, publishingModes } from './composer';
import { connectionFixture } from '@/services/__fixtures__/connections';
test('text, count, format, size, aspect and duration boundaries remain actionable', () => {
  const policy = { max_characters: 4, max_items: 1, max_bytes: 100, mime_types: ['image/jpeg'], max_seconds: 10, aspect_min: 0.8, aspect_max: 1.9 };
  const asset = { mime_type: 'image/jpeg', file_size: 100, width: 100, height: 100, duration_seconds: 10 };
  expect(incompatibilities(policy, '😀😀😀😀', [asset])).toEqual([]);
  expect(incompatibilities(policy, 'abcde', [asset, { ...asset, mime_type: 'image/png', file_size: 101, width: 200, duration_seconds: 11 }])).toEqual(['text_limit', 'media_count', 'media_size', 'media_type', 'media_duration', 'media_aspect']);
});
test('the standard fixture modes are contract-driven and scheduling stays independent', () => {
  const provider = connectionFixture().providers[0];
  expect(publishingModes(provider).text.constraints.max_characters).toBe(100);
  expect(provider.capabilities.scheduling).toBe('not_available');
  provider.rollout_status = 'blocked'; expect(publishingModes(provider)).toEqual({});
});
test('display conversion round trips a scheduling instant independently of locale', () => {
  const instant = '2030-06-12T15:00:00.000Z';
  expect(scheduledInstant(localInput(instant))).toBe(instant);
  expect(scheduledInstant('invalid')).toBeNull();
});
