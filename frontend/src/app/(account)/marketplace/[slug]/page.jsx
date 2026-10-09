import View from './View';
import { publicMetadata } from "@/lib/metadata.mjs";
export const metadata = publicMetadata("مشخصات آژانس", "تحلیل و آمار، محتوا، مکالمات و تبلیغات را در فضای کاری خود مدیریت کنید.", "/marketplace/:slug", false);
export default function Page() { return <View />; }
