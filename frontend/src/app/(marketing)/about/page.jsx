import Content from "@/features/AboutPage.jsx";
import { publicMetadata } from "@/lib/metadata.mjs";
export const metadata = publicMetadata("درباره ما", "راوینتا برای مدیریت محتوا، پیام‌ها و آمار حساب‌های اجتماعی در یک فضای کاری ساخته شده است.", "/about", false);
export default function Page() { return <Content />; }
