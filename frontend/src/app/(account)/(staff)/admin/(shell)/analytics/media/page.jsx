import View from "@/features/composer/MediaLibraryPage.jsx";
import { publicMetadata } from "@/lib/metadata.mjs";
export const metadata = publicMetadata("Media Library", "Manage analytics, content, conversations, and ads across your workspaces.", "/admin/analytics/media", true);
export default function Page() { return <View />; }
