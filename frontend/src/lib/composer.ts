export interface MediaConstraints {
  min_items?: number | null; max_width?: number | null; max_characters?: number | null; max_items?: number | null; max_bytes?: number | null; mime_types?: string[];
  max_seconds?: number | null; aspect_min?: number | null; aspect_max?: number | null;
  min_width?: number | null; min_height?: number | null; scopes?: string[]; destination_types?: string[];
}
export interface PublishingMode { capability: string; constraints: MediaConstraints; ui_extension?: string }
export interface PublishingContract { publishing_modes?: Record<string, PublishingMode> }
export function enabled(status?: string) { return status === 'supported' || status === 'beta'; }
export function publishingModes(provider: { capabilities: Record<string, string>; contract: PublishingContract; rollout_status: string }) {
  if (['blocked', 'deprecated'].includes(provider.rollout_status)) return {};
  return Object.fromEntries(Object.entries(provider.contract.publishing_modes || {}).filter(([, mode]) => enabled(provider.capabilities[mode.capability])));
}
export function incompatibilities(policy: MediaConstraints, content: string, media: { mime_type?: string; file_size?: number; width?: number | null; height?: number | null; duration_seconds?: number | null }[]) {
  const errors: string[] = [];
  if (policy.max_characters && [...content].length > policy.max_characters) errors.push('text_limit');
  if (policy.min_items && media.length < policy.min_items) errors.push('media_count');
  if (policy.max_items && media.length > policy.max_items) errors.push('media_count');
  for (const asset of media) {
    if (policy.max_bytes && asset.file_size && asset.file_size > policy.max_bytes) errors.push('media_size');
    if (policy.mime_types?.length && asset.mime_type && !policy.mime_types.includes(asset.mime_type)) errors.push('media_type');
    if (policy.max_seconds && asset.duration_seconds && asset.duration_seconds > policy.max_seconds) errors.push('media_duration');
    if (policy.max_width && asset.width && asset.width > policy.max_width) errors.push('media_dimensions');
    if (policy.min_width && asset.width && asset.width < policy.min_width) errors.push('media_dimensions');
    if (policy.min_height && asset.height && asset.height < policy.min_height) errors.push('media_dimensions');
    if (asset.width && asset.height && ((policy.aspect_min && asset.width / asset.height < policy.aspect_min) || (policy.aspect_max && asset.width / asset.height > policy.aspect_max))) errors.push('media_aspect');
  }
  return [...new Set(errors)];
}
export function localInput(iso: string) { const d = new Date(iso); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16); }
export function scheduledInstant(local: string) { const date = new Date(local); return Number.isFinite(date.getTime()) ? date.toISOString() : null; }
