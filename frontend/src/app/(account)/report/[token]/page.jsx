import View from './View';
import { publicMetadata } from '../../../../lib/metadata.mjs';
export const metadata = publicMetadata("گزارش عمومی", "تحلیل و آمار، محتوا، مکالمات و تبلیغات را در فضای کاری خود مدیریت کنید.", "/report/:token", true);
export default function Page() { return <View />; }
