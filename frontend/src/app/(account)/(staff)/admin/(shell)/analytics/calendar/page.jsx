import View from './View';
import { publicMetadata } from "@/lib/metadata.mjs";
export const metadata = publicMetadata("Calendar", "Manage analytics, content, conversations, and ads across your workspaces.", "/admin/analytics/calendar", true);
export default function Page() { return <View />; }
