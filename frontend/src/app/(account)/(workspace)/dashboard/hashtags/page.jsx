import { publicMetadata } from '@/lib/metadata.mjs';
export const metadata = publicMetadata("Caption Writer", "Manage analytics, content, conversations, and ads across your workspaces.", "/dashboard/hashtags", true);
import View from '../analytics/hashtags/View.jsx';
export default function Page() { return <View />; }
