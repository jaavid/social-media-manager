import { publicMetadata } from '@/lib/metadata.mjs';
export const metadata = publicMetadata("Reports", "Manage analytics, content, conversations, and ads across your workspaces.", "/dashboard/reports", true);
import View from '../analytics/reports/View.jsx';
export default function Page() { return <View />; }
