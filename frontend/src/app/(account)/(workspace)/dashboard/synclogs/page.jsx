import { publicMetadata } from '@/lib/metadata.mjs';
export const metadata = publicMetadata("Sync Logs", "Manage analytics, content, conversations, and ads across your workspaces.", "/dashboard/synclogs", true);
import View from '../analytics/synclogs/View.jsx';
export default function Page() { return <View />; }
