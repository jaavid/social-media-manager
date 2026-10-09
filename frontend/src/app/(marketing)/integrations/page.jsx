import MarketingLayout from '@/components/marketing/MarketingLayout';
import View from './View';
import { publicMetadata } from "@/lib/metadata.mjs";
export const metadata = publicMetadata("ادغام - راوینتا", "بیش از 40 ادغام بومی در شبکه‌های اجتماعی، پیام‌رسانی، تحلیل و آمار، CRM، تجارت، هوش مصنوعی و موارد دیگر. راوینتا را در عرض چند دقیقه به پشته موجود خود وصل کنید.", "/integrations", false);
export default function Page() { return <MarketingLayout><View /></MarketingLayout>; }
