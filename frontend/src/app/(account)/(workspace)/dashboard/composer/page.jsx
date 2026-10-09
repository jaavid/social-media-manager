import { publicMetadata } from '@/lib/metadata.mjs';
export const metadata = publicMetadata("Composer", "Manage analytics, content, conversations, and ads across your workspaces.", "/dashboard/composer", true);
import View from "@/features/composer/ComposerPage.jsx";
export default function Page() { return <View />; }
