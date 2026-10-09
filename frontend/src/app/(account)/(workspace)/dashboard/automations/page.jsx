import { publicMetadata } from '@/lib/metadata.mjs';
export const metadata = publicMetadata("Automations", "Manage analytics, content, conversations, and ads across your workspaces.", "/dashboard/automations", true);
import View from '../analytics/automations/View.jsx';
export default function Page() { return <View />; }
