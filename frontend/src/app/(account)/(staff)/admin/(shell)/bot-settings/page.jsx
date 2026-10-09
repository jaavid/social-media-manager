import View from './View';
import { publicMetadata } from "@/lib/metadata.mjs";
export const metadata = publicMetadata("Bot Settings", "Manage analytics, content, conversations, and ads across your workspaces.", "/admin/bot-settings", true);
export default function Page() { return <View />; }
