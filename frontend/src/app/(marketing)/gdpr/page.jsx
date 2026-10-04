import Content from '../../../features/GDPRPage.jsx';
import { publicMetadata } from '../../../lib/metadata.mjs';
export const metadata = publicMetadata("GDPR Compliance", "If you're an EU/EEA resident or a customer with EU/EEA users, this page explains how Social Stats honours the General Data Protection Regulation (GDPR).", "/gdpr", false);
export default function Page() { return <Content />; }
