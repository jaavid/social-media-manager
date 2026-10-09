import View from './View';
import { publicMetadata } from "@/lib/metadata.mjs";
export const metadata = publicMetadata("ایمیل را تأیید کنید", "تحلیل و آمار، محتوا، مکالمات و تبلیغات را در فضای کاری خود مدیریت کنید.", "/verify-email", true);
export default function Page() { return <View />; }
