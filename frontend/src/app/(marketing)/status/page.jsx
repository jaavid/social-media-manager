import MarketingLayout from '@/components/marketing/MarketingLayout';
import View from './View';
import { publicMetadata } from '../../../lib/metadata.mjs';
export const metadata = publicMetadata("وضعیت سیستم", "زمان فعال، تعمیر و نگهداری برنامه‌ریزی شده، و حوادث اخیر برای پلتفرم راوینتا.", "/status", false);
export default function Page() { return <MarketingLayout><View /></MarketingLayout>; }
