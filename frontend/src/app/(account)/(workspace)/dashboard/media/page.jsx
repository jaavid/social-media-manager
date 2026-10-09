import { publicMetadata } from '@/lib/metadata.mjs';
export const metadata = publicMetadata("Media Library", "Manage analytics, content, conversations, and ads across your workspaces.", "/dashboard/media", true);
import View from "@/features/composer/MediaLibraryPage.jsx";
export default function Page() { return <View />; }
