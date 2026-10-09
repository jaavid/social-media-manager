import View from './View';
import { publicMetadata } from "@/lib/metadata.mjs";
export const metadata = publicMetadata("Lead Detail", "Manage analytics, content, conversations, and ads across your workspaces.", "/admin/leads/:id", true);
export default function Page() { return <View />; }
