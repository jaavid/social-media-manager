import { publicMetadata } from '@/lib/metadata.mjs';
export const metadata = publicMetadata("Audit Log", "Manage analytics, content, conversations, and ads across your workspaces.", "/dashboard/audit-log", true);
import View from '../analytics/audit-log/View.jsx';
export default function Page() { return <View />; }
