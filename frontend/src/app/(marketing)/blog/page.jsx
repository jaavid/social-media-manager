import MarketingLayout from '@/components/marketing/MarketingLayout';
import View from './View';
import { publicMetadata } from "@/lib/metadata.mjs";
export const metadata = publicMetadata("وبلاگ", "به‌روزرسانی‌های محصول، کتاب‌های بازی آژانس، آزمایش‌های هوش مصنوعی و تصمیم‌گیری‌های طراحی از آمارهای اجتماعی ساختمان تیم.", "/blog", false);
export default function Page() { return <MarketingLayout><View /></MarketingLayout>; }
