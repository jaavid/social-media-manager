import { publicMetadata } from '@/lib/metadata.mjs';
export const metadata = publicMetadata("Calendar", "Manage analytics, content, conversations, and ads across your workspaces.", "/dashboard/calendar", true);
import View from '../analytics/calendar/View.jsx';
export default function Page() { return <View />; }
