import { publicMetadata } from '@/lib/metadata.mjs';
export const metadata = publicMetadata("Composer", "Manage analytics, content, conversations, and ads across your workspaces.", "/dashboard/composer/:id", true);
import View from '../../analytics/composer/[id]/View.jsx';
export default function Page() { return <View />; }
