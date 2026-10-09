import { publicMetadata } from '@/lib/metadata.mjs';
export const metadata = publicMetadata("Alerts", "Manage analytics, content, conversations, and ads across your workspaces.", "/dashboard/alerts", true);
import View from '../analytics/alerts/View.jsx';
export default function Page() { return <View />; }
