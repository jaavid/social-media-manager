import { publicMetadata } from '@/lib/metadata.mjs';
export const metadata = publicMetadata("AIChat History", "Manage analytics, content, conversations, and ads across your workspaces.", "/dashboard/chat-history", true);
import View from '../analytics/chat-history/View.jsx';
export default function Page() { return <View />; }
