import PrivateRuntime from '../../../core/providers/PrivateRuntime';
import { Guard } from '../../Guard';
export const metadata = { robots: { index: false, follow: false } };
export default function Layout({ children }) { return <PrivateRuntime><Guard roles={["client"]} accountTypes={["end_user"]}>{children}</Guard></PrivateRuntime>; }
