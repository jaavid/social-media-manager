import { publicMetadata } from '@/lib/metadata.mjs';
export const metadata = publicMetadata("AIUsage", "Manage analytics, content, conversations, and ads across your workspaces.", "/dashboard/ai-usage", true);
import View from '../analytics/ai-usage/View.jsx';
export default function Page() { return <View />; }
