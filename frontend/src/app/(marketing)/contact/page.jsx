import MarketingLayout from '@/components/marketing/MarketingLayout';
import View from './View';
import { publicMetadata } from '../../../lib/metadata.mjs';
export const metadata = publicMetadata("تماس با ما", "برای گزارش خطا و پیشنهاد امکانات با تیم راوینتا در گیت‌هاب در تماس باشید.", "/contact", false);
export default function Page() { return <MarketingLayout><View /></MarketingLayout>; }
