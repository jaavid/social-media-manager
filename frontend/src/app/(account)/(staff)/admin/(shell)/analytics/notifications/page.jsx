import View from './View';
import { publicMetadata } from "@/lib/metadata.mjs";
export const metadata = publicMetadata("Notification Preferences", "Manage analytics, content, conversations, and ads across your workspaces.", "/admin/analytics/notifications", true);
export default function Page() { return <View />; }
