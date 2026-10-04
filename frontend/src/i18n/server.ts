import 'server-only';
import { cookies } from 'next/headers';
import type { Language } from './messages';
export async function requestLanguage(): Promise<Language> {
  return (await cookies()).get('socialstats.language')?.value === 'en' ? 'en' : 'fa';
}
