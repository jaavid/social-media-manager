import View from './View';
import { publicMetadata } from "@/lib/metadata.mjs";
export const metadata = publicMetadata("End User Dashboard", "Manage analytics, content, conversations, and ads across your workspaces.", "/u", true);
export default function Page() { return <View />; }
