import View from './View';
import { publicMetadata } from "@/lib/metadata.mjs";
export const metadata = publicMetadata("Reports", "Manage analytics, content, conversations, and ads across your workspaces.", "/admin/analytics/reports", true);
export default function Page() { return <View />; }
