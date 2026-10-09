import { publicMetadata } from '@/lib/metadata.mjs';
export const metadata = publicMetadata("Post Ideas", "Manage analytics, content, conversations, and ads across your workspaces.", "/dashboard/post-ideas", true);
import View from '../analytics/post-ideas/View.jsx';
export default function Page() { return <View />; }
