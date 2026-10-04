import HomePage from '@/features/HomePage';
import ReturningUserRedirect from '@/components/marketing/ReturningUserRedirect';
import { publicMetadata } from '../../lib/metadata.mjs';
import { requestLanguage } from '@/i18n/server';
import { message } from '@/i18n/translate';
export async function generateMetadata() {
  const language = await requestLanguage();
  return publicMetadata(message('home.title', language), message('home.description', language), '/', false);
}
export default function Page() { return <><HomePage /><ReturningUserRedirect /></>; }
