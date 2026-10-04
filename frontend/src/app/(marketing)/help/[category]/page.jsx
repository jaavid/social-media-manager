import MarketingLayout from '@/components/marketing/MarketingLayout';
import View from './View';
import { publicMetadata } from '../../../../lib/metadata.mjs';
export const metadata = publicMetadata("مرکز راهنما", "راهنماهای راه‌اندازی، مراحل عیب‌یابی، سؤالات متداول و پاسخ به سؤالات رایج در مورد استفاده از راوینتا.", "/help/:category", false);
export default function Page() { return <MarketingLayout><View /></MarketingLayout>; }
