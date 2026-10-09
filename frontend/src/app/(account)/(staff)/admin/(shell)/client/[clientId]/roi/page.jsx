import View from './View';
import { publicMetadata } from "@/lib/metadata.mjs";
export const metadata = publicMetadata("ROICalculator", "Manage analytics, content, conversations, and ads across your workspaces.", "/admin/client/:clientId/roi", true);
export default function Page() { return <View />; }
