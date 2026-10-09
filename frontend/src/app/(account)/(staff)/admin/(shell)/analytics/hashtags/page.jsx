import View from './View';
import { publicMetadata } from "@/lib/metadata.mjs";
export const metadata = publicMetadata("Caption Writer", "Manage analytics, content, conversations, and ads across your workspaces.", "/admin/analytics/hashtags", true);
export default function Page() { return <View />; }
