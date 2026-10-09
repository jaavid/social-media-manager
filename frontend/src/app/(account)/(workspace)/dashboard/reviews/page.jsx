import { publicMetadata } from '@/lib/metadata.mjs';
export const metadata = publicMetadata("Reviews", "Manage analytics, content, conversations, and ads across your workspaces.", "/dashboard/reviews", true);
import View from '../analytics/reviews/View.jsx';
export default function Page() { return <View />; }
