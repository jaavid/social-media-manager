import { publicMetadata } from '@/lib/metadata.mjs';
export const metadata = publicMetadata("Client Dashboard", "Manage analytics, content, conversations, and ads across your workspaces.", "/dashboard", true);
import View from './analytics/View';
export default function Page() { return <View />; }
