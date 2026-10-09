import View from './View';
import { publicMetadata } from "@/lib/metadata.mjs";
export const metadata = publicMetadata("Bot Conversations", "Manage analytics, content, conversations, and ads across your workspaces.", "/admin/conversations", true);
export default function Page() { return <View />; }
