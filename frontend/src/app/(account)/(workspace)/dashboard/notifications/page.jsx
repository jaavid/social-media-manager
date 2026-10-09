import { publicMetadata } from '@/lib/metadata.mjs';
export const metadata = publicMetadata("Notification Preferences", "Manage analytics, content, conversations, and ads across your workspaces.", "/dashboard/notifications", true);
import View from '../analytics/notifications/View.jsx';
export default function Page() { return <View />; }
