import View from './View';
import { publicMetadata } from "@/lib/metadata.mjs";
export const metadata = publicMetadata("Ads Coming Soon", "Manage analytics, content, conversations, and ads across your workspaces.", "/dashboard/ads", true);
export default function Page() { return <View />; }
