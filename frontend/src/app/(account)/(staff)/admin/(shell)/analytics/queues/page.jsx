import View from "@/features/composer/QueueManagerPage.jsx";
import { publicMetadata } from "@/lib/metadata.mjs";
export const metadata = publicMetadata("Queue Manager", "Manage analytics, content, conversations, and ads across your workspaces.", "/admin/analytics/queues", true);
export default function Page() { return <View />; }
