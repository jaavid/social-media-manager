import View from './View';
import { publicMetadata } from "@/lib/metadata.mjs";
export const metadata = publicMetadata("Edit Client", "Manage analytics, content, conversations, and ads across your workspaces.", "/admin/workspace/:workspaceId/edit", true);
export default function Page() { return <View />; }
