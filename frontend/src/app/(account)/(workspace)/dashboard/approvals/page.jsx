import { publicMetadata } from '@/lib/metadata.mjs';
export const metadata = publicMetadata("Approval Queue", "Manage analytics, content, conversations, and ads across your workspaces.", "/dashboard/approvals", true);
import View from '../analytics/approvals/View.jsx';
export default function Page() { return <View />; }
