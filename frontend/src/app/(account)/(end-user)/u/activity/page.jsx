import View from './View';
import { publicMetadata } from "@/lib/metadata.mjs";
export const metadata = publicMetadata("Activity Log", "Manage analytics, content, conversations, and ads across your workspaces.", "/u/activity", true);
export default function Page() { return <View />; }
