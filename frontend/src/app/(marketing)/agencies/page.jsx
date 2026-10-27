import MarketingLayout from '@/components/marketing/MarketingLayout';
import View from './View';
import { publicMetadata } from "@/lib/metadata.mjs";
export const metadata = publicMetadata("فهرست نمونهٔ آژانس‌ها — راوینتا", "نمونه‌های فرضی برای نمایش پروفایل آژانس‌ها؛ هیچ شریک، امتیاز یا نظر واقعی در این فهرست تأیید نشده است.", "/agencies", true);
export default function Page() { return <MarketingLayout><View /></MarketingLayout>; }
