import { publicMetadata } from '@/lib/metadata.mjs';
export const metadata = publicMetadata("AIStudio", "Manage analytics, content, conversations, and ads across your workspaces.", "/dashboard/ai-studio", true);
import View from '../analytics/ai-studio/View.jsx';
export default function Page() { return <View />; }
