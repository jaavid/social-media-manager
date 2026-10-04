import View from './View';
import { publicMetadata } from '../../../../lib/metadata.mjs';
export const metadata = publicMetadata("OAuth Callback", "تحلیل و آمار، محتوا، مکالمات و تبلیغات را در فضای کاری خود مدیریت کنید.", "/oauth/callback", true);
export default function Page() { return <View />; }
