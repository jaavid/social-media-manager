import View from './View';
import { publicMetadata } from '../../../../../../../../lib/metadata.mjs';
export const metadata = publicMetadata("Bot Analytics", "Manage analytics, content, conversations, and ads across your workspaces.", "/admin/bot-flows/:id/analytics", true);
export default function Page() { return <View />; }
