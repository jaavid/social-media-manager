import { publicMetadata } from '@/lib/metadata.mjs';
export const metadata = publicMetadata("Analytics", "Manage analytics, content, conversations, and ads across your workspaces.", "/dashboard/analytics", true);
import View from './analytics/View';
export default function Page() { return <View />; }
