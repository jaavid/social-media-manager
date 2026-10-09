import { publicMetadata } from '@/lib/metadata.mjs';
export const metadata = publicMetadata("AIInsights", "Manage analytics, content, conversations, and ads across your workspaces.", "/dashboard/insights", true);
import View from '../analytics/insights/View.jsx';
export default function Page() { return <View />; }
