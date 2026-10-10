const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const types = ['channel', 'group', 'supergroup', 'forum_supergroup', 'channel_direct_messages', 'private', 'private_forum'];
export function destinationContext(value: unknown) {
  if (!object(value) || Object.keys(value).some(key => !['destination_type', 'message_thread_id', 'direct_messages_topic_id'].includes(key))) throw new Error('Invalid destination context');
  const kind = value.destination_type ?? 'channel';
  if (typeof kind !== 'string' || !types.includes(kind)) throw new Error('Invalid destination context');
  for (const field of ['message_thread_id', 'direct_messages_topic_id']) {
    const number = value[field];
    if (number !== undefined && number !== null && (!Number.isSafeInteger(number) || (number as number) <= 0)) throw new Error('Invalid destination context');
  }
  return { destination_type: kind, message_thread_id: value.message_thread_id ?? null, direct_messages_topic_id: value.direct_messages_topic_id ?? null };
}
export function sameDestination(left: unknown, right: unknown) {
  const a = destinationContext(left), b = destinationContext(right);
  return a.destination_type === b.destination_type && a.message_thread_id === b.message_thread_id && a.direct_messages_topic_id === b.direct_messages_topic_id;
}
export function parseTelegramSettings(value: unknown) {
  if (!object(value) || typeof value.rich_enabled !== 'boolean' || typeof value.assistant_enabled !== 'boolean'
      || (value.assistant_rich !== undefined && typeof value.assistant_rich !== 'boolean')) throw new Error('Invalid settings response');
  destinationContext(value.destination_context);
  return { destination_context: value.destination_context as Record<string, unknown>, rich_enabled: value.rich_enabled,
    assistant_enabled: value.assistant_enabled, assistant_rich: value.assistant_rich ?? false,
    webhook_managed: value.webhook_managed === true, webhook_enabled: value.webhook_enabled === true, last_update_at: typeof value.last_update_at === 'string' ? value.last_update_at : null };
}
