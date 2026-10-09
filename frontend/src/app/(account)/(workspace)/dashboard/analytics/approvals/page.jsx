import View from './View';
import { publicMetadata } from "@/lib/metadata.mjs";
export const metadata = publicMetadata("Approval Queue", "Manage analytics, content, conversations, and ads across your workspaces.", "/dashboard/analytics/approvals", true);
export default function Page() { return <View />; }
