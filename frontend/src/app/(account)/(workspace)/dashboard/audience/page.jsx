import { publicMetadata } from '@/lib/metadata.mjs';
export const metadata = publicMetadata("Audience Insights", "Manage analytics, content, conversations, and ads across your workspaces.", "/dashboard/audience", true);
import View from '../analytics/audience/View.jsx';
export default function Page() { return <View />; }
