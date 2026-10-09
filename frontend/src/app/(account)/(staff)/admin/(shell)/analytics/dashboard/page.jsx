import View from './View';
import { publicMetadata } from "@/lib/metadata.mjs";
export const metadata = publicMetadata("Admin Overview", "Manage analytics, content, conversations, and ads across your workspaces.", "/admin/analytics/dashboard", true);
export default function Page() { return <View />; }
