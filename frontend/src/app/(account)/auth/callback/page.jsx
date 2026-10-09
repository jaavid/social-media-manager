import View from './View';
import { publicMetadata } from "@/lib/metadata.mjs";
export const metadata = publicMetadata("پاسخ به تماس تأیید اعتبار", "تحلیل و آمار، محتوا، مکالمات و تبلیغات را در فضای کاری خود مدیریت کنید.", "/auth/callback", true);
export default function Page() { return <View />; }
