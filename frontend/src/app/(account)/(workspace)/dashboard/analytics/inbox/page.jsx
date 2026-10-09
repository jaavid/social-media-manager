import View from './View';
import { publicMetadata } from "@/lib/metadata.mjs";
export const metadata = publicMetadata("Unified Inbox", "Manage analytics, content, conversations, and ads across your workspaces.", "/dashboard/analytics/inbox", true);
export default function Page() { return <View />; }
