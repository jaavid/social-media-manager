import View from './View';
import { publicMetadata } from "@/lib/metadata.mjs";
export const metadata = publicMetadata("My Posts", "Manage analytics, content, conversations, and ads across your workspaces.", "/dashboard/analytics/posts", true);
export default function Page() { return <View />; }
