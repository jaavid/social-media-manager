import { publicMetadata } from '@/lib/metadata.mjs';
export const metadata = publicMetadata("My Posts", "Manage analytics, content, conversations, and ads across your workspaces.", "/dashboard/posts", true);
import View from '../analytics/posts/View.jsx';
export default function Page() { return <View />; }
