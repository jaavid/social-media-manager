import PrivateRuntime from '../../../core/providers/PrivateRuntime';
import { Guard } from '../../Guard';
export const metadata = { robots: { index: false, follow: false } };
export default function Layout({ children }) { return <PrivateRuntime><Guard roles={["superadmin", "staff"]}>{children}</Guard></PrivateRuntime>; }
