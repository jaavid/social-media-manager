import View from './View';
import { publicMetadata } from "@/lib/metadata.mjs";
export const metadata = publicMetadata("Client Onboarding", "Manage analytics, content, conversations, and ads across your workspaces.", "/dashboard/onboarding", true);
export default function Page() { return <View />; }
