import View from './View';
import { publicMetadata } from "@/lib/metadata.mjs";
export const metadata = publicMetadata("Pending Dashboard", "Manage analytics, content, conversations, and ads across your workspaces.", "/pending", true);
export default function Page() { return <View />; }
