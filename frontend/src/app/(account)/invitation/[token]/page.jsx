import View from './View';
import { publicMetadata } from '../../../../lib/metadata.mjs';
export const metadata = publicMetadata("Invitation", "Manage analytics, content, conversations, and ads across your workspaces.", "/invitation/:token", true);
export default function Page() { return <View />; }
