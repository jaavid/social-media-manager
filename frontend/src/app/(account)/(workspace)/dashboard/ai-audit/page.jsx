import { publicMetadata } from '@/lib/metadata.mjs';
export const metadata = publicMetadata("AIAudit", "Manage analytics, content, conversations, and ads across your workspaces.", "/dashboard/ai-audit", true);
import View from '../analytics/ai-audit/View.jsx';
export default function Page() { return <View />; }
