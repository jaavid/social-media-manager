import 'server-only';
import { cookies, headers } from 'next/headers';
import type { Language } from './messages';
export async function requestLanguage(): Promise<Language> {
  if ((await headers()).get('x-socialstats-public-language') === 'fa') return 'fa';
  return (await cookies()).get('socialstats.language')?.value === 'en' ? 'en' : 'fa';
}
