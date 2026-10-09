import { publicMetadata } from '@/lib/metadata.mjs';
export const metadata = publicMetadata("Unified Inbox", "Manage analytics, content, conversations, and ads across your workspaces.", "/dashboard/inbox", true);
import View from '../analytics/inbox/View.jsx';
export default function Page() { return <View />; }
