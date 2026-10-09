import { publicMetadata } from '@/lib/metadata.mjs';
export const metadata = publicMetadata("Video Studio", "Manage analytics, content, conversations, and ads across your workspaces.", "/dashboard/video", true);
import View from '../analytics/video/View.jsx';
export default function Page() { return <View />; }
