import View from './View';
import { publicMetadata } from "@/lib/metadata.mjs";
export const metadata = publicMetadata("Messaging Dashboard", "Manage analytics, content, conversations, and ads across your workspaces.", "/dashboard/messaging", true);
export default function Page() { return <View />; }
