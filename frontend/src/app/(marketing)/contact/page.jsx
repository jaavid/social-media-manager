import MarketingLayout from '@/components/marketing/MarketingLayout';
import View from './View';
import { publicMetadata } from '../../../lib/metadata.mjs';
export const metadata = publicMetadata("تماس با ما", "فروش، پشتیبانی، مشارکت، مطبوعات - با تیم راوینتا در تماس باشید. ما معمولاً ظرف یک روز کاری پاسخ می‌دهیم.", "/contact", false);
export default function Page() { return <MarketingLayout><View /></MarketingLayout>; }
