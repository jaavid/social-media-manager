import View from './View';
import { publicMetadata } from '../../../../lib/metadata.mjs';
export const metadata = publicMetadata("Manage Invite", "Manage analytics, content, conversations, and ads across your workspaces.", "/invite/:token", true);
export default function Page() { return <View />; }
