import View from './View';
import { publicMetadata } from "@/lib/metadata.mjs";
export const metadata = publicMetadata("My Agency", "Manage analytics, content, conversations, and ads across your workspaces.", "/u/agency", true);
export default function Page() { return <View />; }
