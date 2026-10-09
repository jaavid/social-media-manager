import { publicMetadata } from '@/lib/metadata.mjs';
export const metadata = publicMetadata("Competitors", "Manage analytics, content, conversations, and ads across your workspaces.", "/dashboard/competitors", true);
import View from '../analytics/competitors/View.jsx';
export default function Page() { return <View />; }
