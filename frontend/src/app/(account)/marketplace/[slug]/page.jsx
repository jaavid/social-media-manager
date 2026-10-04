import View from './View';
import { publicMetadata } from '../../../../lib/metadata.mjs';
export const metadata = publicMetadata("Agency Profile", "Manage analytics, content, conversations, and ads across your workspaces.", "/marketplace/:slug", false);
export default function Page() { return <View />; }
