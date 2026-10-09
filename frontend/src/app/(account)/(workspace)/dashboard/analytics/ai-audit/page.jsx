import View from './View';
import { publicMetadata } from "@/lib/metadata.mjs";
export const metadata = publicMetadata("AIAudit", "Manage analytics, content, conversations, and ads across your workspaces.", "/dashboard/analytics/ai-audit", true);
export default function Page() { return <View />; }
