import View from './View';
import { publicMetadata } from "@/lib/metadata.mjs";
export const metadata = publicMetadata("Sync Logs", "Manage analytics, content, conversations, and ads across your workspaces.", "/dashboard/analytics/synclogs", true);
export default function Page() { return <View />; }
