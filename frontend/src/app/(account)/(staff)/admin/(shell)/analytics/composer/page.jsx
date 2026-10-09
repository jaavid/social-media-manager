import View from "@/features/composer/ComposerPage.jsx";
import { publicMetadata } from "@/lib/metadata.mjs";
export const metadata = publicMetadata("Composer", "Manage analytics, content, conversations, and ads across your workspaces.", "/admin/analytics/composer", true);
export default function Page() { return <View />; }
