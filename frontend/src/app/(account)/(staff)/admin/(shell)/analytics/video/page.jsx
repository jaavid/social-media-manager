import View from './View';
import { publicMetadata } from "@/lib/metadata.mjs";
export const metadata = publicMetadata("Video Studio", "Manage analytics, content, conversations, and ads across your workspaces.", "/admin/analytics/video", true);
export default function Page() { return <View />; }
