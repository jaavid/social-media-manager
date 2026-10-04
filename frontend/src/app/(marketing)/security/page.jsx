import Content from '../../../features/SecurityPage.jsx';
import { publicMetadata } from '../../../lib/metadata.mjs';
export const metadata = publicMetadata("Security", "Encryption at rest with Fernet, TLS 1.3 in transit, audit log on every action, GDPR + DPDP compliant. SOC 2 Type II in progress.", "/security", false);
export default function Page() { return <Content />; }
