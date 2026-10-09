import { publicMetadata } from '@/lib/metadata.mjs';
export const metadata = publicMetadata("Queue Manager", "Manage analytics, content, conversations, and ads across your workspaces.", "/dashboard/queues", true);
import View from "@/features/composer/QueueManagerPage.jsx";
export default function Page() { return <View />; }
