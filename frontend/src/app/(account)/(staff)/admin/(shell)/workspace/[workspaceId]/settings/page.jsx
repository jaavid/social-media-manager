import View from './View';
import { publicMetadata } from "@/lib/metadata.mjs";
export const metadata = publicMetadata("Settings", "Manage analytics, content, conversations, and ads across your workspaces.", "/admin/workspace/:workspaceId/settings", true);
export default function Page() { return <View />; }
