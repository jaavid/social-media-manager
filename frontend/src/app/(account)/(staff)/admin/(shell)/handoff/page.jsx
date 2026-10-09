import View from './View';
import { publicMetadata } from "@/lib/metadata.mjs";
export const metadata = publicMetadata("Handoff Queue", "Manage analytics, content, conversations, and ads across your workspaces.", "/admin/handoff", true);
export default function Page() { return <View />; }
