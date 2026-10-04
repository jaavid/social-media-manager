import View from './View';
import { publicMetadata } from '../../../lib/metadata.mjs';
export const metadata = publicMetadata("خطای سرور", "در پایان ما مشکلی پیش آمد. به ما اطلاع داده شده و در حال بررسی آن هستیم.", "/500", false);
export default function Page() { return <View />; }
