import View from './View';
import { publicMetadata } from "@/lib/metadata.mjs";
export const metadata = publicMetadata("CTWACampaign Detail", "Manage analytics, content, conversations, and ads across your workspaces.", "/admin/ctwa/:id", true);
export default function Page() { return <View />; }
